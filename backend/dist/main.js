"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    console.log("🔥 bootstrap() started");
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
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
//# sourceMappingURL=main.js.map