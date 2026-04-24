import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ChatService } from "./chat.service";
import { PrismaService } from "../common/prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { TicketAssignmentService } from "../tickets/ticket-assignment.service";
import { AuditService } from "../audit/audit.service";
import { RateLimiter } from "../common/rate-limiter";
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private chatService;
    private prisma;
    private aiService;
    private ticketAssignmentService;
    private auditService;
    private rateLimiter;
    server: Server;
    constructor(jwtService: JwtService, chatService: ChatService, prisma: PrismaService, aiService: AiService, ticketAssignmentService: TicketAssignmentService, auditService: AuditService, rateLimiter: RateLimiter);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleMessage(data: {
        conversationId: string;
        message: string;
    }, client: Socket): Promise<void>;
    handleTyping(data: {
        conversationId: string;
    }, client: Socket): void;
    handleStopTyping(data: {
        conversationId: string;
    }, client: Socket): void;
    joinConversation(conversationId: string, client: Socket): void;
    resolveTicket(data: {
        ticketId: string;
    }, client: Socket): Promise<void>;
    requestSuggestions(data: {
        conversationId: string;
    }, client: Socket): Promise<void>;
}
