import { MAX_DISHES } from '../menu-state.js';
import { createMenuDrawer } from './menu-drawer.js';
import { copyText, renderQr, shareUrl } from '../utils/share.js';
import { showToast } from './toast.js';

const CATEGORY_EMOJI = { vegetable: '🥬', meat: '🥩', mixed: '🍲', stew: '🥘', soup: '🥣' };

export function renderPicker(root, { index, initialSelected = [], initialServings = 2, initialNotes = {}, initialSuggestion = '', makeUrl }) {
  let selected = [...initialSelected];
  let servings = initialServings;
  let notes = { ...initialNotes };
  let suggestion = initialSuggestion;
  let category = 'all';
  let query = '';
  let avoid = new Set();
  try { avoid = new Set(JSON.parse(localStorage.getItem('home-menu-avoid') || '[]')); } catch {}
  const dishMap = new Map(index.map((dish) => [dish.id, dish]));
  root.innerHTML = `<header class="site-header"><a class="brand" href="./" aria-label="今晚吃什么首页"><span class="brand-mark">食</span><span>今晚吃什么</span></a><button class="header-count" data-open-menu>已选 <strong>0</strong> 道</button></header><main id="main"><section class="hero"><span class="eyebrow">两分钟定下晚餐</span><h1>今晚，想吃点什么？</h1><p>只管挑喜欢的，菜谱和采购清单交给QQQ。</p><label class="search hero-search"><span aria-hidden="true">🔍</span><span class="sr-only">搜索菜名</span><input type="search" placeholder="搜索菜名…" autocomplete="off" /></label></section><div class="filter-toolbar"><div class="control-label category-label"><strong id="category-title">分类</strong><span>单选</span></div><nav class="filters" aria-labelledby="category-title"></nav><span class="toolbar-divider" aria-hidden="true"></span><button class="compact-avoid" type="button" aria-expanded="false">不想吃<span hidden></span></button><label class="compact-search" aria-label="搜索菜名"><span aria-hidden="true">🔍</span><input type="search" placeholder="搜索菜名…" autocomplete="off" /></label><section class="avoid-popover" hidden aria-label="修改忌口"><div><strong>不想吃</strong><button type="button" data-close-avoid aria-label="收起忌口选项">×</button></div><div class="avoid-filters"></div></section></div><section class="avoid-section" aria-labelledby="avoid-title"><div class="control-label"><strong id="avoid-title">不想吃</strong><span>可多选</span></div><div class="avoid-filters"></div></section><section class="dish-section" aria-labelledby="dish-title"><div class="section-heading"><div><span class="eyebrow">家常好味</span><h2 id="dish-title">今日候选</h2></div><span class="result-count"></span></div><div class="dish-grid"></div></section></main><div class="bottom-bar"><div><span>今日菜单</span><strong><b>0</b> 道菜</strong></div><button class="button primary" data-open-menu>查看菜单 <span>→</span></button></div>`;
  const grid = root.querySelector('.dish-grid');
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
    else {
      avoid.add(key);
      const removed = selected.filter((id) => dishMap.get(id)?.avoid.includes(key));
      if (removed.length) {
        selected = selected.filter((id) => !removed.includes(id));
        removed.forEach((id) => delete notes[id]);
        persist();
        showToast(`已从菜单移除 ${removed.length} 道不符合忌口的菜`);
      }
    }
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
  const closeAvoid = () => {
    avoidPopover.dataset.open = 'false'; compactAvoid.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (avoidPopover.dataset.open === 'false') avoidPopover.hidden = true; }, 180);
  };
  compactAvoid.addEventListener('click', () => {
    const opening = avoidPopover.hidden;
    if (!opening) return closeAvoid();
    avoidPopover.hidden = false;
    requestAnimationFrame(() => { avoidPopover.dataset.open = 'true'; compactAvoid.setAttribute('aria-expanded', 'true'); });
  });
  avoidPopover.querySelector('[data-close-avoid]').addEventListener('click', closeAvoid);
  const searchInputs = [...root.querySelectorAll('input[type="search"]')];
  searchInputs.forEach((input) => input.addEventListener('input', (event) => {
    query = event.target.value.trim().toLowerCase();
    searchInputs.forEach((other) => { if (other !== event.target) other.value = event.target.value; });
    draw();
  }));
  const toolbar = root.querySelector('.filter-toolbar');
  const heroSearch = root.querySelector('.hero-search');
  const avoidSection = root.querySelector('.avoid-section');
  const searchObserver = new IntersectionObserver(([entry]) => {
    const collapse = entry.intersectionRatio < 0.55;
    toolbar.classList.toggle('is-stuck', collapse);
    heroSearch.classList.toggle('is-collapsing', collapse);
    if (!collapse) closeAvoid();
  }, { threshold: [0, 0.25, 0.55, 0.8, 1] });
  searchObserver.observe(heroSearch);
  let avoidSyncFrame = 0;
  const syncCompactAvoid = () => {
    cancelAnimationFrame(avoidSyncFrame);
    avoidSyncFrame = requestAnimationFrame(() => {
      const avoidScrolledPast = avoidSection.getBoundingClientRect().bottom <= toolbar.getBoundingClientRect().bottom + 1;
      toolbar.classList.toggle('has-compact-avoid', avoidScrolledPast);
      if (!avoidScrolledPast) closeAvoid();
    });
  };
  window.addEventListener('scroll', syncCompactAvoid, { passive: true });
  window.addEventListener('resize', syncCompactAvoid);
  syncCompactAvoid();

  function draw() {
    filters.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button.dataset.category === category));
    avoidFilterGroups.forEach((group) => group.querySelectorAll('[data-avoid]').forEach((button) => { const active = avoid.has(button.dataset.avoid); button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); button.textContent = `${active ? '✓ ' : ''}${avoidOptions.find(([key]) => key === button.dataset.avoid)[1]}`; }));
    const avoidCount = compactAvoid.querySelector('span'); avoidCount.hidden = avoid.size === 0; avoidCount.textContent = avoid.size;
    const shown = index.filter((dish) => (category === 'all' || dish.category === category) && !dish.avoid.some((tag) => avoid.has(tag)) && (!query || dish.name.toLowerCase().includes(query) || dish.tags.some((tag) => tag.toLowerCase().includes(query))));
    root.querySelector('.result-count').textContent = `${shown.length} 道`;
    grid.replaceChildren();
    for (const dish of shown) {
      const active = selected.includes(dish.id);
      const card = document.createElement('article'); card.className = `dish-card${active ? ' selected' : ''}`;
      card.innerHTML = `<div class="dish-art art-${dish.category}" aria-hidden="true"><span>${CATEGORY_EMOJI[dish.category]}</span><small>${dish.categoryName}</small></div><div class="dish-card-body"><div class="dish-meta"><span>${dish.categoryName}</span><span>·</span><span>${dish.durationMinutes} 分钟</span></div><h3>${dish.name}</h3><button class="add-button" aria-pressed="${active}"><span>${active ? '✓' : '+'}</span>${active ? '已加入' : '加入菜单'}</button></div>`;
      card.querySelector('button').addEventListener('click', () => toggle(dish.id)); grid.append(card);
    }
    const empty = shown.length === 0 && document.createElement('p'); if (empty) { empty.className = 'empty-state'; empty.textContent = '没找到这道菜，换个词试试。'; grid.append(empty); }
    updateCounts();
  }
  function toggle(id) {
    if (selected.includes(id)) selected = selected.filter((value) => value !== id);
    else if (selected.length >= MAX_DISHES) return showToast('最多可选 12 道菜');
    else selected.push(id);
    persist(); draw();
  }
  function persist() { localStorage.setItem('home-menu-draft', JSON.stringify({ selected, servings, notes, suggestion })); }
  function updateCounts() { root.querySelectorAll('[data-open-menu] strong, .bottom-bar b').forEach((node) => { node.textContent = selected.length; }); }
  function openDrawer() {
    const drawer = createMenuDrawer({ selected, dishMap, servings, notes, suggestion, onNote: (id, value) => { notes[id] = value.slice(0, 80); persist(); }, onSuggestion: (value) => { suggestion = value.slice(0, 60); persist(); }, onRemove: (id) => { delete notes[id]; toggle(id); closeDrawer(); openDrawer(); }, onClear: () => { selected = []; notes = {}; suggestion = ''; persist(); draw(); closeDrawer(); }, onServings: (value) => { servings = value; persist(); closeDrawer(); openDrawer(); }, onGenerate: showShare, onClose: closeDrawer });
    document.body.append(drawer); drawer.querySelector('[data-close]').focus(); document.body.classList.add('no-scroll');
  }
  function closeDrawer() { document.querySelector('.drawer-backdrop')?.remove(); document.body.classList.remove('no-scroll'); }
  async function showShare() {
    const url = makeUrl(selected, servings, notes, window.location.href, suggestion); closeDrawer();
    const modal = document.createElement('div'); modal.className = 'drawer-backdrop';
    modal.innerHTML = `<section class="share-card" role="dialog" aria-modal="true" aria-labelledby="share-title"><button class="icon-button share-close" aria-label="关闭">×</button><span class="eyebrow">${selected.length ? '菜单已备好' : '新菜建议已备好'}</span><h2 id="share-title">${selected.length ? '把今晚的好味分享出去' : '把想吃的新菜告诉 QQQ'}</h2><p>持有链接的人可以查看${selected.length ? '菜单和建议' : '这条建议'}。</p><canvas aria-label="菜单链接二维码"></canvas><input class="share-url" readonly aria-label="菜单链接"><div class="share-actions"><button class="button primary" data-share>系统分享</button><button class="button secondary" data-copy>复制链接</button><a class="button ghost" href="${url}">预览菜单</a></div></section>`;
    modal.querySelector('input').value = url; document.body.append(modal); document.body.classList.add('no-scroll');
    await renderQr(modal.querySelector('canvas'), url);
    const close = () => { modal.remove(); document.body.classList.remove('no-scroll'); };
    modal.querySelector('.share-close').addEventListener('click', close); modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    modal.querySelector('[data-copy]').addEventListener('click', async () => { await copyText(url); showToast('链接已复制'); });
    modal.querySelector('[data-share]').addEventListener('click', async () => { try { const result = await shareUrl(url); if (result === 'copied') showToast('链接已复制'); } catch (error) { if (error.name !== 'AbortError') showToast('分享失败，请复制链接'); } });
  }
  root.querySelectorAll('[data-open-menu]').forEach((button) => button.addEventListener('click', openDrawer)); draw();
}
