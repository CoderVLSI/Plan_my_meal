import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeeklyPlan } from '@/types/meal';
import { Ingredient, IngredientList } from '@/types/ingredient';
import { ShoppingList } from '@/types/shoppingList';

const KEYS = {
  CURRENT_PLAN: '@plan_my_meal:current_plan',
  INGREDIENT_LIST: (id: string) => `@plan_my_meal:ingredients:${id}`,
  SHOPPING_LIST: (id: string) => `@plan_my_meal:shopping:${id}`,
  ALL_PLANS: '@plan_my_meal:all_plans',
};

export const storageService = {
  // Meal Plan Operations
  async saveMealPlan(plan: WeeklyPlan): Promise<void> {
    await AsyncStorage.setItem(KEYS.CURRENT_PLAN, JSON.stringify(plan));

    const allPlans = await this.getAllPlans();
    const updated = allPlans.filter((p) => p.id !== plan.id);
    updated.push(plan);
    await AsyncStorage.setItem(KEYS.ALL_PLANS, JSON.stringify(updated));
  },

  async getCurrentMealPlan(): Promise<WeeklyPlan | null> {
    const data = await AsyncStorage.getItem(KEYS.CURRENT_PLAN);
    return data ? JSON.parse(data) : null;
  },

  async getAllPlans(): Promise<WeeklyPlan[]> {
    const data = await AsyncStorage.getItem(KEYS.ALL_PLANS);
    return data ? JSON.parse(data) : [];
  },

  // Ingredient List Operations
  async saveIngredientList(list: IngredientList): Promise<void> {
    await AsyncStorage.setItem(KEYS.INGREDIENT_LIST(list.mealPlanId), JSON.stringify(list));
  },

  async getIngredientList(mealPlanId: string): Promise<IngredientList | null> {
    const data = await AsyncStorage.getItem(KEYS.INGREDIENT_LIST(mealPlanId));
    return data ? JSON.parse(data) : null;
  },

  async updateIngredientList(mealPlanId: string, ingredients: Ingredient[]): Promise<void> {
    const existing = await this.getIngredientList(mealPlanId);
    if (existing) {
      const updated = { ...existing, ingredients };
      await this.saveIngredientList(updated);
    }
  },

  // Shopping List Operations
  async saveShoppingList(list: ShoppingList): Promise<void> {
    await AsyncStorage.setItem(KEYS.SHOPPING_LIST(list.ingredientListId), JSON.stringify(list));
  },

  async getShoppingList(ingredientListId: string): Promise<ShoppingList | null> {
    const data = await AsyncStorage.getItem(KEYS.SHOPPING_LIST(ingredientListId));
    return data ? JSON.parse(data) : null;
  },

  // Clear All Data
  async clearAll(): Promise<void> {
    await AsyncStorage.clear();
  },

  async clearAllData(): Promise<void> {
    await AsyncStorage.clear();
  },
};
