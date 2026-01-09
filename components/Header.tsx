import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onProfilePress?: () => void;
  rightComponent?: React.ReactNode;
}

export default function Header({ title, subtitle, onProfilePress, rightComponent }: HeaderProps) {
  const insets = useSafeAreaInsets();

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <LinearGradient
      colors={[Colors.light.primary, Colors.light.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.headerTop}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Good {getGreeting()}! 👋</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightComponent || (
          <TouchableOpacity style={styles.profileButton} activeOpacity={0.7} onPress={onProfilePress}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={24} color={Colors.light.primary} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textLight,
    opacity: 0.9,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.textLight,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textLight,
    opacity: 0.8,
    marginTop: 2,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: Colors.light.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.textLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
