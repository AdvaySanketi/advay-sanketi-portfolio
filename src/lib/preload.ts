/**
 * Handoff between the intro curtain and the hero animation.
 *
 * Kept as a module-level constant plus a DOM class (rather than React context)
 * so any component can ask "has the intro finished?" synchronously on mount,
 * including ones that render before the Preloader's effects run.
 */

export const PRELOAD_DONE_EVENT = "preload:done";

export function markPreloadDone() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("is-loaded");
  window.dispatchEvent(new Event(PRELOAD_DONE_EVENT));
}

export function isPreloadDone(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("is-loaded");
}
