import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  createIngredientLookup,
  getDishIngredientRole,
  getIngredientGuideEntry,
  resolveIngredientKey,
  validateIngredientGuide
} from '../src/domain/ingredient-guide.js';

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
const full = read('dishes.json');
const guide = read('ingredient-guide.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

describe('ingredient guide', () => {
  it('covers every runtime ingredient with one stable key', () => {
    expect(validateIngredientGuide(guide, full.dishes)).toBe(true);
    const usedKeys = new Set(full.dishes.flatMap((dish) => dish.ingredients.map((ingredient) => ingredient.key)));
    expect(guide.ingredients).toHaveLength(59);
    expect(new Set(guide.ingredients.map((ingredient) => ingredient.key))).toEqual(usedKeys);
  });

  it('resolves standard names, aliases, normalized text, and stable keys', () => {
    expect(resolveIngredientKey(guide, '西红柿')).toBe('tomato');
    expect(resolveIngredientKey(guide, ' 番茄 ')).toBe('tomato');
    expect(resolveIngredientKey(guide, 'TOMATO')).toBe('tomato');
    expect(resolveIngredientKey(guide, '松花蛋')).toBe('century-egg');
    expect(resolveIngredientKey(guide, '不存在')).toBeNull();
    expect(createIngredientLookup(guide).size).toBeGreaterThan(guide.ingredients.length);
  });

  it('keeps ingredients that are not interchangeable on separate keys', () => {
    expect(resolveIngredientKey(guide, '北豆腐')).toBe('tofu');
    expect(resolveIngredientKey(guide, '嫩豆腐')).toBe('silken-tofu');
    expect(resolveIngredientKey(guide, '小葱')).toBe('scallion');
    expect(resolveIngredientKey(guide, '大葱')).toBe('welsh-onion');
    expect(resolveIngredientKey(guide, '粉丝')).toBe('glass-noodle');
    expect(resolveIngredientKey(guide, '红薯粉条')).toBe('sweet-potato-noodle');
    expect(resolveIngredientKey(guide, '小白菜')).toBe('bok-choy');
    expect(resolveIngredientKey(guide, '油菜')).toBe('rapeseed-greens');
  });

  it('provides core, auxiliary, and optional roles per dish', () => {
    expect(getDishIngredientRole(guide, 'tomato-egg', 'tomato')).toBe('core');
    expect(getDishIngredientRole(guide, 'tomato-egg', 'salt')).toBe('auxiliary');
    expect(getDishIngredientRole(guide, 'tomato-egg', 'sugar')).toBe('optional');
    expect(getDishIngredientRole(guide, 'missing-dish', 'salt')).toBeNull();
  });

  it('keeps pantry and purchase metadata separate from recipe quantities', () => {
    const pantryEntries = guide.ingredients.filter((ingredient) => ingredient.pantryStaple);
    expect(pantryEntries.length).toBeGreaterThan(0);
    expect(pantryEntries.every((ingredient) => ingredient.shoppingCategory === '调味品')).toBe(true);
    expect(getIngredientGuideEntry(guide, 'pork-ribs').purchaseTip).toContain('炖汤');
    expect(guide.ingredients.every((ingredient) => !('amount' in ingredient) && !('unit' in ingredient))).toBe(true);
  });

  it('rejects duplicate names or aliases', () => {
    const invalid = clone(guide);
    invalid.ingredients[1].aliases.push(invalid.ingredients[0].name);
    expect(() => validateIngredientGuide(invalid, full.dishes)).toThrow('名称或别名重复');
  });

  it('rejects incomplete dish role assignments', () => {
    const invalid = clone(guide);
    invalid.dishIngredientRoles['tomato-egg'].core = ['tomato'];
    expect(() => validateIngredientGuide(invalid, full.dishes)).toThrow('角色没有覆盖全部食材');
  });

  it('rejects optional ingredients assigned to a non-optional role', () => {
    const invalid = clone(guide);
    invalid.dishIngredientRoles['tomato-egg'].optional = [];
    invalid.dishIngredientRoles['tomato-egg'].auxiliary.push('sugar');
    expect(() => validateIngredientGuide(invalid, full.dishes)).toThrow('可选状态与角色不一致');
  });

  it('rejects recipe names that are absent from the canonical entry and aliases', () => {
    const invalidDishes = clone(full.dishes);
    invalidDishes[0].ingredients[0].name = '红果';
    expect(() => validateIngredientGuide(guide, invalidDishes)).toThrow('名称未纳入标准或别名');
  });
});
