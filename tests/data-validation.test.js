import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { validateRuntimeData } from '../src/data.js';
const read = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
describe('menu data', () => {
  const full = read('dishes.json'); const index = read('dish-index.json');
  it('contains exactly 40 unique dishes and 5 soups', () => { expect(full.dishes).toHaveLength(40); expect(new Set(full.dishes.map(d=>d.id)).size).toBe(40); expect(full.dishes.filter(d=>d.category==='soup')).toHaveLength(5); });
  it('contains no eggplant and marks pepper dishes', () => { expect(full.dishes.some(d=>/茄子/.test(JSON.stringify(d)))).toBe(false); expect(full.dishes.some(d=>d.avoid.includes('pepper'))).toBe(true); });
  it('has matching, stable index order', () => { expect(index.map(d=>d.id)).toEqual(full.dishes.map(d=>d.id)); expect(index.every((d,i,a)=>i===0||a[i-1].homestyleScore>=d.homestyleScore)).toBe(true); });
  it('has usable details and source fields', () => expect(full.dishes.every(d=>d.ingredients.length&&d.steps.length&&d.source.project&&d.source.url&&d.source.license)).toBe(true));
  it('rejects duplicate IDs in the runtime index', () => {
    const duplicateIndex = index.map((dish) => ({ ...dish }));
    duplicateIndex[1].id = duplicateIndex[0].id;
    expect(() => validateRuntimeData(duplicateIndex, full)).toThrow('菜谱索引与详情不一致');
  });
});
