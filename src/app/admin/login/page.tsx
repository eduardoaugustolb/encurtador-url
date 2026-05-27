"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/trpc/react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

gsap.registerPlugin(useGSAP);

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginMutation = api.auth.login.useMutation({
    onSuccess: () => {
      router.push("/admin/links");
    },
    onError: (err) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const container = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.fromTo(
        logoRef.current,
        { opacity: 0, y: -12, filter: "blur(4px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "power2.out",
        },
      );
      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: -12, filter: "blur(4px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.4,
          ease: "power2.out",
        },
      );
      tl.fromTo(
        subtitleRef.current,
        { opacity: 0, y: -12, filter: "blur(4px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.4,
          ease: "power2.out",
        },
      );
      tl.fromTo(
        formRef.current,
        { opacity: 0, y: 20, filter: "blur(4px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "power2.out",
        },
      );
    },
    { scope: container },
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const password = new FormData(e.currentTarget).get("password") as string;
    loginMutation.mutate({ password });
  }

  return (
    <div
      ref={container}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--muted-foreground)/0.06),transparent_60%)]" />

      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <div ref={logoRef}>
            <Logo
              className="mx-auto mb-4 h-8 w-auto text-foreground"
              aria-hidden
            />
          </div>
          <h1
            ref={titleRef}
            className="text-3xl font-semibold tracking-tight text-balance"
          >
            Bit Link
          </h1>
          <p ref={subtitleRef} className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your links
          </p>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="rounded-xl bg-card p-6 shadow-sm ring-1 ring-border space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div
              ref={errorRef}
              className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in\u2026" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
