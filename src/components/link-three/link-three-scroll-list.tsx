"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useIntersection } from "@/lib/hooks/use-intersection";
import { api } from "@/lib/trpc/react";
import { Skeleton } from "../ui/skeleton";
import { DynamicIcon } from "./dynamic-icon";

export function LinkThreeScrollList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    api.links.getHomeLinksPaginated.useInfiniteQuery(
      { limit: 10 },
      { getNextPageParam: (last) => last.nextCursor ?? undefined },
    );

  const sentinelRef = useIntersection(() => {
    if (hasNextPage) fetchNextPage();
  }, !!hasNextPage);

  const links = data?.pages.flatMap((p) => p.data) ?? [];

  if (isFetching && links.length === 0) {
    return (
      <div className="flex w-full flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-12 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>
    );
  }

  if (links.length === 0) return null;

  return (
    <ScrollArea className="w-full max-h-[40vh]">
      <div className="flex flex-col gap-3 pr-4">
        {links.map((link) => (
          <a
            key={link.slug}
            href={`/${link.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/50 hover:text-white active:scale-[0.98]"
          >
            {link.icon ? (
              <DynamicIcon
                name={link.icon}
                className="h-5 w-5 shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-300"
              />
            ) : (
              <div className="size-5 shrink-0" />
            )}
            <span>{link.title ?? link.slug}</span>
          </a>
        ))}

        <div ref={sentinelRef}>
          {isFetchingNextPage && (
            <div className="h-10 animate-pulse rounded-xl bg-zinc-800/30" />
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
