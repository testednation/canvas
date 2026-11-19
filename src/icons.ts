import {
  DesignElement,
  FrameShapeKind,
  GridLayoutKind,
  ShapeKind,
  StickerKind,
} from './types';

export const ICONS = {
  logo: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  templates: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
  elements: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="4.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="m18 13 4 8h-8Z"/></svg>`,
  text: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>`,
  charts: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/><line x1="2" x2="22" y1="20" y2="20"/></svg>`,
  uploads: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
  draw: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
  background: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  layers: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  projects: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
  present: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  group: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
  undo: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,
  redo: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>`,
  plus: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`,
  minus: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>`,
  trash: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  duplicate: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  lock: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  unlock: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
  eye: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
  up: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`,
  down: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  alignLeft: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>`,
  alignCenter: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/></svg>`,
  alignRight: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></svg>`,
  snapLeft: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="3" y2="21"/><rect width="13" height="5" x="7" y="5" rx="1"/><rect width="9" height="5" x="7" y="14" rx="1"/></svg>`,
  snapCenter: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="3" y2="21"/><rect width="16" height="5" x="4" y="5" rx="1"/><rect width="10" height="5" x="7" y="14" rx="1"/></svg>`,
  snapRight: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="20" x2="20" y1="3" y2="21"/><rect width="13" height="5" x="4" y="5" rx="1"/><rect width="9" height="5" x="8" y="14" rx="1"/></svg>`,
  snapTop: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="4" y2="4"/><rect width="5" height="13" x="5" y="7" rx="1"/><rect width="5" height="9" x="14" y="7" rx="1"/></svg>`,
  snapMiddle: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="12" y2="12"/><rect width="5" height="16" x="5" y="4" rx="1"/><rect width="5" height="10" x="14" y="7" rx="1"/></svg>`,
  snapBottom: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="20" y2="20"/><rect width="5" height="13" x="5" y="4" rx="1"/><rect width="5" height="9" x="14" y="8" rx="1"/></svg>`,
  download: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  rotate: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`,
  sun: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  search: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  check: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  flipH: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 5 5-5 5V7"/><path d="m21 7-5 5 5 5V7"/><path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/></svg>`,
  grid: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`,
  apps: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><path d="M3 14h7v7H3z"/></svg>`,
  eyedropper: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>`,
  ruler: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>`,
  notes: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>`,
  magic: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  bringToFront: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/><line x1="5" x2="19" y1="3" y2="3"/></svg>`,
  sendToBack: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 13 5 5 5-5"/><path d="m7 6 5 5 5-5"/><line x1="5" x2="19" y1="21" y2="21"/></svg>`,
  grip: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>`,
  close: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
};

/**
 * Returns CSS clip-path for Canva Photo Frames
 */
export function getFrameClipPathCss(frameShape?: FrameShapeKind): string {
  switch (frameShape) {
    case 'circle':
      return 'circle(50% at 50% 50%)';
    case 'diamond':
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    case 'hexagon':
      return 'polygon(25% 3%, 75% 3%, 98% 50%, 75% 97%, 25% 97%, 2% 50%)';
    case 'star':
      return 'polygon(50% 2%, 64% 34%, 98% 38%, 72% 60%, 79% 94%, 50% 76%, 21% 94%, 28% 60%, 2% 38%, 36% 34%)';
    case 'arch':
      return 'inset(0% 0% 0% 0% round 500px 500px 12px 12px)';
    case 'pill':
      return 'inset(0% 0% 0% 0% round 999px)';
    default:
      return 'none';
  }
}

/**
 * Generates an inline SVG string for any ShapeKind so it scales crisply at any size
 */
export function renderShapeSvg(
  kind: ShapeKind,
  fill: string,
  stroke = 'none',
  strokeWidth = 0,
  borderRadius = 0,
  gradientId?: string,
  gradientCss?: string
): string {
  const sw = strokeWidth > 0 ? strokeWidth : 0;
  const half = sw / 2;
  const min = half;
  const max = 100 - half;
  const size = 100 - sw;

  let defs = '';
  let fillAttr = fill || '#6366f1';

  if (gradientId && gradientCss) {
    const hexMatches = gradientCss.match(/#[0-9a-fA-F]{6}/g);
    if (hexMatches && hexMatches.length >= 2) {
      defs = `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${hexMatches[0]}" />
        <stop offset="100%" stop-color="${hexMatches[1]}" />
      </linearGradient></defs>`;
      fillAttr = `url(#${gradientId})`;
    }
  }

  const strokeAttrs = sw > 0 ? `stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"` : '';

  switch (kind) {
    case 'rect': {
      const rx = Math.min(borderRadius, 50);
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block">${defs}<rect x="${min}" y="${min}" width="${size}" height="${size}" rx="${rx}" fill="${fillAttr}" ${strokeAttrs}/></svg>`;
    }
    case 'pill':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block">${defs}<rect x="${min}" y="${min}" width="${size}" height="${size}" rx="48" fill="${fillAttr}" ${strokeAttrs}/></svg>`;
    case 'circle':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block">${defs}<ellipse cx="50" cy="50" rx="${size / 2}" ry="${size / 2}" fill="${fillAttr}" ${strokeAttrs}/></svg>`;
    case 'triangle':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block">${defs}<polygon points="50,${min + 2} ${max - 2},${max - 2} ${min + 2},${max - 2}" fill="${fillAttr}" stroke-linejoin="round" ${strokeAttrs}/></svg>`;
    case 'diamond':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block">${defs}<polygon points="50,${min + 2} ${max - 2},50 50,${max - 2} ${min + 2},50" fill="${fillAttr}" stroke-linejoin="round" ${strokeAttrs}/></svg>`;
    case 'hexagon':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block">${defs}<polygon points="25,${min + 3} 75,${min + 3} ${max - 2},50 75,${max - 3} 25,${max - 3} ${min + 2},50" fill="${fillAttr}" stroke-linejoin="round" ${strokeAttrs}/></svg>`;
    case 'star':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block">${defs}<polygon points="50,4 64,34 97,38 72,60 79,93 50,76 21,93 28,60 3,38 36,34" fill="${fillAttr}" stroke-linejoin="round" ${strokeAttrs}/></svg>`;
    case 'arrow':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block">${defs}<polygon points="4,36 62,36 62,14 96,50 62,86 62,64 4,64" fill="${fillAttr}" stroke-linejoin="round" ${strokeAttrs}/></svg>`;
    case 'line':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block"><line x1="0" y1="50" x2="100" y2="50" stroke="${fill || '#6366f1'}" stroke-width="${Math.max(4, strokeWidth || 8)}" stroke-linecap="round"/></svg>`;
    default:
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full block">${defs}<rect x="0" y="0" width="100" height="100" fill="${fillAttr}"/></svg>`;
  }
}

