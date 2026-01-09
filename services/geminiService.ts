import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { WeeklyPlan } from '@/types/meal';
import { Ingredient } from '@/types/ingredient';

const API_KEY = Constants.expoConfig?.extra?.geminiApiKey as string | undefined
  || process.env.EXPO_PUBLIC_GEMINI_API_KEY
  || '';

if (!API_KEY) {
  console.warn('Gemini API key not found. Set EXPO_PUBLIC_GEMINI_API_KEY in .env file.');
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!API_KEY) {
      throw new Error('Gemini API key is required. Set EXPO_PUBLIC_GEMINI_API_KEY environment variable.');
    }
    this.genAI = new GoogleGenerativeAI(API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async generateIngredients(mealPlan: WeeklyPlan): Promise<Ingredient[]> {
    const prompt = this.buildPrompt(mealPlan);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return this.parseResponse(response.text());
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate ingredients. Please check your API key and try again.');
    }
  }

  async generateRecipe(mealName: string): Promise<string> {
    const prompt = `Provide a step-by-step recipe for "${mealName}". Include ingredients, cooking time, and detailed instructions in a clear format.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate recipe. Please try again.');
    }
  }

  private buildPrompt(mealPlan: WeeklyPlan): string {
    let prompt = `Generate a complete shopping list for the following weekly meal plan.
For each meal, list all ingredients with quantities. Categorize ingredients by type (vegetables, fruits, dairy, meat, seafood, grains, spices, oils, condiments, bakery, frozen, beverages, snacks, other).

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "ingredients": [
    {"name": "ingredient name", "quantity": "amount", "unit": "unit (kg, g, pcs, L, ml, etc)", "category": "category"}
  ]
}

Meal Plan:
`;

    mealPlan.days.forEach((day) => {
      prompt += `\n${day.day} (${day.date}):\n`;
      Object.values(day.meals).forEach((meal) => {
        if (meal) {
          prompt += `- ${meal.type}: ${meal.name} (${meal.servings} servings)\n`;
        }
      });
    });

    return prompt;
  }

  private parseResponse(text: string): Ingredient[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.ingredients || !Array.isArray(parsed.ingredients)) {
        throw new Error('Invalid response format');
      }

      return parsed.ingredients.map((ing: any, index: number) => ({
        id: `ing-${Date.now()}-${index}`,
        name: ing.name || 'Unknown',
        quantity: ing.quantity || '1',
        unit: ing.unit || 'pcs',
        category: ing.category || 'other',
        checked: false,
      }));
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      console.error('Response text:', text);
      return [];
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
