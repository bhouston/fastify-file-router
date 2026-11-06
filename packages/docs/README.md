# Documentation website

Docusaurus site for Fastify File Router, deployed to <https://fastify-file-router.ben3d.ca/>.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
pnpm docs:build
pnpm --filter @fastify-file-router/docs serve
```

`typedoc.json` drives `pnpm generate`, which regenerates `docs/api/` from the library source and TSDoc comments before every development or production build. The options module is an explicit documentation entry point because its types are used by the plugin but are not re-exported by the npm entry point. Edit source comments for API changes; edit `docs/*.md` for guides. Generated API pages and build outputs are ignored.

CI runs `pnpm docs:build`, so pull request CI checks generated pages and broken links. The site deploys only from the Release workflow: `.github/workflows/pages.yml` builds the new release tag, uploads it with `upload-pages-artifact` and publishes it with `deploy-pages`. GitHub Pages must use **GitHub Actions** as its build source. A manual workflow dispatch redeploys the latest release; see `RELEASING.md`.
