import fs from "node:fs";

const file = "src/prisma/contract.d.ts";
const banner = "/* eslint-disable @typescript-eslint/no-empty-object-type -- Prisma emits empty codec maps. */\n";
const source = fs.readFileSync(file, "utf8");
if (!source.startsWith(banner)) {
  fs.writeFileSync(file, banner + source.replace(/^\/\* eslint-disable @typescript-eslint\/no-empty-object-type[\s\S]*?\*\/\n/, ""));
}
