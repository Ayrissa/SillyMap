import { getSettings, t, esc } from './core.js';
import { STYLES, buildImagePrompt } from './prompts.js';
import { imageConfigured, llmConfigured, describeFromChat, generateImage, storeImage, analyzeLabels, analyzePins, newId } from './api.js';
import { getMap, currentItem, setField, addItem, setCur, store } from './storage.js';
import { Viewer } from './viewer.js';
import { pinSvg, PIN_TYPES, FONTS, ensureFont } from './pins.js';
import { exportMap } from './export.js';

const S = { labels: store('labels'), pins: store('markers'), paths: store('paths') };

const state = {
    open: false, tab: 'world', busy: false, abort: null, viewer: null, shownUrl: null,
    edit: false, adding: null, drawingPath: null, // adding: null | 'label' | 'pin' | 'path'
    show: { labels: true, pins: true, paths: true },
    pop: null, // { mode: 'pin' | 'label' | 'path', id }
};

const $q = sel => $('#sm_overlay').find(sel);
const clamp01 = v => Math.min(1, Math.max(0, v));
const tabIsWorld = () => state.tab === 'world';

/* ------------------------------------------------ markup */

function windowHtml() {
    const sel = (id, opts) => `<select id="${id}" class="text_pole" data-f="${id.replace('sm_pop_', '')}">${opts}</select>`;
    const opt = (v, l) => `<option value="${v}">${esc(l)}</option>`;
    return `
<div class="sm-overlay" id="sm_overlay">
  <div class="sm-window" role="dialog">
    <div class="sm-head">
      <div class="sm-title"><i class="fa-solid fa-map-location-dot"></i><span>SillyMap</span></div>
      <div class="sm-tabs">
        <button class="sm-tab" data-tab="world"><i class="fa-solid fa-earth-europe"></i><span>${esc(t('tabWorld'))}</span></button>
        <button class="sm-tab" data-tab="scene"><i class="fa-solid fa-location-dot"></i><span>${esc(t('tabScene'))}</span></button>
      </div>
      <button class="sm-close" title="${esc(t('close'))}"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="sm-main">
      <div class="sm-viewport" id="sm_vp">
        <div class="sm-stage" id="sm_stage">
          <img id="sm_img" alt="" draggable="false">
          <svg class="sm-paths" id="sm_paths" xmlns="http://www.w3.org/2000/svg"></svg>
          <div class="sm-markers" id="sm_markers"></div>
        </div>
        <div class="sm-empty sm-ui" id="sm_empty">
          <div id="sm_empty_text"></div>
          <button class="sm-gen-big" id="sm_gen_big"><i class="fa-solid fa-rotate"></i></button>
        </div>
        <div class="sm-tools sm-ui" id="sm_tools">
          <div class="sm-toolrow">
            <button data-tool="labels" title="${esc(t('tipLabels'))}"><i class="fa-solid fa-font"></i></button>
            <button data-tool="pins" title="${esc(t('tipPins'))}"><i class="fa-solid fa-map-pin"></i></button>
            <button data-tool="paths" data-world title="${esc(t('tipPaths'))}"><i class="fa-solid fa-route"></i></button>
            <button data-tool="edit" title="${esc(t('tipEdit'))}"><i class="fa-solid fa-pen"></i></button>
          </div>
          <div class="sm-toolrow" id="sm_addrow">
            <button data-tool="add-label" title="${esc(t('tipAddLabel'))}"><i class="fa-solid fa-i-cursor"></i></button>
            <button data-tool="add-pin" title="${esc(t('tipAddPin'))}"><i class="fa-solid fa-location-crosshairs"></i></button>
            <button data-tool="add-path" data-world title="${esc(t('tipAddPath'))}"><i class="fa-solid fa-draw-polygon"></i></button>
          </div>
        </div>
        <div class="sm-zoom sm-ui" id="sm_zoom">
          <button data-z="in" title="${esc(t('zoomIn'))}"><i class="fa-solid fa-plus"></i></button>
          <button data-z="out" title="${esc(t('zoomOut'))}"><i class="fa-solid fa-minus"></i></button>
          <button data-z="fit" title="${esc(t('zoomFit'))}"><i class="fa-solid fa-expand"></i></button>
        </div>
        <div class="sm-pop sm-ui" id="sm_pop" hidden>
          <div class="sm-pop-head"><b id="sm_pop_title"></b><button id="sm_pop_close"><i class="fa-solid fa-xmark"></i></button></div>
          <div class="sm-pp" data-m="pin">
            ${sel('sm_pop_type', PIN_TYPES.map(x => opt(x, t('type_' + x))).join(''))}
          </div>
          <input id="sm_pop_name" class="text_pole" data-f="name">
          <div class="sm-pp" data-m="pin"><textarea id="sm_pop_note" class="text_pole" data-f="note" rows="2" placeholder="${esc(t('fNote'))}"></textarea></div>
          <div class="sm-pp" data-m="label">
            <label class="sm-pop-row"><span>${esc(t('fSize'))}</span>${sel('sm_pop_size', ['l', 'm', 's'].map(x => opt(x, t('size_' + x))).join(''))}</label>
            <label class="sm-pop-row"><span>${esc(t('fAngle'))}</span><input id="sm_pop_angle" data-f="angle" type="range" min="-80" max="80" step="1"></label>
          </div>
          <div class="sm-pp" data-m="path">
            <label class="sm-pop-row"><span>${esc(t('fStyle'))}</span>${sel('sm_pop_style', opt('solid', t('path_solid')) + opt('dashed', t('path_dashed')))}</label>
            <label class="sm-pop-row"><span>${esc(t('fWidth'))}</span><input id="sm_pop_width" data-f="width" type="range" min="1" max="14" step="1"></label>
            <label class="sm-pop-row"><span>${esc(t('fColor'))}</span><input id="sm_pop_color" data-f="color" type="color"></label>
            <button id="sm_pop_undo" class="sm-btn"><i class="fa-solid fa-rotate-left"></i><span>${esc(t('undoPoint'))}</span></button>
          </div>
          <button id="sm_pop_del" class="sm-btn"><i class="fa-solid fa-trash"></i><span>${esc(t('del'))}</span></button>
        </div>
        <div class="sm-loading sm-ui" id="sm_loading" hidden>
          <div class="sm-spin"></div>
          <div id="sm_status"></div>
          <button class="sm-btn" id="sm_cancel">${esc(t('cancel'))}</button>
        </div>
      </div>
      <div class="sm-panel">
        <label class="sm-field"><span>${esc(t('style'))}</span>
          <select id="sm_style" class="text_pole">${STYLES.map(s => `<option value="${s}">${esc(t('style_' + s))}</option>`).join('')}</select>
        </label>
        <label class="sm-field"><span>${esc(t('extra'))}</span>
          <textarea id="sm_extra" class="text_pole" rows="3"></textarea>
        </label>
        <button id="sm_gen" class="sm-btn sm-primary"><i class="fa-solid fa-rotate"></i><span id="sm_gen_label"></span></button>
        <div class="sm-versions" id="sm_versions">
          <button id="sm_prev"><i class="fa-solid fa-chevron-left"></i></button>
          <span id="sm_ver"></span>
          <button id="sm_next"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div class="sm-group" id="sm_group">
          <button id="sm_an_labels" class="sm-btn"><i class="fa-solid fa-font"></i><span>${esc(t('anLabels'))}</span></button>
          <button id="sm_an_pins" class="sm-btn"><i class="fa-solid fa-map-pin"></i><span>${esc(t('anPins'))}</span></button>
          <div class="sm-clears">
            <button id="sm_clr_labels" class="sm-link">${esc(t('clrLabels'))}</button>
            <button id="sm_clr_pins" class="sm-link">${esc(t('clrPins'))}</button>
            <button id="sm_clr_paths" class="sm-link" data-world>${esc(t('clrPaths'))}</button>
          </div>
          <button id="sm_export" class="sm-btn"><i class="fa-solid fa-download"></i><span>${esc(t('export'))}</span></button>
        </div>
        <button id="sm_prompt_btn" class="sm-btn"><i class="fa-solid fa-code"></i><span></span></button>
        <textarea id="sm_prompt" class="text_pole" readonly hidden rows="7"></textarea>
      </div>
    </div>
  </div>
</div>`;
}

