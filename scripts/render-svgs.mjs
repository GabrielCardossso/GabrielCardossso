#!/usr/bin/env node
/**
 * Gera os SVGs animados do perfil (identidade "Terminal Pixel": tema de terminal em laranja, com
 * letreiros em pixel art) a partir de profile.config.json, assets/stats.json e assets/streak.json.
 *
 * O GitHub exibe SVGs do README como <img>: sem JavaScript e sem fontes externas. Por isso tudo é
 * SMIL + fontes do sistema, os letreiros são desenhados pixel a pixel e larguras críticas usam
 * textLength. Cada animação tem valor-base final, então renderizadores sem animação mostram a peça
 * completa.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(ROOT, 'profile.config.json'), 'utf8'));
const stats = JSON.parse(readFileSync(join(ROOT, 'assets', 'stats.json'), 'utf8'));
const streakFile = join(ROOT, 'assets', 'streak.json');
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

const integer = new Intl.NumberFormat('pt-BR');
const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const round = (n) => Math.round(n * 10) / 10;
const chars = (text) => [...text].length;
const monoWidth = (text, size) => round(chars(text) * size * MONO_RATIO);
const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const fullDate = (iso) => `${shortDate(iso)}/${iso.slice(0, 4)}`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

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
  const art = `<g fill="${shadow}">${cells(shadow, offset)}</g><g>${cells(color, 0)}</g>`;
  if (!reveal) return art;

  const full = columns * size + offset;
  const steps = Array.from({ length: columns + 1 }, (_, i) => i * size);
  const keyTimes = steps.map((_, i) => (i / columns).toFixed(4)).join(';');
  return `<clipPath id="${id}"><rect x="${x}" y="${y - 2}" width="${full}" height="${7 * size + offset + 4}"><animate attributeName="width" values="${steps.join(';')}" keyTimes="${keyTimes}" calcMode="discrete" dur="${reveal}s" fill="freeze"/></rect></clipPath>
<g clip-path="url(#${id})">${art}</g>
<rect x="${x + columns * size + size}" y="${y}" width="${size}" height="${7 * size}" fill="${color}" opacity="0"><animate attributeName="x" values="${steps.map((s) => x + s).join(';')};${x + columns * size + size}" keyTimes="${keyTimes};1" calcMode="discrete" dur="${reveal + 0.01}s" fill="freeze"/><animate attributeName="opacity" values="1;1;0" keyTimes="0;.99;1" dur="${reveal}s" fill="freeze"/></rect>`;
}

/* ---------- janela de terminal ---------- */

function frame(width, height, { title, desc, bar }, body) {
  const titleBar = bar
    ? `<rect width="${width}" height="40" fill="${C.bar}"/>
<rect y="40" width="${width}" height="1" fill="${C.border}"/>
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
<linearGradient id="shine" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="640" y2="0" spreadMethod="repeat">
<stop offset="0" stop-color="${C.accent}"/><stop offset=".3" stop-color="#f2a07f"/><stop offset=".5" stop-color="#ffe6d8"/><stop offset=".7" stop-color="#f2a07f"/><stop offset="1" stop-color="${C.accent}"/>
<animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="640 0" dur="6s" repeatCount="indefinite"/>
</linearGradient>
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

// PRNG com semente: as partículas mudam de lugar só quando o código muda, não a cada geração.
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Trilha em ângulo reto com um bloco de luz correndo até um nó quadrado.
function trace(points, dur, begin) {
  const d = `M${points.map(([x, y]) => `${x} ${y}`).join(' L')}`;
  const length = points.slice(1).reduce((sum, [x, y], i) => sum + Math.abs(x - points[i][0]) + Math.abs(y - points[i][1]), 0);
  const pulse = 40;
  const [x, y] = points.at(-1);
  return `<path d="${d}" fill="none" stroke="${C.cell}" stroke-width="4" stroke-linecap="square"/>
<path d="${d}" fill="none" stroke="${C.accent}" stroke-width="4" stroke-linecap="butt" stroke-dasharray="${pulse} ${length + pulse}" stroke-dashoffset="${pulse}"><animate attributeName="stroke-dashoffset" values="${pulse};${-length}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></path>
<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${C.bg}" stroke="${C.accent}" stroke-width="2"/>
<rect x="${x - 2}" y="${y - 2}" width="4" height="4" fill="${C.flame}" opacity=".25"><animate attributeName="opacity" values=".25;.25;1;.25" keyTimes="0;.8;.92;1" calcMode="discrete" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></rect>`;
}

// Trilhas do lado esquerdo e o espelho delas no direito, com ritmos diferentes.
function circuit(leftTraces, width, seed) {
  const rnd = random(seed);
  const mirror = (points) => points.map(([x, y]) => [width - x, y]);
  return [...leftTraces, ...leftTraces.map(mirror)]
    .map((points) => {
      const dur = round(3 + rnd() * 3);
      return trace(points, dur, round(-rnd() * dur));
    })
    .join('\n');
}

// Faíscas quadradas subindo em degraus de pixel.
function particles(count, width, height, seed) {
  const rnd = random(seed);
  return Array.from({ length: count }, () => {
    const x = Math.round(20 + rnd() * (width - 40));
    const y = Math.round(60 + rnd() * (height - 100));
    const dur = round(4 + rnd() * 5);
    const begin = round(-rnd() * dur);
    const size = rnd() > 0.6 ? 4 : 3;
    const ys = Array.from({ length: 9 }, (_, i) => y - i * 5).join(';');
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${C.accent}" opacity="0"><animate attributeName="y" values="${ys}" calcMode="discrete" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;.8;0" calcMode="discrete" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></rect>`;
  }).join('\n');
}

