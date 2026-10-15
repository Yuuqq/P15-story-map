# P15-story-map Code Review

## Executive Summary
The codebase is a lightweight client-side mapping tool using Leaflet. The architecture is clean, and the deliberate constraint to run purely on the client-side removes many traditional backend security and privacy risks. The custom offline grid layer is a smart fallback. One production foot-gun remains: with shared v2.6 chrome loaded, the demo button destroys the current point JSON and fires five failed renders.

## CRITICAL
*None discovered.* The application being purely client-side without sensitive data handling mitigates most critical risks.

## HIGH

### 1. Destructive Demo Feature Logic
**File**: `app.js` (lines 326-347)
**Impact**: The "🗺️ 加载示例新闻地图" (Load Demo News Map) button does not write the app's `[{lat, lng, title, desc}]` JSON. It fills the first matching controls (`input[id*="name"]`, else `input[type="text"]`; `textarea`; `[id*="add"]`, else `button` index 1) and clicks that button once per demo point. The result depends on whether shared chrome is in the DOM.

On a bare page, with the shared loader absent, there is no `input[type="text"]`, so `if (!nameInput || !addBtn) return` drops the click and nothing is added.

On the production page (`../shared/releases/v2.6/loader.js`, modules `dark,cmd,toast,onboarding,pedagogy-p1,pedagogy-p2,nav,kbd`), the selectors resolve differently. `input[id*="name"]` matches nothing, so `nameInput` is the hidden command-palette input (the first `input[type="text"]`, not `.gnav-search`). `lat` / `lng` match nothing. `descInput` is `#jsonInput`. `[id*="add"]` matches nothing, and `querySelectorAll('button')[1]` is `#renderBtn`: index 0 is `.pedagogy-toggle`, because the title `P15 …` mounts the pedagogy panel. Onboarding never inserts its guide; `onboarding.js` only listens for `DOMContentLoaded`, and the loader injects it after that event has already fired. Button order is `.pedagogy-toggle`, `#renderBtn`, `#exportBtn`, the demo button, `#darkToggleBtn`, `.gnav-fab`.

Each of the five points writes that point's `desc` into `#jsonInput` and clicks Render. The textarea is left as plain text (`非物质文化遗产保护深度调查`), the preloaded sample is gone, and `#status` reports `渲染失败` because the text is not JSON. This does not click `#exportBtn` and does not export five PNGs. The handler still sets the button to `✅ 已加载 5 个新闻地点` and removes it. The global-nav ⌘K fab (`z-index: 9998`) covers the demo button's right edge (`z-index: 999`); the rest of the button stays clickable.

**Fix Suggestion**: Refactor the demo button IIFE in `app.js` to avoid DOM selectors completely. Map the demo `points` array to the `[{lat, lng, title, desc}]` schema expected by the application (mapping `name` to `title`), stringify the mapped array, assign it directly to `jsonInput.value`, and then trigger `renderBtn.click()`.

## MEDIUM

### 1. Accessibility (a11y) Anti-Pattern
**File**: `index.html` (lines 42, 51)
**Impact**: Buttons contain both visible Chinese text and an English `aria-label` (e.g., `<button id="renderBtn" type="button" aria-label="render">渲染地图</button>`). The `aria-label` replaces the accessible name, so screen readers and speech input announce "render" / "export" instead of "渲染地图" / "导出高清 PNG", violating WCAG 2.5.3 Label in Name.
**Fix Suggestion**: Remove the `aria-label` entirely if the visible text is adequately descriptive, or localize the `aria-label` to match the visible language (`aria-label="渲染地图"`).

## LOW

### 1. Service Worker comment does not match the fetch handler
**File**: `sw.js` (comment line 49, origin check line 55)
**Impact**: The fetch listener comment says "Network-First for external", but cross-origin requests return immediately and are not cached. That comment/code mismatch is real. It does not defeat the offline map. Leaflet and html2canvas are same-origin `../shared/vendor/*` (on `yuuqq.github.io`, `../shared/` is the same origin) and follow the same-origin cache-first path. The map draws a local canvas coordinate grid (`createCoordinateGridLayer`); this app does not request a tile CDN.
**Fix Suggestion**: Correct the comment so it describes the same-origin cache-first behavior and the cross-origin skip. Do not add caching for external tiles.

### 2. Missing Automated Tests
**File**: Repository level
**Impact**: Relying entirely on manual QA increases the risk of regressions, especially for DOM manipulation and HTML-to-Canvas exports.
**Fix Suggestion**: Introduce a lightweight testing framework (like Playwright) to automate the core workflow: entering JSON, rendering the map, and triggering the export. Include the demo button, because its selectors depend on shared chrome that is not in `index.html`.

## General Architecture Notes
*   **Security**: `innerHTML` is only used to clear elements (`mapEl.innerHTML = ""`), which is safe. Fallback rendering uses secure `textContent` and `createElement` methods. The demo path assigns `.value` and clicks a button; it is not XSS.
*   **Performance**: `html2canvas` is a heavy dependency for screenshots. Using Leaflet's native tile export might be more performant, but given the offline requirements, this approach is acceptable.
*   **Privacy**: Excellent adherence to privacy requirements. No data is sent over the network, and the privacy banner clearly explains this.