const labelHtml = l => `<div class="sm-lb sm-drag sm-lb-${l.size}" data-t="label" data-id="${esc(l.id)}" style="left:${l.x * 100}%;top:${l.y * 100}%;--a:${l.angle || 0}deg"><div class="sm-lb-in">${esc(l.name)}</div></div>`;
const pinHtml = m => `<div class="sm-mk sm-drag sm-mk-${m.type}" data-t="pin" data-id="${esc(m.id)}" style="left:${m.x * 100}%;top:${m.y * 100}%"><div class="sm-mk-in"><span class="sm-mk-pin">${pinSvg(m.type)}</span><span class="sm-mk-name">${esc(m.name)}</span></div></div>`;
const vertexHtml = (p, i) => `<div class="sm-pv sm-drag" data-t="vertex" data-id="${esc(p.id)}" data-i="${i}" style="left:${p.points[i][0] * 100}%;top:${p.points[i][1] * 100}%"><span></span></div>`;

function pathsInner(paths, iw, ih) {
    return paths.filter(p => (p.points || []).length >= 2).map(p => {
        const pts = p.points.map(([x, y]) => `${(x * iw).toFixed(1)},${(y * ih).toFixed(1)}`).join(' ');
        return `<g data-pid="${esc(p.id)}"><polyline class="sm-path${p.style === 'dashed' ? ' dashed' : ''}" points="${pts}" style="--w:${p.width || 4};stroke:${esc(p.color || '#b8420f')}"/><polyline class="sm-path-hit" data-id="${esc(p.id)}" points="${pts}"/></g>`;
    }).join('');
}

