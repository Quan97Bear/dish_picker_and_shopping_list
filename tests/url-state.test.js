import { describe, expect, it } from 'vitest';
import { decodeMenu, encodeMenu, splitSuggestionList } from '../src/menu-state.js';
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
});
