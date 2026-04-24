import { Controller, Get, Query } from "@nestjs/common";
import { Role, TicketStatus } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../common/prisma/prisma.service";

@Controller("admin")
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get("stats")
  async stats() {
    const [open, inProgress, resolved, closed, totalUsers, agentsOnline] =
      await Promise.all([
        this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
        this.prisma.ticket.count({
          where: { status: TicketStatus.IN_PROGRESS },
        }),
        this.prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
        this.prisma.ticket.count({ where: { status: TicketStatus.CLOSED } }),
        this.prisma.user.count(),
        this.prisma.agentStatus.count({ where: { isOnline: true } }),
      ]);

    return {
      tickets: { open, inProgress, resolved, closed },
      totalUsers,
      agentsOnline,
    };
  }

  @Get("agents")
  async agents() {
    const agents = await this.prisma.user.findMany({
      where: { role: Role.AGENT },
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

  @Get("audit")
  async audit(@Query("limit") limit?: string) {
    const take = Math.min(Number(limit) || 50, 200);
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}
