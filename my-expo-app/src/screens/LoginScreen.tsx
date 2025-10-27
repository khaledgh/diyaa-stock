import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const { login } = useAuth();

  const validateEmail = (text: string) => {
    setEmail(text);
    setEmailError('');
    setLoginError('');
    if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      setEmailError('Please enter a valid email address');
    }
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    setPasswordError('');
    setLoginError('');
    if (text && text.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    }
  };

  const handleLogin = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setLoginError('');

    // Validate
    let hasError = false;
    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      setLoginError(error.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      {/* Gradient Background */}
      <View className="absolute inset-0 bg-gray-50">
        <View className="absolute top-0 left-0 right-0" style={{ height: 400, backgroundColor: '#EFF6FF', borderBottomLeftRadius: 100, borderBottomRightRadius: 100 }} />
      </View>

      <View className="flex-1 justify-center px-6">
        {/* Logo/Icon Section */}
        <View className="items-center mb-12">
          <View 
            className="w-24 h-24 bg-blue-600 rounded-3xl items-center justify-center mb-6"
            style={{
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <Ionicons name="cart" size={48} color="#FFFFFF" />
          </View>
          <Text className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</Text>
          <Text className="text-gray-500 text-base">Sign in to continue to POS</Text>
        </View>

        {/* Form Section */}
        <View className="space-y-5">
          {/* Login Error Message */}
          {loginError ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 flex-row items-center">
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text className="text-red-600 text-sm ml-2 flex-1">{loginError}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">Email Address</Text>
            <View 
              className={`bg-white rounded-2xl flex-row items-center px-4 border ${emailError ? 'border-red-300' : 'border-gray-200'}`}
              style={{
                shadowColor: emailError ? '#DC2626' : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: emailError ? 0.1 : 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Ionicons name="mail-outline" size={20} color={emailError ? "#DC2626" : "#9CA3AF"} />
              <TextInput
                className="flex-1 py-4 px-3 text-base text-gray-900"
                placeholder="your@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={validateEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>
            {emailError ? (
              <View className="flex-row items-center mt-1 ml-1">
                <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                <Text className="text-red-600 text-xs ml-1">{emailError}</Text>
              </View>
            ) : null}
          </View>

          {/* Password Input */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">Password</Text>
            <View 
              className={`bg-white rounded-2xl flex-row items-center px-4 border ${passwordError ? 'border-red-300' : 'border-gray-200'}`}
              style={{
                shadowColor: passwordError ? '#DC2626' : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: passwordError ? 0.1 : 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Ionicons name="lock-closed-outline" size={20} color={passwordError ? "#DC2626" : "#9CA3AF"} />
              <TextInput
                className="flex-1 py-4 px-3 text-base text-gray-900"
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={validatePassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                className="p-2"
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={passwordError ? "#DC2626" : "#9CA3AF"} 
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <View className="flex-row items-center mt-1 ml-1">
                <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                <Text className="text-red-600 text-xs ml-1">{passwordError}</Text>
              </View>
            ) : null}
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className={`rounded-2xl py-4 mt-4 ${isLoading ? 'bg-blue-400' : 'bg-blue-600'}`}
            style={{
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isLoading ? 0.2 : 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <View className="flex-row items-center justify-center">
                <Text className="text-white text-center font-bold text-lg mr-2">Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="mt-12 items-center">
          <View className="flex-row items-center mb-2">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            <Text className="text-gray-400 text-sm font-medium">Diyaa Stock POS System</Text>
          </View>
          <Text className="text-gray-400 text-xs">Version 1.0.0</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
