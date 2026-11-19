import {
  getGridCellRects,
  getImageFilterCss,
  renderChartSvg,
  renderConnectorSvg,
  renderCurvedTextSvg,
  renderQrSvg,
  renderShapeSvg,
  renderStickerSvg,
  renderTableSvg,
} from './icons';
import { DesignElement, DesignPage, DesignProject, FrameShapeKind } from './types';

function formatTextWithTransform(raw: string, transform?: string): string {
  if (!transform || transform === 'none') return raw;
  if (transform === 'uppercase') return raw.toUpperCase();
  if (transform === 'lowercase') return raw.toLowerCase();
  if (transform === 'capitalize') {
    return raw.replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return raw;
}

export interface ExportImageOptions {
  scale?: number;
  transparentBackground?: boolean;
  filename?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function svgToDataUrl(svgMarkup: string, width: number, height: number): string {
  const sizedSvg = svgMarkup.replace(
    '<svg ',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(1, Math.round(width))}" height="${Math.max(1, Math.round(height))}" `
  );
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sizedSvg);
}

function buildSanitizedFilename(
  project: DesignProject,
  page: DesignPage,
  ext: string,
  customName?: string
): string {
  const rawBase =
    customName && customName.trim().length > 0
      ? customName.trim().replace(/\.(png|svg|jpe?g|pdf|webm|json)$/i, '')
      : `${project.name || 'design'}-${page.title || 'page-1'}`;
  const safeBase = rawBase.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'canvas-export';
  return `${safeBase}.${ext}`;
}

/**
 * Pure Vanilla JS Client-Side Background / Chroma Eraser
 * Samples corner pixels and removes matching background color with soft alpha feathering
 */
export async function eraseImageBackground(src: string, tolerance = 52): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Sample top-left pixel as reference background color
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  const maxDist = tolerance * 1.75;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bgR;
    const dg = data[i + 1] - bgG;
    const db = data[i + 2] - bgB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist < tolerance) {
      data[i + 3] = 0;
    } else if (dist < maxDist) {
      const factor = (dist - tolerance) / (maxDist - tolerance);
      data[i + 3] = Math.round(data[i + 3] * factor);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

function applyFrameClipPath2D(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frameShape?: FrameShapeKind,
  borderRadius = 0
): void {
  ctx.beginPath();
  switch (frameShape) {
    case 'circle':
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case 'diamond':
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w / 2, h);
      ctx.lineTo(0, h / 2);
      ctx.closePath();
      break;
    case 'hexagon':
      ctx.moveTo(w * 0.25, h * 0.03);
      ctx.lineTo(w * 0.75, h * 0.03);
      ctx.lineTo(w * 0.98, h * 0.5);
      ctx.lineTo(w * 0.75, h * 0.97);
      ctx.lineTo(w * 0.25, h * 0.97);
      ctx.lineTo(w * 0.02, h * 0.5);
      ctx.closePath();
      break;
    case 'star': {
      const pts = [
        [0.5, 0.02],
        [0.64, 0.34],
        [0.98, 0.38],
        [0.72, 0.6],
        [0.79, 0.94],
        [0.5, 0.76],
        [0.21, 0.94],
        [0.28, 0.6],
        [0.02, 0.38],
        [0.36, 0.34],
      ];
      pts.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px * w, py * h);
        else ctx.lineTo(px * w, py * h);
      });
      ctx.closePath();
      break;
    }
    case 'arch':
      ctx.roundRect(0, 0, w, h, [Math.min(w, h) / 2, Math.min(w, h) / 2, 12, 12]);
      break;
    case 'pill':
      ctx.roundRect(0, 0, w, h, Math.min(w, h) / 2);
      break;
    default: {
      const r = Math.min(borderRadius || 0, w / 2, h / 2);
      ctx.roundRect(0, 0, w, h, r);
      break;
    }
  }
  ctx.clip();
}

