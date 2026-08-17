import { MAX_SUGGESTION_LENGTH } from '../../domain/menu-state.js';

export function stepServings(value, delta) {
  return Math.min(8, Math.max(1, value + delta));
}

export function getMenuPrimaryActionLabel(selected) {
  return selected.length ? '完成选菜' : '发送建议';
}

export function createMenuDrawer({ selected, dishMap, servings, notes, suggestion, conflictingIds = new Set(), onNote, onSuggestion, onRemove, onClear, onServings, onGenerate, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) onClose(); });
  const drawer = document.createElement('section');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'drawer-title');
  drawer.tabIndex = -1;
  drawer.innerHTML = `<div class="drawer-handle"></div><div class="section-heading"><div><span class="eyebrow">已选菜品</span><h2 id="drawer-title">今日菜单</h2></div><button class="icon-button" data-close aria-label="关闭菜单">×</button></div>`;
  if (conflictingIds.size) {
    const conflictNotice = document.createElement('p');
    conflictNotice.className = 'dietary-conflict-notice';
    conflictNotice.setAttribute('role', 'status');
    conflictNotice.textContent = `已保留 ${conflictingIds.size} 道与当前忌口冲突的菜，请确认是否移除`;
    drawer.append(conflictNotice);
  }
  const list = document.createElement('ul');
  list.className = 'selected-list';
  for (const id of selected) {
    const dish = dishMap.get(id);
    const item = document.createElement('li');
    item.innerHTML = `<div class="selected-dish">
      <div class="selected-dish-row">
        <span class="selected-dish-name"><strong>${dish.name}</strong>${conflictingIds.has(id) ? '<small class="dietary-conflict-label">与当前忌口冲突</small>' : ''}</span>
        <div class="note-control"></div>
        <button class="text-button danger dish-remove" data-remove aria-label="移除 ${dish.name}">移除</button>
      </div>
      <div class="note-editor" hidden>
        <label><span class="sr-only">给${dish.name}添加备注</span><input type="text" maxlength="80" placeholder="例如：少辣、不要葱"></label>
        <button type="button" class="note-done" aria-label="完成${dish.name}备注">完成</button>
      </div>
    </div>`;
    const noteControl = item.querySelector('.note-control');
    const noteEditor = item.querySelector('.note-editor');
    const noteInput = item.querySelector('input');

    const openNoteEditor = () => {
      noteControl.hidden = true;
      noteEditor.hidden = false;
      noteInput.focus();
    };
    const renderNoteControl = () => {
      const value = noteInput.value.trim();
      noteControl.replaceChildren();
      if (value) {
        const chip = document.createElement('span');
        chip.className = 'note-chip';
        chip.setAttribute('aria-label', `${dish.name}的备注：${value}`);
        const summary = document.createElement('span');
        summary.className = 'note-chip-text';
        summary.textContent = value;
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'note-chip-action';
        edit.setAttribute('aria-label', `修改${dish.name}的备注`);
        edit.textContent = '✎';
        edit.addEventListener('click', openNoteEditor);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'note-chip-action note-chip-delete';
        remove.setAttribute('aria-label', `删除${dish.name}的备注`);
        remove.textContent = '×';
        remove.addEventListener('click', (event) => {
          noteInput.value = '';
          onNote(id, '');
          renderNoteControl();
          if (event.detail === 0) noteControl.querySelector('button').focus();
        });
        chip.append(summary, edit, remove);
        noteControl.append(chip);
      } else {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'note-add';
        add.setAttribute('aria-label', `给${dish.name}添加备注`);
        add.textContent = '＋ 添加备注';
        add.addEventListener('click', openNoteEditor);
        noteControl.append(add);
      }
    };
    const closeNoteEditor = (restoreFocus = false) => {
      noteEditor.hidden = true;
      noteControl.hidden = false;
      renderNoteControl();
      if (restoreFocus) noteControl.querySelector('button').focus();
    };

    item.querySelector('[data-remove]').addEventListener('click', () => onRemove(id));
    noteInput.value = notes[id] || '';
    noteInput.addEventListener('input', (event) => onNote(id, event.target.value));
    noteInput.addEventListener('keydown', (event) => {
      if (event.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        closeNoteEditor(false);
      }
      if (event.key === 'Escape') closeNoteEditor(true);
    });
    item.querySelector('.note-done').addEventListener('click', (event) => closeNoteEditor(event.detail === 0));
    renderNoteControl();
    list.append(item);
  }
  if (!selected.length) list.innerHTML = '<li class="empty-row">现有菜单里没有想吃的？可以在下面推荐新菜。</li>';
  drawer.append(list);
  const suggestionField = document.createElement('section');
  suggestionField.className = 'suggestion-field';
  suggestionField.setAttribute('aria-labelledby', 'suggestion-title');
  suggestionField.innerHTML = `<div><span class="eyebrow">菜单里没有？</span><h3 id="suggestion-title">推荐新菜</h3><p>可以写多道菜，每道菜用空格隔开</p></div><label><span class="sr-only">想添加的新菜</span><input type="text" maxlength="${MAX_SUGGESTION_LENGTH}" placeholder="例如：糖醋里脊 锅包肉" aria-describedby="suggestion-count"></label><small id="suggestion-count"><b>0</b> / ${MAX_SUGGESTION_LENGTH}</small>`;
  const suggestionInput = suggestionField.querySelector('input');
  const suggestionCount = suggestionField.querySelector('small b');
  suggestionInput.value = suggestion || '';
  suggestionCount.textContent = suggestionInput.value.length;
  suggestionInput.addEventListener('input', (event) => {
    suggestionCount.textContent = event.target.value.length;
    onSuggestion(event.target.value);
    const canGenerate = selected.length > 0 || event.target.value.trim().length > 0;
    drawer.querySelector('[data-generate]').disabled = !canGenerate;
    drawer.querySelector('[data-clear]').disabled = !canGenerate;
  });
  drawer.append(suggestionField);
  const controls = document.createElement('div');
  controls.className = 'drawer-controls';
  controls.innerHTML = `<label for="servings">用餐人数</label><div class="stepper"><button data-minus aria-label="减少人数">−</button><output id="servings">${servings} 人</output><button data-plus aria-label="增加人数">+</button></div>`;
  const minus = controls.querySelector('[data-minus]');
  const plus = controls.querySelector('[data-plus]');
  const output = controls.querySelector('output');
  let currentServings = servings;
  const updateServings = (nextValue) => {
    if (nextValue === currentServings) return;
    currentServings = nextValue;
    output.value = `${currentServings} 人`;
    output.textContent = `${currentServings} 人`;
    minus.disabled = currentServings === 1;
    plus.disabled = currentServings === 8;
    onServings(currentServings);
  };
  minus.disabled = currentServings === 1;
  plus.disabled = currentServings === 8;
  minus.addEventListener('click', () => updateServings(stepServings(currentServings, -1)));
  plus.addEventListener('click', () => updateServings(stepServings(currentServings, 1)));
  drawer.append(controls);
  const actions = document.createElement('div');
  actions.className = 'drawer-actions';
  const canGenerate = selected.length > 0 || suggestion?.trim();
  actions.innerHTML = `<button class="button primary" data-generate ${canGenerate ? '' : 'disabled'}>${getMenuPrimaryActionLabel(selected)}</button><button class="button secondary" data-close2>继续选菜</button><button class="text-button danger" data-clear ${canGenerate ? '' : 'disabled'}>清空全部</button>`;
  actions.querySelector('[data-generate]').addEventListener('click', onGenerate);
  actions.querySelector('[data-close2]').addEventListener('click', onClose);
  actions.querySelector('[data-clear]').addEventListener('click', onClear);
  drawer.append(actions);
  drawer.querySelector('[data-close]').addEventListener('click', onClose);
  backdrop.append(drawer);
  return backdrop;
}