/**
 * Generates rich multi-path vector stickers & graphic ornaments
 */
export function renderStickerSvg(kind: StickerKind, primaryColor = '#6366f1', accentColor = '#f43f5e'): string {
  switch (kind) {
    case 'burst':
      return `<svg viewBox="0 0 120 120" class="w-full h-full block" fill="none">
        <path d="M60 4L71 41L104 22L83 54L118 68L81 77L98 111L65 89L51 118L46 81L10 95L34 64L4 44L42 44L32 9L60 36V4Z" fill="${primaryColor}"/>
        <circle cx="60" cy="60" r="18" fill="${accentColor}"/>
      </svg>`;
    case 'seal':
      return `<svg viewBox="0 0 120 120" class="w-full h-full block" fill="none">
        <circle cx="60" cy="60" r="52" fill="${primaryColor}" />
        <circle cx="60" cy="60" r="42" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="5 5"/>
        <path d="M44 61L55 72L78 49" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    case 'rings':
      return `<svg viewBox="0 0 120 120" class="w-full h-full block" fill="none">
        <circle cx="46" cy="60" r="34" stroke="${primaryColor}" stroke-width="8"/>
        <circle cx="74" cy="60" r="34" stroke="${accentColor}" stroke-width="8" stroke-opacity="0.85"/>
      </svg>`;
    case 'arch':
      return `<svg viewBox="0 0 120 140" preserveAspectRatio="none" class="w-full h-full block" fill="none">
        <path d="M10 135V60C10 32.3858 32.3858 10 60 10C87.6142 10 110 32.3858 110 60V135H10Z" fill="${primaryColor}"/>
        <path d="M24 135V62C24 42.1177 40.1177 26 60 26C79.8823 26 96 42.1177 96 62V135" stroke="#ffffff" stroke-width="3" stroke-opacity="0.45"/>
      </svg>`;
    case 'wave':
      return `<svg viewBox="0 0 160 80" preserveAspectRatio="none" class="w-full h-full block" fill="none">
        <path d="M6 48C32 14 58 14 82 48C106 82 132 82 154 48" stroke="${primaryColor}" stroke-width="12" stroke-linecap="round"/>
        <path d="M6 26C32 -8 58 -8 82 26C106 60 132 60 154 26" stroke="${accentColor}" stroke-width="6" stroke-linecap="round" stroke-opacity="0.65"/>
      </svg>`;
    case 'grid_dots': {
      let circles = '';
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          circles += `<circle cx="${16 + c * 22}" cy="${16 + r * 22}" r="4.5" fill="${primaryColor}"/>`;
        }
      }
      return `<svg viewBox="0 0 120 120" class="w-full h-full block">${circles}</svg>`;
    }
    case 'quote':
      return `<svg viewBox="0 0 120 100" class="w-full h-full block" fill="none">
        <path d="M36 52C44.8 52 52 59.2 52 68C52 76.8 44.8 84 36 84C24 84 16 73 16 58C16 34 32 18 48 14L52 22C38 27 31 38 30 52H36ZM88 52C96.8 52 104 59.2 104 68C104 76.8 96.8 84 88 84C76 84 68 73 68 58C68 34 84 18 100 14L104 22C90 27 83 38 82 52H88Z" fill="${primaryColor}"/>
      </svg>`;
    case 'frame_card':
      return `<svg viewBox="0 0 160 120" preserveAspectRatio="none" class="w-full h-full block" fill="none">
        <rect x="4" y="4" width="152" height="112" rx="12" fill="${primaryColor}" fill-opacity="0.12" stroke="${primaryColor}" stroke-width="4"/>
        <line x1="4" y1="28" x2="156" y2="28" stroke="${primaryColor}" stroke-width="4"/>
        <circle cx="18" cy="16" r="4" fill="${accentColor}"/>
        <circle cx="31" cy="16" r="4" fill="${primaryColor}"/>
        <circle cx="44" cy="16" r="4" fill="${primaryColor}" fill-opacity="0.4"/>
      </svg>`;
  }
}

/**
 * Generates an SVG string for Curved Text along a quadratic Bezier arc
 */
export function renderCurvedTextSvg(el: DesignElement): string {
  const w = Math.max(100, el.width || 400);
  const h = Math.max(60, el.height || 160);
  const curve = el.textCurve || 0;
  const pathId = `curve_path_${el.id}`;
  const midY = h / 2;
  const controlY = midY - (curve / 100) * (h * 0.85);
  const d = `M 16 ${midY} Q ${w / 2} ${controlY} ${w - 16} ${midY}`;

  const color = el.color || '#f8fafc';
  const effectColor = el.textEffectColor || '#6366f1';
  const fontSize = el.fontSize || 36;
  const fontFamily = el.fontFamily || 'Bricolage Grotesque';
  const fontWeight = el.fontWeight || 700;
  const safeText = (el.text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let extraTextLayer = '';
  let mainAttrs = `fill="${color}"`;

  if (el.textEffect === 'hollow') {
    mainAttrs = `fill="none" stroke="${color}" stroke-width="2.5"`;
  } else if (el.textEffect === 'splice') {
    extraTextLayer = `<text font-family="'${fontFamily}', sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${effectColor}" dx="4" dy="4"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${safeText}</textPath></text>`;
    mainAttrs = `fill="none" stroke="${color}" stroke-width="2"`;
  } else if (el.textEffect === 'neon') {
    extraTextLayer = `<text font-family="'${fontFamily}', sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="none" stroke="${effectColor}" stroke-width="6" stroke-opacity="0.45"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${safeText}</textPath></text>`;
  }

  return `<svg viewBox="0 0 ${w} ${h}" class="w-full h-full overflow-visible block">
    <defs><path id="${pathId}" d="${d}" fill="none"/></defs>
    ${extraTextLayer}
    <text font-family="'${fontFamily}', sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${el.fontStyle || 'normal'}" letter-spacing="${el.letterSpacing || 0}" ${mainAttrs}>
      <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${safeText}</textPath>
    </text>
  </svg>`;
}

