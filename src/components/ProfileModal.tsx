import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, TextInput,
  Image, ScrollView, Switch, Platform, KeyboardAvoidingView, Linking, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { updateProfile, logout } from '../redux/userSlice';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import PinSetupModal from './PinSetupModal';
import PasswordSetupModal from './PasswordSetupModal';
import { requestNotificationPermissions, scheduleDailyReminder, cancelAllNotifications } from '../utils/notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StorageAccessFramework } from 'expo-file-system/legacy';

interface Props { visible: boolean; onClose: () => void; onLockApp?: () => void; }

type Tab = 'profile' | 'settings' | 'security' | 'notifications' | 'language' | 'theme' | 'currency' | 'download' | 'about';

export default function ProfileModal({ visible, onClose, onLockApp }: Props) {
  const { theme, toggleTheme, colors } = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  // Lire la langue directement depuis Redux pour que l'UI se mette à jour immédiatement
  const currentLanguage = useSelector((state: RootState) => state.user.language || 'fr');

  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [avatarSeed, setAvatarSeed] = useState(Date.now().toString());
  const [avatarUri, setAvatarUri]   = useState<string | null>(null);

  // Security State
  const [securityMode, setSecurityMode]          = useState<'none' | 'pin' | 'password' | 'fingerprint' | 'face'>('none');
  const [customPin, setCustomPin]                = useState<string | null>(null);
  const [customPassword, setCustomPassword]      = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled]  = useState(false);

  // Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date(new Date().setHours(20, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [language, setLanguage] = useState('fr');
  const [exportDirUri, setExportDirUri] = useState<string | null>(null);
  const [themePreference, setThemePreference] = useState<'system'|'light'|'dark'>('system');
  const [currency, setCurrency] = useState('GNF');

  // Modals
  const [showPinSetup, setShowPinSetup]           = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [availableBiometrics, setAvailableBiometrics] = useState<LocalAuthentication.AuthenticationType[]>([]);

  useEffect(() => {
    const checkBiometrics = async () => {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setAvailableBiometrics(types);
    };
    checkBiometrics();
  }, []);

  useEffect(() => {
    if (visible) {
      setActiveTab('profile'); // reset to main on open
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setAvatarSeed(user.avatarSeed || Date.now().toString());
      setAvatarUri(user.avatarUri || null);

      setSecurityMode(user.securityMode || 'none');
      setCustomPin(user.customPin || null);
      setCustomPassword(user.customPassword || null);
      setBiometricEnabled(user.biometricEnabled || false);
      
      setNotificationsEnabled(user.notificationsEnabled || false);
      if (user.notificationTime) {
        const [hours, minutes] = user.notificationTime.split(':').map(Number);
        const t = new Date();
        t.setHours(hours, minutes, 0, 0);
        setNotificationTime(t);
      }
      setLanguage(user.language || 'fr');
      setExportDirUri(user.exportDirectoryUri || null);
      setThemePreference(user.themePreference || 'system');
      setCurrency(user.currency || 'GNF');
    }
  }, [visible, user]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission requise pour accéder aux photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSecurityModeChange = async (mode: 'none' | 'pin' | 'password' | 'fingerprint' | 'face') => {
    if (mode === 'none') {
      setSecurityMode('none');
      setCustomPin(null);
      setCustomPassword(null);
      setBiometricEnabled(false);
      handleInstantSave({ securityMode: 'none', customPin: null, customPassword: null, biometricEnabled: false, appLockEnabled: false });
    } else if (mode === 'pin') {
      setShowPinSetup(true);
    } else if (mode === 'password') {
      setShowPasswordSetup(true);
    } else if (mode === 'fingerprint' || mode === 'face') {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirmer la biométrie',
        cancelLabel: 'Annuler',
        disableDeviceFallback: true,
      });
      if (result.success) {
        setSecurityMode(mode);
        setBiometricEnabled(true);
        setCustomPin(null);
        setCustomPassword(null);
        handleInstantSave({ securityMode: mode, biometricEnabled: true, customPin: null, customPassword: null, appLockEnabled: true });
      } else {
        alert("Authentification échouée.");
      }
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        alert("Permission refusée. Vous devez autoriser les notifications dans les paramètres de votre appareil.");
        return;
      }
      await scheduleDailyReminder(notificationTime.getHours(), notificationTime.getMinutes());
      setNotificationsEnabled(true);
    } else {
      await cancelAllNotifications();
      setNotificationsEnabled(false);
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNotificationTime(selectedDate);
      if (notificationsEnabled) {
        await scheduleDailyReminder(selectedDate.getHours(), selectedDate.getMinutes());
      }
    }
  };

  const handlePickDirectory = async () => {
    if (Platform.OS !== 'android') {
      alert("La sélection d'un dossier par défaut est uniquement disponible sur Android.");
      return;
    }
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      setExportDirUri(permissions.directoryUri);
    }
  };

  const handleInstantSave = async (updates: Partial<typeof user>) => {
    dispatch(updateProfile(updates));
    try {
      const fullProfile = { ...user, ...updates, isRegistered: true };
      await AsyncStorage.setItem('@user_profile', JSON.stringify(fullProfile));
    } catch (error) {
      console.error('Failed to save profile instantly', error);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Veuillez entrer votre nom et prénom.');
      return;
    }
    const timeString = `${notificationTime.getHours().toString().padStart(2, '0')}:${notificationTime.getMinutes().toString().padStart(2, '0')}`;
    
    const updatedProfile = {
      firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(),
      avatarSeed, avatarUri,
      securityMode, customPin, customPassword, biometricEnabled, 
      notificationsEnabled, notificationTime: timeString,
      language, exportDirectoryUri: exportDirUri, themePreference, currency,
      appLockEnabled: securityMode !== 'none',
    };

    dispatch(updateProfile(updatedProfile));

    try {
      // Merge with existing user object to ensure no fields like 'isRegistered' are lost
      const fullProfile = { ...user, ...updatedProfile, isRegistered: true };
      await AsyncStorage.setItem('@user_profile', JSON.stringify(fullProfile));
    } catch (error) {
      console.error('Failed to save profile to AsyncStorage', error);
    }

    onClose();
  };

  const handleLogout = () => {
    if (user.securityMode === 'none') {
      if (Platform.OS === 'web') {
        window.alert(getTranslated(
          "Vous devez configurer un code PIN ou un mot de passe dans l'onglet Sécurité pour pouvoir verrouiller l'application.",
          "You must set up a PIN or password in the Security tab to lock the app."
        ));
      } else {
        Alert.alert(
          getTranslated("Sécurité requise", "Security required"),
          getTranslated(
            "Vous devez configurer un code PIN ou un mot de passe dans l'onglet Sécurité pour pouvoir verrouiller l'application.", 
            "You must set up a PIN or password in the Security tab to lock the app."
          )
        );
      }
      return;
    }
    
    if (onLockApp) {
      onLockApp();
    }
  };

  const handleResetAccount = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(getTranslated("Voulez-vous vraiment supprimer toutes vos données et réinitialiser l'application ?", "Are you sure you want to delete all your data and reset the app?"));
      if (confirm) {
        AsyncStorage.removeItem('@fintech_app_state').then(() => {
          AsyncStorage.removeItem('@user_profile').then(() => {
            dispatch(logout());
            onClose();
          });
        });
      }
    } else {
      Alert.alert(
        getTranslated("Réinitialiser le compte", "Reset Account"),
        getTranslated("Voulez-vous vraiment supprimer toutes vos données et réinitialiser l'application ? Cette action est irréversible.", "Are you sure you want to delete all your data and reset the app? This action cannot be undone."),
        [
          { text: getTranslated("Annuler", "Cancel"), style: "cancel" },
          { 
            text: getTranslated("Réinitialiser", "Reset"), 
            style: "destructive", 
            onPress: async () => {
              await AsyncStorage.removeItem('@fintech_app_state');
              await AsyncStorage.removeItem('@user_profile');
              dispatch(logout());
              onClose();
            } 
          }
        ]
      );
    }
  };

  // Utilise currentLanguage (depuis Redux) pour que la modale se mette à jour instantanément
  const getTranslated = (fr: string, en: string) => currentLanguage === 'en' ? en : fr;

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
      paddingTop: Spacing.sm, paddingBottom: 40, maxHeight: '95%', height: '85%',
    },
    handle: {
      width: 44, height: 4, backgroundColor: colors.border,
      borderRadius: Radius.full, alignSelf: 'center', marginVertical: Spacing.sm,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: Spacing.md,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: colors.text },
    closeBtn: {
      width: 36, height: 36, borderRadius: Radius.full, backgroundColor: colors.surfaceLight,
      justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    scroll: { paddingHorizontal: Spacing.lg },

    avatarWrap: { alignSelf: 'center', marginBottom: Spacing.xl, position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surfaceLight },
    avatarBadge: {
      position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary,
      width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
      borderWidth: 3, borderColor: colors.surface,
    },

    inputWrap: {
      backgroundColor: colors.surfaceLight, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center',
    },
    input: { flex: 1, paddingVertical: 14, color: colors.text, fontSize: Typography.base },
    inputIcon: { marginRight: 10 },

    menuItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuTitle: { fontSize: Typography.base, fontWeight: Typography.semiBold, color: colors.text },
    menuSub: { fontSize: Typography.sm, color: colors.textMuted, marginTop: 2 },

    saveBtn: {
      backgroundColor: colors.primary, paddingVertical: 16, borderRadius: Radius.lg,
      alignItems: 'center', marginTop: Spacing.xl, ...Shadows.primary(colors.primary),
    },
    saveBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },

    aboutBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    aboutTitle: { fontSize: Typography.lg, fontWeight: 'bold', color: colors.text },
    aboutDesc: { fontSize: Typography.base, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  });

  const renderProfile = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.avatarWrap}>
        <Image
          source={{ uri: avatarUri || `https://api.dicebear.com/7.x/avataaars/png?seed=${avatarSeed}&backgroundColor=E6F4FE` }}
          style={s.avatar}
        />
        <Pressable style={s.avatarBadge} onPress={handlePickImage}>
          <MaterialCommunityIcons name="camera" size={16} color="#fff" />
        </Pressable>
      </View>

      <View style={s.inputWrap}>
        <MaterialCommunityIcons name="account-outline" size={20} color={colors.textSubtle} style={s.inputIcon} />
        <TextInput style={s.input} placeholder={getTranslated("Prénom", "First Name")} placeholderTextColor={colors.textSubtle} value={firstName} onChangeText={setFirstName} />
      </View>
      <View style={s.inputWrap}>
        <MaterialCommunityIcons name="account-outline" size={20} color={colors.textSubtle} style={s.inputIcon} />
        <TextInput style={s.input} placeholder={getTranslated("Nom", "Last Name")} placeholderTextColor={colors.textSubtle} value={lastName} onChangeText={setLastName} />
      </View>
      <View style={s.inputWrap}>
        <MaterialCommunityIcons name="phone-outline" size={20} color={colors.textSubtle} style={s.inputIcon} />
        <TextInput style={s.input} placeholder={getTranslated("Téléphone (Optionnel)", "Phone (Optional)")} placeholderTextColor={colors.textSubtle} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>

      <Pressable style={s.menuItem} onPress={() => setActiveTab('settings')}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="cog" size={24} color={colors.primary} />
          <View>
            <Text style={s.menuTitle}>{getTranslated("Paramètres", "Settings")}</Text>
            <Text style={s.menuSub}>{getTranslated("Sécurité, Notifications, Langue...", "Security, Notifications, Language...")}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable style={s.saveBtn} onPress={handleSave}>
        <Text style={s.saveBtnText}>{getTranslated("Enregistrer le profil", "Save Profile")}</Text>
      </Pressable>
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      <Pressable style={s.menuItem} onPress={() => setActiveTab('security')}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="shield-lock" size={24} color={colors.primary} />
          <View>
            <Text style={s.menuTitle}>{getTranslated("Sécurité et Verrouillage", "Security and Lock")}</Text>
            <Text style={s.menuSub}>{securityMode !== 'none' ? getTranslated("Activé", "Enabled") : getTranslated("Désactivé", "Disabled")}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable style={s.menuItem} onPress={() => setActiveTab('notifications')}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="bell-ring" size={24} color={colors.primary} />
          <View>
            <Text style={s.menuTitle}>{getTranslated("Notifications", "Notifications")}</Text>
            <Text style={s.menuSub}>{notificationsEnabled ? getTranslated("Activées", "Enabled") : getTranslated("Désactivées", "Disabled")}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable style={s.menuItem} onPress={() => setActiveTab('theme')}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="palette-outline" size={24} color={colors.primary} />
          <View>
            <Text style={s.menuTitle}>{getTranslated("Apparence et Thème", "Appearance & Theme")}</Text>
            <Text style={s.menuSub}>
              {themePreference === 'light' ? getTranslated("Clair (Blanc)", "Light (White)") : themePreference === 'dark' ? getTranslated("Sombre (Noir)", "Dark (Black)") : getTranslated("Système", "System")}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable style={s.menuItem} onPress={() => setActiveTab('language')}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="translate" size={24} color={colors.primary} />
          <View>
            <Text style={s.menuTitle}>{getTranslated("Langue", "Language")}</Text>
            <Text style={s.menuSub}>{language === 'fr' ? 'Français' : 'English'}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable style={s.menuItem} onPress={() => setActiveTab('currency')}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="cash" size={24} color={colors.primary} />
          <View>
            <Text style={s.menuTitle}>{getTranslated("Monnaie", "Currency")}</Text>
            <Text style={s.menuSub}>{currency}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      {Platform.OS === 'android' && (
        <Pressable style={s.menuItem} onPress={() => setActiveTab('download')}>
          <View style={s.menuItemLeft}>
            <MaterialCommunityIcons name="folder-download" size={24} color={colors.primary} />
            <View>
              <Text style={s.menuTitle}>{getTranslated("Dossier de téléchargement", "Download Folder")}</Text>
              <Text style={s.menuSub} numberOfLines={1}>{exportDirUri ? exportDirUri.split('%3A').pop() : getTranslated("Non défini", "Not set")}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </Pressable>
      )}

      <Pressable style={s.menuItem} onPress={() => setActiveTab('about')}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="information" size={24} color={colors.primary} />
          <View>
            <Text style={s.menuTitle}>{getTranslated("À propos de nous", "About us")}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable style={s.menuItem} onPress={handleLogout}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="lock-outline" size={24} color={colors.primary} />
          <View>
            <Text style={[s.menuTitle, { color: colors.primary }]}>{getTranslated("Verrouiller la session", "Lock session")}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable style={s.menuItem} onPress={handleResetAccount}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="delete-forever" size={24} color={colors.danger} />
          <View>
            <Text style={[s.menuTitle, { color: colors.danger }]}>{getTranslated("Réinitialiser le compte", "Reset account")}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );

  const renderSecurity = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      {['none', 'pin', 'password'].map((mode) => (
        <Pressable key={mode} style={s.menuItem} onPress={() => handleSecurityModeChange(mode as any)}>
          <View style={s.menuItemLeft}>
            <MaterialCommunityIcons 
              name={mode === 'none' ? 'lock-open' : mode === 'pin' ? 'dialpad' : 'form-textbox-password'} 
              size={24} color={colors.text} 
            />
            <Text style={s.menuTitle}>
              {mode === 'none' ? getTranslated("Aucun", "None") : mode === 'pin' ? 'Code PIN (4 chiffres)' : 'Mot de passe'}
            </Text>
          </View>
          {securityMode === mode && <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />}
        </Pressable>
      ))}
      
      {availableBiometrics.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) && (
        <Pressable style={s.menuItem} onPress={() => handleSecurityModeChange('fingerprint')}>
          <View style={s.menuItemLeft}>
            <MaterialCommunityIcons name="fingerprint" size={24} color={colors.text} />
            <Text style={s.menuTitle}>{getTranslated("Empreinte Digitale", "Fingerprint")}</Text>
          </View>
          {securityMode === 'fingerprint' && <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />}
        </Pressable>
      )}

      {availableBiometrics.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) && (
        <Pressable style={s.menuItem} onPress={() => handleSecurityModeChange('face')}>
          <View style={s.menuItemLeft}>
            <MaterialCommunityIcons name="face-recognition" size={24} color={colors.text} />
            <Text style={s.menuTitle}>Face ID</Text>
          </View>
          {securityMode === 'face' && <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />}
        </Pressable>
      )}
    </ScrollView>
  );

  const renderNotifications = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.menuItem}>
        <View style={{ flex: 1 }}>
          <Text style={s.menuTitle}>{getTranslated("Rappel Quotidien", "Daily Reminder")}</Text>
          <Text style={s.menuSub}>{getTranslated("Recevoir une notification pour enregistrer vos dépenses.", "Receive a notification to record your expenses.")}</Text>
        </View>
        <Switch
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={notificationsEnabled ? colors.primary : colors.textSubtle}
          onValueChange={handleToggleNotifications}
          value={notificationsEnabled}
        />
      </View>

      {notificationsEnabled && (
        <View style={s.menuItem}>
          <View style={{ flex: 1 }}>
            <Text style={s.menuTitle}>{getTranslated("Heure du rappel", "Reminder Time")}</Text>
          </View>
          {Platform.OS === 'android' ? (
            <Pressable
              style={{ backgroundColor: `${colors.primary}20`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {notificationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Pressable>
          ) : (
            <DateTimePicker value={notificationTime} mode="time" display="default" onChange={handleTimeChange} style={{ width: 90 }} />
          )}
        </View>
      )}

      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker value={notificationTime} mode="time" display="default" onChange={handleTimeChange} />
      )}
    </ScrollView>
  );

  const renderLanguage = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      {[
        { id: 'fr', label: 'Français' },
        { id: 'en', label: 'English' }
      ].map(lang => (
        <Pressable key={lang.id} style={s.menuItem} onPress={() => {
          setLanguage(lang.id);
          // Dispatch immédiat vers Redux pour que tout le projet se mette à jour
          dispatch(updateProfile({ language: lang.id }));
        }}>
          <Text style={s.menuTitle}>{lang.label}</Text>
          {currentLanguage === lang.id && <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />}
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderTheme = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      {[
        { id: 'system', label: getTranslated('Thème du système', 'System Default') },
        { id: 'light', label: getTranslated('Clair (Blanc)', 'Light (White)') },
        { id: 'dark', label: getTranslated('Sombre (Noir)', 'Dark (Black)') }
      ].map(t => (
        <Pressable key={t.id} style={s.menuItem} onPress={() => { 
          setThemePreference(t.id as any); 
          handleInstantSave({ themePreference: t.id as any }); 
        }}>
          <Text style={s.menuTitle}>{t.label}</Text>
          {themePreference === t.id && <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />}
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderCurrency = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      {[
        { id: 'GNF', label: 'Franc Guinéen (GNF)' },
        { id: 'USD', label: 'US Dollar (USD)' },
        { id: 'EUR', label: 'Euro (EUR)' },
        { id: 'XOF', label: 'Franc CFA (XOF)' },
        { id: 'CAD', label: 'Canadian Dollar (CAD)' },
        { id: 'GBP', label: 'British Pound (GBP)' },
      ].map(c => (
        <Pressable key={c.id} style={s.menuItem} onPress={() => { 
          setCurrency(c.id); 
          handleInstantSave({ currency: c.id }); 
        }}>
          <Text style={s.menuTitle}>{c.label}</Text>
          {currency === c.id && <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />}
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderDownload = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={{ paddingVertical: 20 }}>
        <Text style={[s.menuSub, { fontSize: 15, lineHeight: 22, marginBottom: 20 }]}>
          {getTranslated(
            "Choisissez un dossier par défaut pour enregistrer vos fichiers CSV d'exportation. Cela évite de devoir choisir l'emplacement à chaque fois.",
            "Choose a default folder to save your CSV export files. This avoids having to choose the location every time."
          )}
        </Text>
        
        <View style={[s.inputWrap, { paddingVertical: 14 }]}>
          <MaterialCommunityIcons name="folder-outline" size={20} color={colors.primary} style={s.inputIcon} />
          <Text style={{ flex: 1, color: exportDirUri ? colors.text : colors.textSubtle }}>
            {exportDirUri ? exportDirUri.split('%3A').pop() : getTranslated("Aucun dossier sélectionné", "No folder selected")}
          </Text>
        </View>

        <Pressable style={s.saveBtn} onPress={handlePickDirectory}>
          <Text style={s.saveBtnText}>{getTranslated("Sélectionner un dossier", "Select a folder")}</Text>
        </Pressable>

        {exportDirUri && (
          <Pressable style={[s.saveBtn, { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, marginTop: 12 }]} onPress={() => setExportDirUri(null)}>
            <Text style={[s.saveBtnText, { color: colors.danger }]}>{getTranslated("Effacer le dossier par défaut", "Clear default folder")}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );

  const renderAbout = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.aboutBox}>
        <MaterialCommunityIcons name="finance" size={64} color={colors.primary} />
        <Text style={s.aboutTitle}>FinTech Guinée</Text>
        <Text style={s.aboutDesc}>
          {getTranslated(
            "Votre compagnon idéal pour la gestion de vos finances, développé avec passion pour simplifier votre vie budgétaire au quotidien.",
            "Your ideal companion for managing your finances, developed with passion to simplify your daily budget life."
          )}
        </Text>
        <Text style={[s.menuSub, { marginTop: 20 }]}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );

  const getTitle = () => {
    switch (activeTab) {
      case 'profile': return getTranslated('Profil', 'Profile');
      case 'settings': return getTranslated('Paramètres', 'Settings');
      case 'security': return getTranslated('Sécurité', 'Security');
      case 'notifications': return getTranslated('Notifications', 'Notifications');
      case 'language': return getTranslated('Langue', 'Language');
      case 'theme': return getTranslated('Apparence', 'Appearance');
      case 'currency': return getTranslated('Monnaie', 'Currency');
      case 'download': return getTranslated('Téléchargements', 'Downloads');
      case 'about': return getTranslated('À propos', 'About');
    }
  };

  const handleBack = () => {
    if (activeTab === 'profile') onClose();
    else if (activeTab === 'settings') setActiveTab('profile');
    else setActiveTab('settings');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleBack}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.header}>
              <View style={s.headerLeft}>
                {activeTab !== 'profile' && (
                  <Pressable onPress={handleBack} hitSlop={10}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                  </Pressable>
                )}
                <Text style={s.title}>{getTitle()}</Text>
              </View>
              {activeTab === 'profile' && (
                <Pressable style={s.closeBtn} onPress={handleBack}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'security' && renderSecurity()}
            {activeTab === 'notifications' && renderNotifications()}
            {activeTab === 'language' && renderLanguage()}
            {activeTab === 'theme' && renderTheme()}
            {activeTab === 'currency' && renderCurrency()}
            {activeTab === 'download' && renderDownload()}
            {activeTab === 'about' && renderAbout()}

            <PinSetupModal visible={showPinSetup} onClose={() => setShowPinSetup(false)} currentPin={user.customPin} onSuccess={(pin) => { setCustomPin(pin); setSecurityMode('pin'); setBiometricEnabled(false); setCustomPassword(null); handleInstantSave({ customPin: pin, securityMode: 'pin', biometricEnabled: false, customPassword: null, appLockEnabled: true }); setShowPinSetup(false); }} />
            <PasswordSetupModal visible={showPasswordSetup} onClose={() => setShowPasswordSetup(false)} currentPassword={user.customPassword} onSuccess={(pass) => { setCustomPassword(pass); setSecurityMode('password'); setBiometricEnabled(false); setCustomPin(null); handleInstantSave({ customPassword: pass, securityMode: 'password', biometricEnabled: false, customPin: null, appLockEnabled: true }); setShowPasswordSetup(false); }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
