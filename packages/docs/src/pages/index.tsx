import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';
import Layout from '@theme/Layout';

const workflow = [
  ['Name', 'users.$id.get.ts becomes GET /users/:id'],
  ['Define', 'Export a route with its schema and handler'],
  ['Register', 'One app.register call discovers every file'],
  ['Ship', 'Point buildRoot at compiled output'],
];

const cards = [
  {
    name: 'Getting started',
    label: 'Install and first route',
    href: '/docs/getting-started/',
    body: 'Add the plugin to a Fastify 5 app, create a routes directory and serve your first endpoint.',
  },
  {
    name: 'Routing conventions',
    label: 'Remix and Next.js names',
    href: '/docs/routing/',
    body: 'How folders, dot-separated segments, parameters and HTTP method suffixes become URLs.',
  },
  {
    name: 'Typed routes',
    label: 'JSON Schema and Zod',
    href: '/docs/typed-routes/',
    body: 'Write a request schema once and get validation and TypeScript types from it.',
  },
  {
    name: 'API reference',
    label: 'Generated from TSDoc',
    href: '/docs/api/',
    body: 'Every exported function, type and plugin option, straight from the source comments.',
  },
];

const tree = `src/routes/
├── get.ts               → GET /
├── users.get.ts         → GET /users
├── users.post.ts        → POST /users
└── users.$id.get.ts     → GET /users/:id`;

const route = `// src/routes/users.$id.get.ts
import { defineRouteZod } from 'fastify-file-router';
import { z } from 'zod';

export const route = defineRouteZod({
  schema: {
    params: z.object({ id: z.uuid() }),
  },
  handler: async (request) => {
    return { id: request.params.id }; // inferred string
  },
});`;

const register = `await app.register(fastifyFileRouter, {
  routesDirs: ['./routes'],
  maxConcurrentTasks: 4,
  profile: { enabled: true, slowestRoutesCount: 5 },
});`;

export default function Home() {
  return (
    <Layout
      title="File-based routing for Fastify"
      description="File-based routing for Fastify with Remix and Next.js conventions, TypeScript inference, and JSON Schema or Zod validation."
    >
      <header className="home-hero container">
        <div>
          <p className="eyebrow">Fastify · TypeScript · Open source</p>
          <h1>
            Stop registering routes.
            <br />
            <em>Let your files do it.</em>
          </h1>
          <p className="hero-description">
            Put a handler in a file named for its URL and method. Fastify File Router finds it, registers it, and infers
            request types from the schema you already wrote.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary button--lg" to="/docs/getting-started/">
              Get started <span aria-hidden>→</span>
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/examples/">
              See examples
            </Link>
          </div>
        </div>
        <figure className="hero-preview">
          <CodeBlock language="text" title="A directory becomes an API">
            {tree}
          </CodeBlock>
        </figure>
      </header>
      <main>
        <section className="workflow-band" aria-label="How it works">
          <div className="container workflow-steps">
            {workflow.map(([title, detail], index) => (
              <div key={title}>
                <span className="workflow-number">0{index + 1}</span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="container story-section" aria-labelledby="types-title">
          <div>
            <p className="eyebrow">One definition, useful types</p>
            <h2 id="types-title">
              Write the schema.
              <br />
              Use the inferred request.
            </h2>
            <p>
              Your route file owns its handler and validation. A Zod schema validates the request at runtime and types
              it in your handler. Prefer JSON Schema? Use it instead, or mix both in a single route.
            </p>
            <Link to="/docs/typed-routes/">Explore typed routes →</Link>
          </div>
          <CodeBlock language="typescript" title="GET /users/:id">
            {route}
          </CodeBlock>
        </section>
        <section className="container story-section" aria-labelledby="startup-title">
          <CodeBlock language="typescript" title="Plugin options">
            {register}
          </CodeBlock>
          <div>
            <p className="eyebrow">Still just Fastify</p>
            <h2 id="startup-title">
              Mount it anywhere.
              <br />
              Measure what it loads.
            </h2>
            <p>
              Register the plugin on an existing server, choose the mount path and routes directories, and use your
              usual Fastify hooks and schemas. Startup profiling reports the slowest route files when you need it.
            </p>
            <Link to="/docs/api/">Read the plugin options →</Link>
          </div>
        </section>
        <section className="container package-section" aria-labelledby="docs-title">
          <div className="section-heading">
            <p className="eyebrow">Keep reading</p>
            <h2 id="docs-title">Find the part you need.</h2>
          </div>
          <div className="package-grid">
            {cards.map((card) => (
              <Link key={card.name} to={card.href} className="package-card">
                <p className="package-label">{card.label}</p>
                <h3>{card.name}</h3>
                <p>{card.body}</p>
                <span>Read more →</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="container home-callout">
          <div>
            <p className="eyebrow">Fastify 5 · Node.js 22+ · MIT</p>
            <h2>From first endpoint to deployed server.</h2>
            <CodeBlock language="bash">npm install fastify fastify-file-router ajv zod</CodeBlock>
          </div>
          <div className="hero-actions">
            <Link className="button button--primary button--lg" to="/docs/getting-started/">
              Build your first route
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/api/">
              API reference
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
