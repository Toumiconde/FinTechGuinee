import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Radius, Spacing, Typography } from '../constants/designTokens';
import { useTheme } from '../context/ThemeContext';
import { Conversation } from '../hooks/useAiConversations';

const AI_VERSION = '2.1.0';
const AI_BUILD   = 'FinTech Guinée IA';

const LANGUAGES = [
  { code: 'fr', label: 'Français ' },
  { code: 'en', label: 'English ' },
  { code: 'ar', label: 'العربية ' },
  { code: 'pt', label: 'Português ' },
  { code: 'es', label: 'Español ' },
  { code: 'de', label: 'Deutsch ' },
  { code: 'zh', label: '中文 ' },
  { code: 'wo', label: 'Wolof ' },
  { code: 'ff', label: 'Fulfulde ' },
  { code: 'sw', label: 'Kiswahili ' },
  { code: 'ha', label: 'Hausa ' },
  { code: 'yo', label: 'Yorùbá ' },
  { code: 'ig', label: 'Igbo ' },
  { code: 'am', label: 'አማርኛ ' },
  { code: 'ru', label: 'Русский ' },
  { code: 'tr', label: 'Türkçe ' },
  { code: 'it', label: 'Italiano ' },
  { code: 'nl', label: 'Nederlands ' },
  { code: 'ja', label: '日本語 ' },
  { code: 'ko', label: '한국어 ' },
];

