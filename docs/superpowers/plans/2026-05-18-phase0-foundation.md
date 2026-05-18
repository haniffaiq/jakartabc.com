# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the monorepo, build pipeline, and deploy a bilingual placeholder page + Payload admin to a VPS over TLS.

**Architecture:** pnpm workspace monorepo (`apps/web`, `packages/{ui,config}`); Next.js 15 App Router with Payload v3 mounted at `/admin`; next-intl for EN/ID; postgres in docker-compose; Caddy reverse proxy with auto Let's Encrypt; GitHub Actions CI.

**Tech Stack:** Node 20 LTS, pnpm 9, Next.js 15, React 19, Payload v3, postgres 16, Tailwind CSS 4, next-intl 3, Vitest, Playwright, Docker, Caddy 2.

---

## File Structure (created / modified by this phase)

```
jakartabc.com/
├── .github/workflows/ci.yml                          [create]
├── .gitignore                                        [create]
├── .env.example                                      [create]
├── .editorconfig                                     [create]
├── .nvmrc                                            [create]
├── README.md                                         [create]
├── package.json                                      [create]
├── pnpm-workspace.yaml                               [create]
├── turbo.json                                        [create]
├── docker-compose.yml                                [create]
├── docker-compose.dev.yml                            [create]
├── caddy/Caddyfile                                   [create]
├── packages/
│   ├── config/
│   │   ├── package.json
│   │   ├── eslint/index.js
│   │   ├── tsconfig/base.json
│   │   ├── tsconfig/nextjs.json
│   │   ├── tsconfig/react-library.json
│   │   └── prettier/index.js
│   └── ui/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind-preset.ts
│       ├── vitest.config.ts
│       ├── vitest.setup.ts
│       ├── src/index.ts
│       ├── src/tokens/colors.css
│       ├── src/tokens/typography.css
│       ├── src/tokens/spacing.css
│       ├── src/tokens/index.css
│       ├── src/lib/cn.ts
│       ├── src/components/Button.tsx
│       ├── src/components/Button.test.tsx
│       ├── src/components/Card.tsx
│       ├── src/components/Card.test.tsx
│       ├── src/components/Input.tsx
│       └── src/components/Input.test.tsx
└── apps/web/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── next-env.d.ts
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── Dockerfile
    ├── .dockerignore
    ├── playwright.config.ts
    ├── messages/en.json
    ├── messages/id.json
    ├── public/.gitkeep
    ├── src/middleware.ts
    ├── src/env.ts
    ├── src/i18n/routing.ts
    ├── src/i18n/request.ts
    ├── src/payload.config.ts
    ├── src/collections/SiteSettings.ts
    ├── src/app/globals.css
    ├── src/app/(payload)/admin/[[...segments]]/page.tsx
    ├── src/app/(payload)/admin/[[...segments]]/not-found.tsx
    ├── src/app/(payload)/api/[...slug]/route.ts
    ├── src/app/[locale]/layout.tsx
    ├── src/app/[locale]/page.tsx
    ├── src/app/[locale]/not-found.tsx
    ├── src/app/[locale]/error.tsx
    └── e2e/placeholder.spec.ts
```

---

## Task Sequence

1. Repo bootstrap (git, workspace, root package.json)
2. `packages/config` (tsconfig, eslint, prettier)
3. `packages/ui` tokens + Tailwind preset + Vitest scaffold
4. `packages/ui` Button (TDD)
5. `packages/ui` Card (TDD)
6. `packages/ui` Input (TDD)
7. `apps/web` Next.js 15 init + Tailwind consuming preset
8. `apps/web` next-intl wiring (routing, middleware, messages, layout)
9. `apps/web` self-hosted fonts via `next/font`
10. `apps/web` `[locale]/page.tsx` placeholder using `Button`
11. `apps/web` `not-found.tsx` + `error.tsx` per spec §7
12. `apps/web` Payload v3 install + `payload.config.ts` + `SiteSettings` global + `/admin` mount
13. `apps/web/Dockerfile` multi-stage standalone build
14. `docker-compose.yml` + `docker-compose.dev.yml`
15. `caddy/Caddyfile` for staging.jakartabc.com
16. `.env.example` + zod env validation in `apps/web/src/env.ts`
17. GitHub Actions CI workflow
18. README runbook (local + deploy + backup)
19. Playwright smoke test (EN + ID placeholder, lang attr)
20. Final tag `phase-0-foundation-complete`

---

### Task 1: Repo bootstrap

**Files:**
- create: `.gitignore`, `.editorconfig`, `.nvmrc`, `README.md` (stub), `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- test: n/a (scaffold)

- [ ] **Step 1: Initialize git and Node version pin.**
  ```bash
  cd /Users/HanifHDD/ownership/portofolio/compro/jakartabc.com
  git init -b main
  printf '20.18.0\n' > .nvmrc
  corepack enable
  corepack prepare pnpm@9.12.3 --activate
  ```
  Expected: `git status` reports an empty working tree on branch `main`; `pnpm -v` prints `9.12.3`.

- [ ] **Step 2: Write `.gitignore`.**
  ```gitignore
  # deps
  node_modules
  .pnpm-store

  # build
  .next
  dist
  out
  .turbo
  build
  *.tsbuildinfo

  # env
  .env
  .env.*.local
  .env.local

  # logs
  *.log
  npm-debug.log*
  pnpm-debug.log*

  # editor
  .DS_Store
  .idea
  .vscode/*
  !.vscode/extensions.json

  # test
  coverage
  playwright-report
  test-results

  # payload
  apps/web/src/payload-types.ts
  apps/web/uploads
  ```

- [ ] **Step 3: Write `.editorconfig`.**
  ```ini
  root = true

  [*]
  charset = utf-8
  end_of_line = lf
  indent_style = space
  indent_size = 2
  insert_final_newline = true
  trim_trailing_whitespace = true

  [*.md]
  trim_trailing_whitespace = false
  ```

- [ ] **Step 4: Write `pnpm-workspace.yaml`.**
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  ```

- [ ] **Step 5: Write root `package.json`.**
  ```json
  {
    "name": "jakartabc",
    "version": "0.0.0",
    "private": true,
    "packageManager": "pnpm@9.12.3",
    "engines": {
      "node": ">=20.18.0",
      "pnpm": ">=9.12.0"
    },
    "scripts": {
      "build": "turbo run build",
      "dev": "turbo run dev --parallel",
      "lint": "turbo run lint",
      "typecheck": "turbo run typecheck",
      "test": "turbo run test",
      "test:e2e": "turbo run test:e2e",
      "format": "prettier --write \"**/*.{ts,tsx,js,jsx,md,json,yml,yaml}\"",
      "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,md,json,yml,yaml}\""
    },
    "devDependencies": {
      "prettier": "3.3.3",
      "turbo": "2.1.3",
      "typescript": "5.6.3"
    }
  }
  ```

- [ ] **Step 6: Write `turbo.json`.**
  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "globalDependencies": [".env", ".env.example"],
    "globalEnv": ["NODE_ENV", "CI"],
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": [".next/**", "!.next/cache/**", "dist/**"],
        "env": [
          "DATABASE_URL",
          "PAYLOAD_SECRET",
          "NEXT_PUBLIC_SITE_URL",
          "DEFAULT_LOCALE"
        ]
      },
      "dev": {
        "cache": false,
        "persistent": true
      },
      "lint": {
        "outputs": []
      },
      "typecheck": {
        "dependsOn": ["^build"],
        "outputs": []
      },
      "test": {
        "dependsOn": ["^build"],
        "outputs": ["coverage/**"]
      },
      "test:e2e": {
        "dependsOn": ["^build"],
        "outputs": ["playwright-report/**", "test-results/**"]
      }
    }
  }
  ```

- [ ] **Step 7: Write stub `README.md`.**
  ```markdown
  # jakartabc.com

  Foreign Direct Investment consulting site for Jakarta Business Center.

  See `docs/superpowers/specs/2026-05-18-jakartabc-design.md` for the technical spec
  and `design-system.md` for the brand/visual system.

  Full setup & deploy runbook lands at the end of Phase 0 (Task 18).
  ```

- [ ] **Step 8: Install root devDependencies and verify.**
  ```bash
  pnpm install
  pnpm exec turbo --version
  pnpm exec prettier --version
  pnpm exec tsc --version
  ```
  Expected: turbo `2.1.x`, prettier `3.3.3`, tsc `5.6.3`.

- [ ] **Step 9: First commit.**
  ```bash
  git add .
  git commit -m "$(cat <<'EOF'
  chore(repo): bootstrap pnpm workspace + turbo

  Initial scaffolding: workspace manifest, turbo pipeline, Node/pnpm
  pinning, gitignore, editorconfig, README stub.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 2: `packages/config` (tsconfig, eslint, prettier)

**Files:**
- create: `packages/config/package.json`, `packages/config/tsconfig/base.json`, `packages/config/tsconfig/nextjs.json`, `packages/config/tsconfig/react-library.json`, `packages/config/eslint/index.js`, `packages/config/prettier/index.js`
- test: n/a (configuration)

- [ ] **Step 1: Create `packages/config/package.json`.**
  ```bash
  mkdir -p packages/config/eslint packages/config/tsconfig packages/config/prettier
  ```
  ```json
  {
    "name": "@jakartabc/config",
    "version": "0.0.0",
    "private": true,
    "files": ["eslint", "tsconfig", "prettier"],
    "exports": {
      "./eslint": "./eslint/index.js",
      "./prettier": "./prettier/index.js",
      "./tsconfig/base.json": "./tsconfig/base.json",
      "./tsconfig/nextjs.json": "./tsconfig/nextjs.json",
      "./tsconfig/react-library.json": "./tsconfig/react-library.json"
    },
    "devDependencies": {
      "@typescript-eslint/eslint-plugin": "8.8.0",
      "@typescript-eslint/parser": "8.8.0",
      "eslint": "9.12.0",
      "eslint-config-next": "15.0.0",
      "eslint-config-prettier": "9.1.0",
      "eslint-plugin-jsx-a11y": "6.10.0",
      "eslint-plugin-react": "7.37.1",
      "eslint-plugin-react-hooks": "5.0.0"
    }
  }
  ```

- [ ] **Step 2: Write `tsconfig/base.json`.**
  ```json
  {
    "$schema": "https://json.schemastore.org/tsconfig",
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["ES2022"],
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "esModuleInterop": true,
      "allowSyntheticDefaultImports": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "skipLibCheck": true,
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "noFallthroughCasesInSwitch": true,
      "noImplicitOverride": true,
      "verbatimModuleSyntax": false,
      "declaration": true,
      "incremental": true
    },
    "exclude": ["node_modules", "dist", ".next", ".turbo"]
  }
  ```

- [ ] **Step 3: Write `tsconfig/react-library.json`.**
  ```json
  {
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "./base.json",
    "compilerOptions": {
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "jsx": "react-jsx",
      "module": "ESNext",
      "moduleResolution": "Bundler"
    }
  }
  ```

- [ ] **Step 4: Write `tsconfig/nextjs.json`.**
  ```json
  {
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "./base.json",
    "compilerOptions": {
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "allowJs": true,
      "jsx": "preserve",
      "noEmit": true,
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "plugins": [{ "name": "next" }]
    }
  }
  ```

- [ ] **Step 5: Write `eslint/index.js` (flat config).**
  ```js
  // packages/config/eslint/index.js
  const tseslint = require('@typescript-eslint/eslint-plugin');
  const tsparser = require('@typescript-eslint/parser');
  const reactPlugin = require('eslint-plugin-react');
  const reactHooks = require('eslint-plugin-react-hooks');
  const a11y = require('eslint-plugin-jsx-a11y');
  const prettier = require('eslint-config-prettier');

  /** @type {import('eslint').Linter.Config[]} */
  module.exports = [
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parser: tsparser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      },
      plugins: {
        '@typescript-eslint': tseslint,
        react: reactPlugin,
        'react-hooks': reactHooks,
        'jsx-a11y': a11y,
      },
      rules: {
        ...tseslint.configs.recommended.rules,
        ...reactPlugin.configs.recommended.rules,
        ...reactHooks.configs.recommended.rules,
        ...a11y.configs.recommended.rules,
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
      settings: { react: { version: 'detect' } },
    },
    prettier,
    {
      ignores: ['**/dist/**', '**/.next/**', '**/.turbo/**', '**/node_modules/**'],
    },
  ];
  ```

- [ ] **Step 6: Write `prettier/index.js`.**
  ```js
  // packages/config/prettier/index.js
  /** @type {import('prettier').Config} */
  module.exports = {
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    arrowParens: 'always',
    plugins: [],
  };
  ```

- [ ] **Step 7: Add root prettier reference.** Create `.prettierrc.cjs` at repo root:
  ```js
  module.exports = require('@jakartabc/config/prettier');
  ```

- [ ] **Step 8: Install & verify.**
  ```bash
  pnpm install
  pnpm exec prettier --check .prettierrc.cjs
  ```
  Expected: prettier reports the config file is formatted.

- [ ] **Step 9: Commit.**
  ```bash
  git add packages/config .prettierrc.cjs package.json pnpm-lock.yaml
  git commit -m "$(cat <<'EOF'
  feat(config): add shared eslint, tsconfig, prettier package

  Centralized lint/format/type configs consumed by every workspace
  package via @jakartabc/config.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 3: `packages/ui` tokens + Tailwind preset + Vitest scaffold

