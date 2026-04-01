import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { ClassesProvider } from '../context/ClassesContext';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { AuthLoadingScreen } from '../screens/AuthLoadingScreen';
import { ClassesScreen } from '../screens/ClassesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { outline: 'home-outline', filled: 'home' },
  Turmas: { outline: 'people-outline', filled: 'people' },
  Chamada: { outline: 'clipboard-outline', filled: 'clipboard' },
  Relatórios: { outline: 'stats-chart-outline', filled: 'stats-chart' },
};

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 12 : 0,
  );

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const set = TAB_ICONS[route.name];
          const name = set ? (focused ? set.filled : set.outline) : 'ellipse';
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Turmas" component={ClassesScreen} options={{ title: 'Turmas' }} />
      <Tab.Screen name="Chamada" component={AttendanceScreen} options={{ title: 'Chamada' }} />
      <Tab.Screen name="Relatórios" component={ReportsScreen} options={{ title: 'Relatórios' }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <AuthLoadingScreen />;
  }

  return (
    <ClassesProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user == null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </ClassesProvider>
  );
}

export function AppNavigator() {
  return <AuthStack />;
}
