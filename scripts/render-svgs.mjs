#!/usr/bin/env node
/**
 * Gera todas as peças do perfil (identidade "Terminal Pixel": cada seção é uma janela de terminal
 * escura com detalhes em laranja e letreiros em pixel art) a partir de profile.config.json,
 * assets/stats.json e assets/streak.json.
 *
 * O GitHub exibe SVGs do README como <img>: sem JavaScript, sem fontes externas e sem carregar
 * imagens de fora. Por isso tudo é SMIL + fontes do sistema, os letreiros são desenhados pixel a
 * pixel e os logos de assets/logos entram embutidos como data URI. Cada animação tem valor-base
 * final, então renderizadores sem animação mostram a peça completa.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const config = JSON.parse(readFileSync(join(ROOT, 'profile.config.json'), 'utf8'));
const stats = JSON.parse(readFileSync(join(ASSETS, 'stats.json'), 'utf8'));
const streakFile = join(ASSETS, 'streak.json');
const streak = existsSync(streakFile) ? JSON.parse(readFileSync(streakFile, 'utf8')) : null;

const C = {
  bg: '#191817',
  bar: '#262422',
  border: '#3a3733',
  ink: '#ece9e4',
  soft: '#b7b2aa',
  muted: '#86817a',
  dim: '#5c5852',
  cell: '#2d2a27',
  accent: '#d97757',
  accentDeep: '#7c3f2a',
  flame: '#f2c46d',
  green: '#7cc47f',
};
const MONO = "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'DejaVu Sans Mono', 'Courier New', monospace";
const MONO_RATIO = 0.6; // largura de um caractere monoespaçado em relação ao font-size
const WIDTH = 1200;

const integer = new Intl.NumberFormat('pt-BR');
const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const round = (n) => Math.round(n * 10) / 10;
const chars = (text) => [...text].length;
const monoWidth = (text, size) => round(chars(text) * size * MONO_RATIO);
const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const fullDate = (iso) => `${shortDate(iso)}/${iso.slice(0, 4)}`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const save = (file, svg) => writeFileSync(join(ASSETS, file), svg);

const logo = (name) => `data:image/svg+xml;base64,${readFileSync(join(ASSETS, 'logos', `${name}.svg`)).toString('base64')}`;

/* ---------- fonte pixel 5x7 ---------- */

const GLYPHS = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '#####|..#..|..#..|..#..|..#..|..#..|#####',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '.###.|#....|#....|####.|#...#|#...#|.###.',
  7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|....#|.###.',
};
const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// Pixels acesos de um texto: [coluna, linha]. Cada letra ocupa 5 colunas + 1 de espaço.
function pixelsOf(text) {
  const pixels = [];
  [...plain(text)].forEach((char, index) => {
    const rows = GLYPHS[char]?.split('|');
    rows?.forEach((row, y) => [...row].forEach((bit, x) => bit === '#' && pixels.push([index * 6 + x, y])));
  });
  return { pixels, columns: chars(text) * 6 - 1 };
}

const pixelWidth = (text, size) => (chars(text) * 6 - 1) * size;

/**
 * Letreiro pixelado com sombra deslocada. Com `reveal`, as colunas acendem da esquerda para a
 * direita (uma vez só) e um cursor-bloco corre na frente.
 */
function pixelText(text, { x, y, size, color = C.accent, shadow = C.accentDeep, reveal = 0, id }) {
  const { pixels, columns } = pixelsOf(text);
  const gap = size >= 6 ? 1 : 0;
  const cells = (fill, dx) =>
    pixels.map(([cx, cy]) => `<rect x="${x + cx * size + dx}" y="${y + cy * size + dx}" width="${size - gap}" height="${size - gap}" fill="${fill}"/>`).join('');
  const offset = Math.max(2, Math.round(size / 3));
  const art = `<g>${cells(shadow, offset)}</g><g>${cells(color, 0)}</g>`;
  if (!reveal) return art;

  const full = columns * size + offset;
  const steps = Array.from({ length: columns + 1 }, (_, i) => i * size);
  const keyTimes = steps.map((_, i) => (i / columns).toFixed(4)).join(';');
  return `<clipPath id="${id}"><rect x="${x}" y="${y - 2}" width="${full}" height="${7 * size + offset + 4}"><animate attributeName="width" values="${steps.join(';')}" keyTimes="${keyTimes}" calcMode="discrete" dur="${reveal}s" fill="freeze"/></rect></clipPath>
<g clip-path="url(#${id})">${art}</g>
<rect x="${x + columns * size + size}" y="${y}" width="${size}" height="${7 * size}" fill="${color}" opacity="0"><animate attributeName="x" values="${steps.map((s) => x + s).join(';')};${x + columns * size + size}" keyTimes="${keyTimes};1" calcMode="discrete" dur="${reveal + 0.01}s" fill="freeze"/><animate attributeName="opacity" values="1;1;0" keyTimes="0;.99;1" dur="${reveal}s" fill="freeze"/></rect>`;
}