**Files:**
- create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/tailwind-preset.ts`, `packages/ui/vitest.config.ts`, `packages/ui/vitest.setup.ts`, `packages/ui/src/index.ts`, `packages/ui/src/lib/cn.ts`, `packages/ui/src/tokens/{colors,typography,spacing,index}.css`
- test: smoke test in `packages/ui/src/tokens/tokens.test.ts`

- [ ] **Step 1: Create `packages/ui/package.json`.**
  ```bash
  mkdir -p packages/ui/src/tokens packages/ui/src/components packages/ui/src/lib
  ```
  ```json
  {
    "name": "@jakartabc/ui",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "sideEffects": ["**/*.css"],
    "exports": {
      ".": "./src/index.ts",
      "./tailwind-preset": "./tailwind-preset.ts",
      "./tokens.css": "./src/tokens/index.css",
      "./styles/*": "./src/tokens/*"
    },
    "scripts": {
      "lint": "eslint .",
      "typecheck": "tsc --noEmit",
      "test": "vitest run",
      "test:watch": "vitest"
    },
    "dependencies": {
      "clsx": "2.1.1",
      "tailwind-merge": "2.5.4"
    },
    "devDependencies": {
      "@jakartabc/config": "workspace:*",
      "@testing-library/jest-dom": "6.5.0",
      "@testing-library/react": "16.0.1",
      "@testing-library/user-event": "14.5.2",
      "@types/react": "19.0.1",
      "@types/react-dom": "19.0.1",
      "@vitejs/plugin-react": "4.3.3",
      "jsdom": "25.0.1",
      "react": "19.0.0",
      "react-dom": "19.0.0",
      "tailwindcss": "3.4.13",
      "typescript": "5.6.3",
      "vitest": "2.1.3"
    },
    "peerDependencies": {
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "tailwindcss": "^3.4.0"
    }
  }
  ```
  Note: Tailwind 3.4 is used in Phase 0 for stable Next 15 + preset interop. Tailwind 4 migration deferred to a later phase.

- [ ] **Step 2: Create `packages/ui/tsconfig.json`.**
  ```json
  {
    "extends": "@jakartabc/config/tsconfig/react-library.json",
    "include": ["src/**/*", "tailwind-preset.ts", "vitest.config.ts", "vitest.setup.ts"],
    "compilerOptions": {
      "baseUrl": ".",
      "paths": { "@/*": ["./src/*"] }
    }
  }
  ```

- [ ] **Step 3: Write `src/tokens/colors.css` — copy from `design-system.md` §4 verbatim.**
  ```css
  /* packages/ui/src/tokens/colors.css */
  :root {
    /* Core */
    --ink-900: #1A1815;
    --ink-700: #3A352E;
    --ink-500: #6B6358;

    /* Surfaces */
    --bone-50: #FAF7F2;
    --bone-100: #F2EDE4;
    --bone-200: #E5DDD0;

    /* Accent */
    --ochre-600: #B8893A;
    --ochre-700: #95701E;
    --ochre-100: #F0E3C9;

    /* Functional */
    --success: #4A6B3F;
    --warning: #B8732A;
    --danger:  #8B3A2E;
    --info:    #3A5567;

    /* Border */
    --rule-soft: rgba(26, 24, 21, 0.08);
    --rule-firm: rgba(26, 24, 21, 0.16);

    /* Dark variant (selective per §24) */
    --dark-bg:      #1A1815;
    --dark-surface: #252220;
    --dark-text:    #F2EDE4;
    --dark-text-2:  #B0A89B;
    --dark-accent:  #D4A24C;
  }
  ```

- [ ] **Step 4: Write `src/tokens/typography.css` — copy from `design-system.md` §5.**
  ```css
  /* packages/ui/src/tokens/typography.css */
  :root {
    --font-display: "Fraunces", "GT Sectra", "Tiempos Headline", Georgia, serif;
    --font-body:    "Inter", "Söhne", "Neue Haas Grotesk", system-ui, sans-serif;
    --font-mono:    "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;

    /* Size / line-height pairs (px) */
    --fs-display-xl: 64px;  --lh-display-xl: 72px;
    --fs-display-lg: 48px;  --lh-display-lg: 56px;
    --fs-display-md: 36px;  --lh-display-md: 44px;
    --fs-heading-lg: 28px;  --lh-heading-lg: 36px;
    --fs-heading-md: 22px;  --lh-heading-md: 30px;
    --fs-body-lg:    18px;  --lh-body-lg:    30px;
    --fs-body-md:    16px;  --lh-body-md:    26px;
    --fs-body-sm:    14px;  --lh-body-sm:    22px;
    --fs-mono-sm:    13px;  --lh-mono-sm:    20px;
    --fs-eyebrow:    12px;  --lh-eyebrow:    16px;

    --tracking-eyebrow: 0.08em;
  }
  ```

- [ ] **Step 5: Write `src/tokens/spacing.css` — copy from `design-system.md` §6.**
  ```css
  /* packages/ui/src/tokens/spacing.css */
  :root {
    --space-2:   2px;
    --space-4:   4px;
    --space-8:   8px;
    --space-12:  12px;
    --space-16:  16px;
    --space-24:  24px;
    --space-32:  32px;
    --space-48:  48px;
    --space-64:  64px;
    --space-96:  96px;
    --space-128: 128px;
    --space-160: 160px;

    --container-max: 1200px;
    --container-editorial: 880px;
    --container-reading: 720px;

    --radius-sm: 4px;   /* buttons */
    --radius-md: 6px;   /* cards */
  }
  ```

- [ ] **Step 6: Write `src/tokens/index.css` — barrel.**
  ```css
  @import "./colors.css";
  @import "./typography.css";
  @import "./spacing.css";
  ```

- [ ] **Step 7: Write `src/lib/cn.ts`.**
  ```ts
  import { clsx, type ClassValue } from 'clsx'
  import { twMerge } from 'tailwind-merge'

  export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
  }
  ```

- [ ] **Step 8: Write `src/index.ts` barrel (empty for now; components fill it in next tasks).**
  ```ts
  export { cn } from './lib/cn'
  ```

- [ ] **Step 9: Write `tailwind-preset.ts` mapping CSS vars → Tailwind theme.**
  ```ts
  // packages/ui/tailwind-preset.ts
  import type { Config } from 'tailwindcss'

  const preset = {
    content: [],
    theme: {
      extend: {
        colors: {
          ink: {
            900: 'var(--ink-900)',
            700: 'var(--ink-700)',
            500: 'var(--ink-500)',
          },
          bone: {
            50: 'var(--bone-50)',
            100: 'var(--bone-100)',
            200: 'var(--bone-200)',
          },
          ochre: {
            600: 'var(--ochre-600)',
            700: 'var(--ochre-700)',
            100: 'var(--ochre-100)',
          },
          success: 'var(--success)',
          warning: 'var(--warning)',
          danger: 'var(--danger)',
          info: 'var(--info)',
          'rule-soft': 'var(--rule-soft)',
          'rule-firm': 'var(--rule-firm)',
        },
        fontFamily: {
          display: 'var(--font-display)',
          body: 'var(--font-body)',
          mono: 'var(--font-mono)',
        },
        fontSize: {
          'display-xl': ['var(--fs-display-xl)', { lineHeight: 'var(--lh-display-xl)', fontWeight: '400' }],
          'display-lg': ['var(--fs-display-lg)', { lineHeight: 'var(--lh-display-lg)', fontWeight: '400' }],
          'display-md': ['var(--fs-display-md)', { lineHeight: 'var(--lh-display-md)', fontWeight: '400' }],
          'heading-lg': ['var(--fs-heading-lg)', { lineHeight: 'var(--lh-heading-lg)', fontWeight: '500' }],
          'heading-md': ['var(--fs-heading-md)', { lineHeight: 'var(--lh-heading-md)', fontWeight: '500' }],
          'body-lg':    ['var(--fs-body-lg)',    { lineHeight: 'var(--lh-body-lg)',    fontWeight: '400' }],
          'body-md':    ['var(--fs-body-md)',    { lineHeight: 'var(--lh-body-md)',    fontWeight: '400' }],
          'body-sm':    ['var(--fs-body-sm)',    { lineHeight: 'var(--lh-body-sm)',    fontWeight: '400' }],
          'mono-sm':    ['var(--fs-mono-sm)',    { lineHeight: 'var(--lh-mono-sm)',    fontWeight: '400' }],
          eyebrow:      ['var(--fs-eyebrow)',    { lineHeight: 'var(--lh-eyebrow)',    fontWeight: '500', letterSpacing: 'var(--tracking-eyebrow)' }],
        },
        spacing: {
          '2':   'var(--space-2)',
          '4':   'var(--space-4)',
          '8':   'var(--space-8)',
          '12':  'var(--space-12)',
          '16':  'var(--space-16)',
          '24':  'var(--space-24)',
          '32':  'var(--space-32)',
          '48':  'var(--space-48)',
          '64':  'var(--space-64)',
          '96':  'var(--space-96)',
          '128': 'var(--space-128)',
          '160': 'var(--space-160)',
        },
        maxWidth: {
          container: 'var(--container-max)',
          editorial: 'var(--container-editorial)',
          reading:   'var(--container-reading)',
        },
        borderRadius: {
          sm: 'var(--radius-sm)',
          md: 'var(--radius-md)',
        },
        transitionDuration: {
          fast: '150ms',
          reveal: '300ms',
        },
      },
    },
    plugins: [],
  } satisfies Partial<Config>

  export default preset
  ```

- [ ] **Step 10: Write `vitest.config.ts`.**
  ```ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  import path from 'node:path'

  export default defineConfig({
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      css: false,
    },
  })
  ```

- [ ] **Step 11: Write `vitest.setup.ts`.**
  ```ts
  import '@testing-library/jest-dom/vitest'
  ```

- [ ] **Step 12: Write failing smoke test `src/tokens/tokens.test.ts` proving tokens are exported.**
  ```ts
  import { describe, expect, it } from 'vitest'
  import preset from '../../tailwind-preset'

  describe('tailwind-preset tokens', () => {
    it('maps ink, bone, ochre color scales', () => {
      const colors = preset.theme?.extend?.colors as Record<string, Record<string, string>>
      expect(colors.ink[900]).toBe('var(--ink-900)')
      expect(colors.bone[50]).toBe('var(--bone-50)')
      expect(colors.ochre[600]).toBe('var(--ochre-600)')
    })

    it('exposes editorial font families', () => {
      const fonts = preset.theme?.extend?.fontFamily as Record<string, string>
      expect(fonts.display).toBe('var(--font-display)')
      expect(fonts.body).toBe('var(--font-body)')
    })
  })
  ```

- [ ] **Step 13: Run tests.**
  ```bash
  pnpm install
  pnpm --filter @jakartabc/ui test
  ```
  Expected: 2 passing tests.

- [ ] **Step 14: Commit.**
  ```bash
  git add packages/ui pnpm-lock.yaml
  git commit -m "$(cat <<'EOF'
  feat(ui): add design tokens (CSS vars) and tailwind preset

  Tokens copied verbatim from design-system.md §4-§6 and mapped to
  Tailwind theme.extend via @jakartabc/ui/tailwind-preset. Vitest
  scaffold wired with jsdom + testing-library for component tests.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 4: `packages/ui` — `Button` (TDD)

