//
// ─── CONFIGURATION ──────────────────────────────────────────
// Edite este arquivo antes de subir para produção.
// Os valores abaixo controlam SEO, home page (Link Three),
// imagens Open Graph e metadados do site.
//
// ⚠️ O SEO SEMPRE favorece o OWNER, nunca o nome do wrapper.
//    O wrapper (BitLink) é apenas o motor por trás — clones
//    devem trocar apenas os dados abaixo.
//
// Os links exibidos na home são gerenciados pelo dashboard
// admin. Crie links com "Show on home page" ativado e
// escolha um ícone para cada um.
// ────────────────────────────────────────────────────────────

export interface OwnerConfig {
  name: string;
  handle: string;
  bio: string;
  avatar: string | null;
}

export interface SiteConfig {
  name: string;
  description: string;
}

export interface SEOConfig {
  defaultTitle: string;
  titleTemplate: string;
  description: string;
}

// ─── DONO ────────────────────────────────────────────────────
// Troque pelos seus dados. O avatar pode ser null para usar
// um placeholder com as iniciais.
export const OWNER: OwnerConfig = {
  name: "Eduardo Augusto",
  handle: "@eduardoaugusto",
  bio: "Desenvolvedor full-stack criando soluções web modernas.",
  avatar: "https://avatars.githubusercontent.com/u/151971344?v=4",
};

// ─── WRAPPER ─────────────────────────────────────────────────
// Nome do motor/encurtador. Aparece apenas no admin e no
// rodapé da home. O SEO ignora este nome.
export const SITE: SiteConfig = {
  name: "BitLink",
  description: "Encurtador de URLs com analytics",
};

// ─── SEO ─────────────────────────────────────────────────────
// Derivado automaticamente do OWNER. O template garante que
// toda página filho seja "Título da Página | Nome do Dono".
export const SEO: SEOConfig = {
  defaultTitle: OWNER.name,
  titleTemplate: `%s | ${OWNER.name}`,
  description: OWNER.bio,
};
