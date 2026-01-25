import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distRoot = path.resolve(__dirname, "..", "dist");
const distMain = path.join(distRoot, "main");

if (!fs.existsSync(distMain)) {
  throw new Error(`Missing build output at ${distMain}`);
}

const copies = [
  { from: path.join(distMain, "404.html"), to: path.join(distRoot, "404.html") },
  { from: path.join(distMain, ".nojekyll"), to: path.join(distRoot, ".nojekyll") },
];

for (const { from, to } of copies) {
  if (!fs.existsSync(from)) {
    if (path.basename(from) === ".nojekyll") {
      fs.writeFileSync(to, "", "utf8");
      continue;
    }
    throw new Error(`Expected build artifact missing: ${from}`);
  }
  fs.copyFileSync(from, to);
}