**Files:**
- create: `packages/ui/src/components/Button.tsx`
- test: `packages/ui/src/components/Button.test.tsx`

Scope: per spec §6.2, Button stub supports variants `primary | secondary | ghost | link`, `loading` prop renders a rotating mono `·`, focus outline ochre-600. Full state matrix tests come in Phase 1; here we cover render + variant class + loading + disabled.

- [ ] **Step 1: Write failing test first.**
  ```tsx
  // packages/ui/src/components/Button.test.tsx
  import { describe, expect, it } from 'vitest'
  import { render, screen } from '@testing-library/react'
  import { Button } from './Button'

  describe('Button', () => {
    it('renders children as a button by default', () => {
      render(<Button>Book a call</Button>)
      const el = screen.getByRole('button', { name: /book a call/i })
      expect(el.tagName).toBe('BUTTON')
    })

    it('applies primary variant classes by default (ochre bg, bone text)', () => {
      render(<Button>Primary</Button>)
      const el = screen.getByRole('button', { name: /primary/i })
      expect(el.className).toMatch(/bg-ochre-600/)
      expect(el.className).toMatch(/text-bone-50/)
    })

    it('applies secondary variant when requested', () => {
      render(<Button variant="secondary">Learn more</Button>)
      const el = screen.getByRole('button', { name: /learn more/i })
      expect(el.className).toMatch(/border/)
      expect(el.className).toMatch(/text-ink-900/)
    })

    it('renders as an anchor when href is provided', () => {
      render(<Button href="/services">See services</Button>)
      const el = screen.getByRole('link', { name: /see services/i })
      expect(el.tagName).toBe('A')
      expect(el).toHaveAttribute('href', '/services')
    })

    it('shows loading indicator and disables interaction when loading', () => {
      render(<Button loading>Send</Button>)
      const el = screen.getByRole('button', { name: /send/i })
      expect(el).toBeDisabled()
      expect(el).toHaveAttribute('aria-busy', 'true')
      expect(el.textContent).toMatch(/·/)
    })

    it('is disabled when disabled prop set', () => {
      render(<Button disabled>Nope</Button>)
      expect(screen.getByRole('button', { name: /nope/i })).toBeDisabled()
    })
  })
  ```
  Run:
  ```bash
  pnpm --filter @jakartabc/ui test
  ```
  Expected: 6 failing tests (no `Button` module).

- [ ] **Step 2: Implement `Button.tsx`.**
  ```tsx
  // packages/ui/src/components/Button.tsx
  import * as React from 'react'
  import { cn } from '../lib/cn'

  export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link'

  type CommonProps = {
    variant?: ButtonVariant
    loading?: boolean
    className?: string
    children: React.ReactNode
  }

  type ButtonAsButton = CommonProps &
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
      href?: undefined
    }

  type ButtonAsLink = CommonProps &
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
      href: string
    }

  export type ButtonProps = ButtonAsButton | ButtonAsLink

  const base =
    'inline-flex items-center justify-center gap-8 rounded-sm font-body text-body-md ' +
    'transition-colors duration-fast ease-out ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-ochre-600 ' +
    'disabled:cursor-not-allowed disabled:opacity-60'

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-ochre-600 text-bone-50 px-24 py-12 hover:bg-ochre-700 ' +
      'disabled:bg-bone-200 disabled:text-ink-500',
    secondary:
      'border border-ink-900 text-ink-900 bg-transparent px-24 py-12 ' +
      'hover:bg-bone-100',
    ghost:
      'text-ink-900 px-8 py-4 underline-offset-4 hover:underline hover:text-ochre-700',
    link: 'text-ochre-700 underline underline-offset-4 hover:text-ochre-600 p-0',
  }

  function Spinner() {
    return (
      <span
        aria-hidden="true"
        className="inline-block font-mono animate-spin"
        style={{ animationDuration: '1.2s' }}
      >
        ·
      </span>
    )
  }

  export function Button(props: ButtonProps) {
    const { variant = 'primary', loading = false, className, children, ...rest } = props
    const classes = cn(base, variants[variant], className)

    if ('href' in rest && rest.href !== undefined) {
      const { href, ...anchorRest } = rest as ButtonAsLink
      return (
        <a
          href={href}
          className={classes}
          aria-busy={loading || undefined}
          {...anchorRest}
        >
          {loading ? <Spinner /> : null}
          {children}
        </a>
      )
    }

    const buttonRest = rest as ButtonAsButton
    return (
      <button
        type={buttonRest.type ?? 'button'}
        className={classes}
        disabled={loading || buttonRest.disabled}
        aria-busy={loading || undefined}
        {...buttonRest}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    )
  }
  ```

- [ ] **Step 3: Export from `src/index.ts`.**
  ```ts
  // packages/ui/src/index.ts
  export { cn } from './lib/cn'
  export { Button, type ButtonProps, type ButtonVariant } from './components/Button'
  ```

- [ ] **Step 4: Re-run tests.**
  ```bash
  pnpm --filter @jakartabc/ui test
  ```
  Expected: 8 tests pass (6 Button + 2 tokens).

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/ui/src/components/Button.tsx packages/ui/src/components/Button.test.tsx packages/ui/src/index.ts
  git commit -m "$(cat <<'EOF'
  feat(ui): add Button component stub with 4 variants

  Primary/secondary/ghost/link variants per design-system §7.1; loading
  state renders mono '·' spinner; href prop renders as anchor. Full
  7-state matrix lands in Phase 1.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 5: `packages/ui` — `Card` (TDD)

**Files:**
- create: `packages/ui/src/components/Card.tsx`
- test: `packages/ui/src/components/Card.test.tsx`

Scope: per `design-system.md` §7.2, Card uses `--bone-100` bg, 1px `--rule-soft` border, radius 6px, padding 32, no shadow by default.

- [ ] **Step 1: Write failing test first.**
  ```tsx
  // packages/ui/src/components/Card.test.tsx
  import { describe, expect, it } from 'vitest'
  import { render, screen } from '@testing-library/react'
  import { Card } from './Card'

  describe('Card', () => {
    it('renders children inside an article by default', () => {
      render(
        <Card>
          <p>card body</p>
        </Card>,
      )
      const el = screen.getByText(/card body/i).closest('article')
      expect(el).not.toBeNull()
    })

    it('applies bone-100 bg + rule-soft border + md radius', () => {
      render(<Card data-testid="c">x</Card>)
      const el = screen.getByTestId('c')
      expect(el.className).toMatch(/bg-bone-100/)
      expect(el.className).toMatch(/border/)
      expect(el.className).toMatch(/rounded-md/)
      expect(el.className).toMatch(/p-32/)
    })

    it('renders as the supplied element when as prop given', () => {
      render(
        <Card as="section" data-testid="c">
          x
        </Card>,
      )
      expect(screen.getByTestId('c').tagName).toBe('SECTION')
    })

    it('merges custom className', () => {
      render(
        <Card className="custom-x" data-testid="c">
          x
        </Card>,
      )
      expect(screen.getByTestId('c').className).toMatch(/custom-x/)
    })
  })
  ```
  Run; expect 4 failures.

- [ ] **Step 2: Implement `Card.tsx`.**
  ```tsx
  // packages/ui/src/components/Card.tsx
  import * as React from 'react'
  import { cn } from '../lib/cn'

  type CardProps<E extends React.ElementType = 'article'> = {
    as?: E
    className?: string
    children: React.ReactNode
  } & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'className' | 'children'>

  export function Card<E extends React.ElementType = 'article'>({
    as,
    className,
    children,
    ...rest
  }: CardProps<E>) {
    const Component = (as ?? 'article') as React.ElementType
    return (
      <Component
        className={cn(
          'bg-bone-100 border border-rule-soft rounded-md p-32',
          'transition-colors duration-fast ease-out',
          className,
        )}
        {...rest}
      >
        {children}
      </Component>
    )
  }
  ```

- [ ] **Step 3: Export.**
  Append to `packages/ui/src/index.ts`:
  ```ts
  export { Card } from './components/Card'
  ```

- [ ] **Step 4: Run tests; expect 12 passing total.**
  ```bash
  pnpm --filter @jakartabc/ui test
  ```

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/ui/src/components/Card.tsx packages/ui/src/components/Card.test.tsx packages/ui/src/index.ts
  git commit -m "$(cat <<'EOF'
  feat(ui): add Card component stub

  Bone-100 surface, rule-soft border, 6px radius, no shadow per
  design-system §7.2.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 6: `packages/ui` — `Input` (TDD)

**Files:**
- create: `packages/ui/src/components/Input.tsx`
- test: `packages/ui/src/components/Input.test.tsx`

Scope: per `design-system.md` §7.3, bottom-border only, eyebrow label above, inline error, focus ochre 2px bottom border. Stub here; Textarea/Select inherit pattern in Phase 1.

