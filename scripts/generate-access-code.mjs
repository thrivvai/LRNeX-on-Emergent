#!/usr/bin/env node
import { randomBytes, createHash } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const length = Number(process.argv[2] ?? 16);
if (!Number.isInteger(length) || length < 10 || length > 32) throw new Error("Length must be between 10 and 32 characters");
const bytes = randomBytes(length);
const code = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
const hash = createHash("sha256").update(code).digest("hex");
console.log(JSON.stringify({ code, code_hash: hash, length }, null, 2));
