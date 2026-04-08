import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LessonAttendanceScreen } from '../screens/LessonAttendanceScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { SessionsListScreen } from '../screens/SessionsListScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' },
  headerBackTitleVisible: false,
};

export function LessonsStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="SessionsList"
        component={SessionsListScreen}
        options={{ title: 'Aulas' }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: 'Turmas' }}
      />
      <Stack.Screen
        name="LessonAttendance"
        component={LessonAttendanceScreen}
        options={{ title: 'Registrar chamada' }}
      />
    </Stack.Navigator>
  );
}
