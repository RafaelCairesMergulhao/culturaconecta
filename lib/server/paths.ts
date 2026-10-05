import path from "path";

export const dataDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
export const dbFile = path.join(dataDir, "network.json");
export const uploadsDir = path.join(dataDir, "uploads");

export function uploadFile(id: string, ext: string) {
  return path.join(/*turbopackIgnore: true*/ uploadsDir, `${id}.${ext}`);
}
