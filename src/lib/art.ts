// Original flat-cartoon illustrations (inline SVG strings) for the post-calamity theme.
// Palette: navy #051332, orange #e58840, flood blue, hazard yellow/black.

const ORANGE = '#e58840';
const NAVY = '#051332';
const STYLE = 'style="width:100%;height:auto;display:block"';

interface PersonOpts {
  x: number;
  y: number; // feet position
  shirt: string;
  skin?: string;
  hair?: string;
  hat?: boolean;
  vest?: boolean;
  wave?: boolean;
  thumbs?: boolean;
  worried?: boolean;
  scale?: number;
}

function person(o: PersonOpts): string {
  const skin = o.skin ?? '#f1c27d';
  const hair = o.hair ?? '#2b1b12';
  const s = o.scale ?? 1;
  const mouth = o.worried ? 'M-4 -54.5 q4 -4 8 0' : 'M-4 -57 q4 4.5 8 0';
  const hand = o.wave ? [24, -66] : o.thumbs ? [22, -52] : [18, -24];
  const brow = o.worried
    ? `<path d="M-7 -66 l5 -2 M7 -66 l-5 -2" stroke="#1a1a1a" stroke-width="1.3" stroke-linecap="round"/>`
    : '';
  const thumb = o.thumbs ? `<rect x="20.6" y="-59.5" width="3.2" height="7" rx="1.6" fill="${skin}"/>` : '';
  const vest = o.vest
    ? `<rect x="-11" y="-39" width="22" height="3.2" fill="#ffffff" opacity=".92"/><rect x="-11" y="-31" width="22" height="3.2" fill="#ffffff" opacity=".92"/>`
    : '';
  const head = o.hat
    ? `<path d="M-13 -63 a13 13 0 0 1 26 0z" fill="#f5b82e"/><rect x="-15.5" y="-64" width="31" height="4" rx="2" fill="#e0a21c"/>`
    : `<path d="M-11.5 -61 a11.5 11.5 0 0 1 23 0 q-11.5 -7 -23 0z" fill="${hair}"/>`;
  return `<g transform="translate(${o.x} ${o.y}) scale(${s})">
    <ellipse cx="0" cy="1" rx="17" ry="3" fill="#000" opacity=".25"/>
    <rect x="-9" y="-20" width="7" height="20" rx="3" fill="#1c2b5a"/>
    <rect x="2" y="-20" width="7" height="20" rx="3" fill="#1c2b5a"/>
    <ellipse cx="-6" cy="0" rx="6" ry="2.6" fill="#0b0f1f"/><ellipse cx="6" cy="0" rx="6" ry="2.6" fill="#0b0f1f"/>
    <path d="M-10 -42 L-18 -24" stroke="${o.shirt}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="-18" cy="-23" r="3.3" fill="${skin}"/>
    <path d="M10 -42 L${hand[0]} ${hand[1] + 3}" stroke="${o.shirt}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="${hand[0]}" cy="${hand[1]}" r="3.3" fill="${skin}"/>${thumb}
    <rect x="-11" y="-48" width="22" height="30" rx="7" fill="${o.shirt}"/>${vest}
    <circle cx="0" cy="-60" r="11" fill="${skin}"/>${head}
    <circle cx="-4" cy="-60.5" r="1.5" fill="#1a1a1a"/><circle cx="4" cy="-60.5" r="1.5" fill="#1a1a1a"/>${brow}
    <path d="${mouth}" stroke="#1a1a1a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </g>`;
}

function kitShapes(): string {
  return `<rect x="22" y="4" width="20" height="12" rx="4" fill="none" stroke="#d9dde8" stroke-width="4"/>
    <rect x="4" y="12" width="56" height="40" rx="8" fill="#f7f7f9" stroke="#c7cde0" stroke-width="2"/>
    <rect x="27" y="19" width="10" height="26" rx="2" fill="#e63946"/>
    <rect x="19" y="27" width="26" height="10" rx="2" fill="#e63946"/>`;
}

export function firstAidKit(): string {
  return `<svg viewBox="0 0 64 56" ${STYLE} xmlns="http://www.w3.org/2000/svg">${kitShapes()}</svg>`;
}

function signShapes(): string {
  return `<rect x="38" y="46" width="4" height="30" fill="#aab4cc"/>
    <rect x="6" y="10" width="68" height="38" rx="5" fill="#0b0b0b" stroke="#f5b82e" stroke-width="3"/>
    <text x="40" y="25" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="11" fill="#f5b82e">ROAD</text>
    <text x="40" y="39" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="11" fill="#f5b82e">CLOSED</text>`;
}

export function roadClosedSign(): string {
  return `<svg viewBox="0 0 80 80" ${STYLE} xmlns="http://www.w3.org/2000/svg">${signShapes()}</svg>`;
}

function cloudShapes(): string {
  return `<g fill="#2a4a96"><ellipse cx="30" cy="30" rx="24" ry="14"/><ellipse cx="52" cy="26" rx="20" ry="15"/><ellipse cx="16" cy="34" rx="14" ry="9"/></g>
    <path d="M40 38 L30 56 L38 56 L32 72 L50 48 L41 48 L47 38 Z" fill="#ffd166"/>`;
}

export function stormCloud(): string {
  return `<svg viewBox="0 0 80 80" ${STYLE} xmlns="http://www.w3.org/2000/svg">${cloudShapes()}</svg>`;
}

function rain(count: number, w: number, y0: number, y1: number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = (i * 29 + 13) % w;
    const y = y0 + ((i * 47) % (y1 - y0));
    out += `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 12}"/>`;
  }
  return out;
}

