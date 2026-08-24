import { MAX_DISHES } from './menu-state.js';

const MENU_TARGETS = [
  { maxServings: 1, main: 1, vegetable: 1, soup: 0 },
  { maxServings: 2, main: 1, vegetable: 1, soup: 1 },
  { maxServings: 4, main: 2, vegetable: 1, soup: 1 },
  { maxServings: 6, main: 2, vegetable: 2, soup: 1 },
  { maxServings: 8, main: 3, vegetable: 2, soup: 1 },
];

const ROLE_ORDER = ['main', 'vegetable', 'soup'];
// Choose the constrained soup slot before vegetables so the wider vegetable
// pool can avoid whichever protein or egg family the soup uses.
const SELECTION_ORDER = ['main', 'soup', 'vegetable'];
const GENERIC_TASTE_TAGS = new Set(['家常', '快手', '耐心制作', '荤素搭配', '汤羹']);
const INGREDIENT_FAMILIES = new Map([
  ['ground-pork', 'pork'],
  ['pork-belly', 'pork'],
  ['pork-brisket', 'pork'],
  ['pork-ribs', 'pork'],
  ['pork-tenderloin', 'pork'],
  ['chicken-breast', 'chicken'],
  ['chicken-thigh', 'chicken'],
  ['chicken-wing', 'chicken'],
  ['century-egg', 'egg'],
]);

function clampServings(servings) {
  const parsed = Number.parseInt(servings, 10);
  return Number.isFinite(parsed) ? Math.min(8, Math.max(1, parsed)) : 2;
}

export function getHouseholdMenuTarget(servings) {
  const resolvedServings = clampServings(servings);
  const target = MENU_TARGETS.find((item) => resolvedServings <= item.maxServings);
  return { main: target.main, vegetable: target.vegetable, soup: target.soup };
}

export function getCombinationRole(dish) {
  if (dish?.category === 'vegetable') return 'vegetable';
  if (dish?.category === 'soup') return 'soup';
  return ['meat', 'mixed', 'stew'].includes(dish?.category) ? 'main' : null;
}

function ingredientFamily(key) {
  return INGREDIENT_FAMILIES.get(key) || key;
}

export function getCombinationIngredientFamilies(dish) {
  return (dish?.ingredients || [])
    .filter((ingredient) => !ingredient.optional && ingredient.shoppingCategory !== '调味品')
    .map((ingredient) => ingredientFamily(ingredient.key))
    .filter((key, index, keys) => key && keys.indexOf(key) === index)
    .slice(0, 2);
}

function getTasteKeys(dish) {
  const keys = (dish?.tags || []).filter((tag) => !GENERIC_TASTE_TAGS.has(tag));
  if (dish?.avoid?.includes('spicy')) keys.push('有辣味');
  return [...new Set(keys)];
}

function rotate(items, offset) {
  if (!items.length) return [];
  const start = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function recommendedOrder(left, right) {
  return (left.homestyleRank ?? Number.MAX_SAFE_INTEGER)
    - (right.homestyleRank ?? Number.MAX_SAFE_INTEGER)
    || (left.id || '').localeCompare(right.id || '', 'en');
}

function countOverlap(values, usedValues) {
  return values.reduce((count, value) => count + (usedValues.has(value) ? 1 : 0), 0);
}

function chooseCandidate(candidates, chosenDishes, variant, slotIndex) {
  const usedIngredients = new Set(chosenDishes.flatMap(getCombinationIngredientFamilies));
  const usedTastes = new Set(chosenDishes.flatMap(getTasteKeys));
  const usedCategories = new Set(chosenDishes.map((dish) => dish.category));
  const rotated = rotate(candidates, variant + slotIndex);

  return rotated
    .map((dish, index) => ({
      dish,
      score:
        countOverlap(getCombinationIngredientFamilies(dish), usedIngredients) * 1000
        + countOverlap(getTasteKeys(dish), usedTastes) * 100
        + (usedCategories.has(dish.category) ? 10 : 0)
        + index,
    }))
    .sort((left, right) => left.score - right.score)[0]?.dish;
}

export function buildHouseholdCombination({
  dishes,
  servings = 2,
  avoid = [],
  selectedIds = [],
  variant = 0,
} = {}) {
  const sourceDishes = Array.isArray(dishes) ? dishes : [];
  const target = getHouseholdMenuTarget(servings);
  const selected = [...new Set(Array.isArray(selectedIds) ? selectedIds : [])].slice(0, MAX_DISHES);
  const dishMap = new Map(sourceDishes.map((dish) => [dish.id, dish]));
  const selectedDishes = selected.map((id) => dishMap.get(id)).filter(Boolean);
  const counts = { main: 0, vegetable: 0, soup: 0 };
  for (const dish of selectedDishes) {
    const role = getCombinationRole(dish);
    if (role) counts[role] += 1;
  }

  const avoided = avoid instanceof Set ? avoid : new Set(Array.isArray(avoid) ? avoid : []);
  const selectedSet = new Set(selected);
  const eligible = sourceDishes
    .filter((dish) => dish?.id && !selectedSet.has(dish.id))
    .filter((dish) => dish.enabled !== false && dish.excludedFromApp !== true)
    .filter((dish) => !(dish.avoid || []).some((tag) => avoided.has(tag)))
    .sort(recommendedOrder);
  const additions = [];
  const chosenDishes = [...selectedDishes];

  let slotIndex = 0;
  for (const role of SELECTION_ORDER) {
    const needed = Math.max(0, target[role] - counts[role]);
    for (let count = 0; count < needed && selected.length + additions.length < MAX_DISHES; count += 1) {
      const candidates = eligible.filter((dish) =>
        getCombinationRole(dish) === role
        && !additions.includes(dish.id));
      const chosen = chooseCandidate(candidates, chosenDishes, variant, slotIndex);
      slotIndex += 1;
      if (!chosen) break;
      additions.push(chosen.id);
      chosenDishes.push(chosen);
      counts[role] += 1;
    }
  }

  const missing = Object.fromEntries(ROLE_ORDER.map((role) => [
    role,
    Math.max(0, target[role] - counts[role]),
  ]));

  const orderedAdditions = ROLE_ORDER.flatMap((role) => additions.filter((id) =>
    getCombinationRole(dishMap.get(id)) === role));

  return {
    selectedIds: selected,
    additions: orderedAdditions,
    combinedIds: [...selected, ...orderedAdditions],
    target,
    missing,
    complete: ROLE_ORDER.every((role) => missing[role] === 0),
  };
}
