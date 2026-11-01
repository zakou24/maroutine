import { expect, test } from "@playwright/test";
import { AUTH_FILE } from "./owner";

test.use({ storageState: AUTH_FILE });

// Le vrai lecteur ZXing, sous la CSP de production, devant une caméra simulée qui filme un EAN-13
// dessiné : garde le chargement du .wasm (/zxing/, 'wasm-unsafe-eval') et la lecture (D29).
test("scanner : le lecteur lit un EAN-13 filmé et ouvre la quantité (D29)", async ({ page }) => {
  await page.addInitScript(() => {
    // Motifs EAN-13 : jeux L, G et R, et parité du premier chiffre.
    const L = [
      "0001101",
      "0011001",
      "0010011",
      "0111101",
      "0100011",
      "0110001",
      "0101111",
      "0111011",
      "0110111",
      "0001011",
    ];
    const G = [
      "0100111",
      "0110011",
      "0011011",
      "0100001",
      "0011101",
      "0111001",
      "0000101",
      "0010001",
      "0001001",
      "0010111",
    ];
    const R = [
      "1110010",
      "1100110",
      "1101100",
      "1000010",
      "1011100",
      "1001110",
      "1010000",
      "1000100",
      "1001000",
      "1110100",
    ];
    const P = [
      "LLLLLL",
      "LLGLGG",
      "LLGGLG",
      "LLGGGL",
      "LGLLGG",
      "LGGLLG",
      "LGGGLL",
      "LGLGLG",
      "LGLGGL",
      "LGGLGL",
    ];
    const code = "3017620422003";
    const d = [...code].map(Number);
    let bits = "101";
    for (let i = 1; i <= 6; i++) bits += (P[d[0]!]![i - 1] === "L" ? L : G)[d[i]!];
    bits += "01010";
    for (let i = 7; i <= 12; i++) bits += R[d[i]!];
    bits += "101";
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = "#000";
      const w = 4;
      const x0 = (640 - bits.length * w) / 2;
      [...bits].forEach((b, i) => {
        if (b === "1") ctx.fillRect(x0 + i * w, 120, w, 240);
      });
      requestAnimationFrame(draw);
    };
    draw();
    const stream = canvas.captureStream(15);
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: async () => stream },
      configurable: true,
    });
  });
  // La réponse du serveur est simulée : seul compte le code envoyé.
  let asked = "";
  await page.route("**/api/v1/foods/barcode/*", async (route) => {
    asked = route.request().url().split("/").at(-1)!;
    await route.fulfill({
      json: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Pâte à tartiner",
        brand: null,
        kcalPer100g: 539,
        proteinPer100g: 6.3,
        source: "off",
      },
    });
  });
  const wasm = page.waitForResponse((r) => r.url().endsWith("/zxing/zxing_reader.wasm"));
  await page.goto("/alimentation/ajouter?meal=breakfast");
  await page.getByRole("button", { name: "Scanner" }).click();
  const res = await wasm;
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/wasm");
  await expect(page.getByRole("textbox", { name: "Quantité (g)" })).toBeVisible({ timeout: 15000 });
  expect(asked).toBe("3017620422003");
});