- [ ] **Step 1: Write failing test.**
  ```tsx
  // packages/ui/src/components/Input.test.tsx
  import { describe, expect, it } from 'vitest'
  import { render, screen } from '@testing-library/react'
  import { Input } from './Input'

  describe('Input', () => {
    it('renders label associated with input via id', () => {
      render(<Input label="Email" name="email" />)
      const input = screen.getByLabelText(/email/i)
      expect(input).toBeInTheDocument()
      expect(input.tagName).toBe('INPUT')
    })

    it('renders helper text below input', () => {
      render(<Input label="Email" name="email" helper="We never share." />)
      expect(screen.getByText(/we never share/i)).toBeInTheDocument()
    })

    it('renders error text and applies danger border', () => {
      render(<Input label="Email" name="email" error="Required" />)
      const input = screen.getByLabelText(/email/i)
      expect(input.className).toMatch(/border-b-danger/)
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByText(/required/i)).toBeInTheDocument()
    })

    it('forwards type and value props', () => {
      render(<Input label="Phone" name="phone" type="tel" defaultValue="+62" />)
      const input = screen.getByLabelText(/phone/i) as HTMLInputElement
      expect(input.type).toBe('tel')
      expect(input.value).toBe('+62')
    })
  })
  ```
  Run; expect 4 failures.

- [ ] **Step 2: Implement `Input.tsx`.**
  ```tsx
  // packages/ui/src/components/Input.tsx
  import * as React from 'react'
  import { cn } from '../lib/cn'

  export type InputProps = Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'id'
  > & {
    label: string
    name: string
    helper?: string
    error?: string
    id?: string
  }

  let _uid = 0
  function useFallbackId(provided?: string) {
    const ref = React.useRef<string | null>(null)
    if (provided) return provided
    if (ref.current === null) {
      _uid += 1
      ref.current = `input-${_uid}`
    }
    return ref.current
  }

  export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    function Input({ label, name, helper, error, id, className, ...rest }, ref) {
      const inputId = useFallbackId(id ?? `input-${name}`)
      const helperId = helper ? `${inputId}-helper` : undefined
      const errorId = error ? `${inputId}-error` : undefined
      const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined

      return (
        <div className="flex flex-col gap-4">
          <label
            htmlFor={inputId}
            className="text-eyebrow uppercase text-ink-500 font-body"
          >
            {label}
          </label>
          <input
            ref={ref}
            id={inputId}
            name={name}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'bg-transparent text-body-md text-ink-900 font-body',
              'border-b border-b-ink-500 px-0 py-8',
              'focus:outline-none focus:border-b-2 focus:border-b-ochre-600',
              error && 'border-b-2 border-b-danger focus:border-b-danger',
              'placeholder:text-ink-500 disabled:bg-bone-100 disabled:text-ink-500',
              className,
            )}
            {...rest}
          />
          {helper && !error ? (
            <p id={helperId} className="text-body-sm text-ink-500">
              {helper}
            </p>
          ) : null}
          {error ? (
            <p id={errorId} className="text-body-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      )
    },
  )
  ```

- [ ] **Step 3: Export.**
  Append to `packages/ui/src/index.ts`:
  ```ts
  export { Input, type InputProps } from './components/Input'
  ```

- [ ] **Step 4: Run tests; expect 16 total passing.**
  ```bash
  pnpm --filter @jakartabc/ui test
  ```

- [ ] **Step 5: Add typecheck script + lint flat-config wiring.**
  Create `packages/ui/eslint.config.js`:
  ```js
  module.exports = require('@jakartabc/config/eslint');
  ```
  Run:
  ```bash
  pnpm --filter @jakartabc/ui typecheck
  pnpm --filter @jakartabc/ui lint
  ```
  Both expected to exit 0.

- [ ] **Step 6: Commit.**
  ```bash
  git add packages/ui/src/components/Input.tsx packages/ui/src/components/Input.test.tsx packages/ui/src/index.ts packages/ui/eslint.config.js
  git commit -m "$(cat <<'EOF'
  feat(ui): add Input component stub with label/helper/error

  Bottom-border only, eyebrow label, inline error with aria-invalid and
  aria-describedby. Stub for Phase 0 sanity; Textarea/Select and full
  state matrix tests in Phase 1.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 7: `apps/web` Next.js 15 init consuming `packages/ui` preset

**Files:**
- create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/next-env.d.ts`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/src/app/globals.css`, `apps/web/public/.gitkeep`, `apps/web/eslint.config.js`
- test: n/a (skeleton)

- [ ] **Step 1: Create app directory skeleton.**
  ```bash
  mkdir -p apps/web/src/app apps/web/public apps/web/messages apps/web/src/i18n apps/web/src/collections apps/web/e2e
  touch apps/web/public/.gitkeep
  ```

- [ ] **Step 2: Write `apps/web/package.json`.**
  ```json
  {
    "name": "@jakartabc/web",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "next dev -p 3000",
      "build": "next build",
      "start": "next start -p 3000",
      "lint": "next lint --dir src",
      "typecheck": "tsc --noEmit",
      "test": "echo \"(no unit tests in apps/web — see packages/ui)\" && exit 0",
      "test:e2e": "playwright test",
      "payload:generate-types": "payload generate:types"
    },
    "dependencies": {
      "@jakartabc/ui": "workspace:*",
      "@payloadcms/db-postgres": "3.0.0",
      "@payloadcms/next": "3.0.0",
      "@payloadcms/richtext-lexical": "3.0.0",
      "next": "15.0.3",
      "next-intl": "3.21.1",
      "payload": "3.0.0",
      "react": "19.0.0",
      "react-dom": "19.0.0",
      "sharp": "0.33.5",
      "zod": "3.23.8"
    },
    "devDependencies": {
      "@jakartabc/config": "workspace:*",
      "@playwright/test": "1.48.2",
      "@types/node": "20.16.11",
      "@types/react": "19.0.1",
      "@types/react-dom": "19.0.1",
      "autoprefixer": "10.4.20",
      "postcss": "8.4.47",
      "tailwindcss": "3.4.13",
      "typescript": "5.6.3"
    }
  }
  ```

- [ ] **Step 3: Write `apps/web/tsconfig.json`.**
  ```json
  {
    "extends": "@jakartabc/config/tsconfig/nextjs.json",
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"],
        "@payload-config": ["./src/payload.config.ts"]
      }
    },
    "include": [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts"
    ],
    "exclude": ["node_modules", ".next"]
  }
  ```

- [ ] **Step 4: Write `apps/web/next-env.d.ts`.**
  ```ts
  /// <reference types="next" />
  /// <reference types="next/image-types/global" />
  ```

- [ ] **Step 5: Write `apps/web/postcss.config.mjs`.**
  ```js
  export default {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  }
  ```

- [ ] **Step 6: Write `apps/web/tailwind.config.ts` consuming the preset.**
  ```ts
  import type { Config } from 'tailwindcss'
  import preset from '@jakartabc/ui/tailwind-preset'

  const config: Config = {
    presets: [preset],
    content: [
      './src/**/*.{ts,tsx,mdx}',
      '../../packages/ui/src/**/*.{ts,tsx}',
    ],
  }

  export default config
  ```

- [ ] **Step 7: Write `apps/web/src/app/globals.css`.**
  ```css
  @import "@jakartabc/ui/tokens.css";

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer base {
    html {
      background-color: var(--bone-50);
      color: var(--ink-900);
      font-family: var(--font-body);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    body {
      min-height: 100dvh;
    }

    h1, h2, h3 {
      font-family: var(--font-display);
      font-weight: 400;
    }

    :focus-visible {
      outline: 2px solid var(--ochre-600);
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  }
  ```

- [ ] **Step 8: Write minimal `apps/web/next.config.ts` (next-intl plugin added Task 8).**
  ```ts
  import type { NextConfig } from 'next'

  const nextConfig: NextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    experimental: {
      typedRoutes: true,
    },
    images: {
      formats: ['image/avif', 'image/webp'],
    },
  }

  export default nextConfig
  ```

- [ ] **Step 9: Write `apps/web/eslint.config.js`.**
  ```js
  module.exports = require('@jakartabc/config/eslint');
  ```

- [ ] **Step 10: Install & build sanity (placeholder root route stub).**
  Temporarily add `apps/web/src/app/page.tsx`:
  ```tsx
  export default function Root() {
    return <p>placeholder</p>
  }
  ```
  Then:
  ```bash
  pnpm install
  pnpm --filter @jakartabc/web typecheck
  ```
  Expected: typecheck passes. (This temporary `page.tsx` is deleted in Task 8 once `[locale]/page.tsx` exists.)

- [ ] **Step 11: Commit.**
  ```bash
  git add apps/web pnpm-lock.yaml
  git commit -m "$(cat <<'EOF'
  feat(web): bootstrap Next.js 15 app consuming @jakartabc/ui preset

  Standalone output, Tailwind 3.4 wired to packages/ui preset, globals
  import tokens.css, focus-visible outline + prefers-reduced-motion
  honored at the base layer.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 8: `apps/web` next-intl wiring

**Files:**
- create: `apps/web/src/middleware.ts`, `apps/web/src/i18n/routing.ts`, `apps/web/src/i18n/request.ts`, `apps/web/messages/en.json`, `apps/web/messages/id.json`, `apps/web/src/app/[locale]/layout.tsx`
- modify: `apps/web/next.config.ts` (next-intl plugin), delete temporary `apps/web/src/app/page.tsx`
- test: covered later via Playwright in Task 19

Per spec §6.4: EN is default and unprefixed; ID is prefixed `/id`. Slugs are identical across locales.

- [ ] **Step 1: Write `apps/web/src/i18n/routing.ts`.**
  ```ts
  import { defineRouting } from 'next-intl/routing'
  import { createNavigation } from 'next-intl/navigation'

  export const routing = defineRouting({
    locales: ['en', 'id'],
    defaultLocale: 'en',
    localePrefix: 'as-needed',
  })

  export type Locale = (typeof routing.locales)[number]

  export const { Link, redirect, usePathname, useRouter, getPathname } =
    createNavigation(routing)
  ```

- [ ] **Step 2: Write `apps/web/src/i18n/request.ts`.**
  ```ts
  import { getRequestConfig } from 'next-intl/server'
  import { notFound } from 'next/navigation'
  import { routing } from './routing'

  export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale
    const locale =
      requested && routing.locales.includes(requested as 'en' | 'id')
        ? (requested as 'en' | 'id')
        : routing.defaultLocale

    if (!routing.locales.includes(locale)) notFound()

    return {
      locale,
      messages: (await import(`../../messages/${locale}.json`)).default,
    }
  })
  ```

- [ ] **Step 3: Write `apps/web/src/middleware.ts`.**
  ```ts
  import createMiddleware from 'next-intl/middleware'
  import { routing } from './i18n/routing'

  export default createMiddleware(routing)

  export const config = {
    // Skip /admin, /api, _next, static files, and anything with a dot (assets)
    matcher: ['/((?!admin|api|_next|_vercel|.*\\..*).*)'],
  }
  ```

- [ ] **Step 4: Write `messages/en.json` skeleton.**
  ```json
  {
    "common": {
      "siteName": "Jakarta Business Center",
      "tagline": "Foreign Direct Investment · Indonesia",
      "languageToggle": {
        "en": "EN",
        "id": "ID"
      }
    },
    "home": {
      "eyebrow": "Foreign Direct Investment · Indonesia",
      "headline": "Set up a PT PMA in Indonesia.",
      "subheadline": "Without the guesswork.",
      "lead": "Foreign-owned company registration, sector licensing, and ongoing compliance — handled by a Jakarta team.",
      "ctaPrimary": "Book a 30-min call",
      "ctaSecondary": "See how it works",
      "placeholderNote": "Staging environment · full site lands in Phase 1."
    },
    "errors": {
      "notFoundTitle": "This page isn't here.",
      "notFoundBody": "It may have been moved, or the link is incorrect.",
      "notFoundHome": "Back to home",
      "errorTitle": "Something on our end isn't working.",
      "errorBody": "We've been notified. You can also email us directly.",
      "errorEmail": "Email hello@jakartabc.com",
      "errorRetry": "Try again"
    }
  }
  ```

- [ ] **Step 5: Write `messages/id.json` skeleton.**
  ```json
  {
    "common": {
      "siteName": "Jakarta Business Center",
      "tagline": "Investasi Asing Langsung · Indonesia",
      "languageToggle": {
        "en": "EN",
        "id": "ID"
      }
    },
    "home": {
      "eyebrow": "Investasi Asing Langsung · Indonesia",
      "headline": "Dirikan PT PMA di Indonesia.",
      "subheadline": "Tanpa menebak-nebak.",
      "lead": "Pendirian perusahaan PMA, perizinan sektor, dan kepatuhan berkelanjutan — ditangani tim Jakarta.",
      "ctaPrimary": "Pesan konsultasi 30 menit",
      "ctaSecondary": "Lihat cara kerjanya",
      "placeholderNote": "Lingkungan staging · situs lengkap pada Phase 1."
    },
    "errors": {
      "notFoundTitle": "Halaman ini tidak ada di sini.",
      "notFoundBody": "Mungkin telah dipindahkan atau tautannya salah.",
      "notFoundHome": "Kembali ke beranda",
      "errorTitle": "Ada yang tidak berjalan di sisi kami.",
      "errorBody": "Tim kami sudah diberi tahu. Anda juga bisa kontak langsung lewat email.",
      "errorEmail": "Email hello@jakartabc.com",
      "errorRetry": "Coba lagi"
    }
  }
  ```

- [ ] **Step 6: Update `next.config.ts` to register next-intl plugin.**
  Replace with:
  ```ts
  import createNextIntlPlugin from 'next-intl/plugin'
  import type { NextConfig } from 'next'

  const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

  const nextConfig: NextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    experimental: {
      typedRoutes: true,
    },
    images: {
      formats: ['image/avif', 'image/webp'],
    },
  }

  export default withNextIntl(nextConfig)
  ```

- [ ] **Step 7: Delete the temporary `apps/web/src/app/page.tsx` from Task 7.**
  ```bash
  rm -f apps/web/src/app/page.tsx
  ```

- [ ] **Step 8: Write `apps/web/src/app/[locale]/layout.tsx` (fonts wired in Task 9; this is structure only).**
  ```tsx
  import { notFound } from 'next/navigation'
  import { NextIntlClientProvider } from 'next-intl'
  import { getMessages, setRequestLocale } from 'next-intl/server'
  import { routing, type Locale } from '@/i18n/routing'
  import '../globals.css'

  export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }))
  }

  export default async function LocaleLayout({
    children,
    params,
  }: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
  }) {
    const { locale } = await params
    if (!routing.locales.includes(locale as Locale)) notFound()
    setRequestLocale(locale)
    const messages = await getMessages()

    return (
      <html lang={locale}>
        <body>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    )
  }
  ```

- [ ] **Step 9: Verify build.**
  ```bash
  pnpm --filter @jakartabc/web typecheck
  ```
  Expected: passes (page.tsx for `[locale]` lands in Task 10, but typecheck on just the layout is fine).

- [ ] **Step 10: Commit.**
  ```bash
  git add apps/web/src/middleware.ts apps/web/src/i18n apps/web/messages apps/web/src/app/[locale]/layout.tsx apps/web/next.config.ts
  git rm -f apps/web/src/app/page.tsx 2>/dev/null || true
  git commit -m "$(cat <<'EOF'
  feat(web): wire next-intl with EN default + ID prefixed routing

  Locale prefix as-needed: '/' renders EN, '/id' renders ID. Middleware
  scoped to skip /admin, /api, and asset paths. Skeleton message files
  cover home + error/not-found copy.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 9: Self-host fonts via `next/font`

**Files:**
- modify: `apps/web/src/app/[locale]/layout.tsx` (apply font CSS variables to `<html>`)
- test: covered via Playwright assertion that the `<html>` element has the font CSS vars (Task 19)

Per spec §6.5: Fraunces display weights 400/500, Inter body weights 400/500, both `display: swap`, subset latin.

- [ ] **Step 1: Update `apps/web/src/app/[locale]/layout.tsx`.**
  Replace its contents with:
  ```tsx
  import { notFound } from 'next/navigation'
  import { NextIntlClientProvider } from 'next-intl'
  import { getMessages, setRequestLocale } from 'next-intl/server'
  import { Fraunces, Inter } from 'next/font/google'
  import { routing, type Locale } from '@/i18n/routing'
  import '../globals.css'

  const fraunces = Fraunces({
    subsets: ['latin'],
    variable: '--font-display',
    display: 'swap',
    weight: ['400', '500'],
  })

  const inter = Inter({
    subsets: ['latin'],
    variable: '--font-body',
    display: 'swap',
    weight: ['400', '500'],
  })

  export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }))
  }

  export default async function LocaleLayout({
    children,
    params,
  }: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
  }) {
    const { locale } = await params
    if (!routing.locales.includes(locale as Locale)) notFound()
    setRequestLocale(locale)
    const messages = await getMessages()

    return (
      <html lang={locale} className={`${fraunces.variable} ${inter.variable}`}>
        <body>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    )
  }
  ```

- [ ] **Step 2: Typecheck.**
  ```bash
  pnpm --filter @jakartabc/web typecheck
  ```

- [ ] **Step 3: Commit.**
  ```bash
  git add apps/web/src/app/[locale]/layout.tsx
  git commit -m "$(cat <<'EOF'
  feat(web): self-host Fraunces + Inter via next/font

  Loaded as CSS variables --font-display and --font-body so the token
  files in packages/ui keep their fallback chains intact.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 10: `[locale]/page.tsx` placeholder using `Button`

