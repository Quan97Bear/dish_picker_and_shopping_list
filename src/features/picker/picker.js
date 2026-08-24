import { MAX_DISHES } from '../../domain/menu-state.js';
import { createMenuDrawer } from './menu-drawer.js';
import { createCombinationDialog } from './combination-dialog.js';
import { showToast } from '../../shared/toast.js';

const CATEGORY_EMOJI = { vegetable: '🥬', meat: '🥩', mixed: '🍲', stew: '🥘', soup: '🥣' };
const COMPACT_CATEGORY_NAME = { vegetable: '素菜', meat: '肉菜', mixed: '混合', stew: '炖菜', soup: '汤' };
const PREVIEW_TASTE_EXCLUSIONS = new Set(['家常', '快手', '耐心制作']);
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CANDIDATE_VIEW_KEY = 'home-menu-candidate-view';
const SORT_MODE_KEY = 'home-menu-sort-mode';
const PICK_HISTORY_KEY = 'home-menu-pick-history';
const SORT_MODES = new Set(['recommended', 'frequent', 'fastest', 'category', 'name']);
const CATEGORY_ORDER = ['vegetable', 'meat', 'mixed', 'stew', 'soup'];

export function resolveCandidateView(storedView, isWide) {
  return storedView === 'large' || storedView === 'compact'
    ? storedView
    : isWide ? 'large' : 'compact';
}

export function resolveSortMode(storedMode) {
  return SORT_MODES.has(storedMode) ? storedMode : 'recommended';
}

export function sortDishes(dishes, mode = 'recommended', history = {}) {
  const resolvedMode = resolveSortMode(mode);
  const originalOrder = new Map(dishes.map((dish, index) => [dish.id, index]));
  const recommended = (left, right) =>
    (left.homestyleRank ?? Number.MAX_SAFE_INTEGER) - (right.homestyleRank ?? Number.MAX_SAFE_INTEGER)
    || originalOrder.get(left.id) - originalOrder.get(right.id);
  const comparators = {
    recommended,
    frequent: (left, right) => (history[right.id] || 0) - (history[left.id] || 0) || recommended(left, right),
    fastest: (left, right) => left.durationMinutes - right.durationMinutes || recommended(left, right),
    category: (left, right) => CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category) || recommended(left, right),
    name: (left, right) => (left.pinyinKey || left.id).localeCompare(right.pinyinKey || right.id, 'en') || recommended(left, right),
  };
  return [...dishes].sort(comparators[resolvedMode]);
}

export function getDishCardMarkup(dish, active = false) {
  const action = active ? '已加入' : '加入菜单';
  return `<button class="dish-preview-button" type="button" data-preview-id="${dish.id}" aria-label="查看${dish.name}概览"><div class="dish-art art-${dish.category}" aria-hidden="true"><span>${CATEGORY_EMOJI[dish.category]}</span><small>${dish.categoryName}</small></div><div class="dish-card-body"><div class="dish-meta"><span class="dish-category-full">${dish.categoryName}</span><span class="dish-category-compact">${COMPACT_CATEGORY_NAME[dish.category]}</span><span>·</span><span class="dish-duration-full">${dish.durationMinutes} 分钟</span><span class="dish-duration-compact">${dish.durationMinutes}分钟</span></div><h3>${dish.name}</h3></div></button><button class="add-button" type="button" aria-label="${action}：${dish.name}" aria-pressed="${active}"><span class="add-button-icon" aria-hidden="true">${active ? '✓' : '+'}</span><span class="add-button-label">${action}</span></button>`;
}

export function getDishPreviewDetails(dish) {
  const primaryIngredients = (dish.ingredients || [])
    .filter((ingredient) => !ingredient.optional && ingredient.shoppingCategory !== '调味品')
    .map((ingredient) => ingredient.name)
    .filter((name, index, names) => names.indexOf(name) === index)
    .slice(0, 4);
  if (!primaryIngredients.length) {
    primaryIngredients.push(...(dish.ingredients || [])
      .filter((ingredient) => !ingredient.optional)
      .map((ingredient) => ingredient.name)
      .filter((name, index, names) => names.indexOf(name) === index)
      .slice(0, 4));
  }
  const tastes = (dish.tags || []).filter((tag) => !PREVIEW_TASTE_EXCLUSIONS.has(tag));
  return {
    ingredients: primaryIngredients.length ? primaryIngredients : ['查看菜谱了解'],
    taste: tastes.length ? tastes : ['家常'],
    spiciness: dish.avoid?.includes('spicy') ? '有辣味' : '不辣'
  };
}

