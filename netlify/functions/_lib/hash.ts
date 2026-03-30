import { createHash } from "node:crypto";

export function createConfigHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 12);
}
