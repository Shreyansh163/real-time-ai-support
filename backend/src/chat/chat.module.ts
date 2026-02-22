import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
