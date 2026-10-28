import { getSettings } from './core.js';

export const STYLES = ['fantasy', 'medieval', 'paper', 'modern', 'custom'];

const WORLD = {
    medieval: 'A hand-drawn medieval fantasy map on aged yellowed parchment, illustrated like an old storybook atlas: warm brown ink linework with soft watercolour washes in muted ochre, olive green and faded blue, tiny pictorial drawings of castles, villages, churches, trees, hills and mountains, winding rivers, little sailing ships and sea creatures, an ornate compass rose, a decorative frame and an empty ornamental cartouche, stained and weathered paper texture',
    fantasy: 'An epic highly detailed painted fantasy world map (digital matte painting): realistic textured terrain seen from above with snow-capped mountain ranges, dense forests, golden deserts, green plains and volcanic lands, a glowing deep-blue ocean with luminous shorelines and swirling currents, tiny ships and island chains, a dark ornate gothic filigree border with decorative corner ornaments, dramatic cinematic lighting, rich saturated colours',
    paper: 'A monochrome vintage engraved map drawn ONLY with sepia-brown ink on plain cream paper, absolutely no colours besides brown ink and cream paper, no colour fills, no blue water: coastlines drawn as concentric ripple lines, mountains as hatched hand-drawn peaks, forests as tiny stippled tree symbols, rivers as thin double lines, little ships and sea creatures in the sea, an ornate compass rose and a thin double-line decorative border, fine pen-and-ink illustration',
    modern: 'A clean modern digital terrain map in the style of a contemporary atlas or navigation app: flat design, pale blue water, very light grey-white land with subtle soft relief shading, muted green patches for forests and parks, thin orange and yellow roads connecting towns, small dot markers for cities, thin pale borders, crisp lines, minimal and tidy, top-down view',
};

const SCENE = {
    medieval: 'A top-down battle map (strictly overhead view) in a hand-inked storybook style: warm brown ink outlines with soft watercolour washes in muted earthy tones, hand-drawn wooden planks, stone, straw and rugs, aged parchment feel, tabletop roleplaying battlemap look',
    fantasy: 'A top-down battle map (strictly overhead orthographic view) in a rich painterly fantasy art style: detailed hand-painted textures, dramatic warm atmospheric lighting and shadows, lush saturated colours, tabletop roleplaying battlemap',
    paper: 'A top-down floor plan drawn as a monochrome sepia-ink sketch on cream paper (strictly overhead view), absolutely no colours besides brown ink and cream paper, thin pen outlines, hand-drawn hatching for shadows and textures, architect\'s notebook style',
    modern: 'A clean modern top-down plan (strictly overhead view), flat vector illustration with a light neutral palette, crisp thin lines, realistic proportions, like an architectural floor plan or city-navigation plan',
};

const TAIL = 'Absolutely no text, no letters, no numbers, no labels, no captions, no logos, no watermark, no UI elements, no people or characters. The artwork must be free of any lettering.';

export function buildImagePrompt(kind, style, desc, extra) {
    const table = kind === 'world' ? WORLD : SCENE;
    let base = table[style];
    if (style === 'custom' || !base) {
        const custom = (getSettings().customStyle || '').trim();
        base = (kind === 'world' ? 'A map of a whole world seen from above, ' : 'A top-down overhead battle map of a location, ') + (custom || 'illustrated artwork');
    }
    const parts = [base + '.'];
    if (desc) parts.push(`Subject: ${desc}`);
    if (extra) parts.push(`Additional wishes from the user: ${extra}`);
    parts.push(TAIL);
    return parts.join(' ');
}

