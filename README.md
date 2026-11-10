# Jeunese

Equity investment PWA for Congolese citizens (home and diaspora) to become genuine shareholders of productive businesses in the DRC.

**Display name:** Jeunese  
**Tagline:** Invest together. Build together. Own together.  
**Mode:** Demo / sandbox only — no live investments or payments until legal and provider approvals.

This repository currently delivers **Milestone 1** (architecture & foundation). Database, real Clerk auth, and product UI come in later milestones.

## Stack

- Next.js App Router + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui-ready components
- French-first i18n (`fr` default, `en` supported)
- Installable PWA (manifest + lean service worker)
- Clerk behind an auth adapter stub (env wired; no invented secrets)
- Vitest + ESLint + Prettier

## Local setup

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
git clone https://github.com/kasaiindependent-del/youthinvestmentcongo.git
cd youthinvestmentcongo
npm install
cp .env.example .env.local
```

Fill Clerk keys in `.env.local` only when you have real values from the Clerk dashboard. Leaving them empty keeps the adapter in stub mode.

### Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Quality checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

## Route shells (Milestone 1)

| Surface  | Path                   | Notes                                            |
| -------- | ---------------------- | ------------------------------------------------ |
| Public   | `/`                    | Landing shell, French default, language switcher |
| Auth     | `/sign-in`, `/sign-up` | Clerk adapter stubs                              |
| Investor | `/investor`            | Desktop sidebar + mobile bottom nav shell        |
| Admin    | `/admin`               | Back-office shell                                |
| Issuer   | `/issuer`              | Optional stub (features in Milestone 8)          |
| Health   | `/api/health`          | Liveness JSON                                    |

## Design tokens

Brand colours and `--font-size-base` live in `src/styles/tokens.css` as CSS variables (themeable / adjustable for low-vision readers).

## Demo mode

`NEXT_PUBLIC_DEMO_MODE` defaults to `true`. A visible demo banner is rendered from the root layout via `DemoModeBanner`. Do not mix fictional content with production data.

## What is intentionally out of scope

- Prisma / PostgreSQL (Milestone 2)
- Real Clerk sessions, MFA, RBAC (Milestone 3)
- Full landing, project marketplace, investor dashboard UI (Milestone 4)
- Admin CRUD (Milestone 5)
- Offerings, payments, KYC, ledger, share register (Milestones 6–8)
- Production go-live (Milestone 9)

## License

Private — all rights reserved.
