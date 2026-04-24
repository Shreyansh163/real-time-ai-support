"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const chat_service_1 = require("./chat.service");
const prisma_service_1 = require("../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const ticket_assignment_service_1 = require("../tickets/ticket-assignment.service");
const audit_service_1 = require("../audit/audit.service");
const rate_limiter_1 = require("../common/rate-limiter");
let ChatGateway = class ChatGateway {
    constructor(jwtService, chatService, prisma, aiService, ticketAssignmentService, auditService, rateLimiter) {
        this.jwtService = jwtService;
        this.chatService = chatService;
        this.prisma = prisma;
        this.aiService = aiService;
        this.ticketAssignmentService = ticketAssignmentService;
        this.auditService = auditService;
        this.rateLimiter = rateLimiter;
        console.log("🔥 ChatGateway initialized");
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.split(" ")[1];
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.data.user = { ...payload, userId: payload.sub };
            if (payload.role === client_1.Role.AGENT) {
                await this.prisma.agentStatus.upsert({
                    where: { agentId: payload.sub },
                    update: { isOnline: true },
                    create: { agentId: payload.sub, isOnline: true, activeChats: 0 },
                });
                console.log(`🟢 Agent online: ${payload.email}`);
                await this.auditService.log("AGENT_LOGIN", {
                    agentId: payload.sub,
                    email: payload.email,
                });
                const claimed = await this.ticketAssignmentService.claimUnassignedTickets(payload.sub);
                if (claimed.length) {
                    client.emit("tickets_updated");
                    for (const c of claimed) {
                        this.server.to(c.conversationId).emit("agent_joined", {
                            conversationId: c.conversationId,
                            ticketId: c.ticketId,
                        });
                    }
                }
            }
            console.log(`✅ Socket connected: ${payload.email}`);
        }
        catch {
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        const user = client.data.user;
        if (!user)
            return;
        if (user.role === client_1.Role.AGENT) {
            await this.prisma.agentStatus
                .update({
                where: { agentId: user.userId },
                data: { isOnline: false },
            })
                .catch(() => null);
            console.log(`🔴 Agent offline: ${user.email}`);
            await this.auditService.log("AGENT_LOGOUT", {
                agentId: user.userId,
                email: user.email,
            });
        }
    }
    async handleMessage(data, client) {
        const user = client.data.user;
        const check = this.rateLimiter.check(`send_message:${user.userId}`, 20, 10_000);
        if (!check.ok) {
            client.emit("rate_limited", {
                event: "send_message",
                retryAfter: check.retryAfter,
                message: "You're sending messages too quickly. Please slow down.",
            });
            return;
        }
        const savedMessage = await this.chatService.saveMessage(data.conversationId, user, data.message);
        let sentiment = savedMessage.sentiment;
        if (user.role === client_1.Role.CUSTOMER) {
            sentiment = await this.aiService.classifySentiment(savedMessage.content);
            if (sentiment) {
                await this.prisma.message.update({
                    where: { id: savedMessage.id },
                    data: { sentiment },
                });
            }
        }
        this.server.to(data.conversationId).emit("receive_message", {
            id: savedMessage.id,
            conversationId: data.conversationId,
            senderId: user.userId,
            senderType: savedMessage.senderType,
            content: savedMessage.content,
            sentiment,
            createdAt: savedMessage.createdAt,
        });
        if (user.role === client_1.Role.CUSTOMER) {
            const ticket = await this.prisma.ticket.findUnique({
                where: { conversationId: data.conversationId },
            });
            if (ticket && !ticket.assignedAgentId) {
                try {
                    const history = await this.prisma.message.findMany({
                        where: { conversationId: data.conversationId },
                        orderBy: { createdAt: "asc" },
                        take: 30,
                    });
                    const transcript = history
                        .map(m => `${m.senderType}: ${m.content}`)
                        .join("\n");
                    const reply = await this.aiService.generateReply(transcript);
                    const aiMessage = await this.aiService.saveAiMessage(data.conversationId, reply);
                    this.server.to(data.conversationId).emit("receive_message", {
                        id: aiMessage.id,
                        conversationId: data.conversationId,
                        senderId: aiMessage.senderId,
                        senderType: aiMessage.senderType,
                        content: aiMessage.content,
                        createdAt: aiMessage.createdAt,
                    });
                }
                catch (err) {
                    console.error("❌ Auto-AI reply failed:", err);
                }
            }
        }
    }
    handleTyping(data, client) {
        const user = client.data.user;
        if (!user)
            return;
        client.to(data.conversationId).emit("peer_typing", {
            conversationId: data.conversationId,
            role: user.role,
        });
    }
    handleStopTyping(data, client) {
        const user = client.data.user;
        if (!user)
            return;
        client.to(data.conversationId).emit("peer_stop_typing", {
            conversationId: data.conversationId,
            role: user.role,
        });
    }
    joinConversation(conversationId, client) {
        client.join(conversationId);
    }
    async resolveTicket(data, client) {
        const user = client.data.user;
        if (user?.role !== client_1.Role.AGENT) {
            client.emit("resolve_error", { message: "Agents only" });
            return;
        }
        try {
            const ticket = await this.prisma.ticket.findUnique({
                where: { id: data.ticketId },
            });
            if (!ticket) {
                client.emit("resolve_error", { message: "Ticket not found" });
                return;
            }
            await this.ticketAssignmentService.resolveTicket(data.ticketId, user.userId);
            this.server.to(ticket.conversationId).emit("ticket_resolved", {
                ticketId: data.ticketId,
                conversationId: ticket.conversationId,
            });
            client.emit("tickets_updated");
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Resolve failed";
            client.emit("resolve_error", { message });
        }
    }
    async requestSuggestions(data, client) {
        const user = client.data.user;
        if (user?.role !== client_1.Role.AGENT) {
            client.emit("suggestions_error", { message: "Agents only" });
            return;
        }
        const check = this.rateLimiter.check(`suggestions:${user.userId}`, 5, 60_000);
        if (!check.ok) {
            const secs = Math.ceil(check.retryAfter / 1000);
            client.emit("suggestions_error", {
                message: `Rate limit reached. Try again in ${secs}s.`,
            });
            return;
        }
        const messages = await this.prisma.message.findMany({
            where: { conversationId: data.conversationId },
            orderBy: { createdAt: "asc" },
            take: 30,
        });
        const conversationText = messages
            .map(m => `${m.senderType}: ${m.content}`)
            .join("\n");
        const suggestions = await this.aiService.generateReplySuggestions(conversationText);
        client.emit("suggestions", {
            conversationId: data.conversationId,
            suggestions,
        });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("send_message"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("typing"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("stop_typing"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleStopTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("join_conversation"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "joinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("resolve_ticket"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "resolveTicket", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("request_suggestions"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "requestSuggestions", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: "*",
        },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        chat_service_1.ChatService,
        prisma_service_1.PrismaService,
        ai_service_1.AiService,
        ticket_assignment_service_1.TicketAssignmentService,
        audit_service_1.AuditService,
        rate_limiter_1.RateLimiter])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map