/* ---------- janela de terminal ---------- */

const BAR = 40; // altura da barra de título

function frame(width, height, { title, desc, bar }, body) {
  const titleBar = bar
    ? `<rect width="${width}" height="${BAR}" fill="${C.bar}"/>
<rect y="${BAR}" width="${width}" height="1" fill="${C.border}"/>
<rect x="20" y="14" width="12" height="12" fill="#e5534b"/>
<rect x="40" y="14" width="12" height="12" fill="#e0a43b"/>
<rect x="60" y="14" width="12" height="12" fill="#5fb85f"/>
<text x="${width / 2}" y="25" text-anchor="middle" class="mono" font-size="14" fill="${C.muted}">${esc(bar)}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" shape-rendering="crispEdges">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
<style>
.mono{font-family:${MONO}}
text{shape-rendering:auto}
</style>
<defs>
<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#ffffff" opacity=".06"/></pattern>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".22"/></pattern>
<clipPath id="card"><rect width="${width}" height="${height}" rx="10"/></clipPath>
</defs>
<g clip-path="url(#card)">
<rect width="${width}" height="${height}" fill="${C.bg}"/>
<rect width="${width}" height="${height}" fill="url(#grid)"/>
${titleBar}
${body}
<rect width="${width}" height="${height}" fill="url(#scan)"/>
</g>
<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="9.5" fill="none" stroke="${C.border}"/>
</svg>
`;
}

// Título de seção dentro da janela: quadradinho laranja + texto, como na streak.
function heading(x, y, text) {
  return `<rect x="${x}" y="${y - 10}" width="10" height="10" fill="${C.accent}"/>
<text x="${x + 22}" y="${y}" class="mono" font-size="18" font-weight="700" fill="${C.ink}">${esc(text)}</text>`;
}

const CELL = 10;
const CELL_GAP = 3;

// Barra de blocos: as células acendem em sequência, como uma barra de progresso de terminal.
function cellBar(filled, total, { x, y, begin, color = C.accent }) {
  return Array.from({ length: total }, (_, i) => {
    const cx = x + i * (CELL + CELL_GAP);
    if (i >= filled) return `<rect x="${cx}" y="${y}" width="${CELL}" height="${CELL + 4}" fill="${C.cell}"/>`;
    const at = round(begin + i * 0.025);
    return `<rect x="${cx}" y="${y}" width="${CELL}" height="${CELL + 4}" fill="${color}"><animate attributeName="fill" values="${C.cell};${C.cell};${color}" keyTimes="0;${(at / (at + 0.05)).toFixed(3)};1" dur="${round(at + 0.05)}s" fill="freeze"/></rect>`;
  }).join('');
}

// Texto com **negrito** quebrado em linhas de até `max` caracteres.
function wrap(text, max) {
  const words = text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .flatMap((part) => {
      const bold = part.startsWith('**');
      return part.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).map((word) => ({ word, bold }));
    });
  const lines = [[]];
  let length = 0;
  for (const token of words) {
    if (length && length + 1 + chars(token.word) > max) {
      lines.push([]);
      length = 0;
    }
    lines.at(-1).push(token);
    length += (length ? 1 : 0) + chars(token.word);
  }
  return lines;
}

