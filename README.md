# SillyMap

**Русский** | [English below](#english)

Карты мира и локаций для ролевых игр в SillyTavern. Нейросеть анализирует чат, описывает мир или текущее место, а генератор картинок рисует карту в выбранном стиле.

## Возможности (v0.3)
- Открывается из меню волшебной палочки: **SillyMap**.
- Две вкладки: **Мир** и **Локация**.
- Стили: фэнтези, средневековье, бумага, современность и свой стиль. Есть пожелания к карте и просмотр итогового промпта.
- Зум колёсиком/кнопками, перемещение, щипок и свайп на телефоне, двойной клик.
- История версий карты (до 12), переключение стрелками.
- Карта мира привязывается к чату или к персонажу (настройка), карта локации всегда к чату.
- Картинки сохраняются на сервере SillyTavern (user files), в данных чата лежит только ссылка.
- Два отдельных API: для картинок (OpenAI-совместимый или Google Gemini/Imagen) и для анализа чата (OpenAI-совместимый текстовый).
- Русский и английский интерфейс.
- **Источники анализа** (в настройках): чат / чат + лорбук / чат + лорбук + карточка персонажа. Берутся лорбук чата и лорбук персонажа.
- **Названия, точки и пути создаются отдельно**: модель с поддержкой изображений расставляет *названия* (регионы, города, моря; крупные, средние, мелкие, с поворотом), отдельно *точки* (место, герой, посещённое, опасность, цель, с заметкой). Всё можно добавлять, переименовывать, перетаскивать и удалять. Вручную правленное не затирается повторным анализом.
- **Пути** на карте мира: рисуются по точкам, сплошные или пунктиром, любой толщины и цвета; точки пути можно двигать, на линию можно добавлять новые.
- **Шрифты названий**: системный, курсив, с завитками, с засечками.
- **Сохранение картинкой**: карта вместе с названиями, точками и путями скачивается PNG.
- Стили карт переработаны: средневековье (пергамент и акварель), фэнтези (живопись), бумага (только сепия, без цвета), современность (чистая карта-атлас).

## Приватность
Расширение использует **только собственные API** из своих настроек. Оно **не читает и не использует** API-подключения и ключи SillyTavern.

## Установка
`Extensions → Install extension`:
```
https://github.com/Ayrissa/SillyMap
```

## Настройка
1. `Extensions → SillyMap`: заполните API для картинок (адрес, ключ, модель) и, по желанию, API анализа.
2. В чате откройте волшебную палочку → SillyMap → нажмите кнопку обновления.

> Запросы идут из браузера напрямую; если провайдер блокирует их (CORS), выберите другой. Названия на карте нейросети рисуют плохо, поэтому в промптах стоит запрет на текст; подписи будут накладываться расширением (в планах).

## Планы
идеи: стрелки на путях, свои значки, экспорт в JSON.

---

## English

AI-generated world and location maps for SillyTavern roleplay. A text model analyzes the chat and describes the world or current place; an image model draws the map in the chosen style.

### Features (v0.3)
- Opens from the wand menu: **SillyMap**. Two tabs: **World** and **Location**.
- Styles: fantasy, medieval, paper, modern, custom. Map wishes and prompt preview.
- Zoom (wheel/buttons/pinch), pan, double-click.
- Version history (up to 12) with arrows.
- World map bound to the chat or the character (setting); the location map is always per chat.
- Images are stored on the SillyTavern server (user files); chat data only keeps a link.
- Two separate APIs: images (OpenAI-compatible or Google Gemini/Imagen) and chat analysis (OpenAI-compatible text).
- Russian and English UI.
- **Analysis sources** (settings): chat / chat + lorebook / chat + lorebook + character card. Uses the chat's lorebook and the character's lorebook.
- **Names, pins and paths are created separately**: a vision-capable model places *names* (regions, cities, seas; large/medium/small, rotatable) and, separately, *pins* (place, hero, visited, danger, quest, with a note). Everything can be added, renamed, dragged and deleted. Manual edits survive re-analysis.
- **Paths** on the world map: drawn point by point, solid or dashed, any width and color; points can be dragged and new ones inserted.
- **Names fonts**: system, italic, ornate, serif.
- **Save as image**: PNG with names, pins and paths baked in.
- Reworked map styles: medieval (parchment and watercolour), fantasy (painted), paper (sepia only, no colour), modern (clean atlas).

### Privacy
Uses **only its own APIs**. Never reads SillyTavern's API connections or keys.

### Install
`Extensions → Install extension`: `https://github.com/Ayrissa/SillyMap`

### Roadmap
ideas: arrows on paths, custom icons, JSON export.

## License
MIT © Ayrissa
