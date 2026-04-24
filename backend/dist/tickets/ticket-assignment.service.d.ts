import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
export declare class TicketAssignmentService {
    private prisma;
    private auditService;
    private readonly MAX_ACTIVE_CHATS;
    constructor(prisma: PrismaService, auditService: AuditService);
    assignAgent(ticketId: string): Promise<{
        ticketId: string;
        agentId: string;
    }>;
    resolveTicket(ticketId: string, agentUserId: string): Promise<{
        success: boolean;
    }>;
    closeByCustomer(conversationId: string, customerId: string): Promise<{
        success: boolean;
    }>;
    claimUnassignedTickets(agentId: string): Promise<{
        ticketId: string;
        conversationId: string;
    }[]>;
    getAssignedTickets(agentUserId: string): Promise<({
        conversation: {
            id: string;
            createdAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        conversationId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        resolvedAt: Date | null;
        assignedAgentId: string | null;
    })[]>;
}
