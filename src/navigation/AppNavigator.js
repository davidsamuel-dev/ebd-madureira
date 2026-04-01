import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ClassesProvider } from '../context/ClassesContext';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { ClassesScreen } from '../screens/ClassesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SplashScreen } from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Turmas" component={ClassesScreen} />
      <Tab.Screen name="Chamada" component={AttendanceScreen} />
      <Tab.Screen name="Relatórios" component={ReportsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <ClassesProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </ClassesProvider>
  );
}