export function heroScene(): string {
  return `<svg viewBox="0 0 360 240" ${STYLE} xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10306f"/><stop offset="1" stop-color="#071a45"/></linearGradient>
    <pattern id="hs-hz" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#0b0b0b"/><rect x="7" width="7" height="14" fill="#f5b82e"/></pattern>
    <clipPath id="hs-clip"><rect width="360" height="240" rx="22"/></clipPath>
  </defs>
  <g clip-path="url(#hs-clip)">
    <rect width="360" height="240" fill="url(#hs-sky)"/>
    <g fill="#244a9c" opacity=".9"><ellipse cx="62" cy="46" rx="50" ry="22"/><ellipse cx="104" cy="38" rx="40" ry="24"/><ellipse cx="30" cy="56" rx="30" ry="16"/></g>
    <g fill="#1b3a82"><ellipse cx="272" cy="34" rx="56" ry="22"/><ellipse cx="318" cy="46" rx="38" ry="18"/><ellipse cx="228" cy="46" rx="32" ry="15"/></g>
    <path d="M160 52 L140 92 L157 92 L146 128 L178 82 L160 82 L171 52 Z" fill="#ffd166"/>
    <g stroke="#7fb2ff" stroke-width="2" stroke-linecap="round" opacity=".5">${rain(24, 360, 62, 165)}</g>

    <!-- damaged house -->
    <rect x="64" y="122" width="112" height="78" fill="#ead6b4"/>
    <polygon points="54,126 120,70 186,126" fill="#b8572b"/>
    <polygon points="114,86 140,80 152,102 126,112" fill="#2a1710"/>
    <polygon points="196,86 214,78 222,92 204,100" fill="#b8572b" transform="rotate(14 205 90)"/>
    <path d="M86 98 l8 8 M80 110 l10 6" stroke="#8c3f1d" stroke-width="3" stroke-linecap="round"/>
    <rect x="80" y="140" width="30" height="28" rx="2" fill="#a8d4ff" stroke="#6a4a2a" stroke-width="3"/>
    <path d="M95 140 v28 M80 154 h30 M84 144 l10 14" stroke="#6a4a2a" stroke-width="2"/>
    <rect x="132" y="150" width="28" height="50" rx="2" fill="#7a4a2b"/>
    <circle cx="154" cy="176" r="2" fill="#f5b82e"/>

    <!-- flood water -->
    <path d="M0 192 Q22 183 44 192 T88 192 T132 192 T176 192 T220 192 T264 192 T308 192 T352 192 T396 192 V240 H0 Z" fill="#1f63b8" opacity=".92"/>
    <path d="M0 206 Q22 199 44 206 T88 206 T132 206 T176 206 T220 206 T264 206 T308 206 T352 206 T396 206" fill="none" stroke="#7fb2ff" stroke-width="2" opacity=".6"/>
    <path d="M0 222 Q22 216 44 222 T88 222 T132 222 T176 222 T220 222 T264 222 T308 222 T352 222 T396 222" fill="none" stroke="#7fb2ff" stroke-width="2" opacity=".4"/>

    <!-- first aid kit on a crate -->
    <rect x="12" y="176" width="52" height="8" rx="2" fill="#7a5a34"/>
    <g transform="translate(14 140) scale(.72)">${kitShapes()}</g>

    <!-- road closed barrier -->
    <rect x="276" y="176" width="5" height="26" fill="#cfd6e6"/><rect x="338" y="176" width="5" height="26" fill="#cfd6e6"/>
    <rect x="266" y="156" width="88" height="22" rx="3" fill="url(#hs-hz)" stroke="#0b0b0b" stroke-width="2"/>
    <g transform="translate(268 84) scale(.9)">${signShapes()}</g>

    <!-- people -->
    ${person({ x: 206, y: 216, shirt: '#6aa6ff', wave: true, worried: true })}
    ${person({ x: 240, y: 216, shirt: ORANGE, hat: true, vest: true, skin: '#c98e5a' })}
    <ellipse cx="206" cy="217" rx="20" ry="3" fill="none" stroke="#9cc6ff" stroke-width="1.5" opacity=".7"/>
    <ellipse cx="240" cy="217" rx="20" ry="3" fill="none" stroke="#9cc6ff" stroke-width="1.5" opacity=".7"/>
  </g>
</svg>`;
}

export function emptyScene(): string {
  return `<svg viewBox="0 0 200 130" ${STYLE} xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(6 2) scale(.9)">${cloudShapes()}</g>
  <g transform="translate(130 74) scale(.75)">${kitShapes()}</g>
  <path d="M8 118 H192" stroke="#243b72" stroke-width="3" stroke-linecap="round"/>
  ${person({ x: 90, y: 116, shirt: ORANGE, hat: true, vest: true, skin: '#c98e5a', scale: 1.05 })}
</svg>`;
}

export function successScene(): string {
  return `<svg viewBox="0 0 200 130" ${STYLE} xmlns="http://www.w3.org/2000/svg">
  <circle cx="142" cy="52" r="30" fill="${ORANGE}"/>
  <path d="M128 52 l10 11 l19 -22" stroke="${NAVY}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8 118 H192" stroke="#243b72" stroke-width="3" stroke-linecap="round"/>
  ${person({ x: 66, y: 116, shirt: '#6aa6ff', thumbs: true, scale: 1.1 })}
</svg>`;
}

/** Row of small themed icons used as a decorative strip. */
export function iconStrip(): string {
  return `<svg viewBox="0 0 260 64" ${STYLE} xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0 0) scale(.8)">${cloudShapes()}</g>
  <g transform="translate(82 4) scale(.72)">${kitShapes()}</g>
  <g transform="translate(150 -4) scale(.78)">${signShapes()}</g>
  <g transform="translate(218 0)">${person({ x: 20, y: 62, shirt: ORANGE, hat: true, vest: true, skin: '#c98e5a', scale: 0.8 })}</g>
</svg>`;
}