export function getBasketMarkup(count = 0) {
  return `<button class="basket-button" type="button" data-open-menu aria-label="查看菜单，已选 ${count} 道菜" aria-hidden="true" tabindex="-1">
    <svg class="basket-icon" aria-hidden="true" viewBox="0 0 48 48" fill="none">
      <path class="basket-handle" d="M14 21c1.2-7 5-10.5 10-10.5S32.8 14 34 21"></path>
      <path class="basket-body" d="M8.5 20.5h31l-3.4 17H11.9l-3.4-17Z"></path>
      <path class="basket-weave" d="M17 23.5l1.2 11M31 23.5l-1.2 11M12.5 28h23M11.5 33h25"></path>
    </svg>
    <b class="basket-count" aria-hidden="true">${count}</b>
  </button>`;
}

export function updateMenuCounts(root, count) {
  root.querySelectorAll('.header-menu b, .bottom-bar b').forEach((element) => {
    element.textContent = String(count);
  });
  const headerMenu = root.querySelector?.('.header-menu');
  const basketButton = root.querySelector?.('.basket-button');
  headerMenu?.setAttribute('aria-label', `查看菜单，今晚想吃，已选 ${count} 道菜`);
  basketButton?.setAttribute('aria-label', `查看菜单，已选 ${count} 道菜`);
}

export function getDietaryConflictIds(selected, dishMap, avoid) {
  return new Set(selected.filter((id) => dishMap.get(id)?.avoid.some((tag) => avoid.has(tag))));
}

