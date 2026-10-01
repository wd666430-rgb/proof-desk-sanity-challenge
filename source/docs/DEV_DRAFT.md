---
title: "Proof Desk: receipts before rewards"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*Historical local draft. The [final Path Two submission](https://dev.to/di_wang_3516db206ab336792/proof-desk-receipts-before-rewards-3m7n) was published on DEV on October 1, 2026.*

## What I Built

Proof Desk is an evidence desk for people researching AI-friendly cash opportunities. It takes a competition prize and asks six concrete questions: what does entry cost, what cash is offered, when can I enter, is my use of AI allowed, am I eligible, and how is payment made?

![Proof Desk public demo](https://raw.githubusercontent.com/wd666430-rgb/proof-desk-sanity-challenge/main/proof-desk-hero.jpg)

The first five records are based on public official rules. Missing evidence remains unknown. For example, Sanity's prize is documented, but its current payment channel is not named in the official rules. The app keeps that opportunity on hold for someone who requires confirmed PayPal.

This is a research tool. A prize is conditional, a review is a decision, and settled revenue would need its own evidence. The app never submits an entry or spends money.

## Demo

Public frontend: https://wd666430-rgb.github.io/proof-desk-sanity-challenge/

Studio: https://proof-desk-ofdsgt18.sanity.studio/

The public frontend reads the real public Sanity dataset without a login. Judges can search opportunities, inspect linked receipts, set their own eligibility preferences, export a JSON receipt, and select **Practice review on a copy**. Practice changes stay in that tab and are visibly labeled. Owner edits use the authenticated Studio action.

Suggested walkthrough: inspect the Sanity record, notice its unknown payment field, open a practice copy, request review, and mark it blocked with a reason. A real authorized Studio test also moved that record from draft to review. The Studio showed version 1 and one recorded transition; refreshing the public Pages demo showed the same review state, #01 and history event. The note kept payout and eligibility explicitly unconfirmed. This was a test of the workflow, not approval to enter or evidence of earnings.

![Studio record in review at version 1](https://raw.githubusercontent.com/wd666430-rgb/proof-desk-sanity-challenge/main/evidence/cloud-review-state-version.png)

![The same transition in the public read-only demo](https://raw.githubusercontent.com/wd666430-rgb/proof-desk-sanity-challenge/main/evidence/public-review-history.png)

The [Studio event detail](https://github.com/wd666430-rgb/proof-desk-sanity-challenge/blob/main/evidence/cloud-review-studio.png) shows the stored `draft → review` transition. The `human` actor label is a declared role, not identity proof.

## Code

Repository: https://github.com/wd666430-rgb/proof-desk-sanity-challenge

The [expanded source](https://github.com/wd666430-rgb/proof-desk-sanity-challenge/tree/main/source) and [source ZIP](https://github.com/wd666430-rgb/proof-desk-sanity-challenge/blob/main/proof-desk-source.zip) are available alongside the live build. A useful reading path is the [Sanity schema](https://github.com/wd666430-rgb/proof-desk-sanity-challenge/blob/main/source/sanity/schemaTypes/index.mjs) for the structured evidence fields, the [Studio review action](https://github.com/wd666430-rgb/proof-desk-sanity-challenge/blob/main/source/sanity/actions/ReviewAction.jsx) for owner review with revision checks, then the [decision model](https://github.com/wd666430-rgb/proof-desk-sanity-challenge/blob/main/source/lib/model.mjs) for deterministic gates.

The app uses Next.js 16.3.7 and React 19.3.0. The GitHub Pages deployment uses the complete Next.js static export, including the framework's generated pages and `_next/static` resources, configured for the repository's base path. An official GitHub Actions Pages workflow extracts the prebuilt static ZIP and deploys that directory. Sanity Content Lake stores the records; client-side reads use an exact, credential-free CORS origin. No model API, server write endpoint or permanent write token is needed for the public demo.

The [full Next export deployment](https://github.com/wd666430-rgb/proof-desk-sanity-challenge/actions/runs/36742897411) succeeded. A fresh guest-browser visit verified the generated `_next/static` scripts, five live Sanity records, two open entries, and the Sanity record's review state. The earlier portable React preview remains only a backup.

## My Build Process

The app was built with Codex on September 30. The scope was deliberately narrow: public opportunities, explicit receipts, and one complete workflow. It reuses the general idea of tracing a source through eligibility and an offer to a decision, without copying any private commercial or protocol data.

Three condensed task prompts capture the iteration. These are reconstructions from the build notes, not verbatim session quotes:

1. **Make unknowns visible.** Build a desk that records the official source for each prize, fee, deadline, AI rule, eligibility condition and payout method, and hold a decision when a required field is missing. The first local version made it possible to test the gate before connecting an account.
2. **Prove the cloud read.** Import the same public records into Sanity and verify them from an unauthenticated browser. The import command completed, yet the public query returned zero records. Dotted document IDs were the cause; changing them to hyphenated IDs and repeating the public query exposed the five records.
3. **Attack the review boundary.** Try to make an expired entry appear current by sending an older client clock. The first review route accepted that clock. The route now uses server time, and a regression test covers the attempt.

The first working version kept a local JSON copy so the checks and interface could be tested before an account existed. That mode was labeled as local. Once the owner created the Sanity project and authorized CLI access, the same records were imported into the public Content Lake.

That exposed a real integration mistake. The import command reported success, but unauthenticated queries returned zero records. I had used dotted document IDs. Sanity's public-read rules exclude IDs containing dots. I changed the IDs to hyphenated names, reimported the public records, removed the unused copies, and checked the actual API response rather than trusting the import message.

Independent review found another concrete bug: the review API accepted a client-supplied clock. A caller could move the clock backwards to make an expired entry appear current. The route now uses only server time, with a regression test for that case. A review role is an owner declaration; the code does not claim to identify whether a credential holder is a person or software.

Sanity adds more than storage here. Claims and source receipts are modeled separately inside each record. A custom Studio action moves published records through draft, review, approval or blocked states using the displayed revision. Conflicts are rejected, content drafts must be resolved first, and publishing new evidence resets its decision. Transition history lives alongside the content. It is useful review history, not an immutable financial ledger.

The schema makes a claim's source and confidence explicit: a `claim` stores its `field`, `verdict` (`supported`, `unknown` or `contradicted`), and `sourceKey`; an `opportunity` carries the `sources`, `claims`, `state`, `version` and `history` fields. A public GROQ query such as `count(*[_type == "opportunity"])` can verify the dataset is populated without an editor token. The owner-only Studio action performs the state change; the static demo has no public write route.

The checks run without paid model calls. AI helped create the app; factual evidence and runtime checks do the verification work. Fourteen automated tests cover known failure cases, and the Next frontend, static export and Studio build pass. Browser verification of the public GitHub Pages demo required no login: five researched records, two open entries, linked receipts and an unknown payment field that keeps the decision on hold. The authorized Studio draft-to-review write and the matching public refresh demonstrated the actual cloud workflow. The action uses the existing authenticated session; it does not prove that a credential holder is a human.

## Sanity Project Details

- Project ID: `ofdsgt18`
- Dataset: `production`, public
- Document type: `opportunity`, with source receipts, claims, eligibility fields and review events
- Public query: https://ofdsgt18.api.sanity.io/v2026-09-01/data/query/production?query=count(*%5B_type%20%3D%3D%20%22opportunity%22%5D)

The design uses capabilities available on Sanity Free. The new account begins with a $0 trial and automatically returns to Free; the app does not depend on a paid feature. Only public rule summaries are imported. No credentials, private customer data, email addresses or local machine files are in the dataset.

## Agent Session

No raw session is attached. A sanitized excerpt can be added after review; the full research conversation contains unrelated account and project context and is unsuitable for public upload.
