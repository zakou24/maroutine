// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeScanner } from "@/app/(app)/alimentation/ajouter/barcode-scanner";

const { detect, createBarcodeDetector } = vi.hoisted(() => ({
  detect: vi.fn(),
  createBarcodeDetector: vi.fn(),
}));
vi.mock("@/lib/barcode-detector", () => ({ createBarcodeDetector }));

const stop = vi.fn();
const getUserMedia = vi.fn();

beforeEach(() => {
  createBarcodeDetector.mockReset();
  createBarcodeDetector.mockResolvedValue({ detect });
  detect.mockReset();
  stop.mockReset();
  getUserMedia.mockReset();
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  // jsdom ne lit pas les vidéos.
  HTMLMediaElement.prototype.play = vi.fn(async () => {});
});
afterEach(cleanup);

describe("BarcodeScanner (D29)", () => {
  it("demande la caméra arrière, sans micro", async () => {
    detect.mockResolvedValue([]);
    render(<BarcodeScanner onCode={vi.fn()} />);
    await waitFor(() =>
      expect(getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: "environment" },
        audio: false,
      }),
    );
  });

  it("un code valide lu appelle onCode une seule fois et coupe la caméra", async () => {
    detect
      .mockResolvedValueOnce([{ rawValue: "3017620422004" }])
      .mockResolvedValue([{ rawValue: "3017620422003" }]);
    const onCode = vi.fn();
    render(<BarcodeScanner onCode={onCode} />);
    await waitFor(() => expect(onCode).toHaveBeenCalledWith("3017620422003"), { timeout: 2000 });
    expect(stop).toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(onCode).toHaveBeenCalledTimes(1);
  });

  it("quitter l'écran coupe la caméra", async () => {
    detect.mockResolvedValue([]);
    const { unmount } = render(<BarcodeScanner onCode={vi.fn()} />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    await waitFor(() => expect(detect).toHaveBeenCalled(), { timeout: 2000 });
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it("caméra refusée : message clair (Review Focus 3)", async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error("refus"), { name: "NotAllowedError" }));
    render(<BarcodeScanner onCode={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Caméra indisponible. Saisis le code écrit sous les barres.",
    );
  });

  it("lecteur impossible à charger : la caméra accordée ensuite est coupée (revue du Lot 4.1)", async () => {
    createBarcodeDetector.mockRejectedValue(new Error("hors ligne"));
    let grant: (stream: unknown) => void = () => {};
    getUserMedia.mockReturnValue(new Promise((resolve) => (grant = resolve)));
    render(<BarcodeScanner onCode={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Caméra indisponible.");
    grant({ getTracks: () => [{ stop }] });
    await waitFor(() => expect(stop).toHaveBeenCalled());
  });

  it("lecture qui échoue sans cesse (.wasm absent) : caméra coupée et message (revue du Lot 4.1)", async () => {
    detect.mockRejectedValue(new Error("wasm"));
    render(<BarcodeScanner onCode={vi.fn()} />);
    expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent(
      "Caméra indisponible.",
    );
    expect(stop).toHaveBeenCalled();
  });

  it("sans caméra du tout (pas de mediaDevices) : même message", async () => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
    render(<BarcodeScanner onCode={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Caméra indisponible.");
  });
});
