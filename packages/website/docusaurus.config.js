const { themes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Fastify File Router',
  tagline: 'Your files are your API.',
  favicon: 'img/router.svg',
  url: 'https://bhouston.github.io',
  baseUrl: '/fastify-file-router/',
  organizationName: 'bhouston',
  projectName: 'fastify-file-router',
  onBrokenLinks: 'throw',
  markdown: { format: 'detect', hooks: { onBrokenMarkdownLinks: 'throw' } },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/bhouston/fastify-file-router/edit/main/packages/website/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['../fastify-file-router/src/index.ts', '../fastify-file-router/src/FastifyFileRouterOptions.ts'],
        tsconfig: '../fastify-file-router/tsconfig.json',
        out: 'docs/api',
        readme: 'none',
        excludePrivate: true,
        excludeInternal: true,
        sidebar: { autoConfiguration: false },
      },
    ],
  ],
  themeConfig: {
    image: 'img/router.svg',
    navbar: {
      title: 'Fastify File Router',
      logo: { alt: '', src: 'img/router.svg' },
      items: [
        { to: '/docs/getting-started', label: 'Docs', position: 'left' },
        { to: '/docs/examples', label: 'Examples', position: 'left' },
        { to: '/docs/api', label: 'API reference', position: 'left' },
        { href: 'https://www.npmjs.com/package/fastify-file-router', label: 'npm', position: 'right' },
        { href: 'https://github.com/bhouston/fastify-file-router', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            { label: 'Get started', to: '/docs/getting-started' },
            { label: 'Routing conventions', to: '/docs/routing' },
          ],
        },
        {
          title: 'Build',
          items: [
            { label: 'Typed routes', to: '/docs/typed-routes' },
            { label: 'API reference', to: '/docs/api' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/bhouston/fastify-file-router' },
            { label: 'Discord', href: 'https://discord.gg/fwupDN493R' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Fastify File Router · MIT · Created by <a href="https://ben3d.ca">Ben Houston</a> · Sponsored by <a href="https://landofassets.com">Land of Assets</a>`,
    },
    prism: { theme: themes.github, darkTheme: themes.dracula, additionalLanguages: ['bash', 'json'] },
  },
};

module.exports = config;
