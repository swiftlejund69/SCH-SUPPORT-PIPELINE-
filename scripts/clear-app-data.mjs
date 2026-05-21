/**
 * Clears all referral, leaver, and transfer records plus uploaded files.
 * Keeps auth users and profiles. Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage: node scripts/clear-app-data.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) {
    return {};
  }
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = { ...process.env, ...loadEnvLocal() };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STORAGE_BUCKETS = [
  "referral-documents",
  "sd-documents",
  "maintenance-media",
];

async function removeAllInBucket(bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (error) {
    throw new Error(`${bucket}/${prefix}: ${error.message}`);
  }
  if (!data?.length) return 0;

  let removed = 0;
  const filePaths = [];

  for (const item of data) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata === null && item.id === null) {
      removed += await removeAllInBucket(bucket, itemPath);
    } else {
      filePaths.push(itemPath);
    }
  }

  if (filePaths.length > 0) {
    const batchSize = 20;
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove(batch);
      if (removeError) {
        throw new Error(`${bucket} remove: ${removeError.message}`);
      }
      removed += batch.length;
    }
  }

  return removed;
}

async function clearTable(table) {
  const { error } = await supabase
    .from(table)
    .delete()
    .gte("created_at", "1970-01-01");

  if (error) {
    throw new Error(`${table} delete: ${error.message}`);
  }
}

async function main() {
  console.log("Clearing app data (referrals, leavers, transfers, storage)…");

  for (const table of ["referrals", "leavers", "transfers"]) {
    await clearTable(table);
    console.log(`  ✓ Cleared table: ${table}`);
  }

  for (const bucket of STORAGE_BUCKETS) {
    const count = await removeAllInBucket(bucket);
    console.log(`  ✓ Cleared storage bucket: ${bucket} (${count} files)`);
  }

  console.log("Done. History and queues are empty. User profiles were not changed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