// Linha do horizonte com um bloco varrendo de ponta a ponta.
function horizon(y, width) {
  return `<rect x="40" y="${y}" width="${width - 80}" height="2" fill="${C.border}"/>
<rect x="-60" y="${y - 1}" width="60" height="4" fill="${C.accent}"><animate attributeName="x" values="-60;${width}" dur="7s" repeatCount="indefinite"/></rect>`;
}

function header() {
  const width = 1200;
  const height = 370;
  const left = [
    [[-10, 58], [96, 58], [96, 88], [196, 88]],
    [[-10, 136], [54, 136], [54, 166], [160, 166]],
    [[-10, 214], [120, 214], [120, 244], [258, 244]],
    [[-10, 300], [80, 300], [80, 270], [178, 270]],
    [[44, 380], [44, 316], [262, 316]],
  ];
  const status = `ONLINE · ${config.location.toUpperCase()}`;
  const statusWidth = monoWidth(status, 14);
  const pill = statusWidth + 52;
  const role = config.role.toUpperCase();
  const name = config.name.toUpperCase();
  const size = Math.min(9, Math.floor(820 / (chars(name) * 6 - 1)));
  const nameX = Math.round((width - pixelWidth(name, size)) / 2);

  const body = `${circuit(left, width, 7)}
${particles(26, width, height, 42)}
<g transform="translate(${Math.round(600 - pill / 2)} 34)">
<rect x=".5" y=".5" width="${pill}" height="32" rx="4" fill="${C.bar}" stroke="${C.border}"/>
<rect x="15" y="12" width="9" height="9" fill="${C.green}"><animate attributeName="opacity" values="1;.25" calcMode="discrete" dur="1.6s" repeatCount="indefinite"/></rect>
<text x="34" y="21" class="mono" font-size="14" fill="${C.soft}" textLength="${statusWidth}">${esc(status)}</text>
</g>
${pixelText(name, { x: nameX, y: 98, size, color: 'url(#shine)' })}
<text x="300" y="214" class="mono" font-size="17" font-weight="700" textLength="600" fill="${C.soft}">${esc(role)}</text>
<rect x="470" y="234" width="260" height="2" fill="${C.border}"/>
<rect x="470" y="233" width="40" height="4" fill="${C.accent}"><animate attributeName="x" values="470;690;470" dur="5s" repeatCount="indefinite"/></rect>
<rect x="310.5" y="254.5" width="580" height="52" rx="4" fill="#121110" stroke="${C.dim}"/>
<text x="328" y="286" class="mono" font-size="18" fill="${C.accent}">&gt;</text>
${typing(config.typing, { x: 352, y: 286, size: 18 })}
${horizon(340, width)}`;

  return frame(width, height, {
    title: `${config.name} — ${config.role}`,
    desc: config.typing.join(' · '),
  }, body);
}

/* ---------- dashboard ---------- */

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

