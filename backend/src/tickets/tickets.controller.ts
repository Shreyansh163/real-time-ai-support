import {
  Controller,
  Patch,
  Post,
  Get,
  Param,
  Req,
  UseGuards,
  Body,
} from "@nestjs/common";
import { TicketAssignmentService } from "./ticket-assignment.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../common/prisma/prisma.service";

@Controller("tickets")
export class TicketsController {
  constructor(
    private ticketService: TicketAssignmentService,
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT)
      
  @Get("assigned")
  async getAssignedTickets(@Req() req: any) {
    return this.ticketService.getAssignedTickets(req.user.userId);
  }
  @Patch(":id/resolve")
  resolve(@Param("id") ticketId: string, @Req() req: any) {
    return this.ticketService.resolveTicket(ticketId, req.user.userId);
  }

  @Post("close")
  async close(
    @Body() body: { conversationId: string },
    @Req() req: any,
  ) {
    return this.ticketService.closeByCustomer(
      body.conversationId,
      req.user.userId,
    );
  }

  @Get(":id/suggestions")
  async suggestions(@Param("id") ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const conversationText = ticket.conversation.messages
      .map(m => `${m.senderType}: ${m.content}`)
      .join("\n");

    return this.aiService.generateReplySuggestions(conversationText);
  }
}
