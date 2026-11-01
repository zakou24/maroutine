import type { BarcodeDetector as Detector } from "barcode-detector/ponyfill";

let prepared = false;

// Lecteur de codes-barres (D29) : l'API BarcodeDetector réimplémentée avec ZXing en WebAssembly,
// car Safari sur iPhone ne l'a pas. Chargé seulement à l'ouverture du scanner, et son fichier
// .wasm est servi par l'app (copié dans public/zxing/ par scripts/copy-zxing-wasm.ts), sans CDN.
export async function createBarcodeDetector(): Promise<Pick<Detector, "detect">> {
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
  if (!prepared) {
    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? `/zxing/${path}` : prefix + path,
      },
    });
    prepared = true;
  }
  return new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a"] });
}
