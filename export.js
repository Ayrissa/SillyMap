import { getSettings } from './core.js';
import { FONTS, ensureFont, PIN_BASE, PIN_COLORS, PIN_SYMBOL } from './pins.js';

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/** Renders the current map with its names, pins and paths into a PNG and downloads it. */
export async function exportMap(kind, item, show) {
    const s = getSettings();
    const img = document.getElementById('sm_img');
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw) throw new Error('no image');

    const font = FONTS[s.labelFont] || FONTS.auto;
    ensureFont(s.labelFont);
    try { await document.fonts.load(`${font.style} ${font.weight} 16px ${font.stack}`); } catch { /* best effort */ }

    const c = document.createElement('canvas');
    c.width = iw; c.height = ih;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const u = Math.max(iw, ih) / 900; // "screen pixel" in image pixels

    // paths
    if (show.paths && kind === 'world') {
        for (const p of item.paths || []) {
            if ((p.points || []).length < 2) continue;
            const w = (p.width || 4) * u;
            ctx.beginPath();
            p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * iw, y * ih) : ctx.moveTo(x * iw, y * ih)));
            ctx.strokeStyle = p.color || '#b8420f';
            ctx.lineWidth = w;
            ctx.lineJoin = 'round';
            ctx.lineCap = p.style === 'dashed' ? 'butt' : 'round';
            ctx.setLineDash(p.style === 'dashed' ? [w * 3, w * 2.2] : []);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    // names
    const sizes = { l: 20, m: 15, s: 12 };
    const light = s.labelTheme === 'light';
    const drawText = (text, x, y, px, angle) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((angle || 0) * Math.PI / 180);
        ctx.font = `${font.style} ${font.weight} ${px}px ${font.stack}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = px * 0.3;
        ctx.strokeStyle = light ? 'rgba(20,14,8,.9)' : 'rgba(255,250,240,.95)';
        ctx.strokeText(text, 0, 0);
        ctx.fillStyle = light ? '#fff8ec' : '#2b1d12';
        ctx.fillText(text, 0, 0);
        ctx.restore();
    };
    if (show.labels) {
        for (const l of item.labels || []) drawText(l.name, l.x * iw, l.y * ih, (sizes[l.size] || 15) * u, l.angle);
        for (const p of item.paths || []) {
            if (kind === 'world' && show.paths && p.name && (p.points || []).length >= 2) {
                const [x, y] = p.points[Math.floor(p.points.length / 2)];
                drawText(p.name, x * iw, y * ih, 12 * u, 0);
            }
        }
    }

    // pins
    if (show.pins) {
        for (const m of item.markers || []) {
            ctx.save();
            ctx.translate(m.x * iw, m.y * ih);
            ctx.scale(u, u);
            ctx.translate(-12, -24); // pin tip is at (12, 24) in its own coordinates
            ctx.shadowColor = 'rgba(0,0,0,.45)';
            ctx.shadowBlur = 3;
            ctx.fillStyle = PIN_COLORS[m.type] || PIN_COLORS.place;
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 1.7;
            ctx.lineJoin = 'round';
            const base = new Path2D(PIN_BASE);
            ctx.fill(base);
            ctx.shadowColor = 'transparent';
            ctx.stroke(base);
            ctx.beginPath();
            ctx.arc(12, 10, 3.6, 0, Math.PI * 2);
            ctx.fillStyle = '#FBF1E6';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            if (PIN_SYMBOL[m.type]) { ctx.fillStyle = '#111'; ctx.fill(new Path2D(PIN_SYMBOL[m.type])); }
            ctx.restore();

            // name tag under the pin
            const px = 12 * u;
            ctx.save();
            ctx.font = `${font.style} ${font.weight} ${px}px ${font.stack}`;
            const w = ctx.measureText(m.name).width + 14 * u;
            const h = px * 1.45;
            const x = m.x * iw - w / 2, y = m.y * ih + 3 * u;
            roundRect(ctx, x, y, w, h, 7 * u);
            ctx.fillStyle = m.type === 'hero' ? '#dbe8f8' : 'rgba(251,241,230,.93)';
            ctx.fill();
            ctx.lineWidth = u;
            ctx.strokeStyle = '#111';
            ctx.stroke();
            ctx.fillStyle = '#2b1d12';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(m.name, m.x * iw, y + h / 2 + u * 0.5);
            ctx.restore();
        }
    }

    const blob = await new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sillymap_${kind}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
