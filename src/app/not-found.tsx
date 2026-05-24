import type { Metadata } from "next";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import ASCIIText from "@/components/ascii-text";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description:
    "A página que você procura não existe no Bit Link. Volte para a home e tente novamente.",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-10 text-white">
      {/* Glow */}
      <div className="absolute left-1/2 top-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />

      <section className="relative z-10 flex w-full max-w-5xl flex-col items-center">
        {/* Logo */}
        <Logo className="mb-12 h-7 w-auto text-white/90" aria-hidden />

        {/* ASCII */}
        <div className="relative flex w-full items-center justify-center">
          <div className="relative h-45 w-full max-w-175 sm:h-60 md:h-80 lg:h-100">
            <ASCIIText
              text="404"
              enableWaves
              asciiFontSize={8}
              planeBaseHeight={12}
              textFontSize={220}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 flex max-w-md flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Página não encontrada
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-white/55 sm:text-base">
            Parece que essa página sumiu no multiverso da internet. Talvez o
            link esteja quebrado ou ela nunca existiu.
          </p>

          <Link
            href="/"
            className="
              group mt-8 inline-flex h-12 items-center gap-2
              rounded-2xl border border-white/10
              bg-white px-6 text-sm font-medium text-black
              transition-all duration-200
              hover:scale-[1.03]
              hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]
              active:scale-95
            "
          >
            <ArrowLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Voltar para home
          </Link>
        </div>
      </section>
    </main>
  );
}