/* ------------------------------------------------ rendering */

function setLoading(on, text = '') {
    $q('#sm_loading').prop('hidden', !on);
    $q('#sm_status').text(text);
}

function renderOverlay() {
    if (!state.open || !state.viewer) return;
    const s = getSettings();
    const kind = state.tab;
    const v = state.viewer;
    const font = FONTS[s.labelFont] || FONTS.auto;
    ensureFont(s.labelFont);

    const vp = document.getElementById('sm_vp');
    vp.style.setProperty('--sm-font', font.stack);
    vp.style.setProperty('--sm-fstyle', font.style);
    vp.style.setProperty('--sm-fweight', font.weight);
    vp.dataset.lt = s.labelTheme;
    $(vp).toggleClass('sm-edit', state.edit).toggleClass('sm-adding', !!state.adding)
        .toggleClass('sm-hide-labels', !state.show.labels).toggleClass('sm-hide-pins', !state.show.pins).toggleClass('sm-hide-paths', !state.show.paths);

    const labels = S.labels.of(kind), pins = S.pins.of(kind);
    const paths = tabIsWorld() ? S.paths.of(kind) : [];

    const svg = document.getElementById('sm_paths');
    const iw = v.iw || 1, ih = v.ih || 1;
    svg.setAttribute('viewBox', `0 0 ${iw} ${ih}`);
    svg.setAttribute('width', iw);
    svg.setAttribute('height', ih);
    svg.innerHTML = pathsInner(paths, iw, ih);

    const pathNames = paths.filter(p => p.name && (p.points || []).length >= 2).map(p => {
        const [x, y] = p.points[Math.floor(p.points.length / 2)];
        return `<div class="sm-lb sm-lb-s sm-pathname" style="left:${x * 100}%;top:${y * 100}%;--a:0deg"><div class="sm-lb-in">${esc(p.name)}</div></div>`;
    }).join('');
    const handles = paths.filter(p => state.drawingPath === p.id || (state.edit && state.pop?.mode === 'path' && state.pop.id === p.id))
        .map(p => p.points.map((_, i) => vertexHtml(p, i)).join('')).join('');
    $q('#sm_markers').html(labels.map(labelHtml).join('') + pathNames + pins.map(pinHtml).join('') + handles);

    $q('[data-tool="labels"]').toggleClass('on', state.show.labels);
    $q('[data-tool="pins"]').toggleClass('on', state.show.pins);
    $q('[data-tool="paths"]').toggleClass('on', state.show.paths);
    $q('[data-tool="edit"]').toggleClass('on', state.edit);
    $q('#sm_addrow').prop('hidden', !state.edit);
    $q('[data-tool="add-label"]').toggleClass('on', state.adding === 'label');
    $q('[data-tool="add-pin"]').toggleClass('on', state.adding === 'pin');
    $q('[data-tool="add-path"]').toggleClass('on', state.adding === 'path');
    $q('[data-world]').prop('hidden', !tabIsWorld());
    if (!state.edit) $q('#sm_addrow').prop('hidden', true);
}

async function showImage(url) {
    if (state.shownUrl === url) return;
    state.shownUrl = url;
    try {
        await state.viewer.setImage(url);
        renderOverlay(); // needs the image size for the path layer
    } catch {
        state.shownUrl = null;
        toastr.error(t('imgLoadErr'));
    }
}

