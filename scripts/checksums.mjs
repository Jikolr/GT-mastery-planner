import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const directory = process.argv[2] ?? "release";
const entries = readdirSync(directory)
  .filter((name) => /\.(exe|dmg|zip)$/.test(name))
  .sort();
const lines = entries.map(
  (name) =>
    `${createHash("sha256")
      .update(readFileSync(path.join(directory, name)))
      .digest("hex")}  ${name}`,
);
writeFileSync(path.join(directory, "SHA256SUMS.txt"), lines.join("\n") + "\n");
console.log(`Checksums written for ${entries.length} packages.`);
