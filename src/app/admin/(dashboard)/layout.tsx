"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";

gsap.registerPlugin(useGSAP);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo(
      headerRef.current,
      { opacity: 0, y: -16, filter: "blur(4px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, ease: "power2.out" },
    );
    tl.fromTo(
      mainRef.current,
      { opacity: 0, y: 12, filter: "blur(4px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, ease: "power2.out" },
    );
  });

  return (
    <div className="min-h-screen">
      <header ref={headerRef} className="border-b shadow-sm">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/admin/links"
            className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] font-semibold"
          >
            <Logo className="h-5 w-auto text-foreground" aria-hidden />
            <span className="text-balance">Bit Link</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin/links" className="hover:underline">
              Links
            </Link>
            <Link href="/admin/analytics" className="hover:underline">
              Analytics
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Logout
              </Button>
            </form>
          </div>
        </nav>
      </header>
      <main ref={mainRef} className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
