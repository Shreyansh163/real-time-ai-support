import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
})
export class AdminModule {}