function handleDialogKeys(event, dialog, close) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => !element.hidden && element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (document.activeElement === dialog) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function renderPicker(root, { index, dishes = [], initialSelected = [], initialServings = 2, initialNotes = {}, initialSuggestion = '', makeUrl, onComplete }) {
  let selected = [...initialSelected];
  let servings = initialServings;
  let notes = { ...initialNotes };
  let suggestion = initialSuggestion;
  let category = 'all';
  let query = '';
  let drawerOpener = null;
  let combinationOpener = null;
  let sortMode = resolveSortMode(localStorage.getItem(SORT_MODE_KEY));
  let pickHistory = {};
  try { pickHistory = JSON.parse(localStorage.getItem(PICK_HISTORY_KEY) || '{}'); } catch {}
  const sortHistorySnapshot = { ...pickHistory };
  let avoid = new Set();
  try { avoid = new Set(JSON.parse(localStorage.getItem('home-menu-avoid') || '[]')); } catch {}
  const dishMap = new Map(index.map((dish) => [dish.id, dish]));
  const previewDishMap = new Map(dishes.map((dish) => [dish.id, dish]));
  root.innerHTML = `<header class="site-header"><a class="brand" href="./" aria-label="今晚吃什么首页"><span class="brand-mark">食</span><span>今晚吃什么</span></a></header><main id="main"><section class="hero"><span class="eyebrow">两分钟定下晚餐</span><h1>今晚，想吃点什么？</h1><p>只管挑喜欢的，菜谱和采购清单都会准备好</p><label class="search hero-search"><span aria-hidden="true">🔍</span><span class="sr-only">搜索菜名</span><input type="search" placeholder="搜索菜名…" autocomplete="off" enterkeyhint="done" /></label></section><span class="sticky-sentinel" aria-hidden="true"></span><div class="filter-toolbar"><div class="control-label category-label"><strong id="category-title">分类</strong><span>单选</span></div><nav class="filters" aria-labelledby="category-title"></nav><span class="toolbar-divider" aria-hidden="true"></span><button class="compact-avoid" type="button" aria-expanded="false">忌口<span hidden></span></button><label class="compact-search" aria-label="搜索菜名"><span aria-hidden="true">🔍</span><input type="search" placeholder="搜索菜名…" autocomplete="off" enterkeyhint="done" /></label><section class="avoid-popover" hidden aria-label="修改忌口"><div><strong>忌口</strong><button type="button" data-close-avoid aria-label="收起忌口选项">×</button></div><div class="avoid-filters"></div></section></div><section class="avoid-section" aria-labelledby="avoid-title"><div class="control-label"><strong id="avoid-title">忌口</strong><span>可多选</span></div><div class="avoid-filters"></div></section><section class="combination-helper" aria-labelledby="combination-helper-title"><div class="combination-helper-inner"><div><span class="eyebrow">不想一个个挑</span><h2 id="combination-helper-title">帮我选今天吃什么</h2><p data-combination-summary></p></div><button class="button secondary" type="button" data-open-combination>帮我选 <span aria-hidden="true">→</span></button></div></section><section class="dish-section" aria-labelledby="dish-title"><div class="section-heading"><div><span class="eyebrow">家常好味</span><h2 id="dish-title">今日候选</h2></div><div class="candidate-heading-actions"><span class="result-count" aria-live="polite"></span><label class="sort-control"><span class="sr-only">候选排序</span><select aria-label="候选排序"><option value="recommended">排序：推荐</option><option value="frequent">排序：常吃</option><option value="fastest">排序：最快</option><option value="category">排序：分类</option><option value="name">排序：菜名</option></select></label><div class="candidate-view-toggle" role="group" aria-label="候选显示方式"><button type="button" data-candidate-view="large" aria-label="大卡片显示"><svg aria-hidden="true" viewBox="0 0 20 20"><rect x="2" y="2" width="7" height="7" rx="1.5"></rect><rect x="11" y="2" width="7" height="7" rx="1.5"></rect><rect x="2" y="11" width="7" height="7" rx="1.5"></rect><rect x="11" y="11" width="7" height="7" rx="1.5"></rect></svg></button><button type="button" data-candidate-view="compact" aria-label="小卡片显示"><svg aria-hidden="true" viewBox="0 0 20 20"><rect x="2" y="2" width="4" height="4" rx="1"></rect><rect x="8" y="2" width="4" height="4" rx="1"></rect><rect x="14" y="2" width="4" height="4" rx="1"></rect><rect x="2" y="8" width="4" height="4" rx="1"></rect><rect x="8" y="8" width="4" height="4" rx="1"></rect><rect x="14" y="8" width="4" height="4" rx="1"></rect><rect x="2" y="14" width="4" height="4" rx="1"></rect><rect x="8" y="14" width="4" height="4" rx="1"></rect><rect x="14" y="14" width="4" height="4" rx="1"></rect></svg></button></div></div></div><div class="dish-grid"></div></section></main><div class="bottom-bar"><div><span>今日菜单</span><strong><b>0</b> 道菜</strong></div><button class="button primary" data-open-menu>查看菜单 <span>→</span></button></div><div class="search-scrim" aria-hidden="true"></div>`;
  root.querySelector('.site-header').insertAdjacentHTML('beforeend', '<button class="header-menu" type="button" data-open-menu aria-label="查看菜单，今晚想吃"><span>今晚想吃</span><b>0</b></button>');
  root.querySelector('.bottom-bar').innerHTML = getBasketMarkup(0);
  const grid = root.querySelector('.dish-grid');
  const wideViewQuery = window.matchMedia('(min-width: 700px)');
  let storedCandidateView = localStorage.getItem(CANDIDATE_VIEW_KEY);
  if (!['large', 'compact'].includes(storedCandidateView)) storedCandidateView = null;
  let candidateView = resolveCandidateView(storedCandidateView, wideViewQuery.matches);
  const viewButtons = [...root.querySelectorAll('[data-candidate-view]')];
  const applyCandidateView = () => {
    grid.classList.toggle('view-large', candidateView === 'large');
    grid.classList.toggle('view-compact', candidateView === 'compact');
    grid.closest('.dish-section').classList.toggle('compact-candidates', candidateView === 'compact');
    viewButtons.forEach((button) => {
      const active = button.dataset.candidateView === candidateView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  viewButtons.forEach((button) => button.addEventListener('click', () => {
    candidateView = button.dataset.candidateView;
    storedCandidateView = candidateView;
    localStorage.setItem(CANDIDATE_VIEW_KEY, candidateView);
    applyCandidateView();
  }));
  wideViewQuery.addEventListener?.('change', (event) => {
    if (storedCandidateView) return;
    candidateView = resolveCandidateView(null, event.matches);
    applyCandidateView();
  });
  applyCandidateView();
  const sortSelect = root.querySelector('.sort-control select');
  sortSelect.value = sortMode;
  sortSelect.addEventListener('change', () => {
    sortMode = resolveSortMode(sortSelect.value);
    localStorage.setItem(SORT_MODE_KEY, sortMode);
    draw();
  });
  const categories = [['all', '全部'], ['vegetable', '素菜'], ['meat', '肉菜'], ['mixed', '混合菜'], ['stew', '炖菜'], ['soup', '汤']];
  const filters = root.querySelector('.filters');
  for (const [key, name] of categories) {
    const button = document.createElement('button'); button.textContent = name; button.dataset.category = key;
    button.addEventListener('click', () => { category = key; draw(); }); filters.append(button);
  }
  const avoidOptions = [['pepper', '不要青椒 / 尖椒'], ['fish', '不要鱼'], ['pork', '不要猪肉'], ['egg', '不要鸡蛋'], ['spicy', '不吃辣']];
  const avoidFilterGroups = [...root.querySelectorAll('.avoid-filters')];
  function toggleAvoid(key) {
    if (avoid.has(key)) avoid.delete(key);
    else avoid.add(key);
    localStorage.setItem('home-menu-avoid', JSON.stringify([...avoid])); draw();
  }
  for (const group of avoidFilterGroups) for (const [key, name] of avoidOptions) {
    const button = document.createElement('button'); button.dataset.avoid = key; button.textContent = name;
    button.addEventListener('click', () => {
      toggleAvoid(key);
    });
    group.append(button);
  }
  const compactAvoid = root.querySelector('.compact-avoid');
  const avoidPopover = root.querySelector('.avoid-popover');
  const closeAvoid = (restoreFocus = false) => {
    avoidPopover.dataset.open = 'false'; compactAvoid.setAttribute('aria-expanded', 'false');
    if (restoreFocus) compactAvoid.focus();
    setTimeout(() => { if (avoidPopover.dataset.open === 'false') avoidPopover.hidden = true; }, 180);
  };
  compactAvoid.addEventListener('click', () => {
    const opening = avoidPopover.hidden;
    if (!opening) return closeAvoid();
    avoidPopover.hidden = false;
    requestAnimationFrame(() => { avoidPopover.dataset.open = 'true'; compactAvoid.setAttribute('aria-expanded', 'true'); });
  });
  avoidPopover.querySelector('[data-close-avoid]').addEventListener('click', (event) => closeAvoid(event.detail === 0));
  avoidPopover.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAvoid(true);
    }
  });
  const searchInputs = [...root.querySelectorAll('input[type="search"]')];
  const searchScrim = root.querySelector('.search-scrim');
  ['pointerdown','pointermove','click','touchstart','touchmove','wheel'].forEach((eventName) => {
    searchScrim.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
  });
  let searchScrollY = 0;
  let restoringSearchScroll = false;
  const restoreSearchScroll = () => {
    if (!document.documentElement.hasAttribute('data-search-active') || restoringSearchScroll) return;
    if (Math.abs(window.scrollY - searchScrollY) <= 0.5) return;
    restoringSearchScroll = true;
    window.scrollTo(0, searchScrollY);
    restoringSearchScroll = false;
  };
  const lockSearchScroll = (event) => {
    searchScrollY = window.scrollY;
    const searchLabel = event.currentTarget.closest('label');
    const searchBottom = searchLabel.getBoundingClientRect().bottom;
    document.documentElement.style.setProperty('--search-scrim-top', `${Math.ceil(searchBottom)}px`);
    document.documentElement.dataset.searchKind = searchLabel.classList.contains('hero-search') ? 'hero' : 'compact';
    document.documentElement.setAttribute('data-search-active', '');
    window.addEventListener('scroll', restoreSearchScroll, { passive: true });
  };
  const unlockSearchScroll = () => {
    document.documentElement.removeAttribute('data-search-active');
    delete document.documentElement.dataset.searchKind;
    document.documentElement.style.removeProperty('--search-scrim-top');
    window.removeEventListener('scroll', restoreSearchScroll);
  };
  searchInputs.forEach((input) => input.addEventListener('input', (event) => {
    query = event.target.value.trim().toLowerCase();
    searchInputs.forEach((other) => { if (other !== event.target) other.value = event.target.value; });
    draw();
  }));
  searchInputs.forEach((input) => {
    input.closest('label').addEventListener('pointerdown', () => {
      input.focus({ preventScroll: true });
    });
    input.addEventListener('focus', lockSearchScroll);
    input.addEventListener('blur', unlockSearchScroll);
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      input.blur();
    });
  });
  const toolbar = root.querySelector('.filter-toolbar');
  const heroSearch = root.querySelector('.hero-search');
  const stickySentinel = root.querySelector('.sticky-sentinel');
  const avoidSection = root.querySelector('.avoid-section');
  const syncStickyToolbar = () => {
    const collapse = stickySentinel.getBoundingClientRect().bottom <= 0;
    toolbar.classList.toggle('is-stuck', collapse);
    heroSearch.classList.toggle('is-collapsing', collapse);
    if (!collapse) closeAvoid();
  };
  const stickyObserver = new IntersectionObserver(syncStickyToolbar, { threshold: [0, 1] });
  stickyObserver.observe(stickySentinel);
  const syncCompactAvoid = () => {
    const avoidScrolledPast = avoidSection.getBoundingClientRect().bottom <= toolbar.getBoundingClientRect().bottom + 1;
    toolbar.classList.toggle('has-compact-avoid', avoidScrolledPast);
    if (!avoidScrolledPast) closeAvoid();
  };
  const syncLayoutState = () => {
    syncStickyToolbar();
    syncCompactAvoid();
  };
  let layoutSyncFrame = 0;
  const requestLayoutSync = () => {
    if (layoutSyncFrame) return;
    layoutSyncFrame = requestAnimationFrame(() => {
      layoutSyncFrame = 0;
      syncLayoutState();
    });
  };
  window.addEventListener('scroll', requestLayoutSync, { passive: true });
  window.addEventListener('resize', requestLayoutSync);
  window.visualViewport?.addEventListener('resize', requestLayoutSync);
  syncLayoutState();

  function draw() {
    filters.querySelectorAll('button').forEach((button) => {
      const active = button.dataset.category === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    avoidFilterGroups.forEach((group) => group.querySelectorAll('[data-avoid]').forEach((button) => { const active = avoid.has(button.dataset.avoid); button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); button.textContent = `${active ? '✓ ' : ''}${avoidOptions.find(([key]) => key === button.dataset.avoid)[1]}`; }));
    const avoidCount = compactAvoid.querySelector('span'); avoidCount.hidden = avoid.size === 0; avoidCount.textContent = avoid.size;
    updateCombinationSummary();
    const shown = sortDishes(index.filter((dish) => (category === 'all' || dish.category === category) && !dish.avoid.some((tag) => avoid.has(tag)) && (!query || dish.name.toLowerCase().includes(query) || dish.tags.some((tag) => tag.toLowerCase().includes(query)))), sortMode, sortHistorySnapshot);
    root.querySelector('.result-count').textContent = `${shown.length} 道`;
    grid.replaceChildren();
    for (const dish of shown) {
      const active = selected.includes(dish.id);
      const card = document.createElement('article'); card.className = `dish-card${active ? ' selected' : ''}`;
      card.innerHTML = getDishCardMarkup(dish, active);
      card.querySelector('.dish-preview-button').addEventListener('click', (event) => openDishPreview(previewDishMap.get(dish.id) || dish, event.currentTarget));
      card.querySelector('.add-button').addEventListener('click', () => toggle(dish.id));
      grid.append(card);
    }
    const empty = shown.length === 0 && document.createElement('p'); if (empty) { empty.className = 'empty-state'; empty.textContent = '没找到这道菜，换个词试试。'; grid.append(empty); }
    updateCounts();
  }
  function toggle(id) {
    if (selected.includes(id)) selected = selected.filter((value) => value !== id);
    else if (selected.length >= MAX_DISHES) return showToast('最多可选 12 道菜');
    else {
      selected.push(id);
      pickHistory[id] = (pickHistory[id] || 0) + 1;
      localStorage.setItem(PICK_HISTORY_KEY, JSON.stringify(pickHistory));
    }
    persist(); draw();
  }
  function persist() { localStorage.setItem('home-menu-draft', JSON.stringify({ selected, servings, notes, suggestion })); }
  function updateCounts() { updateMenuCounts(root, selected.length); }
  function updateCombinationSummary() {
    root.querySelector('[data-combination-summary]').textContent = avoid.size
      ? `结合 ${avoid.size} 项当前忌口生成家常搭配`
      : '结合当前忌口生成家常搭配';
  }
  function openDishPreview(dish, opener) {
    document.querySelector('.dish-preview-backdrop')?.remove();
    const previewScrollY = window.scrollY;
    const details = getDishPreviewDetails(dish);
    const sourceCard = opener.closest('.dish-card');
    const sourceRect = sourceCard?.getBoundingClientRect();
    const backdrop = document.createElement('div');
    backdrop.className = 'dish-preview-backdrop';
    const stage = document.createElement('div');
    stage.className = 'dish-preview-stage';
    const previewCard = document.createElement('section');
    previewCard.className = 'dish-preview-card';
    previewCard.setAttribute('role', 'dialog');
    previewCard.setAttribute('aria-modal', 'true');
    previewCard.setAttribute('aria-labelledby', `dish-preview-${dish.id}-title`);
    previewCard.tabIndex = -1;
    previewCard.innerHTML = `<div class="dish-preview-card-inner">
      <div class="dish-preview-face dish-preview-front" aria-hidden="true">
        <div class="dish-preview-front-art art-${dish.category}">${CATEGORY_EMOJI[dish.category]}</div>
        <div><span>${dish.categoryName} · ${dish.durationMinutes} 分钟</span><strong></strong></div>
      </div>
      <div class="dish-preview-face dish-preview-back">
        <div class="dish-preview-heading">
          <div class="dish-preview-art art-${dish.category}" aria-hidden="true">${CATEGORY_EMOJI[dish.category]}</div>
          <div><span class="eyebrow">${dish.categoryName} · ${dish.durationMinutes} 分钟</span><h2 id="dish-preview-${dish.id}-title"></h2></div>
          <button class="icon-button" type="button" data-close-preview aria-label="关闭${dish.name}概览">×</button>
        </div>
        <dl class="dish-preview-facts">
          <div><dt>主要食材</dt><dd data-preview-ingredients></dd></div>
          <div><dt>口味</dt><dd data-preview-taste></dd></div>
          <div><dt>辣度</dt><dd data-preview-spiciness></dd></div>
        </dl>
        <button class="button primary dish-preview-add" type="button"></button>
      </div>
    </div>`;
    previewCard.querySelector('.dish-preview-front strong').textContent = dish.name;
    previewCard.querySelector('h2').textContent = dish.name;
    previewCard.querySelector('[data-preview-ingredients]').textContent = details.ingredients.join('、');
    previewCard.querySelector('[data-preview-taste]').textContent = details.taste.join(' · ');
    previewCard.querySelector('[data-preview-spiciness]').textContent = details.spiciness;
    const inner = previewCard.querySelector('.dish-preview-card-inner');
    const add = previewCard.querySelector('.dish-preview-add');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const restorePreviewScroll = () => {
      if (Math.abs(window.scrollY - previewScrollY) > 0.5) window.scrollTo(0, previewScrollY);
      requestAnimationFrame(() => {
        if (backdrop.isConnected && Math.abs(window.scrollY - previewScrollY) > 0.5) {
          window.scrollTo(0, previewScrollY);
        }
      });
    };
    const blockBackgroundWheel = (event) => {
      event.preventDefault();
      restorePreviewScroll();
    };
    const blockBackgroundTouch = (event) => {
      if (event.target.closest?.('.dish-preview-face')) return;
      event.preventDefault();
      restorePreviewScroll();
    };
    let closing = false;
    const updatePreviewAction = () => {
      const active = selected.includes(dish.id);
      add.disabled = false;
      add.classList.toggle('is-remove', active);
      add.setAttribute('aria-pressed', String(active));
      add.textContent = active ? '移出菜单' : '加入菜单';
    };
    const getSourceTransform = (knownRect = null) => {
      const currentSource = (opener.isConnected ? opener : root.querySelector(`[data-preview-id="${dish.id}"]`))?.closest('.dish-card');
      const currentRect = knownRect || currentSource?.getBoundingClientRect() || sourceRect;
      const targetRect = previewCard.getBoundingClientRect();
      if (!currentRect || !targetRect.width || !targetRect.height) return 'none';
      return `translate(${currentRect.left - targetRect.left}px,${currentRect.top - targetRect.top}px) scale(${currentRect.width / targetRect.width},${currentRect.height / targetRect.height})`;
    };
    const close = async (restoreFocus = true) => {
      if (closing) return;
      closing = true;
      if (!reducedMotion && previewCard.animate) {
        const timing = { duration: 300, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' };
        const animations = [
          previewCard.animate([{ transform: 'none' }, { transform: getSourceTransform() }], timing),
          inner.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], timing),
        ];
        await Promise.allSettled(animations.map((animation) => animation.finished));
      }
      backdrop.remove();
      document.removeEventListener('touchmove', blockBackgroundTouch, true);
      document.removeEventListener('wheel', blockBackgroundWheel, true);
      window.removeEventListener('scroll', restorePreviewScroll);
      // A preview opened while this close was awaiting owns the page state now.
      if (!document.querySelector('.dish-preview-backdrop')) {
        root.classList.remove('dish-preview-background');
        root.removeAttribute('aria-hidden');
        document.documentElement.removeAttribute('data-dish-preview');
        if (Math.abs(window.scrollY - previewScrollY) > 1) window.scrollTo(0, previewScrollY);
        syncLayoutState();
      }
      if (!restoreFocus) return;
      const nextOpener = opener.isConnected ? opener : root.querySelector(`[data-preview-id="${dish.id}"]`);
      // Match the open path: restoring focus must not move the page or change
      // whether the toolbar is currently sticky.
      nextOpener?.focus({ preventScroll: true });
    };
    add.addEventListener('click', () => {
      toggle(dish.id);
      updatePreviewAction();
    });
    previewCard.querySelector('[data-close-preview]').addEventListener('click', (event) => close(event.detail === 0));
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop || event.target === stage) close(false);
    });
    document.addEventListener('touchmove', blockBackgroundTouch, { passive: false, capture: true });
    document.addEventListener('wheel', blockBackgroundWheel, { passive: false, capture: true });
    window.addEventListener('scroll', restorePreviewScroll, { passive: true });
    backdrop.addEventListener('keydown', (event) => handleDialogKeys(event, previewCard, close));
    updatePreviewAction();
    stage.append(previewCard);
    backdrop.append(stage);
    root.classList.add('dish-preview-background');
    document.documentElement.setAttribute('data-dish-preview', '');
    document.body.append(backdrop);
    const startTransform = getSourceTransform(sourceRect);
    if (!reducedMotion && previewCard.animate) {
      const timing = { duration: 360, easing: 'cubic-bezier(.32,.72,0,1)' };
      previewCard.animate([{ transform: startTransform }, { transform: 'none' }], timing);
      inner.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], timing);
    }
    // The card already sits centred in a fixed, viewport-covering overlay, so
    // scrolling it into view only jumps the page behind the glass and drops the
    // sticky state. Harmless while the page was hidden; visible now that it is not.
    previewCard.focus({ preventScroll: true });
    root.setAttribute('aria-hidden', 'true');
  }
  function openCombination() {
    combinationOpener = document.activeElement instanceof HTMLElement ? document.activeElement : root.querySelector('[data-open-combination]');
    const closeCombination = (restoreFocus = true) => {
      document.querySelector('.combination-backdrop')?.remove();
      document.body.classList.remove('no-scroll');
      root.inert = false;
      if (restoreFocus && combinationOpener?.isConnected) combinationOpener.focus();
    };
    const backdrop = createCombinationDialog({
      dishes,
      selectedIds: selected,
      servings,
      avoid,
      onClose: closeCombination,
      onAdd: ({ combinedIds, additions, servings: nextServings }) => {
        selected = combinedIds;
        servings = nextServings;
        for (const id of additions) pickHistory[id] = (pickHistory[id] || 0) + 1;
        localStorage.setItem(PICK_HISTORY_KEY, JSON.stringify(pickHistory));
        persist();
        draw();
        closeCombination(false);
        showToast(additions.length ? `已加入 ${additions.length} 道搭配` : '当前菜单已保留');
      },
    });
    const dialog = backdrop.querySelector('.combination-dialog');
    backdrop.addEventListener('keydown', (event) => handleDialogKeys(event, dialog, closeCombination));
    root.inert = true;
    document.body.append(backdrop);
    document.body.classList.add('no-scroll');
    dialog.focus();
  }
  function openDrawer({ preserveOpener = false } = {}) {
    if (!preserveOpener) drawerOpener = document.activeElement instanceof HTMLElement ? document.activeElement : root.querySelector('[data-open-menu]');
    const drawer = createMenuDrawer({ selected, dishMap, servings, notes, suggestion, conflictingIds: getDietaryConflictIds(selected, dishMap, avoid), onNote: (id, value) => { notes[id] = value.slice(0, 80); persist(); }, onSuggestion: (value) => { suggestion = value.slice(0, 60); persist(); }, onRemove: (id) => { delete notes[id]; toggle(id); closeDrawer(false); openDrawer({ preserveOpener: true }); }, onClear: () => { selected = []; notes = {}; suggestion = ''; persist(); draw(); closeDrawer(); }, onServings: (value) => { servings = value; persist(); updateCombinationSummary(); }, onGenerate: showResult, onClose: closeDrawer });
    const dialog = drawer.querySelector('.drawer');
    drawer.addEventListener('keydown', (event) => handleDialogKeys(event, dialog, closeDrawer));
    root.inert = true;
    document.body.append(drawer);
    document.body.classList.add('no-scroll');
    dialog.focus();
  }
  function closeDrawer(restoreFocus = true) {
    document.querySelector('.drawer-backdrop')?.remove();
    document.body.classList.remove('no-scroll');
    root.inert = false;
    if (restoreFocus && drawerOpener?.isConnected) drawerOpener.focus();
  }
  function showResult() {
    const url = makeUrl(selected, servings, notes, window.location.href, suggestion);
    closeDrawer(false);
    onComplete({ ids: [...selected], servings, notes: { ...notes }, suggestion, url });
  }
  root.querySelectorAll('[data-open-menu]').forEach((button) => button.addEventListener('click', () => openDrawer()));
  root.querySelector('[data-open-combination]').addEventListener('click', openCombination);
  const pickerHeader = root.querySelector('.site-header');
  const compactMenu = root.querySelector('.bottom-bar');
  const headerMenu = root.querySelector('.header-menu');
  const compactMenuButton = compactMenu.querySelector('[data-open-menu]');
  const headerObserver = new IntersectionObserver(([entry]) => {
    const headerVisible = entry.isIntersecting;
    compactMenu.classList.toggle('is-visible', !headerVisible);
    headerMenu.setAttribute('aria-hidden', String(!headerVisible));
    headerMenu.tabIndex = headerVisible ? 0 : -1;
    compactMenuButton.setAttribute('aria-hidden', String(headerVisible));
    compactMenuButton.tabIndex = headerVisible ? -1 : 0;
  }, { threshold: 0 });
  headerObserver.observe(pickerHeader);
  updateCombinationSummary();
  draw();
}
