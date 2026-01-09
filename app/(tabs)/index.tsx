import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { DayOfWeek, MealType, DayPlan, WeeklyPlan } from '@/types/meal';
import { storageService } from '@/services/storageService';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '@/components/Header';

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

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading meal plan...</Text>
      </View>
    );
  }

  const totalMeals = weeklyPlan?.days.reduce((acc, day) => acc + Object.values(day.meals).filter(Boolean).length, 0) || 0;
  const totalPossible = weeklyPlan?.days.length * 4 || 28;
  const progressPercentage = Math.round((totalMeals / totalPossible) * 100);

  return (
    <View style={styles.container}>
      <Header
        title="Plan My Meal"
        subtitle={weeklyPlan ? `${formatDate(weeklyPlan.startDate)} - ${formatDate(weeklyPlan.endDate)}` : undefined}
        onProfilePress={() => router.push('/profile-modal')}
      />

      {/* Progress Card */}
      <View style={styles.progressCardContainer}>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Weekly Progress</Text>
              <Text style={styles.progressSubtitle}>
                {weeklyPlan ? `${formatDate(weeklyPlan.startDate)} - ${formatDate(weeklyPlan.endDate)}` : ''}
              </Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalMeals}</Text>
              <Text style={styles.statLabel}>Planned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalPossible - totalMeals}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyPlan?.days.length || 7}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Days List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {weeklyPlan?.days.map((dayPlan, dayIndex) => {
          const dayMealCount = Object.values(dayPlan.meals).filter(Boolean).length;
          const isToday = new Date().toISOString().split('T')[0] === dayPlan.date;

          return (
            <View key={dayPlan.day} style={[styles.dayCard, isToday && styles.todayCard]}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <View style={styles.dayInfo}>
                  <View style={[styles.dayBadge, { backgroundColor: isToday ? Colors.light.primary : Colors.light.primaryLightest }]}>
                    <Text style={[styles.dayLabel, { color: isToday ? Colors.light.textLight : Colors.light.primaryDark }]}>
                      {getDayLabel(dayPlan.day)}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.dateText, isToday && styles.todayDate]}>{formatDate(dayPlan.date)}</Text>
                    {isToday && <Text style={styles.todayLabel}>Today</Text>}
                  </View>
                </View>
                <View style={[styles.mealCount, { backgroundColor: isToday ? Colors.light.primaryLightest : Colors.light.background }]}>
                  <Ionicons name="restaurant" size={14} color={isToday ? Colors.light.primary : Colors.light.textSecondary} />
                  <Text style={[styles.mealCountText, isToday && styles.todayMealCount]}>
                    {dayMealCount}/4
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
                            <View style={[styles.mealIconContainer, { backgroundColor: `${mealType.color}20` }]}>
                              <Text style={styles.mealIcon}>{mealType.icon}</Text>
                            </View>
                            <View style={styles.mealInfo}>
                              <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                              <View style={styles.mealMeta}>
                                <Text style={styles.mealDetails}>{meal.servings} servings</Text>
                                <Text style={styles.mealTypeLabel}>{mealType.label}</Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.editButton}>
                            <Ionicons name="create-outline" size={18} color={Colors.light.primary} />
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleAddMeal(dayPlan.day, mealType.type)}
                          style={[styles.addMealCard, isToday && styles.addMealCardToday]}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.mealTypeIndicator, { backgroundColor: Colors.light.borderLight }]} />
                          <View style={[styles.mealIconContainer, { backgroundColor: Colors.light.background }]}>
                            <Text style={[styles.addMealIcon, { opacity: 0.5 }]}>{mealType.icon}</Text>
                          </View>
                          <Text style={styles.addMealText}>Add {mealType.label}</Text>
                          <View style={[styles.addIcon, isToday && { backgroundColor: Colors.light.primary }]}>
                            <Ionicons name="add" size={16} color={isToday ? Colors.light.textLight : Colors.light.primary} />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
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
  progressCardContainer: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  progressCard: {
    backgroundColor: Colors.light.textLight,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  progressSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.light.primary,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  dayCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  todayCard: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.cardBackground,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  todayDate: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  todayLabel: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  mealCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  todayMealCount: {
    color: Colors.light.primary,
  },
  mealSlots: {
    padding: 14,
    gap: 10,
  },
  mealSlot: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryLightest,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  mealTypeIndicator: {
    width: 5,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  mealContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
    gap: 12,
  },
  mealIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealIcon: {
    fontSize: 22,
  },
  addMealIcon: {
    fontSize: 20,
  },
  mealInfo: {
    flex: 1,
    gap: 4,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: -0.2,
  },
  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealDetails: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  mealTypeLabel: {
    fontSize: 11,
    color: Colors.light.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addMealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.inputBackground,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  addMealCardToday: {
    backgroundColor: Colors.light.primaryLightest,
    borderColor: Colors.light.primary,
    borderWidth: 2,
  },
  addMealText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginLeft: 12,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});
