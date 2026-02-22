import { Module } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { ConversationsController } from "./conversations.controller";
import { TicketsModule } from "../tickets/tickets.module";

@Module({
  imports: [TicketsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
