import { buildHouseholdCombination } from '../../domain/menu-combination.js';
import { stepServings } from './menu-drawer.js';

const CATEGORY_EMOJI = { vegetable: '🥬', meat: '🥩', mixed: '🍲', stew: '🥘', soup: '🥣' };
const ROLE_LABELS = { main: '荤菜', vegetable: '素菜', soup: '汤' };

function targetSummary(target) {
  return [
    target.main ? `${target.main} 荤` : '',
    target.vegetable ? `${target.vegetable} 素` : '',
    target.soup ? `${target.soup} 汤` : '',
  ].filter(Boolean).join(' · ');
}

export function getCombinationShortageText(missing) {
  const labels = Object.entries(missing)
    .filter(([, count]) => count > 0)
    .map(([role, count]) => `${count} 道${ROLE_LABELS[role]}`);
  return labels.length
    ? `当前忌口和候选下还缺${labels.join('、')}，先保留这份有效搭配。`
    : '';
}

export function createCombinationDialog({
  dishes,
  selectedIds,
  servings,
  avoid,
  onAdd,
  onClose,
}) {
  const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop combination-backdrop';
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) onClose();
  });

  const dialog = document.createElement('section');
  dialog.className = 'drawer combination-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'combination-title');
  dialog.tabIndex = -1;
  dialog.innerHTML = `<div class="drawer-handle"></div>
    <div class="section-heading combination-heading">
      <div><span class="eyebrow">按人数和忌口搭配</span><h2 id="combination-title">今天这样吃</h2></div>
      <button class="icon-button" type="button" data-close-combination aria-label="关闭家常搭配">×</button>
    </div>
    <div class="combination-servings">
      <div><strong>用餐人数</strong><small>人数变化后重新搭配</small></div>
      <div class="stepper"><button type="button" data-combination-minus aria-label="减少搭配人数">−</button><output></output><button type="button" data-combination-plus aria-label="增加搭配人数">+</button></div>
    </div>
    <p class="combination-ratio"></p>
    <section class="combination-preserved" aria-labelledby="combination-preserved-title" hidden>
      <div class="combination-section-title"><strong id="combination-preserved-title">保留已选</strong><small>不会删除或重排</small></div>
      <div class="combination-preserved-tags"></div>
    </section>
    <section class="combination-suggested" aria-labelledby="combination-suggested-title">
      <div class="combination-section-title"><strong id="combination-suggested-title">建议补充</strong><small>加入前可以换一组</small></div>
      <ul class="combination-suggested-list"></ul>
    </section>
    <p class="combination-shortage" role="status" hidden></p>
    <div class="combination-actions">
      <button class="button secondary" type="button" data-another-combination>换一组</button>
      <button class="button primary" type="button" data-add-combination>加入菜单</button>
    </div>`;

  const output = dialog.querySelector('output');
  const minus = dialog.querySelector('[data-combination-minus]');
  const plus = dialog.querySelector('[data-combination-plus]');
  const preserved = dialog.querySelector('.combination-preserved');
  const preservedTags = dialog.querySelector('.combination-preserved-tags');
  const suggestedList = dialog.querySelector('.combination-suggested-list');
  const shortage = dialog.querySelector('.combination-shortage');
  const another = dialog.querySelector('[data-another-combination]');
  const add = dialog.querySelector('[data-add-combination]');
  let currentServings = servings;
  let variant = 0;
  let result;
  let nextVariant = null;

  const findNextVariant = () => {
    const currentKey = result.additions.join(',');
    for (let distance = 1; distance <= dishes.length; distance += 1) {
      const candidateVariant = variant + distance;
      const candidate = buildHouseholdCombination({
        dishes,
        servings: currentServings,
        avoid,
        selectedIds,
        variant: candidateVariant,
      });
      if (candidate.additions.join(',') !== currentKey) return candidateVariant;
    }
    return null;
  };

  const render = () => {
    result = buildHouseholdCombination({
      dishes,
      servings: currentServings,
      avoid,
      selectedIds,
      variant,
    });
    output.value = `${currentServings} 人`;
    output.textContent = `${currentServings} 人`;
    minus.disabled = currentServings === 1;
    plus.disabled = currentServings === 8;
    dialog.querySelector('.combination-ratio').textContent = `${currentServings} 人家常搭配 · ${targetSummary(result.target)}`;

    preserved.hidden = result.selectedIds.length === 0;
    preservedTags.replaceChildren();
    for (const id of result.selectedIds) {
      const dish = dishMap.get(id);
      if (!dish) continue;
      const tag = document.createElement('span');
      tag.textContent = dish.name;
      preservedTags.append(tag);
    }

    suggestedList.replaceChildren();
    for (const id of result.additions) {
      const dish = dishMap.get(id);
      if (!dish) continue;
      const item = document.createElement('li');
      item.innerHTML = `<span class="combination-dish-art" aria-hidden="true">${CATEGORY_EMOJI[dish.category] || '🍽️'}</span><span><strong></strong><small>${dish.categoryName} · ${dish.durationMinutes} 分钟</small></span>`;
      item.querySelector('strong').textContent = dish.name;
      suggestedList.append(item);
    }
    if (!result.additions.length) {
      const item = document.createElement('li');
      item.className = 'combination-complete';
      item.textContent = result.complete ? '现有菜单已经够一桌了。' : '当前条件下没有可以补充的菜。';
      suggestedList.append(item);
    }

    const shortageText = getCombinationShortageText(result.missing);
    shortage.hidden = !shortageText;
    shortage.textContent = shortageText;
    nextVariant = findNextVariant();
    another.disabled = nextVariant == null;
    add.textContent = result.additions.length ? `加入 ${result.additions.length} 道菜` : '保留当前菜单';
  };

  const changeServings = (delta) => {
    const nextServings = stepServings(currentServings, delta);
    if (nextServings === currentServings) return;
    currentServings = nextServings;
    variant = 0;
    render();
  };

  minus.addEventListener('click', () => changeServings(-1));
  plus.addEventListener('click', () => changeServings(1));
  another.addEventListener('click', () => {
    if (nextVariant == null) return;
    variant = nextVariant;
    render();
  });
  add.addEventListener('click', () => onAdd({
    combinedIds: result.combinedIds,
    additions: result.additions,
    servings: currentServings,
  }));
  dialog.querySelector('[data-close-combination]').addEventListener('click', onClose);

  render();
  backdrop.append(dialog);
  return backdrop;
}
