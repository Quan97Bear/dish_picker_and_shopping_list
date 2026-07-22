export function createMenuDrawer({ selected, dishMap, servings, notes, onNote, onRemove, onClear, onServings, onGenerate, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) onClose(); });
  const drawer = document.createElement('section');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'drawer-title');
  drawer.innerHTML = `<div class="drawer-handle"></div><div class="section-heading"><div><span class="eyebrow">已选菜品</span><h2 id="drawer-title">今日菜单</h2></div><button class="icon-button" data-close aria-label="关闭菜单">×</button></div>`;
  const list = document.createElement('ul');
  list.className = 'selected-list';
  for (const id of selected) {
    const item = document.createElement('li');
    item.innerHTML = `<div class="selected-dish"><div><strong>${dishMap.get(id).name}</strong><button class="text-button danger" aria-label="移除 ${dishMap.get(id).name}">移除</button></div><label><span class="sr-only">给${dishMap.get(id).name}添加备注</span><input type="text" maxlength="80" placeholder="备注，例如：少辣、不要葱"></label></div>`;
    item.querySelector('button').addEventListener('click', () => onRemove(id));
    item.querySelector('input').value = notes[id] || '';
    item.querySelector('input').addEventListener('input', (event) => onNote(id, event.target.value));
    list.append(item);
  }
  if (!selected.length) list.innerHTML = '<li class="empty-row">还没有选菜，去挑几道吧。</li>';
  drawer.append(list);
  const controls = document.createElement('div');
  controls.className = 'drawer-controls';
  controls.innerHTML = `<label for="servings">用餐人数</label><div class="stepper"><button data-minus aria-label="减少人数">−</button><output id="servings">${servings} 人</output><button data-plus aria-label="增加人数">+</button></div>`;
  controls.querySelector('[data-minus]').addEventListener('click', () => onServings(Math.max(1, servings - 1)));
  controls.querySelector('[data-plus]').addEventListener('click', () => onServings(Math.min(8, servings + 1)));
  drawer.append(controls);
  const actions = document.createElement('div');
  actions.className = 'drawer-actions';
  actions.innerHTML = `<button class="button primary" data-generate ${selected.length ? '' : 'disabled'}>生成菜单</button><button class="button secondary" data-close2>继续选菜</button><button class="text-button danger" data-clear ${selected.length ? '' : 'disabled'}>清空全部</button>`;
  actions.querySelector('[data-generate]').addEventListener('click', onGenerate);
  actions.querySelector('[data-close2]').addEventListener('click', onClose);
  actions.querySelector('[data-clear]').addEventListener('click', onClear);
  drawer.append(actions);
  drawer.querySelector('[data-close]').addEventListener('click', onClose);
  backdrop.append(drawer);
  return backdrop;
}
