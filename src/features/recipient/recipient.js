import { buildShoppingList, CATEGORY_ORDER, shoppingListText } from '../../domain/shopping-list.js';
import { splitSuggestionList } from '../../domain/menu-state.js';
import { copyText } from '../../shared/share.js';
import { openShareDialog } from '../../shared/share-dialog.js';
import { showToast } from '../../shared/toast.js';

export function getNextResultTabIndex(index, key, length) {
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  if (key === 'ArrowRight') return (index + 1) % length;
  if (key === 'ArrowLeft') return (index - 1 + length) % length;
  return index;
}

export function getShoppingCollapseState(expanded) {
  return {
    ariaExpanded: String(expanded),
    label: expanded ? '收起整个采购清单' : '展开整个采购清单',
    groupsHidden: !expanded
  };
}

export function renderRecipient(root, { dishes, servings, notes = {}, suggestion = '', warnings = [], menuUrl = window.location.href }) {
  const title = dishes.length ? '今晚吃这些' : suggestion ? '收到新菜建议' : '这份菜单空空的';
  const subtitle = dishes.length ? `${dishes.length} 道菜 · ${servings} 人份` : suggestion ? '选菜人想在菜单里看到这些菜。' : '菜品可能已下架，或链接不完整。';
  const resultTabs = dishes.length
    ? '<div class="result-controls"><div class="result-tabs" role="tablist" aria-label="结果内容"><button id="shopping-tab" role="tab" aria-selected="true" aria-controls="shopping-panel">采购清单</button><button id="recipes-tab" role="tab" aria-selected="false" aria-controls="recipes-panel" tabindex="-1">菜谱</button></div><button class="button secondary result-share" type="button" data-share-menu>分享菜单</button></div>'
    : '<a class="button primary" href="./">返回菜单</a>';
  const resultPanels = dishes.length
    ? '<section id="shopping-panel" class="shopping-panel result-panel" role="tabpanel" aria-labelledby="shopping-tab"></section><section id="recipes-panel" class="recipes result-panel" role="tabpanel" aria-labelledby="recipes-tab" hidden><div class="section-heading"><div><span class="eyebrow">照着做就好</span><h2 id="recipes-title">菜谱详情</h2></div></div><div class="recipe-list"></div></section>'
    : '';
  root.innerHTML = `<header class="site-header"><a class="brand" href="./"><span class="brand-mark">食</span><span>今晚吃什么</span></a><a class="header-link" href="./">重新选菜</a></header><main id="main" class="recipient-main"><section class="menu-hero"><span class="eyebrow">今晚的餐桌</span><h1>${title}</h1><p>${subtitle}</p><div class="menu-tags"></div>${resultTabs}</section><section class="warning-area" aria-live="polite"></section><section class="suggestion-card" ${suggestion ? '' : 'hidden'} aria-labelledby="suggestion-card-title"><span class="eyebrow">新菜建议</span><h2 id="suggestion-card-title">想新增这些菜</h2><div class="suggestion-tags"></div></section>${resultPanels}</main>`;
  const tags = root.querySelector('.menu-tags');
  dishes.forEach((dish) => { const tag = document.createElement('span'); tag.textContent = dish.name; tags.append(tag); });
  const warningArea = root.querySelector('.warning-area');
  warnings.forEach((warning) => { const note = document.createElement('p'); note.className = 'notice'; note.textContent = warning; warningArea.append(note); });
  if (suggestion) {
    const suggestionTags = root.querySelector('.suggestion-tags');
    const suggestions = splitSuggestionList(suggestion);
    for (const name of suggestions) {
      const tag = document.createElement('span');
      tag.textContent = name;
      suggestionTags.append(tag);
    }
  }
  const recipeList = root.querySelector('.recipe-list');
  dishes.forEach((dish, index) => {
    const details = document.createElement('details'); details.className = 'recipe-card'; details.open = index === 0;
    details.innerHTML = `<summary><div><span class="recipe-number">${String(index + 1).padStart(2, '0')}</span><h3>${dish.name}</h3></div><div class="recipe-summary-meta"><span>${dish.durationMinutes} 分钟</span><span>难度 ${dish.difficulty}/5</span><i aria-hidden="true"></i></div></summary><div class="recipe-content"><div class="order-note" hidden><strong>点菜备注</strong><p></p></div><div><h4>食材 · ${servings} 人份</h4><ul class="ingredient-list"></ul></div><div><h4>做法</h4><ol class="step-list"></ol></div><div class="recipe-notes"><strong>小提示</strong><p>${dish.notes.join('；') || '调味请按口味调整。'}</p></div></div>`;
    if (notes[dish.id]) { const note = details.querySelector('.order-note'); note.hidden = false; note.querySelector('p').textContent = notes[dish.id]; }
    const factor = servings / dish.servings;
    dish.ingredients.forEach((ingredient) => {
      const item = document.createElement('li'); const amount = ingredient.amount == null ? '' : Math.round(ingredient.amount * factor * 100) / 100;
      item.innerHTML = `<span>${ingredient.name}${ingredient.optional ? '<small>可选</small>' : ''}</span><strong>${amount}${ingredient.unit === '适量' ? '适量' : ingredient.unit}</strong>`; details.querySelector('.ingredient-list').append(item);
    });
    dish.steps.forEach((step) => { const item = document.createElement('li'); item.textContent = step; details.querySelector('.step-list').append(item); });
    recipeList.append(details);
  });
  if (!dishes.length) return;

  const shareButton = root.querySelector('[data-share-menu]');
  shareButton.addEventListener('click', () => {
    openShareDialog({ root, url: menuUrl, hasDishes: true, opener: shareButton });
  });

  const shoppingPanel = root.querySelector('.shopping-panel');
  const items = buildShoppingList(dishes, servings);
  shoppingPanel.innerHTML = `<div class="shopping-header"><div class="shopping-heading"><div><span class="eyebrow">一次买齐</span><h2 id="shopping-title">采购清单</h2><p>勾选状态会保存在这台设备上</p><button class="button secondary shopping-copy" data-copy-list>复制清单</button></div><button class="shopping-collapse" data-collapse-list aria-expanded="true" aria-controls="shopping-groups" aria-label="收起整个采购清单"><span class="disclosure-chevron" aria-hidden="true"></span></button></div></div><div id="shopping-groups" class="shopping-groups"></div>`;
  let savedItems = [];
  try { savedItems = JSON.parse(localStorage.getItem(`shopping:${location.search}`) || '[]'); } catch {}
  const saved = new Set(Array.isArray(savedItems) ? savedItems : []);
  for (const category of CATEGORY_ORDER) {
    const categoryItems = items.filter((item) => item.shoppingCategory === category); if (!categoryItems.length) continue;
    const group = document.createElement('details'); group.className = 'shopping-group'; group.open = true; group.innerHTML = `<summary><h3>${category}<span>${categoryItems.length}</span></h3><span class="disclosure-chevron" aria-hidden="true"></span></summary><ul></ul>`;
    categoryItems.forEach((item) => { const id = `${item.key}|${item.unit}|${item.optional}`; const li = document.createElement('li'); const checked = saved.has(id);
      li.innerHTML = `<label class="check-row"><input type="checkbox" ${checked ? 'checked' : ''}><span class="custom-check"></span><span class="item-name"><span>${item.name}${item.optional ? '<small class="optional-label">可选</small>' : ''}</span><small class="ingredient-source">用于：${item.dishes.join('、')}</small></span><strong>${item.amount ?? ''}${item.unit === '适量' ? '适量' : item.unit}</strong></label>`;
      li.querySelector('input').addEventListener('change', (event) => { event.target.checked ? saved.add(id) : saved.delete(id); localStorage.setItem(`shopping:${location.search}`, JSON.stringify([...saved])); }); group.querySelector('ul').append(li);
    }); shoppingPanel.querySelector('.shopping-groups').append(group);
  }
  shoppingPanel.querySelector('[data-copy-list]').addEventListener('click', async () => { await copyText(shoppingListText(items)); showToast('采购清单已复制'); });
  const shoppingCollapse = shoppingPanel.querySelector('[data-collapse-list]');
  const shoppingGroups = shoppingPanel.querySelector('.shopping-groups');
  shoppingCollapse.addEventListener('click', () => {
    const expanded = shoppingCollapse.getAttribute('aria-expanded') === 'true';
    const nextState = getShoppingCollapseState(!expanded);
    shoppingCollapse.setAttribute('aria-expanded', nextState.ariaExpanded);
    shoppingCollapse.setAttribute('aria-label', nextState.label);
    shoppingGroups.hidden = nextState.groupsHidden;
  });

  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = new Map(tabs.map((tab) => [tab, root.querySelector(`#${tab.getAttribute('aria-controls')}`)]));
  const selectTab = (nextTab, focus = false) => {
    for (const tab of tabs) {
      const selected = tab === nextTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels.get(tab).hidden = !selected;
    }
    if (focus) nextTab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = getNextResultTabIndex(index, event.key, tabs.length);
      selectTab(tabs[nextIndex], true);
    });
  });
}
