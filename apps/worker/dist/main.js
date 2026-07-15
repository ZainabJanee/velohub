"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const worker_module_1 = require("./worker.module");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(worker_module_1.WorkerModule);
    await app.init();
    console.log('VeloHub Background Queue Worker active and polling Redis...');
}
bootstrap();
//# sourceMappingURL=main.js.map