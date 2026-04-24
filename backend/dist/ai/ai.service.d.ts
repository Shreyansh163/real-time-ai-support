import { PrismaService } from "../common/prisma/prisma.service";
import { Sentiment } from "@prisma/client";
export declare const AI_USER_EMAIL = "ai-bot@system.local";
export declare class AiService {
    private prisma;
    private openai;
    private aiUserIdCache;
    constructor(prisma: PrismaService);
    getAiUserId(): Promise<string>;
    generateReplySuggestions(conversationText: string): Promise<string[]>;
    generateReply(conversationText: string): Promise<string>;
    classifySentiment(text: string): Promise<Sentiment | null>;
    saveAiMessage(conversationId: string, content: string): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        senderType: import(".prisma/client").$Enums.SenderType;
        sentiment: import(".prisma/client").$Enums.Sentiment | null;
        conversationId: string;
        senderId: string;
    }>;
}
