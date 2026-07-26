import { describe, expect, it } from 'vitest';
import {
  MAX_DISHES,
  decodeMenu,
  encodeMenu,
  normalizeDraft,
  normalizeServings,
  normalizeSuggestion,
  splitSuggestionList
} from '../src/domain/menu-state.js';
const valid = new Set(['tomato-egg', 'pepper-pork', 'seaweed-egg-soup']);
describe('URL menu state', () => {
  it('returns picker mode without menu', () => expect(decodeMenu('', valid).mode).toBe('picker'));
  it('deduplicates, removes unknown ids, and keeps order', () => expect(decodeMenu('?menu=pepper-pork,bad,tomato-egg,pepper-pork&p=3&v=1', valid)).toMatchObject({ ids: ['pepper-pork','tomato-egg'], servings: 3 }));
  it('falls back for invalid servings', () => expect(decodeMenu('?menu=tomato-egg&p=99', valid).servings).toBe(2));
  it('encodes only unique ids', () => expect(new URL(encodeMenu(['tomato-egg','tomato-egg'],2,{},'https://example.test/')).searchParams.get('menu')).toBe('tomato-egg'));
  it('shares notes for selected dishes', () => { const url = encodeMenu(['tomato-egg'],2,{'tomato-egg':'不要葱'},'https://example.test/'); expect(decodeMenu(new URL(url).search,valid).notes).toEqual({'tomato-egg':'不要葱'}); });
  it('shares a new-dish suggestion without selected dishes', () => { const url = encodeMenu([],2,{},'https://example.test/','糖醋里脊'); expect(decodeMenu(new URL(url).search,valid)).toMatchObject({ mode:'recipient', ids:[], suggestion:'糖醋里脊', warnings:[] }); });
  it('normalizes and limits suggestions', () => { const url = encodeMenu([],2,{},'https://example.test/',`  想吃   ${'菜'.repeat(80)}  `); const suggestion = decodeMenu(new URL(url).search,valid).suggestion; expect(suggestion.startsWith('想吃 菜')).toBe(true); expect(suggestion.length).toBe(60); });
  it('renders space-separated suggestions as separate dishes', () => expect(splitSuggestionList('锅包肉 包菜')).toEqual(['锅包肉', '包菜']));
  it('supports punctuation and line breaks between suggested dishes', () => expect(splitSuggestionList('糖醋里脊、锅包肉\n手撕包菜')).toEqual(['糖醋里脊', '锅包肉', '手撕包菜']));
  it('cleans corrupted local drafts before rendering', () => expect(normalizeDraft({
    selected: ['tomato-egg', 'bad', 'tomato-egg'],
    servings: 99,
    notes: { 'tomato-egg': '  不要葱  ', bad: '忽略' },
    suggestion: '  锅包肉   包菜  '
  }, valid)).toEqual({
    selected: ['tomato-egg'],
    servings: 2,
    notes: { 'tomato-egg': '不要葱' },
    suggestion: '锅包肉 包菜'
  }));

  it('accepts only servings from 1 through 8', () => {
    expect([1, 2, 8].map(normalizeServings)).toEqual([1, 2, 8]);
    expect([0, 9, -1, '', null, undefined, 'abc'].map(normalizeServings)).toEqual([2, 2, 2, 2, 2, 2, 2]);
  });

  it('normalizes non-string suggestions to an empty value', () => {
    expect(normalizeSuggestion(null)).toBe('');
    expect(normalizeSuggestion(['锅包肉'])).toBe('');
    expect(normalizeSuggestion({ dish: '锅包肉' })).toBe('');
  });

  it('resolves legacy aliases before validating and deduplicating IDs', () => {
    const aliases = { 'old-tomato-egg': 'tomato-egg', 'older-tomato-egg': 'tomato-egg' };
    expect(decodeMenu('?menu=old-tomato-egg,older-tomato-egg', valid, aliases).ids).toEqual(['tomato-egg']);
  });

  it('warns for an unsupported protocol version while preserving valid state', () => {
    const decoded = decodeMenu('?menu=tomato-egg&p=4&v=99', valid);
    expect(decoded).toMatchObject({ ids: ['tomato-egg'], servings: 4 });
    expect(decoded.warnings).toContain('链接版本无法识别，已尽量恢复菜单');
  });

  it('warns and ignores malformed notes without losing the menu', () => {
    const decoded = decodeMenu('?menu=tomato-egg&notes=%7Bbad-json', valid);
    expect(decoded.ids).toEqual(['tomato-egg']);
    expect(decoded.notes).toEqual({});
    expect(decoded.warnings).toContain('部分点菜备注无法读取');
  });

  it('keeps notes only for selected dishes and limits them to 80 characters', () => {
    const notes = encodeURIComponent(JSON.stringify({
      'tomato-egg': `  ${'菜'.repeat(90)}  `,
      'pepper-pork': '不应保留'
    }));
    const decoded = decodeMenu(`?menu=tomato-egg&notes=${notes}`, valid);
    expect(decoded.notes['tomato-egg']).toHaveLength(80);
    expect(decoded.notes['pepper-pork']).toBeUndefined();
  });

  it('limits decoded and encoded menus to the maximum dish count', () => {
    const manyIds = Array.from({ length: MAX_DISHES + 5 }, (_, index) => `dish-${index}`);
    const manyValidIds = new Set(manyIds);
    const decoded = decodeMenu(`?menu=${manyIds.join(',')}`, manyValidIds);
    expect(decoded.ids).toEqual(manyIds.slice(0, MAX_DISHES));

    const encoded = new URL(encodeMenu(manyIds, 2, {}, 'https://example.test/'));
    expect(encoded.searchParams.get('menu').split(',')).toEqual(manyIds.slice(0, MAX_DISHES));
  });

  it('removes stale query parameters and fragments when encoding a share URL', () => {
    const encoded = new URL(encodeMenu(
      ['tomato-egg'],
      2,
      {},
      'https://example.test/path?stale=1#section'
    ));
    expect(encoded.pathname).toBe('/path');
    expect(encoded.searchParams.has('stale')).toBe(false);
    expect(encoded.hash).toBe('');
  });

  it('encodes only selected, non-empty notes and trims their whitespace', () => {
    const encoded = new URL(encodeMenu(
      ['tomato-egg'],
      2,
      { 'tomato-egg': '  少油  ', 'pepper-pork': '不要辣' },
      'https://example.test/'
    ));
    expect(JSON.parse(encoded.searchParams.get('notes'))).toEqual({ 'tomato-egg': '少油' });
  });

  it('normalizes an empty or non-object draft to safe defaults', () => {
    expect(normalizeDraft(null, valid)).toEqual({
      selected: [],
      servings: 2,
      notes: {},
      suggestion: ''
    });
    expect(normalizeDraft('corrupted', valid)).toEqual({
      selected: [],
      servings: 2,
      notes: {},
      suggestion: ''
    });
  });

  it('drops blank suggestion separators', () => {
    expect(splitSuggestionList('，  、；\n')).toEqual([]);
  });
});