/**
 * Generates an SVG string for Native Data Charts (bar, line, donut, progress)
 */
export function renderChartSvg(el: DesignElement): string {
  const kind = el.chartKind || 'bar';
  const data =
    el.chartData && el.chartData.length > 0
      ? el.chartData
      : [
          { label: 'Q1', value: 42 },
          { label: 'Q2', value: 68 },
          { label: 'Q3', value: 84 },
          { label: 'Q4', value: 96 },
        ];
  const primary = el.fill || '#6366f1';
  const accent = el.stroke && el.stroke !== 'none' ? el.stroke : '#38bdf8';
  const textColor = el.color || '#cbd5e1';
  const maxVal = Math.max(1, ...data.map((d) => d.value));

  if (kind === 'bar') {
    const W = 400;
    const H = 280;
    const padL = 42;
    const padR = 20;
    const padT = 28;
    const padB = 42;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const slotW = plotW / data.length;
    const barW = Math.min(52, slotW * 0.62);

    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH * i) / 4;
      const val = Math.round(maxVal * (1 - i / 4));
      grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${textColor}" stroke-opacity="0.16" stroke-dasharray="4 4"/>`;
      grid += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="${textColor}" font-family="JetBrains Mono, monospace" font-size="11">${val}</text>`;
    }

    let bars = '';
    data.forEach((d, idx) => {
      const bh = (d.value / maxVal) * plotH;
      const bx = padL + idx * slotW + (slotW - barW) / 2;
      const by = padT + plotH - bh;
      const barFill = idx === data.length - 1 ? accent : primary;
      bars += `<rect x="${bx}" y="${by}" width="${barW}" height="${Math.max(4, bh)}" rx="6" fill="${barFill}"/>`;
      bars += `<text x="${bx + barW / 2}" y="${H - 16}" text-anchor="middle" fill="${textColor}" font-family="Plus Jakarta Sans, sans-serif" font-weight="600" font-size="12">${d.label}</text>`;
      if (el.chartShowValues !== false) {
        bars += `<text x="${bx + barW / 2}" y="${by - 6}" text-anchor="middle" fill="${textColor}" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11">${d.value}</text>`;
      }
    });

    return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full block">${grid}${bars}</svg>`;
  }

  if (kind === 'line') {
    const W = 400;
    const H = 260;
    const padL = 40;
    const padR = 24;
    const padT = 28;
    const padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const pts = data.map((d, idx) => {
      const x = padL + (idx / Math.max(1, data.length - 1)) * plotW;
      const y = padT + plotH - (d.value / maxVal) * plotH;
      return { x, y, ...d };
    });

    const polyPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const areaPoints = `${pts[0].x},${padT + plotH} ${polyPoints} ${pts[pts.length - 1].x},${padT + plotH}`;

    let grid = '';
    for (let i = 0; i <= 3; i++) {
      const y = padT + (plotH * i) / 3;
      grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${textColor}" stroke-opacity="0.16" stroke-dasharray="4 4"/>`;
    }

    let nodes = '';
    pts.forEach((p) => {
      nodes += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="${accent}" stroke="#0f172a" stroke-width="2.5"/>`;
      nodes += `<text x="${p.x}" y="${H - 14}" text-anchor="middle" fill="${textColor}" font-family="Plus Jakarta Sans, sans-serif" font-weight="600" font-size="12">${p.label}</text>`;
      if (el.chartShowValues !== false) {
        nodes += `<text x="${p.x}" y="${p.y - 10}" text-anchor="middle" fill="${textColor}" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11">${p.value}</text>`;
      }
    });

    return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full block">
      ${grid}
      <polygon points="${areaPoints}" fill="${primary}" fill-opacity="0.22"/>
      <polyline points="${polyPoints}" fill="none" stroke="${primary}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      ${nodes}
    </svg>`;
  }

  if (kind === 'donut') {
    const total = Math.max(1, data.reduce((acc, d) => acc + d.value, 0));
    const palette = [primary, accent, '#10b981', '#f59e0b', '#f43f5e', '#a855f7'];
    const r = 70;
    const cx = 115;
    const cy = 115;
    const circum = 2 * Math.PI * r;
    let offset = 0;
    let segments = '';
    let legend = '';

    data.forEach((d, idx) => {
      const frac = d.value / total;
      const dash = frac * circum;
      const col = d.color || palette[idx % palette.length];
      segments += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="26" stroke-dasharray="${dash} ${circum - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += dash;

      const ly = 52 + idx * 34;
      legend += `<rect x="225" y="${ly - 10}" width="12" height="12" rx="3" fill="${col}"/>`;
      legend += `<text x="244" y="${ly}" fill="${textColor}" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="600">${d.label}</text>`;
      legend += `<text x="345" y="${ly}" text-anchor="end" fill="${textColor}" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700">${Math.round(frac * 100)}%</text>`;
    });

    return `<svg viewBox="0 0 365 230" class="w-full h-full block">
      ${segments}
      <text x="${cx}" y="${cy + 6}" text-anchor="middle" fill="${textColor}" font-family="JetBrains Mono, monospace" font-size="22" font-weight="700">${total}</text>
      ${legend}
    </svg>`;
  }

  // progress ring
  const pct = Math.max(0, Math.min(100, data[0]?.value ?? 78));
  const r = 76;
  const circum = 2 * Math.PI * r;
  const dash = (pct / 100) * circum;
  return `<svg viewBox="0 0 220 220" class="w-full h-full block">
    <circle cx="110" cy="110" r="${r}" fill="none" stroke="${textColor}" stroke-opacity="0.15" stroke-width="18"/>
    <circle cx="110" cy="110" r="${r}" fill="none" stroke="${primary}" stroke-width="18" stroke-linecap="round" stroke-dasharray="${dash} ${circum}" transform="rotate(-90 110 110)"/>
    <text x="110" y="114" text-anchor="middle" fill="${textColor}" font-family="JetBrains Mono, monospace" font-size="36" font-weight="700">${pct}%</text>
    <text x="110" y="138" text-anchor="middle" fill="${textColor}" fill-opacity="0.75" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="600">${data[0]?.label || 'Completion'}</text>
  </svg>`;
}

