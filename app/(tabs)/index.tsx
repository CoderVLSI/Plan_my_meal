import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { DayOfWeek, MealType, DayPlan, WeeklyPlan } from '@/types/meal';
import { storageService } from '@/services/storageService';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const MEAL_TYPES: { type: MealType; icon: string; label: string }[] = [
  { type: 'breakfast', icon: '☕', label: 'Breakfast' },
  { type: 'lunch', icon: '🍽️', label: 'Lunch' },
  { type: 'dinner', icon: '🌙', label: 'Dinner' },
  { type: 'snacks', icon: '🍎', label: 'Snacks' },
];

export default function MealPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const plan = await storageService.getCurrentMealPlan();
      if (!plan) {
        // Create a new weekly plan
        const newPlan = createNewWeeklyPlan();
        await storageService.saveMealPlan(newPlan);
        setWeeklyPlan(newPlan);
      } else {
        setWeeklyPlan(plan);
      }
    } catch (error) {
      console.error('Failed to load meal plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewWeeklyPlan = (): WeeklyPlan => {
    const today = new Date();
    const monday = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    const days: DayPlan[] = DAYS.map((dayName, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        day: dayName,
        date: date.toISOString().split('T')[0],
        meals: {},
      };
    });

    return {
      id: `plan-${Date.now()}`,
      startDate: monday.toISOString().split('T')[0],
      endDate: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      days,
    };
  };

  const handleAddMeal = (day: DayOfWeek, mealType: MealType) => {
    router.push({
      pathname: '/modal',
      params: { day, mealType },
    });
  };

  const handleMealPress = (mealId: string) => {
    router.push({
      pathname: '/modal',
      params: { mealId },
    });
  };

  const handleDeleteMeal = async (mealId: string) => {
    Alert.alert('Delete Meal', 'Are you sure you want to delete this meal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!weeklyPlan) return;
          const updatedPlan = {
            ...weeklyPlan,
            days: weeklyPlan.days.map((day) => ({
              ...day,
              meals: Object.entries(day.meals).reduce((acc, [type, meal]) => ({
                ...acc,
                [type]: meal?.id === mealId ? undefined : meal,
              }), {} as typeof day.meals),
            })),
          };
          setWeeklyPlan(updatedPlan);
          await storageService.saveMealPlan(updatedPlan);
        },
      },
    ]);
  };

  const getMealTypeIcon = (type: MealType): string => {
    return MEAL_TYPES.find((m) => m.type === type)?.icon || '🍽️';
  };

  const getDayLabel = (day: DayOfWeek): string => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-text text-lg">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-primary px-4 pb-4 pt-2">
        <Text className="text-2xl font-bold text-white mb-1">Plan My Meal</Text>
        <Text className="text-white/80 text-sm">
          {weeklyPlan ? `${formatDate(weeklyPlan.startDate)} - ${formatDate(weeklyPlan.endDate)}` : ''}
        </Text>
      </View>

      {/* Days List */}
      <ScrollView className="flex-1 px-4 py-4">
        {weeklyPlan?.days.map((dayPlan) => (
          <View key={dayPlan.day} className="mb-4 bg-cardBackground rounded-xl p-4 shadow-sm border border-border">
            {/* Day Header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xl font-bold text-text">{getDayLabel(dayPlan.day)}</Text>
              <Text className="text-text/60 text-sm">{formatDate(dayPlan.date)}</Text>
            </View>

            {/* Meal Slots */}
            {MEAL_TYPES.map((mealType) => {
              const meal = dayPlan.meals[mealType.type];
              return (
                <View key={mealType.type} className="mb-2">
                  {meal ? (
                    <TouchableOpacity
                      onLongPress={() => handleDeleteMeal(meal.id)}
                      onPress={() => handleMealPress(meal.id)}
                      className="flex-row items-center p-3 bg-primary/10 rounded-lg"
                      activeOpacity={0.7}
                    >
                      <Text className="text-2xl mr-3">{getMealTypeIcon(meal.type)}</Text>
                      <View className="flex-1">
                        <Text className="font-semibold text-text text-base">{meal.name}</Text>
                        <Text className="text-text/60 text-sm">{meal.servings} servings</Text>
                      </View>
                      <Ionicons name="pencil" size={20} color={Colors.light.primary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleAddMeal(dayPlan.day, mealType.type)}
                      className="flex-row items-center p-3 border-2 border-dashed border-primary/30 rounded-lg"
                      activeOpacity={0.7}
                    >
                      <Text className="text-xl mr-3 opacity-50">{mealType.icon}</Text>
                      <Text className="text-primary/60 font-medium">Add {mealType.label}</Text>
                      <Ionicons name="add-circle-outline" size={20} color={Colors.light.primary} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Generate Ingredients FAB */}
      {weeklyPlan && weeklyPlan.days.some((d) => Object.keys(d.meals).length > 0) && (
        <TouchableOpacity
          onPress={() => router.push('/ingredients')}
          className="absolute bottom-24 right-4 bg-primary rounded-full p-4 shadow-lg"
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={28} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
