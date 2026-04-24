"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = exports.AI_USER_EMAIL = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
exports.AI_USER_EMAIL = "ai-bot@system.local";
let AiService = class AiService {
    constructor(prisma) {
        this.prisma = prisma;
        this.aiUserIdCache = null;
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async getAiUserId() {
        if (this.aiUserIdCache)
            return this.aiUserIdCache;
        const user = await this.prisma.user.findUnique({
            where: { email: exports.AI_USER_EMAIL },
        });
        if (!user) {
            throw new Error(`AI system user ${exports.AI_USER_EMAIL} not found. Run the seed script.`);
        }
        this.aiUserIdCache = user.id;
        return user.id;
    }
    async generateReplySuggestions(conversationText) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: 'You are a professional customer support agent. Given a conversation transcript, return exactly 3 short, helpful reply suggestions the agent could send next. Respond ONLY with a JSON object of the form {"suggestions": ["...", "...", "..."]}. Each suggestion must be a single plain sentence, no numbering, no markdown.',
                },
                {
                    role: "user",
                    content: conversationText || "(no messages yet)",
                },
            ],
            temperature: 0.6,
            max_tokens: 300,
        });
        const raw = response.choices[0]?.message?.content ?? "{}";
        try {
            const parsed = JSON.parse(raw);
            const list = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
            return list
                .filter((s) => typeof s === "string")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 3);
        }
        catch {
            return [];
        }
    }
    async generateReply(conversationText) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a friendly first-line customer support assistant. A human agent will take over soon. Reply concisely (1-3 sentences), acknowledge the customer's issue, and ask any clarifying question that would help the human agent resolve it faster.",
                },
                {
                    role: "user",
                    content: conversationText || "Customer just opened a new chat.",
                },
            ],
            temperature: 0.6,
            max_tokens: 200,
        });
        return (response.choices[0]?.message?.content?.trim() ||
            "Hi! Thanks for reaching out — an agent will be with you shortly.");
    }
    async classifySentiment(text) {
        if (!text.trim())
            return null;
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: 'Classify the customer message emotional tone. Respond ONLY with JSON: {"sentiment": "POSITIVE" | "NEUTRAL" | "FRUSTRATED" | "ANGRY"}.',
                    },
                    { role: "user", content: text },
                ],
                temperature: 0,
                max_tokens: 20,
            });
            const raw = response.choices[0]?.message?.content ?? "{}";
            const parsed = JSON.parse(raw);
            const value = parsed?.sentiment;
            if (value === "POSITIVE" ||
                value === "NEUTRAL" ||
                value === "FRUSTRATED" ||
                value === "ANGRY") {
                return value;
            }
            return null;
        }
        catch (err) {
            console.error("❌ classifySentiment failed:", err);
            return null;
        }
    }
    async saveAiMessage(conversationId, content) {
        const aiUserId = await this.getAiUserId();
        return this.prisma.message.create({
            data: {
                content,
                senderType: client_1.SenderType.AI,
                conversation: { connect: { id: conversationId } },
                sender: { connect: { id: aiUserId } },
            },
        });
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AiService);
//# sourceMappingURL=ai.service.js.map