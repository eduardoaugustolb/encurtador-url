import { QueryProvider } from "@/components/query-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
