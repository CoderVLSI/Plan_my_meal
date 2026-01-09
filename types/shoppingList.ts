export type QuickCommercePlatform = 'zepto' | 'blinkit' | 'instamart' | 'generic';

export interface ShoppingList {
  id: string;
  ingredientListId: string;
  platform: QuickCommercePlatform;
  items: ShoppingListItem[];
  formattedText: string;
  generatedAt: string;
}

export interface ShoppingListItem {
  ingredientId: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
}
