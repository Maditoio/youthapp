import fs from "node:fs";

const file = "src/prisma/contract.d.ts";
const source = fs
  .readFileSync(file, "utf8")
  .replace(/^\/\* eslint-disable @typescript-eslint\/no-empty-object-type[\s\S]*?\*\/\n/, "");
const replacements = [
  ["readonly byCodec: {};", "readonly byCodec: Record<string, never>;"],
  ["type FieldTypeOverrides = {};", "type FieldTypeOverrides = Record<string, never>;"],
  ["type ColumnTypeOverrides = {};", "type ColumnTypeOverrides = Record<string, never>;"],
  ["readonly extensions: {};", "readonly extensions: Record<string, never>;"],
  ["readonly meta: {};", "readonly meta: Record<string, never>;"],
];
const patched = replacements.reduce((text, [from, to]) => text.replaceAll(from, to), source);
if (patched !== fs.readFileSync(file, "utf8")) fs.writeFileSync(file, patched);
