import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { DayOfWeek, MealType, DayPlan, WeeklyPlan } from '@/types/meal';
import { storageService } from '@/services/storageService';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const MEAL_TYPES: { type: MealType; icon: string; label: string; color: string }[] = [
  { type: 'breakfast', icon: '☕', label: 'Breakfast', color: Colors.light.breakfast },
  { type: 'lunch', icon: '🍽️', label: 'Lunch', color: Colors.light.lunch },
  { type: 'dinner', icon: '🌙', label: 'Dinner', color: Colors.light.dinner },
  { type: 'snacks', icon: '🍎', label: 'Snacks', color: Colors.light.snacks },
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

  const getDayLabel = (day: DayOfWeek): string => {
    return day.charAt(0).toUpperCase() + day.slice(1, 3);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading meal plan...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Plan My Meal</Text>
          <Text style={styles.subtitle}>
            {weeklyPlan ? `${formatDate(weeklyPlan.startDate)} - ${formatDate(weeklyPlan.endDate)}` : ''}
          </Text>
        </View>
      </View>

      {/* Days List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {weeklyPlan?.days.map((dayPlan, dayIndex) => (
          <View key={dayPlan.day} style={styles.dayCard}>
            {/* Day Header */}
            <View style={styles.dayHeader}>
              <View style={styles.dayInfo}>
                <View style={[styles.dayBadge, { backgroundColor: Colors.light.primaryLightest }]}>
                  <Text style={[styles.dayLabel, { color: Colors.light.primaryDark }]})}>
                    {getDayLabel(dayPlan.day)}
                  </Text>
                </View>
                <Text style={styles.dateText}>{formatDate(dayPlan.date)}</Text>
              </View>
              <View style={styles.mealCount}>
                <Text style={styles.mealCountText}>
                  {Object.values(dayPlan.meals).filter(Boolean).length}/4
                </Text>
              </View>
            </View>

            {/* Meal Slots */}
            <View style={styles.mealSlots}>
              {MEAL_TYPES.map((mealType) => {
                const meal = dayPlan.meals[mealType.type];
                return (
                  <View key={mealType.type} style={styles.mealSlot}>
                    {meal ? (
                      <TouchableOpacity
                        onLongPress={() => handleDeleteMeal(meal.id)}
                        onPress={() => handleMealPress(meal.id)}
                        style={styles.mealCard}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.mealTypeIndicator, { backgroundColor: mealType.color }]} />
                        <View style={styles.mealContent}>
                          <Text style={styles.mealIcon}>{mealType.icon}</Text>
                          <View style={styles.mealInfo}>
                            <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                            <Text style={styles.mealDetails}>{meal.servings} servings</Text>
                          </View>
                        </View>
                        <Ionicons name="create-outline" size={20} color={Colors.light.textSecondary} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleAddMeal(dayPlan.day, mealType.type)}
                        style={styles.addMealCard}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.mealTypeIndicator, { backgroundColor: Colors.light.borderLight }]} />
                        <Text style={styles.addMealIcon}>{mealType.icon}</Text>
                        <Text style={styles.addMealText}>Add {mealType.label}</Text>
                        <View style={styles.addIcon}>
                          <Ionicons name="add" size={18} color={Colors.light.primary} />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Generate Ingredients FAB */}
      {weeklyPlan && weeklyPlan.days.some((d) => Object.keys(d.meals).length > 0) && (
        <TouchableOpacity
          onPress={() => router.push('/ingredients')}
          style={[styles.fab, { backgroundColor: Colors.light.primary }]}
          activeOpacity={0.9}
        >
          <Ionicons name="sparkles" size={24} color={Colors.light.textLight} />
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  header: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  headerContent: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.textLight,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textLight,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  dayCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  mealCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
  },
  mealCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  mealSlots: {
    padding: 12,
    gap: 8,
  },
  mealSlot: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryLightest,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  mealTypeIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  mealContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
    gap: 12,
  },
  mealIcon: {
    fontSize: 20,
  },
  mealInfo: {
    flex: 1,
    gap: 2,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  mealDetails: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  addMealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.inputBackground,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  addMealIcon: {
    fontSize: 18,
    marginLeft: 12,
    opacity: 0.5,
  },
  addMealText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    marginLeft: 8,
  },
  addIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
