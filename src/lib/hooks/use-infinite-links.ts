"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useInfiniteQuery } from "@tanstack/react-query";

interface Link {
  id: string;
  slug: string;
  destinationUrl: string;
  title: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: Link[];
  nextCursor: string | null;
}

export function useInfiniteLinks(
  initialData?: InfiniteData<PaginatedResponse>,
) {
  return useInfiniteQuery({
    queryKey: ["links"],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `/api/links?${pageParam ? `cursor=${pageParam}` : ""}`,
      );
      if (!res.ok) throw new Error("Failed to fetch links");
      return res.json() as Promise<PaginatedResponse>;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    initialData,
  });
}
