import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { Location } from '../types';

interface LocationSessionModalProps {
  visible: boolean;
  userId: number;
  onSessionSelected: (locationId: number, locationName: string) => void;
  onDismiss: () => void;
}

export default function LocationSessionModal({
  visible,
  userId,
  onSessionSelected,
  onDismiss,
}: LocationSessionModalProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  const loadUserLocations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // First check if there's already a session today
      const sessionResp = await apiService.getTodaySession();
      if (sessionResp.session) {
        // Already has a session, auto-select it
        onSessionSelected(
          sessionResp.session.location_id,
          sessionResp.session.location?.name || 'Location'
        );
        return;
      }

      // Load assigned locations
      const resp = await apiService.getUserLocations(userId);
      const data = resp.data || resp;
      if (Array.isArray(data) && data.length > 0) {
        setLocations(data);
      } else {
        // No multi-locations assigned, dismiss the modal
        onDismiss();
      }
    } catch {
      onDismiss();
    } finally {
      setIsLoading(false);
    }
  }, [userId, onSessionSelected, onDismiss]);

  React.useEffect(() => {
    if (visible) {
      loadUserLocations();
    }
  }, [visible, loadUserLocations]);

  const handleSelectLocation = async (location: Location) => {
    setSelecting(true);
    try {
      await apiService.createSession(location.id);
      onSessionSelected(location.id, location.name);
    } catch {
      // If session creation fails, still allow them to proceed
      onSessionSelected(location.id, location.name);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
        <SafeAreaView>
          <View className="bg-white rounded-3xl overflow-hidden" style={{ elevation: 10 }}>
            {/* Header */}
            <View className="bg-blue-600 px-6 pt-8 pb-6">
              <View className="items-center">
                <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-4">
                  <Ionicons name="location" size={32} color="#FFF" />
                </View>
                <Text className="text-white text-xl font-bold text-center">Select Today{"'"}s Location</Text>
                <Text className="text-blue-100 text-sm text-center mt-1">
                  Choose which van/branch you are working at today
                </Text>
              </View>
            </View>

            {/* Content */}
            <View className="p-5">
              {isLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text className="text-gray-500 mt-3">Loading locations...</Text>
                </View>
              ) : (
                <>
                  {locations.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      onPress={() => handleSelectLocation(loc)}
                      disabled={selecting}
                      className="flex-row items-center p-4 mb-3 rounded-2xl border border-gray-200 bg-white"
                      style={{ elevation: 2 }}
                      activeOpacity={0.7}>
                      <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center mr-4">
                        <Ionicons
                          name={loc.type === 'van' ? 'car' : 'storefront'}
                          size={24}
                          color="#2563EB"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900">{loc.name}</Text>
                        <Text className="text-xs text-gray-500 capitalize mt-0.5">{loc.type}</Text>
                      </View>
                      {selecting ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  ))}

                  {locations.length === 0 && (
                    <View className="items-center py-6">
                      <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
                      <Text className="text-gray-400 mt-3 text-center">
                        No locations assigned to your account
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Skip button */}
            <View className="px-5 pb-5">
              <TouchableOpacity
                onPress={onDismiss}
                className="items-center py-3">
                <Text className="text-gray-400 text-sm font-medium">Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
