import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

// Read only public client credentials; never write a service-role key to Next.js env.
const output = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
const values = Object.fromEntries(
  output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    return match ? [[match[1], match[2]]] : [];
  })
);
const url = values.API_URL;
const key = values.PUBLISHABLE_KEY ?? values.ANON_KEY;
if (!url || !key) throw new Error("Local Supabase URL/key missing. Run npm run db:start first.");
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
  throw new Error("Expected a local Supabase API URL.");
}
const path = ".env.local";
let contents = existsSync(path) ? readFileSync(path, "utf8") : "";
for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
})) {
  const pattern = new RegExp(`^(?:export\\s+)?${name}=.*$`, "gm");
  contents = pattern.test(contents)
    ? contents.replace(pattern, `${name}=${value}`)
    : `${contents}${contents && !contents.endsWith("\n") ? "\n" : ""}${name}=${value}\n`;
}
writeFileSync(path, contents, { mode: 0o600 });
chmodSync(path, 0o600);
console.log("Configured .env.local for local Supabase. Restart the app if it is running.");
