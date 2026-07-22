const CATEGORY_ORDER = ['蔬菜', '肉蛋水产', '调味品', '其他'];

function scaledAmount(ingredient, factor) {
  if (ingredient.amount == null || ingredient.unit === '适量') return null;
  const value = ingredient.amount * factor;
  if (ingredient.rounding === 'ceil' || ingredient.rounding === 'whole') return Math.ceil(value);
  return Math.round(value * 100) / 100;
}

export function buildShoppingList(dishes, servings) {
  const groups = new Map();
  for (const dish of dishes) {
    const factor = servings / dish.servings;
    for (const ingredient of dish.ingredients.filter((item) => item.kind !== 'tool')) {
      const groupKey = `${ingredient.key}|${ingredient.unit}|${Boolean(ingredient.optional)}`;
      const amount = scaledAmount(ingredient, factor);
      const current = groups.get(groupKey);
      if (current && amount != null && current.amount != null) current.amount += amount;
      else if (!current) groups.set(groupKey, { ...ingredient, amount, dishes: [dish.name] });
      if (current && !current.dishes.includes(dish.name)) current.dishes.push(dish.name);
    }
  }
  return [...groups.values()]
    .map((item) => ({ ...item, amount: item.amount == null ? null : Math.round(item.amount * 100) / 100 }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.shoppingCategory) - CATEGORY_ORDER.indexOf(b.shoppingCategory) || a.name.localeCompare(b.name, 'zh-CN'));
}

export function shoppingListText(items) {
  const lines = ['今晚的采购清单'];
  for (const category of CATEGORY_ORDER) {
    const group = items.filter((item) => item.shoppingCategory === category);
    if (!group.length) continue;
    lines.push(`\n${category}`);
    for (const item of group) lines.push(`☐ ${item.name} ${item.amount ?? ''}${item.unit === '适量' ? '适量' : item.unit}${item.optional ? '（可选）' : ''}`.trim());
  }
  return lines.join('\n');
}

export { CATEGORY_ORDER };
