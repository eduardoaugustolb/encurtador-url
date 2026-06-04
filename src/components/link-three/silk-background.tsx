"use client";

import Silk from "@/components/Silk";

export function SilkBackground() {
  return (
    <div className="absolute inset-0 -z-1 h-svh w-screen opacity-50">
      <Silk
        speed={2}
        scale={1}
        color="#3f3f46"
        noiseIntensity={1.5}
        rotation={0}
      />
    </div>
  );
}
