import type { LinkThreeLink } from "@/lib/constants";
import {
  GlobeHemisphereWest,
  GithubLogo,
  LinkedinLogo,
  TwitterLogo,
  YoutubeLogo,
  InstagramLogo,
  TiktokLogo,
  FacebookLogo,
  Envelope,
  WhatsappLogo,
  TelegramLogo,
  DiscordLogo,
  FigmaLogo,
  DribbbleLogo,
  BehanceLogo,
  MediumLogo,
  DevToLogo,
  LinkBreak,
} from "@phosphor-icons/react/dist/ssr";

const iconMap: Record<LinkThreeLink["icon"], React.ElementType> = {
  globe: GlobeHemisphereWest,
  github: GithubLogo,
  linkedin: LinkedinLogo,
  twitter: TwitterLogo,
  youtube: YoutubeLogo,
  instagram: InstagramLogo,
  tiktok: TiktokLogo,
  facebook: FacebookLogo,
  email: Envelope,
  whatsapp: WhatsappLogo,
  telegram: TelegramLogo,
  discord: DiscordLogo,
  figma: FigmaLogo,
  dribbble: DribbbleLogo,
  behance: BehanceLogo,
  medium: MediumLogo,
  devto: DevToLogo,
  hashnode: GlobeHemisphereWest,
  producthunt: GlobeHemisphereWest,
  link: LinkBreak,
};

export function LinkThreeLinks({ links }: { links: LinkThreeLink[] }) {
  return (
    <div className="flex w-full flex-col gap-3">
      {links.map((link) => {
        const Icon = iconMap[link.icon] ?? LinkBreak;
        return (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/50 hover:text-white active:scale-[0.98]"
          >
            <Icon className="h-5 w-5 shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-300" />
            <div className="flex flex-col">
              <span>{link.label}</span>
              {link.description && (
                <span className="text-xs text-zinc-600 transition-colors group-hover:text-zinc-500">
                  {link.description}
                </span>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}
