"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { api } from "@/lib/trpc/react";
import { useInfiniteLinks } from "@/lib/hooks/use-infinite-links";
import { useIntersection } from "@/lib/hooks/use-intersection";
import { CreateLinkForm } from "./create-link-form";
import { EditLinkDialog } from "./edit-link-dialog";
import { SortableLinkCard } from "./sortable-link-card";
import { LinkListSkeleton } from "./link-list-skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import type { Link } from "./types";

gsap.registerPlugin(useGSAP);

export function LinkList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError,
    refetch,
  } = useInfiniteLinks();

  const [editingLink, setEditingLink] = useState<Link | null>(null);

  const [orderedLinks, setOrderedLinks] = useState<Link[]>([]);
  const orderedLinksRef = useRef(orderedLinks);
  orderedLinksRef.current = orderedLinks;

  const cacheLinks = data?.pages.flatMap((p) => p.data).filter(Boolean) ?? [];

  useEffect(() => {
    setOrderedLinks(cacheLinks);
  }, [cacheLinks]);

  const reorderMutation = api.links.reorder.useMutation({
    onError: (err) => {
      setOrderedLinks(cacheLinks);
      toast.error(err.message);
    },
    onSettled: () => {
      refetch();
    },
  });

  const deleteMutation = api.links.delete.useMutation({
    onSuccess: () => {
      toast.success("Link deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const container = useRef<HTMLDivElement>(null);
  const cardListRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cards = cardListRef.current?.children;
      if (!cards || cards.length === 0) return;
      gsap.fromTo(
        cards,
        { opacity: 0, y: 12, filter: "blur(4px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out",
        },
      );
    },
    { scope: container, dependencies: [orderedLinks.length] },
  );

  const sentinelRef = useIntersection(() => {
    if (hasNextPage) fetchNextPage();
  }, !!hasNextPage);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const prev = orderedLinksRef.current;
      const oldIndex = prev.findIndex((l) => l.id === active.id);
      const newIndex = prev.findIndex((l) => l.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...prev];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      setOrderedLinks(reordered);

      const items = reordered.map((link, i) => ({
        id: link.id,
        position: i,
      }));

      reorderMutation.mutate({ items });
    },
    [reorderMutation],
  );

  if (isFetching && !data) return <LinkListSkeleton />;

  if (isError) {
    return (
      <div className="space-y-4">
        <CreateLinkForm onCreated={() => refetch()} />
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-8 text-center">
          <p className="text-sm text-destructive">
            Failed to load links.{" "}
            <button
              type="button"
              onClick={() => refetch()}
              className="underline hover:text-foreground"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  const linkIds = orderedLinks.map((l) => l.id);

  return (
    <ErrorBoundary>
      <div ref={container} className="space-y-4">
        <CreateLinkForm onCreated={() => refetch()} />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={linkIds}
            strategy={verticalListSortingStrategy}
          >
            <div ref={cardListRef} className="space-y-2">
              {orderedLinks.map((link) => (
                <SortableLinkCard
                  key={link.id}
                  link={link}
                  onEdit={setEditingLink}
                  onDelete={(id) => deleteMutation.mutate({ id })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div ref={sentinelRef}>
          {isFetchingNextPage && <LinkListSkeleton />}
        </div>

        {editingLink && (
          <EditLinkDialog
            key={editingLink.id}
            link={editingLink}
            onClose={() => setEditingLink(null)}
            onUpdated={() => {
              setEditingLink(null);
              refetch();
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
