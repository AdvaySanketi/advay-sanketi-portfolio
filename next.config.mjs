/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next dev` and `next build` both own `.next`, so running a build while a
  // dev server is up corrupts that server's chunk manifest (symptom: chunks
  // 404 as `/_next/undefined`). Set NEXT_DIST_DIR to build somewhere else and
  // leave a running dev server alone.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  images: {
    // Project covers are generated on the fly by the /cover route; keep
    // next/image out of the way so dynamic sources render as-is.
    unoptimized: true,
  },
  // three ships untranspiled ESM in a few subpaths.
  transpilePackages: ["three"],
};

export default nextConfig;