**Files:**
- create: `apps/web/src/app/[locale]/page.tsx`
- test: covered via Playwright in Task 19

- [ ] **Step 1: Write `apps/web/src/app/[locale]/page.tsx`.**
  ```tsx
  import { setRequestLocale } from 'next-intl/server'
  import { getTranslations } from 'next-intl/server'
  import { Button } from '@jakartabc/ui'
  import { routing, type Locale } from '@/i18n/routing'

  export default async function HomePage({
    params,
  }: {
    params: Promise<{ locale: string }>
  }) {
    const { locale } = await params
    setRequestLocale(locale as Locale)
    const t = await getTranslations('home')

    return (
      <main className="mx-auto max-w-container px-24 py-128">
        <p className="text-eyebrow uppercase text-ochre-700">{t('eyebrow')}</p>

        <h1 className="mt-24 font-display text-display-xl text-ink-900">
          {t('headline')}
          <br />
          {t('subheadline')}
        </h1>

        <p className="mt-32 max-w-reading text-body-lg text-ink-700">
          {t('lead')}
        </p>

        <div className="mt-48 flex items-center gap-24">
          <Button variant="primary">{t('ctaPrimary')} →</Button>
          <Button variant="ghost">{t('ctaSecondary')}</Button>
        </div>

        <p
          data-testid="placeholder-note"
          className="mt-128 text-body-sm text-ink-500"
        >
          {t('placeholderNote')}
        </p>
      </main>
    )
  }

  export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }))
  }
  ```

- [ ] **Step 2: Run dev server locally to sanity check.**
  ```bash
  pnpm --filter @jakartabc/web dev
  ```
  Browse `http://localhost:3000` (EN) and `http://localhost:3000/id` (ID). Stop with Ctrl+C.

- [ ] **Step 3: Commit.**
  ```bash
  git add apps/web/src/app/[locale]/page.tsx
  git commit -m "$(cat <<'EOF'
  feat(web): add bilingual placeholder home page

  Uses @jakartabc/ui Button, reads locale-aware copy from messages/{en,id}.json,
  applies editorial spacing scale from packages/ui tokens.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 11: `[locale]/not-found.tsx` + `[locale]/error.tsx`

**Files:**
- create: `apps/web/src/app/[locale]/not-found.tsx`, `apps/web/src/app/[locale]/error.tsx`
- test: covered via Playwright in Task 19 (visiting an unknown path renders not-found)

Per spec §7.

- [ ] **Step 1: Write `apps/web/src/app/[locale]/not-found.tsx`.**
  ```tsx
  import Link from 'next/link'
  import { getTranslations } from 'next-intl/server'

  export default async function LocaleNotFound() {
    const t = await getTranslations('errors')
    return (
      <main className="mx-auto max-w-reading px-24 py-128">
        <h1 className="font-display text-display-lg text-ink-900">
          {t('notFoundTitle')}
        </h1>
        <p className="mt-24 text-body-lg text-ink-700">{t('notFoundBody')}</p>
        <p className="mt-48">
          <Link
            href="/"
            className="text-body-md text-ochre-700 underline underline-offset-4"
          >
            {t('notFoundHome')} →
          </Link>
        </p>
      </main>
    )
  }
  ```

- [ ] **Step 2: Write `apps/web/src/app/[locale]/error.tsx`.**
  ```tsx
  'use client'

  import { useEffect } from 'react'
  import { useTranslations } from 'next-intl'
  import { Button } from '@jakartabc/ui'

  export default function LocaleError({
    error,
    reset,
  }: {
    error: Error & { digest?: string }
    reset: () => void
  }) {
    const t = useTranslations('errors')

    useEffect(() => {
      // App errors go to stderr per spec §9.3
      console.error(error)
    }, [error])

    return (
      <main className="mx-auto max-w-reading px-24 py-128">
        <h1 className="font-display text-display-lg text-ink-900">
          {t('errorTitle')}
        </h1>
        <p className="mt-24 text-body-lg text-ink-700">{t('errorBody')}</p>
        <div className="mt-48 flex items-center gap-24">
          <Button onClick={() => reset()}>{t('errorRetry')}</Button>
          <a
            href="mailto:hello@jakartabc.com"
            className="text-body-md text-ochre-700 underline underline-offset-4"
          >
            {t('errorEmail')}
          </a>
        </div>
      </main>
    )
  }
  ```

- [ ] **Step 3: Typecheck.**
  ```bash
  pnpm --filter @jakartabc/web typecheck
  ```

- [ ] **Step 4: Commit.**
  ```bash
  git add apps/web/src/app/[locale]/not-found.tsx apps/web/src/app/[locale]/error.tsx
  git commit -m "$(cat <<'EOF'
  feat(web): add localized not-found and error boundaries

  Editorial copy from messages files, no illustrations, email fallback
  per spec §7.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 12: Payload v3 install + `payload.config.ts` + `SiteSettings` global + `/admin` mount

**Files:**
- create: `apps/web/src/payload.config.ts`, `apps/web/src/collections/SiteSettings.ts`, `apps/web/src/app/(payload)/admin/[[...segments]]/page.tsx`, `apps/web/src/app/(payload)/admin/[[...segments]]/not-found.tsx`, `apps/web/src/app/(payload)/api/[...slug]/route.ts`
- test: smoke — run dev, hit `/admin`, observe Payload setup screen (manual check + later e2e)

