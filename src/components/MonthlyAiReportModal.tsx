import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Radius, Spacing, Typography } from '../constants/designTokens';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/I18nContext';
import { formatGNF } from '../utils/currency';

const { width } = Dimensions.get('window');

interface MonthlyData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  topCategories: [string, number][];
  monthName: string;
  userName: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  monthlyData: MonthlyData;
}

export default function MonthlyAiReportModal({ visible, onClose, monthlyData }: Props) {
  const { colors } = useTheme();
  const { language } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string>('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (visible) {
      generateReport();
    }
  }, [visible]);

  const generateReport = async () => {
    setIsLoading(true);
    
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const { totalIncome, totalExpenses, balance, topCategories, monthName, userName } = monthlyData;
    
    // Calculate savings rate
    const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
    
    // Determine verdict
    let verdict = '';
    if (balance < 0) {
      verdict = ` Alerte : Déficit mensuel de ${formatGNF(Math.abs(balance))}. Il est urgent de revoir vos dépenses.`;
    } else if (savingsRate < 10) {
      verdict = ` Attention : Taux d'épargne faible (${savingsRate}%). Essayez d'atteindre au moins 20%.`;
    } else if (savingsRate >= 20) {
      verdict = ` Excellent : Taux d'épargne sain (${savingsRate}%). Continuez ainsi !`;
    } else {
      verdict = ` Bon : Équilibre positif avec un taux d'épargne de ${savingsRate}%.`;
    }

    // Generate category lines
    const catLines = topCategories.slice(0, 5).map(([cat, amount], idx) => {
      const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
      return `${idx + 1}. ${cat} : ${formatGNF(amount)} (${percentage}%)`;
    }).join('\n');

    // Generate the full report
    const generatedReport = ` Rapport Financier Mensuel — ${monthName}\n\n` +
      `Utilisateur : ${userName}\n\n` +
      ` Synthèse financière :\n` +
      `• Revenus totaux : ${formatGNF(totalIncome)}\n` +
      `• Dépenses totales : ${formatGNF(totalExpenses)}\n` +
      `• Solde net : ${formatGNF(balance)}\n` +
      `• Taux d'épargne : ${savingsRate}%\n\n` +
      `${verdict}\n\n` +
      (topCategories.length > 0 ? `️ Top catégories de dépenses :\n${catLines}\n\n` : '') +
      ` Conseils personnalisés :\n` +
      (balance < 0 
        ? `• Urgent : Réduisez immédiatement vos dépenses dans la catégorie la plus élevée (${topCategories[0]?.[0] || 'N/A'}).\n` +
          `• Action : Cherchez des sources de revenus supplémentaires cette semaine.\n` +
          `• Stratégie : Mettez en place un budget strict pour le reste du mois.`
        : savingsRate < 20
        ? `• Objectif : Augmentez votre taux d'épargne à 20% en réduisant les dépenses non essentielles.\n` +
          `• Conseil : Automatisez une épargne de 10% de vos revenus dès leur réception.\n` +
          `• Tontine : Envisagez de rejoindre une tontine pour forcer l'épargne.`
        : `• Excellent travail ! Maintenez cette discipline financière.\n` +
          `• Investissement : Placez ${formatGNF(Math.round(balance * 0.5))} dans un actif productif.\n` +
          `• Diversification : Explorez de nouvelles opportunités d'investissement (tontine, petit commerce).`
      ) + `\n\n` +
      ` Sagesse financière :\n` +
      `"Épargnez avant de dépenser, et non après." — George S. Clason\n\n` +
      `Voulez-vous des détails plus spécifiques sur une catégorie ?`;

    setReport(generatedReport);
    setIsLoading(false);
    
    // Auto-speak if TTS is enabled
    if (ttsEnabled) {
      speakReport(generatedReport);
    }
  };

  const speakReport = async (text: string) => {
    if (!ttsEnabled) return;
    
    try {
      setIsSpeaking(true);
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n/g, '. ')
        .replace(/[️]/g, '')
        .trim();
      
      await Speech.speak(cleanText, {
        language: language === 'en' ? 'en-US' : 'fr-FR',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Stop speech error:', error);
    }
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      maxHeight: '90%',
      paddingTop: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: Radius.full,
      alignSelf: 'center',
      marginBottom: Spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    titleIcon: {
      width: 38,
      height: 38,
      borderRadius: Radius.md,
      backgroundColor: `${colors.primary}18`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: Typography.lg,
      fontWeight: Typography.bold,
      color: colors.text,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: Spacing.xl,
    },
    loadingText: {
      fontSize: Typography.sm,
      color: colors.textMuted,
    },
    reportText: {
      fontSize: Typography.base,
      lineHeight: 24,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    actionBtnText: {
      fontSize: Typography.sm,
      fontWeight: Typography.semiBold,
      color: colors.text,
    },
    actionBtnTextPrimary: {
      color: '#fff',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          
          {/* Header */}
          <View style={s.header}>
            <View style={s.titleRow}>
              <View style={s.titleIcon}>
                <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
              </View>
              <Text style={s.title}>Rapport IA Mensuel</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable 
                style={[s.closeBtn, ttsEnabled && { backgroundColor: colors.primary + '20' }]} 
                onPress={() => {
                  setTtsEnabled(!ttsEnabled);
                  if (isSpeaking) stopSpeaking();
                  if (ttsEnabled && report) speakReport(report);
                }}
              >
                <MaterialCommunityIcons 
                  name={ttsEnabled ? 'volume-high' : 'volume-off'} 
                  size={18} 
                  color={ttsEnabled ? colors.primary : colors.textMuted} 
                />
              </Pressable>
              <Pressable style={s.closeBtn} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={s.loadingText}>Génération du rapport en cours...</Text>
              </View>
            ) : (
              <Text style={s.reportText}>{report}</Text>
            )}
          </ScrollView>

          {/* Actions */}
          {!isLoading && (
            <View style={s.actions}>
              <Pressable 
                style={[s.actionBtn, ttsEnabled && s.actionBtnPrimary]} 
                onPress={() => {
                  setTtsEnabled(!ttsEnabled);
                  if (isSpeaking) stopSpeaking();
                  if (!ttsEnabled && report) speakReport(report);
                }}
              >
                <MaterialCommunityIcons 
                  name={ttsEnabled ? 'volume-off' : 'volume-high'} 
                  size={20} 
                  color={ttsEnabled ? '#fff' : colors.text} 
                />
                <Text style={[s.actionBtnText, ttsEnabled && s.actionBtnTextPrimary]}>
                  {ttsEnabled ? 'Arrêter' : 'Écouter'}
                </Text>
              </Pressable>
              <Pressable style={s.actionBtn} onPress={() => {}}>
                <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
                <Text style={s.actionBtnText}>Partager</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}