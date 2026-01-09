import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Meal } from '@/types/meal';
import { storageService } from '@/services/storageService';
import { geminiService } from '@/services/geminiService';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [recipe, setRecipe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      const plan = await storageService.getCurrentMealPlan();
      if (!plan) return;

      const allMeals: Meal[] = [];
      plan.days.forEach((day) => {
        Object.values(day.meals).forEach((meal) => {
          if (meal) allMeals.push(meal);
        });
      });

      setMeals(allMeals);
    } catch (error) {
      console.error('Failed to load meals:', error);
    }
  };

  const handleGenerateRecipe = async (meal: Meal) => {
    setSelectedMeal(meal);
    setIsGenerating(true);

    try {
      const recipeText = await geminiService.generateRecipe(meal.name);
      setRecipe(recipeText);
    } catch (error: any) {
      console.error('Failed to generate recipe:', error);
      Alert.alert('Error', error.message || 'Failed to generate recipe');
    } finally {
      setIsGenerating(false);
    }
  };

  const getMealTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      breakfast: '☕',
      lunch: '🍽️',
      dinner: '🌙',
      snacks: '🍎',
    };
    return icons[type] || '🍽️';
  };

  return (
    <View style={styles.container}>
      <Header
        title="Recipes"
        subtitle={meals.length > 0 ? `${meals.length} meals with recipes` : 'Get AI-generated recipes'}
        onProfilePress={() => router.push('/profile-modal')}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        {meals.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="book-outline" size={64} color={Colors.light.tabIconDefault} />
            <Text className="text-text/60 text-lg mt-4 text-center">No meals yet</Text>
            <Text className="text-text/40 text-sm mt-2 text-center px-8">
              Add meals to your plan to generate recipes
            </Text>
          </View>
        ) : (
          <>
            {meals.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                onPress={() => !selectedMeal?.id === meal.id && handleGenerateRecipe(meal)}
                className="bg-cardBackground rounded-xl p-4 mb-3 border border-border shadow-sm"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-3">{getMealTypeIcon(meal.type)}</Text>
                  <View className="flex-1">
                    <Text className="font-semibold text-text text-base">{meal.name}</Text>
                    <Text className="text-text/60 text-sm">
                      {meal.dayOfWeek.charAt(0).toUpperCase() + meal.dayOfWeek.slice(1)} • {meal.servings} servings
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.light.tabIconDefault} />
                </View>
              </TouchableOpacity>
            ))}

            {isGenerating && (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text className="text-text/60 mt-3">Generating recipe...</Text>
              </View>
            )}

            {selectedMeal && recipe && !isGenerating && (
              <View className="mt-4 bg-cardBackground rounded-xl p-4 border border-border shadow-sm">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-bold text-text">{selectedMeal.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedMeal(null)}>
                    <Ionicons name="close-circle" size={24} color={Colors.light.tabIconDefault} />
                  </TouchableOpacity>
                </View>
                <Text className="text-text/80 text-base leading-relaxed whitespace-pre-wrap">
                  {recipe}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
});
