import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient } from '@/types/ingredient';
import { QuickCommercePlatform } from '@/types/shoppingList';
import { storageService } from '@/services/storageService';
import { shoppingListService } from '@/services/shoppingListService';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Header from '@/components/Header';

const PLATFORMS: { id: QuickCommercePlatform; name: string; icon: string; color: string }[] = [
  { id: 'zepto', name: 'Zepto', icon: '⚡', color: '#6C4AB6' },
  { id: 'blinkit', name: 'Blinkit', icon: '🛍️', color: '#F98E04' },
  { id: 'instamart', name: 'Swiggy Instamart', icon: '🛒', color: '#FF5200' },
  { id: 'generic', name: 'Generic', icon: '📋', color: '#6B7280' },
];

export default function ShoppingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<QuickCommercePlatform>('generic');
  const [formattedList, setFormedList] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  useEffect(() => {
    if (ingredients.length > 0) {
      updateFormedList();
    }
  }, [ingredients, selectedPlatform]);

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

  const updateFormedList = () => {
    const text = shoppingListService.formatForPlatform(ingredients, selectedPlatform);
    setFormedList(text);
  };

  const handleCopyToClipboard = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await shoppingListService.copyToClipboard(formattedList);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await shoppingListService.share(formattedList);
  };

  const handleSendToWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const text = encodeURIComponent(formattedList);
    const whatsappUrl = `whatsapp://send?text=${text}`;
    try {
      await shoppingListService.share(formattedList);
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Info', 'WhatsApp is not installed. Sharing via other methods...');
      await shoppingListService.share(formattedList);
    }
  };

  const uncheckedCount = ingredients.filter((ing) => !ing.checked).length;
  const checkedCount = ingredients.filter((ing) => ing.checked).length;

  return (
    <View style={styles.container}>
      <Header
        title="Shopping List"
        subtitle={
          ingredients.length > 0
            ? `${checkedCount}/${ingredients.length} items checked`
            : 'Export your shopping list'
        }
        onProfilePress={() => router.push('/profile-modal')}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        {ingredients.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="cart-outline" size={64} color={Colors.light.tabIconDefault} />
            <Text className="text-text/60 text-lg mt-4 text-center">No shopping list yet</Text>
            <Text className="text-text/40 text-sm mt-2 text-center px-8">
              Generate ingredients from your meal plan first
            </Text>
          </View>
        ) : (
          <>
            {/* Platform Selection */}
            <View className="mb-4">
              <Text className="text-text font-semibold mb-2 text-base">Select Platform</Text>
              <View className="flex-row flex-wrap">
                {PLATFORMS.map((platform) => (
                  <TouchableOpacity
                    key={platform.id}
                    onPress={() => setSelectedPlatform(platform.id)}
                    className={`mr-2 mb-2 px-4 py-3 rounded-lg flex-row items-center border-2 ${
                      selectedPlatform === platform.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-cardBackground'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text className="text-lg mr-2">{platform.icon}</Text>
                    <Text
                      className={`font-medium text-sm ${
                        selectedPlatform === platform.id ? 'text-primary' : 'text-text'
                      }`}
                    >
                      {platform.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview Card */}
            <View className="mb-4 bg-cardBackground rounded-xl p-4 border border-border shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-text">Preview</Text>
                <TouchableOpacity onPress={updateFormedList} className="p-2">
                  <Ionicons name="refresh-outline" size={20} color={Colors.light.primary} />
                </TouchableOpacity>
              </View>
              <View className="bg-background rounded-lg p-3 max-h-[200px] overflow-hidden">
                <Text className="text-text/80 text-sm leading-relaxed" selectable>
                  {formattedList}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="space-y-3 mb-4">
              {/* Copy to Clipboard */}
              <TouchableOpacity
                onPress={handleCopyToClipboard}
                className="flex-row items-center justify-center bg-cardBackground border-2 border-primary rounded-lg p-4"
                activeOpacity={0.8}
              >
                <Ionicons
                  name={copyFeedback ? 'checkmark-circle' : 'copy-outline'}
                  size={24}
                  color={Colors.light.primary}
                />
                <Text className="text-primary font-bold text-base ml-2">
                  {copyFeedback ? 'Copied!' : 'Copy to Clipboard'}
                </Text>
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity
                onPress={handleShare}
                className="flex-row items-center justify-center bg-primary rounded-lg p-4 shadow-sm"
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={24} color="white" />
                <Text className="text-white font-bold text-base ml-2">Share List</Text>
              </TouchableOpacity>

              {/* Send to WhatsApp */}
              <TouchableOpacity
                onPress={handleSendToWhatsApp}
                className="flex-row items-center justify-center bg-green-500 rounded-lg p-4 shadow-sm"
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={24} color="white" />
                <Text className="text-white font-bold text-base ml-2">Send to WhatsApp</Text>
              </TouchableOpacity>
            </View>

            {/* Tips */}
            <View className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <Text className="text-blue-800 font-semibold text-sm mb-2">💡 Tips:</Text>
              <Text className="text-blue-700 text-xs leading-relaxed">
                • Copy the list and paste it in your quick commerce app{'\n'}
                • Share with family members for easy coordination{'\n'}
                • Send to WhatsApp for quick sharing with helpers{'\n'}
                • Uncheck items you already have at home
              </Text>
            </View>
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
