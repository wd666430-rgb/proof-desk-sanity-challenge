# Proof Desk

A small Next.js app for researching public AI-friendly cash opportunities through source receipts and explicit review decisions. Built on 2026-09-30 for the DEV × Sanity Path Two challenge. It contains public-source examples only.

## Run

Requires Node 20.9+ and pnpm. This machine uses bundled Node 24.19.0 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Open http://127.0.0.1:8891/ . With no `SANITY_PROJECT_ID`, data comes from a labeled local working copy. With project `ofdsgt18` and public dataset `production`, the app reads the real Content Lake without a token. Copy `.env.example` to `.env.local` and set the two non-sensitive fields to connect. A failed cloud read never falls back to the local examples.

The current public dataset contains five source-backed records. Amounts are potential competition prizes, not revenue. Some entry fees, eligibility details and payment channels remain explicitly unknown. No record currently satisfies every action gate with the default PayPal requirement.

## Review workflow

The schema stores source receipts, six claim types, deadlines, costs, AI policies, workflow state and transition history in each opportunity. Checks are deterministic and use the current clock. The frontend can export a receipt and run a clearly labeled practice copy; practice changes stay in the browser tab.

The owner can review cloud records through the Studio's **Review receipt** action using the existing Sanity login. It captures the displayed published revision and rejects conflicts or content drafts. Publishing edited evidence resets the record to `draft`. Studio read-only fields are UI guidance, not a security boundary. Transition history is ordinary editable content, not an immutable audit trail.

The optional Next review API requires an owner secret and server-only editor token in cloud mode. It represents owner authorization, not proof that a person is operating the credential. The public Pages demo exposes no write endpoint and needs no token.

A real authorized Studio test moved the Sanity record from `draft` to `review`, producing version 1 and one history event. Refreshing the public Pages demo showed that same state and version. This demonstrated a cloud write and public read synchronization; it did not approve entry, win a prize or record revenue.

## Studio and import

```sh
node scripts/seed.mjs --check
cd sanity
pnpm install --frozen-lockfile
pnpm exec sanity login --provider google
pnpm exec sanity datasets import ../data/seed.ndjson --project-id ofdsgt18 --dataset production --missing
pnpm exec sanity schemas deploy
pnpm exec sanity deploy --url proof-desk-ofdsgt18 --title 'Proof Desk' --yes
```

Do not import confidential data into this public dataset. Public document IDs must not contain dots: Sanity unauthenticated reads exclude dotted IDs. The five sample IDs use `opportunity-...`.

These commands were executed after the project owner authorized Sanity setup and CLI login. No permanent API token was created. `seed:check` and `seed:sanity` are non-writing validation commands unless explicit `--write --confirm-project <id>` arguments and a server token are supplied; the CLI import is the demonstrated import path.

## Public demo

The live public demo is https://wd666430-rgb.github.io/proof-desk-sanity-challenge/ . The owner uploaded the single-file preview through the existing GitHub account and verified the successful Pages deployment without a login: five records and two currently open entries. `delivery/github-single/index.html` has all CSS/JS inline and live public Sanity reads. It is generated from the Next app's React component and omits the Next routing runtime. `delivery/github-pages/` contains the preferred complete Next static export with the correct repository base path. Exact, credential-free CORS for the Pages origin has been configured and tested.

```sh
node scripts/export-public.mjs --target pages
node scripts/export-single.mjs
```

For an itch iframe backup, `node scripts/export-public.mjs --target itch` exports relative assets and a real Content Lake snapshot, explicitly labeled with its export time. A snapshot does not claim to be a live read. Export scripts recreate these uploadable assets from the source.

An optional Worker export is available but is not the current deployment path:

```sh
node scripts/export-public.mjs --target worker
pnpm dlx wrangler deploy
```

The export copies only an explicit public-source file list, never `.env.local`. Cloudflare Worker serves the static Next.js frontend and proxies a token-free public Sanity query. This avoids browser CORS configuration and gives judges a live, login-free read. Authentication and deployment must be authorized by the owner. Use Workers Free; do not select paid plans, domains or add-ons. Do not publish until the external URL has been verified.

Sanity Free supports the public dataset, Studio schema, custom actions and free Studio hosting used here. The new account currently has a $0 Growth trial that automatically downgrades to Free, as verified by the owner. No trial-only feature is required. The frontend Worker uses no paid model service.

## Verify

```sh
pnpm test
pnpm run build
cd sanity
pnpm exec sanity build
```

Tests cover unknown payment, expired/future entries, eligibility, source age, missing citations, assistant/human role declarations, optimistic version checks, concurrent local writes, ignored client clocks, safe source URLs and the public proxy's read-only/fail-closed behavior. Positive test cases are synthetic fixtures kept out of the public dataset. `docs/live-read-evidence.json` records real public Content Lake IDs/revisions, not simulated earnings.

No account registration, application submission, external contact, trading or prize claim is performed by the app. Cash received: not recorded. This app does not forecast a probability of winning.

## Attribution

Original application code was developed with Codex. Frameworks: Next.js/React and the official Sanity client/Studio. Public rule sources are linked on every receipt. General concepts of Source → Eligibility → Offer → Outcome informed the design; no existing private implementation or protocol key was copied. See `docs/CONTEST_CHECKLIST.md` and the unsubmitted English article draft.