function richLine(tokens, { x, y, size, color = C.soft }) {
  const spans = tokens
    .map(({ word, bold }, i) => {
      const text = `${i ? ' ' : ''}${word}`;
      return bold ? `<tspan font-weight="700" fill="${C.ink}">${esc(text)}</tspan>` : esc(text);
    })
    .join('');
  return `<text x="${x}" y="${y}" class="mono" font-size="${size}" fill="${color}" xml:space="preserve">${spans}</text>`;
}

/* ---------- header ---------- */

// Prompt digitando: cada frase revela/apaga caractere a caractere por um clipPath discreto.
function typing(phrases, { x, y, size }) {
  const cw = size * MONO_RATIO;
  const frames = [];
  let t = 0;
  phrases.forEach((phrase, index) => {
    const n = chars(phrase);
    for (let c = 0; c <= n; c++) {
      frames.push([t, index, c]);
      t += c < n ? 0.055 : 2.4;
    }
    for (let c = n - 2; c > 0; c -= 2) {
      frames.push([t, index, c]);
      t += 0.02;
    }
    frames.push([t, index, 0]);
    t += 0.4;
  });
  const track = (valueOf) => {
    const keyTimes = [];
    const values = [];
    for (const step of frames) {
      const value = valueOf(step);
      if (values.at(-1) === value) continue;
      keyTimes.push((step[0] / t).toFixed(5));
      values.push(value);
    }
    return `calcMode="discrete" dur="${t.toFixed(3)}s" repeatCount="indefinite" keyTimes="${keyTimes.join(';')}" values="${values.join(';')}"`;
  };
  const lines = phrases.map((phrase, i) => {
    const full = round(chars(phrase) * cw);
    return `<clipPath id="type${i}"><rect x="${x}" y="${y - 20}" height="28" width="${i === 0 ? full : 0}"><animate attributeName="width" ${track(([, index, c]) => (index === i ? round(c * cw) : 0))}/></rect></clipPath>
<text x="${x}" y="${y}" class="mono" font-size="${size}" fill="${C.ink}" textLength="${full}" clip-path="url(#type${i})">${esc(phrase)}</text>`;
  });
  const cursor = `<rect x="${round(x + chars(phrases[0]) * cw + 2)}" y="${y - 15}" width="${round(cw)}" height="20" fill="${C.ink}"><animate attributeName="x" ${track(([, , c]) => round(x + c * cw + 2))}/><animate attributeName="opacity" values="1;0" calcMode="discrete" dur="1s" repeatCount="indefinite"/></rect>`;
  return [...lines, cursor].join('\n');
}

function header() {
  const height = 330;
  const name = config.name.toUpperCase();
  const size = Math.min(11, Math.floor(980 / (chars(name) * 6 - 1)));
  const nameX = Math.round((WIDTH - pixelWidth(name, size)) / 2);
  const nameY = 100;
  const status = `online · ${config.location}`;
  const statusX = Math.round(WIDTH / 2 - (monoWidth(status, 14) + 18) / 2);
  const role = `── ${config.role} ──`;
  const roleY = nameY + 7 * size + 40;
  const box = 760;
  const boxX = (WIDTH - box) / 2;

  const body = `<rect x="${statusX}" y="65" width="9" height="9" fill="${C.green}"><animate attributeName="opacity" values="1;.2" calcMode="discrete" dur="1.2s" repeatCount="indefinite"/></rect>
<text x="${statusX + 18}" y="75" class="mono" font-size="14" fill="${C.green}">${esc(status)}</text>
${pixelText(name, { x: nameX, y: nameY, size, reveal: 1.6, id: 'name' })}
<text x="${WIDTH / 2}" y="${roleY}" text-anchor="middle" class="mono" font-size="17" fill="${C.soft}" textLength="${monoWidth(role, 17)}">${esc(role)}</text>
<rect x="${boxX + 0.5}" y="${roleY + 22.5}" width="${box}" height="48" rx="6" fill="#121110" stroke="${C.dim}"/>
<text x="${boxX + 20}" y="${roleY + 53}" class="mono" font-size="18" fill="${C.accent}">&gt;</text>
${typing(config.typing, { x: boxX + 44, y: roleY + 53, size: 18 })}`;

  return frame(WIDTH, height, {
    title: `${config.name} — ${config.role}`,
    desc: config.typing.join(' · '),
    bar: `${config.user.toLowerCase()}@github: ~/perfil`,
  }, body);
}

