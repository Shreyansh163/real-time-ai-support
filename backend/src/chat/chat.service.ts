import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { Role, SenderType } from "@prisma/client";


@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(
    conversationId: string,
    senderJwtPayload: { sub: string; role: Role },
    content: string,
  ) {
    return this.prisma.message.create({
      data: {
        content,
        senderType:
          senderJwtPayload.role === Role.AGENT
            ? SenderType.AGENT
            : SenderType.CUSTOMER,
        conversation: {
          connect: { id: conversationId },
        },
        sender: {
          connect: { id: senderJwtPayload.sub },
        },
      },
    });
  }

  async getMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }
}
