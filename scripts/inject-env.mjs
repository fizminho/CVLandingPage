import { readFile, writeFile } from "node:fs/promises";

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing Cloudflare build environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const path = new URL("../chatbot.js", import.meta.url);
let source = await readFile(path, "utf8");

const replacements = {
  __SUPABASE_URL__: process.env.SUPABASE_URL.trim(),
  __SUPABASE_ANON_KEY__: process.env.SUPABASE_ANON_KEY.trim(),
};

for (const [placeholder, value] of Object.entries(replacements)) {
  if (!source.includes(placeholder)) {
    throw new Error(`Expected placeholder not found: ${placeholder}`);
  }
  source = source.replaceAll(placeholder, JSON.stringify(value));
}

await writeFile(path, source);
console.log("Supabase public configuration injected for the Cloudflare build.");
