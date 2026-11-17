#!/usr/bin/env node
/**
 * Calcula a streak de atividade no GitHub e grava assets/streak.json.
 *
 * Um dia conta quando tem pelo menos uma contribuição no gráfico público do perfil (commits, PRs,
 * issues, reviews...). O dia vira à meia-noite de Brasília:
 *   - teve atividade hoje → a streak inclui hoje;
 *   - ainda não teve hoje → a streak de ontem continua viva até o fim do dia;
 *   - passou um dia inteiro sem atividade → a streak zera.
 *
 * Os dados vêm da página pública https://github.com/users/<user>/contributions, que não pede token.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'assets', 'streak.json');
const TIME_ZONE = 'America/Sao_Paulo';
const config = JSON.parse(readFileSync(join(ROOT, 'profile.config.json'), 'utf8'));
const headers = { 'User-Agent': `${config.user}-profile-streak` };

const DAY = 86_400_000;
const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
const addDays = (iso, days) => new Date(toDate(iso).getTime() + days * DAY).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);
// en-CA formata como AAAA-MM-DD.
const todayIn = (timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

async function firstYear() {
  const response = await fetch(`https://api.github.com/users/${config.user}`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  return Number((await response.json()).created_at.slice(0, 4));
}

// Dias com atividade (nível > 0 no gráfico) de um ano.
async function activeDays(year) {
  const url = `https://github.com/users/${config.user}/contributions?from=${year}-01-01&to=${year}-12-31`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`contribuições ${year}: HTTP ${response.status}`);
  const html = await response.text();
  const days = new Set();
  for (const [, date, level] of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)"/g)) {
    if (level !== '0') days.add(date);
  }
  return days;
}

// Agrupa dias consecutivos em sequências { start, end, days }.
function runsOf(sortedDays) {
  const runs = [];
  for (const day of sortedDays) {
    const last = runs.at(-1);
    if (last && diffDays(last.end, day) === 1) {
      last.end = day;
      last.days++;
    } else runs.push({ start: day, end: day, days: 1 });
  }
  return runs;
}

async function main() {
  const today = todayIn(TIME_ZONE);
  const yesterday = addDays(today, -1);
  const active = new Set();
  for (let year = await firstYear(); year <= Number(today.slice(0, 4)); year++) {
    for (const day of await activeDays(year)) if (day <= today) active.add(day);
  }

  const runs = runsOf([...active].sort());
  const last = runs.at(-1);
  const alive = last && (last.end === today || last.end === yesterday);
  const longest = [...runs].sort((a, b) => b.days - a.days || b.end.localeCompare(a.end));

  const recent = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29)).map((date) => ({
    date,
    active: active.has(date),
  }));

  const streak = {
    today,
    activeToday: active.has(today),
    current: alive ? { ...last } : { start: null, end: null, days: 0 },
    longest: longest.slice(0, 3),
    activeDays: active.size,
    recent,
  };

  const previous = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
  const next = `${JSON.stringify(streak, null, 2)}\n`;
  if (previous === next) {
    console.log('Streak sem mudanças.');
    return;
  }
  writeFileSync(OUTPUT, next);
  console.log(`Streak atual: ${streak.current.days} dia(s) · maior: ${longest[0]?.days ?? 0} dia(s) · ${active.size} dias ativos`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