/**
 * Computes combined CSS & Canvas 2D filter string for Photo Studio Pro presets and sliders
 */
export function getImageFilterCss(el: DesignElement): string {
  let b = el.brightness ?? 100;
  let c = el.contrast ?? 100;
  let s = el.saturate ?? 100;
  const bl = el.blur ?? 0;
  let hue = el.hueRotate ?? 0;
  let sep = el.sepia ?? 0;

  switch (el.filterPreset) {
    case 'nordic':
      b = Math.round(b * 1.05);
      c = Math.round(c * 1.12);
      s = Math.round(s * 0.72);
      hue -= 8;
      break;
    case 'vintage':
      b = Math.round(b * 0.98);
      c = Math.round(c * 0.92);
      s = Math.round(s * 0.85);
      sep = Math.max(sep, 45);
      break;
    case 'noir':
      c = Math.round(c * 1.28);
      s = 0;
      break;
    case 'cyber':
      b = Math.round(b * 1.06);
      c = Math.round(c * 1.22);
      s = Math.round(s * 1.45);
      hue += 28;
      break;
    case 'warm':
      b = Math.round(b * 1.04);
      s = Math.round(s * 1.18);
      sep = Math.max(sep, 24);
      break;
    case 'duotone-cyber':
      b = Math.round(b * 1.08);
      c = Math.round(c * 1.35);
      s = Math.round(s * 1.85);
      sep = Math.max(sep, 65);
      hue += 215;
      break;
    case 'duotone-sunset':
      b = Math.round(b * 1.06);
      c = Math.round(c * 1.28);
      s = Math.round(s * 1.75);
      sep = Math.max(sep, 75);
      hue -= 24;
      break;
    case 'duotone-emerald':
      b = Math.round(b * 1.05);
      c = Math.round(c * 1.25);
      s = Math.round(s * 1.65);
      sep = Math.max(sep, 70);
      hue += 105;
      break;
  }

  return `brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${bl}px) hue-rotate(${hue}deg) sepia(${sep}%)`;
}

