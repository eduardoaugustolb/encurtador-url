"use client";

import type { Link } from "./types";
import { Button } from "../ui/button";

interface LinkCardProps {
  link: Link;
  onEdit: (link: Link) => void;
  onDelete: (id: string) => void;
}

export function LinkCard({ link, onEdit, onDelete }: LinkCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{link.title ?? link.slug}</p>
        <p className="truncate text-sm text-muted-foreground">
          /{link.slug} &rarr; {link.destinationUrl}
        </p>
        <p className="text-xs text-muted-foreground">
          Created {new Date(link.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            link.isActive ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(link)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => onDelete(link.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
