"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DynamicIcon } from "@/components/link-three/dynamic-icon";
import type { Link } from "./types";
import { Button } from "../ui/button";

interface SortableLinkCardProps {
  link: Link;
  onEdit: (link: Link) => void;
  onDelete: (id: string) => void;
}

export function SortableLinkCard({
  link,
  onEdit,
  onDelete,
}: SortableLinkCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-lg border p-4"
    >
      <button
        type="button"
        className="mr-2 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-4"
        >
          <circle cx="5" cy="3" r="1.5" fill="currentColor" />
          <circle cx="11" cy="3" r="1.5" fill="currentColor" />
          <circle cx="5" cy="8" r="1.5" fill="currentColor" />
          <circle cx="11" cy="8" r="1.5" fill="currentColor" />
          <circle cx="5" cy="13" r="1.5" fill="currentColor" />
          <circle cx="11" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {link.icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <DynamicIcon
              name={link.icon}
              className="size-4 text-muted-foreground"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{link.title ?? link.slug}</p>
            {link.showOnHome && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Home
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            /{link.slug} &rarr; {link.destinationUrl}
          </p>
          <p className="text-xs text-muted-foreground">
            Created {link.createdAt.toLocaleDateString()}
          </p>
        </div>
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
