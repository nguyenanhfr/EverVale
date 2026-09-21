import { PostgresWorldRepository } from "./postgres-world-repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

const worldId = process.argv[2];
const revisionRaw = process.argv[3];
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="));

if (!worldId) throw new Error("WORLD_ID_REQUIRED");
if (!revisionRaw) throw new Error("RECOVERY_REVISION_REQUIRED");

const revision = Number(revisionRaw);
if (!Number.isSafeInteger(revision) || revision < 0) {
  throw new Error("INVALID_RECOVERY_REVISION");
}
if (confirmation !== `--confirm=${worldId}`) {
  throw new Error("RECOVERY_CONFIRMATION_REQUIRED");
}

const repository = new PostgresWorldRepository(databaseUrl);

try {
  const snapshots = await repository.inspectSnapshots(worldId);
  const source = snapshots.find((snapshot) => snapshot.revision === revision);
  if (!source) throw new Error("RECOVERY_SNAPSHOT_NOT_FOUND");
  if (source.status !== "VALID") throw new Error("RECOVERY_SNAPSHOT_CORRUPT");

  const recovered = await repository.recoverFromSnapshot(worldId, revision);
  console.info(JSON.stringify({
    worldId,
    sourceRevision:revision,
    recoveredRevision:recovered.revision,
    recoveryEvent:recovered.events.at(-1) ?? null,
  }, null, 2));
} finally {
  await repository.close();
}
