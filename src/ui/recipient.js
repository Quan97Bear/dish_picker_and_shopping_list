import { buildShoppingList, CATEGORY_ORDER, shoppingListText } from '../shopping-list.js';
import { copyText } from '../utils/share.js';
import { showToast } from './toast.js';

export function renderRecipient(root, { dishes, servings, notes = {}, suggestion = '', warnings = [] }) {
  const title = dishes.length ? '今晚吃这些' : suggestion ? '收到新菜建议' : '这份菜单空空的';
  const subtitle = dishes.length ? `${dishes.length} 道菜 · ${servings} 人份` : suggestion ? '选菜人想在菜单里看到这些菜。' : '菜品可能已下架，或链接不完整。';
  root.innerHTML = `<header class="site-header"><a class="brand" href="./"><span class="brand-mark">食</span><span>今晚吃什么</span></a><a class="header-link" href="./">重新选菜</a></header><main id="main" class="recipient-main"><section class="menu-hero"><span class="eyebrow">今晚的餐桌</span><h1>${title}</h1><p>${subtitle}</p><div class="menu-tags"></div>${dishes.length ? '<button class="button primary shopping-trigger">生成采购清单 <span>↓</span></button>' : '<a class="button primary" href="./">返回菜单</a>'}</section><section class="warning-area" aria-live="polite"></section><section class="suggestion-card" ${suggestion ? '' : 'hidden'} aria-labelledby="suggestion-card-title"><span class="eyebrow">新菜建议</span><h2 id="suggestion-card-title">想新增这些菜</h2><div class="suggestion-tags"></div></section><section class="shopping-panel" hidden aria-labelledby="shopping-title"></section><section class="recipes" ${dishes.length ? '' : 'hidden'} aria-labelledby="recipes-title"><div class="section-heading"><div><span class="eyebrow">照着做就好</span><h2 id="recipes-title">菜谱详情</h2></div></div><div class="recipe-list"></div></section></main>`;
  const tags = root.querySelector('.menu-tags');
  dishes.forEach((dish) => { const tag = document.createElement('span'); tag.textContent = dish.name; tags.append(tag); });
  const warningArea = root.querySelector('.warning-area');
  warnings.forEach((warning) => { const note = document.createElement('p'); note.className = 'notice'; note.textContent = warning; warningArea.append(note); });
  if (suggestion) {
    const suggestionTags = root.querySelector('.suggestion-tags');
    const suggestions = suggestion.split(/[，,、；;\n]+/).map((item) => item.trim()).filter(Boolean);
    for (const name of suggestions) {
      const tag = document.createElement('span');
      tag.textContent = name;
      suggestionTags.append(tag);
    }
  }
  const recipeList = root.querySelector('.recipe-list');
  dishes.forEach((dish, index) => {
    const details = document.createElement('details'); details.className = 'recipe-card'; details.open = index === 0;
    details.innerHTML = `<summary><div><span class="recipe-number">${String(index + 1).padStart(2, '0')}</span><h3>${dish.name}</h3></div><div class="recipe-summary-meta"><span>${dish.durationMinutes} 分钟</span><span>难度 ${dish.difficulty}/5</span><i aria-hidden="true">+</i></div></summary><div class="recipe-content"><div class="order-note" hidden><strong>点菜备注</strong><p></p></div><div><h4>食材 · ${servings} 人份</h4><ul class="ingredient-list"></ul></div><div><h4>做法</h4><ol class="step-list"></ol></div><div class="recipe-notes"><strong>小提示</strong><p>${dish.notes.join('；') || '调味请按口味调整。'}</p></div><a class="source-link" href="${dish.source.url}" target="_blank" rel="noopener noreferrer">查看菜谱来源 ↗</a></div>`;
    if (notes[dish.id]) { const note = details.querySelector('.order-note'); note.hidden = false; note.querySelector('p').textContent = notes[dish.id]; }
    const factor = servings / dish.servings;
    dish.ingredients.forEach((ingredient) => {
      const item = document.createElement('li'); const amount = ingredient.amount == null ? '' : Math.round(ingredient.amount * factor * 100) / 100;
      item.innerHTML = `<span>${ingredient.name}${ingredient.optional ? '<small>可选</small>' : ''}</span><strong>${amount}${ingredient.unit === '适量' ? '适量' : ingredient.unit}</strong>`; details.querySelector('.ingredient-list').append(item);
    });
    dish.steps.forEach((step) => { const item = document.createElement('li'); item.textContent = step; details.querySelector('.step-list').append(item); });
    recipeList.append(details);
  });
  root.querySelector('.shopping-trigger')?.addEventListener('click', () => {
    const items = buildShoppingList(dishes, servings); const panel = root.querySelector('.shopping-panel'); panel.hidden = false;
    panel.innerHTML = `<div class="shopping-header"><div><span class="eyebrow">一次买齐</span><h2 id="shopping-title">采购清单</h2><p>勾选状态会保存在这台设备上。</p></div><button class="button secondary" data-copy-list>复制清单</button></div><div class="shopping-groups"></div>`;
    const saved = new Set(JSON.parse(localStorage.getItem(`shopping:${location.search}`) || '[]'));
    for (const category of CATEGORY_ORDER) {
      const categoryItems = items.filter((item) => item.shoppingCategory === category); if (!categoryItems.length) continue;
      const group = document.createElement('section'); group.className = 'shopping-group'; group.innerHTML = `<h3>${category}<span>${categoryItems.length}</span></h3><ul></ul>`;
      categoryItems.forEach((item) => { const id = `${item.key}|${item.unit}|${item.optional}`; const li = document.createElement('li'); const checked = saved.has(id);
        li.innerHTML = `<label class="check-row"><input type="checkbox" ${checked ? 'checked' : ''}><span class="custom-check"></span><span class="item-name">${item.name}${item.optional ? '<small>可选</small>' : ''}</span><strong>${item.amount ?? ''}${item.unit === '适量' ? '适量' : item.unit}</strong></label>`;
        li.querySelector('input').addEventListener('change', (event) => { event.target.checked ? saved.add(id) : saved.delete(id); localStorage.setItem(`shopping:${location.search}`, JSON.stringify([...saved])); }); group.querySelector('ul').append(li);
      }); panel.querySelector('.shopping-groups').append(group);
    }
    panel.querySelector('[data-copy-list]').addEventListener('click', async () => { await copyText(shoppingListText(items)); showToast('采购清单已复制'); });
    panel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}
