import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { PrismaModule } from "../common/prisma/prisma.module";
import { AiModule } from "../ai/ai.module";
import { TicketsModule } from "../tickets/tickets.module";
import { RateLimiter } from "../common/rate-limiter";

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    PrismaModule,
    AiModule,
    TicketsModule,
  ],
  providers: [ChatGateway, ChatService, RateLimiter],
})
export class ChatModule {}
