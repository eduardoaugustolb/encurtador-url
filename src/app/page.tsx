import { OWNER, SITE } from "@/lib/constants";
import { SilkBackground } from "@/components/link-three/silk-background";
import { StaggerEntrance } from "@/components/link-three/stagger-entrance";
import { LinkThreeScrollList } from "@/components/link-three/link-three-scroll-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center px-6">
      <SilkBackground />

      <StaggerEntrance className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-8">
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-30 w-30 aspect-square">
            <AvatarFallback>
              <Skeleton className="w-full h-full rounded-full" />
            </AvatarFallback>
            <AvatarImage
              src={OWNER.avatar || undefined}
              className="aspect-square"
            />
          </Avatar>

          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {OWNER.name}
            </h1>
            <p className="text-sm text-zinc-400">{OWNER.handle}</p>
          </div>

          {OWNER.bio && (
            <p className="max-w-xs text-center text-md leading-relaxed text-zinc-500">
              {OWNER.bio}
            </p>
          )}
        </div>

        <LinkThreeScrollList />

        <div className="flex flex-col items-center gap-2">
          <a
            href="https://github.com/eduardoaugustolb/encurtador-url"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-700 transition-colors hover:text-zinc-500"
          >
            {SITE.name}
          </a>
        </div>
      </StaggerEntrance>
    </main>
  );
}
