import { PostgresWorldRepository } from "./postgres-world-repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

const worldId = process.argv[2];
if (!worldId) throw new Error("WORLD_ID_REQUIRED");

const repository = new PostgresWorldRepository(databaseUrl);

try {
  const snapshots = await repository.inspectSnapshots(worldId);
  const latestValid = snapshots.find((snapshot) => snapshot.status === "VALID") ?? null;
  const latest = snapshots[0] ?? null;

  console.info(JSON.stringify({
    worldId,
    latest,
    latestValid,
    snapshots,
  }, null, 2));

  if (!latest || latest.status !== "VALID") {
    process.exitCode = 2;
  }
} finally {
  await repository.close();
}
