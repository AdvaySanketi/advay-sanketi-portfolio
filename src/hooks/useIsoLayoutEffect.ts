import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` that degrades to `useEffect` on the server, so animation
 * setup doesn't emit the React SSR warning.
 */
export const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