/* ---------- sobre mim ---------- */

function about() {
  const size = 16;
  const lineHeight = 27;
  const paragraph = wrap(config.about, Math.floor((WIDTH - 140) / (size * MONO_RATIO)));
  const top = 122;
  const listTop = top + paragraph.length * lineHeight + 34;
  const height = listTop + (config.highlights.length - 1) * 30 + 36;

  const text = paragraph.map((tokens, i) => richLine(tokens, { x: 70, y: top + i * lineHeight, size })).join('\n');
  const list = config.highlights
    .map((item, i) => {
      const y = listTop + i * 30;
      return `<rect x="72" y="${y - 9}" width="7" height="7" fill="${C.accent}"/>
${richLine(wrap(item, 200)[0], { x: 92, y, size: 15 })}`;
    })
    .join('\n');

  const body = `${heading(48, 88, 'Sobre mim')}
${text}
<rect x="48" y="${listTop - 30}" width="${WIDTH - 96}" height="1" fill="${C.border}"/>
${list}`;

  return frame(WIDTH, height, {
    title: `Sobre ${config.name}`,
    desc: config.about.replace(/\*\*/g, ''),
    bar: 'sobre-mim.md',
  }, body);
}

// Botão de link (projetos e contatos): janelinha com ícone (ou quadradinho), nome e seta.
function tile({ width, height, title, subtitle, icon }) {
  const titleY = subtitle ? height / 2 - 4 : height / 2 + 6;
  const marker = icon
    ? `<image href="${logo(icon)}" x="22" y="${height / 2 - 12}" width="24" height="24"/>`
    : `<rect x="24" y="${titleY - 10}" width="10" height="10" fill="${C.accent}"/>`;
  const textX = icon ? 60 : 46;
  const body = `${marker}
<text x="${textX}" y="${titleY}" class="mono" font-size="17" font-weight="700" fill="${C.ink}">${esc(title)}</text>
${subtitle ? `<text x="${textX}" y="${titleY + 24}" class="mono" font-size="14" fill="${C.muted}">${esc(subtitle)}</text>` : ''}
<text x="${width - 22}" y="${height / 2 + 6}" text-anchor="end" class="mono" font-size="18" fill="${C.accent}">↗</text>`;
  return frame(width, height, { title, desc: subtitle ?? title }, body);
}

/* ---------- stack ---------- */

function stack() {
  const tileSize = 48;
  const step = tileSize + 12;
  const rowHeight = 64;
  const top = 116;
  const half = Math.ceil(config.stack.length / 2);
  const columns = [config.stack.slice(0, half), config.stack.slice(half)];
  const height = top + half * rowHeight + 12;
  let order = 0;

  const rows = columns.flatMap((groups, col) => {
    const baseX = 48 + col * 576;
    return groups.map((group, row) => {
      const y = top + row * rowHeight;
      const tiles = group.items.map(([file, label], i) => {
        const x = baseX + 140 + i * step;
        const begin = round(0.2 + order++ * 0.05);
        return `<g><animate attributeName="opacity" values="0;0;1" keyTimes="0;${(begin / (begin + 0.01)).toFixed(3)};1" dur="${round(begin + 0.01)}s" fill="freeze"/>
<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" rx="4" fill="${C.cell}"/>
<image href="${logo(file)}" x="${x + 9}" y="${y + 9}" width="30" height="30"/>
</g>`;
      });
      return `<text x="${baseX}" y="${y + 30}" class="mono" font-size="15" font-weight="700" fill="${C.soft}">${esc(group.label)}</text>
${tiles.join('\n')}`;
    });
  });

  const body = `${heading(48, 88, 'Stack')}
<rect x="600" y="${top}" width="1" height="${half * rowHeight - 16}" fill="${C.border}"/>
${rows.join('\n')}`;

  return frame(WIDTH, height, {
    title: 'Stack',
    desc: config.stack.map((group) => `${group.label}: ${group.items.map(([, label]) => label).join(', ')}`).join('; '),
    bar: 'stack — ferramentas do dia a dia',
  }, body);
}

