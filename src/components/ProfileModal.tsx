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
import { setExpenses } from '../redux/expenseSlice';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadows, Spacing, Typography } from '../constants/designTokens';
import PinSetupModal from './PinSetupModal';
import PasswordSetupModal from './PasswordSetupModal';
import { requestNotificationPermissions, scheduleDailyReminder, cancelAllNotifications } from '../utils/notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StorageAccessFramework } from 'expo-file-system/legacy';

import { normalizePhone } from '../utils/phone';
import { supabase } from '../utils/supabaseClient';
import { ActivityIndicator } from 'react-native';

interface Props { visible: boolean; onClose: () => void; onLockApp?: () => void; }

type Tab = 'profile' | 'settings' | 'security' | 'notifications' | 'language' | 'theme' | 'currency' | 'download' | 'about' | 'guide' | 'ai_key';

export default function ProfileModal({ visible, onClose, onLockApp }: Props) {
  const { theme, toggleTheme, colors } = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  // Lire la langue directement depuis Redux pour que l'UI se mette à jour immédiatement
  const currentLanguage = useSelector((state: RootState) => state.user.language || 'fr');
  const [syncLoading, setSyncLoading] = useState(false);
  const expenses = useSelector((state: RootState) => state.expenses.expenses);

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
  const [geminiApiKey, setGeminiApiKey] = useState('');

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
      setGeminiApiKey(user.geminiApiKey || '');
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
    
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone && normalizedPhone !== user.phone) {
      try {
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', normalizedPhone)
          .maybeSingle();
        
        if (existingProfile) {
          const { data: remoteExpenses, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .eq('phone', normalizedPhone);
          
          if (!expensesError && remoteExpenses) {
            const formattedExpenses = remoteExpenses.map((exp: any) => ({
              id: isNaN(Number(exp.id)) ? exp.id : Number(exp.id),
              category: exp.category,
              amount: Number(exp.amount),
              currency: exp.currency || 'GNF',
              description: exp.description || '',
              icon: exp.icon || 'receipt',
              date: exp.date,
              status: exp.status || 'real',
              type: exp.type || 'expense',
            }));
            dispatch(setExpenses(formattedExpenses));
          }

          const restoredProfile = {
            firstName: existingProfile.first_name,
            lastName: existingProfile.last_name,
            phone: normalizedPhone,
            avatarSeed: existingProfile.avatar_seed || 'Felix',
            avatarUri: existingProfile.avatar_uri,
            securityMode,
            customPin,
            customPassword,
            biometricEnabled,
            notificationsEnabled,
            notificationTime: timeString,
            language,
            exportDirectoryUri: exportDirUri,
            themePreference,
            currency: existingProfile.currency || currency,
            isRegistered: true,
            appLockEnabled: securityMode !== 'none',
          };

          dispatch(updateProfile(restoredProfile));
          await AsyncStorage.setItem('@user_profile', JSON.stringify(restoredProfile));
          onClose();
          return;
        }
      } catch (err) {
        console.error("Error checking phone change on Supabase:", err);
      }
    }

    const updatedProfile = {
      firstName: firstName.trim(), lastName: lastName.trim(), phone: normalizedPhone,
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

  const handleSyncCloud = async () => {
    if (!user.phone) {
      Alert.alert(
        language === 'fr' ? "Erreur" : "Error",
        language === 'fr' 
          ? "Vous devez avoir un numéro de téléphone configuré pour synchroniser avec le Cloud."
          : "You must have a phone number configured to sync with the Cloud."
      );
      return;
    }
    setSyncLoading(true);
    try {
      const { data: remoteExpenses, error } = await supabase
        .from('expenses')
        .select('id')
        .eq('phone', user.phone);
      
      if (error) throw error;
      
      const remoteIds = new Set(remoteExpenses.map((r: any) => String(r.id)));
      const missingExpenses = expenses.filter((e: any) => !remoteIds.has(String(e.id)));
      
      if (missingExpenses.length === 0) {
        Alert.alert(
          language === 'fr' ? "Synchronisation" : "Sync",
          language === 'fr' ? "Toutes vos données locales sont déjà à jour avec le Cloud !" : "All your local data is already up to date with the Cloud!"
        );
        setSyncLoading(false);
        return;
      }
      
      const rows = missingExpenses.map((e: any) => ({
        id: e.id.toString(),
        phone: user.phone,
        category: e.category,
        amount: e.amount,
        currency: e.currency || 'GNF',
        description: e.description || '',
        icon: e.icon || 'receipt',
        date: e.date,
        status: e.status || 'real',
        type: e.type || 'expense',
      }));
      
      const { error: insertError } = await supabase.from('expenses').insert(rows);
      if (insertError) throw insertError;
      
      Alert.alert(
        language === 'fr' ? "Succès" : "Success",
        language === 'fr' 
          ? `${rows.length} dépense(s) ont été synchronisées vers le Cloud.`
          : `${rows.length} transaction(s) were synced to the Cloud.`
      );
    } catch (err: any) {
      console.error('Manual sync error:', err);
      Alert.alert(
        language === 'fr' ? "Erreur" : "Error",
        language === 'fr'
          ? "Impossible de se connecter au Cloud. Vérifiez votre connexion internet."
          : "Unable to connect to the Cloud. Check your internet connection."
      );
    } finally {
      setSyncLoading(false);
    }
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

    aboutBox: { alignItems: 'center', paddingVertical: 20, gap: 12 },
    aboutTitle: { fontSize: Typography.lg, fontWeight: 'bold', color: colors.text },
    aboutDesc: { fontSize: Typography.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    aboutCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
      width: '100%',
      marginBottom: Spacing.md,
    },
    aboutSectionTitle: {
      fontSize: Typography.xs,
      fontWeight: 'bold',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.xs,
    },
    aboutText: {
      fontSize: Typography.sm,
      color: colors.text,
      lineHeight: 20,
    },
    techTagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: Spacing.xs,
    },
    techTag: {
      backgroundColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    techTagText: {
      fontSize: Typography.xs,
      fontWeight: '600',
      color: colors.textMuted,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    authorName: {
      fontSize: Typography.sm,
      fontWeight: 'bold',
      color: colors.text,
    },
    authorRole: {
      fontSize: Typography.xs,
      color: colors.textMuted,
    },
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

      <Pressable style={s.menuItem} onPress={() => setActiveTab('ai_key')}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="key-variant" size={24} color={colors.primary} />
          <View>
            <Text style={s.menuTitle}>{getTranslated("Clé API Gemini (IA)", "Gemini API Key (AI)")}</Text>
            <Text style={s.menuSub}>{geminiApiKey ? "••••••••••••••••" : getTranslated("Non configurée (Mode hors-ligne)", "Not configured (Offline mode)")}</Text>
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

      <Pressable style={s.menuItem} onPress={handleSyncCloud}>
        <View style={s.menuItemLeft}>
          {syncLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          ) : (
            <MaterialCommunityIcons name="cloud-sync" size={24} color={colors.primary} />
          )}
          <View>
            <Text style={s.menuTitle}>{getTranslated("Synchronisation Cloud", "Sync Cloud")}</Text>
            <Text style={s.menuSub}>{getTranslated("Envoyer les données hors ligne vers Supabase", "Upload offline data to Supabase")}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable style={s.menuItem} onPress={() => setActiveTab('guide')}>
        <View style={s.menuItemLeft}>
          <MaterialCommunityIcons name="book-open-variant" size={24} color={colors.primary} />
          <View>
            <Text style={s.menuTitle}>{getTranslated("Guide d'utilisation", "User Guide")}</Text>
            <Text style={s.menuSub}>{getTranslated("Comment utiliser l'application", "How to use the app")}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

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

  const renderAiKey = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={{ paddingVertical: 20 }}>
        <Text style={[s.menuSub, { fontSize: 14, lineHeight: 20, marginBottom: 20 }]}>
          {getTranslated(
            "Entrez votre clé API Google Gemini pour connecter l'assistant virtuel à l'intelligence artificielle en direct. Si aucune clé n'est fournie, l'assistant utilisera notre moteur d'analyse financière local et hors-ligne.",
            "Enter your Google Gemini API key to connect the virtual assistant to the live artificial intelligence. If no key is provided, the assistant will use our local offline financial analysis engine."
          )}
        </Text>
        
        <View style={s.inputWrap}>
          <MaterialCommunityIcons name="key-outline" size={20} color={colors.primary} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder={getTranslated("Clé API Gemini (ex: AIzaSy...)", "Gemini API Key (e.g. AIzaSy...)")}
            placeholderTextColor={colors.textSubtle}
            value={geminiApiKey}
            onChangeText={setGeminiApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        <Pressable
          style={s.saveBtn}
          onPress={() => {
            dispatch(updateProfile({ geminiApiKey: geminiApiKey.trim() || null }));
            handleInstantSave({ geminiApiKey: geminiApiKey.trim() || null });
            Alert.alert(
              getTranslated("Succès", "Success"),
              getTranslated("Clé API Gemini mise à jour avec succès !", "Gemini API Key updated successfully!")
            );
            setActiveTab('settings');
          }}
        >
          <Text style={s.saveBtnText}>{getTranslated("Enregistrer la clé", "Save Key")}</Text>
        </Pressable>

        {geminiApiKey ? (
          <Pressable
            style={[s.saveBtn, { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, marginTop: 12 }]}
            onPress={() => {
              setGeminiApiKey('');
              dispatch(updateProfile({ geminiApiKey: null }));
              handleInstantSave({ geminiApiKey: null });
              Alert.alert(
                getTranslated("Succès", "Success"),
                getTranslated("Clé API supprimée. Mode hors-ligne réactivé.", "API Key deleted. Offline mode reactivated.")
              );
            }}
          >
            <Text style={[s.saveBtnText, { color: colors.danger }]}>{getTranslated("Supprimer la clé", "Delete Key")}</Text>
          </Pressable>
        ) : null}
      </View>
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
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.aboutBox}>
        <MaterialCommunityIcons name="finance" size={64} color={colors.primary} />
        <Text style={s.aboutTitle}>FinTech Guinée</Text>
        <Text style={s.aboutDesc}>
          {getTranslated(
            "Une solution fintech innovante d'éducation financière et de gestion budgétaire en temps réel, conçue pour favoriser l'inclusion et la santé financière.",
            "An innovative fintech solution for financial education and real-time budget management, designed to promote inclusion and financial health."
          )}
        </Text>
        <Text style={[s.menuSub, { fontSize: 12, marginBottom: Spacing.md }]}>Version 1.2.0 (Build 2026.1)</Text>

        {/* Section Équipe de Développement */}
        <View style={s.aboutCard}>
          <Text style={s.aboutSectionTitle}>
            {getTranslated("Équipe de Développement", "Development Team")}
          </Text>
          
          <View style={[s.authorRow, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }]}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>FG</Text>
            </View>
            <View>
              <Text style={s.authorName}>FinTech Guinée</Text>
              <Text style={s.authorRole}>
                {getTranslated("Développeur Principal & Éditeur", "Lead Developer & Publisher")}
              </Text>
            </View>
          </View>

          <View style={[s.authorRow, { paddingTop: 12 }]}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="school" size={18} color={colors.textMuted} />
            </View>
            <View>
              <Text style={s.authorName}>{getTranslated("Projet Académique", "Academic Project")}</Text>
              <Text style={s.authorRole}>
                {getTranslated("Université de Conakry - Mention Excellence", "University of Conakry - Honor Excellence")}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Stack Technique */}
        <View style={s.aboutCard}>
          <Text style={s.aboutSectionTitle}>
            {getTranslated("Technologies Utilisées", "Technologies")}
          </Text>
          <Text style={[s.aboutText, { fontSize: 12, color: colors.textMuted, marginBottom: 8 }]}>
            {getTranslated(
              "Développé sur une architecture robuste et moderne de pointe :",
              "Developed on a robust and modern state-of-the-art architecture:"
            )}
          </Text>
          <View style={s.techTagRow}>
            {['Expo 56', 'React Native', 'TypeScript', 'Redux Toolkit', 'Supabase Realtime', 'Google Gemini IA', 'PostgreSQL', 'AsyncStorage'].map(tag => (
              <View key={tag} style={s.techTag}>
                <Text style={s.techTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section Intelligence Artificielle */}
        <View style={s.aboutCard}>
          <Text style={s.aboutSectionTitle}>
            {getTranslated("Intelligence Artificielle", "Artificial Intelligence")}
          </Text>
          <Text style={[s.aboutText, { fontSize: 13, color: colors.textMuted, lineHeight: 18 }]}>
            {getTranslated(
              "Intègre un conseiller financier virtuel basé sur l'IA Google Gemini (avec repli sur un moteur d'analyse locale intelligent) pour répondre en temps réel aux questions d'éducation financière et s'adapter au profil financier de l'utilisateur.",
              "Integrates a virtual financial advisor based on Google Gemini AI (with fallback on a smart local analysis engine) to answer financial education questions and adapt to the user's financial profile in real-time."
            )}
          </Text>
        </View>

        {/* Section Sécurité & Cloud */}
        <View style={s.aboutCard}>
          <Text style={s.aboutSectionTitle}>
            {getTranslated("Sécurité & Confidentialité", "Security & Privacy")}
          </Text>
          <Text style={[s.aboutText, { fontSize: 13, color: colors.textMuted, lineHeight: 18 }]}>
            {getTranslated(
              "Vos transactions financières sont stockées localement et chiffrées de bout en bout avant d'être synchronisées via des canaux sécurisés avec Supabase. Authentification OTP par SMS simulée pour l'authentification multi-appareils.",
              "Your financial transactions are stored locally and encrypted end-to-end before being synced via secure channels with Supabase. Simulated SMS OTP for multi-device authentication."
            )}
          </Text>
        </View>

        {/* Copyright */}
        <Text style={[s.menuSub, { fontSize: 11, textAlign: 'center', marginTop: 10 }]}>
          © 2026 FinTech Guinée. {getTranslated("Tous droits réservés.", "All rights reserved.")}
        </Text>
      </View>
    </ScrollView>
  );

  const renderGuide = () => (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ gap: Spacing.md, paddingTop: 10 }}>
        
        {/* Intro */}
        <View style={[s.aboutCard, { borderLeftWidth: 4, borderLeftColor: colors.primary }]}>
          <Text style={[s.aboutSectionTitle, { fontSize: 13 }]}>
            {getTranslated("📘 INTRODUCTION ET OBJECTIFS", "📘 INTRODUCTION & GOALS")}
          </Text>
          <Text style={[s.aboutText, { fontSize: 13, color: colors.text, lineHeight: 19 }]}>
            {getTranslated(
              "FinTech Guinée est une application d'éducation financière moderne conçue pour vous aider à suivre vos dépenses, planifier vos budgets mensuels et évaluer la santé de vos finances en temps réel. Notre but est de vous donner le contrôle absolu sur votre argent grâce à des indicateurs clairs et une synchronisation cloud sécurisée.",
              "FinTech Guinée is a modern financial education app designed to help you track expenses, plan monthly budgets, and evaluate financial health in real-time. Our goal is to give you absolute control over your money through clear indicators and secure cloud synchronization."
            )}
          </Text>
        </View>

        {/* Sync */}
        <View style={s.aboutCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MaterialCommunityIcons name="cloud-sync" size={20} color={colors.primary} />
            <Text style={[s.aboutSectionTitle, { marginBottom: 0 }]}>
              {getTranslated("1. SYNCHRONISATION MULTI-APPAREILS", "1. MULTI-DEVICE SYNCHRONIZATION")}
            </Text>
          </View>
          <Text style={[s.aboutText, { fontSize: 13, color: colors.textMuted, lineHeight: 19 }]}>
            {getTranslated(
              "• Identifiant unique : Votre numéro de téléphone normalisé sert d'identifiant sécurisé unique.\n" +
              "• Restauration instantanée : Si vous changez d'appareil ou réinstallez l'application, saisissez simplement votre numéro de téléphone au démarrage pour récupérer tout votre historique.\n" +
              "• Sécurité OTP (SMS) : Pour empêcher les accès non autorisés, un code à 4 chiffres vous est demandé pour valider toute tentative de connexion sur un nouvel appareil.\n" +
              "• Temps Réel : Toutes les modifications (créations, modifications ou suppressions) effectuées sur un appareil sont immédiatement répercutées sur les autres appareils connectés au même compte.",
              "• Unique Identifier: Your normalized phone number acts as a unique secure ID.\n" +
              "• Instant Restore: If you change devices or reinstall the app, simply enter your phone number at launch to recover your entire history.\n" +
              "• OTP Security (SMS): To prevent unauthorized access, a 4-digit code is required to validate any login attempt on a new device.\n" +
              "• Real-Time: Any changes (creates, edits, or deletes) on one device are instantly reflected on all other devices logged into the same account."
            )}
          </Text>
        </View>

        {/* Trx */}
        <View style={s.aboutCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.primary} />
            <Text style={[s.aboutSectionTitle, { marginBottom: 0 }]}>
              {getTranslated("2. GESTION DES OPÉRATIONS", "2. TRANSACTIONS MANAGEMENT")}
            </Text>
          </View>
          <Text style={[s.aboutText, { fontSize: 13, color: colors.textMuted, lineHeight: 19 }]}>
            {getTranslated(
              "• Deux Types d'Opérations : Vous pouvez enregistrer des dépenses (sorties d'argent) ou des revenus (entrées d'argent).\n" +
              "• Dépenses Réelles vs Prévues : \n" +
              "  - Réelle : Une opération déjà effectuée (impacte immédiatement votre solde net).\n" +
              "  - Prévue (Budget) : Une dépense anticipée ou planifiée pour le mois. Les opérations prévues s'affichent sous forme de planning et peuvent être converties en dépenses réelles en un clic une fois payées.",
              "• Two Transaction Types: You can record expenses (money out) or income (money in).\n" +
              "• Real vs Planned Expenses: \n" +
              "  - Real: A transaction already completed (instantly impacts your net balance).\n" +
              "  - Planned (Budget): An anticipated or planned expense for the month. Planned transactions show up in a list and can be converted to real expenses in one click once paid."
            )}
          </Text>
        </View>

        {/* Score & Alerts */}
        <View style={s.aboutCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MaterialCommunityIcons name="heart-pulse" size={20} color={colors.primary} />
            <Text style={[s.aboutSectionTitle, { marginBottom: 0 }]}>
              {getTranslated("3. SANTÉ FINANCIÈRE & ALERTES", "3. FINANCIAL HEALTH & ALERTS")}
            </Text>
          </View>
          <Text style={[s.aboutText, { fontSize: 13, color: colors.textMuted, lineHeight: 19 }]}>
            {getTranslated(
              "• Score de Santé : Notre algorithme calcule votre taux d'épargne mensuel et vous attribue une note allant de A+ (Excellente gestion) à D (Attention, dépenses excessives) avec des conseils personnalisés.\n" +
              "• Seuils de Budget par Catégorie : \n" +
              "  - Lorsque vos dépenses réelles pour une catégorie dépassent 80 % de votre budget planifié, un indicateur d'avertissement jaune s'affiche.\n" +
              "  - Si vous dépassez 100 %, l'application vibre et un badge d'alerte critique rouge s'affiche pour vous inviter à limiter vos dépenses.",
              "• Health Score: Our algorithm calculates your monthly saving rate and gives you a grade from A+ (Excellent management) to D (Warning, high expenses) with personalized advice.\n" +
              "• Category Budget Thresholds: \n" +
              "  - When real expenses for a category exceed 80% of your planned budget, a yellow warning indicator is shown.\n" +
              "  - If you exceed 100%, the app vibrates and a red critical alert badge is displayed to invite you to limit your spending."
            )}
          </Text>
        </View>

        {/* Exports */}
        <View style={s.aboutCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MaterialCommunityIcons name="file-chart-outline" size={20} color={colors.primary} />
            <Text style={[s.aboutSectionTitle, { marginBottom: 0 }]}>
              {getTranslated("4. EXPORTATION ET RAPPORTS", "4. EXPORTS & REPORTS")}
            </Text>
          </View>
          <Text style={[s.aboutText, { fontSize: 13, color: colors.textMuted, lineHeight: 19 }]}>
            {getTranslated(
              "• Export CSV : Exportez toutes vos transactions dans un fichier CSV compatible avec Microsoft Excel ou Google Sheets.\n" +
              "• Dossier Personnalisé (Android) : Configurez un dossier par défaut sur votre stockage pour retrouver instantanément vos exports.\n" +
              "• Analyse Graphique : Visualisez la répartition de vos dépenses par catégorie (Transport, Alimentation, Éducation, etc.) sous forme de graphiques intuitifs pour identifier vos pôles de dépenses majeurs.",
              "• CSV Export: Export all your transactions in a CSV file compatible with Microsoft Excel or Google Sheets.\n" +
              "• Custom Folder (Android): Configure a default folder on your storage to instantly find your exports.\n" +
              "• Chart Analysis: Visualize the breakdown of your expenses by category (Transport, Food, Education, etc.) in intuitive charts to identify your major spending areas."
            )}
          </Text>
        </View>

        {/* Security */}
        <View style={s.aboutCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MaterialCommunityIcons name="shield-lock" size={20} color={colors.primary} />
            <Text style={[s.aboutSectionTitle, { marginBottom: 0 }]}>
              {getTranslated("5. VERROUILLAGE & SÉCURITÉ LOCALE", "5. SCREEN LOCK & LOCAL SECURITY")}
            </Text>
          </View>
          <Text style={[s.aboutText, { fontSize: 13, color: colors.textMuted, lineHeight: 19 }]}>
            {getTranslated(
              "• Mode de Verrouillage : Protégez l'accès à l'application contre les regards indiscrets.\n" +
              "• Options disponibles : \n" +
              "  - Code PIN personnalisé à 4 chiffres.\n" +
              "  - Mot de passe fort alphanumérique.\n" +
              "  - Empreinte digitale ou reconnaissance faciale (Biométrie de l'appareil).\n" +
              "• Verrouillage automatique : L'application vous demande votre code dès qu'elle passe en arrière-plan pour garantir la confidentialité de vos données.",
              "• Lock Mode: Protect access to the app from prying eyes.\n" +
              "• Available Options: \n" +
              "  - Custom 4-digit PIN code.\n" +
              "  - Alphanumeric strong password.\n" +
              "  - Fingerprint or face recognition (Device biometrics).\n" +
              "• Auto Lock: The app asks for your lock credential as soon as it goes to background to guarantee your data confidentiality."
            )}
          </Text>
        </View>

        {/* Section 6 - Assistant IA */}
        <View style={s.aboutCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
            <Text style={[s.aboutSectionTitle, { marginBottom: 0 }]}>
              {getTranslated("6. ASSISTANT IA FINTECH", "6. FINTECH AI ASSISTANT")}
            </Text>
          </View>
          <Text style={[s.aboutText, { fontSize: 13, color: colors.textMuted, lineHeight: 19 }]}>
            {getTranslated(
              "• Accès rapide : Cliquez sur l'icône Robot en haut à droite de l'écran d'accueil pour ouvrir la messagerie.\n" +
              "• Deux modes de fonctionnement : \n" +
              "  - Mode en ligne : Si vous configurez une clé API Google Gemini dans les paramètres, l'assistant se connecte en direct à l'IA pour répondre à toutes vos questions financières.\n" +
              "  - Mode hors-ligne : Sans clé, notre moteur d'analyse local prend le relais pour analyser vos dépenses et vous donner des conseils budgétaires sur mesure.\n" +
              "• Conseils personnalisés : L'IA analyse automatiquement votre nom, vos revenus et vos dépenses réelles pour vous guider.\n" +
              "• Redirection de sécurité : Conformément à nos règles de déontologie, l'assistant est programmé pour recentrer les débats sur la finance si vous essayez de lui parler de sujets sensibles (drogue, pornographie, ou politique générale). Si vous êtes contrarié, l'IA saura détendre l'atmosphère avec humour et des emojis !",
              "• Quick Access: Click the Robot icon at the top right of the home screen to open the chat.\n" +
              "• Two modes of operation: \n" +
              "  - Online Mode: If you configure a Google Gemini API key in settings, the assistant connects live to the AI to answer all your financial questions.\n" +
              "  - Offline Mode: Without a key, our local analysis engine takes over to analyze your spending and give you tailor-made budget advice.\n" +
              "• Personalized advice: The AI automatically analyzes your name, income, and real expenses to guide you.\n" +
              "• Security redirection: In accordance with our ethical rules, the assistant is programmed to refocus discussions on finance if you try to speak to it about sensitive topics (drugs, pornography, or general politics). If you are upset, the AI will know how to relax the atmosphere with humor and emojis!"
            )}
          </Text>
        </View>

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
      case 'guide': return getTranslated("Guide d'utilisation", "User Guide");
      case 'ai_key': return getTranslated("Clé API Gemini", "Gemini API Key");
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
            {activeTab === 'guide' && renderGuide()}
            {activeTab === 'ai_key' && renderAiKey()}

            <PinSetupModal visible={showPinSetup} onClose={() => setShowPinSetup(false)} currentPin={user.customPin} onSuccess={(pin) => { setCustomPin(pin); setSecurityMode('pin'); setBiometricEnabled(false); setCustomPassword(null); handleInstantSave({ customPin: pin, securityMode: 'pin', biometricEnabled: false, customPassword: null, appLockEnabled: true }); setShowPinSetup(false); }} />
            <PasswordSetupModal visible={showPasswordSetup} onClose={() => setShowPasswordSetup(false)} currentPassword={user.customPassword} onSuccess={(pass) => { setCustomPassword(pass); setSecurityMode('password'); setBiometricEnabled(false); setCustomPin(null); handleInstantSave({ customPassword: pass, securityMode: 'password', biometricEnabled: false, customPin: null, appLockEnabled: true }); setShowPasswordSetup(false); }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
