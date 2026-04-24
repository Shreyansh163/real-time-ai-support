import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
export type AuditAction = "AGENT_LOGIN" | "AGENT_LOGOUT" | "TICKET_ASSIGNED" | "TICKET_RESOLVED" | "TICKET_CLOSED";
export declare class AuditService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log(action: AuditAction, metadata: Prisma.InputJsonValue): Promise<void>;
}
