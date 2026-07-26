/**
 * WebGL support probe, shared by every gated scene.
 *
 * Creates a throwaway context rather than trusting feature detection on the
 * constructor alone — a browser can expose `WebGLRenderingContext` and still
 * refuse to hand out a context (blocklisted driver, too many live contexts).
 */
export function canUseWebGL(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