Spec §5.1: `SiteSettings` global has brand name, tagline, default locale, social links.

- [ ] **Step 1: Write `apps/web/src/collections/SiteSettings.ts`.**
  ```ts
  import type { GlobalConfig } from 'payload'

  export const SiteSettings: GlobalConfig = {
    slug: 'site-settings',
    label: { en: 'Site Settings', id: 'Pengaturan Situs' },
    access: {
      read: () => true,
    },
    fields: [
      {
        name: 'brandName',
        type: 'text',
        required: true,
        defaultValue: 'Jakarta Business Center',
      },
      {
        name: 'tagline',
        type: 'text',
        localized: true,
      },
      {
        name: 'defaultLocale',
        type: 'select',
        options: [
          { label: 'English', value: 'en' },
          { label: 'Bahasa Indonesia', value: 'id' },
        ],
        defaultValue: 'en',
      },
      {
        name: 'social',
        type: 'group',
        fields: [
          { name: 'linkedin', type: 'text' },
          { name: 'whatsapp', type: 'text' },
          { name: 'email', type: 'email' },
        ],
      },
    ],
  }
  ```

- [ ] **Step 2: Write `apps/web/src/payload.config.ts`.**
  ```ts
  import path from 'node:path'
  import { fileURLToPath } from 'node:url'
  import { buildConfig } from 'payload'
  import { postgresAdapter } from '@payloadcms/db-postgres'
  import { lexicalEditor } from '@payloadcms/richtext-lexical'
  import { SiteSettings } from './collections/SiteSettings'

  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)

  export default buildConfig({
    serverURL: process.env.NEXT_PUBLIC_SITE_URL,
    admin: {
      user: 'users',
      meta: {
        titleSuffix: ' · Jakarta BC Admin',
      },
    },
    editor: lexicalEditor({}),
    collections: [
      {
        slug: 'users',
        auth: true,
        admin: { useAsTitle: 'email' },
        fields: [],
      },
    ],
    globals: [SiteSettings],
    localization: {
      locales: ['en', 'id'],
      defaultLocale: 'en',
      fallback: true,
    },
    secret: process.env.PAYLOAD_SECRET ?? '',
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
    db: postgresAdapter({
      pool: {
        connectionString: process.env.DATABASE_URL,
      },
    }),
    upload: {
      limits: { fileSize: 5_000_000 },
    },
  })
  ```

- [ ] **Step 3: Write Payload admin route mount `apps/web/src/app/(payload)/admin/[[...segments]]/page.tsx`.**
  ```tsx
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import type { Metadata } from 'next'
  import config from '@payload-config'
  import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
  import { importMap } from '../importMap'

  type Args = {
    params: Promise<{ segments?: string[] }>
    searchParams: Promise<Record<string, string | string[]>>
  }

  export const generateMetadata = ({
    params,
    searchParams,
  }: Args): Promise<Metadata> =>
    generatePageMetadata({ config, params, searchParams })

  const Page = ({ params, searchParams }: Args) =>
    RootPage({ config, params, searchParams, importMap })

  export default Page
  ```

- [ ] **Step 4: Write Payload admin not-found `apps/web/src/app/(payload)/admin/[[...segments]]/not-found.tsx`.**
  ```tsx
  import config from '@payload-config'
  import { NotFoundPage, generatePageMetadata } from '@payloadcms/next/views'
  import { importMap } from '../importMap'

  type Args = {
    params: Promise<{ segments?: string[] }>
    searchParams: Promise<Record<string, string | string[]>>
  }

  export const generateMetadata = ({ params, searchParams }: Args) =>
    generatePageMetadata({ config, params, searchParams })

  const NotFound = ({ params, searchParams }: Args) =>
    NotFoundPage({ config, params, searchParams, importMap })

  export default NotFound
  ```

- [ ] **Step 5: Write the auto-generated import map stub `apps/web/src/app/(payload)/admin/importMap.ts`.**
  ```ts
  // Auto-managed by `pnpm --filter @jakartabc/web exec payload generate:importmap`.
  // Phase 0 starts empty; later phases regenerate this when custom admin
  // components are added.
  export const importMap = {}
  ```

- [ ] **Step 6: Write Payload REST/GraphQL passthrough `apps/web/src/app/(payload)/api/[...slug]/route.ts`.**
  ```ts
  import config from '@payload-config'
  import {
    REST_DELETE,
    REST_GET,
    REST_OPTIONS,
    REST_PATCH,
    REST_POST,
    REST_PUT,
  } from '@payloadcms/next/routes'

  export const GET = REST_GET(config)
  export const POST = REST_POST(config)
  export const DELETE = REST_DELETE(config)
  export const PATCH = REST_PATCH(config)
  export const PUT = REST_PUT(config)
  export const OPTIONS = REST_OPTIONS(config)
  ```

- [ ] **Step 7: Sanity-run Payload type generation (requires `DATABASE_URL`).**
  ```bash
  # From repo root, after Task 14 brings up the dev postgres:
  pnpm --filter @jakartabc/web exec payload generate:types
  ```
  Note: this will be re-run after Task 14 when postgres is reachable; until then, leave the command in the runbook.

- [ ] **Step 8: Typecheck.**
  ```bash
  pnpm --filter @jakartabc/web typecheck
  ```

- [ ] **Step 9: Commit.**
  ```bash
  git add apps/web/src/payload.config.ts apps/web/src/collections apps/web/src/app/\(payload\) pnpm-lock.yaml
  git commit -m "$(cat <<'EOF'
  feat(web): mount Payload v3 at /admin with SiteSettings global

  Postgres adapter, lexical editor, EN/ID localization, single users
  auth collection, and SiteSettings global as Phase 0 sanity check.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 13: `apps/web/Dockerfile` multi-stage standalone build

**Files:**
- create: `apps/web/Dockerfile`, `apps/web/.dockerignore`
- test: `docker build` from repo root (manual)

- [ ] **Step 1: Write `apps/web/.dockerignore`.**
  ```
  node_modules
  .next
  .turbo
  .git
  .env
  .env.*.local
  .env.local
  *.log
  coverage
  playwright-report
  test-results
  ```

- [ ] **Step 2: Write `apps/web/Dockerfile` (root build context, multi-stage, pnpm workspace aware).**
  ```dockerfile
  # syntax=docker/dockerfile:1.7

  # ---- Stage 1: deps ----
  FROM node:20.18.0-alpine AS deps
  RUN apk add --no-cache libc6-compat
  RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

  WORKDIR /repo

  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
  COPY packages/config/package.json packages/config/package.json
  COPY packages/ui/package.json packages/ui/package.json
  COPY apps/web/package.json apps/web/package.json

  RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
      pnpm install --frozen-lockfile

  # ---- Stage 2: build ----
  FROM node:20.18.0-alpine AS builder
  RUN apk add --no-cache libc6-compat
  RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

  WORKDIR /repo
  COPY --from=deps /repo/node_modules ./node_modules
  COPY --from=deps /repo/packages/config/node_modules ./packages/config/node_modules
  COPY --from=deps /repo/packages/ui/node_modules ./packages/ui/node_modules
  COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
  COPY . .

  ENV NEXT_TELEMETRY_DISABLED=1
  ENV NODE_ENV=production

  RUN pnpm --filter @jakartabc/web build

  # ---- Stage 3: runtime ----
  FROM node:20.18.0-alpine AS runner
  RUN apk add --no-cache libc6-compat tini
  WORKDIR /app

  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1
  ENV PORT=3000
  ENV HOSTNAME=0.0.0.0

  RUN addgroup --system --gid 1001 nodejs && \
      adduser --system --uid 1001 nextjs

  COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
  COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

  # Persistent volumes
  RUN mkdir -p /uploads && chown nextjs:nodejs /uploads
  VOLUME ["/uploads"]

  USER nextjs
  EXPOSE 3000

  HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

  ENTRYPOINT ["/sbin/tini", "--"]
  CMD ["node", "apps/web/server.js"]
  ```

- [ ] **Step 3: Local build smoke (only if docker available).**
  ```bash
  docker build -f apps/web/Dockerfile -t jakartabc-web:phase0 .
  ```
  Expected: build succeeds. (Skip if docker not installed; the same build runs on the VPS via compose.)

- [ ] **Step 4: Commit.**
  ```bash
  git add apps/web/Dockerfile apps/web/.dockerignore
  git commit -m "$(cat <<'EOF'
  build(web): add multi-stage Dockerfile producing standalone image

  Three-stage build (deps/build/runtime) on node:20.18.0-alpine, pnpm
  store cache mount, non-root nextjs user, /uploads volume, tini PID 1.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 14: `docker-compose.yml` + `docker-compose.dev.yml`

**Files:**
- create: `docker-compose.yml`, `docker-compose.dev.yml`
- test: `docker compose -f docker-compose.dev.yml up -d` brings postgres up; `psql` connects

- [ ] **Step 1: Write `docker-compose.yml` (production: postgres + web + caddy).**
  ```yaml
  name: jakartabc

  services:
    postgres:
      image: postgres:16-alpine
      restart: unless-stopped
      environment:
        POSTGRES_USER: ${POSTGRES_USER:-jakartabc}
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
        POSTGRES_DB: ${POSTGRES_DB:-jakartabc}
      volumes:
        - pgdata:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-jakartabc} -d ${POSTGRES_DB:-jakartabc}"]
        interval: 10s
        timeout: 5s
        retries: 10
      networks:
        - internal

    web:
      build:
        context: .
        dockerfile: apps/web/Dockerfile
      restart: unless-stopped
      depends_on:
        postgres:
          condition: service_healthy
      environment:
        NODE_ENV: production
        DATABASE_URL: ${DATABASE_URL}
        PAYLOAD_SECRET: ${PAYLOAD_SECRET}
        NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL}
        DEFAULT_LOCALE: ${DEFAULT_LOCALE:-en}
      volumes:
        - uploads:/uploads
      networks:
        - internal
      expose:
        - "3000"

    caddy:
      image: caddy:2-alpine
      restart: unless-stopped
      depends_on:
        - web
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
        - caddy_data:/data
        - caddy_config:/config
      environment:
        SITE_DOMAIN: ${SITE_DOMAIN:-staging.jakartabc.com}
        ACME_EMAIL: ${ACME_EMAIL}
      networks:
        - internal

  volumes:
    pgdata:
    uploads:
    caddy_data:
    caddy_config:

  networks:
    internal:
      driver: bridge
  ```

- [ ] **Step 2: Write `docker-compose.dev.yml` (dev: postgres only, host-port exposed).**
  ```yaml
  name: jakartabc-dev

  services:
    postgres:
      image: postgres:16-alpine
      restart: unless-stopped
      environment:
        POSTGRES_USER: jakartabc
        POSTGRES_PASSWORD: jakartabc
        POSTGRES_DB: jakartabc
      ports:
        - "5432:5432"
      volumes:
        - pgdata_dev:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U jakartabc -d jakartabc"]
        interval: 10s
        timeout: 5s
        retries: 10

  volumes:
    pgdata_dev:
  ```

- [ ] **Step 3: Local dev sanity.**
  ```bash
  docker compose -f docker-compose.dev.yml up -d
  docker compose -f docker-compose.dev.yml ps
  ```
  Expected: postgres container `healthy` within ~15s.

