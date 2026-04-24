import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { Prisma, Role, TicketStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class TicketAssignmentService {
  private readonly MAX_ACTIVE_CHATS = 3;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async assignAgent(ticketId: string) {
    console.log("🧩 assignAgent called for ticket:", ticketId);

    // 1️⃣ Find available agent (online + below max load)
    const agentStatus = await this.prisma.agentStatus.findFirst({
      where: {
        isOnline: true,
        activeChats: {
          lt: this.MAX_ACTIVE_CHATS,
        },
        agent: {
          role: Role.AGENT,
        },
      },
      orderBy: {
        activeChats: "asc",
      },
      include: {
        agent: true,
      },
    });

    console.log("🔍 agentStatus found:", agentStatus);

    if (!agentStatus) {
      console.log("⚠️ No eligible agent found");
      return null;
    }

    try {
      return await this.prisma.$transaction(async tx => {
        console.log("🚀 Assigning agent:", agentStatus.agentId);

        // 2️⃣ Update ticket (explicit unchecked update)
        const ticket = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: TicketStatus.IN_PROGRESS,
            assignedAgentId: agentStatus.agentId,
          } as Prisma.TicketUncheckedUpdateInput,
        });

        // 3️⃣ Increment active chats
        await tx.agentStatus.update({
          where: { agentId: agentStatus.agentId },
          data: {
            activeChats: {
              increment: 1,
            },
          },
        });

        // 4️⃣ Add agent to conversation participants
        await tx.conversation.update({
          where: { id: ticket.conversationId },
          data: {
            participants: {
              connect: { id: agentStatus.agentId },
            },
          },
        });

        console.log("✅ Agent assigned successfully");

        return {
          ticketId: ticket.id,
          agentId: agentStatus.agentId,
        };
      }).then(async result => {
        await this.auditService.log("TICKET_ASSIGNED", {
          ticketId: result.ticketId,
          agentId: result.agentId,
          trigger: "manual",
        });
        return result;
      });
    } catch (error) {
      console.error("❌ assignAgent transaction failed:", error);
      throw error;
    }
  }

  // Resolving the Ticket
  async resolveTicket(ticketId: string, agentUserId: string) {
    console.log("🔒 resolveTicket called:", ticketId);

    return this.prisma.$transaction(async tx => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      if (ticket.assignedAgentId !== agentUserId) {
        throw new Error("Unauthorized: not assigned agent");
      }

      if (ticket.status === "RESOLVED") {
        throw new Error("Ticket already resolved");
      }

      // 1️⃣ Update ticket
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });

      // 2️⃣ Decrement agent load
      await tx.agentStatus.update({
        where: { agentId: agentUserId },
        data: {
          activeChats: {
            decrement: 1,
          },
        },
      });

      console.log("✅ Ticket resolved successfully");

      await this.auditService.log("TICKET_RESOLVED", {
        ticketId,
        agentId: agentUserId,
      });

      return { success: true };
    });
  }

  // Customer closes their own chat — marks the ticket CLOSED and decrements
  // the assigned agent's load if there was one.
  async closeByCustomer(conversationId: string, customerId: string) {
    return this.prisma.$transaction(async tx => {
      const ticket = await tx.ticket.findUnique({
        where: { conversationId },
        include: { conversation: { include: { participants: true } } },
      });
      if (!ticket) throw new Error("Ticket not found");

      const isParticipant = ticket.conversation.participants.some(
        p => p.id === customerId,
      );
      if (!isParticipant) {
        throw new Error("Not a participant of this conversation");
      }

      if (ticket.status === TicketStatus.CLOSED) return { success: true };

      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.CLOSED,
          resolvedAt: new Date(),
        },
      });

      if (ticket.assignedAgentId) {
        await tx.agentStatus.update({
          where: { agentId: ticket.assignedAgentId },
          data: { activeChats: { decrement: 1 } },
        });
      }

      await this.auditService.log("TICKET_CLOSED", {
        ticketId: ticket.id,
        conversationId,
        customerId,
        assignedAgentId: ticket.assignedAgentId ?? null,
      });

      return { success: true };
    });
  }

  // Claim OPEN tickets with no assigned agent when an agent comes online.
  // Respects the agent's remaining capacity (MAX_ACTIVE_CHATS).
  async claimUnassignedTickets(agentId: string) {
    const status = await this.prisma.agentStatus.findUnique({
      where: { agentId },
    });
    if (!status) return [];

    const remaining = this.MAX_ACTIVE_CHATS - status.activeChats;
    if (remaining <= 0) return [];

    const tickets = await this.prisma.ticket.findMany({
      where: {
        assignedAgentId: null,
        status: TicketStatus.OPEN,
      },
      orderBy: { createdAt: "asc" },
      take: remaining,
    });

    const claimed: { ticketId: string; conversationId: string }[] = [];

    for (const t of tickets) {
      try {
        await this.prisma.$transaction(async tx => {
          await tx.ticket.update({
            where: { id: t.id },
            data: {
              status: TicketStatus.IN_PROGRESS,
              assignedAgentId: agentId,
            } as Prisma.TicketUncheckedUpdateInput,
          });
          await tx.agentStatus.update({
            where: { agentId },
            data: { activeChats: { increment: 1 } },
          });
          await tx.conversation.update({
            where: { id: t.conversationId },
            data: { participants: { connect: { id: agentId } } },
          });
        });
        claimed.push({ ticketId: t.id, conversationId: t.conversationId });
        await this.auditService.log("TICKET_ASSIGNED", {
          ticketId: t.id,
          agentId,
          trigger: "auto-claim",
        });
      } catch (err) {
        console.error("❌ claim failed for ticket", t.id, err);
      }
    }

    if (claimed.length) {
      console.log(`🎯 Agent ${agentId} claimed ${claimed.length} ticket(s)`);
    }
    return claimed;
  }

  // getting asigned tickets for agent frontend
  async getAssignedTickets(agentUserId: string) {
    return this.prisma.ticket.findMany({
      where: {
        assignedAgentId: agentUserId,
      },
      include: {
        conversation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
