import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { Role } from "@prisma/client";
import { TicketAssignmentService } from "../tickets/ticket-assignment.service";

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private ticketAssignmentService: TicketAssignmentService,
  ) {}

  async createConversation(user: {
    userId: string;
    role: Role;
    email: string;
  }) {
    console.log("🔥 user object received:", user);
    console.log("📩 createConversation called by:", user.email);

    if (user.role !== Role.CUSTOMER) {
      throw new ForbiddenException("Only customers can start conversations");
    }

    // 1️⃣ Create conversation + ticket atomically
    const result = await this.prisma.$transaction(async tx => {
      const conversation = await tx.conversation.create({
        data: {
          participants: {
            connect: { id: user.userId },
          },
        },
      });

      const ticket = await tx.ticket.create({
        data: {
          conversationId: conversation.id,
        },
      });

      return {
        conversation,
        ticket,
      };
    });

    console.log("🎫 Ticket created:", result.ticket.id);

    // 2️⃣ Assign agent AFTER transaction
    await this.ticketAssignmentService.assignAgent(result.ticket.id);

    return {
      conversationId: result.conversation.id,
      ticketId: result.ticket.id,
    };
  }

  // getting conversation by id for opening chat on frontend
  async getConversationById(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        participants: true,
      },
    });
  }
}
