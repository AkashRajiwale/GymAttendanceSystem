"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "./ui";

/**
 * Full-screen camera view that reads the gym QR. By default it opens the QR's
 * /scan link; with `onResult` it hands back the QR's key instead.
 */
export function QrScanner({
  onClose,
  onResult,
  title = "Point the camera at the QR poster at the entrance",
}: {
  onClose: () => void;
  onResult?: (key: string | undefined) => void;
  title?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState(title);
  // Kept in a ref so a new callback from the parent doesn't restart the camera.
  const resultRef = useRef(onResult);
  useEffect(() => {
    resultRef.current = onResult;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera needs a secure (https) link. Use your phone's camera app to scan the QR instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setError("Camera permission was denied. Allow camera access in your browser settings, or use your phone's camera app.");
        return;
      }
      if (stopped || !video.current) return stream.getTracks().forEach((t) => t.stop());
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      setReady(true);
      const { default: jsQR } = await import("jsqr");

      const tick = () => {
        if (stopped) return;
        const v = video.current;
        if (v && ctx && v.readyState >= 2 && v.videoWidth) {
          // Decode a downscaled frame: plenty for a poster QR and much faster.
          const scale = Math.min(1, 480 / v.videoWidth);
          canvas.width = v.videoWidth * scale;
          canvas.height = v.videoHeight * scale;
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code && handle(code.data)) return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    function handle(text: string) {
      let url: URL;
      try {
        url = new URL(text, location.origin);
      } catch {
        return false;
      }
      if (url.pathname !== "/scan") {
        setHint("That's not the gym attendance QR.");
        return false;
      }
      navigator.vibrate?.(60);
      if (resultRef.current) resultRef.current(url.searchParams.get("k") ?? undefined);
      else router.push(`/scan${url.search}`);
      return true;
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} className="absolute inset-0 size-full object-cover" playsInline muted />
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center text-white">
            <Spinner className="size-8" />
          </div>
        )}
        {ready && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="size-64 rounded-3xl border-4 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <p className="rounded-xl bg-surface p-4 text-center text-foreground">{error}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 bg-background p-4">
        <p className="text-center text-sm text-muted">{hint}</p>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