/* ---------- code dna ---------- */

function dashboard(top) {
  const ranked = stats.languages.slice(0, top);
  const firstRow = 150;
  const rowHeight = 50;
  const height = firstRow + ranked.length * rowHeight + 20;
  const cells = 52;
  const max = ranked[0].lines;
  const summary = `${integer.format(stats.commits)} commits · ${plural(stats.repositories, 'repositório', 'repositórios')} · ${integer.format(stats.linesWritten)} linhas`;

  const rows = ranked.map((language, i) => {
    const y = firstRow + i * rowHeight;
    const filled = Math.max(1, Math.round((language.lines / max) * cells));
    return `<text x="70" y="${y + 12}" class="mono" font-size="16" font-weight="700" fill="${i === 0 ? C.accent : C.muted}">#${i + 1}</text>
<text x="118" y="${y + 12}" class="mono" font-size="18" fill="${C.ink}">${esc(language.name)}</text>
${cellBar(filled, cells, { x: 320, y: y - 2, begin: 0.3 + i * 0.25 })}
<text x="1152" y="${y + 12}" text-anchor="end" class="mono" font-size="18" font-weight="700" fill="${C.ink}">${esc(integer.format(language.lines))}</text>`;
  });

  const body = `${heading(48, 88, `Top ${ranked.length} linguagens`)}
<text x="1152" y="88" text-anchor="end" class="mono" font-size="14" fill="${C.muted}">linhas escritas</text>
<text x="70" y="116" class="mono" font-size="14" fill="${C.muted}">⎿  linhas que escrevi nos meus commits · ${esc(summary)}</text>
${rows.join('\n')}`;

  return frame(WIDTH, height, {
    title: `Top ${ranked.length} linguagens de ${config.name}`,
    desc: ranked.map((l, i) => `${i + 1}. ${l.name}: ${integer.format(l.lines)} linhas`).join('; '),
    bar: 'code-dna — linhas escritas por linguagem',
  }, body);
}

/* ---------- streak ---------- */

const FLAME = ['..o....', '..oo...', '.oooo.o', '.oyoooo', 'ooyyooo', 'oyyyyoo', 'oyyyyyo', '.ooooo.'];

function flame(x, y, size, lit) {
  const outer = lit ? C.accent : C.dim;
  const inner = lit ? C.flame : C.cell;
  const cells = FLAME.flatMap((row, cy) =>
    [...row].map((bit, cx) => (bit === '.' ? '' : `<rect x="${x + cx * size}" y="${y + cy * size}" width="${size}" height="${size}" fill="${bit === 'o' ? outer : inner}"/>`)),
  ).join('');
  if (!lit) return cells;
  // Tremulação: a chama "respira" alternando a altura em degraus de pixel.
  return `<g>${cells}<animateTransform attributeName="transform" type="translate" values="0 0;0 -${size / 2};0 0" calcMode="discrete" dur=".9s" repeatCount="indefinite"/></g>`;
}