- [ ] **Step 4: Run Payload types now that DB is reachable (sanity).**
  ```bash
  DATABASE_URL=postgres://jakartabc:jakartabc@localhost:5432/jakartabc \
  PAYLOAD_SECRET=dev-secret-32-chars-minimum-for-tests \
    pnpm --filter @jakartabc/web exec payload generate:types
  ```
  Expected: `apps/web/src/payload-types.ts` is generated.

- [ ] **Step 5: Commit.**
  ```bash
  git add docker-compose.yml docker-compose.dev.yml
  git commit -m "$(cat <<'EOF'
  build(infra): add docker-compose for prod stack and dev postgres

  Prod compose wires postgres + web + caddy on an internal bridge
  network with named volumes for pgdata, uploads, and caddy state.
  Dev override exposes postgres on host:5432 for local Next.js.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 15: `caddy/Caddyfile` for staging.jakartabc.com

**Files:**
- create: `caddy/Caddyfile`
- test: manual (Caddy logs show successful TLS handshake when deployed)

- [ ] **Step 1: Write `caddy/Caddyfile`.**
  ```caddy
  {
    email {$ACME_EMAIL}
    # admin off  # enable once DNS + ACME first issuance is confirmed
  }

  {$SITE_DOMAIN} {
    encode zstd gzip

    header {
      Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
      X-Content-Type-Options "nosniff"
      X-Frame-Options "DENY"
      Referrer-Policy "strict-origin-when-cross-origin"
      Permissions-Policy "camera=(), microphone=(), geolocation=()"
      -Server
    }

    log {
      output file /data/access.log {
        roll_size 10mb
        roll_keep 14
        roll_keep_for 336h
      }
      format json
    }

    reverse_proxy web:3000 {
      header_up X-Forwarded-Proto {scheme}
      header_up X-Forwarded-For {remote}
      header_up X-Real-IP {remote}
      transport http {
        keepalive 30s
      }
    }
  }
  ```

- [ ] **Step 2: Validate Caddyfile syntax locally (optional — needs caddy binary).**
  ```bash
  docker run --rm -v "$PWD/caddy/Caddyfile":/etc/caddy/Caddyfile caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  ```
  Expected: `Valid configuration` (env vars resolved at runtime by compose; warnings about unresolved `{$...}` placeholders during validate are expected).

- [ ] **Step 3: Commit.**
  ```bash
  git add caddy/Caddyfile
  git commit -m "$(cat <<'EOF'
  build(infra): add Caddy reverse proxy with auto Let's Encrypt

  Reverse-proxies web:3000, sets HSTS + frame-deny + nosniff headers,
  retains 14 days of access logs. Domain and ACME email come from env.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 16: `.env.example` + zod env validation in `apps/web/src/env.ts`

**Files:**
- create: `.env.example`, `apps/web/src/env.ts`
- modify: `apps/web/src/payload.config.ts` to read validated env
- test: invoking env throws at build/start when required vars missing (Vitest unit test in `apps/web`)

Per spec §3.4 env list.

- [ ] **Step 1: Write repo-root `.env.example` (no real secrets).**
  ```
  # ----- Database -----
  POSTGRES_USER=jakartabc
  POSTGRES_PASSWORD=change-me
  POSTGRES_DB=jakartabc
  DATABASE_URL=postgres://jakartabc:change-me@postgres:5432/jakartabc

  # ----- Payload -----
  PAYLOAD_SECRET=replace-with-32-plus-char-random-string

  # ----- Next.js -----
  NEXT_PUBLIC_SITE_URL=https://staging.jakartabc.com
  DEFAULT_LOCALE=en

  # ----- Caddy -----
  SITE_DOMAIN=staging.jakartabc.com
  ACME_EMAIL=ops@jakartabc.com

  # ----- Email (Phase 3, but reserved keys) -----
  EMAIL_PROVIDER=resend
  RESEND_API_KEY=
  SMTP_HOST=
  SMTP_PORT=
  SMTP_USER=
  SMTP_PASS=
  EMAIL_FROM=Jakarta Business Center <hello@jakartabc.com>
  SALES_EMAIL=sales@jakartabc.com

  # ----- Anti-spam (Phase 3) -----
  TURNSTILE_SECRET_KEY=
  NEXT_PUBLIC_TURNSTILE_SITE_KEY=

  # ----- Revalidation (Phase 2) -----
  REVALIDATE_SECRET=replace-with-shared-secret
  ```

- [ ] **Step 2: Write `apps/web/src/env.ts`.**
  ```ts
  import { z } from 'zod'

  const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url().or(z.string().startsWith('postgres://')),
    PAYLOAD_SECRET: z.string().min(32, 'PAYLOAD_SECRET must be at least 32 chars'),
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    DEFAULT_LOCALE: z.enum(['en', 'id']).default('en'),

    // Reserved for later phases; optional in Phase 0.
    EMAIL_PROVIDER: z.enum(['resend', 'smtp']).optional(),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    SALES_EMAIL: z.string().email().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    REVALIDATE_SECRET: z.string().optional(),
  })

  function parseEnv() {
    const result = schema.safeParse(process.env)
    if (!result.success) {
      const formatted = result.error.flatten().fieldErrors
      const lines = Object.entries(formatted)
        .map(([k, v]) => `  - ${k}: ${(v ?? []).join('; ')}`)
        .join('\n')
      throw new Error(`Invalid environment variables:\n${lines}`)
    }
    return result.data
  }

  export const env = parseEnv()
  export type Env = z.infer<typeof schema>
  ```

- [ ] **Step 3: Add a unit test for env parsing `apps/web/src/env.test.ts`.**
  ```ts
  import { afterEach, describe, expect, it } from 'vitest'

  const ORIGINAL = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIGINAL }
  })

  describe('env schema', () => {
    it('rejects short PAYLOAD_SECRET', async () => {
      process.env.DATABASE_URL = 'postgres://u:p@localhost:5432/db'
      process.env.PAYLOAD_SECRET = 'too-short'
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
      await expect(import('./env?case=short')).rejects.toThrow(/PAYLOAD_SECRET/)
    })

    it('accepts a valid configuration', async () => {
      process.env.DATABASE_URL = 'postgres://u:p@localhost:5432/db'
      process.env.PAYLOAD_SECRET = 'x'.repeat(32)
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
      const mod = await import('./env?case=ok')
      expect(mod.env.DEFAULT_LOCALE).toBe('en')
    })
  })
  ```
  Note: the `?case=...` suffix sidesteps module caching across cases. The test runs only via the apps/web vitest config below.

- [ ] **Step 4: Add a tiny `apps/web/vitest.config.ts` so env tests run via `pnpm test`.**
  ```ts
  import { defineConfig } from 'vitest/config'

  export default defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  })
  ```
  And update `apps/web/package.json` `"test"` script to:
  ```
  "test": "vitest run"
  ```
  Add `"vitest": "2.1.3"` to `devDependencies` and re-run `pnpm install`.

- [ ] **Step 5: Wire `payload.config.ts` to env.**
  Replace the env reads in `apps/web/src/payload.config.ts` with imports from `./env`:
  ```ts
  import { env } from './env'
  // ...
    serverURL: env.NEXT_PUBLIC_SITE_URL,
    secret: env.PAYLOAD_SECRET,
    db: postgresAdapter({ pool: { connectionString: env.DATABASE_URL } }),
  ```

- [ ] **Step 6: Run tests.**
  ```bash
  pnpm --filter @jakartabc/web test
  ```
  Expected: 2 env tests pass.

- [ ] **Step 7: Commit.**
  ```bash
  git add .env.example apps/web/src/env.ts apps/web/src/env.test.ts apps/web/vitest.config.ts apps/web/package.json apps/web/src/payload.config.ts pnpm-lock.yaml
  git commit -m "$(cat <<'EOF'
  feat(web): add zod-validated env loader and .env.example

  Validates DATABASE_URL, PAYLOAD_SECRET length (32+), NEXT_PUBLIC_SITE_URL,
  and reserves keys for Phase 3 email + anti-spam. Payload config now reads
  through the validated module.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 17: GitHub Actions CI

**Files:**
- create: `.github/workflows/ci.yml`
- test: trigger by opening a PR (post-Phase 0)

- [ ] **Step 1: Write `.github/workflows/ci.yml`.**
  ```yaml
  name: ci

  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]

  concurrency:
    group: ci-${{ github.ref }}
    cancel-in-progress: true

  jobs:
    verify:
      runs-on: ubuntu-24.04
      timeout-minutes: 15

      services:
        postgres:
          image: postgres:16-alpine
          env:
            POSTGRES_USER: jakartabc
            POSTGRES_PASSWORD: jakartabc
            POSTGRES_DB: jakartabc
          ports:
            - 5432:5432
          options: >-
            --health-cmd "pg_isready -U jakartabc -d jakartabc"
            --health-interval 10s
            --health-timeout 5s
            --health-retries 10

      env:
        DATABASE_URL: postgres://jakartabc:jakartabc@localhost:5432/jakartabc
        PAYLOAD_SECRET: ci-secret-32-chars-minimum-padding-xx
        NEXT_PUBLIC_SITE_URL: http://localhost:3000
        DEFAULT_LOCALE: en

      steps:
        - uses: actions/checkout@v4

        - uses: actions/setup-node@v4
          with:
            node-version-file: .nvmrc

        - uses: pnpm/action-setup@v4
          with:
            version: 9.12.3
            run_install: false

        - name: pnpm store path
          id: pnpm-cache
          shell: bash
          run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

        - uses: actions/cache@v4
          with:
            path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
            key: pnpm-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
            restore-keys: pnpm-${{ runner.os }}-

        - run: pnpm install --frozen-lockfile

        - name: Lint
          run: pnpm lint

        - name: Typecheck
          run: pnpm typecheck

        - name: Unit tests
          run: pnpm test

        - name: Build
          run: pnpm build
  ```

- [ ] **Step 2: Commit.**
  ```bash
  git add .github/workflows/ci.yml
  git commit -m "$(cat <<'EOF'
  ci: add GitHub Actions workflow (lint, typecheck, test, build)

  Runs against ephemeral postgres:16-alpine service; pnpm store cached
  by lockfile hash. Concurrency group cancels stale runs per ref.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 18: README runbook (local + deploy + backup)

**Files:**
- modify: `README.md`
- test: n/a (docs)

Per spec §10.4 and §10.5.

