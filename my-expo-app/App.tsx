import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrinterProvider } from './hooks/usePrinter';

import './global.css';

import { NavigationContainer } from '@react-navigation/native';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <PrinterProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </PrinterProvider>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