function streakCard() {
  const height = 400;
  const s = streak ?? { current: { days: 0 }, longest: [], activeDays: 0, recent: [], activeToday: false };
  const current = s.current.days;
  const record = s.longest[0]?.days ?? 0;
  const isRecord = current > 0 && current >= record;
  const digits = String(current);
  const digitSize = 11;

  const status = !current
    ? ['nenhuma streak ativa — um commit hoje começa uma nova', C.muted]
    : s.activeToday
      ? [`✓ hoje já contou · desde ${shortDate(s.current.start)}`, C.green]
      : [`! hoje ainda sem atividade — até 23:59 pra não zerar`, C.flame];

  const left = `${heading(48, 88, 'Streak atual')}
${flame(70, 124, 11, current > 0)}
${pixelText(digits, { x: 170, y: 126, size: digitSize })}
<text x="${170 + pixelWidth(digits, digitSize) + 24}" y="${126 + 7 * digitSize}" class="mono" font-size="22" fill="${C.soft}">${current === 1 ? 'dia' : 'dias'}</text>
${isRecord ? `<text x="${170 + pixelWidth(digits, digitSize) + 24}" y="${126 + 7 * digitSize - 36}" class="mono" font-size="14" font-weight="700" fill="${C.flame}">★ recorde!<animate attributeName="opacity" values="1;.3;1" calcMode="discrete" dur="1s" repeatCount="indefinite"/></text>` : ''}
<text x="70" y="248" class="mono" font-size="14" fill="${status[1]}">${esc(status[0])}</text>`;

  const listX = 660;
  const rankRows = s.longest.length
    ? s.longest.map((run, i) => {
        const y = 128 + i * 44;
        const color = i === 0 ? C.accent : C.muted;
        const bar = Math.max(1, Math.round((run.days / record) * 14));
        return `<text x="${listX + 22}" y="${y + 12}" class="mono" font-size="16" font-weight="700" fill="${color}">#${i + 1}</text>
${cellBar(bar, 14, { x: listX + 70, y: y - 2, begin: 0.3 + i * 0.2, color: i === 0 ? C.accent : C.soft })}
<text x="${listX + 270}" y="${y + 12}" class="mono" font-size="17" font-weight="700" fill="${C.ink}">${esc(plural(run.days, 'dia', 'dias'))}</text>
<text x="${WIDTH - 48}" y="${y + 12}" text-anchor="end" class="mono" font-size="14" fill="${C.muted}">${esc(`${shortDate(run.start)} → ${fullDate(run.end)}`)}</text>`;
      })
    : [`<text x="${listX + 22}" y="140" class="mono" font-size="14" fill="${C.muted}">ainda sem histórico</text>`];

  const right = `${heading(listX, 88, 'Maiores streaks')}
${rankRows.join('\n')}`;

  const stripY = 300;
  const box = 30;
  const step = 36;
  const strip = s.recent
    .map((day, i) => {
      const x = 48 + i * step;
      const isToday = i === s.recent.length - 1;
      const fill = day.active ? C.accent : C.cell;
      const outline = isToday ? `<rect x="${x - 3.5}" y="${stripY - 3.5}" width="${box + 7}" height="${box + 7}" fill="none" stroke="${C.ink}"><animate attributeName="stroke-opacity" values="1;.2;1" calcMode="discrete" dur="1s" repeatCount="indefinite"/></rect>` : '';
      return `${outline}<rect x="${x}" y="${stripY}" width="${box}" height="${box}" fill="${fill}"><title>${fullDate(day.date)}${day.active ? ' · ativo' : ''}</title></rect>`;
    })
    .join('');

  const body = `${left}
<rect x="620" y="70" width="1" height="190" fill="${C.border}"/>
${right}
<rect x="48" y="270" width="${WIDTH - 96}" height="1" fill="${C.border}"/>
<text x="48" y="292" class="mono" font-size="13" fill="${C.muted}">últimos 30 dias</text>
<text x="${WIDTH - 48}" y="292" text-anchor="end" class="mono" font-size="13" fill="${C.muted}">${esc(`${plural(s.activeDays, 'dia ativo', 'dias ativos')} no total · vira à meia-noite (Brasília)`)}</text>
${strip}`;

  return frame(WIDTH, height, {
    title: `Streak de atividade de ${config.name}`,
    desc: `Streak atual: ${plural(current, 'dia', 'dias')}. Maior streak: ${plural(record, 'dia', 'dias')}.`,
    bar: 'streak — dias seguidos com atividade no GitHub',
  }, body);
}

/* ---------- contribuições, contato e rodapé ---------- */

const note = (text) => `<text x="${WIDTH - 48}" y="88" text-anchor="end" class="mono" font-size="14" fill="${C.muted}">${esc(text)}</text>`;

/**
 * Card da cobrinha. O SVG gerado pelo Platane/snk (assets/snake.svg) entra embutido como um <svg>
 * filho, porque o GitHub não deixa um SVG carregar outra imagem. As animações dele são CSS e
 * continuam rodando dentro do card.
 */