function drawWrappedText(ctx: CanvasRenderingContext2D, el: DesignElement): void {
  const text = formatTextWithTransform(el.text || '', el.textTransform);
  const fontSize = el.fontSize || 32;
  const fontFamily = el.fontFamily || 'Plus Jakarta Sans';
  const fontWeight = el.fontWeight || 600;
  const fontStyle = el.fontStyle || 'normal';
  const lineHeight = (el.lineHeight || 1.25) * fontSize;
  const isRtl =
    el.textDirection === 'rtl' ||
    (el.textDirection !== 'ltr' && /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(text));
  const align = el.textAlign || (isRtl ? 'right' : 'left');
  const effect = el.textEffect || 'none';
  const effectColor = el.textEffectColor || '#6366f1';

  ctx.direction = isRtl ? 'rtl' : 'ltr';
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = el.color || '#0f172a';
  ctx.textBaseline = 'top';

  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > el.width && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
  }

  if (el.textBgColor && el.textBgColor !== 'transparent') {
    const pad = el.textBgPadding ?? 6;
    const rad = el.textBgRadius ?? 8;
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = el.textBgColor;
    ctx.beginPath();
    ctx.roundRect(
      -pad,
      -pad,
      el.width + pad * 2,
      Math.max(el.height, lines.length * lineHeight + 8) + pad * 2,
      rad
    );
    ctx.fill();
    ctx.restore();
  }

  lines.forEach((line, idx) => {
    let drawX = 0;
    const lineWidth = ctx.measureText(line).width;
    if (align === 'center') {
      drawX = (el.width - lineWidth) / 2;
    } else if (align === 'right') {
      drawX = el.width - lineWidth;
    }
    const drawY = idx * lineHeight;

    ctx.save();
    if (effect === 'shadow') {
      ctx.shadowColor = effectColor;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      ctx.fillText(line, drawX, drawY);
    } else if (effect === 'lift') {
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;
      ctx.fillText(line, drawX, drawY);
    } else if (effect === 'neon') {
      ctx.shadowColor = effectColor;
      ctx.shadowBlur = 22;
      ctx.fillText(line, drawX, drawY);
      ctx.shadowBlur = 8;
      ctx.fillText(line, drawX, drawY);
    } else if (effect === 'hollow') {
      ctx.strokeStyle = el.color || '#ffffff';
      ctx.lineWidth = Math.max(1.5, fontSize * 0.04);
      ctx.strokeText(line, drawX, drawY);
    } else if (effect === 'splice') {
      ctx.fillStyle = effectColor;
      ctx.fillText(line, drawX + 4, drawY + 4);
      ctx.strokeStyle = el.color || '#ffffff';
      ctx.lineWidth = Math.max(1.5, fontSize * 0.04);
      ctx.strokeText(line, drawX, drawY);
    } else if (effect === 'echo') {
      ctx.globalAlpha = (el.opacity ?? 1) * 0.25;
      ctx.fillStyle = effectColor;
      ctx.fillText(line, drawX - 8, drawY - 8);
      ctx.globalAlpha = (el.opacity ?? 1) * 0.5;
      ctx.fillText(line, drawX - 4, drawY - 4);
      ctx.globalAlpha = el.opacity ?? 1;
      ctx.fillStyle = el.color || '#ffffff';
      ctx.fillText(line, drawX, drawY);
    } else {
      if (el.shadowColor && el.shadowBlur) {
        ctx.shadowColor = el.shadowColor;
        ctx.shadowBlur = el.shadowBlur;
        ctx.shadowOffsetX = el.shadowOffsetX || 0;
        ctx.shadowOffsetY = el.shadowOffsetY || 4;
      }
      ctx.fillText(line, drawX, drawY);
    }
    ctx.restore();

    if (el.textDecoration === 'underline') {
      ctx.save();
      ctx.strokeStyle = el.color || '#0f172a';
      ctx.lineWidth = Math.max(1.5, fontSize * 0.06);
      ctx.beginPath();
      ctx.moveTo(drawX, drawY + fontSize * 1.05);
      ctx.lineTo(drawX + lineWidth, drawY + fontSize * 1.05);
      ctx.stroke();
      ctx.restore();
    }
  });
}

