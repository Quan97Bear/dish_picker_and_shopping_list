import { describe, expect, it } from 'vitest';
import { getBasketMarkup, getDishCardMarkup, getDishPreviewDetails, resolveCandidateView, resolveSortMode, sortDishes, updateMenuCounts } from '../src/features/picker/picker.js';

describe('candidate display preference', () => {
  it('defaults to compact cards on narrow screens', () => {
    expect(resolveCandidateView(null, false)).toBe('compact');
  });

  it('defaults to large cards on wide screens', () => {
    expect(resolveCandidateView(null, true)).toBe('large');
  });

  it('keeps an explicit compact choice on wide screens', () => {
    expect(resolveCandidateView('compact', true)).toBe('compact');
  });

  it('keeps an explicit large choice on narrow screens', () => {
    expect(resolveCandidateView('large', false)).toBe('large');
  });

  it('ignores invalid stored values', () => {
    expect(resolveCandidateView('unknown', false)).toBe('compact');
    expect(resolveCandidateView('unknown', true)).toBe('large');
  });
});

describe('candidate sorting', () => {
  const dishes = [
    { id: 'soup-b', name: '汤乙', pinyinKey: 'tang-yi', category: 'soup', durationMinutes: 10, homestyleRank: 4 },
    { id: 'meat-a', name: '肉甲', pinyinKey: 'rou-jia', category: 'meat', durationMinutes: 20, homestyleRank: 2 },
    { id: 'veg-c', name: '菜丙', pinyinKey: 'cai-bing', category: 'vegetable', durationMinutes: 20, homestyleRank: 3 },
    { id: 'mixed-a', name: '混合甲', pinyinKey: 'hunhe-jia', category: 'mixed', durationMinutes: 30, homestyleRank: 1 },
  ];
  const ids = (mode, history) => sortDishes(dishes, mode, history).map((dish) => dish.id);

  it('falls back to recommended for missing or invalid preferences', () => {
    expect(resolveSortMode(null)).toBe('recommended');
    expect(resolveSortMode('unknown')).toBe('recommended');
    expect(ids('unknown')).toEqual(['mixed-a','meat-a','veg-c','soup-b']);
  });

  it('uses the curated recommendation rank', () => {
    expect(ids('recommended')).toEqual(['mixed-a','meat-a','veg-c','soup-b']);
  });

  it('puts frequent local picks first and keeps recommendation ties', () => {
    expect(ids('frequent',{ 'soup-b': 4, 'veg-c': 2, 'meat-a': 2 }))
      .toEqual(['soup-b','meat-a','veg-c','mixed-a']);
  });

  it('sorts fastest first and keeps recommendation ties', () => {
    expect(ids('fastest')).toEqual(['soup-b','meat-a','veg-c','mixed-a']);
  });

  it('groups categories in the approved order', () => {
    expect(ids('category')).toEqual(['veg-c','meat-a','mixed-a','soup-b']);
  });

  it('sorts names by maintained pinyin keys', () => {
    expect(ids('name')).toEqual(['veg-c','mixed-a','meat-a','soup-b']);
  });

  it('does not mutate input or react to selected state', () => {
    const before = dishes.map((dish) => dish.id);
    const selectedCopy = dishes.map((dish) => ({ ...dish, selected: true }));
    expect(sortDishes(selectedCopy,'recommended').map((dish) => dish.id)).toEqual(['mixed-a','meat-a','veg-c','soup-b']);
    expect(dishes.map((dish) => dish.id)).toEqual(before);
  });
});

describe('picker menu counts', () => {
  it('updates both the header and floating menu count', () => {
    const headerCount = { textContent: '0' };
    const floatingCount = { textContent: '0' };
    const headerMenu = { setAttribute: (name, value) => { headerMenu[name] = value; } };
    const basketButton = { setAttribute: (name, value) => { basketButton[name] = value; } };
    const root = {
      querySelectorAll(selector) {
        expect(selector).toBe('.header-menu b, .bottom-bar b');
        return [headerCount, floatingCount];
      },
      querySelector(selector) {
        return selector === '.header-menu' ? headerMenu : basketButton;
      }
    };

    updateMenuCounts(root, 3);

    expect(headerCount.textContent).toBe('3');
    expect(floatingCount.textContent).toBe('3');
    expect(headerMenu['aria-label']).toContain('已选 3 道菜');
    expect(basketButton['aria-label']).toBe('查看菜单，已选 3 道菜');
  });

  it.each([0,1,9,10,12])('renders %i as one integrated basket badge', (count) => {
    const markup = getBasketMarkup(count);

    expect(markup).toContain('class="basket-icon"');
    expect(markup).toContain(`class="basket-count" aria-hidden="true">${count}</b>`);
    expect(markup).toContain(`aria-label="查看菜单，已选 ${count} 道菜"`);
    expect(markup).not.toContain('今晚想吃');
    expect(markup).not.toContain('查看菜单</');
  });
});