function dashboard(top) {
  const width = 1200;
  const ranked = stats.languages.slice(0, top);
  const firstRow = 132;
  const rowHeight = 56;
  const height = firstRow + (ranked.length - 1) * rowHeight + 52;
  const cells = 52;
  const max = ranked[0].lines;

  const rows = ranked.map((language, i) => {
    const y = firstRow + i * rowHeight;
    const filled = Math.max(1, Math.round((language.lines / max) * cells));
    return `<text x="48" y="${y + 6}" class="mono" font-size="17" font-weight="700" fill="${C.accent}">#${i + 1}</text>
<text x="96" y="${y + 7}" class="mono" font-size="19" font-weight="700" fill="${C.ink}">${esc(language.name)}</text>
${cellBar(filled, cells, { x: 300, y: y - 7, begin: 0.3 + i * 0.25 })}
<text x="1152" y="${y + 6}" text-anchor="end" class="mono" font-size="19" font-weight="700" fill="${C.ink}">${esc(integer.format(language.lines))}</text>`;
  });

  const body = `${particles(10, width, height, 9)}
<rect x="48" y="50" width="20" height="20" fill="${C.accent}"/>
<rect x="52" y="54" width="12" height="12" fill="${C.flame}"><animate attributeName="opacity" values="1;.2" calcMode="discrete" dur="1.4s" repeatCount="indefinite"/></rect>
<text x="82" y="70" class="mono" font-size="25" font-weight="700" fill="${C.ink}">Top ${ranked.length} linguagens</text>
<text x="1152" y="70" text-anchor="end" class="mono" font-size="14" fill="${C.muted}">linhas escritas</text>
<rect x="48" y="92" width="1104" height="2" fill="${C.border}"/>
${rows.join('\n')}`;

  return frame(width, height, {
    title: `Top ${ranked.length} linguagens de ${config.name}`,
    desc: ranked.map((l, i) => `${i + 1}. ${l.name}: ${integer.format(l.lines)} linhas`).join('; '),
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
  const width = 1200;
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

  const left = `<rect x="48" y="78" width="10" height="10" fill="${C.accent}"/>
<text x="70" y="88" class="mono" font-size="18" font-weight="700" fill="${C.ink}">Streak atual</text>
${flame(70, 124, 11, current > 0)}
${pixelText(digits, { x: 170, y: 126, size: digitSize, reveal: 0 })}
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
<text x="${width - 48}" y="${y + 12}" text-anchor="end" class="mono" font-size="14" fill="${C.muted}">${esc(`${shortDate(run.start)} → ${fullDate(run.end)}`)}</text>`;
      })
    : [`<text x="${listX + 22}" y="140" class="mono" font-size="14" fill="${C.muted}">ainda sem histórico</text>`];

  const right = `<rect x="${listX}" y="78" width="10" height="10" fill="${C.accent}"/>
<text x="${listX + 22}" y="88" class="mono" font-size="18" font-weight="700" fill="${C.ink}">Maiores streaks</text>
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
<rect x="48" y="270" width="${width - 96}" height="1" fill="${C.border}"/>
<text x="48" y="292" class="mono" font-size="13" fill="${C.muted}">últimos 30 dias</text>
<text x="${width - 48}" y="292" text-anchor="end" class="mono" font-size="13" fill="${C.muted}">${esc(`${plural(s.activeDays, 'dia ativo', 'dias ativos')} no total · vira à meia-noite (Brasília)`)}</text>
${strip}`;

  return frame(width, height, {
    title: `Streak de atividade de ${config.name}`,
    desc: `Streak atual: ${plural(current, 'dia', 'dias')}. Maior streak: ${plural(record, 'dia', 'dias')}.`,
    bar: 'streak — dias seguidos com atividade no GitHub',
  }, body);
}

/* ---------- footer ---------- */

function footer() {
  const width = 1200;
  const height = 150;
  const left = [
    [[-10, 58], [470, 58]],
    [[-10, 22], [358, 22], [358, 46], [470, 46]],
    [[-10, 96], [358, 96], [358, 70], [470, 70]],
  ];
  const word = 'OBRIGADO';
  const size = 4;
  const message = 'Bora construir algo juntos';
  const body = `${circuit(left, width, 21)}
<rect x="470.5" y="34.5" width="259" height="47" rx="4" fill="#121110" stroke="${C.accent}" stroke-width="2"><animate attributeName="stroke-opacity" values="1;.4" calcMode="discrete" dur="1.5s" repeatCount="indefinite"/></rect>
${pixelText(word, { x: Math.round(600 - pixelWidth(word, size) / 2), y: 44, size, color: 'url(#shine)' })}
<text x="600" y="126" text-anchor="middle" class="mono" font-size="16" fill="${C.soft}" textLength="${monoWidth(message, 16)}">${esc(message)}</text>`;
  return frame(width, height, { title: 'Rodapé', desc: message }, body);
}

const top = config.top ?? 5;
writeFileSync(join(ROOT, 'assets', 'header.svg'), header());
writeFileSync(join(ROOT, 'assets', 'dashboard.svg'), dashboard(top));
writeFileSync(join(ROOT, 'assets', 'streak.svg'), streakCard());
writeFileSync(join(ROOT, 'assets', 'footer.svg'), footer());
console.log('SVGs gerados em assets/.');
