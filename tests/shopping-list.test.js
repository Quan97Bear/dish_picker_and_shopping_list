import { describe, expect, it } from 'vitest';
import { buildShoppingList, shoppingListText } from '../src/domain/shopping-list.js';
const dish = (ingredients, name='测试菜') => ({ name, servings: 2, ingredients });
const ingredient = (overrides={}) => ({ key:'egg',name:'鸡蛋',amount:2,unit:'枚',shoppingCategory:'肉蛋水产',optional:false,rounding:'ceil',...overrides });
describe('shopping list', () => {
  it('scales and merges matching ingredients', () => expect(buildShoppingList([dish([ingredient()]),dish([ingredient({amount:1})])],4)[0].amount).toBe(6));
  it('does not merge different units', () => expect(buildShoppingList([dish([ingredient()]),dish([ingredient({unit:'克'})])],2)).toHaveLength(2));
  it('keeps optional items separate', () => expect(buildShoppingList([dish([ingredient()]),dish([ingredient({optional:true})])],2)).toHaveLength(2));
  it('deduplicates unknown amounts without summing', () => expect(buildShoppingList([dish([ingredient({amount:null,unit:'适量'})]),dish([ingredient({amount:null,unit:'适量'})])],2)[0].amount).toBeNull());
  it('rounds discrete ingredients up', () => expect(buildShoppingList([dish([ingredient({amount:1})])],3)[0].amount).toBe(2));
  it('keeps every source dish name on merged ingredients', () => expect(buildShoppingList([dish([ingredient()],'番茄炒蛋'),dish([ingredient({amount:1})],'紫菜蛋花汤')],2)[0].dishes).toEqual(['番茄炒蛋','紫菜蛋花汤']));

  it('does not put kitchen tools into the shopping list', () => {
    const items = buildShoppingList([dish([
      ingredient(),
      ingredient({ key: 'wok', name: '炒锅', kind: 'tool', amount: 1, unit: '个' })
    ])], 2);
    expect(items.map((item) => item.name)).toEqual(['鸡蛋']);
  });

  it('keeps ingredients with the same key separate when optionality differs', () => {
    const items = buildShoppingList([dish([
      ingredient({ optional: false }),
      ingredient({ optional: true })
    ])], 2);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.optional)).toEqual([false, true]);
  });

  it('rounds continuous measurements to two decimal places', () => {
    const items = buildShoppingList([dish([
      ingredient({ key: 'oil', name: '油', amount: 1.235, unit: '毫升', rounding: 'none', shoppingCategory: '调味品' })
    ])], 2);
    expect(items[0].amount).toBe(1.24);
  });

  it('sorts by shopping category and then Chinese ingredient name', () => {
    const items = buildShoppingList([dish([
      ingredient({ key: 'salt', name: '盐', amount: 1, unit: '克', shoppingCategory: '调味品' }),
      ingredient({ key: 'bok-choy', name: '白菜', amount: 1, unit: '棵', shoppingCategory: '蔬菜' }),
      ingredient({ key: 'carrot', name: '胡萝卜', amount: 1, unit: '根', shoppingCategory: '蔬菜' }),
      ingredient({ key: 'pork', name: '猪肉', amount: 100, unit: '克', shoppingCategory: '肉蛋水产' })
    ])], 2);
    expect(items.map((item) => item.name)).toEqual(['白菜', '胡萝卜', '猪肉', '盐']);
  });

  it('does not duplicate a source dish name when an ingredient repeats in one dish', () => {
    const items = buildShoppingList([dish([ingredient(), ingredient({ amount: 1 })], '番茄炒蛋')], 2);
    expect(items[0].dishes).toEqual(['番茄炒蛋']);
  });

  it('formats a copyable list with categories, amounts, and optional labels', () => {
    const text = shoppingListText([
      ingredient({ key: 'bok-choy', name: '白菜', amount: 1, unit: '棵', shoppingCategory: '蔬菜' }),
      ingredient({ key: 'salt', name: '盐', amount: null, unit: '适量', shoppingCategory: '调味品', optional: true })
    ]);
    expect(text).toContain('今晚的采购清单');
    expect(text).toContain('\n蔬菜\n☐ 白菜 1棵');
    expect(text).toContain('\n调味品\n☐ 盐 适量（可选）');
  });

  it('omits empty categories from copied shopping-list text', () => {
    const text = shoppingListText([ingredient()]);
    expect(text).toContain('肉蛋水产');
    expect(text).not.toContain('\n蔬菜');
    expect(text).not.toContain('\n调味品');
    expect(text).not.toContain('\n其他');
  });
});
