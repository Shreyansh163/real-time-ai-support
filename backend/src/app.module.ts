import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./common/prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { ChatModule } from "./chat/chat.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { TicketsModule } from "./tickets/tickets.module";
import { AiModule } from "./ai/ai.module";
import { AuditModule } from "./audit/audit.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    ChatModule,
    ConversationsModule,
    TicketsModule,
    AiModule,
    AuditModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
