"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const chat_gateway_1 = require("./chat.gateway");
const chat_service_1 = require("./chat.service");
const prisma_module_1 = require("../common/prisma/prisma.module");
const ai_module_1 = require("../ai/ai.module");
const tickets_module_1 = require("../tickets/tickets.module");
const rate_limiter_1 = require("../common/rate-limiter");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.register({ secret: process.env.JWT_SECRET }),
            prisma_module_1.PrismaModule,
            ai_module_1.AiModule,
            tickets_module_1.TicketsModule,
        ],
        providers: [chat_gateway_1.ChatGateway, chat_service_1.ChatService, rate_limiter_1.RateLimiter],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map