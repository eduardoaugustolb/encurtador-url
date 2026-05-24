<!-- BEGIN:package-manager -->
# Package Manager

This project uses **bun** as the package manager. Do NOT use npm or pnpm.
- Install dependencies: `bun install`
- Add packages: `bun add <package>`
- Dev dependencies: `bun add -d <package>`
- Run scripts: `bun run <script>`
<!-- END:package-manager -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:git-workflow -->
# Git Workflow

Este projeto segue o fluxo de **branches isoladas**. Nunca trabalhe diretamente na `main`.
- Crie sempre uma **sub branch** (`feature/<nome>`, `fix/<nome>`, etc.) para trabalhar de forma isolada e segura
- Faça merge para a `main` apenas quando a funcionalidade estiver pronta e revisada (PR deve ser aprovado — nada de merge direto sem review)
- Commits devem ser feitos na sub branch, não na main
<!-- END:git-workflow -->