function contributions() {
  const file = join(ASSETS, 'snake.svg');
  const snake = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const viewBox = snake.match(/viewBox="([^"]+)"/)?.[1];
  const [, , w, h] = (viewBox ?? '0 0 880 192').split(/\s+/).map(Number);
  const width = WIDTH - 96;
  const height = Math.round((width * h) / w);
  const inner = viewBox
    ? snake.replace(/^[\s\S]*?<svg[^>]*>/, `<svg x="48" y="112" width="${width}" height="${height}" viewBox="${viewBox}">`)
    : `<text x="70" y="150" class="mono" font-size="14" fill="${C.muted}">a cobrinha aparece na próxima atualização</text>`;
  const body = `${heading(48, 88, 'Contribuições')}
${note('a cobrinha come os dias com commit')}
${inner}`;
  return frame(WIDTH, 112 + height + 20, {
    title: 'Contribuições',
    desc: 'Cobrinha percorrendo o gráfico de contribuições do último ano',
    bar: 'contribuicoes — último ano',
  }, body);
}

/**
 * Card de contato, fatiado em colunas: cada fatia é o mesmo desenho com um viewBox diferente,
 * para que no README cada uma vire um link e, coladas, pareçam um card só.
 */
function contactSlices() {
  const count = config.contacts.length;
  const slice = WIDTH / count;
  const height = 200;
  const buttons = config.contacts.map((contact, i) => {
    const x = i * slice + 24;
    const w = slice - 48;
    return `<rect x="${x + 0.5}" y="112.5" width="${w}" height="60" rx="6" fill="${C.bar}" stroke="${C.border}"/>
<image href="${logo(contact.name)}" x="${x + 24}" y="130" width="24" height="24"/>
<text x="${x + 62}" y="148" class="mono" font-size="17" font-weight="700" fill="${C.ink}">${esc(contact.label)}</text>
<text x="${x + w - 20}" y="148" text-anchor="end" class="mono" font-size="18" fill="${C.accent}">↗</text>`;
  });
  const body = `${heading(48, 88, 'Contato')}
${note('clique num botão')}
${buttons.join('\n')}`;
  const full = frame(WIDTH, height, { title: 'Contato', desc: 'Contato', bar: 'contato' }, body);
  return config.contacts.map((contact, i) =>
    full
      .replace(/width="1200" height="200" viewBox="0 0 1200 200"/, `width="${slice}" height="${height}" viewBox="${i * slice} 0 ${slice} ${height}"`)
      .replace(/<title id="title">[^<]*<\/title>/, `<title id="title">${esc(contact.label)}</title>`),
  );
}

function footer() {
  const height = 210;
  const word = 'OBRIGADO';
  const size = 7;
  const message = 'Bora construir algo juntos.';
  const wordY = 96;
  const messageY = wordY + 7 * size + 44;
  const body = `<text x="40" y="76" class="mono" font-size="15" fill="${C.accent}">&gt;</text>
<text x="62" y="76" class="mono" font-size="15" fill="${C.ink}">/exit</text>
${pixelText(word, { x: Math.round((WIDTH - pixelWidth(word, size)) / 2), y: wordY, size, reveal: 1.2, id: 'bye' })}
<text x="${WIDTH / 2}" y="${messageY}" text-anchor="middle" class="mono" font-size="16" fill="${C.soft}" textLength="${monoWidth(message, 16)}">${esc(message)}</text>
<rect x="${round(WIDTH / 2 + monoWidth(message, 16) / 2 + 6)}" y="${messageY - 14}" width="10" height="18" fill="${C.ink}"><animate attributeName="opacity" values="1;0" calcMode="discrete" dur="1s" repeatCount="indefinite"/></rect>`;
  return frame(WIDTH, height, { title: 'Rodapé', desc: `Obrigado! ${message}`, bar: 'exit' }, body);
}

save('header.svg', header());
save('about.svg', about());
for (const project of config.projects) {
  save(`project-${project.name}.svg`, tile({ width: 590, height: 92, title: project.name, subtitle: project.description }));
}
save('stack.svg', stack());
save('dashboard.svg', dashboard(config.top ?? 5));
save('streak.svg', streakCard());
save('contributions.svg', contributions());
contactSlices().forEach((svg, i) => save(`contact-${config.contacts[i].name}.svg`, svg));
save('footer.svg', footer());
console.log('SVGs gerados em assets/.');
