import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { TicketAssignmentService } from "./ticket-assignment.service";
import { TicketsController } from "./tickets.controller";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [PrismaModule, AiModule], // 👈 IMPORTANT
  providers: [TicketAssignmentService],
  controllers: [TicketsController],
  exports: [TicketAssignmentService], // 👈 So other modules can use it
})
export class TicketsModule {}
