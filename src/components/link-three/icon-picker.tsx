"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ICON_NAMES } from "@/lib/icons/names";
import { DynamicIcon } from "./dynamic-icon";

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? ICON_NAMES.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase()),
      ).slice(0, 60)
    : ICON_NAMES.slice(0, 60);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-full justify-start gap-2">
            <div className="flex items-center gap-2">
              {value ? (
                <>
                  <DynamicIcon name={value} className="size-4" />
                  <span className="font-mono text-xs">{value}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Selecionar ícone</span>
              )}
            </div>
          </Button>
        }
      />
      <PopoverContent
        className="w-80 p-3"
        align="start"
      >
        <Input
          placeholder="Buscar ícones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
          autoFocus
        />
        <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
          {filtered.map((name) => (
            <button
              type="button"
              key={name}
              title={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
                setSearch("");
              }}
              className={`flex items-center justify-center rounded-lg p-2 text-lg transition-colors hover:bg-muted ${
                value === name ? "bg-muted ring-1 ring-ring" : ""
              }`}
            >
              <DynamicIcon name={name} className="size-5" />
            </button>
          ))}
          {search && filtered.length === 0 && (
            <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
              Nenhum ícone encontrado
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
