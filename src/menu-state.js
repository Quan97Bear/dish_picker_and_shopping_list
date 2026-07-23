export const DEFAULT_SERVINGS = 2;
export const MAX_DISHES = 12;
export const MAX_SUGGESTION_LENGTH = 60;
export const PROTOCOL_VERSION = '1';

export function normalizeServings(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 8 ? parsed : DEFAULT_SERVINGS;
}

export function normalizeSuggestion(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_SUGGESTION_LENGTH) : '';
}

export function decodeMenu(search, validIds, aliases = {}) {
  const params = new URLSearchParams(search);
  if (!params.has('menu')) return { mode: 'picker', ids: [], servings: DEFAULT_SERVINGS, notes: {}, suggestion: '', warnings: [] };
  const warnings = [];
  if (params.get('v') && params.get('v') !== PROTOCOL_VERSION) warnings.push('链接版本无法识别，已尽量恢复菜单');
  const raw = params.get('menu') || '';
  const safeParts = raw && raw.length <= 512 ? raw.split(',').slice(0, MAX_DISHES) : [];
  const seen = new Set();
  const ids = [];
  let invalid = false;
  for (const rawId of safeParts) {
    if (!/^[a-z0-9-]{1,64}$/.test(rawId)) { invalid = true; continue; }
    const id = aliases[rawId] || rawId;
    if (!validIds.has(id)) { invalid = true; continue; }
    if (!seen.has(id)) { seen.add(id); ids.push(id); }
  }
  if (invalid) warnings.push('部分菜品已下架或链接无效');
  const notes = {};
  try {
    const parsedNotes = JSON.parse(params.get('notes') || '{}');
    for (const id of ids) {
      if (typeof parsedNotes[id] === 'string' && parsedNotes[id].trim()) notes[id] = parsedNotes[id].trim().slice(0, 80);
    }
  } catch { warnings.push('部分点菜备注无法读取'); }
  return { mode: 'recipient', ids, servings: normalizeServings(params.get('p')), notes, suggestion: normalizeSuggestion(params.get('suggestion')), warnings };
}

export function encodeMenu(ids, servings, notes = {}, baseUrl = window.location.href, suggestion = '') {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set('menu', [...new Set(ids)].slice(0, MAX_DISHES).join(','));
  url.searchParams.set('p', String(normalizeServings(servings)));
  url.searchParams.set('v', PROTOCOL_VERSION);
  const sharedNotes = Object.fromEntries(ids.filter((id) => notes[id]?.trim()).map((id) => [id, notes[id].trim().slice(0, 80)]));
  if (Object.keys(sharedNotes).length) url.searchParams.set('notes', JSON.stringify(sharedNotes));
  const sharedSuggestion = normalizeSuggestion(suggestion);
  if (sharedSuggestion) url.searchParams.set('suggestion', sharedSuggestion);
  return url.toString();
}
