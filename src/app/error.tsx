"use client";

import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--muted-foreground)/0.06),transparent_60%)]" />

      <div className="w-full max-w-sm space-y-8 px-4 text-center">
        <Logo className="mx-auto h-8 w-auto text-foreground" aria-hidden />
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground text-balance">
            Something went wrong
          </h1>
          <p className="text-balance text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
