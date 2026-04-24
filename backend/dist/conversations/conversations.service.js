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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const ticket_assignment_service_1 = require("../tickets/ticket-assignment.service");
const ai_service_1 = require("../ai/ai.service");
let ConversationsService = class ConversationsService {
    constructor(prisma, ticketAssignmentService, aiService) {
        this.prisma = prisma;
        this.ticketAssignmentService = ticketAssignmentService;
        this.aiService = aiService;
    }
    async createConversation(user) {
        if (user.role !== client_1.Role.CUSTOMER) {
            throw new common_1.ForbiddenException("Only customers can start conversations");
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const conversation = await tx.conversation.create({
                data: { participants: { connect: { id: user.userId } } },
            });
            const ticket = await tx.ticket.create({
                data: { conversationId: conversation.id },
            });
            return { conversation, ticket };
        });
        const assignment = await this.ticketAssignmentService.assignAgent(result.ticket.id);
        if (!assignment) {
            try {
                const reply = await this.aiService.generateReply("");
                await this.aiService.saveAiMessage(result.conversation.id, reply);
            }
            catch (err) {
                console.error("❌ AI greeting failed:", err);
            }
        }
        return {
            conversationId: result.conversation.id,
            ticketId: result.ticket.id,
            agentAssigned: !!assignment,
        };
    }
    async listForCustomer(customerId) {
        const conversations = await this.prisma.conversation.findMany({
            where: { participants: { some: { id: customerId } } },
            include: {
                ticket: true,
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return conversations.map(c => ({
            id: c.id,
            createdAt: c.createdAt,
            ticket: c.ticket
                ? { id: c.ticket.id, status: c.ticket.status }
                : null,
            lastMessage: c.messages[0]
                ? {
                    content: c.messages[0].content,
                    senderType: c.messages[0].senderType,
                    createdAt: c.messages[0].createdAt,
                }
                : null,
        }));
    }
    async getConversationById(conversationId, requester) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: { orderBy: { createdAt: "asc" } },
                participants: true,
            },
        });
        if (!conversation)
            return null;
        if (requester.role !== client_1.Role.ADMIN) {
            const isParticipant = conversation.participants.some(p => p.id === requester.userId);
            if (!isParticipant) {
                throw new common_1.ForbiddenException("Not a participant of this conversation");
            }
        }
        return conversation;
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ticket_assignment_service_1.TicketAssignmentService,
        ai_service_1.AiService])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map