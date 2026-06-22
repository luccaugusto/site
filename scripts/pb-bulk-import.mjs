// Seed the PocketBase feed from a folder of existing photos/videos.
//
// Usage:
//   PB_URL=https://gram.luccaaugusto.xyz PB_EMAIL=you@x PB_PASS=... \
//     node scripts/pb-bulk-import.mjs ./to-import
//
// Layout: ./to-import/<post-name>/<files...>  (one folder per post; files
// sorted by name become the ordered media of that post). A single file in a
// folder makes a single post; several make a carousel.
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const PB = process.env.PB_URL;
const root = process.argv[2];
if (!PB || !root) {
  console.error("Set PB_URL and pass a directory. See header for usage.");
  process.exit(1);
}

const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const typeFor = (f) => (VIDEO_EXT.has(extname(f).toLowerCase()) ? "video" : "image");

async function authToken() {
  const res = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: process.env.PB_EMAIL, password: process.env.PB_PASS }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);
  return (await res.json()).token;
}

async function createPost(token, name) {
  const res = await fetch(`${PB}/api/collections/posts/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ caption: name, published: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`post create failed: ${res.status}`);
  return (await res.json()).id;
}

async function createMedia(token, postId, dir, file, order) {
  const buf = await readFile(join(dir, file));
  const form = new FormData();
  form.append("post", postId);
  form.append("type", typeFor(file));
  form.append("order", String(order));
  form.append("file", new Blob([buf]), file);
  const res = await fetch(`${PB}/api/collections/media/records`, {
    method: "POST",
    headers: { Authorization: token }, // do NOT set Content-Type; fetch sets the multipart boundary
    body: form,
  });
  if (!res.ok) throw new Error(`media create failed (${file}): ${res.status}`);
}

const token = await authToken();
for (const entry of await readdir(root)) {
  const dir = join(root, entry);
  if (!(await stat(dir)).isDirectory()) continue;
  const files = (await readdir(dir)).filter((f) => !f.startsWith(".")).sort();
  if (files.length === 0) continue;
  const postId = await createPost(token, basename(entry));
  let order = 0;
  for (const f of files) {
    await createMedia(token, postId, dir, f, order++);
    console.log(`+ ${entry}/${f}`);
  }
}
console.log("done");
