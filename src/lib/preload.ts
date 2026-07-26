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
