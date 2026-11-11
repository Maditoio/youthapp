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

Staff accounts then ask for a **per-person confirmation code** (unique for each staff profile). Admins can view and rotate codes on **Admin → Personnel / Staff**. Seeded demo codes are stable six-digit values such as `481001` (admin) and `481002` (KYC).

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

## UI requirements

These apply to every screen. New work must follow them.

### Action buttons show a loading state

- Every button that runs an action (form submit, server action, async click handler) shows a spinner while the action is in flight.
- The button is disabled while pending so it cannot be submitted twice. Its label stays visible next to the spinner (or an `sr-only` label when the button is icon-only).
- Form submits use `SubmitButton` (`src/components/ui/submit-button.tsx`), which reads `useFormStatus()`. When several submit buttons share a form, all are disabled and only the one that was pressed spins. Give buttons that share a form a distinct `formAction` or `name`/`value`.
- Client click handlers use `<Button loading={pending}>` (`src/components/ui/button.tsx`), with `pending` from `useTransition`, `useActionState` or local state.
- Links styled as buttons only navigate and do not need a spinner.

### Spinners use the brand tints

- Spinner: `src/components/ui/spinner.tsx`. `Button` picks the tone from its variant.
- On filled buttons (`primary` violet `#6d4dff`, `ink` `#1d1633`, `copper`/pink `#ff6fae`): lilac track (`#efeaff` at 35%) with a white arc.
- On light buttons (`secondary`, `ghost`, `link`, `danger`, white or lilac surfaces): lilac track (`#efeaff`) with a violet arc (`#6d4dff`).
- Do not use grey or default browser spinners.

### Outcomes appear as in-app notifications

- Never use `window.alert`, `window.confirm`, `window.prompt` or any other native browser popup.
- Results of create, update, delete, approve, reject and status-change actions appear as toasts from `ToastProvider` (`src/components/ui/toast.tsx`): green success, red error, violet info. Toasts sit top-right on desktop and at the top on mobile. They close on their own (5 s, 8 s for errors), pause on hover or focus, can be dismissed, and are announced through `aria-live` (`role="status"`, or `role="alert"` for errors).
- Server actions that redirect report the outcome in the URL: `withNotice(path, CODE)` adds `?notice=CODE` and `withError(path, CODE)` adds `?error=CODE` (`src/server/domain/notices.ts`). `FlashToaster` in the root layout shows the toast once, then removes the parameter without reloading the page. Inline `?error=` text on the page stays visible.
- Server actions used with `useActionState` return `{ ok }` or `{ error }`. Call `useActionFeedback(state, locale, NOTICE_CODE)` to show the matching toast.
- Copy is always French and English: success messages live in `noticeCopy` (`src/server/domain/notices.ts`) and errors in `errorCopy` (`src/server/domain/errors.ts`). Add new codes there instead of hard-coding strings in toasts.

## Known limits

Citizens aged 18 through 35 can join and buy. Raised money is assigned to the company only when shares are issued, either to start it or to finance it. Profit payments are an amount per share, proposed by the company and approved by a different administrator.

When `DATABASE_URL` is set, screens read and write PostgreSQL through the Prisma 8 contract (`src/prisma/contract.prisma`). Without it, the local demo file `data/demo-db.json` is used. Put your connection string in `.env` / Vercel, then run `npx prisma db init` with Node.js 22.18 or newer to create the tables. Production Postgres starts empty (no fictional Amina/tomato seed).

Payments stay in the sandbox. Money is stored in integer cents, the ledger balances, and a sandbox payment does not issue shares. Sandbox simulate-payment (investor subscription detail) and `POST /api/webhooks/payments/sandbox` are on when `NEXT_PUBLIC_DEMO_MODE` is not `false`, or when `SANDBOX_PAYMENTS_ENABLED=true` for process testing without the demo banner/seed. A real statutory register, licensed custody, and production identity checks are not in place. Do not treat the figures as a real offer.

## License

Private — all rights reserved.
