"use client";

import { useEffect, useRef } from "react";
import { type JellyHandle, loadJelly } from "./jelly-runtime";

// One transparent 3D layer over the whole page. It draws a live jelly bot
// into every <Bot> on screen (they render as [data-jelly] boxes), so the
// browser needs a single WebGL context however many bots there are.
export function JellyOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let handle: JellyHandle | null = null;
    let cancelled = false;
    const html = document.documentElement;

    loadJelly().then((jelly) => {
      const canvas = canvasRef.current;
      if (cancelled || !jelly || !canvas) return;
      handle = jelly.mountOverlay(canvas, document.body, {});
      html.dataset.jelly = "live";
    });

    return () => {
      cancelled = true;
      handle?.dispose();
      delete html.dataset.jelly;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 size-full"
    />
  );
}
