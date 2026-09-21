import { buildApp } from "./app.ts";

const app = buildApp(true);
const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: "127.0.0.1" });
