import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildHouseholdCombination,
  getCombinationIngredientFamilies,
  getCombinationRole,
  getHouseholdMenuTarget,
} from '../src/domain/menu-combination.js';

const dishes = JSON.parse(readFileSync(new URL('../data/dishes.json', import.meta.url), 'utf8')).dishes;
const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));

function roleCounts(ids) {
  return ids.reduce((counts, id) => {
    const role = getCombinationRole(dishMap.get(id));
    if (role) counts[role] += 1;
    return counts;
  }, { main: 0, vegetable: 0, soup: 0 });
}

describe('household menu targets', () => {
  it.each([
    [1, { main: 1, vegetable: 1, soup: 0 }],
    [2, { main: 1, vegetable: 1, soup: 1 }],
    [3, { main: 2, vegetable: 1, soup: 1 }],
    [4, { main: 2, vegetable: 1, soup: 1 }],
    [5, { main: 2, vegetable: 2, soup: 1 }],
    [6, { main: 2, vegetable: 2, soup: 1 }],
    [7, { main: 3, vegetable: 2, soup: 1 }],
    [8, { main: 3, vegetable: 2, soup: 1 }],
  ])('maps %i people to the approved combination', (servings, expected) => {
    expect(getHouseholdMenuTarget(servings)).toEqual(expected);
  });
});

describe('household combination generation', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('fills the target roles for %i people', (servings) => {
    const result = buildHouseholdCombination({ dishes, servings });

    expect(result.complete).toBe(true);
    expect(roleCounts(result.combinedIds)).toEqual(result.target);
    expect(new Set(result.combinedIds).size).toBe(result.combinedIds.length);
  });

  it('excludes every newly suggested dish that conflicts with the current dietary rules', () => {
    const avoid = new Set(['pork', 'egg', 'spicy', 'pepper']);
    const result = buildHouseholdCombination({ dishes, servings: 8, avoid });

    expect(result.additions.every((id) =>
      !dishMap.get(id).avoid.some((tag) => avoid.has(tag)))).toBe(true);
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual({ main: 0, vegetable: 0, soup: 1 });
  });

  it('only fills missing roles without deleting, replacing, or reordering existing choices', () => {
    const selectedIds = ['garlic-broccoli', 'cola-wings'];
    const result = buildHouseholdCombination({ dishes, servings: 4, selectedIds });

    expect(result.selectedIds).toEqual(selectedIds);
    expect(result.combinedIds.slice(0, selectedIds.length)).toEqual(selectedIds);
    expect(result.additions).toHaveLength(2);
    expect(roleCounts(result.combinedIds)).toEqual({ main: 2, vegetable: 1, soup: 1 });
  });

  it('keeps an existing dietary conflict but never adds another conflicting dish', () => {
    const selectedIds = ['tomato-egg'];
    const result = buildHouseholdCombination({
      dishes,
      servings: 2,
      selectedIds,
      avoid: ['egg'],
    });

    expect(result.combinedIds[0]).toBe('tomato-egg');
    expect(result.additions.every((id) => !dishMap.get(id).avoid.includes('egg'))).toBe(true);
  });

  it('uses the variant to offer another valid combination', () => {
    const first = buildHouseholdCombination({ dishes, servings: 4, variant: 0 });
    const second = buildHouseholdCombination({ dishes, servings: 4, variant: 1 });

    expect(second.complete).toBe(true);
    expect(second.combinedIds).not.toEqual(first.combinedIds);
    expect(roleCounts(second.combinedIds)).toEqual(second.target);
  });

  it('avoids repeating primary ingredient families when the menu has alternatives', () => {
    for (let variant = 0; variant < 5; variant += 1) {
      const result = buildHouseholdCombination({ dishes, servings: 8, variant });
      const families = result.combinedIds.flatMap((id) =>
        getCombinationIngredientFamilies(dishMap.get(id)));

      expect(new Set(families).size).toBe(families.length);
    }
  });

  it('returns the closest valid combination and reports missing roles when candidates run out', () => {
    const limited = dishes.filter((dish) => ['garlic-broccoli', 'cola-wings'].includes(dish.id));
    const result = buildHouseholdCombination({ dishes: limited, servings: 4 });

    expect(result.complete).toBe(false);
    expect(result.combinedIds).toEqual(['cola-wings', 'garlic-broccoli']);
    expect(result.missing).toEqual({ main: 1, vegetable: 0, soup: 1 });
  });
});
