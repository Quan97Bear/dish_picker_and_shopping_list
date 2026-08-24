import { normalizeIngredientTerm } from './ingredient-guide.js';

function recommendedOrder(left, right) {
  return (left.homestyleRank ?? Number.MAX_SAFE_INTEGER)
    - (right.homestyleRank ?? Number.MAX_SAFE_INTEGER)
    || left.id.localeCompare(right.id, 'en');
}

function getCoreKeys(guide, dishId) {
  return guide.dishIngredientRoles[dishId]?.core || [];
}

function coreUsage(guide, dishes) {
  const counts = new Map();
  for (const dish of dishes) {
    for (const key of getCoreKeys(guide, dish.id)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

export function getCommonPantryIngredients(guide, dishes, limit = 12) {
  const usage = coreUsage(guide, dishes);
  return guide.ingredients
    .filter((ingredient) => usage.has(ingredient.key) && !ingredient.pantryStaple)
    .sort((left, right) => (usage.get(right.key) - usage.get(left.key))
      || left.name.localeCompare(right.name, 'zh-CN'))
    .slice(0, limit);
}

export function searchPantryIngredients(guide, dishes, query, limit = 12) {
  const normalizedQuery = normalizeIngredientTerm(query);
  if (!normalizedQuery) return getCommonPantryIngredients(guide, dishes, limit);
  const usage = coreUsage(guide, dishes);
  return guide.ingredients
    .filter((ingredient) => usage.has(ingredient.key) && !ingredient.pantryStaple)
    .map((ingredient) => {
      const terms = [ingredient.name, ...ingredient.aliases].map(normalizeIngredientTerm);
      const exact = terms.includes(normalizedQuery);
      const matches = exact || terms.some((term) => term.includes(normalizedQuery));
      return { ingredient, exact, matches, uses: usage.get(ingredient.key) };
    })
    .filter((item) => item.matches)
    .sort((left, right) => Number(right.exact) - Number(left.exact)
      || right.uses - left.uses
      || left.ingredient.name.localeCompare(right.ingredient.name, 'zh-CN'))
    .slice(0, limit)
    .map((item) => item.ingredient);
}

export function matchDishesByPantry({ dishes, guide, selectedKeys = [], avoid = [] }) {
  const knownKeys = new Set(guide.ingredients.map((ingredient) => ingredient.key));
  const available = new Set([...selectedKeys].filter((key) => knownKeys.has(key)));
  const avoided = avoid instanceof Set ? avoid : new Set(avoid);
  const matched = dishes
    .filter((dish) => !(dish.avoid || []).some((tag) => avoided.has(tag)))
    .map((dish) => {
      const coreKeys = getCoreKeys(guide, dish.id)
        .filter((key) => !guide.ingredients.find((ingredient) => ingredient.key === key)?.pantryStaple);
      const missingKeys = coreKeys.filter((key) => !available.has(key));
      return { dish, missingKeys };
    })
    .filter((item) => item.missingKeys.length <= 2)
    .sort((left, right) => left.missingKeys.length - right.missingKeys.length
      || recommendedOrder(left.dish, right.dish));

  return {
    ready: matched.filter((item) => item.missingKeys.length === 0),
    missingOne: matched.filter((item) => item.missingKeys.length === 1),
    missingTwo: matched.filter((item) => item.missingKeys.length === 2),
  };
}
