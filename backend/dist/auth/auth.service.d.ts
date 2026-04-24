import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma/prisma.service";
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<{
        id: string;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(email: string, password: string): Promise<{
        access_token: string;
    }>;
}
