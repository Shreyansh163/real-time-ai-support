import { Controller, Post, Get, Req, UseGuards, Param } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getConversation(@Param("id") id: string) {
    return this.conversationsService.getConversationById(id);
  }
  @Roles(Role.CUSTOMER)
  @Post()
  create(@Req() req: any) {
    return this.conversationsService.createConversation(req.user);
  }
}
