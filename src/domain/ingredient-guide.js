const ROLE_NAMES = ['core', 'auxiliary', 'optional'];

function normalizeTerm(value) {
  return typeof value === 'string'
    ? value.normalize('NFKC').trim().toLocaleLowerCase('zh-CN')
    : '';
}

function assert(condition, message) {
  if (!condition) throw new Error(`食材指南不正确：${message}`);
}

export function createIngredientLookup(guide) {
  const lookup = new Map();
  for (const ingredient of guide.ingredients) {
    for (const term of [ingredient.key, ingredient.name, ...ingredient.aliases]) {
      lookup.set(normalizeTerm(term), ingredient.key);
    }
  }
  return lookup;
}

export function resolveIngredientKey(guide, value) {
  return createIngredientLookup(guide).get(normalizeTerm(value)) || null;
}

export function getIngredientGuideEntry(guide, key) {
  return guide.ingredients.find((ingredient) => ingredient.key === key) || null;
}

export function getDishIngredientRole(guide, dishId, key) {
  const roles = guide.dishIngredientRoles[dishId];
  if (!roles) return null;
  return ROLE_NAMES.find((role) => roles[role].includes(key)) || null;
}

export function validateIngredientGuide(guide, dishes) {
  assert(guide?.schemaVersion === 1, '缺少受支持的版本');
  assert(Array.isArray(guide.ingredients) && guide.ingredients.length > 0, '食材列表为空');
  assert(guide.dishIngredientRoles && typeof guide.dishIngredientRoles === 'object', '缺少逐菜角色');

  const entriesByKey = new Map();
  const terms = new Map();
  for (const entry of guide.ingredients) {
    assert(/^[a-z]+(?:-[a-z]+)*$/.test(entry?.key || ''), '食材 key 格式无效');
    assert(!entriesByKey.has(entry.key), `食材 key 重复：${entry.key}`);
    assert(typeof entry.name === 'string' && entry.name.trim(), `标准名称为空：${entry.key}`);
    assert(Array.isArray(entry.aliases), `别名格式无效：${entry.key}`);
    assert(typeof entry.pantryStaple === 'boolean', `常备调料标记无效：${entry.key}`);
    assert(['蔬菜', '肉蛋水产', '调味品', '其他'].includes(entry.shoppingCategory), `采购分类无效：${entry.key}`);
    assert(entry.purchaseTip == null || (typeof entry.purchaseTip === 'string' && entry.purchaseTip.length <= 40), `购买提示无效：${entry.key}`);
    entriesByKey.set(entry.key, entry);

    for (const value of [entry.name, ...entry.aliases]) {
      const term = normalizeTerm(value);
      assert(term, `名称或别名为空：${entry.key}`);
      assert(!terms.has(term), `名称或别名重复：${value}`);
      terms.set(term, entry.key);
    }
  }

  const dishIds = new Set(dishes.map((dish) => dish.id));
  const roleDishIds = Object.keys(guide.dishIngredientRoles);
  assert(roleDishIds.length === dishIds.size && roleDishIds.every((id) => dishIds.has(id)), '逐菜角色与运行菜谱不一致');

  const usedKeys = new Set();
  for (const dish of dishes) {
    const roles = guide.dishIngredientRoles[dish.id];
    assert(roles && ROLE_NAMES.every((role) => Array.isArray(roles[role])), `角色格式无效：${dish.id}`);
    const assigned = ROLE_NAMES.flatMap((role) => roles[role]);
    const dishKeys = dish.ingredients.map((ingredient) => ingredient.key);
    assert(new Set(assigned).size === assigned.length, `同一道菜重复分配角色：${dish.id}`);
    assert(assigned.length === dishKeys.length && assigned.every((key) => dishKeys.includes(key)), `角色没有覆盖全部食材：${dish.id}`);

    for (const ingredient of dish.ingredients) {
      usedKeys.add(ingredient.key);
      const entry = entriesByKey.get(ingredient.key);
      assert(entry, `菜谱使用了未知食材：${ingredient.key}`);
      assert([entry.name, ...entry.aliases].includes(ingredient.name), `名称未纳入标准或别名：${dish.id}/${ingredient.name}`);
      assert(entry.shoppingCategory === ingredient.shoppingCategory, `采购分类不一致：${dish.id}/${ingredient.key}`);
      const role = getDishIngredientRole(guide, dish.id, ingredient.key);
      assert(role, `缺少食材角色：${dish.id}/${ingredient.key}`);
      assert((role === 'optional') === Boolean(ingredient.optional), `可选状态与角色不一致：${dish.id}/${ingredient.key}`);
    }
  }

  assert(entriesByKey.size === usedKeys.size && [...entriesByKey.keys()].every((key) => usedKeys.has(key)), '指南包含未使用的食材');
  return true;
}

export { ROLE_NAMES };
