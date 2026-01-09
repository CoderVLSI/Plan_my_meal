import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DayOfWeek, MealType, Meal } from '@/types/meal';
import { storageService } from '@/services/storageService';
import { WeeklyPlan } from '@/types/meal';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const MEAL_TYPES: { type: MealType; icon: string; label: string; color: string }[] = [
  { type: 'breakfast', icon: '☕', label: 'Breakfast', color: Colors.light.breakfast },
  { type: 'lunch', icon: '🍽️', label: 'Lunch', color: Colors.light.lunch },
  { type: 'dinner', icon: '🌙', label: 'Dinner', color: Colors.light.dinner },
  { type: 'snacks', icon: '🍎', label: 'Snacks', color: Colors.light.snacks },
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={28} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Meal' : 'Add Meal'}</Text>
        {isEditing && (
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={24} color={Colors.light.error} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Meal Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Meal Name</Text>
          <TextInput
            value={mealName}
            onChangeText={setMealName}
            placeholder="e.g., Butter Chicken"
            placeholderTextColor={Colors.light.textTertiary}
            style={styles.input}
          />
        </View>

        {/* Day Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
            {DAYS.map((day) => {
              const isSelected = selectedDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={[
                    styles.dayChip,
                    isSelected && styles.dayChipSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      isSelected && styles.dayChipTextSelected,
                    ]}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Meal Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Meal Type</Text>
          <View style={styles.mealTypesGrid}>
            {MEAL_TYPES.map((meal) => {
              const isSelected = selectedMealType === meal.type;
              return (
                <TouchableOpacity
                  key={meal.type}
                  onPress={() => setSelectedMealType(meal.type)}
                  style={[
                    styles.mealTypeCard,
                    isSelected && { borderColor: meal.color, backgroundColor: Colors.light.primaryLightest },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mealTypeIcon}>{meal.icon}</Text>
                  <Text
                    style={[
                      styles.mealTypeLabel,
                      isSelected && { color: meal.color },
                    ]}
                  >
                    {meal.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Servings */}
        <View style={styles.section}>
          <Text style={styles.label}>Number of Servings</Text>
          <TextInput
            value={servings}
            onChangeText={setServings}
            keyboardType="number-pad"
            placeholder="4"
            placeholderTextColor={Colors.light.textTertiary}
            style={styles.input}
          />
        </View>

        {/* Recipe Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Recipe Notes (Optional)</Text>
          <TextInput
            value={recipe}
            onChangeText={setRecipe}
            placeholder="Add cooking instructions or notes..."
            placeholderTextColor={Colors.light.textTertiary}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textArea]}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: Colors.light.primary }]}
          activeOpacity={0.9}
        >
          <Text style={styles.saveButtonText}>{isEditing ? 'Update Meal' : 'Add Meal'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: Colors.light.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  dayScroll: {
    flexDirection: 'row',
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    marginRight: 10,
  },
  dayChipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  dayChipTextSelected: {
    color: Colors.light.textLight,
  },
  mealTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealTypeCard: {
    width: '47%',
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  mealTypeIcon: {
    fontSize: 28,
  },
  mealTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  saveButton: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.textLight,
    letterSpacing: 0.5,
  },
});
