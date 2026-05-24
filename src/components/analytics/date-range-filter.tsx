"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DateRangePreset = "7d" | "30d" | "90d" | "custom";

interface Props {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
  customFrom?: string;
  customTo?: string;
  onCustomRange?: (from: string, to: string) => void;
}

const presets: { label: string; value: DateRangePreset }[] = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "Custom", value: "custom" },
];

export function DateRangeFilter({
  value,
  onChange,
  customFrom,
  customTo,
  onCustomRange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button
          type="button"
          key={p.value}
          variant={value === p.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </Button>
      ))}

      {value === "custom" && onCustomRange && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom ?? ""}
            onChange={(e) => onCustomRange(e.target.value, customTo ?? "")}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={customTo ?? ""}
            onChange={(e) => onCustomRange(customFrom ?? "", e.target.value)}
            className="w-auto"
          />
        </div>
      )}
    </div>
  );
}
