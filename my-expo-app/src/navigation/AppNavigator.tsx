import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import POSScreen from '../screens/POSScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PurchaseInvoiceScreen from '../screens/PurchaseInvoiceScreen';
import CreditNoteListScreen from '../screens/CreditNoteListScreen';
import CreateCreditNoteScreen from '../screens/CreateCreditNoteScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
// import AIInvoiceScreen from '../screens/AIInvoiceScreen'; // Hidden for now

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return <Ionicons name={name as any} size={size} color={color} />;
}

// Admin sees: Dashboard, Purchase, AI Invoice, History, Profile
function AdminTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tab.Screen
        name="Purchase"
        component={PurchaseInvoiceScreen}
        options={{
          tabBarLabel: 'Purchase',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'cube' : 'cube-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'receipt' : 'receipt-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} size={22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Sales/CashVan sees: Dashboard, Sales POS, History, Profile
function SalesTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tab.Screen
        name="Sales"
        component={POSScreen}
        options={{
          tabBarLabel: 'Sales',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'cart' : 'cart-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'receipt' : 'receipt-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} size={22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  return isAdmin ? <AdminTabs /> : <SalesTabs />;
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="PurchaseInvoice" component={PurchaseInvoiceScreen} />
          <Stack.Screen name="CreditNoteList" component={CreditNoteListScreen} />
          <Stack.Screen name="CreateCreditNote" component={CreateCreditNoteScreen} />
          <Stack.Screen name="UserManagement" component={UserManagementScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
