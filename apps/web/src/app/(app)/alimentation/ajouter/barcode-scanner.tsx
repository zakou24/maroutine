"use client";

import { normalizeBarcode } from "@maroutine/core";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { FormError } from "@/components/form-error";
import { createBarcodeDetector } from "@/lib/barcode-detector";

const SCAN_EVERY_MS = 250;
// Lectures ratées d'affilée avant d'abandonner (environ 2 s) : un .wasm qui ne charge pas ne
// doit pas laisser une caméra qui filme sans jamais lire.
const MAX_FAILURES = 8;

// Vue de la caméra arrière qui lit le premier code-barres valide (D29). Les images restent sur
// l'appareil : seul le code lu sort, par `onCode`. La caméra est coupée dès qu'un code est lu,
// et quand l'écran se ferme.
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const found = useEffectEvent(onCode);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    function stop() {
      stopped = true;
      clearInterval(timer);
      for (const track of stream?.getTracks() ?? []) track.stop();
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no_camera");
      const asked = navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      const detector = await createBarcodeDetector().catch((error: unknown) => {
        // Caméra accordée après coup alors que le lecteur manque : on la coupe aussitôt.
        asked.then((media) => media.getTracks().forEach((track) => track.stop())).catch(() => {});
        throw error;
      });
      const media = await asked;
      stream = media;
      if (stopped || !video.current) return stop();
      video.current.srcObject = media;
      await video.current.play();
      let busy = false;
      let failures = 0;
      timer = setInterval(async () => {
        if (busy || stopped || !video.current) return;
        busy = true;
        try {
          const codes = await detector.detect(video.current);
          failures = 0;
          for (const { rawValue } of codes) {
            const code = normalizeBarcode(rawValue);
            if (code && !stopped) {
              stop();
              found(code);
              return;
            }
          }
        } catch {
          // Image illisible (vidéo pas encore prête) : on réessaie au tour suivant, un temps.
          failures += 1;
          if (failures >= MAX_FAILURES && !stopped) {
            stop();
            setFailed(true);
          }
        } finally {
          busy = false;
        }
      }, SCAN_EVERY_MS);
    }

    start().catch(() => {
      stop();
      setFailed(true);
    });
    return stop;
  }, []);

  if (failed) {
    return <FormError>Caméra indisponible. Saisis le code écrit sous les barres.</FormError>;
  }
  return (
    <video
      ref={video}
      aria-label="Caméra : vise le code-barres"
      muted
      playsInline
      className="aspect-[4/3] w-full rounded-xl bg-foreground object-cover"
    />
  );
}
