import { Role } from "@prisma/client";

export class UpdateUserDto {
  name?: string;
  password?: string;
  role?: Role;
}