function render() {
    if (!state.open) return;
    const s = getSettings();
    const kind = state.tab;
    const m = getMap(kind);
    const item = currentItem(kind);

    $q('.sm-tab').each(function () { $(this).toggleClass('active', $(this).data('tab') === kind); });
    $q('#sm_style').val(m?.style || s.defaultStyle);
    $q('#sm_extra').val(m?.extra || '').attr('placeholder', t(kind === 'world' ? 'extraPhWorld' : 'extraPhScene'));
    $q('#sm_gen_label').text(' ' + t(item ? 'regen' : 'create'));
    $q('#sm_gen, #sm_gen_big').prop('disabled', !m || state.busy);
    $q('#sm_group').prop('hidden', !item).find('button').prop('disabled', state.busy);
    $q('[data-world]').prop('hidden', !tabIsWorld());
    $q('.sm-panel select, .sm-panel textarea:not(#sm_prompt)').prop('disabled', !m);

    const hasImg = !!item;
    $q('#sm_empty').prop('hidden', hasImg);
    $q('#sm_empty_text').text(m ? t(kind === 'world' ? 'emptyWorld' : 'emptyScene') : t('noChat'));
    $q('#sm_zoom, #sm_tools').prop('hidden', !hasImg);
    $q('#sm_stage').toggle(hasImg);

    const n = m?.items.length || 0;
    $q('#sm_versions').prop('hidden', n < 2);
    $q('#sm_ver').text(n ? `${m.cur + 1} / ${n}` : '');
    $q('#sm_prev').prop('disabled', !m || m.cur <= 0);
    $q('#sm_next').prop('disabled', !m || m.cur >= n - 1);

    const $p = $q('#sm_prompt');
    $q('#sm_prompt_btn').prop('hidden', !item).find('span').text(' ' + t($p.prop('hidden') ? 'showPrompt' : 'hidePrompt'));
    $p.val(item?.prompt || '');
    if (!item) $p.prop('hidden', true);

    state.pop = null;
    state.drawingPath = null;
    if (state.adding === 'path') state.adding = null;
    $q('#sm_pop').prop('hidden', true);
    renderOverlay();
    if (item) showImage(item.image);
    else { state.shownUrl = null; state.viewer.clear(); }
}

/* ------------------------------------------------ popup */

const findObj = (mode, id) => (mode === 'pin' ? S.pins : mode === 'label' ? S.labels : S.paths).of(state.tab).find(o => o.id === id);

function openPop(mode, id) {
    const o = findObj(mode, id);
    if (!o) return;
    state.pop = { mode, id };
    const $p = $q('#sm_pop');
    $p.find('.sm-pp').each(function () { $(this).prop('hidden', $(this).data('m') !== mode); });
    $q('#sm_pop_title').text(t(mode === 'pin' ? 'pointTitle' : mode === 'label' ? 'lblTitle' : 'pathTitle'));
    $q('#sm_pop_name').val(o.name || '').attr('placeholder', t(mode === 'path' ? 'pathName' : 'fName'));
    if (mode === 'pin') { $q('#sm_pop_type').val(o.type); $q('#sm_pop_note').val(o.note || ''); }
    if (mode === 'label') { $q('#sm_pop_size').val(o.size); $q('#sm_pop_angle').val(o.angle || 0); }
    if (mode === 'path') { $q('#sm_pop_style').val(o.style); $q('#sm_pop_width').val(o.width); $q('#sm_pop_color').val(o.color); }
    $p.prop('hidden', false);
    renderOverlay();
}

function closePop() {
    if (!state.pop) return;
    state.pop = null;
    $q('#sm_pop').prop('hidden', true);
    renderOverlay();
}

function popChange(el) {
    if (!state.pop) return;
    const { mode, id } = state.pop;
    const f = el.dataset.f;
    let v = el.value;
    if (el.type === 'range') v = Number(v);
    if (f === 'name') v = String(v).trim().slice(0, 60) || (mode === 'path' ? '' : t(mode === 'label' ? 'newLabel' : 'newPoint'));
    if (f === 'note') v = String(v).trim().slice(0, 140);
    (mode === 'pin' ? S.pins : mode === 'label' ? S.labels : S.paths).update(state.tab, id, { [f]: v });
    renderOverlay();
}

/* ------------------------------------------------ actions */

