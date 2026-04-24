import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import { ChatService } from "./chat.service";
import { PrismaService } from "../common/prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { TicketAssignmentService } from "../tickets/ticket-assignment.service";
import { AuditService } from "../audit/audit.service";
import { RateLimiter } from "../common/rate-limiter";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private prisma: PrismaService,
    private aiService: AiService,
    private ticketAssignmentService: TicketAssignmentService,
    private auditService: AuditService,
    private rateLimiter: RateLimiter,
  ) {
    console.log("🔥 ChatGateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      // Normalize: jwt uses `sub`; rest of app uses `userId`
      client.data.user = { ...payload, userId: payload.sub };

      if (payload.role === Role.AGENT) {
        await this.prisma.agentStatus.upsert({
          where: { agentId: payload.sub },
          update: { isOnline: true },
          create: { agentId: payload.sub, isOnline: true, activeChats: 0 },
        });
        console.log(`🟢 Agent online: ${payload.email}`);
        await this.auditService.log("AGENT_LOGIN", {
          agentId: payload.sub,
          email: payload.email,
        });

        // Pick up any unassigned OPEN tickets now that this agent is online.
        const claimed =
          await this.ticketAssignmentService.claimUnassignedTickets(
            payload.sub,
          );
        if (claimed.length) {
          client.emit("tickets_updated");
          for (const c of claimed) {
            this.server.to(c.conversationId).emit("agent_joined", {
              conversationId: c.conversationId,
              ticketId: c.ticketId,
            });
          }
        }
      }

      console.log(`✅ Socket connected: ${payload.email}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (!user) return;

    if (user.role === Role.AGENT) {
      await this.prisma.agentStatus
        .update({
          where: { agentId: user.userId },
          data: { isOnline: false },
        })
        .catch(() => null);
      console.log(`🔴 Agent offline: ${user.email}`);
      await this.auditService.log("AGENT_LOGOUT", {
        agentId: user.userId,
        email: user.email,
      });
    }
  }

  @SubscribeMessage("send_message")
  async handleMessage(
    @MessageBody()
    data: { conversationId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    const check = this.rateLimiter.check(
      `send_message:${user.userId}`,
      20,
      10_000,
    );
    if (!check.ok) {
      client.emit("rate_limited", {
        event: "send_message",
        retryAfter: check.retryAfter,
        message: "You're sending messages too quickly. Please slow down.",
      });
      return;
    }

    const savedMessage = await this.chatService.saveMessage(
      data.conversationId,
      user,
      data.message,
    );

    // Classify sentiment for customer messages (before broadcast so clients receive it).
    let sentiment = savedMessage.sentiment;
    if (user.role === Role.CUSTOMER) {
      sentiment = await this.aiService.classifySentiment(savedMessage.content);
      if (sentiment) {
        await this.prisma.message.update({
          where: { id: savedMessage.id },
          data: { sentiment },
        });
      }
    }

    this.server.to(data.conversationId).emit("receive_message", {
      id: savedMessage.id,
      conversationId: data.conversationId,
      senderId: user.userId,
      senderType: savedMessage.senderType,
      content: savedMessage.content,
      sentiment,
      createdAt: savedMessage.createdAt,
    });

    // Auto-AI reply when a customer messages a ticket with no assigned agent.
    if (user.role === Role.CUSTOMER) {
      const ticket = await this.prisma.ticket.findUnique({
        where: { conversationId: data.conversationId },
      });
      if (ticket && !ticket.assignedAgentId) {
        try {
          const history = await this.prisma.message.findMany({
            where: { conversationId: data.conversationId },
            orderBy: { createdAt: "asc" },
            take: 30,
          });
          const transcript = history
            .map(m => `${m.senderType}: ${m.content}`)
            .join("\n");

          const reply = await this.aiService.generateReply(transcript);
          const aiMessage = await this.aiService.saveAiMessage(
            data.conversationId,
            reply,
          );

          this.server.to(data.conversationId).emit("receive_message", {
            id: aiMessage.id,
            conversationId: data.conversationId,
            senderId: aiMessage.senderId,
            senderType: aiMessage.senderType,
            content: aiMessage.content,
            createdAt: aiMessage.createdAt,
          });
        } catch (err) {
          console.error("❌ Auto-AI reply failed:", err);
        }
      }
    }
  }

  @SubscribeMessage("typing")
  handleTyping(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;
    client.to(data.conversationId).emit("peer_typing", {
      conversationId: data.conversationId,
      role: user.role,
    });
  }

  @SubscribeMessage("stop_typing")
  handleStopTyping(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;
    client.to(data.conversationId).emit("peer_stop_typing", {
      conversationId: data.conversationId,
      role: user.role,
    });
  }

  @SubscribeMessage("join_conversation")
  joinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
  }

  @SubscribeMessage("resolve_ticket")
  async resolveTicket(
    @MessageBody() data: { ticketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (user?.role !== Role.AGENT) {
      client.emit("resolve_error", { message: "Agents only" });
      return;
    }

    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: data.ticketId },
      });
      if (!ticket) {
        client.emit("resolve_error", { message: "Ticket not found" });
        return;
      }

      await this.ticketAssignmentService.resolveTicket(
        data.ticketId,
        user.userId,
      );

      this.server.to(ticket.conversationId).emit("ticket_resolved", {
        ticketId: data.ticketId,
        conversationId: ticket.conversationId,
      });
      client.emit("tickets_updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Resolve failed";
      client.emit("resolve_error", { message });
    }
  }

  @SubscribeMessage("request_suggestions")
  async requestSuggestions(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (user?.role !== Role.AGENT) {
      client.emit("suggestions_error", { message: "Agents only" });
      return;
    }

    const check = this.rateLimiter.check(
      `suggestions:${user.userId}`,
      5,
      60_000,
    );
    if (!check.ok) {
      const secs = Math.ceil(check.retryAfter / 1000);
      client.emit("suggestions_error", {
        message: `Rate limit reached. Try again in ${secs}s.`,
      });
      return;
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId: data.conversationId },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    const conversationText = messages
      .map(m => `${m.senderType}: ${m.content}`)
      .join("\n");

    const suggestions = await this.aiService.generateReplySuggestions(
      conversationText,
    );

    client.emit("suggestions", {
      conversationId: data.conversationId,
      suggestions,
    });
  }
}
