#!/usr/bin/env node
/**
 * Gera os SVGs animados do perfil (identidade "Neon Circuit") a partir de profile.config.json
 * e assets/stats.json.
 *
 * O GitHub exibe SVGs do README como <img>: sem JavaScript e sem fontes externas. Por isso tudo é
 * SMIL + fontes do sistema, e larguras críticas usam textLength para não depender da fonte instalada.
 * Cada animação tem valor-base final, então renderizadores sem animação mostram a peça completa.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(ROOT, 'profile.config.json'), 'utf8'));
const stats = JSON.parse(readFileSync(join(ROOT, 'assets', 'stats.json'), 'utf8'));

const C = {
  ink: '#e6f6ff',
  inkSoft: '#9cc9ea',
  inkMuted: '#6b8bab',
  cyan: '#22d3ee',
  ice: '#a5f3fc',
  wire: '#0f3354',
  surface: '#041327',
  border: '#0e2f4f',
  track: '#0a2140',
};
const SANS = "'Segoe UI', Inter, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace";
const MONO_RATIO = 0.6; // largura de um caractere monoespaçado em relação ao font-size

const integer = new Intl.NumberFormat('pt-BR');
const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const round = (n) => Math.round(n * 10) / 10;
const chars = (text) => [...text].length;
const monoWidth = (text, size) => round(chars(text) * size * MONO_RATIO);

// PRNG com semente: as partículas mudam de lugar só quando o código muda, não a cada geração.
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- peças compartilhadas ---------- */

