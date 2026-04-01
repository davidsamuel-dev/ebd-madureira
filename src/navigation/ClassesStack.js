import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';

import { ClassFormScreen } from '../screens/ClassFormScreen';
import { ClassFinanceScreen } from '../screens/ClassFinanceScreen';
import { ClassesListScreen } from '../screens/ClassesListScreen';
import { StudentFormScreen } from '../screens/StudentFormScreen';
import { StudentListScreen } from '../screens/StudentListScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const headerScreenOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' },
  headerBackTitleVisible: false,
};

export function ClassesStack() {
  return (
    <Stack.Navigator screenOptions={headerScreenOptions}>
      <Stack.Screen
        name="ClassesList"
        component={ClassesListScreen}
        options={({ navigation }) => ({
          title: 'Turmas',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('ClassForm', {})}
              style={{ marginRight: 8, padding: 6 }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="add-circle-outline" size={28} color={colors.babyBlue} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="ClassForm"
        component={ClassFormScreen}
        options={({ route }) => ({
          title: route.params?.classId ? 'Editar turma' : 'Nova turma',
        })}
      />
      <Stack.Screen
        name="ClassFinance"
        component={ClassFinanceScreen}
        options={{ title: 'Financeiro' }}
      />
      <Stack.Screen
        name="StudentList"
        component={StudentListScreen}
        options={({ navigation, route }) => ({
          title: route.params?.className ? `Alunos · ${route.params.className}` : 'Alunos',
          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('StudentForm', {
                  classId: route.params?.classId,
                  className: route.params?.className,
                })
              }
              style={{ marginRight: 8, padding: 6 }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="add-circle-outline" size={28} color={colors.babyBlue} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="StudentForm"
        component={StudentFormScreen}
        options={({ route }) => ({
          title: route.params?.studentId ? 'Editar aluno' : 'Novo aluno',
        })}
      />
    </Stack.Navigator>
  );
}
