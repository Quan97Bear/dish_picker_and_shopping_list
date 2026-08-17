import './styles.css';
import { loadAppData } from './infrastructure/load-app-data.js';
import { decodeMenu, encodeMenu, normalizeDraft } from './domain/menu-state.js';
import { renderPicker } from './features/picker/picker.js';
import { renderRecipient } from './features/recipient/recipient.js';
import { resetScrollForInstantViewChange } from './shared/route-transition.js';

const root = document.querySelector('#app');

async function start() {
  root.innerHTML = '<main class="loading"><span></span><p>正在准备今晚的菜单…</p></main>';
  try {
    const { index, dishes, aliases } = await loadAppData();
    const validIds = new Set(index.map((dish) => dish.id));
    const state = decodeMenu(location.search, validIds, aliases);
    const map = new Map(dishes.map((dish) => [dish.id, dish]));
    if (state.mode === 'recipient') {
      renderRecipient(root, { dishes: state.ids.map((id) => map.get(id)).filter(Boolean), servings: state.servings, notes: state.notes, suggestion: state.suggestion, warnings: state.warnings, menuUrl: window.location.href });
      return;
    }
    let savedDraft = {};
    try { savedDraft = JSON.parse(localStorage.getItem('home-menu-draft') || '{}'); } catch {}
    const draft = normalizeDraft(savedDraft, validIds);
    renderPicker(root, {
      index,
      dishes,
      initialSelected: draft.selected,
      initialServings: draft.servings,
      initialNotes: draft.notes,
      initialSuggestion: draft.suggestion,
      makeUrl: encodeMenu,
      onComplete: ({ ids, servings, notes, suggestion, url }) => {
        resetScrollForInstantViewChange();
        history.pushState({ mode: 'recipient' }, '', url);
        renderRecipient(root, {
          dishes: ids.map((id) => map.get(id)).filter(Boolean),
          servings,
          notes,
          suggestion,
          warnings: [],
          menuUrl: url
        });
      }
    });
  } catch (error) {
    root.innerHTML = `<main class="error-state"><span>🍚</span><h1>菜谱暂时没端上来</h1><p>${error.message}</p><button class="button primary" onclick="location.reload()">重试</button></main>`;
  }
}

start();
