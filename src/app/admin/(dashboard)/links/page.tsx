import type { Metadata } from "next";
import "server-only";
import { Suspense } from "react";
import { LinkList } from "@/components/links/link-list";
import { LinkListSkeleton } from "@/components/links/link-list-skeleton";

export const metadata: Metadata = {
  title: "Links",
};

export default async function LinksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-balance">Links</h1>
      <Suspense fallback={<LinkListSkeleton />}>
        <LinkList />
      </Suspense>
    </div>
  );
}
