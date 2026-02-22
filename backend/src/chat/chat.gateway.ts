import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ChatService } from "./chat.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
  ) {
    console.log("🔥 ChatGateway initialized");
  }

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;

      console.log(`✅ Socket connected: ${payload.email}`);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage("send_message")
  async handleMessage(
    @MessageBody()
    data: { conversationId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log("📩 send_message received:", data);
    const user = client.data.user;
    console.log("👤 sender:", user);

    const savedMessage = await this.chatService.saveMessage(
      data.conversationId,
      client.data.user,
      data.message,
    );

    console.log("💾 message saved:", savedMessage);

    this.server.to(data.conversationId).emit("receive_message", {
      id: savedMessage.id,
      conversationId: data.conversationId,
      senderId: user.userId,
      message: savedMessage.content,
      timestamp: savedMessage.createdAt,
    });
  }

  @SubscribeMessage("join_conversation")
  joinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
  }
}
