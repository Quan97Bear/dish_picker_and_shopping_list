import { validateIngredientGuide } from '../domain/ingredient-guide.js';

const dataUrl = (name) => new URL(`../../data/${name}`, import.meta.url);

export async function loadAppData() {
  const [indexResponse, dishesResponse, aliasesResponse, ingredientGuideResponse] = await Promise.all([
    fetch(dataUrl('dish-index.json')),
    fetch(dataUrl('dishes.json')),
    fetch(dataUrl('aliases.json')),
    fetch(dataUrl('ingredient-guide.json'))
  ]);
  if (!indexResponse.ok || !dishesResponse.ok || !aliasesResponse.ok || !ingredientGuideResponse.ok) {
    throw new Error('菜谱数据加载失败');
  }
  const [index, full, aliases, ingredientGuide] = await Promise.all([
    indexResponse.json(), dishesResponse.json(), aliasesResponse.json(), ingredientGuideResponse.json()
  ]);
  validateRuntimeData(index, full);
  validateIngredientGuide(ingredientGuide, full.dishes);
  return { index, dishes: full.dishes, aliases, ingredientGuide };
}

export function validateRuntimeData(index, full) {
  if (!Array.isArray(index) || !Array.isArray(full?.dishes)) throw new Error('菜谱格式不正确');
  if (index.length !== 40 || full.dishes.length !== 40) throw new Error('当前菜单必须恰好包含 40 道菜');
  const ids = new Set(full.dishes.map((dish) => dish.id));
  const indexIds = new Set(index.map((dish) => dish.id));
  if (ids.size !== 40 || indexIds.size !== 40 || index.some((dish) => !ids.has(dish.id))) throw new Error('菜谱索引与详情不一致');
}
