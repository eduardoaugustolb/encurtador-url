"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { InfiniteData } from "@tanstack/react-query";
import { useInfiniteLinks } from "@/lib/hooks/use-infinite-links";
import { useIntersection } from "@/lib/hooks/use-intersection";
import { CreateLinkForm } from "./create-link-form";
import { EditLinkDialog } from "./edit-link-dialog";
import { LinkCard } from "./link-card";
import type { Link } from "./types";

gsap.registerPlugin(useGSAP);

interface Props {
  initialData?: InfiniteData<{
    data: Link[];
    nextCursor: string | null;
  }>;
}

export function LinkList({ initialData }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteLinks(initialData);

  const [editingLink, setEditingLink] = useState<Link | null>(null);

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

  return (
    <div ref={container} className="space-y-4">
      <CreateLinkForm onCreated={() => refetch()} />

      <div ref={cardListRef} className="space-y-2">
        {links.map((link) => (
          <LinkCard
            key={link.id}
            link={link}
            onEdit={setEditingLink}
            onDelete={async (id) => {
              await fetch(`/api/links/${id}`, { method: "DELETE" });
              refetch();
            }}
          />
        ))}
      </div>

      <div ref={sentinelRef}>
        {isFetchingNextPage && (
          <p className="text-center text-sm text-neutral-400">Loading...</p>
        )}
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
  );
}
