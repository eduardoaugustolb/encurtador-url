import Link from "next/link";
import { OWNER, SITE } from "@/lib/constants";
import { LinkThreeLinks } from "@/components/link-three/links";

export default function HomePage() {
  const initials = OWNER.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-black px-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-zinc-800/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-zinc-800/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center gap-8 py-16">
        {/* Avatar */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-2xl font-bold tracking-tight text-white ring-2 ring-white/10">
          {initials}
        </div>

        {/* Name + Handle */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-bold tracking-tight text-white">
            {OWNER.name}
          </h1>
          <p className="text-sm text-zinc-400">{OWNER.handle}</p>
        </div>

        {/* Bio */}
        {OWNER.bio && (
          <p className="max-w-xs text-center text-sm leading-relaxed text-zinc-500">
            {OWNER.bio}
          </p>
        )}

        {/* Links */}
        <LinkThreeLinks links={OWNER.links} />

        {/* Footer */}
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/admin/login"
            className="text-xs text-zinc-700 transition-colors hover:text-zinc-500"
          >
            {SITE.name}
          </Link>
        </div>
      </div>
    </main>
  );
}
