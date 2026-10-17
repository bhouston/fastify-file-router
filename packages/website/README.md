# Documentation website

Docusaurus site for Fastify File Router, deployed to <https://bhouston.github.io/fastify-file-router/>.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
pnpm docs:build
pnpm --filter @fastify-file-router/website serve
```

The TypeDoc plugin regenerates `docs/api/` from the library source and JSDoc/TSDoc comments on every development or production build. The options module is an explicit documentation entry point because its types are used by the plugin but are not re-exported by the npm entry point. Edit source comments for API changes; edit `docs/*.md` for guides. Generated API pages and build outputs are ignored.

The workspace build includes this site, so pull request CI checks generated pages and broken links. On pushes to `main`, `.github/workflows/pages.yml` uploads the static build using `upload-pages-artifact` and publishes it using `deploy-pages`. GitHub Pages must use **GitHub Actions** as its build source in repository settings. A manual workflow dispatch can redeploy without an npm release.