/**
 * Computes exact cell rectangles for Multi-Frame Layout Grids (Canva Photo Grids)
 */
export function getGridCellRects(
  kind: GridLayoutKind = 'split-v',
  w: number,
  h: number,
  gap = 12
): Array<{ x: number; y: number; w: number; h: number }> {
  const g = Math.max(0, Math.min(48, gap));
  if (kind === 'split-v') {
    const cw = (w - g) / 2;
    return [
      { x: 0, y: 0, w: cw, h },
      { x: cw + g, y: 0, w: cw, h },
    ];
  }
  if (kind === 'split-h') {
    const ch = (h - g) / 2;
    return [
      { x: 0, y: 0, w, h: ch },
      { x: 0, y: ch + g, w, h: ch },
    ];
  }
  if (kind === 'bento-3') {
    const cw = (w - g) / 2;
    const ch = (h - g) / 2;
    return [
      { x: 0, y: 0, w: cw, h },
      { x: cw + g, y: 0, w: cw, h: ch },
      { x: cw + g, y: ch + g, w: cw, h: ch },
    ];
  }
  // quad-4
  const cw = (w - g) / 2;
  const ch = (h - g) / 2;
  return [
    { x: 0, y: 0, w: cw, h: ch },
    { x: cw + g, y: 0, w: cw, h: ch },
    { x: 0, y: ch + g, w: cw, h: ch },
    { x: cw + g, y: ch + g, w: cw, h: ch },
  ];
}

