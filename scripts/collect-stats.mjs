#!/usr/bin/env node
/**
 * Conta as linhas que eu escrevi em cada linguagem, a partir dos meus commits, e grava assets/stats.json.
 *
 * Repositórios analisados:
 *   - os públicos de `user` (profile.config.json);
 *   - os listados em `.profile.local.json` (ignorado pelo git), que também pode trazer e-mails extras;
 *   - com PROFILE_TOKEN: todos os que o token enxerga (privados e de organizações) onde há commit meu.
 * Variável opcional PROFILE_EMAILS (separada por vírgula) soma e-mails sem expô-los no repositório.
 *
 * Só números agregados são gravados: nenhum nome de repositório ou projeto sai daqui.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'repos');
const OUTPUT = join(ROOT, 'assets', 'stats.json');
const TOKEN = process.env.PROFILE_TOKEN ?? '';

const config = JSON.parse(readFileSync(join(ROOT, 'profile.config.json'), 'utf8'));
const local = existsSync(join(ROOT, '.profile.local.json'))
  ? JSON.parse(readFileSync(join(ROOT, '.profile.local.json'), 'utf8'))
  : {};
const EMAILS = [
  ...config.emails,
  ...(local.emails ?? []),
  ...(process.env.PROFILE_EMAILS ?? '').split(',').map((email) => email.trim()).filter(Boolean),
];

const LANGUAGES = {
  ts: 'TypeScript', tsx: 'TypeScript', mts: 'TypeScript', cts: 'TypeScript',
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  java: 'Java', kt: 'Kotlin', cs: 'C#', py: 'Python', rs: 'Rust', go: 'Go',
  php: 'PHP', rb: 'Ruby', dart: 'Dart', c: 'C', cpp: 'C++', swift: 'Swift',
  html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'SCSS', vue: 'Vue', svelte: 'Svelte',
  sql: 'SQL', ps1: 'PowerShell', sh: 'Shell', bat: 'Batch', cmd: 'Batch', alg: 'Portugol',
};

// Caminhos que não são código autoral: dependências, builds, lockfiles, gerados e kits de agentes de IA.
const IGNORED = [
  /(^|\/)(node_modules|vendor|dist|build|out|target|coverage|\.next|\.mvn)\//,
  /(^|\/)\.(claude|agents|codex|cursor)\//,
  /(^|\/)drizzle\/meta\//,
  /(^|\/)mvnw(\.cmd)?$/,
  /\.min\.(js|css)$/,
];

async function request(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `${config.user}-profile-stats`,
      ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} em ${path}`);
  const next = response.headers.get('link')?.match(/<https:\/\/api\.github\.com([^>]+)>;\s*rel="next"/)?.[1];
  return { body: await response.json(), next };
}

async function requestAll(path) {
  const items = [];
  for (let page = path; page; ) {
    const { body, next } = await request(page);
    items.push(...body);
    page = next;
  }
  return items;
}

async function hasMyCommits(repo) {
  for (const email of EMAILS) {
    const { body } = await request(`/repos/${repo}/commits?author=${encodeURIComponent(email)}&per_page=1`)
      .catch(() => ({ body: [] }));
    if (body.length) return true;
  }
  return false;
}

async function discoverRepos() {
  const repos = new Set(local.repos ?? []);
  const listed = TOKEN
    ? await requestAll('/user/repos?affiliation=owner,collaborator,organization_member&per_page=100')
    : await requestAll(`/users/${config.user}/repos?type=owner&per_page=100`);
  for (const repo of listed) {
    if (repo.size === 0 || repos.has(repo.full_name)) continue;
    if (repo.owner.login === config.user || (await hasMyCommits(repo.full_name))) repos.add(repo.full_name);
  }
  repos.delete(`${config.user}/${config.user}`); // o próprio perfil não é código
  return [...repos].sort();
}

function git(args, cwd) {
  const auth = TOKEN
    ? ['-c', `http.extraHeader=Authorization: Basic ${Buffer.from(`x-access-token:${TOKEN}`).toString('base64')}`]
    : [];
  return execFileSync('git', ['-c', 'core.longpaths=true', ...auth, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function sync(repo) {
  const dir = join(CACHE, repo.replace('/', '__'));
  if (existsSync(dir)) git(['fetch', '--quiet', '--prune', 'origin', '+refs/heads/*:refs/heads/*'], dir);
  else git(['clone', '--quiet', '--bare', '--filter=blob:none', `https://github.com/${repo}.git`, dir]);
  return dir;
}

// numstat mostra renomeações como "src/{a => b}/x.ts" ou "a.ts => b.ts"; fica o caminho novo.
const currentPath = (path) =>
  path.replace(/\{[^{}]*? => ([^{}]*)\}/g, '$1').replace(/^.* => /, '').replace(/\/{2,}/g, '/');

function languageOf(path) {
  if (IGNORED.some((pattern) => pattern.test(path))) return null;
  const file = path.split('/').pop();
  return file.includes('.') ? LANGUAGES[file.split('.').pop().toLowerCase()] ?? null : null;
}

async function main() {
  if (process.env.CI && !TOKEN) {
    console.log('PROFILE_TOKEN ausente: mantendo assets/stats.json como está.');
    return;
  }
  mkdirSync(CACHE, { recursive: true });

  const lines = new Map();
  const seen = new Set();
  let repositories = 0;
  let firstCommit = null;

  for (const repo of await discoverRepos()) {
    let log;
    try {
      log = git(['log', '--all', '--no-merges', '--numstat', '--format=%x01%H %as', ...EMAILS.map((email) => `--author=${email}`)], sync(repo));
    } catch (error) {
      // Logs do Actions são públicos: o nome do repositório só aparece quando roda localmente.
      console.warn(process.env.CI ? '! um repositório falhou' : `! ${repo}: ${error.stderr?.trim() || error.message}`);
      continue;
    }
    let mine = 0;
    for (const chunk of log.split('\x01').slice(1)) {
      const [header, ...files] = chunk.trim().split('\n');
      const [hash, date] = header.split(' ');
      if (seen.has(hash)) continue;
      seen.add(hash);
      mine++;
      if (!firstCommit || date < firstCommit) firstCommit = date;
      for (const row of files) {
        const [added, , path] = row.split('\t');
        const language = path && /^\d+$/.test(added) ? languageOf(currentPath(path)) : null;
        if (language) lines.set(language, (lines.get(language) ?? 0) + Number(added));
      }
    }
    if (mine) repositories++;
    console.log(`✓ ${mine} commits`);
  }

  const languages = [...lines].map(([name, count]) => ({ name, lines: count })).sort((a, b) => b.lines - a.lines);
  const stats = {
    updatedAt: new Date().toISOString().slice(0, 10),
    firstCommit,
    commits: seen.size,
    repositories,
    linesWritten: languages.reduce((sum, language) => sum + language.lines, 0),
    languages,
  };

  const previous = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : null;
  if (previous && JSON.stringify({ ...previous, updatedAt: null }) === JSON.stringify({ ...stats, updatedAt: null })) {
    console.log('Sem mudanças nos números.');
    return;
  }
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(stats, null, 2)}\n`);
  console.log(`${stats.commits} commits · ${stats.repositories} repositórios · ${stats.linesWritten} linhas`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
