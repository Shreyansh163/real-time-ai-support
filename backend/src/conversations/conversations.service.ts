import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { Role } from "@prisma/client";
import { TicketAssignmentService } from "../tickets/ticket-assignment.service";
import { AiService } from "../ai/ai.service";

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private ticketAssignmentService: TicketAssignmentService,
    private aiService: AiService,
  ) {}

  async createConversation(user: {
    userId: string;
    role: Role;
    email: string;
  }) {
    if (user.role !== Role.CUSTOMER) {
      throw new ForbiddenException("Only customers can start conversations");
    }

    const result = await this.prisma.$transaction(async tx => {
      const conversation = await tx.conversation.create({
        data: { participants: { connect: { id: user.userId } } },
      });

      const ticket = await tx.ticket.create({
        data: { conversationId: conversation.id },
      });

      return { conversation, ticket };
    });

    const assignment = await this.ticketAssignmentService.assignAgent(
      result.ticket.id,
    );

    // No agent available — post an AI greeting so the customer isn't staring at silence.
    if (!assignment) {
      try {
        const reply = await this.aiService.generateReply("");
        await this.aiService.saveAiMessage(result.conversation.id, reply);
      } catch (err) {
        console.error("❌ AI greeting failed:", err);
      }
    }

    return {
      conversationId: result.conversation.id,
      ticketId: result.ticket.id,
      agentAssigned: !!assignment,
    };
  }

  async listForCustomer(customerId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { id: customerId } } },
      include: {
        ticket: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return conversations.map(c => ({
      id: c.id,
      createdAt: c.createdAt,
      ticket: c.ticket
        ? { id: c.ticket.id, status: c.ticket.status }
        : null,
      lastMessage: c.messages[0]
        ? {
            content: c.messages[0].content,
            senderType: c.messages[0].senderType,
            createdAt: c.messages[0].createdAt,
          }
        : null,
    }));
  }

  async getConversationById(
    conversationId: string,
    requester: { userId: string; role: Role },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        participants: true,
      },
    });
    if (!conversation) return null;

    if (requester.role !== Role.ADMIN) {
      const isParticipant = conversation.participants.some(
        p => p.id === requester.userId,
      );
      if (!isParticipant) {
        throw new ForbiddenException("Not a participant of this conversation");
      }
    }

    return conversation;
  }
}
