import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone: string;
  avatarSeed: string;
  avatarUri?: string | null;
  isRegistered: boolean;
  appLockEnabled?: boolean; // Keep for backwards compatibility
  customPin?: string | null;
  securityMode: 'none' | 'pin' | 'password' | 'fingerprint' | 'face';
  customPassword?: string | null;
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  notificationTime?: string; // Format "HH:mm"
  language: string;
  exportDirectoryUri?: string | null;
  themePreference?: 'system' | 'light' | 'dark';
  currency?: string;
  geminiApiKey?: string | null;
}

const initialState: UserProfile = {
  firstName: '',
  lastName: '',
  phone: '',
  avatarSeed: 'Felix',
  avatarUri: null,
  isRegistered: false,
  appLockEnabled: false,
  customPin: null,
  securityMode: 'none',
  customPassword: null,
  biometricEnabled: false,
  notificationsEnabled: false,
  notificationTime: '20:00',
  language: 'fr',
  exportDirectoryUri: null,
  themePreference: 'system',
  currency: 'GNF',
  geminiApiKey: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    registerUser: (state, action: PayloadAction<Omit<UserProfile, 'isRegistered'>>) => {
      state.firstName = action.payload.firstName;
      state.lastName = action.payload.lastName;
      state.phone = action.payload.phone;
      state.avatarSeed = action.payload.avatarSeed;
      state.avatarUri = action.payload.avatarUri;
      state.isRegistered = true;
      state.appLockEnabled = action.payload.appLockEnabled || false;
      state.customPin = action.payload.customPin || null;
      state.securityMode = action.payload.securityMode || 'none';
      state.customPassword = action.payload.customPassword || null;
      state.biometricEnabled = action.payload.biometricEnabled || false;
      state.notificationsEnabled = action.payload.notificationsEnabled || false;
      state.notificationTime = action.payload.notificationTime || '20:00';
      state.language = action.payload.language || 'fr';
      state.exportDirectoryUri = action.payload.exportDirectoryUri || null;
      state.themePreference = action.payload.themePreference || 'system';
      state.currency = action.payload.currency || 'GNF';
      state.geminiApiKey = action.payload.geminiApiKey || null;
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (action.payload.firstName) state.firstName = action.payload.firstName;
      if (action.payload.lastName) state.lastName = action.payload.lastName;
      if (action.payload.phone) state.phone = action.payload.phone;
      if (action.payload.avatarSeed) state.avatarSeed = action.payload.avatarSeed;
      if (action.payload.avatarUri !== undefined) state.avatarUri = action.payload.avatarUri;
      if (action.payload.appLockEnabled !== undefined) state.appLockEnabled = action.payload.appLockEnabled;
      if (action.payload.customPin !== undefined) state.customPin = action.payload.customPin;
      if (action.payload.securityMode !== undefined) state.securityMode = action.payload.securityMode;
      if (action.payload.customPassword !== undefined) state.customPassword = action.payload.customPassword;
      if (action.payload.biometricEnabled !== undefined) state.biometricEnabled = action.payload.biometricEnabled;
      if (action.payload.notificationsEnabled !== undefined) state.notificationsEnabled = action.payload.notificationsEnabled;
      if (action.payload.notificationTime !== undefined) state.notificationTime = action.payload.notificationTime;
      if (action.payload.language !== undefined) state.language = action.payload.language;
      if (action.payload.exportDirectoryUri !== undefined) state.exportDirectoryUri = action.payload.exportDirectoryUri;
      if (action.payload.themePreference !== undefined) state.themePreference = action.payload.themePreference;
      if (action.payload.currency !== undefined) state.currency = action.payload.currency;
      if (action.payload.geminiApiKey !== undefined) state.geminiApiKey = action.payload.geminiApiKey;
    },
    setFullProfile: (state, action: PayloadAction<UserProfile>) => {
      state.firstName = action.payload.firstName;
      state.lastName = action.payload.lastName;
      state.phone = action.payload.phone;
      state.avatarSeed = action.payload.avatarSeed;
      state.avatarUri = action.payload.avatarUri;
      state.isRegistered = action.payload.isRegistered;
      state.appLockEnabled = action.payload.appLockEnabled || false;
      state.customPin = action.payload.customPin || null;
      state.securityMode = action.payload.securityMode || 'none';
      state.customPassword = action.payload.customPassword || null;
      state.biometricEnabled = action.payload.biometricEnabled || false;
      state.notificationsEnabled = action.payload.notificationsEnabled || false;
      state.notificationTime = action.payload.notificationTime || '20:00';
      state.language = action.payload.language || 'fr';
      state.exportDirectoryUri = action.payload.exportDirectoryUri || null;
      state.themePreference = action.payload.themePreference || 'system';
      state.currency = action.payload.currency || 'GNF';
      state.geminiApiKey = action.payload.geminiApiKey || null;
    },
    logout: (state) => {
      state.isRegistered = false;
    }
  },
});

export const { registerUser, updateProfile, setFullProfile, logout } = userSlice.actions;
export default userSlice.reducer;
