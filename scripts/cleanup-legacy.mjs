// Runs before every build (npm run build). Removes files of the previous app version that would
// otherwise clash with the new ones, for example the old service worker in public/.
import fs from "node:fs";
import path from "node:path";

const legacy = [
  "public/sw.js",
  "public/manifest.json",
  "src/srs.js",
  "src/lessons.js",
  "src/apkgImport.js",
  "src/haptics.js",
];
for (const f of legacy) {
  const p = path.resolve(f);
  if (fs.existsSync(p)) {
    fs.rmSync(p);
    console.log("removed legacy file", f);
  }
}
