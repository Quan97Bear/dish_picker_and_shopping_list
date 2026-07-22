import { describe, expect, it } from 'vitest';
import { buildShoppingList } from '../src/shopping-list.js';
const dish = (ingredients) => ({ name: '测试菜', servings: 2, ingredients });
const ingredient = (overrides={}) => ({ key:'egg',name:'鸡蛋',amount:2,unit:'枚',shoppingCategory:'肉蛋水产',optional:false,rounding:'ceil',...overrides });
describe('shopping list', () => {
  it('scales and merges matching ingredients', () => expect(buildShoppingList([dish([ingredient()]),dish([ingredient({amount:1})])],4)[0].amount).toBe(6));
  it('does not merge different units', () => expect(buildShoppingList([dish([ingredient()]),dish([ingredient({unit:'克'})])],2)).toHaveLength(2));
  it('keeps optional items separate', () => expect(buildShoppingList([dish([ingredient()]),dish([ingredient({optional:true})])],2)).toHaveLength(2));
  it('deduplicates unknown amounts without summing', () => expect(buildShoppingList([dish([ingredient({amount:null,unit:'适量'})]),dish([ingredient({amount:null,unit:'适量'})])],2)[0].amount).toBeNull());
  it('rounds discrete ingredients up', () => expect(buildShoppingList([dish([ingredient({amount:1})])],3)[0].amount).toBe(2));
});