export function describeSystem(kind) {
    if (kind === 'world') {
        return [
            'You assist with a roleplay map. From the roleplay material, write a visual description of the WORLD geography for an image generator.',
            'One paragraph, 80-140 words, in English.',
            'Cover: overall shape (continents, islands, seas), terrain types (mountain ranges, forests, deserts, rivers, lakes), climate zones, where the main regions lie (north, south, coast, inland), and visible signs of civilization (cities, ports, roads, ruins) matching the setting and its technology level.',
            'If the material does not describe the world, invent a coherent one that fits the genre and tone.',
            'Do NOT use proper names. Do NOT mention characters. Do NOT mention text, labels or captions.',
            'Output only the description.',
        ].join('\n');
    }
    return [
        'You assist with a roleplay map. From the roleplay material, write a visual description of the CURRENT LOCATION where the scene takes place, as seen from directly above (top-down battle map).',
        'One paragraph, 80-140 words, in English.',
        'Cover: type and size of the place (room, building, street, camp, clearing...), layout, walls, doors, windows, furniture and notable objects, ground or floor material, light sources, time of day, mood.',
        'Do NOT mention any characters or creatures. Do NOT use proper names. Do NOT mention text, labels or captions.',
        'Output only the description.',
    ].join('\n');
}

const COMMON = [
    'You work on a roleplay map. You receive the map image, the map description, the characters and story material.',
    'Reply with ONE JSON object only (no markdown, no comments).',
    'x and y are percentages (0-100) of the image width and height, measured from the TOP-LEFT corner of the image. Keep objects between 3 and 97 and do not stack them on top of each other.',
    'Write names and notes in the language of the story.',
];

export function labelsSystem(kind, count) {
    const rules = kind === 'world' ? [
        `Task: place TEXT LABELS (names of geographic features). Format: {"labels":[{"name":string,"x":number,"y":number,"size":"l|m|s","angle":number}]}`,
        'size "l": large regions, seas, oceans, mountain ranges, big forests (up to 6). Put them at the centre of the area. For elongated features set "angle" (degrees, -60..60) so the text follows the feature; otherwise 0.',
        `size "m": cities, towns, ports, fortresses (up to ${count}).`,
        `size "s": small features such as rivers, lakes, passes and villages (up to ${Math.max(2, Math.round(count / 2))}).`,
        'Prefer names from the story or lorebook; if there are too few, invent fitting names for prominent visible features. Put each label centred right on or next to the feature it names.',
        'Labels only: no pins, no characters.',
    ] : [
        'Task: place TEXT LABELS naming the parts of this local map. Format: {"labels":[{"name":string,"x":number,"y":number,"size":"m|s","angle":0}]}',
        `Name rooms, areas and notable objects in a natural human way (e.g. "Main hall", "Garden"), up to ${count} labels. size "m" for rooms and areas, "s" for objects. Put each label at the centre of what it names.`,
        'Labels only: no pins, no characters.',
    ];
    return [...COMMON, ...rules].join('\n');
}

export function pinsSystem(kind, count) {
    const head = 'Task: place PINS (points of interest). Format: {"markers":[{"type":"place|hero|visited|danger|quest","name":string,"x":number,"y":number,"note":string}]}. "name" is short (1-3 words); "note" is at most 14 words and explains what the pin is or who is there.';
    const rules = kind === 'world' ? [
        head,
        `"place": up to ${count} specific points of interest from the story (a tavern, a camp, a gate, a ruin, a shop...). If a point is inside a named place from the existing labels, put the pin right next to that label's coordinates.`,
        '"hero": where each character (or a travelling group, named together) is RIGHT NOW according to the story. At most one hero pin per character or group.',
        '"visited": up to 6 places the characters have already been to earlier in the story (not the current one).',
        '"danger": known threats (monsters, enemies, traps, war zones) if the story mentions any. "quest": goals or objectives of the characters if the story mentions any.',
        'Do not repeat the names of existing labels as pins unless the pin marks a distinct spot.',
    ] : [
        head,
        `"place": up to ${count} specific points of interest in the scene (a table, a door, a chest, stairs...).`,
        '"hero": where each character currently stands or sits in the scene according to the story, on the matching spot of the map.',
        '"danger" and "quest" are allowed when the story calls for them. Do not use "visited".',
    ];
    return [...COMMON, ...rules].join('\n');
}