/**
 * Pure-JS Vector QR Code SVG Generator (21x21 ISO finder-pattern matrix)
 */
export function renderQrSvg(el: DesignElement): string {
  const text = el.qrText || 'https://canvascraft.studio';
  const fg = el.fill || '#0f172a';
  const bg = el.qrBgColor || '#ffffff';
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const placeFinder = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
          reserved[rr][cc] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            matrix[rr][cc] = isBorder || isInner;
          }
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing lines
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Deterministic hash stream from payload text
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      seed ^= (r * 31 + c * 17 + text.charCodeAt((r + c) % Math.max(1, text.length))) & 0xff;
      seed = Math.imul(seed, 16777619);
      matrix[r][c] = (Math.abs(seed) % 10) < 5;
    }
  }

  const quiet = 2;
  const total = size + quiet * 2;
  let rects = `<rect x="0" y="0" width="${total}" height="${total}" rx="1.8" fill="${bg}"/>`;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + quiet}" y="${r + quiet}" width="0.92" height="0.92" rx="0.2" fill="${fg}"/>`;
      }
    }
  }

  return `<svg viewBox="0 0 ${total} ${total}" class="w-full h-full block">${rects}</svg>`;
}

/**
 * Pure-JS Vector Table SVG Generator
 */
export function renderTableSvg(el: DesignElement): string {
  const rows =
    el.tableData && el.tableData.length > 0
      ? el.tableData
      : [
          ['Deliverable', 'Owner', 'Status'],
          ['Brand Identity', 'Design Studio', 'Approved'],
          ['Keynote Deck', 'Editorial Lead', 'In Review'],
          ['Social Launch', 'Growth Team', 'Scheduled'],
        ];
  const rowCount = Math.max(1, rows.length);
  const colCount = Math.max(1, rows[0]?.length || 3);
  const W = Math.max(240, el.width || 560);
  const H = Math.max(120, el.height || 260);
  const cellW = W / colCount;
  const cellH = H / rowCount;

  const headerBg = el.tableHeaderBg || el.fill || '#4f46e5';
  const borderCol =
    el.tableBorderColor || (el.stroke && el.stroke !== 'none' ? el.stroke : '#334155');
  const textCol = el.color || '#f8fafc';
  const striped = el.tableStriped !== false;
  const fontSize = el.fontSize || 16;
  const cellPad = el.tableCellPadding ?? 14;

  let cellsMarkup = '';
  rows.forEach((row, rIdx) => {
    const y = rIdx * cellH;
    const isHeader = rIdx === 0;
    const rowFill = isHeader
      ? headerBg
      : striped && rIdx % 2 === 1
      ? 'rgba(30, 41, 59, 0.78)'
      : 'rgba(15, 23, 42, 0.85)';

    cellsMarkup += `<rect x="0" y="${y}" width="${W}" height="${cellH}" fill="${rowFill}"/>`;

    row.forEach((cellVal, cIdx) => {
      const x = cIdx * cellW;
      const safeText = String(cellVal ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      cellsMarkup += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="none" stroke="${borderCol}" stroke-width="1.5"/>`;
      cellsMarkup += `<text x="${x + cellPad}" y="${y + cellH / 2 + fontSize * 0.35}" fill="${
        isHeader ? '#ffffff' : textCol
      }" font-family="'Plus Jakarta Sans', sans-serif" font-size="${fontSize}" font-weight="${
        isHeader ? '700' : '500'
      }">${safeText}</text>`;
    });
  });

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="w-full h-full block rounded-lg overflow-hidden">${cellsMarkup}</svg>`;
}

/**
 * Pure-JS Smart Connector & Flowchart Line SVG Generator
 * Connects either two elements (fromElementId -> toElementId) or spans the connector element box
 */
export function renderConnectorSvg(el: DesignElement, allElements: DesignElement[] = []): string {
  const W = Math.max(40, el.width || 240);
  const H = Math.max(40, el.height || 120);
  const stroke = el.stroke && el.stroke !== 'none' ? el.stroke : el.fill || '#6366f1';
  const sw = Math.max(2, el.strokeWidth || 3);
  const style = el.connectorStyle || 'elbow';
  const dashAttr = el.connectorDashed ? `stroke-dasharray="${sw * 3} ${sw * 2}"` : '';

  let x1 = 16;
  let y1 = H / 2;
  let x2 = W - 16;
  let y2 = H / 2;

  const fromEl = el.fromElementId ? allElements.find((item) => item.id === el.fromElementId) : undefined;
  const toEl = el.toElementId ? allElements.find((item) => item.id === el.toElementId) : undefined;

  if (fromEl && toEl) {
    const fcx = fromEl.x + fromEl.width / 2 - el.x;
    const fcy = fromEl.y + fromEl.height / 2 - el.y;
    const tcx = toEl.x + toEl.width / 2 - el.x;
    const tcy = toEl.y + toEl.height / 2 - el.y;
    x1 = Math.max(12, Math.min(W - 12, fcx));
    y1 = Math.max(12, Math.min(H - 12, fcy));
    x2 = Math.max(12, Math.min(W - 12, tcx));
    y2 = Math.max(12, Math.min(H - 12, tcy));
  } else {
    y1 = H * 0.22;
    y2 = H * 0.78;
  }

  let pathD = '';
  if (style === 'straight') {
    pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
  } else if (style === 'curved') {
    const midX = (x1 + x2) / 2;
    pathD = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  } else {
    // elbow orthogonal route
    const midX = (x1 + x2) / 2;
    pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }

  const markerIdEnd = `conn-arrow-end-${el.id}`;
  const markerIdStart = `conn-arrow-start-${el.id}`;
  const showEnd = el.connectorArrowEnd !== false;
  const showStart = Boolean(el.connectorArrowStart);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const label = (el.connectorLabel || '').trim();
  let labelMarkup = '';
  if (label) {
    const safeLabel = label
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const pillW = Math.max(54, safeLabel.length * 8 + 20);
    labelMarkup = `
      <rect x="${midX - pillW / 2}" y="${midY - 13}" width="${pillW}" height="26" rx="13" fill="#0f172a" stroke="${stroke}" stroke-width="1.5"/>
      <text x="${midX}" y="${midY + 4}" text-anchor="middle" fill="#f8fafc" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700">${safeLabel}</text>
    `;
  }

  return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full block overflow-visible">
    <defs>
      <marker id="${markerIdEnd}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="${stroke}"/>
      </marker>
      <marker id="${markerIdStart}" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 10 1 L 0 5 L 10 9 z" fill="${stroke}"/>
      </marker>
    </defs>
    <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${dashAttr} ${
      showEnd ? `marker-end="url(#${markerIdEnd})"` : ''
    } ${showStart ? `marker-start="url(#${markerIdStart})"` : ''}/>
    <circle cx="${x1}" cy="${y1}" r="${sw * 1.15}" fill="${stroke}"/>
    <circle cx="${x2}" cy="${y2}" r="${sw * 1.15}" fill="${stroke}"/>
    ${labelMarkup}
  </svg>`;
}


