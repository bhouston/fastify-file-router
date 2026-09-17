import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const { pull_request: pr } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
execFileSync('pnpm', ['exec', 'commitlint'], { input: pr.title, stdio: ['pipe', 'inherit', 'inherit'] });
const fail = (message) => {
  throw new Error(message);
};
if (pr.base.ref !== 'main') fail(`PRs must target main, not ${pr.base.ref}.`);

const branch = /^(?:feature|fix|chore|docs|refactor|test)\/(\d+)-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(pr.head.ref);
if (!branch) fail('Use a branch such as feature/42-add-router.');
const issue = branch[1];
const closes = new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+#${issue}\\b`, 'i');
if (!closes.test(pr.body ?? '')) fail(`PR body must contain Closes #${issue}.`);
const response = await fetch(`https://api.github.com/repos/${pr.base.repo.full_name}/issues/${issue}`, {
  headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' },
});
if (!response.ok) fail(`Cannot verify issue #${issue}: HTTP ${response.status}.`);
const linked = await response.json();
if (linked.pull_request || linked.state !== 'open') fail('Link an open issue, not a PR.');
