import { Module } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { ConversationsController } from "./conversations.controller";
import { TicketsModule } from "../tickets/tickets.module";
import { AiModule } from "../ai/ai.module";
import { PrismaModule } from "../common/prisma/prisma.module";

@Module({
  imports: [TicketsModule, AiModule, PrismaModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
