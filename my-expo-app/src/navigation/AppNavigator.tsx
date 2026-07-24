import React, { useState } from 'react';
import { View, Dimensions, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import POSScreen from '../screens/POSScreenNew';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PurchaseInvoiceScreen from '../screens/PurchaseInvoiceScreen';
import EditInvoiceScreen from '../screens/EditInvoiceScreen';
import CreditNoteListScreen from '../screens/CreditNoteListScreen';
import CreateCreditNoteScreen from '../screens/CreateCreditNoteScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import CustomerScreen from '../screens/CustomerScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import StockScreen from '../screens/StockScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import LocationSessionModal from '../components/LocationSessionModal';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Custom Tab Bar ─────────────────────────────────────────────────────────
// Full control over layout — no React Navigation internal padding/margins
function CustomTabBar({ state, descriptors, navigation, activeColor }: any) {
  const insets = useSafeAreaInsets();
  // Ensure tab labels/icons never clash with system nav bar
  const bottomSafe = Math.max(insets.bottom, 4);

  // Filter out hidden tabs (ones with tabBarButton: () => null)
  const visibleRoutes = state.routes.filter((_: any, i: number) => {
    const { options } = descriptors[state.routes[i].key];
    return options.tabBarButton !== null && typeof options.tabBarButton !== 'function';
  });

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: bottomSafe }]}>
      <View style={styles.tabBarInner}>
        {visibleRoutes.map((route: any) => {
          const realIndex = state.routes.findIndex((r: any) => r.key === route.key);
          const { options } = descriptors[route.key];
          const isFocused = state.index === realIndex;
          const color = isFocused ? activeColor : '#94A3B8';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const iconName = options.tabBarIcon?.({ color, size: 24, focused: isFocused });
          const label = typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              {iconName}
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Admin Navigator ────────────────────────────────────────────────────────
function AdminTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      backBehavior="history"
      tabBar={(props) => <CustomTabBar {...props} activeColor="#2563EB" />}
      screenOptions={{ headerShown: false, lazy: true }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('nav.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Sales"
        component={POSScreen}
        options={{
          tabBarLabel: t('nav.sales'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Purchase"
        component={PurchaseInvoiceScreen}
        options={{
          tabBarLabel: t('nav.purchase'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t('nav.history'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomerScreen}
        options={{
          tabBarLabel: t('nav.customers'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('nav.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Sales Navigator ────────────────────────────────────────────────────────
function SalesTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      backBehavior="history"
      tabBar={(props) => <CustomTabBar {...props} activeColor="#059669" />}
      screenOptions={{ headerShown: false, lazy: true }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('nav.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Sales"
        component={POSScreen}
        options={{
          tabBarLabel: t('nav.sales'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t('nav.history'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomerScreen}
        options={{
          tabBarLabel: t('nav.customers'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('nav.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ─────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showLocationModal, setShowLocationModal] = useState(!isAdmin && isAuthenticated);

  if (isLoading) return null;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={isAdmin ? AdminTabs : SalesTabs} />
            <Stack.Screen name="PurchaseInvoice" component={PurchaseInvoiceScreen} />
            <Stack.Screen name="EditInvoice" component={EditInvoiceScreen} />
            <Stack.Screen name="CreditNoteList" component={CreditNoteListScreen} />
            <Stack.Screen name="CreateCreditNote" component={CreateCreditNoteScreen} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
            <Stack.Screen name="Stock" component={StockScreen} />
            <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
          </>
        )}
      </Stack.Navigator>

      {isAuthenticated && showLocationModal && (
        <LocationSessionModal
          visible={showLocationModal}
          userId={user?.id || 0}
          onSessionSelected={() => setShowLocationModal(false)}
          onDismiss={() => setShowLocationModal(false)}
        />
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBarOuter: {
    // NO absolute positioning — sits in normal layout flow
    // so screen content is NEVER covered by the tab bar
    width: SCREEN_WIDTH,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabBarInner: {
    flexDirection: 'row',
    width: SCREEN_WIDTH,
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 6,
    paddingBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
});
