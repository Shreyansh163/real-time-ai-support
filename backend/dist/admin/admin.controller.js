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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../auth/roles.decorator");
const prisma_service_1 = require("../common/prisma/prisma.service");
let AdminController = class AdminController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async stats() {
        const [open, inProgress, resolved, closed, totalUsers, agentsOnline] = await Promise.all([
            this.prisma.ticket.count({ where: { status: client_1.TicketStatus.OPEN } }),
            this.prisma.ticket.count({
                where: { status: client_1.TicketStatus.IN_PROGRESS },
            }),
            this.prisma.ticket.count({ where: { status: client_1.TicketStatus.RESOLVED } }),
            this.prisma.ticket.count({ where: { status: client_1.TicketStatus.CLOSED } }),
            this.prisma.user.count(),
            this.prisma.agentStatus.count({ where: { isOnline: true } }),
        ]);
        return {
            tickets: { open, inProgress, resolved, closed },
            totalUsers,
            agentsOnline,
        };
    }
    async agents() {
        const agents = await this.prisma.user.findMany({
            where: { role: client_1.Role.AGENT },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                agentStatus: {
                    select: { isOnline: true, activeChats: true },
                },
            },
            orderBy: { name: "asc" },
        });
        return agents.map(a => ({
            id: a.id,
            name: a.name,
            email: a.email,
            isActive: a.isActive,
            isOnline: a.agentStatus?.isOnline ?? false,
            activeChats: a.agentStatus?.activeChats ?? 0,
        }));
    }
    async audit(limit) {
        const take = Math.min(Number(limit) || 50, 200);
        return this.prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take,
        });
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)("stats"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)("agents"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "agents", null);
__decorate([
    (0, common_1.Get)("audit"),
    __param(0, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "audit", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)("admin"),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map