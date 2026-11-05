// Loads the 3D jelly bots (three.js r128 + public/jelly/jelly-scene.js) on
// demand. Both are plain browser scripts that set window.THREE and
// window.ZgraiJelly, so they live in public/ and load once per page.

export type JellyState = "awake" | "asleep" | "speaking";

export type JellyHandle = {
  wake(): void;
  sleep(): void;
  refresh(): void;
  dispose(): void;
};

export type JellyFieldOptions = {
  bots: { color: string; shape?: string }[];
  master?: boolean | { color: string };
  state?: "awake" | "asleep";
};

type JellyLib = {
  shapes: string[];
  mountOverlay(
    canvas: HTMLCanvasElement,
    root: Element | null,
    options: { field?: JellyFieldOptions },
  ): JellyHandle;
};

declare global {
  interface Window {
    THREE?: unknown;
    ZgraiJelly?: JellyLib;
  }
}

const SCRIPTS = ["/vendor/three-r128.min.js", "/jelly/jelly-scene.js"];

let loading: Promise<JellyLib | null> | null = null;
let webgl: boolean | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Couldn't load ${src}`));
    document.head.appendChild(script);
  });
}

function supportsWebGL() {
  if (webgl !== null) return webgl;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webgl = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

// Resolves to the jelly library, or null when WebGL or the scripts are not
// available. Callers then keep showing the flat SVG bots.
export function loadJelly(): Promise<JellyLib | null> {
  if (typeof window === "undefined" || !supportsWebGL()) {
    return Promise.resolve(null);
  }
  if (window.ZgraiJelly) return Promise.resolve(window.ZgraiJelly);
  loading ??= (async () => {
    try {
      if (!window.THREE) await loadScript(SCRIPTS[0]);
      if (!window.ZgraiJelly) await loadScript(SCRIPTS[1]);
      return window.ZgraiJelly ?? null;
    } catch {
      loading = null;
      return null;
    }
  })();
  return loading;
}
