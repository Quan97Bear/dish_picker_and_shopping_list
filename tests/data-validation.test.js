import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { validateRuntimeData } from '../src/infrastructure/load-app-data.js';
const read = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
describe('menu data', () => {
  const full = read('dishes.json'); const index = read('dish-index.json');
  it('contains exactly 40 unique dishes and 5 soups', () => { expect(full.dishes).toHaveLength(40); expect(new Set(full.dishes.map(d=>d.id)).size).toBe(40); expect(full.dishes.filter(d=>d.category==='soup')).toHaveLength(5); });
  it('contains no eggplant and marks pepper dishes', () => { expect(full.dishes.some(d=>/茄子/.test(JSON.stringify(d)))).toBe(false); expect(full.dishes.some(d=>d.avoid.includes('pepper'))).toBe(true); });
  it('has matching, stable index order', () => { expect(index.map(d=>d.id)).toEqual(full.dishes.map(d=>d.id)); expect(index.every((d,i,a)=>i===0||a[i-1].homestyleScore>=d.homestyleScore)).toBe(true); });
  it('has a maintained pinyin sort key for every runtime dish', () => {
    expect(index.every((dish) => /^[a-z]+(?:-[a-z]+)*$/.test(dish.pinyinKey))).toBe(true);
    expect(new Set(index.map((dish) => dish.pinyinKey)).size).toBe(index.length);
  });
  it('has usable details and source fields', () => expect(full.dishes.every(d=>d.ingredients.length&&d.steps.length&&d.source.project&&d.source.url&&d.source.license)).toBe(true));
  it('rejects duplicate IDs in the runtime index', () => {
    const duplicateIndex = index.map((dish) => ({ ...dish }));
    duplicateIndex[1].id = duplicateIndex[0].id;
    expect(() => validateRuntimeData(duplicateIndex, full)).toThrow('菜谱索引与详情不一致');
  });

  it('rejects malformed top-level data structures', () => {
    expect(() => validateRuntimeData({}, full)).toThrow('菜谱格式不正确');
    expect(() => validateRuntimeData(index, [])).toThrow('菜谱格式不正确');
    expect(() => validateRuntimeData(index, null)).toThrow('菜谱格式不正确');
  });

  it('rejects menus that do not contain exactly 40 dishes', () => {
    expect(() => validateRuntimeData(index.slice(0, 39), full)).toThrow('当前菜单必须恰好包含 40 道菜');
    expect(() => validateRuntimeData(index, { dishes: full.dishes.slice(0, 39) })).toThrow('当前菜单必须恰好包含 40 道菜');
  });

  it('rejects duplicate IDs in full recipe details', () => {
    const duplicateFull = { dishes: full.dishes.map((dish) => ({ ...dish })) };
    duplicateFull.dishes[1].id = duplicateFull.dishes[0].id;
    expect(() => validateRuntimeData(index, duplicateFull)).toThrow('菜谱索引与详情不一致');
  });

  it('rejects an index ID that has no matching recipe detail', () => {
    const mismatchedIndex = index.map((dish) => ({ ...dish }));
    mismatchedIndex[0].id = 'missing-recipe';
    expect(() => validateRuntimeData(mismatchedIndex, full)).toThrow('菜谱索引与详情不一致');
  });
});
