import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { Prisma, Role, TicketStatus } from "@prisma/client";

@Injectable()
export class TicketAssignmentService {
  private readonly MAX_ACTIVE_CHATS = 3;

  constructor(private prisma: PrismaService) {}

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

      return { success: true };
    });
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
