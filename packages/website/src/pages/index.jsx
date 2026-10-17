import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';
import styles from './index.module.css';

const features = [
  {
    title: 'A route you can find',
    body: 'Use familiar Remix or Next.js filename conventions. Folders, parameters, and HTTP methods describe your API at a glance.',
    to: '/docs/routing',
  },
  {
    title: 'Types from your schemas',
    body: 'Infer request types from JSON Schema or Zod. Keep validation and TypeScript together with defineRoute() and defineRouteZod().',
    to: '/docs/typed-routes',
  },
  {
    title: 'Fastify, all the way',
    body: 'Use Fastify hooks and schemas. Add file discovery to an existing server and mount routes where you need them.',
    to: '/docs/examples',
  },
];

const route = `// src/routes/users.$id.get.ts
import { defineRoute } from 'fastify-file-router';

export const route = defineRoute({
  schema: {
    params: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    } as const,
  },
  handler: async (request) => {
    return { id: request.params.id }; // inferred string
  },
});`;

export default function Home() {
  return (
    <Layout
      title="Your files are your API"
      description="File-based routing for Fastify with Remix and Next.js conventions, TypeScript inference, JSON Schema, and Zod validation."
    >
      <header className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div>
            <p className={styles.eyebrow}>File-based routing for Fastify</p>
            <h1>
              Your files.
              <br />
              Your routes.
              <br />
              <span>Your API.</span>
            </h1>
            <p className={styles.lead}>
              Build a Fastify API with a directory of route files. Get familiar conventions, schema-driven types, and
              less registration code.
            </p>
            <div className={styles.actions}>
              <Link className="button button--primary button--lg" to="/docs/getting-started">
                Get started →
              </Link>
              <Link className="button button--secondary button--lg" to="/docs/examples">
                See examples
              </Link>
            </div>
            <p className={styles.compatibility}>Fastify 5 · Node.js 22+ · TypeScript · MIT</p>
          </div>
          <div className={styles.routes}>
            <div className={styles.panelTitle}>A directory becomes an API</div>
            <CodeBlock language="text">{`src/routes/
├── get.ts               → GET /
├── users.get.ts         → GET /users
├── users.post.ts        → POST /users
└── users.$id.get.ts     → GET /users/:id`}</CodeBlock>
            <div className={styles.install}>
              <CodeBlock language="bash">npm install fastify fastify-file-router ajv zod</CodeBlock>
            </div>
          </div>
        </div>
      </header>
      <main className="container">
        <section className={styles.grid} aria-label="Why Fastify File Router">
          {features.map(({ title, body, to }) => (
            <article className={styles.card} key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
              <Link to={to}>Learn more →</Link>
            </article>
          ))}
        </section>
        <section className={styles.example} aria-labelledby="types-title">
          <div>
            <p className={styles.eyebrow}>One definition, useful types</p>
            <h2 id="types-title">
              Write the schema.
              <br />
              Use the inferred request.
            </h2>
            <p>
              Your route file owns its handler and validation. JSON Schema works with Fastify’s validation; Zod adds
              runtime parsing and supports mixing schema styles in a single route.
            </p>
            <Link to="/docs/typed-routes">Explore typed routes →</Link>
          </div>
          <CodeBlock language="typescript" title="GET /users/:id">
            {route}
          </CodeBlock>
        </section>
        <section className={styles.callout}>
          <div>
            <h2>From first endpoint to deployed server</h2>
            <p>Learn routing conventions, configure compiled JavaScript, and inspect startup profiling.</p>
          </div>
          <Link className="button button--primary button--lg" to="/docs/getting-started">
            Build your first route →
          </Link>
        </section>
      </main>
    </Layout>
  );
}
