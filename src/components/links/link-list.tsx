"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { toast } from "sonner";
import { api } from "@/lib/trpc/react";
import { useInfiniteLinks } from "@/lib/hooks/use-infinite-links";
import { useIntersection } from "@/lib/hooks/use-intersection";
import { CreateLinkForm } from "./create-link-form";
import { EditLinkDialog } from "./edit-link-dialog";
import { LinkCard } from "./link-card";
import { LinkListSkeleton } from "./link-list-skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import type { Link } from "./types";

gsap.registerPlugin(useGSAP);

interface Props {}

export function LinkList({}: Props) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError,
    refetch,
    error,
  } = useInfiniteLinks();

  const [editingLink, setEditingLink] = useState<Link | null>(null);

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
    { scope: container, dependencies: [data?.pages.length] },
  );

  const sentinelRef = useIntersection(() => {
    if (hasNextPage) fetchNextPage();
  }, !!hasNextPage);

  const links = data?.pages.flatMap((p) => p.data).filter(Boolean) ?? [];

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

  return (
    <ErrorBoundary>
      <div ref={container} className="space-y-4">
        <CreateLinkForm onCreated={() => refetch()} />

        <div ref={cardListRef} className="space-y-2">
          {links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onEdit={setEditingLink}
              onDelete={(id) => deleteMutation.mutate({ id })}
            />
          ))}
        </div>

        <div ref={sentinelRef}>
          {isFetchingNextPage && <LinkListSkeleton />}
        </div>

        {editingLink && (
          <EditLinkDialog
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
