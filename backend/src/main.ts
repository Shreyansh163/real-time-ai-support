import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  console.log("🔥 bootstrap() started");

  const app = await NestFactory.create(AppModule);

  const allowed = (process.env.CORS_ORIGINS ?? "http://localhost:3001")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowed,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, "0.0.0.0");

  console.log(`🚀 Server running on port ${port}`);
  console.log(`   CORS allowed origins: ${allowed.join(", ")}`);
}

bootstrap().catch(err => {
  console.error("❌ Bootstrap failed", err);
});
