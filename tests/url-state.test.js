import { describe, expect, it } from 'vitest';
import { decodeMenu, encodeMenu } from '../src/menu-state.js';
const valid = new Set(['tomato-egg', 'pepper-pork', 'seaweed-egg-soup']);
describe('URL menu state', () => {
  it('returns picker mode without menu', () => expect(decodeMenu('', valid).mode).toBe('picker'));
  it('deduplicates, removes unknown ids, and keeps order', () => expect(decodeMenu('?menu=pepper-pork,bad,tomato-egg,pepper-pork&p=3&v=1', valid)).toMatchObject({ ids: ['pepper-pork','tomato-egg'], servings: 3 }));
  it('falls back for invalid servings', () => expect(decodeMenu('?menu=tomato-egg&p=99', valid).servings).toBe(2));
  it('encodes only unique ids', () => expect(new URL(encodeMenu(['tomato-egg','tomato-egg'],2,{},'https://example.test/')).searchParams.get('menu')).toBe('tomato-egg'));
  it('shares notes for selected dishes', () => { const url = encodeMenu(['tomato-egg'],2,{'tomato-egg':'不要葱'},'https://example.test/'); expect(decodeMenu(new URL(url).search,valid).notes).toEqual({'tomato-egg':'不要葱'}); });
});
