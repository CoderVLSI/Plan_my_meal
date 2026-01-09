import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Ingredient } from '@/types/ingredient';
import { storageService } from '@/services/storageService';
import { geminiService } from '@/services/geminiService';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';

const INGREDIENT_ICONS: Record<string, string> = {
  vegetables: '🥬',
  fruits: '🍎',
  dairy: '🥛',
  meat: '🥩',
  seafood: '🐟',
  grains: '🌾',
  spices: '🧂',
  oils: '🫒',
  condiments: '🥫',
  bakery: '🍞',
  frozen: '❄️',
  beverages: '🥤',
  snacks: '🍿',
  other: '📦',
};

export default function IngredientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);

  useEffect(() => {
    loadIngredients();
    checkHasPlan();
  }, []);

  const checkHasPlan = async () => {
    try {
      const plan = await storageService.getCurrentMealPlan();
      const hasMeals = plan?.days.some((d) => Object.keys(d.meals).length > 0);
      setHasPlan(hasMeals || false);
    } catch (error) {
      console.error('Failed to check plan:', error);
    }
  };

  const loadIngredients = async () => {
    try {
      const plan = await storageService.getCurrentMealPlan();
      if (!plan) return;

      const ingredientList = await storageService.getIngredientList(plan.id);
      if (ingredientList) {
        setIngredients(ingredientList.ingredients);
      }
    } catch (error) {
      console.error('Failed to load ingredients:', error);
    }
  };

  const handleGenerate = async () => {
    try {
      const plan = await storageService.getCurrentMealPlan();
      if (!plan) {
        Alert.alert('Error', 'No meal plan found');
        return;
      }

      setIsGenerating(true);

      // Call Gemini API to generate ingredients
      const newIngredients = await geminiService.generateIngredients(plan);

      if (newIngredients.length === 0) {
        Alert.alert('Error', 'Failed to generate ingredients. Please try again.');
        setIsGenerating(false);
        return;
      }

      // Save to storage
      await storageService.saveIngredientList({
        id: `ing-list-${Date.now()}`,
        mealPlanId: plan.id,
        ingredients: newIngredients,
        generatedAt: new Date().toISOString(),
      });

      setIngredients(newIngredients);
      Alert.alert('Success', `Generated ${newIngredients.length} ingredients!`);
    } catch (error: any) {
      console.error('Failed to generate ingredients:', error);
      Alert.alert('Error', error.message || 'Failed to generate ingredients. Please check your API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleCheck = async (ingredientId: string) => {
    const updated = ingredients.map((ing) =>
      ing.id === ingredientId ? { ...ing, checked: !ing.checked } : ing
    );
    setIngredients(updated);

    // Save to storage
    try {
      const plan = await storageService.getCurrentMealPlan();
      if (plan) {
        await storageService.updateIngredientList(plan.id, updated);
      }
    } catch (error) {
      console.error('Failed to update ingredient:', error);
    }
  };

  const handleCreateShoppingList = () => {
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Please generate ingredients first');
      return;
    }
    router.push('/shopping');
  };

  const groupedIngredients = ingredients.reduce((acc, ing) => {
    if (!acc[ing.category]) {
      acc[ing.category] = [];
    }
    acc[ing.category].push(ing);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  const getCategoryIcon = (category: string): string => {
    return INGREDIENT_ICONS[category] || INGREDIENT_ICONS.other;
  };

  return (
    <View style={styles.container}>
      <Header
        title="Ingredients"
        subtitle={ingredients.length > 0 ? `${ingredients.length} items` : 'Generate your shopping list'}
        onProfilePress={() => router.push('/profile-modal')}
        rightComponent={
          ingredients.length > 0 ? (
            <TouchableOpacity
              onPress={handleCreateShoppingList}
              style={styles.nextButton}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next →</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        {!hasPlan ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={Colors.light.tabIconDefault} />
            <Text style={styles.emptyStateTitle}>No meal plan found</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add some meals to your weekly plan first
            </Text>
          </View>
        ) : ingredients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={64} color={Colors.light.tabIconDefault} />
            <Text style={styles.emptyStateTitle}>No ingredients yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Use AI to generate ingredients from your meal plan
            </Text>
          </View>
        ) : (
          Object.entries(groupedIngredients).map(([category, items]) => (
            <View key={category} className="mb-4">
              <View className="flex-row items-center mb-2">
                <Text className="text-2xl mr-2">{getCategoryIcon(category)}</Text>
                <Text className="text-lg font-bold text-text">{category.toUpperCase()}</Text>
                <Text className="text-text/60 text-sm ml-2">({items.length})</Text>
              </View>
              {items.map((ingredient) => (
                <TouchableOpacity
                  key={ingredient.id}
                  onPress={() => handleToggleCheck(ingredient.id)}
                  className="flex-row items-center p-3 bg-cardBackground rounded-lg mb-2 border border-border"
                  activeOpacity={0.7}
                >
                  <View className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
                    ingredient.checked ? 'bg-primary border-primary' : 'border-text/40'
                  }`}>
                    {ingredient.checked && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base ${ingredient.checked ? 'line-through text-text/40' : 'text-text'}`}>
                      {ingredient.name}
                    </Text>
                    <Text className="text-text/60 text-sm">
                      {ingredient.quantity} {ingredient.unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Generate Button */}
      {hasPlan && ingredients.length === 0 && (
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={isGenerating}
          className="absolute bottom-6 right-4 bg-primary rounded-full p-4 shadow-lg"
          activeOpacity={0.8}
          style={{ marginBottom: insets.bottom + 24 }}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="sparkles" size={28} color="white" />
          )}
        </TouchableOpacity>
      )}

      {/* Regenerate Button */}
      {hasPlan && ingredients.length > 0 && (
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={isGenerating}
          className="absolute bottom-6 right-4 bg-secondary rounded-full p-4 shadow-lg"
          activeOpacity={0.8}
          style={{ marginBottom: insets.bottom + 24 }}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="refresh" size={24} color="white" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  nextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nextButtonText: {
    color: Colors.light.textLight,
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.light.textTertiary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
