# Jeunese

Equity investment PWA for Congolese citizens (home and diaspora) to become genuine shareholders of productive businesses in the DRC.

**Display name:** Jeunese  
**Tagline:** Invest together. Build together. Own together.  
**Mode:** Demo / sandbox only — no live investments or payments until legal and provider approvals.

The interface uses the violet card system from the reference screens (soft canvas, purple surfaces, pink accent, round cards, charts and a mobile tab bar). It is an equity platform, not a bank balance.

## Demo accounts

Password for every account: `Demo-Jeunese-2026`

| Email | Role |
| --- | --- |
| amina@demo.jeunese.test | Approved investor, 40 recorded shares |
| admin@demo.jeunese.test | Platform administrator |
| issuer@demo.jeunese.test | Issuer manager |
| kyc@demo.jeunese.test | Identity reviewer |
| finance@demo.jeunese.test | Finance officer |
| approver@demo.jeunese.test | Offering approver |

Staff accounts also ask for the demonstration code `482913`.

Open [http://localhost:3000](http://localhost:3000). A visible demo banner stays on every screen. Fictional records live in `data/demo-db.json` and can be rebuilt from Administration → Réglages.

## Stack

- Next.js App Router + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui-ready components
- French-first i18n (`fr` default, `en` supported)
- Installable PWA (manifest + lean service worker)
- Clerk signs in through the existing login screen when both Clerk keys are set. Empty keys keep the demo password login.
- Vitest + ESLint + Prettier

## Local setup

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
git clone https://github.com/Maditoio/youthapp.git
cd youthinvestmentcongo
npm install
cp .env.example .env.local
```

Fill `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local` only when you have real values from the Clerk dashboard. Leaving them empty keeps the demo sign-in screen and its password. With both keys set, the same screen talks to Clerk and then opens the Jeunese session.

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

## Surfaces

| Surface | Path | What you can do |
| --- | --- | --- |
| Public | `/`, `/projects`, `/learn`, `/risks` | Read the movement and the published demo offering |
| Auth | `/sign-in`, `/sign-up`, `/verify`, `/mfa` | Email and password, sandbox Google, staff second step |
| Investor | `/investor` | Holdings, subscriptions, dividends, votes, identity, beneficiaries |
| Admin | `/admin` | Review identity, offerings, payments, the share register, estates |
| Issuer | `/issuer` | Company workspace and updates that wait for approval |

French is the default. English is available from the language switch.

## Known limits

Citizens aged 18 through 35 can join and buy. Raised money is assigned to the company only when shares are issued, either to start it or to finance it. Profit payments are an amount per share, proposed by the company and approved by a different administrator.

The screens still read and write `data/demo-db.json`. PostgreSQL is prepared, not switched on. The data contract is `src/prisma/contract.prisma`. Put your connection string in `DATABASE_URL`, then run `npx prisma db init` with Node.js 22.18 or newer. That creates the tables. It does not yet move the running screens off the demo file.

Payments stay in the sandbox. Money is stored in integer cents, the ledger balances, and a sandbox payment does not issue shares. A real statutory register, licensed custody, and production identity checks are not in place. Do not treat the figures as a real offer.

## License

Private — all rights reserved.
