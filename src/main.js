import './styles.css';
import { loadAppData } from './data.js';
import { decodeMenu, encodeMenu } from './menu-state.js';
import { renderPicker } from './ui/picker.js';
import { renderRecipient } from './ui/recipient.js';

const root = document.querySelector('#app');

async function start() {
  root.innerHTML = '<main class="loading"><span></span><p>正在准备今晚的菜单…</p></main>';
  try {
    const { index, dishes, aliases } = await loadAppData();
    const validIds = new Set(index.map((dish) => dish.id));
    const state = decodeMenu(location.search, validIds, aliases);
    if (state.mode === 'recipient') {
      const map = new Map(dishes.map((dish) => [dish.id, dish]));
      renderRecipient(root, { dishes: state.ids.map((id) => map.get(id)).filter(Boolean), servings: state.servings, notes: state.notes, suggestion: state.suggestion, warnings: state.warnings });
      return;
    }
    let draft = { selected: [], servings: 2, notes: {}, suggestion: '' };
    try { draft = { ...draft, ...JSON.parse(localStorage.getItem('home-menu-draft') || '{}') }; } catch {}
    renderPicker(root, { index, initialSelected: draft.selected.filter((id) => validIds.has(id)), initialServings: draft.servings, initialNotes: draft.notes, initialSuggestion: draft.suggestion, makeUrl: encodeMenu });
  } catch (error) {
    root.innerHTML = `<main class="error-state"><span>🍚</span><h1>菜谱暂时没端上来</h1><p>${error.message}</p><button class="button primary" onclick="location.reload()">重试</button></main>`;
  }
}

start();
