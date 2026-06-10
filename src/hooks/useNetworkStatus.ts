import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  isSupabaseReachable: boolean;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
    connectionType: 'unknown',
    isSupabaseReachable: true,
  });

  // Track if initial fetch has completed to avoid false offline→online transition on mount
  const initializedRef = useRef(false);

  useEffect(() => {
    // Fetch real state immediately on mount
    NetInfo.fetch().then((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      setNetworkStatus({
        isOnline: isConnected,
        connectionType: state.type,
        isSupabaseReachable: isConnected,
      });
      initializedRef.current = true;
    });

    // Subscribe to OS-level network change events (fires immediately, no polling)
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (!initializedRef.current) return;
      const isConnected = state.isConnected ?? false;
      setNetworkStatus({
        isOnline: isConnected,
        connectionType: state.type,
        isSupabaseReachable: isConnected,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkStatus;
}
