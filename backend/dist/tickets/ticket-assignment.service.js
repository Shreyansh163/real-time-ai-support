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
exports.TicketAssignmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
let TicketAssignmentService = class TicketAssignmentService {
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.MAX_ACTIVE_CHATS = 3;
    }
    async assignAgent(ticketId) {
        console.log("🧩 assignAgent called for ticket:", ticketId);
        const agentStatus = await this.prisma.agentStatus.findFirst({
            where: {
                isOnline: true,
                activeChats: {
                    lt: this.MAX_ACTIVE_CHATS,
                },
                agent: {
                    role: client_1.Role.AGENT,
                },
            },
            orderBy: {
                activeChats: "asc",
            },
            include: {
                agent: true,
            },
        });
        console.log("🔍 agentStatus found:", agentStatus);
        if (!agentStatus) {
            console.log("⚠️ No eligible agent found");
            return null;
        }
        try {
            return await this.prisma.$transaction(async (tx) => {
                console.log("🚀 Assigning agent:", agentStatus.agentId);
                const ticket = await tx.ticket.update({
                    where: { id: ticketId },
                    data: {
                        status: client_1.TicketStatus.IN_PROGRESS,
                        assignedAgentId: agentStatus.agentId,
                    },
                });
                await tx.agentStatus.update({
                    where: { agentId: agentStatus.agentId },
                    data: {
                        activeChats: {
                            increment: 1,
                        },
                    },
                });
                await tx.conversation.update({
                    where: { id: ticket.conversationId },
                    data: {
                        participants: {
                            connect: { id: agentStatus.agentId },
                        },
                    },
                });
                console.log("✅ Agent assigned successfully");
                return {
                    ticketId: ticket.id,
                    agentId: agentStatus.agentId,
                };
            }).then(async (result) => {
                await this.auditService.log("TICKET_ASSIGNED", {
                    ticketId: result.ticketId,
                    agentId: result.agentId,
                    trigger: "manual",
                });
                return result;
            });
        }
        catch (error) {
            console.error("❌ assignAgent transaction failed:", error);
            throw error;
        }
    }
    async resolveTicket(ticketId, agentUserId) {
        console.log("🔒 resolveTicket called:", ticketId);
        return this.prisma.$transaction(async (tx) => {
            const ticket = await tx.ticket.findUnique({
                where: { id: ticketId },
            });
            if (!ticket) {
                throw new Error("Ticket not found");
            }
            if (ticket.assignedAgentId !== agentUserId) {
                throw new Error("Unauthorized: not assigned agent");
            }
            if (ticket.status === "RESOLVED") {
                throw new Error("Ticket already resolved");
            }
            await tx.ticket.update({
                where: { id: ticketId },
                data: {
                    status: "RESOLVED",
                    resolvedAt: new Date(),
                },
            });
            await tx.agentStatus.update({
                where: { agentId: agentUserId },
                data: {
                    activeChats: {
                        decrement: 1,
                    },
                },
            });
            console.log("✅ Ticket resolved successfully");
            await this.auditService.log("TICKET_RESOLVED", {
                ticketId,
                agentId: agentUserId,
            });
            return { success: true };
        });
    }
    async closeByCustomer(conversationId, customerId) {
        return this.prisma.$transaction(async (tx) => {
            const ticket = await tx.ticket.findUnique({
                where: { conversationId },
                include: { conversation: { include: { participants: true } } },
            });
            if (!ticket)
                throw new Error("Ticket not found");
            const isParticipant = ticket.conversation.participants.some(p => p.id === customerId);
            if (!isParticipant) {
                throw new Error("Not a participant of this conversation");
            }
            if (ticket.status === client_1.TicketStatus.CLOSED)
                return { success: true };
            await tx.ticket.update({
                where: { id: ticket.id },
                data: {
                    status: client_1.TicketStatus.CLOSED,
                    resolvedAt: new Date(),
                },
            });
            if (ticket.assignedAgentId) {
                await tx.agentStatus.update({
                    where: { agentId: ticket.assignedAgentId },
                    data: { activeChats: { decrement: 1 } },
                });
            }
            await this.auditService.log("TICKET_CLOSED", {
                ticketId: ticket.id,
                conversationId,
                customerId,
                assignedAgentId: ticket.assignedAgentId ?? null,
            });
            return { success: true };
        });
    }
    async claimUnassignedTickets(agentId) {
        const status = await this.prisma.agentStatus.findUnique({
            where: { agentId },
        });
        if (!status)
            return [];
        const remaining = this.MAX_ACTIVE_CHATS - status.activeChats;
        if (remaining <= 0)
            return [];
        const tickets = await this.prisma.ticket.findMany({
            where: {
                assignedAgentId: null,
                status: client_1.TicketStatus.OPEN,
            },
            orderBy: { createdAt: "asc" },
            take: remaining,
        });
        const claimed = [];
        for (const t of tickets) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    await tx.ticket.update({
                        where: { id: t.id },
                        data: {
                            status: client_1.TicketStatus.IN_PROGRESS,
                            assignedAgentId: agentId,
                        },
                    });
                    await tx.agentStatus.update({
                        where: { agentId },
                        data: { activeChats: { increment: 1 } },
                    });
                    await tx.conversation.update({
                        where: { id: t.conversationId },
                        data: { participants: { connect: { id: agentId } } },
                    });
                });
                claimed.push({ ticketId: t.id, conversationId: t.conversationId });
                await this.auditService.log("TICKET_ASSIGNED", {
                    ticketId: t.id,
                    agentId,
                    trigger: "auto-claim",
                });
            }
            catch (err) {
                console.error("❌ claim failed for ticket", t.id, err);
            }
        }
        if (claimed.length) {
            console.log(`🎯 Agent ${agentId} claimed ${claimed.length} ticket(s)`);
        }
        return claimed;
    }
    async getAssignedTickets(agentUserId) {
        return this.prisma.ticket.findMany({
            where: {
                assignedAgentId: agentUserId,
            },
            include: {
                conversation: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
};
exports.TicketAssignmentService = TicketAssignmentService;
exports.TicketAssignmentService = TicketAssignmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], TicketAssignmentService);
//# sourceMappingURL=ticket-assignment.service.js.map