import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { WorldService } from "@evervale/application/world-service";
import type { Clock, IdGenerator, WorldRepository } from "@evervale/application/ports";
import { loadGameData } from "@evervale/balance-data";
import { JsonWorldRepository, PostgresWorldRepository } from "@evervale/persistence";
import { parseWorldCommand } from "@evervale/protocol/world-command-runtime";
import {
  configuredMaxBodyBytes,
  readJsonBody,
  requestOwner,
  statusForError,
} from "./http-boundary.js";

const PORT = Number(process.env.PORT ?? 2567);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const MAX_BODY_BYTES = configuredMaxBodyBytes(process.env.EVERVALE_MAX_BODY_BYTES);
const gameData = loadGameData();

class NodeIds implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}

class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

function repository(): WorldRepository {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    console.info("[EverVale] persistence=postgres");
    return new PostgresWorldRepository(databaseUrl);
  }

  const directory = process.env.EVERVALE_JSON_DIR
    ? path.resolve(process.env.EVERVALE_JSON_DIR)
    : path.resolve(process.cwd(), "../../.evervale/worlds");
  console.warn(
    "[EverVale] DATABASE_URL missing; using local JSON development persistence:",
    directory,
  );
  return new JsonWorldRepository(directory);
}

const worldRepository = repository();
const service = new WorldService({
  repository: worldRepository,
  definitions: gameData.definitions,
  ids: new NodeIds(),
  clock: new SystemClock(),
});

function cors(res: import("node:http").ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", CLIENT_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "content-type,x-evervale-owner");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function json(
  res: import("node:http").ServerResponse,
  status: number,
  responseBody: unknown,
): void {
  cors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(responseBody));
}

function parseLoginInput(input: unknown): string {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("INVALID_LOGIN_BODY");
  }
  const handleValue = (input as Record<string, unknown>).handle;
  if (handleValue !== undefined && typeof handleValue !== "string") {
    throw new Error("INVALID_HANDLE");
  }

  const handle = (handleValue ?? "builder")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);

  if (!handle) throw new Error("INVALID_HANDLE");
  return handle;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      cors(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, service: "evervale-server", balance: "0.2" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/dev/login") {
      if (process.env.EVERVALE_DEV_AUTH === "false") {
        throw new Error("DEV_AUTH_DISABLED");
      }
      const input = await readJsonBody<unknown>(req, MAX_BODY_BYTES);
      const handle = parseLoginInput(input);
      json(res, 200, { ownerId: `dev:${handle}`, displayName: handle });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/world") {
      const world = await service.getOrCreate(requestOwner(req));
      json(res, 200, {
        world,
        buildCatalog: gameData.buildCatalog,
        blockerCatalog: gameData.blockerCatalog,
        propCatalog: gameData.propCatalog,
        serverNow: new Date().toISOString(),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/world/command") {
      const input = await readJsonBody<unknown>(req, MAX_BODY_BYTES);
      const command = parseWorldCommand(input);
      const world = await service.command(requestOwner(req), command);
      json(res, 200, { accepted: true, world });
      return;
    }

    json(res, 404, { error: "NOT_FOUND" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    console.error("[EverVale]", message);
    json(res, statusForError(message), { accepted: false, error: message });
  }
});

let shutdownPromise: Promise<void> | null = null;

async function closeServer(serverToClose: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    serverToClose.close(() => resolve());
  });
}

function requestShutdown(signal: NodeJS.Signals): void {
  if (shutdownPromise) return;

  shutdownPromise = (async () => {
    console.info(`[EverVale] shutdown signal=${signal}`);
    await closeServer(server);
    await worldRepository.close?.();
    console.info("[EverVale] shutdown complete");
  })();

  void shutdownPromise.catch((error) => {
    console.error(
      "[EverVale] shutdown failed",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}

process.once("SIGINT", () => requestShutdown("SIGINT"));
process.once("SIGTERM", () => requestShutdown("SIGTERM"));

server.listen(PORT, () => {
  console.info(`[EverVale] server listening on http://localhost:${PORT}`);
});
