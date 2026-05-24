import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Encurtador de URLs",
  description:
    "Encurte links longos, compartilhe de forma inteligente e acompanhe cada clique com análises em tempo real. Bit Link — o encurtador de URLs com dashboard completo.",
  openGraph: {
    title: "Encurtador de URLs",
    description:
      "Encurte links longos, compartilhe de forma inteligente e acompanhe cada clique com análises em tempo real.",
  },
  twitter: {
    title: "Encurtador de URLs",
    description:
      "Encurte links longos, compartilhe de forma inteligente e acompanhe cada clique com análises em tempo real.",
  },
};

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight text-black dark:text-zinc-50">
            Encurte seus links com análises em tempo real
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Crie links curtos e rastreáveis em segundos. Acompanhe cliques,
            referências e tendências com um dashboard completo de analytics.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-auto"
            href="/admin/login"
          >
            Acessar painel
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-6 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-auto"
            href="/admin/login"
          >
            Criar link curto
          </Link>
        </div>
      </main>
    </div>
  );
}