async function runBusy(statusKey, fn) {
    state.busy = true;
    state.abort = new AbortController();
    $q('#sm_gen, #sm_gen_big, #sm_group button').prop('disabled', true);
    setLoading(true, t(statusKey));
    try {
        await fn(state.abort.signal);
    } catch (e) {
        if (e?.name === 'AbortError') toastr.info(t('cancelled'));
        else { console.error('[SillyMap]', e); toastr.error(t('errGen') + (e?.message || e)); }
    } finally {
        state.busy = false;
        state.abort = null;
        if (state.open) { setLoading(false); render(); }
    }
}

async function doLabels(kind, signal) {
    const list = await analyzeLabels(kind, currentItem(kind), signal);
    S.labels.replaceAuto(kind, list);
    return list.length;
}

async function doPins(kind, signal) {
    const list = await analyzePins(kind, currentItem(kind), signal);
    S.pins.replaceAuto(kind, list);
    return list.length;
}

async function onGenerate() {
    if (state.busy) return;
    const s = getSettings();
    const kind = state.tab;
    const m = getMap(kind);
    if (!m) return toastr.warning(t('noChat'));
    if (!imageConfigured()) return toastr.warning(t('noImageApi'));

    const style = m.style || s.defaultStyle;
    const extra = (m.extra || '').trim();
    const useLlm = s.analyze && llmConfigured();
    if (!useLlm && !extra) return toastr.warning(t('needDesc'));

    await runBusy(useLlm ? 'statusAnalyze' : 'statusDraw', async signal => {
        let desc = '';
        if (useLlm) desc = await describeFromChat(kind, signal);
        const prompt = buildImagePrompt(kind, style, desc, extra);
        setLoading(true, t('statusDraw'));
        const img = await generateImage(prompt, kind, signal);
        setLoading(true, t('statusSave'));
        const url = await storeImage(img, kind);
        addItem(kind, { image: url, style, prompt, desc, created: Date.now(), labels: [], markers: [], paths: [] });
        state.shownUrl = null;

        for (const [on, status, fn] of [[s.autoLabels, 'statusLabels', doLabels], [s.autoPins, 'statusPins', doPins]]) {
            if (!on || !llmConfigured()) continue;
            setLoading(true, t(status));
            try { await fn(kind, signal); } catch (e) {
                if (e?.name === 'AbortError') throw e;
                console.error('[SillyMap]', e);
                toastr.error(t('errGen') + (e?.message || e)); // the map itself is kept
            }
        }
        if (!state.open) toastr.success(t('done'));
    });
}

async function onAnalyze(which) {
    if (state.busy || !currentItem(state.tab)) return;
    if (!llmConfigured()) return toastr.warning(t('noLlm'));
    const kind = state.tab;
    await runBusy(which === 'labels' ? 'statusLabels' : 'statusPins', async signal => {
        const n = await (which === 'labels' ? doLabels : doPins)(kind, signal);
        toastr.success(t(which === 'labels' ? 'labelsDone' : 'pinsDone') + n);
    });
}

async function onExport() {
    const item = currentItem(state.tab);
    if (!item) return;
    try { await exportMap(state.tab, item, state.show); toastr.success(t('exportDone')); }
    catch (e) { console.error('[SillyMap]', e); toastr.error(t('exportFail') + (e?.message || '')); }
}

function stagePoint(e) {
    const r = document.getElementById('sm_stage').getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
}

function onMapTap(e) {
    if (!state.adding || !currentItem(state.tab)) return;
    const p = stagePoint(e);
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
    const x = +p.x.toFixed(4), y = +p.y.toFixed(4);
    const kind = state.tab;

    if (state.adding === 'label') {
        const l = { id: newId(), name: t('newLabel'), size: 'm', angle: 0, x, y, auto: false };
        S.labels.add(kind, l);
        state.adding = null;
        openPop('label', l.id);
    } else if (state.adding === 'pin') {
        const m = { id: newId(), type: 'place', name: t('newPoint'), note: '', x, y, auto: false };
        S.pins.add(kind, m);
        state.adding = null;
        openPop('pin', m.id);
    } else if (state.adding === 'path') {
        const st = getSettings();
        if (!state.drawingPath) {
            const path = { id: newId(), name: '', points: [[x, y]], style: st.pathStyle, width: st.pathWidth, color: st.pathColor, auto: false };
            S.paths.add(kind, path);
            state.drawingPath = path.id;
            openPop('path', path.id);
        } else {
            const path = S.paths.of(kind).find(q => q.id === state.drawingPath);
            if (path) S.paths.update(kind, path.id, { points: [...path.points, [x, y]] });
            renderOverlay();
        }
    }
    renderOverlay();
}

