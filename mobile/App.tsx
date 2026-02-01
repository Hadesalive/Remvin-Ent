/**
 * Main App Component
 * Remvin Enterprise LTD Mobile App
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme, Platform, TouchableOpacity, Pressable } from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Context
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

// Theme
import { getThemeColors } from './src/lib/theme';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import NewProductScreen from './src/screens/NewProductScreen';
import CustomerListScreen from './src/screens/CustomerListScreen';
import CustomerDetailScreen from './src/screens/CustomerDetailScreen';
import NewCustomerScreen from './src/screens/NewCustomerScreen';
import InvoiceEditorScreen from './src/screens/InvoiceEditorScreen';
import SalesListScreen from './src/screens/SalesListScreen';
import SaleDetailScreen from './src/screens/SaleDetailScreen';
import NewSaleScreen from './src/screens/NewSaleScreen';
import MoreScreen from './src/screens/MoreScreen';
import DebtListScreen from './src/screens/DebtListScreen';
import DebtDetailScreen from './src/screens/DebtDetailScreen';
import NewDebtScreen from './src/screens/NewDebtScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// CustomersScreen is now CustomerListScreen - imported above

// SalesScreen is now SalesListScreen - imported above

const InvoicesScreen = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.placeholderContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.placeholderText, { color: colors.foreground }]}>
        Invoices (Coming Soon)
      </Text>
    </View>
  );
};


// Bottom Tab Navigator
function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Calculate tab bar height and padding
  // Base height: 64 for Android, 88 for iOS
  // Add safe area bottom inset to prevent conflict with system dock/gesture bar
  const baseHeight = Platform.OS === 'ios' ? 88 : 64;
  const basePaddingBottom = Platform.OS === 'ios' ? 28 : 12;
  
  // Get safe area bottom inset (handles gesture bars, docks, etc. on tablets)
  const bottomInset = insets.bottom;
  
  // Add bottom inset to both height and paddingBottom to properly accommodate system UI
  // This ensures the tab bar doesn't conflict with the system dock on tablets
  const tabBarHeight = baseHeight + bottomInset;
  const tabBarPaddingBottom = basePaddingBottom + bottomInset;
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          // Clean, minimal icons - filled when active, outline when inactive
          let IconComponent: any = Ionicons;
          let iconName: string = 'home-outline';
          let activeIconName: string = 'home';

          if (route.name === 'Dashboard') {
            iconName = 'grid-outline';
            activeIconName = 'grid';
          } else if (route.name === 'Sales') {
            iconName = 'receipt-outline';
            activeIconName = 'receipt';
          } else if (route.name === 'Products') {
            iconName = 'cube-outline';
            activeIconName = 'cube';
          } else if (route.name === 'Customers') {
            iconName = 'people-outline';
            activeIconName = 'people';
          } else if (route.name === 'More') {
            iconName = 'ellipsis-horizontal-outline';
            activeIconName = 'ellipsis-horizontal';
          }

          return (
            <IconComponent 
              name={focused ? activeIconName : iconName} 
              size={24} 
              color={color}
            />
          );
        },
        tabBarButton: (props) => {
          const { style, children, ...otherProps } = props;
          // Completely override any default background styling
          const customStyle = Array.isArray(style) 
            ? [...style, { backgroundColor: 'transparent', borderRadius: 0 }]
            : [style, { backgroundColor: 'transparent', borderRadius: 0 }];
          
          return (
            <Pressable
              {...otherProps}
              style={({ pressed }) => [
                ...customStyle,
                {
                  backgroundColor: 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {children}
            </Pressable>
          );
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: tabBarPaddingBottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          backgroundColor: 'transparent',
          borderRadius: 0,
        },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Sales" 
        component={SalesListScreen}
        options={{ tabBarLabel: 'Sales' }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductListScreen}
        options={{ tabBarLabel: 'Products' }}
      />
      <Tab.Screen 
        name="Customers" 
        component={CustomerListScreen}
        options={{ tabBarLabel: 'Clients' }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreScreen}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}

// Loading screen
function LoadingScreen() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

// Navigation with auth check
function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContent isAuthenticated={isAuthenticated} />
  );
}

// Separate component to access ThemeContext (must be inside ThemeProvider)
function NavigationContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="InvoiceEditor" component={InvoiceEditorScreen} />
            <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
            <Stack.Screen name="NewSale" component={NewSaleScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="NewProduct" component={NewProductScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
            <Stack.Screen name="NewCustomer" component={NewCustomerScreen} />
            <Stack.Screen name="DebtList" component={DebtListScreen} />
            <Stack.Screen name="DebtDetail" component={DebtDetailScreen} />
            <Stack.Screen name="NewDebt" component={NewDebtScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <ThemeProvider>
          <AuthProvider>
            <Navigation />
          </AuthProvider>
        </ThemeProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 20,
  },
});