- [ ] **Step 1: Replace `README.md` with the full runbook.**
  ```markdown
  # jakartabc.com

  Foreign Direct Investment consulting site for Jakarta Business Center.

  - Spec: `docs/superpowers/specs/2026-05-18-jakartabc-design.md`
  - Brand & visual system: `design-system.md`

  ## Stack

  - Next.js 15 App Router + React 19
  - Payload v3 mounted at `/admin`, Postgres 16
  - next-intl (EN default, ID prefixed `/id`)
  - Tailwind CSS 3.4 + `@jakartabc/ui` tokens preset
  - Caddy 2 reverse proxy, auto Let's Encrypt
  - pnpm 9 workspace + Turborepo

  ## Repo layout

  ```
  apps/web              Next.js app (marketing + Payload admin)
  packages/ui           Design tokens + base components
  packages/config       Shared eslint, tsconfig, prettier
  caddy/                Caddyfile
  docker-compose.yml    Production stack
  docker-compose.dev.yml Local postgres only
  ```

  ## Local development

  Requirements: Node 20.18+, pnpm 9.12+, Docker.

  ```bash
  corepack enable && corepack prepare pnpm@9.12.3 --activate
  pnpm install
  cp .env.example .env
  # edit .env: set PAYLOAD_SECRET to 32+ chars, etc.

  docker compose -f docker-compose.dev.yml up -d
  pnpm --filter @jakartabc/web exec payload generate:types
  pnpm dev
  ```

  Visit:
  - http://localhost:3000 (EN)
  - http://localhost:3000/id (ID)
  - http://localhost:3000/admin (first signup becomes admin)

  ## Verification commands

  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test            # unit (Vitest)
  pnpm test:e2e        # Playwright smoke
  pnpm build           # production build
  ```

  ## VPS provisioning (Ubuntu 24.04 LTS)

  Target: Hetzner CX22 class or similar.

  1. Create `deploy` user, SSH key only, disable password auth.
     ```bash
     adduser --disabled-password deploy
     usermod -aG sudo deploy
     mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
     # append your pubkey to /home/deploy/.ssh/authorized_keys
     chown -R deploy:deploy /home/deploy/.ssh
     sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
     systemctl reload ssh
     ```
  2. UFW (replace 22 with custom SSH port if used):
     ```bash
     ufw default deny incoming
     ufw default allow outgoing
     ufw allow 22/tcp
     ufw allow 80/tcp
     ufw allow 443/tcp
     ufw enable
     ```
  3. Install Docker (Docker's official repo):
     ```bash
     apt-get update
     apt-get install -y ca-certificates curl
     install -m 0755 -d /etc/apt/keyrings
     curl -fsSL https://download.docker.com/linux/ubuntu/gpg | tee /etc/apt/keyrings/docker.asc >/dev/null
     chmod a+r /etc/apt/keyrings/docker.asc
     echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
       > /etc/apt/sources.list.d/docker.list
     apt-get update
     apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
     usermod -aG docker deploy
     ```
  4. DNS: point `staging.jakartabc.com` A record to the VPS IPv4.
  5. Clone and configure:
     ```bash
     sudo -iu deploy
     mkdir -p /opt/jakartabc.com && cd /opt/jakartabc.com
     git clone <repo-url> .
     cp .env.example .env
     chmod 600 .env
     # edit .env with production secrets
     ```
  6. Boot the stack:
     ```bash
     docker compose pull
     docker compose up -d --build
     docker compose logs -f caddy   # confirm TLS issuance succeeds
     ```
  7. First admin: visit `https://staging.jakartabc.com/admin` and create the
     initial admin account (Payload makes the first signup admin).

  ## Deploy update

  ```bash
  ssh deploy@vps
  cd /opt/jakartabc.com
  git pull
  docker compose pull
  docker compose up -d --build web
  ```

  Rollback:
  ```bash
  git checkout <prev-sha>
  docker compose up -d --build web
  ```

  ## Backup (host cron)

  ```cron
  0 3 * * * pg_dump -h localhost -U jakartabc jakartabc | gzip > /backup/db-$(date +\%F).sql.gz
  0 4 * * * find /backup -name 'db-*.sql.gz' -mtime +14 -delete
  ```

  Restore:
  ```bash
  gunzip < /backup/db-YYYY-MM-DD.sql.gz | psql -U jakartabc jakartabc
  ```

  ## Secret rotation

  Rotating `PAYLOAD_SECRET` invalidates all admin sessions — communicate
  before rotation. Update `.env`, then `docker compose up -d web`.
  ```

- [ ] **Step 2: Commit.**
  ```bash
  git add README.md
  git commit -m "$(cat <<'EOF'
  docs(readme): add full local-dev, VPS provisioning, deploy, backup runbook

  Captures spec §10.4 deploy steps and §10.5 backup cron so anyone with
  ssh + .env can re-provision staging.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 19: Playwright smoke test (EN + ID placeholder, `lang` attr)

**Files:**
- create: `apps/web/playwright.config.ts`, `apps/web/e2e/placeholder.spec.ts`
- modify: `apps/web/package.json` (already has `test:e2e` from Task 7)

- [ ] **Step 1: Write `apps/web/playwright.config.ts`.**
  ```ts
  import { defineConfig, devices } from '@playwright/test'

  const PORT = Number(process.env.PORT ?? 3000)
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`

  export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
      baseURL,
      trace: 'on-first-retry',
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: process.env.PLAYWRIGHT_NO_SERVER
      ? undefined
      : {
          command: 'pnpm start',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
  })
  ```

- [ ] **Step 2: Write `apps/web/e2e/placeholder.spec.ts`.**
  ```ts
  import { test, expect } from '@playwright/test'

  test('EN home renders placeholder with lang="en"', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Set up a PT PMA in Indonesia.',
    )
    await expect(page.getByTestId('placeholder-note')).toContainText(
      'Staging environment',
    )
  })

  test('ID home renders placeholder with lang="id"', async ({ page }) => {
    await page.goto('/id')
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Dirikan PT PMA di Indonesia.',
    )
    await expect(page.getByTestId('placeholder-note')).toContainText(
      'staging',
    )
  })

  test('unknown locale path renders localized not-found', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      "This page isn't here.",
    )
  })
  ```

- [ ] **Step 3: Install browser & run locally.**
  ```bash
  pnpm --filter @jakartabc/web exec playwright install --with-deps chromium
  pnpm --filter @jakartabc/web build
  # ensure dev DB is up:
  docker compose -f docker-compose.dev.yml up -d
  pnpm --filter @jakartabc/web test:e2e
  ```
  Expected: 3 passing tests.

- [ ] **Step 4: Commit.**
  ```bash
  git add apps/web/playwright.config.ts apps/web/e2e
  git commit -m "$(cat <<'EOF'
  test(web): add Playwright smoke for EN/ID placeholder and 404

  Asserts html[lang] per locale, bilingual hero copy, and that an
  unknown path returns 404 with the localized not-found UI.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 20: Phase 0 close-out — deploy staging + tag

**Files:**
- none (deployment + tag)

- [ ] **Step 1: Pre-flight checks.**
  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm build
  ```
  All must exit 0.

- [ ] **Step 2: Provision the staging VPS** by following `README.md` "VPS provisioning" section. Confirm:
  - `https://staging.jakartabc.com/` renders EN placeholder with `lang="en"`.
  - `https://staging.jakartabc.com/id` renders ID placeholder with `lang="id"`.
  - `https://staging.jakartabc.com/admin` shows the Payload first-admin creation screen, then login.
  - Caddy log shows successful TLS issuance.

- [ ] **Step 3: Push to remote and verify CI is green on `main`.**
  ```bash
  git push -u origin main
  gh run list --limit 1
  ```
  Expected: most recent workflow `ci` run completes `success`.

- [ ] **Step 4: Tag.**
  ```bash
  git tag -a phase-0-foundation-complete -m "Phase 0 foundation complete: staging live, admin live, CI green"
  git push origin phase-0-foundation-complete
  ```

- [ ] **Step 5: Phase 0 done.** Update `docs/superpowers/specs/2026-05-18-jakartabc-design.md` status only if owner asks; the spec doc is the contract, the tag is the proof.

---

## Phase 0 acceptance checklist (mirror of spec §4 "Done when")

- [ ] pnpm workspace + Turborepo in place; `pnpm dev` runs every package in parallel
- [ ] `packages/config` exports eslint, prettier, tsconfig presets
- [ ] `packages/ui` ships token CSS vars, Tailwind preset, and Button/Card/Input stubs (each with Vitest coverage)
- [ ] `apps/web` runs Next.js 15 App Router with next-intl EN/ID routing and self-hosted Fraunces + Inter
- [ ] `[locale]/page.tsx`, `not-found.tsx`, `error.tsx` use the design-system editorial layout
- [ ] Payload v3 mounted at `/admin` with postgres adapter and `SiteSettings` global
- [ ] `apps/web/Dockerfile` produces a standalone image
- [ ] `docker-compose.yml` boots postgres + web + caddy; `docker-compose.dev.yml` boots postgres only
- [ ] `caddy/Caddyfile` serves `staging.jakartabc.com` with auto Let's Encrypt + HSTS
- [ ] `.env.example` covers all keys from spec §3.4; `apps/web/src/env.ts` validates them via zod
- [ ] `.github/workflows/ci.yml` runs lint + typecheck + unit test + build per PR
- [ ] README provisioning + deploy + backup runbook complete
- [ ] Playwright smoke test passes locally and in CI for EN + ID + 404
- [ ] Tag `phase-0-foundation-complete` pushed

---

## Notes for downstream phases (handoff)

- Phase 1 component inventory (NavBar, MobileMenu, Hero, EditorialList, PricingTable, EditorialTimeline, EditorialQuote, StickyTOC, InsightCard, LangToggle, RuleDivider, Eyebrow, DisplayHeading, FooterBlock, ContactBlock, LocalizedLink) all extend the tokens + preset wired here — they should `import preset from '@jakartabc/ui/tailwind-preset'` indirectly via the app config, not redefine colors.
- Phase 2 collections (`Insights`, `Authors`, `Categories`, `Media`, `Services`, `Regulations`) plug into `apps/web/src/collections/`; Payload config picks them up via array push. The `SiteSettings` global already proves the wiring.
- Phase 3 booking/contact API picks up `EMAIL_PROVIDER`, `RESEND_API_KEY`, `SALES_EMAIL`, `TURNSTILE_*` from `apps/web/src/env.ts` — they are already declared (optional) so adding `.required()` for those phases is a one-line schema change.
- Phase 4 portal will live at `apps/portal/`; the Caddyfile currently routes only `SITE_DOMAIN`. Add a second `app.jakartabc.com {}` block reverse-proxying `portal:3001` then.

---

## Open questions surfaced while drafting (non-blocking for Phase 0)

1. **Tailwind 4 vs 3.4.** This plan locks 3.4.13 because Payload v3 + Next 15 + Tailwind 4 alpha integration was unstable at the time the spec was approved. A Tailwind 4 migration could land between Phase 1 and Phase 2 once the upstream paths are settled. Confirm with the team before Phase 1 starts.
2. **Payload `users` collection.** Phase 0 ships a minimal `users` auth collection so `/admin` works. Phase 4 spec is supposed to decide whether portal users share this table or live separately (spec §11 open item). Phase 0 implicitly opens that door but does not close it.
3. **Image audit script in CI (spec §6.6).** The spec says the script must fail CI if a `public/images/*` asset exceeds 200kb after AVIF. Phase 0 ships an empty `public/`, so the script is deferred to Phase 1 when real imagery lands.
4. **Anti-AI compliance checklist (spec §1.4, design-system §11).** The placeholder page already respects the rules (no gradient, no glass, no emoji, no oversized radius). Phase 1 should formalize this as a documented checklist run before the EN/ID launch.
5. **CSP nonces (spec §10.3).** `'unsafe-inline'` is tolerated v1 per spec; Phase 0 ships no `headers()` block in `next.config.ts`. If ops prefers a stricter CSP earlier, add a `headers()` callback in `next.config.ts` during Phase 1.
6. **`.gitignore` for `payload-types.ts`.** Phase 0 ignores the generated types file. Most teams check it in for editor DX. Confirm preference before Phase 2 lands many collections.
