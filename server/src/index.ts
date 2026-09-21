import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true, phase: 1 }));

const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: "127.0.0.1" });