function setPathGeometry(id, pts) {
    const iw = state.viewer.iw, ih = state.viewer.ih;
    const str = pts.map(([x, y]) => `${(x * iw).toFixed(1)},${(y * ih).toFixed(1)}`).join(' ');
    document.querySelectorAll(`#sm_paths g[data-pid="${CSS.escape(id)}"] polyline`).forEach(pl => pl.setAttribute('points', str));
}

function insertVertex(id, e) {
    const path = S.paths.of(state.tab).find(p => p.id === id);
    if (!path) return;
    const iw = state.viewer.iw, ih = state.viewer.ih;
    const q = stagePoint(e);
    const px = q.x * iw, py = q.y * ih;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < path.points.length - 1; i++) {
        const [ax, ay] = [path.points[i][0] * iw, path.points[i][1] * ih];
        const [bx, by] = [path.points[i + 1][0] * iw, path.points[i + 1][1] * ih];
        const dx = bx - ax, dy = by - ay;
        const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
        const d = Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
        if (d < bestD) { bestD = d; best = i; }
    }
    const pts = [...path.points];
    pts.splice(best + 1, 0, [+clamp01(q.x).toFixed(4), +clamp01(q.y).toFixed(4)]);
    S.paths.update(state.tab, id, { points: pts });
    renderOverlay();
}

/* ------------------------------------------------ events */

function confirmClear(store, key, label) {
    if (!store.of(state.tab).length || !window.confirm(t(label))) return;
    store.clear(state.tab);
    render();
}

