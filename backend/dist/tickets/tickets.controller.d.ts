import { TicketAssignmentService } from "./ticket-assignment.service";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../common/prisma/prisma.service";
export declare class TicketsController {
    private ticketService;
    private aiService;
    private prisma;
    constructor(ticketService: TicketAssignmentService, aiService: AiService, prisma: PrismaService);
    getAssignedTickets(req: any): Promise<({
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
    resolve(ticketId: string, req: any): Promise<{
        success: boolean;
    }>;
    close(body: {
        conversationId: string;
    }, req: any): Promise<{
        success: boolean;
    }>;
    suggestions(ticketId: string): Promise<string[]>;
}
