import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  getCommonPantryIngredients,
  matchDishesByPantry,
  searchPantryIngredients
} from '../src/domain/pantry-matcher.js';

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
const dishes = read('dishes.json').dishes;
const guide = read('ingredient-guide.json');

function ids(items) {
  return items.map((item) => item.dish.id);
}

describe('pantry matcher', () => {
  it('groups dishes by zero, one, or two missing core ingredients', () => {
    const result = matchDishesByPantry({ dishes, guide, selectedKeys: ['tomato', 'egg'] });
    expect(ids(result.ready)).toContain('tomato-egg');
    expect(ids(result.ready)).toContain('tomato-egg-soup');
    expect(result.missingOne.every((item) => item.missingKeys.length === 1)).toBe(true);
    expect(result.missingTwo.every((item) => item.missingKeys.length === 2)).toBe(true);
  });

  it('does not count auxiliary, optional, or pantry ingredients as missing', () => {
    const result = matchDishesByPantry({ dishes, guide, selectedKeys: ['potato'] });
    const potato = result.ready.find((item) => item.dish.id === 'hot-sour-potato');
    expect(potato).toBeTruthy();
    expect(potato.missingKeys).toEqual([]);
  });

  it('keeps distinct tofu and leafy-green identities separate', () => {
    const result = matchDishesByPantry({ dishes, guide, selectedKeys: ['tofu', 'bok-choy'] });
    expect(ids(result.ready)).toContain('scallion-tofu');
    expect(ids(result.ready)).toContain('stir-fried-bok-choy');
    expect(ids(result.ready)).not.toContain('mapo-tofu');
    expect(ids(result.ready)).not.toContain('mushroom-bok-choy');
  });

  it('excludes dishes that conflict with current dietary filters', () => {
    const result = matchDishesByPantry({ dishes, guide, selectedKeys: ['tomato', 'egg'], avoid: ['egg'] });
    expect([...result.ready, ...result.missingOne, ...result.missingTwo]
      .every((item) => !item.dish.avoid.includes('egg'))).toBe(true);
  });

  it('ignores unknown selected keys safely', () => {
    const withUnknown = matchDishesByPantry({ dishes, guide, selectedKeys: ['tomato', 'egg', 'unknown'] });
    const withoutUnknown = matchDishesByPantry({ dishes, guide, selectedKeys: ['tomato', 'egg'] });
    expect(withUnknown).toEqual(withoutUnknown);
  });

  it('searches standard names and artificial aliases', () => {
    expect(searchPantryIngredients(guide, dishes, '西红柿')[0].key).toBe('tomato');
    expect(searchPantryIngredients(guide, dishes, '番茄')[0].key).toBe('tomato');
    expect(searchPantryIngredients(guide, dishes, '肉末')[0].key).toBe('ground-pork');
  });

  it('only offers ingredients that are core to at least one dish', () => {
    const common = getCommonPantryIngredients(guide, dishes, 100);
    expect(common.length).toBeGreaterThan(0);
    expect(common.some((ingredient) => ingredient.key === 'salt')).toBe(false);
    expect(common.some((ingredient) => ingredient.key === 'cooking-oil')).toBe(false);
    expect(common.every((ingredient) => !ingredient.pantryStaple)).toBe(true);
  });

  it('orders groups by recommendation after missing count', () => {
    const result = matchDishesByPantry({ dishes, guide, selectedKeys: ['egg'] });
    expect(result.ready.map((item) => item.dish.homestyleRank))
      .toEqual([...result.ready.map((item) => item.dish.homestyleRank)].sort((a, b) => a - b));
  });
});
