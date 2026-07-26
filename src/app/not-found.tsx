import Link from "next/link";

import { SplitText } from "@/components/Reveal";

export default function NotFound() {
  return (
    <section className="shell flex min-h-[70svh] flex-col justify-center pt-36">
      <p className="label pb-6">Error 404</p>
      <SplitText
        as="h1"
        text="This page took a wrong turn."
        className="display block max-w-[12ch]"
        trigger="mount"
      />
      <Link href="/" className="link-wipe display-sm mt-12 inline-block w-fit">
        Back home →
      </Link>
    </section>
  );
}
