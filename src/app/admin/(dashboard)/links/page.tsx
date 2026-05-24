import type { Metadata } from "next";
import "server-only";
import { LinkList } from "@/components/links/link-list";
import { paginateLinks } from "@/lib/db/queries/links";

export const metadata: Metadata = {
  title: "Links",
};

function serializeDate(v: Date): string {
  return v.toISOString();
}

export default async function LinksPage() {
  const page = await paginateLinks({ limit: 20 });

  const initialData = {
    pages: [
      {
        data: page.data.map((l) => ({
          ...l,
          createdAt: serializeDate(l.createdAt),
          updatedAt: serializeDate(l.updatedAt),
        })),
        nextCursor: page.nextCursor,
      },
    ],
    pageParams: [undefined],
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-balance">Links</h1>
      <LinkList initialData={initialData} />
    </div>
  );
}
