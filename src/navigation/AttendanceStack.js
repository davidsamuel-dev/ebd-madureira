import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AttendanceHomeScreen } from '../screens/AttendanceHomeScreen';
import { LessonAttendanceScreen } from '../screens/LessonAttendanceScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' },
  headerBackTitleVisible: false,
};

export function AttendanceStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="AttendanceHome"
        component={AttendanceHomeScreen}
        options={{ title: 'Chamada' }}
      />
      <Stack.Screen
        name="LessonAttendance"
        component={LessonAttendanceScreen}
        options={{ title: 'Registrar chamada' }}
      />
    </Stack.Navigator>
  );
}
