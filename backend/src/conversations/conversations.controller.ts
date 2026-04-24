import { Controller, Post, Get, Req, UseGuards, Param } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Roles(Role.CUSTOMER)
  @Get("mine")
  listMine(@Req() req: any) {
    return this.conversationsService.listForCustomer(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getConversation(@Param("id") id: string, @Req() req: any) {
    return this.conversationsService.getConversationById(id, req.user);
  }
  @Roles(Role.CUSTOMER)
  @Post()
  create(@Req() req: any) {
    return this.conversationsService.createConversation(req.user);
  }
}
