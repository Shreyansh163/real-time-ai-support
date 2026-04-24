import { Role } from "@prisma/client";
export declare class UpdateUserDto {
    name?: string;
    password?: string;
    role?: Role;
}
