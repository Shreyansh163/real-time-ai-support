import { PrismaService } from "../common/prisma/prisma.service";
export declare class AdminController {
    private prisma;
    constructor(prisma: PrismaService);
    stats(): Promise<{
        tickets: {
            open: number;
            inProgress: number;
            resolved: number;
            closed: number;
        };
        totalUsers: number;
        agentsOnline: number;
    }>;
    agents(): Promise<{
        id: string;
        name: string;
        email: string;
        isActive: boolean;
        isOnline: boolean;
        activeChats: number;
    }[]>;
    audit(limit?: string): Promise<{
        id: string;
        createdAt: Date;
        action: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
}