describe('compact candidate card content', () => {
  const dish = {
    id: 'garlic-broccoli',
    name: '蒜蓉西兰花',
    category: 'vegetable',
    categoryName: '素菜',
    durationMinutes: 18
  };

  it('keeps the emoji, dish name, category, duration, and add action', () => {
    const markup = getDishCardMarkup(dish);

    expect(markup).toContain('🥬');
    expect(markup).toContain('蒜蓉西兰花');
    expect(markup).toContain('素菜');
    expect(markup).toContain('18 分钟');
    expect(markup).toContain('18分钟');
    expect(markup).toContain('加入菜单');
  });

  it('gives the add action a dish-specific accessible name', () => {
    const markup = getDishCardMarkup(dish);

    expect(markup).toContain('aria-label="加入菜单：蒜蓉西兰花"');
    expect(markup).toContain('aria-pressed="false"');
  });

  it('renders selected state without losing the dish details', () => {
    const markup = getDishCardMarkup(dish, true);

    expect(markup).toContain('aria-label="已加入：蒜蓉西兰花"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('>✓</span>');
    expect(markup).toContain('18 分钟');
  });

  it.each([
    ['vegetable', '🥬'],
    ['meat', '🥩'],
    ['mixed', '🍲'],
    ['stew', '🥘'],
    ['soup', '🥣']
  ])('uses the expected %s category emoji', (category, emoji) => {
    expect(getDishCardMarkup({ ...dish, category })).toContain(emoji);
  });

  it('uses a shorter mixed-category label only for compact cards', () => {
    const markup = getDishCardMarkup({ ...dish, category: 'mixed', categoryName: '混合菜' });

    expect(markup).toContain('dish-category-full">混合菜');
    expect(markup).toContain('dish-category-compact">混合');
  });
});

describe('dish preview details', () => {
  const dish = {
    tags: ['家常', '清爽', '快手'],
    avoid: [],
    ingredients: [
      { name: '西兰花', optional: false, shoppingCategory: '蔬菜' },
      { name: '蒜', optional: false, shoppingCategory: '蔬菜' },
      { name: '盐', optional: false, shoppingCategory: '调味品' },
      { name: '白糖', optional: true, shoppingCategory: '调味品' }
    ]
  };

  it('keeps only distinct non-optional main ingredients', () => {
    const details = getDishPreviewDetails({
      ...dish,
      ingredients: [
        ...dish.ingredients,
        { name: '蒜', optional: false, shoppingCategory: '蔬菜' },
        { name: '西红柿', optional: false, shoppingCategory: '蔬菜' },
        { name: '鸡蛋', optional: false, shoppingCategory: '肉蛋水产' },
        { name: '小葱', optional: false, shoppingCategory: '蔬菜' }
      ]
    });

    expect(details.ingredients).toEqual(['西兰花', '蒜', '西红柿', '鸡蛋']);
  });

  it('uses reviewed tags for taste without preparation labels', () => {
    expect(getDishPreviewDetails(dish).taste).toEqual(['清爽']);
    expect(getDishPreviewDetails({ ...dish, tags: ['家常', '快手'] }).taste).toEqual(['家常']);
  });

  it('reports only the supported spicy distinction', () => {
    expect(getDishPreviewDetails(dish).spiciness).toBe('不辣');
    expect(getDishPreviewDetails({ ...dish, avoid: ['spicy'] }).spiciness).toBe('有辣味');
  });

  it('falls back to required ingredients when all are condiments', () => {
    expect(getDishPreviewDetails({
      ...dish,
      ingredients: [{ name: '盐', optional: false, shoppingCategory: '调味品' }]
    }).ingredients).toEqual(['盐']);
  });
});
