import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Le lecteur de codes-barres charge son fichier .wasm depuis /zxing/ (D29) : copié depuis la
// dépendance avant dev et build, jamais versionné, pour rester à la version installée.
const require = createRequire(import.meta.url);
const fromDetector = createRequire(require.resolve("barcode-detector/ponyfill"));
const wasm = fromDetector.resolve("zxing-wasm/reader/zxing_reader.wasm");
const target = fileURLToPath(new URL("../public/zxing/", import.meta.url));

mkdirSync(target, { recursive: true });
copyFileSync(wasm, `${target}zxing_reader.wasm`);
console.log("[zxing] zxing_reader.wasm copié dans public/zxing/.");
