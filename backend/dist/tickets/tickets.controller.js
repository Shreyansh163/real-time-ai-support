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
exports.TicketsController = void 0;
const common_1 = require("@nestjs/common");
const ticket_assignment_service_1 = require("./ticket-assignment.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
const ai_service_1 = require("../ai/ai.service");
const prisma_service_1 = require("../common/prisma/prisma.service");
let TicketsController = class TicketsController {
    constructor(ticketService, aiService, prisma) {
        this.ticketService = ticketService;
        this.aiService = aiService;
        this.prisma = prisma;
    }
    async getAssignedTickets(req) {
        return this.ticketService.getAssignedTickets(req.user.userId);
    }
    resolve(ticketId, req) {
        return this.ticketService.resolveTicket(ticketId, req.user.userId);
    }
    async close(body, req) {
        return this.ticketService.closeByCustomer(body.conversationId, req.user.userId);
    }
    async suggestions(ticketId) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                conversation: {
                    include: {
                        messages: {
                            orderBy: { createdAt: "asc" },
                        },
                    },
                },
            },
        });
        if (!ticket) {
            throw new Error("Ticket not found");
        }
        const conversationText = ticket.conversation.messages
            .map(m => `${m.senderType}: ${m.content}`)
            .join("\n");
        return this.aiService.generateReplySuggestions(conversationText);
    }
};
exports.TicketsController = TicketsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.AGENT),
    (0, common_1.Get)("assigned"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "getAssignedTickets", null);
__decorate([
    (0, common_1.Patch)(":id/resolve"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TicketsController.prototype, "resolve", null);
__decorate([
    (0, common_1.Post)("close"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "close", null);
__decorate([
    (0, common_1.Get)(":id/suggestions"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "suggestions", null);
exports.TicketsController = TicketsController = __decorate([
    (0, common_1.Controller)("tickets"),
    __metadata("design:paramtypes", [ticket_assignment_service_1.TicketAssignmentService,
        ai_service_1.AiService,
        prisma_service_1.PrismaService])
], TicketsController);
//# sourceMappingURL=tickets.controller.js.map