function frame(width, height, { title, desc }, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
<style>
.sans{font-family:${SANS}}
.mono{font-family:${MONO}}
.wire{fill:none;stroke:${C.wire};stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.pulse{fill:none;stroke:#67e8f9;stroke-width:2.6;stroke-linecap:round}
.node{fill:#020817;stroke:${C.cyan};stroke-width:2}
</style>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#020817"/><stop offset=".55" stop-color="#04122a"/><stop offset="1" stop-color="#071c3a"/>
</linearGradient>
<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
<path d="M32 0H0V32" fill="none" stroke="#38bdf8" stroke-opacity=".07"/>
</pattern>
<radialGradient id="halo"><stop offset="0" stop-color="#0ea5e9" stop-opacity=".22"/><stop offset="1" stop-color="#0ea5e9" stop-opacity="0"/></radialGradient>
<linearGradient id="sweep" x1="0" x2="1"><stop offset="0" stop-color="#67e8f9" stop-opacity="0"/><stop offset=".5" stop-color="#67e8f9"/><stop offset="1" stop-color="#67e8f9" stop-opacity="0"/></linearGradient>
<linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#1e4b75" stop-opacity="0"/><stop offset=".5" stop-color="#1e4b75"/><stop offset="1" stop-color="#1e4b75" stop-opacity="0"/></linearGradient>
<linearGradient id="shine" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="640" y2="0" spreadMethod="repeat">
<stop offset="0" stop-color="#38bdf8"/><stop offset=".3" stop-color="#a5f3fc"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".7" stop-color="#a5f3fc"/><stop offset="1" stop-color="#38bdf8"/>
<animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="640 0" dur="6s" repeatCount="indefinite"/>
</linearGradient>
<filter id="neon" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
<feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="bloom" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><feGaussianBlur stdDeviation="14"/></filter>
<clipPath id="card"><rect width="${width}" height="${height}" rx="24"/></clipPath>
</defs>
<g clip-path="url(#card)">
<rect width="${width}" height="${height}" fill="url(#bg)"/>
<rect width="${width}" height="${height}" fill="url(#grid)"/>
${body}
</g>
<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="23.5" fill="none" stroke="${C.border}"/>
</svg>
`;
}

// Trilha de circuito com um pulso de luz correndo do primeiro ao último ponto.
function trace(points, dur, begin) {
  const d = `M${points.map(([x, y]) => `${x} ${y}`).join(' L')}`;
  const length = round(points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i][0], y - points[i][1]), 0));
  const pulse = 70;
  const [x, y] = points.at(-1);
  return `<path d="${d}" class="wire"/>
<path d="${d}" class="pulse" filter="url(#neon)" stroke-dasharray="${pulse} ${length + pulse}" stroke-dashoffset="${pulse}"><animate attributeName="stroke-dashoffset" values="${pulse};${-length}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></path>
<circle cx="${x}" cy="${y}" r="5" class="node"/>
<circle cx="${x}" cy="${y}" r="2.2" fill="${C.ice}"><animate attributeName="opacity" values=".25;.25;1;.25" keyTimes="0;.8;.92;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`;
}

// Desenha as trilhas do lado esquerdo e o espelho delas no direito, com ritmos diferentes.
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

function particles(count, width, height, seed) {
  const rnd = random(seed);
  return Array.from({ length: count }, () => {
    const x = round(20 + rnd() * (width - 40));
    const y = round(50 + rnd() * (height - 90));
    const dur = round(5 + rnd() * 6);
    const begin = round(-rnd() * dur);
    return `<circle cx="${x}" cy="${y}" r="${round(0.8 + rnd() * 1.4)}" fill="#7dd3fc" opacity="0"><animate attributeName="cy" values="${y};${round(y - 40)}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`;
  }).join('\n');
}

function horizon(y, width) {
  return `<rect x="40" y="${y}" width="${width - 80}" height="1.5" fill="url(#fade)"/>
<rect x="-180" y="${y - 0.5}" width="180" height="2.5" fill="url(#sweep)"><animate attributeName="x" values="-180;${width}" dur="7s" repeatCount="indefinite"/></rect>`;
}

/* ---------- header ---------- */

// Terminal digitando: cada frase revela/apaga caractere a caractere por um clipPath discreto.
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
<text x="${x}" y="${y}" class="mono" font-size="${size}" fill="#e0f2fe" textLength="${full}" clip-path="url(#type${i})">${esc(phrase)}</text>`;
  });
  const cursor = `<rect x="${round(x + chars(phrases[0]) * cw + 3)}" y="${y - 16}" width="9" height="20" rx="1.5" fill="${C.cyan}" filter="url(#neon)"><animate attributeName="x" ${track(([, , c]) => round(x + c * cw + 3))}/><animate attributeName="opacity" values="1;0" calcMode="discrete" dur="1s" repeatCount="indefinite"/></rect>`;
  return [...lines, cursor].join('\n');
}

function header() {
  const width = 1200;
  const height = 370;
  const left = [
    [[-10, 58], [96, 58], [126, 88], [196, 88]],
    [[-10, 136], [54, 136], [84, 166], [160, 166]],
    [[-10, 214], [120, 214], [150, 244], [258, 244]],
    [[-10, 300], [80, 300], [110, 270], [178, 270]],
    [[44, 380], [44, 346], [74, 316], [262, 316]],
  ];
  const status = `ONLINE · ${config.location.toUpperCase()}`;
  const statusWidth = monoWidth(status, 14);
  const pill = statusWidth + 52;
  const role = config.role.toUpperCase();
  const name = config.name.toUpperCase();

  const body = `<ellipse cx="600" cy="170" rx="470" ry="180" fill="url(#halo)"><animate attributeName="opacity" values=".7;1;.7" dur="6s" repeatCount="indefinite"/></ellipse>
${circuit(left, width, 7)}
${particles(26, width, height, 42)}
<g transform="translate(${round(600 - pill / 2)} 34)">
<rect width="${pill}" height="32" rx="16" fill="#031426" stroke="#0e3a5c"/>
<circle cx="20" cy="16" r="4.5" fill="${C.cyan}" filter="url(#neon)"><animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/></circle>
<text x="34" y="21" class="mono" font-size="14" fill="${C.inkSoft}" textLength="${statusWidth}">${esc(status)}</text>
</g>
<text x="220" y="168" class="sans" font-size="74" font-weight="800" textLength="760" fill="#0ea5e9" filter="url(#bloom)" opacity=".55"><animate attributeName="opacity" values=".35;.7;.35" dur="4s" repeatCount="indefinite"/>${esc(name)}</text>
<text x="220" y="168" class="sans" font-size="74" font-weight="800" textLength="760" fill="url(#shine)">${esc(name)}</text>
<text x="300" y="214" class="sans" font-size="17" font-weight="600" textLength="600" fill="#bae6fd">${esc(role)}</text>
<rect x="470" y="235" width="260" height="1.5" fill="url(#fade)"/>
<rect x="470" y="234.5" width="60" height="2.5" fill="url(#sweep)"><animate attributeName="x" values="470;670;470" dur="5s" repeatCount="indefinite"/></rect>
<rect x="310" y="254" width="580" height="52" rx="12" fill="#020c1b" stroke="#0e3a5c"/>
<text x="328" y="286" class="mono" font-size="18" fill="${C.cyan}" filter="url(#neon)">❯</text>
${typing(config.typing, { x: 352, y: 286, size: 18 })}
${horizon(340, width)}
<rect y="-90" width="${width}" height="90" fill="url(#halo)" opacity=".35"><animateTransform attributeName="transform" type="translate" values="0 0;0 ${height + 90}" dur="8s" repeatCount="indefinite"/></rect>`;

  return frame(width, height, {
    title: `${config.name} — ${config.role}`,
    desc: config.typing.join(' · '),
  }, body);
}

/* ---------- dashboard ---------- */

function bar(language, index, { y, max }) {
  const x = 300;
  const track = 680;
  const width = round(Math.max(8, (language.lines / max) * track));
  const begin = round(0.3 + index * 0.12);
  const grow = `dur="${round(begin + 1.2)}s" keyTimes="0;${round(begin / (begin + 1.2))};1" calcMode="spline" keySplines="0 0 1 1;.22 1 .36 1" fill="freeze"`;
  return `<g>
<text x="48" y="${y + 6}" class="mono" font-size="17" font-weight="700" fill="${C.cyan}">#${index + 1}</text>
<text x="96" y="${y + 7}" class="sans" font-size="20" font-weight="600" fill="${C.ink}">${esc(language.name)}</text>
<rect x="${x}" y="${y - 6}" width="${track}" height="12" rx="4" fill="${C.track}"/>
<clipPath id="bar${index}"><rect x="${x}" y="${y - 6}" width="${width}" height="12" rx="4"/></clipPath>
<rect x="${x}" y="${y - 6}" width="${width}" height="12" rx="4" fill="url(#barFill)"><animate attributeName="width" values="0;0;${width}" ${grow}/></rect>
<rect x="-200" y="${y - 6}" width="120" height="12" fill="url(#sheen)" clip-path="url(#bar${index})"><animate attributeName="x" values="${x - 120};${x + width};${x + width}" keyTimes="0;.45;1" dur="5s" begin="${round(1.6 + index * 0.3)}s" repeatCount="indefinite"/></rect>
<circle cx="${x + width}" cy="${y}" r="4.5" fill="${C.ice}" filter="url(#neon)"><animate attributeName="cx" values="${x};${x};${x + width}" ${grow}/></circle>
<text x="1152" y="${y + 6}" text-anchor="end" class="sans" font-size="19" font-weight="700" fill="${C.ink}">${esc(integer.format(language.lines))}</text>
</g>`;
}

function dashboard(top) {
  const width = 1200;
  const ranked = stats.languages.slice(0, top);
  const firstRow = 132;
  const rowHeight = 56;
  const height = firstRow + (ranked.length - 1) * rowHeight + 52;

  const body = `<defs>
<linearGradient id="barFill" x1="0" x2="1"><stop offset="0" stop-color="#0369a1"/><stop offset=".6" stop-color="#0ea5e9"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient>
<linearGradient id="sheen" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
</defs>
<ellipse cx="300" cy="60" rx="520" ry="180" fill="url(#halo)" opacity=".7"/>
${particles(10, width, height, 9)}
<polygon points="48,70 68,70 68,50" fill="${C.cyan}" filter="url(#neon)"/>
<text x="82" y="70" class="sans" font-size="26" font-weight="700" fill="${C.ink}">Top ${ranked.length} linguagens</text>
<text x="1152" y="70" text-anchor="end" class="mono" font-size="14" fill="${C.inkMuted}">linhas escritas</text>
<rect x="48" y="92" width="1104" height="1" fill="${C.border}"/>
${ranked.map((language, i) => bar(language, i, { y: firstRow + i * rowHeight, max: ranked[0].lines })).join('\n')}`;

  return frame(width, height, {
    title: `Top ${ranked.length} linguagens de ${config.name}`,
    desc: ranked.map((l, i) => `${i + 1}. ${l.name}: ${integer.format(l.lines)} linhas`).join('; '),
  }, body);
}

/* ---------- footer ---------- */

function footer() {
  const width = 1200;
  const height = 150;
  const left = [
    [[-10, 58], [470, 58]],
    [[-10, 22], [346, 22], [370, 46], [470, 46]],
    [[-10, 96], [346, 96], [370, 70], [470, 70]],
  ];
  const message = 'Bora construir algo juntos';
  const body = `<ellipse cx="600" cy="58" rx="300" ry="90" fill="url(#halo)"/>
${circuit(left, width, 21)}
<rect x="470" y="34" width="260" height="48" rx="10" fill="#031024" stroke="${C.cyan}" stroke-width="1.5" filter="url(#neon)"><animate attributeName="stroke-opacity" values="1;.4;1" dur="3s" repeatCount="indefinite"/></rect>
<text x="505" y="67" class="sans" font-size="24" font-weight="800" textLength="190" fill="url(#shine)">OBRIGADO</text>
<text x="600" y="126" text-anchor="middle" class="mono" font-size="16" fill="${C.inkSoft}" textLength="${monoWidth(message, 16)}">${esc(message)}</text>`;
  return frame(width, height, { title: 'Rodapé', desc: message }, body);
}

const top = config.top ?? 5;
writeFileSync(join(ROOT, 'assets', 'header.svg'), header());
writeFileSync(join(ROOT, 'assets', 'dashboard.svg'), dashboard(top));
writeFileSync(join(ROOT, 'assets', 'footer.svg'), footer());
console.log('SVGs gerados em assets/.');
