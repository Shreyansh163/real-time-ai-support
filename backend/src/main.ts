import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  console.log("🔥 bootstrap() started");

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "http://localhost:3001",
    credentials: true,
  });

  const port = 3000;
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap().catch(err => {
  console.error("❌ Bootstrap failed", err);
});