export async function renderPageToCanvas(
  project: DesignProject,
  page: DesignPage,
  scale = 1,
  animProgress = 1,
  transparentBackground = false
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(project.width * scale));
  canvas.height = Math.max(1, Math.round(project.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // 1. Background (skipped if transparentBackground is enabled for PNG export)
  if (!transparentBackground) {
    if (page.backgroundGradient) {
      const hexes = page.backgroundGradient.match(/#[0-9a-fA-F]{6}/g);
      if (hexes && hexes.length >= 2) {
        const grad = ctx.createLinearGradient(0, 0, project.width, project.height);
        grad.addColorStop(0, hexes[0]);
        grad.addColorStop(1, hexes[1]);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = page.background || '#ffffff';
      }
    } else {
      ctx.fillStyle = page.background || '#ffffff';
    }
    ctx.fillRect(0, 0, project.width, project.height);

    // 2. Subtle Background Pattern
    if (page.backgroundPattern === 'dots') {
      ctx.save();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
      const step = 32;
      for (let x = 16; x < project.width; x += step) {
        for (let y = 16; y < project.height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (page.backgroundPattern === 'grid') {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = 1;
      const step = 48;
      for (let x = 0; x < project.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, project.height);
        ctx.stroke();
      }
      for (let y = 0; y < project.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(project.width, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 3. Elements in layer order
  for (const el of page.elements) {
    if (el.hidden) continue;

    ctx.save();

    // Animation progress support for video export
    let alphaMult = 1;
    let offsetX = 0;
    let offsetY = 0;
    let scaleMult = 1;
    if (animProgress < 1 && el.animation && el.animation !== 'none') {
      const ease = 1 - Math.pow(1 - animProgress, 3);
      alphaMult = ease;
      if (el.animation === 'rise') offsetY = (1 - ease) * 44;
      if (el.animation === 'pan') offsetX = -(1 - ease) * 56;
      if (el.animation === 'pop') scaleMult = 0.4 + 0.6 * ease;
      if (el.animation === 'tumble') offsetY = -(1 - ease) * 35;
    }

    ctx.globalAlpha = (el.opacity ?? 1) * alphaMult;
    if (el.blendMode && el.blendMode !== 'normal') {
      ctx.globalCompositeOperation = el.blendMode as GlobalCompositeOperation;
    }

    const cx = el.x + offsetX + el.width / 2;
    const cy = el.y + offsetY + el.height / 2;
    ctx.translate(cx, cy);
    if (el.rotation) {
      ctx.rotate((el.rotation * Math.PI) / 180);
    }
    ctx.scale((el.flipX ? -1 : 1) * scaleMult, (el.flipY ? -1 : 1) * scaleMult);
    ctx.translate(-el.width / 2, -el.height / 2);

    if (el.shadowColor && el.shadowBlur && el.type !== 'text') {
      ctx.shadowColor = el.shadowColor;
      ctx.shadowBlur = el.shadowBlur;
      ctx.shadowOffsetX = el.shadowOffsetX ?? 0;
      ctx.shadowOffsetY = el.shadowOffsetY ?? 8;
    }

    try {
      if (el.type === 'shape') {
        const svgStr = renderShapeSvg(
          el.shapeKind || 'rect',
          el.fill || '#6366f1',
          el.stroke || 'none',
          el.strokeWidth || 0,
          el.borderRadius || 0,
          `grad_${el.id}`,
          el.fillGradient
        );
        const img = await loadImage(svgToDataUrl(svgStr, el.width, el.height));
        ctx.drawImage(img, 0, 0, el.width, el.height);
      } else if (el.type === 'sticker') {
        const svgStr = renderStickerSvg(
          el.stickerKind || 'burst',
          el.fill || '#6366f1',
          el.stroke || '#f43f5e'
        );
        const img = await loadImage(svgToDataUrl(svgStr, el.width, el.height));
        ctx.drawImage(img, 0, 0, el.width, el.height);
      } else if (el.type === 'chart') {
        const svgStr = renderChartSvg(el);
        const img = await loadImage(svgToDataUrl(svgStr, el.width, el.height));
        ctx.drawImage(img, 0, 0, el.width, el.height);
      } else if (el.type === 'qr') {
        const svgStr = renderQrSvg(el);
        const img = await loadImage(svgToDataUrl(svgStr, el.width, el.height));
        ctx.drawImage(img, 0, 0, el.width, el.height);
      } else if (el.type === 'table') {
        const svgStr = renderTableSvg(el);
        const img = await loadImage(svgToDataUrl(svgStr, el.width, el.height));
        ctx.drawImage(img, 0, 0, el.width, el.height);
      } else if (el.type === 'connector') {
        const svgStr = renderConnectorSvg(el, page.elements);
        const img = await loadImage(svgToDataUrl(svgStr, el.width, el.height));
        ctx.drawImage(img, 0, 0, el.width, el.height);
      } else if (el.type === 'grid') {
        const rects = getGridCellRects(
          el.gridLayout || el.gridKind || 'split-v',
          el.width,
          el.height,
          el.gridGap ?? 12
        );
        const cells = el.gridCells || [];
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          const cellSrc = cells[i];
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(r.x, r.y, r.w, r.h, el.borderRadius ?? 12);
          ctx.clip();
          if (cellSrc) {
            const cellImg = await loadImage(cellSrc);
            ctx.drawImage(cellImg, r.x, r.y, r.w, r.h);
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(r.x, r.y, r.w, r.h);
          }
          ctx.restore();
        }
      } else if (el.type === 'image' && el.src) {
        const img = await loadImage(el.src);
        ctx.save();
        applyFrameClipPath2D(ctx, el.width, el.height, el.frameShape, el.borderRadius);
        ctx.filter = getImageFilterCss(el);
        const zoom = el.cropZoom || 1;
        const panX = ((el.cropPanX || 0) / 100) * el.width;
        const panY = ((el.cropPanY || 0) / 100) * el.height;
        const drawW = el.width * zoom;
        const drawH = el.height * zoom;
        const drawX = (el.width - drawW) / 2 + panX;
        const drawY = (el.height - drawH) / 2 + panY;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
      } else if (el.type === 'text') {
        if (el.textCurve && el.textCurve !== 0) {
          const svgStr = renderCurvedTextSvg(el);
          const img = await loadImage(svgToDataUrl(svgStr, el.width, el.height));
          ctx.drawImage(img, 0, 0, el.width, el.height);
        } else {
          drawWrappedText(ctx, el);
        }
      } else if (el.type === 'path' && el.pathPoints && el.pathPoints.length > 1) {
        ctx.strokeStyle = el.stroke || '#6366f1';
        ctx.lineWidth = el.strokeWidth || 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        el.pathPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }
    } catch {
      // Resilient fallback if an individual image fails
    }

    ctx.restore();
  }

  return canvas;
}

export async function downloadDesignImage(
  project: DesignProject,
  page: DesignPage,
  format: 'png' | 'jpeg',
  scale = 1,
  options?: ExportImageOptions
): Promise<string> {
  const effectiveScale = options?.scale ?? scale;
  const transparentBg = format === 'png' && Boolean(options?.transparentBackground);
  const canvas = await renderPageToCanvas(project, page, effectiveScale, 1, transparentBg);
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mime, 0.94);
  const a = document.createElement('a');
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  a.href = dataUrl;
  a.download = buildSanitizedFilename(project, page, ext, options?.filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return dataUrl;
}

function wrapSvgInner(svgMarkup: string, width: number, height: number): string {
  // Position an existing <svg ...>...</svg> at (0,0) with target width & height
  return svgMarkup.replace(
    /<svg\b([^>]*)>/i,
    (_match, attrs) => {
      const cleaned = String(attrs)
        .replace(/\bwidth="[^"]*"/gi, '')
        .replace(/\bheight="[^"]*"/gi, '')
        .replace(/\bx="[^"]*"/gi, '')
        .replace(/\by="[^"]*"/gi, '');
      return `<svg x="0" y="0" width="${Math.max(1, Math.round(width))}" height="${Math.max(
        1,
        Math.round(height)
      )}" ${cleaned.trim()}>`;
    }
  );
}

function renderSvgTextElement(el: DesignElement): string {
  if (el.textCurve && el.textCurve !== 0) {
    return wrapSvgInner(renderCurvedTextSvg(el), el.width, el.height);
  }

  const text = formatTextWithTransform(el.text || '', el.textTransform);
  const fontSize = el.fontSize || 32;
  const fontFamily = el.fontFamily || 'Plus Jakarta Sans';
  const fontWeight = el.fontWeight || 600;
  const fontStyle = el.fontStyle || 'normal';
  const lineHeight = (el.lineHeight || 1.25) * fontSize;
  const isRtl =
    el.textDirection === 'rtl' ||
    (el.textDirection !== 'ltr' && /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(text));
  const align = el.textAlign || (isRtl ? 'right' : 'left');
  const color = el.color || '#0f172a';
  const effect = el.textEffect || 'none';
  const effectColor = el.textEffectColor || '#6366f1';

  // Approximate character-width line wrapping for standalone SVG
  const avgCharW = fontSize * 0.54;
  const maxCharsPerLine = Math.max(4, Math.floor(el.width / Math.max(1, avgCharW)));
  const rawParagraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of rawParagraphs) {
    const words = para.split(' ');
    let currentLine = '';
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length > maxCharsPerLine && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    lines.push(currentLine);
  }

  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const anchorX = align === 'center' ? Math.round(el.width / 2) : align === 'right' ? el.width : 0;
  const pad = el.textBgPadding ?? 6;
  const rad = el.textBgRadius ?? 8;
  const bgRect =
    el.textBgColor && el.textBgColor !== 'transparent'
      ? `<rect x="${-pad}" y="${-pad}" width="${el.width + pad * 2}" height="${
          Math.max(el.height, Math.round(lines.length * lineHeight + 8)) + pad * 2
        }" rx="${rad}" fill="${escapeXml(el.textBgColor)}" />`
      : '';

  const tspans = lines
    .map((line, idx) => {
      const dy = Math.round(fontSize * 0.88 + idx * lineHeight);
      return `<tspan x="${anchorX}" y="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  const letterSpacingAttr = el.letterSpacing ? ` letter-spacing="${el.letterSpacing}em"` : '';
  const decorationAttr = el.textDecoration === 'underline' ? ` text-decoration="underline"` : '';
  const dirAttr = ` direction="${isRtl ? 'rtl' : 'ltr'}" unicode-bidi="plaintext"`;

  let extraStrokeAttrs = '';
  let duplicateLayer = '';
  if (effect === 'hollow') {
    extraStrokeAttrs = ` fill="none" stroke="${escapeXml(color)}" stroke-width="${Math.max(
      1.5,
      +(fontSize * 0.04).toFixed(2)
    )}"`;
  } else if (effect === 'splice') {
    duplicateLayer = `<text font-family="${escapeXml(
      fontFamily
    )}, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${escapeXml(
      effectColor
    )}" text-anchor="${anchor}" transform="translate(4, 4)"${letterSpacingAttr}${dirAttr}>${tspans}</text>`;
    extraStrokeAttrs = ` fill="none" stroke="${escapeXml(color)}" stroke-width="${Math.max(
      1.5,
      +(fontSize * 0.04).toFixed(2)
    )}"`;
  } else if (effect === 'shadow' || effect === 'neon' || effect === 'lift') {
    const shadowX = effect === 'shadow' ? 4 : 0;
    const shadowY = effect === 'shadow' ? 4 : effect === 'lift' ? 8 : 0;
    const shadowCol = effect === 'lift' ? 'rgba(0,0,0,0.45)' : effectColor;
    duplicateLayer = `<text font-family="${escapeXml(
      fontFamily
    )}, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${escapeXml(
      shadowCol
    )}" opacity="0.75" text-anchor="${anchor}" transform="translate(${shadowX}, ${shadowY})"${letterSpacingAttr}${dirAttr}>${tspans}</text>`;
  }

  return `${bgRect}${duplicateLayer}<text font-family="${escapeXml(
    fontFamily
  )}, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" ${
    extraStrokeAttrs || `fill="${escapeXml(color)}"`
  } text-anchor="${anchor}"${letterSpacingAttr}${decorationAttr}${dirAttr}>${tspans}</text>`;
}

/**
 * Generates a true, standalone Vector SVG document (.svg) containing native vector shapes,
 * typography, stickers, charts, QR codes, paths, and embedded images for the current composition.
 */
export function generateNativePageSvg(
  project: DesignProject,
  page: DesignPage,
  options?: ExportImageOptions
): string {
  const W = project.width;
  const H = project.height;
  const scale = options?.scale ?? 1;
  const outW = Math.max(1, Math.round(W * scale));
  const outH = Math.max(1, Math.round(H * scale));
  const transparentBg = Boolean(options?.transparentBackground);

  const defs: string[] = [];
  let bgMarkup = '';

  if (!transparentBg) {
    if (page.backgroundGradient) {
      const hexes = page.backgroundGradient.match(/#[0-9a-fA-F]{6}/g);
      if (hexes && hexes.length >= 2) {
        defs.push(`
    <linearGradient id="page_bg_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${hexes[0]}" />
      <stop offset="100%" stop-color="${hexes[1]}" />
    </linearGradient>`);
        bgMarkup += `  <rect width="${W}" height="${H}" fill="url(#page_bg_grad)" />\n`;
      } else {
        bgMarkup += `  <rect width="${W}" height="${H}" fill="${escapeXml(
          page.background || '#ffffff'
        )}" />\n`;
      }
    } else {
      bgMarkup += `  <rect width="${W}" height="${H}" fill="${escapeXml(
        page.background || '#ffffff'
      )}" />\n`;
    }

    if (page.backgroundPattern === 'dots') {
      defs.push(`
    <pattern id="page_pattern_dots" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="16" cy="16" r="1.5" fill="rgba(148, 163, 184, 0.25)" />
    </pattern>`);
      bgMarkup += `  <rect width="${W}" height="${H}" fill="url(#page_pattern_dots)" />\n`;
    } else if (page.backgroundPattern === 'grid') {
      defs.push(`
    <pattern id="page_pattern_grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(148, 163, 184, 0.18)" stroke-width="1" />
    </pattern>`);
      bgMarkup += `  <rect width="${W}" height="${H}" fill="url(#page_pattern_grid)" />\n`;
    }
  }

  const elementNodes: string[] = [];

  for (const el of page.elements) {
    if (el.hidden) continue;

    const cx = +(el.x + el.width / 2).toFixed(2);
    const cy = +(el.y + el.height / 2).toFixed(2);
    const transforms: string[] = [`translate(${cx}, ${cy})`];
    if (el.rotation) {
      transforms.push(`rotate(${el.rotation})`);
    }
    if (el.flipX || el.flipY) {
      transforms.push(`scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})`);
    }
    transforms.push(`translate(${+(-el.width / 2).toFixed(2)}, ${+(-el.height / 2).toFixed(2)})`);

    const opacityAttr =
      el.opacity !== undefined && el.opacity < 1 ? ` opacity="${el.opacity}"` : '';
    const blendStyle =
      el.blendMode && el.blendMode !== 'normal'
        ? ` style="mix-blend-mode: ${el.blendMode};"`
        : '';

    let filterAttr = '';
    if (el.shadowColor && el.shadowBlur && el.type !== 'text') {
      const filterId = `shadow_${el.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      defs.push(`
    <filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="${el.shadowOffsetX ?? 0}" dy="${el.shadowOffsetY ?? 8}" stdDeviation="${Math.max(
        1,
        Math.round((el.shadowBlur || 8) / 2)
      )}" flood-color="${escapeXml(el.shadowColor)}" />
    </filter>`);
      filterAttr = ` filter="url(#${filterId})"`;
    }

    let innerSvg = '';

    if (el.type === 'shape') {
      const rawShape = renderShapeSvg(
        el.shapeKind || 'rect',
        el.fill || '#6366f1',
        el.stroke || 'none',
        el.strokeWidth || 0,
        el.borderRadius || 0,
        `grad_${el.id}`,
        el.fillGradient
      );
      innerSvg = wrapSvgInner(rawShape, el.width, el.height);
    } else if (el.type === 'sticker') {
      const rawSticker = renderStickerSvg(
        el.stickerKind || 'burst',
        el.fill || '#6366f1',
        el.stroke || '#f43f5e'
      );
      innerSvg = wrapSvgInner(rawSticker, el.width, el.height);
    } else if (el.type === 'chart') {
      innerSvg = wrapSvgInner(renderChartSvg(el), el.width, el.height);
    } else if (el.type === 'qr') {
      innerSvg = wrapSvgInner(renderQrSvg(el), el.width, el.height);
    } else if (el.type === 'table') {
      innerSvg = wrapSvgInner(renderTableSvg(el), el.width, el.height);
    } else if (el.type === 'connector') {
      innerSvg = wrapSvgInner(renderConnectorSvg(el, page.elements), el.width, el.height);
    } else if (el.type === 'text') {
      innerSvg = renderSvgTextElement(el);
    } else if (el.type === 'path' && el.pathPoints && el.pathPoints.length > 1) {
      const d = el.pathPoints
        .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
        .join(' ');
      innerSvg = `<path d="${d}" fill="none" stroke="${escapeXml(
        el.stroke || '#6366f1'
      )}" stroke-width="${el.strokeWidth || 6}" stroke-linecap="round" stroke-linejoin="round" />`;
    } else if (el.type === 'image' && el.src) {
      const clipId = `clip_${el.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      const r = Math.min(el.borderRadius || 0, el.width / 2, el.height / 2);
      if (el.frameShape === 'circle') {
        defs.push(
          `    <clipPath id="${clipId}"><ellipse cx="${el.width / 2}" cy="${
            el.height / 2
          }" rx="${el.width / 2}" ry="${el.height / 2}" /></clipPath>`
        );
      } else {
        defs.push(
          `    <clipPath id="${clipId}"><rect x="0" y="0" width="${el.width}" height="${el.height}" rx="${r}" /></clipPath>`
        );
      }
      innerSvg = `<image href="${escapeXml(el.src)}" x="0" y="0" width="${el.width}" height="${
        el.height
      }" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />`;
    } else if (el.type === 'grid') {
      const rects = getGridCellRects(
        el.gridLayout || el.gridKind || 'split-v',
        el.width,
        el.height,
        el.gridGap ?? 12
      );
      const cells = el.gridCells || [];
      innerSvg = rects
        .map((r, idx) => {
          const cellSrc = cells[idx];
          const rad = el.borderRadius ?? 12;
          if (cellSrc) {
            const cellClipId = `grid_${el.id.replace(/[^a-zA-Z0-9_-]/g, '')}_${idx}`;
            defs.push(
              `    <clipPath id="${cellClipId}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${rad}" /></clipPath>`
            );
            return `<image href="${escapeXml(cellSrc)}" x="${r.x}" y="${r.y}" width="${
              r.w
            }" height="${r.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${cellClipId})" />`;
          }
          return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${rad}" fill="#1e293b" />`;
        })
        .join('\n      ');
    }

    if (innerSvg) {
      elementNodes.push(
        `  <g id="layer_${escapeXml(el.id)}" data-layer-name="${escapeXml(
          el.name || el.type
        )}" transform="${transforms.join(' ')}"${opacityAttr}${filterAttr}${blendStyle}>\n    ${innerSvg}\n  </g>`
      );
    }
  }

  const defsBlock = defs.length > 0 ? `  <defs>${defs.join('')}\n  </defs>\n` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${outW}" height="${outH}">
  <title>${escapeXml(project.name || 'CanvasCraft Design')} — ${escapeXml(page.title || 'Page 1')}</title>
