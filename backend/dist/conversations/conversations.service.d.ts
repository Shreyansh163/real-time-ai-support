import { PrismaService } from "../common/prisma/prisma.service";
import { Role } from "@prisma/client";
import { TicketAssignmentService } from "../tickets/ticket-assignment.service";
import { AiService } from "../ai/ai.service";
export declare class ConversationsService {
    private prisma;
    private ticketAssignmentService;
    private aiService;
    constructor(prisma: PrismaService, ticketAssignmentService: TicketAssignmentService, aiService: AiService);
    createConversation(user: {
        userId: string;
        role: Role;
        email: string;
    }): Promise<{
        conversationId: string;
        ticketId: string;
        agentAssigned: boolean;
    }>;
    listForCustomer(customerId: string): Promise<{
        id: string;
        createdAt: Date;
        ticket: {
            id: string;
            status: import(".prisma/client").$Enums.TicketStatus;
        };
        lastMessage: {
            content: string;
            senderType: import(".prisma/client").$Enums.SenderType;
            createdAt: Date;
        };
    }[]>;
    getConversationById(conversationId: string, requester: {
        userId: string;
        role: Role;
    }): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            content: string;
            senderType: import(".prisma/client").$Enums.SenderType;
            sentiment: import(".prisma/client").$Enums.Sentiment | null;
            conversationId: string;
            senderId: string;
        }[];
        participants: {
            id: string;
            name: string;
            email: string;
            password: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
    } & {
        id: string;
        createdAt: Date;
    }>;
}
