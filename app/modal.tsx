import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DayOfWeek, MealType, Meal } from '@/types/meal';
import { storageService } from '@/services/storageService';
import { WeeklyPlan } from '@/types/meal';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const MEAL_TYPES: { type: MealType; icon: string; label: string }[] = [
  { type: 'breakfast', icon: '☕', label: 'Breakfast' },
  { type: 'lunch', icon: '🍽️', label: 'Lunch' },
  { type: 'dinner', icon: '🌙', label: 'Dinner' },
  { type: 'snacks', icon: '🍎', label: 'Snacks' },
];

export default function MealModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: DayOfWeek; mealType?: MealType; mealId?: string }>();
  const insets = useSafeAreaInsets();

  const [mealName, setMealName] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(params.day || 'monday');
  const [selectedMealType, setSelectedMealType] = useState<MealType>(params.mealType || 'breakfast');
  const [servings, setServings] = useState('4');
  const [recipe, setRecipe] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [existingMealId, setExistingMealId] = useState<string | null>(null);

  useEffect(() => {
    if (params.mealId) {
      loadMeal(params.mealId);
    }
  }, [params.mealId]);

  const loadMeal = async (mealId: string) => {
    try {
      const plan = await storageService.getCurrentMealPlan();
      if (!plan) return;

      for (const day of plan.days) {
        for (const [type, meal] of Object.entries(day.meals)) {
          if (meal?.id === mealId) {
            setMealName(meal.name);
            setSelectedDay(day.day);
            setSelectedMealType(type as MealType);
            setServings(meal.servings.toString());
            setRecipe(meal.recipe || '');
            setIsEditing(true);
            setExistingMealId(mealId);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load meal:', error);
    }
  };

  const handleSave = async () => {
    if (!mealName.trim()) {
      Alert.alert('Error', 'Please enter a meal name');
      return;
    }

    try {
      const plan = await storageService.getCurrentMealPlan();
      if (!plan) {
        Alert.alert('Error', 'No meal plan found');
        return;
      }

      const newMeal: Meal = {
        id: existingMealId || `meal-${Date.now()}`,
        name: mealName.trim(),
        type: selectedMealType,
        dayOfWeek: selectedDay,
        date: plan.days.find((d) => d.day === selectedDay)?.date || new Date().toISOString().split('T')[0],
        servings: parseInt(servings) || 4,
        recipe: recipe.trim() || undefined,
      };

      const updatedPlan = {
        ...plan,
        days: plan.days.map((day) => {
          if (day.day === selectedDay) {
            return {
              ...day,
              meals: {
                ...day.meals,
                [selectedMealType]: newMeal,
              },
            };
          }
          return day;
        }),
      };

      await storageService.saveMealPlan(updatedPlan);
      router.back();
    } catch (error) {
      console.error('Failed to save meal:', error);
      Alert.alert('Error', 'Failed to save meal');
    }
  };

  const handleDelete = async () => {
    if (!existingMealId) return;

    Alert.alert('Delete Meal', 'Are you sure you want to delete this meal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const plan = await storageService.getCurrentMealPlan();
            if (!plan) return;

            const updatedPlan = {
              ...plan,
              days: plan.days.map((day) => ({
                ...day,
                meals: Object.entries(day.meals).reduce((acc, [type, meal]) => ({
                  ...acc,
                  [type]: meal?.id === existingMealId ? undefined : meal,
                }), {} as typeof day.meals),
              })),
            };

            await storageService.saveMealPlan(updatedPlan);
            router.back();
          } catch (error) {
            console.error('Failed to delete meal:', error);
            Alert.alert('Error', 'Failed to delete meal');
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between bg-primary px-4 pb-4 pt-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white flex-1 text-center mr-8">
          {isEditing ? 'Edit Meal' : 'Add Meal'}
        </Text>
        {isEditing && (
          <TouchableOpacity onPress={handleDelete} className="p-2">
            <Ionicons name="trash-outline" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* Meal Name */}
        <View className="mb-4">
          <Text className="text-text font-semibold mb-2 text-base">Meal Name</Text>
          <TextInput
            value={mealName}
            onChangeText={setMealName}
            placeholder="e.g., Butter Chicken"
            placeholderTextColor="#999"
            className="bg-cardBackground border border-border rounded-lg p-4 text-text text-base"
          />
        </View>

        {/* Day Selection */}
        <View className="mb-4">
          <Text className="text-text font-semibold mb-2 text-base">Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {DAYS.map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(day)}
                className={`mr-2 px-4 py-2 rounded-lg ${
                  selectedDay === day ? 'bg-primary' : 'bg-cardBackground border border-border'
                }`}
              >
                <Text
                  className={`font-medium text-sm ${
                    selectedDay === day ? 'text-white' : 'text-text'
                  }`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Meal Type Selection */}
        <View className="mb-4">
          <Text className="text-text font-semibold mb-2 text-base">Meal Type</Text>
          <View className="flex-row flex-wrap">
            {MEAL_TYPES.map((meal) => (
              <TouchableOpacity
                key={meal.type}
                onPress={() => setSelectedMealType(meal.type)}
                className={`mr-2 mb-2 px-4 py-3 rounded-lg flex-row items-center ${
                  selectedMealType === meal.type ? 'bg-primary' : 'bg-cardBackground border border-border'
                }`}
              >
                <Text className="text-lg mr-2">{meal.icon}</Text>
                <Text
                  className={`font-medium text-sm ${
                    selectedMealType === meal.type ? 'text-white' : 'text-text'
                  }`}
                >
                  {meal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Servings */}
        <View className="mb-4">
          <Text className="text-text font-semibold mb-2 text-base">Number of Servings</Text>
          <TextInput
            value={servings}
            onChangeText={setServings}
            keyboardType="number-pad"
            placeholder="4"
            placeholderTextColor="#999"
            className="bg-cardBackground border border-border rounded-lg p-4 text-text text-base"
          />
        </View>

        {/* Recipe Notes (Optional) */}
        <View className="mb-6">
          <Text className="text-text font-semibold mb-2 text-base">Recipe Notes (Optional)</Text>
          <TextInput
            value={recipe}
            onChangeText={setRecipe}
            placeholder="Add cooking instructions or notes..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            className="bg-cardBackground border border-border rounded-lg p-4 text-text text-base min-h-[100px]"
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-primary rounded-lg p-4 items-center shadow-sm"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-base">{isEditing ? 'Update Meal' : 'Add Meal'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
