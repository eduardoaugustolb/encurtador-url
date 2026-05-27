import type { Metadata } from "next";
import "server-only";
import { LinkList } from "@/components/links/link-list";

export const metadata: Metadata = {
  title: "Links",
};

export default async function LinksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-balance">Links</h1>
      <LinkList />
    </div>
  );
}
