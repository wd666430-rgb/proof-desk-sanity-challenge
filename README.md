# Proof Desk

A small Next.js app for researching public AI-friendly cash opportunities through source receipts and explicit review decisions. Built on 2026-09-30 for the DEV × Sanity Path Two challenge. It contains public-source examples only. The [published Path Two submission](https://dev.to/di_wang_3516db206ab336792/proof-desk-receipts-before-rewards-3m7n) documents the build and evidence.

The [inspectable application source](source/) is expanded in this repository. The original [source ZIP](proof-desk-source.zip) is retained for one-file download. The [Studio review](evidence/cloud-review-state-version.png), [draft-to-review event](evidence/cloud-review-studio.png) and [matching public history](evidence/public-review-history.png) are captured as separate evidence; these show a review transition, not an award or payment.

Run the development and test commands from `source/`. The deployment workflow intentionally reads the prebuilt ZIP at this repository's root, so changes to documentation or source inspection files alone do not redeploy the public demo.

## Run

Requires Node 20.9+ and pnpm. This machine uses bundled Node 24.19.0 and pnpm 11.25.0.

```sh
cd source
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

Public frontend: https://wd666430-rgb.github.io/proof-desk-sanity-challenge/ . The deployment uses the complete Next.js static export with the base path `/proof-desk-sanity-challenge`. GitHub Actions extracts the prebuilt `proof-desk-github-pages.zip` from the repository root and uploads only its static pages and `_next/static` resources. Client-side reads query the real public Sanity Content Lake through an exact, credential-free CORS origin. The static deployment has no server or public write endpoint.

The complete Next export is live: [deployment run 36742897411](https://github.com/wd666430-rgb/proof-desk-sanity-challenge/actions/runs/36742897411) succeeded, and the replacement page was checked in a guest browser. It loads `_next/static` scripts, reads the live public Sanity dataset, and shows five researched records, two open entries, and the Sanity record's `review` state. The repository's root `index.html` is the old portable preview; the production URL serves the full Next export deployed from the ZIP. See `docs/VALIDATION.md` and `docs/pages-deployment-evidence.json` for the recorded checks.

```sh
node scripts/export-public.mjs --target pages
```

The exporter writes `.public-build/pages/out`. Package that directory's **contents** as `proof-desk-github-pages.zip`, with `index.html` at the archive root. The repository workflow is `.github/workflows/pages-deploy.yml`. Set **Settings → Pages → Source** to **GitHub Actions**, upload the static ZIP to the repository root, and commit or manually run the workflow on `main`. No repository secret or Sanity write token is required. See `docs/PAGES_DEPLOYMENT.md` for the exact steps. Portable single-file previews remain optional backups generated by `node scripts/export-single.mjs`; they are not the current contest deployment.

For an itch iframe backup, `node scripts/export-public.mjs --target itch` exports relative assets and a real Content Lake snapshot, explicitly labeled with its export time. A snapshot does not claim to be a live read. Export scripts recreate these uploadable assets from the source.

Sanity Free supports the public dataset, Studio schema, custom actions and free Studio hosting used here. The new account currently has a $0 Growth trial that automatically downgrades to Free, as verified by the owner. No trial-only feature is required. The frontend uses no paid model service.

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

Original application code was developed with Codex. Frameworks: Next.js/React and the official Sanity client/Studio. Public rule sources are linked on every receipt. General concepts of Source → Eligibility → Offer → Outcome informed the design; no existing private implementation or protocol key was copied. See `docs/CONTEST_CHECKLIST.md` and the [published English submission](https://dev.to/di_wang_3516db206ab336792/proof-desk-receipts-before-rewards-3m7n).
