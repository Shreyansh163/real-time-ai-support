import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";

export type AuditAction =
  | "AGENT_LOGIN"
  | "AGENT_LOGOUT"
  | "TICKET_ASSIGNED"
  | "TICKET_RESOLVED"
  | "TICKET_CLOSED";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(action: AuditAction, metadata: Prisma.InputJsonValue) {
    try {
      await this.prisma.auditLog.create({
        data: { action, metadata },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log (${action})`, err);
    }
  }
}