const ACCENT_COLORS = [
  { name: 'Violet (défaut)', value: '#7C3AED' },
  { name: 'Bleu Océan',      value: '#0EA5E9' },
  { name: 'Vert Guinée',     value: '#16A34A' },
  { name: 'Or Royal',        value: '#D97706' },
  { name: 'Rose Vif',        value: '#EC4899' },
  { name: 'Rouge Feu',       value: '#DC2626' },
  { name: 'Cyan Électrique', value: '#06B6D4' },
  { name: 'Indigo',          value: '#4F46E5' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  archivedConversations: Conversation[];
  onRestoreConversation: (id: string, userId?: string) => void;
  onPermanentlyDelete: (id: string, userId?: string) => void;
  onClearArchive: () => void;
  selectedLang: string;
  onSelectLang: (code: string) => void;
  accentColor: string;
  onSelectAccent: (color: string) => void;
  userId?: string;
}

type Tab = 'apropos' | 'archives' | 'langue' | 'couleurs' | 'stockage';

export default function AiSettingsModal({
  visible, onClose,
  archivedConversations, onRestoreConversation, onPermanentlyDelete, onClearArchive,
  selectedLang, onSelectLang,
  accentColor, onSelectAccent,
  userId,
}: Props) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('apropos');

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'apropos',  icon: 'information-outline',   label: 'À propos' },
    { id: 'archives', icon: 'archive-outline',        label: 'Archives' },
    { id: 'langue',   icon: 'translate',              label: 'Langue' },
    { id: 'couleurs', icon: 'palette-outline',        label: 'Couleurs' },
    { id: 'stockage', icon: 'folder-outline',         label: 'Stockage' },
  ];

  const formatDate = (ts?: number) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      height: '90%',
    },
    handle: {
      width: 44, height: 4,
      backgroundColor: colors.border,
      borderRadius: Radius.full,
      alignSelf: 'center',
      marginVertical: Spacing.sm,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: colors.text },
    closeBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center', alignItems: 'center',
    },
    // Tab bar
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    tabItem: {
      flex: 1, paddingVertical: 10, alignItems: 'center', gap: 3,
    },
    tabLabel: { fontSize: 9, color: colors.textMuted },
    tabLabelActive: { fontSize: 9, fontWeight: 'bold' },
    content: { flex: 1, padding: Spacing.lg },

    // About card
    aboutCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      alignItems: 'center',
      marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: colors.border,
    },
    avatarCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: accentColor + '20',
      justifyContent: 'center', alignItems: 'center',
      marginBottom: Spacing.md,
    },
    aiName: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    aiVersion: { fontSize: Typography.sm, color: colors.textMuted, marginTop: 4 },
    infoRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    infoKey: { fontSize: Typography.sm, color: colors.textMuted },
    infoVal: { fontSize: Typography.sm, color: colors.text, fontWeight: '600' },

    // Archive
    archiveItem: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.surfaceLight,
      borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
      borderWidth: 1, borderColor: colors.border,
    },
    archiveTitle: { flex: 1, fontSize: Typography.sm, color: colors.text, fontWeight: '600' },
    archiveDate: { fontSize: 10, color: colors.textMuted },
    emptyArchive: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },

    // Language
    langItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: Spacing.sm + 2,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    langLabel: { fontSize: Typography.base, color: colors.text },

    // Colors
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
    colorSwatch: {
      width: 56, height: 56, borderRadius: Radius.md,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2,
    },
    colorName: { fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 4, width: 60 },

    // Storage
    storageCard: {
      backgroundColor: colors.surfaceLight, borderRadius: Radius.xl,
      padding: Spacing.lg, marginBottom: Spacing.md,
      borderWidth: 1, borderColor: colors.border, gap: Spacing.sm,
    },
    storageBar: {
      height: 8, backgroundColor: colors.border, borderRadius: 4,
      overflow: 'hidden', marginTop: Spacing.xs,
    },
    storageBarFill: {
      height: 8, borderRadius: 4,
    },
    dangerBtn: {
      backgroundColor: '#FEF2F2', borderRadius: Radius.md,
      paddingVertical: Spacing.md, alignItems: 'center',
      borderWidth: 1, borderColor: '#FCA5A5', marginTop: Spacing.sm,
    },
    dangerBtnText: { color: '#DC2626', fontWeight: 'bold', fontSize: Typography.sm },
    sectionTitle: { fontSize: Typography.lg, fontWeight: 'bold', color: colors.text, marginBottom: Spacing.md },
  });

  const renderApropos = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={s.aboutCard}>
        <View style={s.avatarCircle}>
          <MaterialCommunityIcons name="robot" size={44} color={accentColor} />
        </View>
        <Text style={s.aiName}>FinTech Guinée IA</Text>
        <Text style={s.aiVersion}>Version {AI_VERSION} • Build stable</Text>
      </View>

      {[
        ['Nom',            AI_BUILD],
        ['Version',        AI_VERSION],
        ['Modèle IA',      'Gemini 1.5 Flash + Moteur Local'],
        ['Langue par défaut', selectedLang.toUpperCase()],
        ['Langues supportées', '20 langues'],
        ['Fonctionnalités', 'Finance, Tontines, Livres, Exercices, Humour'],
        ['Documents',      'PDF, TXT, CSV, JSON, Images'],
        ['Développé par',  'FinTech Guinée'],
        ['Pays cible',     ' Guinée & Afrique de l\'Ouest'],
        ['Données',        'Stockage local + AsyncStorage'],
        ['Confidentialité','Aucune donnée transmise sans clé API'],
      ].map(([k, v]) => (
        <View key={k} style={s.infoRow}>
          <Text style={s.infoKey}>{k}</Text>
          <Text style={s.infoVal}>{v}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderArchives = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
        <Text style={s.sectionTitle}>Conversations archivées</Text>
        {archivedConversations.length > 0 && (
          <Pressable onPress={() => Alert.alert('Vider', 'Supprimer toutes les archives ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Vider', style: 'destructive', onPress: onClearArchive },
          ])}>
            <Text style={{ color: '#DC2626', fontSize: Typography.sm }}>Tout vider</Text>
          </Pressable>
        )}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {archivedConversations.length === 0 ? (
          <View style={s.emptyArchive}>
            <MaterialCommunityIcons name="archive-outline" size={56} color={colors.border} />
            <Text style={{ color: colors.textMuted, fontSize: Typography.sm, textAlign: 'center' }}>
              Aucune archive pour l'instant.{'\n'}Les conversations supprimées apparaîtront ici.
            </Text>
          </View>
        ) : (
          archivedConversations.map(conv => (
            <View key={conv.id} style={s.archiveItem}>
              <MaterialCommunityIcons name="chat-outline" size={20} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={s.archiveTitle} numberOfLines={1}>{conv.title}</Text>
                <Text style={s.archiveDate}>
                  {conv.messages.length} message(s) • Archivé le {formatDate(conv.archivedAt)}
                </Text>
              </View>
              <Pressable onPress={() => onRestoreConversation(conv.id, userId)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="restore" size={20} color={accentColor} />
              </Pressable>
              <Pressable onPress={() => Alert.alert('Supprimer', 'Supprimer définitivement ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => onPermanentlyDelete(conv.id, userId) },
              ])} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="delete-forever" size={20} color="#DC2626" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderLangue = () => (
    <View style={{ flex: 1 }}>
      <Text style={s.sectionTitle}>Langue de l'IA</Text>
      <Text style={{ color: colors.textMuted, fontSize: Typography.sm, marginBottom: Spacing.md }}>
        L'IA basculera automatiquement dans la langue choisie.
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {LANGUAGES.map(lang => (
          <Pressable key={lang.code} style={s.langItem} onPress={() => onSelectLang(lang.code)}>
            <Text style={s.langLabel}>{lang.label}</Text>
            {selectedLang === lang.code && (
              <MaterialCommunityIcons name="check-circle" size={22} color={accentColor} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderCouleurs = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={s.sectionTitle}>Couleur d'accentuation</Text>
      <Text style={{ color: colors.textMuted, fontSize: Typography.sm, marginBottom: Spacing.md }}>
        Personnalisez la couleur principale de votre assistant IA.
      </Text>
      <View style={s.colorGrid}>
        {ACCENT_COLORS.map(c => (
          <View key={c.value} style={{ alignItems: 'center' }}>
            <Pressable
              style={[s.colorSwatch, {
                backgroundColor: c.value,
                borderColor: accentColor === c.value ? '#fff' : 'transparent',
              }]}
              onPress={() => onSelectAccent(c.value)}
            >
              {accentColor === c.value && (
                <MaterialCommunityIcons name="check" size={24} color="#fff" />
              )}
            </Pressable>
            <Text style={s.colorName}>{c.name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderStockage = () => {
    const archivedCount = archivedConversations.length;
    const totalImages = archivedConversations.reduce((acc, c) =>
      acc + c.messages.filter(m => m.attachmentType === 'image').length, 0);
    const totalDocs = archivedConversations.reduce((acc, c) =>
      acc + c.messages.filter(m => m.attachmentType === 'document').length, 0);

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>Stockage IA</Text>

        <View style={s.storageCard}>
          <Text style={{ fontWeight: 'bold', color: colors.text }}>Conversations actives</Text>
          <Text style={{ color: colors.textMuted, fontSize: Typography.sm }}>
            Les conversations actives sont stockées localement sur cet appareil.
          </Text>
          <View style={s.storageBar}>
            <View style={[s.storageBarFill, { width: '40%', backgroundColor: accentColor }]} />
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>~40% utilisé</Text>
        </View>

        <View style={s.storageCard}>
          {[
            [' Conversations archivées', `${archivedCount} conv.`],
            ['️ Images jointes (archives)', `${totalImages} fichier(s)`],
            [' Documents joints (archives)', `${totalDocs} fichier(s)`],
            [' Stockage local estimé', `~${Math.max(1, Math.round((archivedCount * 12 + totalImages * 80 + totalDocs * 30) / 1000))} MB`],
          ].map(([k, v]) => (
            <View key={String(k)} style={[s.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={s.infoKey}>{k}</Text>
              <Text style={s.infoVal}>{v}</Text>
            </View>
          ))}
        </View>

        <Pressable style={s.dangerBtn} onPress={() => Alert.alert(
          'Vider l\'archive',
          'Toutes les conversations archivées seront supprimées définitivement.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Vider', style: 'destructive', onPress: onClearArchive },
          ]
        )}>
          <Text style={s.dangerBtnText}>️ Vider les archives et libérer l'espace</Text>
        </Pressable>
      </ScrollView>
    );
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'apropos':  return renderApropos();
      case 'archives': return renderArchives();
      case 'langue':   return renderLangue();
      case 'couleurs': return renderCouleurs();
      case 'stockage': return renderStockage();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="robot-outline" size={22} color={accentColor} />
              <Text style={s.headerTitle}>Paramètres IA</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Tab Bar */}
          <View style={s.tabBar}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable key={tab.id} style={s.tabItem} onPress={() => setActiveTab(tab.id)}>
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={20}
                    color={isActive ? accentColor : colors.textMuted}
                  />
                  <Text style={[s.tabLabel, isActive && { ...s.tabLabelActive, color: accentColor }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.content}>
            {renderTab()}
          </View>
        </View>
      </View>
    </Modal>
  );
}