${defsBlock}${bgMarkup}${elementNodes.join('\n')}
</svg>`;
}

/**
 * Exports active page as a standalone Vector SVG document (.svg)
 */
export async function downloadDesignSvg(
  project: DesignProject,
  page: DesignPage,
  options?: ExportImageOptions
): Promise<string> {
  const svgDoc = generateNativePageSvg(project, page, options);
  const blob = new Blob([svgDoc], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildSanitizedFilename(project, page, 'svg', options?.filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return svgDoc;
}

function drawCropMarksOnCanvas(
  sourceCanvas: HTMLCanvasElement,
  bleed = 36
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = sourceCanvas.width + bleed * 2;
  out.height = sourceCanvas.height + bleed * 2;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(sourceCanvas, bleed, bleed);

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const markLen = 22;
  const gap = 6;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(bleed - gap - markLen, bleed);
  ctx.lineTo(bleed - gap, bleed);
  ctx.moveTo(bleed, bleed - gap - markLen);
  ctx.lineTo(bleed, bleed - gap);
  // Top-right
  ctx.moveTo(bleed + w + gap, bleed);
  ctx.lineTo(bleed + w + gap + markLen, bleed);
  ctx.moveTo(bleed + w, bleed - gap - markLen);
  ctx.lineTo(bleed + w, bleed - gap);
  // Bottom-left
  ctx.moveTo(bleed - gap - markLen, bleed + h);
  ctx.lineTo(bleed - gap, bleed + h);
  ctx.moveTo(bleed, bleed + h + gap);
  ctx.lineTo(bleed, bleed + h + gap + markLen);
  // Bottom-right
  ctx.moveTo(bleed + w + gap, bleed + h);
  ctx.lineTo(bleed + w + gap + markLen, bleed + h);
  ctx.moveTo(bleed + w, bleed + h + gap);
  ctx.lineTo(bleed + w, bleed + h + gap + markLen);
  ctx.stroke();

  return out;
}

/**
 * Pure Vanilla JS Multi-Page Binary PDF 1.4 Generator (Zero dependencies)
 * Embeds each page in project.pages as a high-resolution DCTDecode JPEG stream
 */
export async function downloadDesignPdf(
  project: DesignProject,
  includeCropMarks = false
): Promise<void> {
  const pageJpegs: Array<{ bytes: Uint8Array; width: number; height: number }> = [];

  for (const page of project.pages) {
    const rawCanvas = await renderPageToCanvas(project, page, 1);
    const canvas = includeCropMarks ? drawCropMarksOnCanvas(rawCanvas, 36) : rawCanvas;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    pageJpegs.push({ bytes, width: canvas.width, height: canvas.height });
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // 1-indexed object offsets
  let byteLength = 0;

  const pushStr = (s: string) => {
    const arr = encoder.encode(s);
    chunks.push(arr);
    byteLength += arr.length;
  };
  const pushBytes = (arr: Uint8Array) => {
    chunks.push(arr);
    byteLength += arr.length;
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  const pageObjIds = pageJpegs.map((_, i) => 3 + i * 3);

  offsets[1] = byteLength;
  pushStr(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  offsets[2] = byteLength;
  pushStr(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${
      pageJpegs.length
    } >>\nendobj\n`
  );

  pageJpegs.forEach((pg, i) => {
    const pageObjId = 3 + i * 3;
    const contentObjId = 4 + i * 3;
    const imgObjId = 5 + i * 3;
    const wPt = Math.round(pg.width * 0.75);
    const hPt = Math.round(pg.height * 0.75);

    offsets[pageObjId] = byteLength;
    pushStr(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Resources << /XObject << /Im${i} ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );

    const contentStream = `q\n${wPt} 0 0 ${hPt} 0 0 cm\n/Im${i} Do\nQ\n`;
    offsets[contentObjId] = byteLength;
    pushStr(
      `${contentObjId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
    );

    offsets[imgObjId] = byteLength;
    pushStr(
      `${imgObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pg.width} /Height ${pg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.bytes.length} >>\nstream\n`
    );
    pushBytes(pg.bytes);
    pushStr(`\nendstream\nendobj\n`);
  });

  const xrefOffset = byteLength;
  const totalObjs = offsets.length;
  pushStr(`xref\n0 ${totalObjs}\n0000000000 65535 f \n`);
  for (let i = 1; i < totalObjs; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  const blob = new Blob(chunks as BlobPart[], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (project.name || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = url;
  a.download = `${safeName}-${project.pages.length}-pages.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Records an animated WebM video of the active page's entrance animations using captureStream + MediaRecorder
 */
export async function downloadDesignVideo(
  project: DesignProject,
  page: DesignPage
): Promise<void> {
  const recCanvas = document.createElement('canvas');
  recCanvas.width = project.width;
  recCanvas.height = project.height;
  const recCtx = recCanvas.getContext('2d')!;

  const stream = recCanvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopPromise = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  const totalFrames = 45; // 1.5s @ 30fps
  for (let f = 1; f <= totalFrames; f++) {
    const progress = Math.min(1, f / 28);
    const frameCanvas = await renderPageToCanvas(project, page, 1, progress);
    recCtx.clearRect(0, 0, recCanvas.width, recCanvas.height);
    recCtx.drawImage(frameCanvas, 0, 0);
    await new Promise((r) => setTimeout(r, 33));
  }

  recorder.stop();
  await stopPromise;

  const blob = new Blob(chunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (project.name || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = url;
  a.download = `${safeName}-animated.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadStoryboardSheet(
  project: DesignProject,
  includeCropMarks = false
): Promise<string> {
  const pages = project.pages;
  const cols = Math.min(3, Math.max(1, pages.length));
  const rows = Math.ceil(pages.length / cols);
  const thumbScale = Math.min(1, 560 / Math.max(project.width, project.height));
  const thumbW = Math.round(project.width * thumbScale);
  const thumbH = Math.round(project.height * thumbScale);
  const pad = 36;
  const labelH = 34;

  const sheet = document.createElement('canvas');
  sheet.width = pad + cols * (thumbW + pad);
  sheet.height = 76 + rows * (thumbH + labelH + pad);
  const ctx = sheet.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, sheet.width, sheet.height);

  // Header bar
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${project.name || 'CanvasCraft Project'} — Storyboard Sheet (${pages.length} ${
      pages.length === 1 ? 'Page' : 'Pages'
    })`,
    pad,
    44
  );

  for (let i = 0; i < pages.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (thumbW + pad);
    const y = 76 + row * (thumbH + labelH + pad);

    const rendered = await renderPageToCanvas(project, pages[i], thumbScale);
    const finalThumb = includeCropMarks ? drawCropMarksOnCanvas(rendered, 14) : rendered;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(finalThumb, x, y, thumbW, thumbH);
    ctx.restore();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, thumbW, thumbH);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Page ${i + 1}: ${pages[i].title || `Slide ${i + 1}`}`, x, y + thumbH + 22);
  }

  const dataUrl = sheet.toDataURL('image/png', 0.95);
  const a = document.createElement('a');
  const safeName = (project.name || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = dataUrl;
  a.download = `${safeName}-storyboard-${pages.length}-pages.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return dataUrl;
}

export function downloadProjectJson(project: DesignProject): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (project.name || 'canvascraft-project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = url;
  a.download = `${safeName}.canva.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
