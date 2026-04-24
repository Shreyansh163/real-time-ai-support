import { PrismaService } from "../common/prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: CreateUserDto): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
    }[]>;
    findById(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
    }, null, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, data: UpdateUserDto): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    delete(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
