import { ConversationsService } from "./conversations.service";
export declare class ConversationsController {
    private readonly conversationsService;
    constructor(conversationsService: ConversationsService);
    listMine(req: any): Promise<{
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
    getConversation(id: string, req: any): Promise<{
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
    create(req: any): Promise<{
        conversationId: string;
        ticketId: string;
        agentAssigned: boolean;
    }>;
}
