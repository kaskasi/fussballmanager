import { buildApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
const staticRoot = process.env.STATIC_ROOT;

const app = await buildApp({
  logger: process.env.NODE_ENV !== "test",
  staticRoot,
});

await app.listen({ port, host });
