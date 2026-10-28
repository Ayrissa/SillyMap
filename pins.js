/** Shared definitions: pin types and label fonts (used by the window and by the PNG export). */

export const PIN_TYPES = ['place', 'hero', 'visited', 'danger', 'quest'];
export const PIN_COLORS = { place: '#B8420F', hero: '#2F6DB5', visited: '#8A7B6B', danger: '#8E1B1B', quest: '#C9971C' };
export const PIN_BASE = 'M12 24C12 24 3.5 15.8 3.5 10a8.5 8.5 0 0 1 17 0C20.5 15.8 12 24 12 24z';

function starPath(cx, cy, ro, ri) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 ? ri : ro;
        pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return 'M' + pts.join('L') + 'Z';
}

/** Small dark symbol drawn inside the cream circle of a pin. */
export const PIN_SYMBOL = {
    place: '',
    visited: '',
    hero: 'M12 8.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3z',
    danger: 'M11.2 6.4h1.6l-.35 3.4h-.9z M12 10.8a.8.8 0 1 0 0 1.6a.8.8 0 1 0 0-1.6z',
    quest: starPath(12, 10, 3.2, 1.3),
};

export function pinSvg(type) {
    const fill = PIN_COLORS[type] || PIN_COLORS.place;
    const sym = PIN_SYMBOL[type] ? `<path d="${PIN_SYMBOL[type]}" fill="#111"/>` : '';
    return `<svg viewBox="0 0 24 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${PIN_BASE}" fill="${fill}" stroke="#111" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="10" r="3.6" fill="#FBF1E6" stroke="#111" stroke-width="1.5"/>${sym}</svg>`;
}

const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

/** Label fonts. All of them support Cyrillic. Non-system fonts are loaded from Google Fonts on demand. */
export const FONTS = {
    auto: { stack: SYSTEM_STACK, style: 'normal', weight: 600, gf: '' },
    italic: { stack: '"Cormorant Garamond", "Palatino Linotype", Georgia, serif', style: 'italic', weight: 700, gf: 'Cormorant+Garamond:ital,wght@1,700' },
    ornate: { stack: '"Ruslan Display", "Cinzel Decorative", "Palatino Linotype", serif', style: 'normal', weight: 400, gf: 'Ruslan+Display' },
    serif: { stack: 'Lora, "PT Serif", Georgia, serif', style: 'normal', weight: 700, gf: 'Lora:wght@700' },
};

const loadedFonts = new Set();

export function ensureFont(id) {
    const f = FONTS[id];
    if (!f || !f.gf || loadedFonts.has(id)) return;
    loadedFonts.add(id);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${f.gf}&display=swap`;
    document.head.appendChild(link);
}