function bindWindow() {
    const $o = $('#sm_overlay');
    $o.on('click', '.sm-close', closeWindow);
    $o.on('click', '.sm-tab', function () { state.tab = $(this).data('tab'); state.adding = null; render(); });
    $o.on('click', '#sm_gen, #sm_gen_big', onGenerate);
    $o.on('click', '#sm_an_labels', () => onAnalyze('labels'));
    $o.on('click', '#sm_an_pins', () => onAnalyze('pins'));
    $o.on('click', '#sm_clr_labels', () => confirmClear(S.labels, 'labels', 'confirmLabels'));
    $o.on('click', '#sm_clr_pins', () => confirmClear(S.pins, 'pins', 'confirmPins'));
    $o.on('click', '#sm_clr_paths', () => confirmClear(S.paths, 'paths', 'confirmPaths'));
    $o.on('click', '#sm_export', onExport);
    $o.on('click', '#sm_cancel', () => state.abort?.abort());
    $o.on('change', '#sm_style', function () { setField(state.tab, 'style', this.value); });
    $o.on('change', '#sm_extra', function () { setField(state.tab, 'extra', this.value); });
    $o.on('click', '#sm_prompt_btn', () => { $q('#sm_prompt').prop('hidden', (_, v) => !v); render(); });
    $o.on('click', '#sm_prev', () => { const m = getMap(state.tab); if (m) { setCur(state.tab, m.cur - 1); render(); } });
    $o.on('click', '#sm_next', () => { const m = getMap(state.tab); if (m) { setCur(state.tab, m.cur + 1); render(); } });
    $o.on('click', '#sm_zoom button', function () {
        const z = $(this).data('z');
        if (z === 'in') state.viewer.zoomBy(1.4);
        else if (z === 'out') state.viewer.zoomBy(1 / 1.4);
        else state.viewer.fit();
    });
    $o.on('mousedown', function (e) { if (e.target === this) closeWindow(); });

    // tools
    $o.on('click', '#sm_tools button', function () {
        const tool = $(this).data('tool');
        if (tool === 'labels' || tool === 'pins' || tool === 'paths') state.show[tool] = !state.show[tool];
        else if (tool === 'edit') { state.edit = !state.edit; if (!state.edit) { state.adding = null; state.drawingPath = null; } }
        else if (tool.startsWith('add-')) {
            const mode = tool.slice(4);
            state.adding = state.adding === mode ? null : mode;
            if (state.adding !== 'path') state.drawingPath = null;
        }
        renderOverlay();
    });

    // popup
    $o.on('click', '#sm_pop_close', closePop);
    $o.on('change', '#sm_pop [data-f]', function () { popChange(this); });
    $o.on('input', '#sm_pop input[type="range"], #sm_pop input[type="color"]', function () { popChange(this); });
    $o.on('click', '#sm_pop_undo', () => {
        if (state.pop?.mode !== 'path') return;
        const p = S.paths.of(state.tab).find(q => q.id === state.pop.id);
        if (!p) return;
        if (p.points.length <= 1) { S.paths.del(state.tab, p.id); state.drawingPath = null; closePop(); return; }
        S.paths.update(state.tab, p.id, { points: p.points.slice(0, -1) });
        renderOverlay();
    });
    $o.on('click', '#sm_pop_del', () => {
        if (!state.pop) return;
        const { mode, id } = state.pop;
        (mode === 'pin' ? S.pins : mode === 'label' ? S.labels : S.paths).del(state.tab, id);
        if (state.drawingPath === id) state.drawingPath = null;
        state.pop = null;
        $q('#sm_pop').prop('hidden', true);
        renderOverlay();
    });

    // names, pins and path vertices: tap = popup, drag (edit mode) = move
    let drag = null;
    let suppressClick = false;
    $o.on('pointerdown', '.sm-drag', function (e) {
        if (!state.edit) return;
        const type = this.dataset.t, id = this.dataset.id;
        drag = { el: this, type, id, idx: Number(this.dataset.i), pid: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, fx: 0, fy: 0 };
        if (type === 'vertex') drag.pts = S.paths.of(state.tab).find(p => p.id === id).points.map(q => [...q]);
        try { this.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        e.preventDefault();
    });
    $o.on('pointermove', '.sm-drag', function (e) {
        if (!drag || e.pointerId !== drag.pid) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
        drag.moved = true;
        const p = stagePoint(e);
        drag.fx = clamp01(p.x);
        drag.fy = clamp01(p.y);
        this.style.left = drag.fx * 100 + '%';
        this.style.top = drag.fy * 100 + '%';
        if (drag.type === 'vertex') { drag.pts[drag.idx] = [drag.fx, drag.fy]; setPathGeometry(drag.id, drag.pts); }
    });
    $o.on('pointerup pointercancel', '.sm-drag', function (e) {
        if (!drag || e.pointerId !== drag.pid) return;
        const d = drag;
        drag = null;
        if (!d.moved) return;
        const x = +d.fx.toFixed(4), y = +d.fy.toFixed(4);
        if (d.type === 'pin') S.pins.update(state.tab, d.id, { x, y });
        else if (d.type === 'label') S.labels.update(state.tab, d.id, { x, y });
        else S.paths.update(state.tab, d.id, { points: d.pts.map(([a, b]) => [+a.toFixed(4), +b.toFixed(4)]) });
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
    });
    $o.on('click', '.sm-drag', function () {
        if (suppressClick) return;
        const type = this.dataset.t;
        if (type === 'pin' || type === 'label') openPop(type, this.dataset.id);
    });

    // paths: tap on a line = settings, tap again on the selected line (edit mode) = insert a vertex
    $o.on('click', '.sm-path-hit', function (e) {
        const id = $(this).attr('data-id');
        if (state.adding === 'path') return onMapTap(e);
        if (state.edit && state.pop?.mode === 'path' && state.pop.id === id) insertVertex(id, e);
        else openPop('path', id);
    });
}

function onKey(e) {
    if (e.key !== 'Escape' || !state.open) return;
    if (state.pop) closePop();
    else if (state.adding) { state.adding = null; state.drawingPath = null; renderOverlay(); }
    else closeWindow();
}

export function openWindow() {
    if (state.open) return;
    $('#sm_overlay').remove();
    $('body').append(windowHtml());
    state.open = true;
    state.shownUrl = null;
    state.pop = null;
    state.adding = null;
    state.drawingPath = null;
    state.viewer = new Viewer(document.getElementById('sm_vp'), document.getElementById('sm_stage'));
    state.viewer.onTap = onMapTap;
    bindWindow();
    document.addEventListener('keydown', onKey);
    render();
    if (state.busy) setLoading(true, t('statusDraw'));
}

export function closeWindow() {
    if (!state.open) return;
    state.open = false;
    document.removeEventListener('keydown', onKey);
    state.viewer?.destroy();
    state.viewer = null;
    $('#sm_overlay').remove();
}

export function onChatChanged() {
    if (!state.open) return;
    state.shownUrl = null;
    render();
}
