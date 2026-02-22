import { Injectable } from "@nestjs/common";
import OpenAI from "openai";

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateReplySuggestions(conversationText: string) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini", // keep this model
      messages: [
        {
          role: "system",
          content:
            "You are a professional customer support agent. Provide 3 short and helpful replies.",
        },
        {
          role: "user",
          content: conversationText,
        },
      ],
      temperature: 0.6,
      max_tokens: 200, // 🔥 important: limits output cost
    });

    return response.choices[0].message.content;
  }
}
