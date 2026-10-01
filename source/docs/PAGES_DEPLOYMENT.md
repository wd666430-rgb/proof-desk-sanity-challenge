# Publish the full Next.js static export

This workflow deploys the existing `next build` static export. It does not rebuild the application in GitHub Actions. The public demo remains read-only and queries the public Sanity dataset in the browser; no Sanity token, repository secret or extra account is required.

The complete Next export is now live. Run [36742897411](https://github.com/wd666430-rgb/proof-desk-sanity-challenge/actions/runs/36742897411) succeeded, and a fresh guest-browser visit verified the full Next resources and live Sanity records. These steps describe how to reproduce that deployment.

## Web steps

1. Upload `proof-desk-github-pages.zip` to the repository root on `main`. Keep the filename unchanged. The ZIP contains a root `index.html` and the full `_next/static` resource directory, with the base path `/proof-desk-sanity-challenge`.
2. Open the repository's **Settings → Pages**. Under **Build and deployment → Source**, select **GitHub Actions**. No starter template is needed.
3. Use **Add file → Create new file** on `main`. Name the file `.github/workflows/pages-deploy.yml`, paste the accompanying workflow exactly, and commit. This commit triggers the deployment.
4. Open **Actions → Deploy Proof Desk Next.js export**. If the workflow did not start, use **Run workflow → main**. Wait for all five steps and the `github-pages` deployment to succeed.
5. Open `https://wd666430-rgb.github.io/proof-desk-sanity-challenge/` in a new or cache-refreshed tab. Check that `_next/static` resources load, the page says **Sanity Content Lake**, the five records are present, and **Refresh store** reads the current `review` state for the Sanity challenge record. Practice review must stay local to the tab; there is no public write endpoint.

The root single-file `index.html`, source ZIP and README may remain in the repository. The workflow uploads **only** the extracted `_site` directory, so the old single-file preview and source archive are not served as part of the new deployment. The previous public deployment is not replaced until this workflow successfully deploys. The public URL and existing Sanity CORS origin remain unchanged.

If GitHub rejects deployment because of environment branch protection, inspect **Settings → Environments → github-pages** and ensure the intended `main` branch is eligible. Do not create a personal access token or add a Sanity write token to solve a Pages configuration error.

## Official configuration checked

The workflow uses the versions in GitHub's current Pages documentation: `actions/checkout@v6`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, and `actions/deploy-pages@v4`. These exact major-version refs were independently confirmed through GitHub's public Git refs API. They are supported versions; this is not a claim that each action is the newest release.

The automatic `GITHUB_TOKEN` has `contents: read`, `pages: write`, and `id-token: write`. The deployment targets the `github-pages` environment and uses a single job, with artifact upload before deployment. No custom credentials are configured.

- [GitHub: using custom workflows with Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub: configuring the Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Official deploy-pages action](https://github.com/actions/deploy-pages)

## Local validation

The supplied archive has 24 files and is 202,693 bytes. Its root HTML references `/proof-desk-sanity-challenge/_next/static/...`; all referenced local assets exist in the archive. The workflow's extraction and required-file checks were run locally in a temporary directory. YAML syntax and key workflow fields were checked locally. Separately, the successful Actions conclusion and the current public page's eight Next static-resource references were verified; the recorded evidence is in `docs/pages-deployment-evidence.json`.
