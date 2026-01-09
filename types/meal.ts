export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Meal {
  id: string;
  name: string;
  type: MealType;
  dayOfWeek: DayOfWeek;
  date: string;
  servings: number;
  recipe?: string;
}

export interface DayPlan {
  day: DayOfWeek;
  date: string;
  meals: {
    breakfast?: Meal;
    lunch?: Meal;
    dinner?: Meal;
    snacks?: Meal;
  };
}

export interface WeeklyPlan {
  id: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
}
