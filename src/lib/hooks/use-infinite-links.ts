"use client";

import { api } from "@/lib/trpc/react";

export function useInfiniteLinks() {
  return api.links.list.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    },
  );
}
