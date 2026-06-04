"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function DynamicIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const [Icon, setIcon] = useState<React.ComponentType<{
    className?: string;
  }> | null>(null);

  useEffect(() => {
    let mounted = true;

    import("@phosphor-icons/react/dist/ssr")
      .then((mod) => {
        const modAny = mod as unknown as Record<
          string,
          React.ComponentType<{ className?: string }>
        >;
        const Comp = modAny[name];
        if (mounted && Comp) {
          setIcon(() => Comp);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [name]);

  if (!Icon) {
    return (
      <div
        className={cn("bg-muted animate-pulse rounded", className)}
        style={{ width: "1em", height: "1em" }}
      />
    );
  }

  return <Icon className={cn(className)} />;
}
