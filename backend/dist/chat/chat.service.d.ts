import { PrismaService } from "../common/prisma/prisma.service";
import { Role } from "@prisma/client";
export declare class ChatService {
    private prisma;
    constructor(prisma: PrismaService);
    saveMessage(conversationId: string, senderJwtPayload: {
        sub: string;
        role: Role;
    }, content: string): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        senderType: import(".prisma/client").$Enums.SenderType;
        sentiment: import(".prisma/client").$Enums.Sentiment | null;
        conversationId: string;
        senderId: string;
    }>;
    getMessages(conversationId: string): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        sender: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
        };
    }[]>;
}
