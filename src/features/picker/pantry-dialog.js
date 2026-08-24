import {
  getCommonPantryIngredients,
  matchDishesByPantry,
  searchPantryIngredients
} from '../../domain/pantry-matcher.js';

const CATEGORY_EMOJI = { vegetable: '🥬', meat: '🥩', mixed: '🍲', stew: '🥘', soup: '🥣' };
const RESULT_GROUPS = [
  ['ready', '现在就能做'],
  ['missingOne', '还差 1 样'],
  ['missingTwo', '还差 2 样'],
];

export function createPantryDialog({
  dishes,
  guide,
  avoid,
  selectedKeys = [],
  menuSelectedIds = [],
  onSelectionChange,
  onAddDish,
  onClose,
}) {
  const guideByKey = new Map(guide.ingredients.map((ingredient) => [ingredient.key, ingredient]));
  const currentKeys = new Set(selectedKeys);
  const menuSelected = new Set(menuSelectedIds);
  const expandedGroups = new Set();
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop pantry-backdrop';
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) onClose();
  });

  const dialog = document.createElement('section');
  dialog.className = 'drawer pantry-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'pantry-title');
  dialog.tabIndex = -1;
  dialog.innerHTML = `<div class="drawer-handle"></div>
    <div class="section-heading pantry-heading">
      <div><span class="eyebrow">家里有什么</span><h2 id="pantry-title">看看家里能做什么</h2></div>
      <button class="icon-button" type="button" data-close-pantry aria-label="关闭已有食材找菜">×</button>
    </div>
    <label class="pantry-search"><span aria-hidden="true">⌕</span><span class="sr-only">搜索已有食材</span><input type="search" placeholder="搜索食材，例如番茄" autocomplete="off" enterkeyhint="done"></label>
    <section class="pantry-selected" aria-labelledby="pantry-selected-title">
      <div class="pantry-section-heading"><strong id="pantry-selected-title">家里有</strong><div><small></small><button type="button" data-clear-pantry>清空</button></div></div>
      <div class="pantry-selected-tags"></div>
    </section>
    <section class="pantry-options" aria-labelledby="pantry-options-title">
      <div class="pantry-section-heading"><strong id="pantry-options-title">常见食材</strong><small>可多选</small></div>
      <div class="pantry-option-chips"></div>
    </section>
    <section class="pantry-results" aria-label="可做菜品" aria-live="polite"></section>`;

  const search = dialog.querySelector('.pantry-search input');
  const selectedCount = dialog.querySelector('.pantry-selected small');
  const clear = dialog.querySelector('[data-clear-pantry]');
  const selectedTags = dialog.querySelector('.pantry-selected-tags');
  const optionsTitle = dialog.querySelector('#pantry-options-title');
  const optionChips = dialog.querySelector('.pantry-option-chips');
  const resultsRoot = dialog.querySelector('.pantry-results');

  const notifySelection = () => onSelectionChange([...currentKeys]);

  const renderSelected = () => {
    selectedCount.textContent = `已选 ${currentKeys.size} 样`;
    clear.hidden = currentKeys.size === 0;
    selectedTags.replaceChildren();
    if (!currentKeys.size) {
      const empty = document.createElement('p');
      empty.className = 'pantry-empty-copy';
      empty.textContent = '选一两样现有食材，就能看到可以做的菜。';
      selectedTags.append(empty);
      return;
    }
    for (const key of currentKeys) {
      const ingredient = guideByKey.get(key);
      if (!ingredient) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pantry-selected-chip';
      button.setAttribute('aria-label', `移除已有食材：${ingredient.name}`);
      button.innerHTML = `<span></span><i aria-hidden="true">×</i>`;
      button.querySelector('span').textContent = ingredient.name;
      button.addEventListener('click', () => toggleIngredient(key));
      selectedTags.append(button);
    }
  };

  const renderOptions = () => {
    const query = search.value.trim();
    const options = query
      ? searchPantryIngredients(guide, dishes, query, 20)
      : getCommonPantryIngredients(guide, dishes, 12);
    optionsTitle.textContent = query ? '搜索结果' : '常见食材';
    optionChips.replaceChildren();
    if (!options.length) {
      const empty = document.createElement('p');
      empty.className = 'pantry-empty-copy';
      empty.textContent = '没有找到这个食材，换个名称试试。';
      optionChips.append(empty);
      return;
    }
    for (const ingredient of options) {
      const active = currentKeys.has(ingredient.key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pantry-option-chip';
      button.setAttribute('aria-pressed', String(active));
      button.textContent = `${active ? '✓ ' : ''}${ingredient.name}`;
      button.addEventListener('click', () => toggleIngredient(ingredient.key));
      optionChips.append(button);
    }
  };

  const createResultRow = ({ dish, missingKeys }) => {
    const row = document.createElement('article');
    row.className = 'pantry-result-row';
    const summary = document.createElement('div');
    summary.className = 'pantry-result-summary';
    const emoji = document.createElement('span');
    emoji.className = `pantry-result-emoji art-${dish.category}`;
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = CATEGORY_EMOJI[dish.category];
    const copy = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = dish.name;
    const detail = document.createElement('small');
    detail.textContent = missingKeys.length
      ? `还缺：${missingKeys.map((key) => guideByKey.get(key)?.name || key).join('、')}`
      : '家里现有食材够做';
    copy.append(name, detail);
    const tip = missingKeys.map((key) => guideByKey.get(key))
      .find((ingredient) => ingredient?.purchaseTip);
    if (tip) {
      const purchaseTip = document.createElement('small');
      purchaseTip.className = 'pantry-purchase-tip';
      purchaseTip.textContent = `${tip.name}：${tip.purchaseTip}`;
      copy.append(purchaseTip);
    }
    summary.append(emoji, copy);
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'pantry-result-add';
    const active = menuSelected.has(dish.id);
    add.disabled = active;
    add.textContent = active ? '已加入' : '加入';
    add.setAttribute('aria-label', active ? `已加入菜单：${dish.name}` : `加入菜单：${dish.name}`);
    add.addEventListener('click', () => {
      if (menuSelected.has(dish.id)) return;
      if (onAddDish(dish.id) === false) return;
      menuSelected.add(dish.id);
      renderResults();
    });
    row.append(summary, add);
    return row;
  };

  const renderGroup = (key, title, items) => {
    const section = document.createElement('section');
    section.className = `pantry-result-group pantry-result-${key}`;
    section.setAttribute('aria-labelledby', `pantry-result-${key}-title`);
    const heading = document.createElement('div');
    heading.className = 'pantry-result-heading';
    heading.innerHTML = `<strong id="pantry-result-${key}-title"></strong><small></small>`;
    heading.querySelector('strong').textContent = title;
    heading.querySelector('small').textContent = `${items.length} 道`;
    section.append(heading);
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'pantry-group-empty';
      empty.textContent = key === 'ready' ? '再选一样食材，更容易找到现在就能做的菜。' : '当前没有这一组结果。';
      section.append(empty);
      return section;
    }
    const list = document.createElement('div');
    list.className = 'pantry-result-list';
    const expanded = expandedGroups.has(key);
    for (const item of items.slice(0, expanded ? items.length : 5)) list.append(createResultRow(item));
    section.append(list);
    if (!expanded && items.length > 5) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'pantry-show-more';
      more.textContent = `查看全部 ${items.length} 道`;
      more.addEventListener('click', () => {
        expandedGroups.add(key);
        renderResults();
        dialog.querySelector(`.pantry-result-${key} .pantry-result-heading`)?.scrollIntoView({ block: 'nearest' });
      });
      section.append(more);
    }
    return section;
  };

  const renderResults = () => {
    resultsRoot.replaceChildren();
    if (!currentKeys.size) {
      const empty = document.createElement('div');
      empty.className = 'pantry-results-empty';
      empty.innerHTML = '<strong>选好食材后，这里会按缺少数量分组</strong><span>辅助食材、可选食材和常备调料不会算作缺少。</span>';
      resultsRoot.append(empty);
      return;
    }
    const result = matchDishesByPantry({ dishes, guide, selectedKeys: currentKeys, avoid });
    if (avoid.size) {
      const notice = document.createElement('p');
      notice.className = 'pantry-avoid-notice';
      notice.textContent = `已按 ${avoid.size} 项当前忌口筛选`;
      resultsRoot.append(notice);
    }
    for (const [key, title] of RESULT_GROUPS) resultsRoot.append(renderGroup(key, title, result[key]));
  };

  function toggleIngredient(key) {
    if (currentKeys.has(key)) currentKeys.delete(key);
    else currentKeys.add(key);
    expandedGroups.clear();
    notifySelection();
    renderSelected();
    renderOptions();
    renderResults();
  }

  clear.addEventListener('click', () => {
    currentKeys.clear();
    expandedGroups.clear();
    notifySelection();
    renderSelected();
    renderOptions();
    renderResults();
  });
  search.addEventListener('input', renderOptions);
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      search.blur();
    }
  });
  dialog.querySelector('[data-close-pantry]').addEventListener('click', onClose);

  renderSelected();
  renderOptions();
  renderResults();
  backdrop.append(dialog);
  return backdrop;
}
