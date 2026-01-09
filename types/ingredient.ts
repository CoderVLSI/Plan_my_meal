export type IngredientCategory =
  | 'vegetables'
  | 'fruits'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'grains'
  | 'spices'
  | 'oils'
  | 'condiments'
  | 'bakery'
  | 'frozen'
  | 'beverages'
  | 'snacks'
  | 'other';

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: IngredientCategory;
  checked: boolean;
}

export interface IngredientList {
  id: string;
  mealPlanId: string;
  ingredients: Ingredient[];
  generatedAt: string;
}
