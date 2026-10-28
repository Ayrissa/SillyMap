import { getContext, getSettings, saveSettings } from './core.js';

const MAX_ITEMS = 12;

function charKey() {
    const ctx = getContext();
    if (ctx.groupId) return 'group:' + ctx.groupId;
    return ctx.characters?.[ctx.characterId]?.avatar || null;
}

function saveMeta() {
    const ctx = getContext();
    (ctx.saveMetadata || ctx.saveMetadataDebounced)?.call(ctx);
}

/** Returns { root, save } where the map data of this kind lives, or null if there is no open chat. */
function location(kind) {
    const ctx = getContext();
    const s = getSettings();
    if (kind === 'world' && s.bindTo === 'character') {
        const key = charKey();
        if (!key) return null;
        s.byChar[key] ??= {};
        return { root: s.byChar[key], save: saveSettings };
    }
    if (!ctx.chatMetadata) return null;
    ctx.chatMetadata.sillymap ??= {};
    return { root: ctx.chatMetadata.sillymap, save: saveMeta };
}

/** Map record: { items: [{image, style, prompt, desc, created, labels, markers, paths}], cur, style, extra } */
export function getMap(kind) {
    const loc = location(kind);
    if (!loc) return null;
    loc.root[kind] ??= { items: [], cur: -1, style: '', extra: '' };
    return loc.root[kind];
}

export function currentItem(kind) {
    const m = getMap(kind);
    return m && m.items[m.cur] ? m.items[m.cur] : null;
}

function commit(kind) {
    location(kind)?.save();
}

export function setField(kind, key, value) {
    if (!getMap(kind)) return;
    getMap(kind)[key] = value;
    commit(kind);
}

export function addItem(kind, item) {
    const m = getMap(kind);
    if (!m) return;
    m.items.push(item);
    if (m.items.length > MAX_ITEMS) m.items.splice(0, m.items.length - MAX_ITEMS);
    m.cur = m.items.length - 1;
    commit(kind);
}

export function setCur(kind, index) {
    const m = getMap(kind);
    if (!m || index < 0 || index >= m.items.length) return;
    m.cur = index;
    commit(kind);
}

/**
 * Overlay data lives inside the current map version (coordinates belong to that picture).
 * field: 'labels' (names) | 'markers' (pins) | 'paths'.
 */
export function store(field) {
    const mutate = (kind, fn) => {
        const item = currentItem(kind);
        if (!item) return false;
        item[field] ??= [];
        fn(item[field]);
        commit(kind);
        return true;
    };
    return {
        of: kind => currentItem(kind)?.[field] || [],
        add: (kind, obj) => mutate(kind, list => list.push(obj)),
        del: (kind, id) => mutate(kind, list => { const i = list.findIndex(o => o.id === id); if (i >= 0) list.splice(i, 1); }),
        clear: kind => mutate(kind, list => { list.length = 0; }),
        /** Any manual change turns the object "manual", so a later automatic analysis will not overwrite it. */
        update: (kind, id, patch) => mutate(kind, list => { const o = list.find(x => x.id === id); if (o) Object.assign(o, patch, { auto: false }); }),
        /** Replaces automatic objects and keeps the manual ones. */
        replaceAuto: (kind, fresh) => mutate(kind, list => {
            const manual = list.filter(o => o.auto === false);
            list.length = 0;
            list.push(...manual, ...fresh);
        }),
    };
}
