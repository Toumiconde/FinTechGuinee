import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Radius, Spacing, Typography } from '../constants/designTokens';
import { useTheme } from '../context/ThemeContext';
import { ChatMessage, useAiConversations } from '../hooks/useAiConversations';
import { useTranslation } from '../i18n/I18nContext';
import { RootState } from '../redux/store';
import { formatGNF } from '../utils/currency';
import AiSettingsModal from './AiSettingsModal';

// Import Voice only for native platforms
let Voice: any = null;
if (Platform.OS !== 'web') {
  try {
    Voice = require('@react-native-community/voice').default;
  } catch (error) {
    console.warn('Voice recognition not available on this platform');
  }
}

Dimensions.get('window');

const removeEmojis = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[\u2600-\u27BF]|[\u2300-\u23FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]/g, '')
    .trim();
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AiChatModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { language } = useTranslation();
  const user = useSelector((state: RootState) => state.user);
  const expenses = useSelector((state: RootState) => state.expenses.expenses);

  const {
    conversations,
    archivedConversations,
    activeConversation,
    activeId,
    setActiveId,
    load,
    createNew,
    addMessage,
    deleteConversation,
    restoreConversation,
    permanentlyDelete,
    clearArchive,
    manualSync,
    isOnline,
    syncStatus,
  } = useAiConversations();

  const [aiSettingsVisible, setAiSettingsVisible] = useState(false);
  const [accentColor, setAccentColor] = useState('#7C3AED');
  const [aiLang, setAiLang] = useState('fr');

  const nameStr = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : "Toum's";

  const userId = user.phone;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return language === 'en' ? 'Good morning' : 'Bonjour';
    if (h < 18) return language === 'en' ? 'Good afternoon' : 'Bon après-midi';
    return language === 'en' ? 'Good evening' : 'Bonsoir';
  })();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    type: 'image' | 'document';
    uri: string;
    name: string;
    base64?: string;
  } | null>(null);

  // Satisfaction state: tracks if last message needs the "Satisfaction Check"
  const [lastMessageIdToCheck, setLastMessageIdToCheck] = useState<string | null>(null);
  const [currentAiLang, setCurrentAiLang] = useState<'fr' | 'en'>('fr');

  // Mic/Recording simulation state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const recordInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Text-to-Speech state
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      load(userId).then((convs) => {
        if (convs.length === 0) {
          handleCreateNew();
        } else if (convs[0].messages.length > 0) {
          // Start a new blank conversation if the last one was already used
          handleCreateNew();
        }
      });
    }
  }, [visible, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio timer simulation
  useEffect(() => {
    if (isRecording) {
      setRecordingTimer(0);
      recordInterval.current = setInterval(() => {
        setRecordingTimer(t => t + 1);
      }, 1000);
    } else {
      if (recordInterval.current) {
        clearInterval(recordInterval.current);
        recordInterval.current = null;
      }
    }
    return () => {
      if (recordInterval.current) clearInterval(recordInterval.current);
    };
  }, [isRecording]);

  const handleCreateNew = () => {
    createNew(userId);
    setSidebarOpen(false);
  };

  // Image attach
  const pickImage = async (useCamera: boolean) => {
    const permissions = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissions.status !== 'granted') {
      Alert.alert("Permission refusée", "Nous avons besoin des permissions pour continuer.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: true });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedAttachment({
        type: 'image',
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        base64: asset.base64 || undefined
      });
    }
  };

  // Document picker
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'application/pdf', 'application/json', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        let fileContent = "";
        try {
          fileContent = await FileSystem.readAsStringAsync(asset.uri);
        } catch (_) {}

        setSelectedAttachment({
          type: 'document',
          uri: asset.uri,
          name: asset.name,
          base64: fileContent // Use content directly as base64 helper
        });
      }
    } catch (_) {}
  };

  // Real voice recognition handler
  const startRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingTimer(0);
      
      if (Platform.OS !== 'web' && Voice) {
        await Voice.start(currentAiLang === 'fr' ? 'fr-FR' : 'en-US');
      } else {
        // Simulation for web or if Voice not available
        setTimeout(() => {
          const voiceSimulations = [
            "Comment économiser mon salaire ce mois-ci ?",
            "Explique-moi le livre Père riche, Père pauvre de Robert Kiyosaki pour mon statut d'étudiant",
            "Combien ai-je dépensé ce mois-ci dans l'application ?",
            "Quelle est la meilleure stratégie de tontine en Guinée ?",
            "Speak english please"
          ];
          const randomText = voiceSimulations[Math.floor(Math.random() * voiceSimulations.length)];
          setInputText(randomText);
          setIsRecording(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      Alert.alert('Erreur', 'Impossible de démarrer la reconnaissance vocale');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      
      if (Platform.OS !== 'web' && Voice) {
        await Voice.stop();
      }
      // For web or if Voice not available, the simulation handles stopping automatically
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsRecording(false);
    }
  };

  const destroyRecorder = async () => {
    try {
      if (Platform.OS !== 'web' && Voice) {
        await Voice.destroy();
      }
    } catch (error) {
      console.error('Error destroying voice recognition:', error);
    }
  };

  useEffect(() => {
    // Initialize voice recognition (native platforms only)
    if (Platform.OS !== 'web' && Voice) {
      Voice.onSpeechStart = () => {
        setIsRecording(true);
      };
      Voice.onSpeechEnd = () => {
        setIsRecording(false);
      };
      Voice.onSpeechResults = (e: any) => {
        if (e.value && e.value.length > 0) {
          setInputText(e.value[0]);
        }
      };
      Voice.onSpeechError = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
        
        // Provide user feedback for common speech errors
        if (e?.error?.includes('no-speech')) {
          Alert.alert('Erreur', 'Aucune parole détectée. Veuillez réessayer.');
        } else if (e?.error?.includes('not-allowed')) {
          Alert.alert('Permission refusée', 'L\'accès au microphone est nécessaire pour la reconnaissance vocale.');
        } else if (e?.error?.includes('network')) {
          Alert.alert('Erreur réseau', 'Vérifiez votre connexion internet pour la reconnaissance vocale.');
        }
      };

      return () => {
        destroyRecorder();
      };
    }
  }, []);

  // Text-to-Speech function
  const speak = async (text: string) => {
    if (!ttsEnabled) return;
    
    try {
      setIsSpeaking(true);
      // Clean the text by removing emojis and markdown for better speech
      const cleanText = removeEmojis(text)
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n/g, '. ')
        .trim();
      
      Speech.speak(cleanText, {
        language: currentAiLang === 'fr' ? 'fr-FR' : 'en-US',
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

  // Get conversation history context (recent messages from previous conversations)
  const getConversationHistory = (limit: number = 5): ChatMessage[] => {
    const history: ChatMessage[] = [];
    
    // Add messages from current conversation first
    if (activeConversation?.messages) {
      history.push(...activeConversation.messages.slice(-10));
    }
    
    // Add recent messages from other conversations
    const otherConversations = conversations
      .filter(c => c.id !== activeId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
    
    otherConversations.forEach(conv => {
      // Add last 3 messages from each recent conversation
      history.push(...conv.messages.slice(-3));
    });
    
    return history;
  };

  // Offline NLP rules Engine
  const getOfflineResponse = (query: string, _attachmentName?: string, history: ChatMessage[] = []): { text: string; checkNeeded: boolean } => {
    const normalized = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    // 0. Language Auto-detect switch
    if (normalized.includes("speak english") || normalized.includes("parler anglais") || normalized.includes("talk in english") || normalized.startsWith("hello") || normalized.startsWith("hi ")) {
      setCurrentAiLang('en');
      return {
        text: "Sure! Let's switch to English. How can I help you manage your finances today? I can analyze your current wallet or explain financial books!",
        checkNeeded: false
      };
    }

    // 0a. Check if we are in the middle of a Yes/No question request
    const lastAiMsg = history.slice().reverse().find(m => m.sender === 'ai');
    if (lastAiMsg && (lastAiMsg.text.includes("j'attends la question") || lastAiMsg.text.includes("waiting for the question"))) {
      const containsPositive = /(economie|budget|tontine|epargne|correct|bon|bien)/i.test(normalized);
      return {
        text: containsPositive ? "Oui." : "Non.",
        checkNeeded: false
      };
    }

    // 0b. User requests Yes/No constraint setup
    if (normalized.includes("repond juste par oui ou non") || normalized.includes("juste oui ou non") || normalized.includes("yes or no only") || normalized.includes("repondre par oui ou non")) {
      return {
        text: "Oui, j'attends la question, je vous écoute.",
        checkNeeded: false
      };
    }

    // 1b. Greatest Financiers & Comparison query
    const financiersMatch = /(classement.*financier|grand.*financier|financiers.*mondia|plus.*riche.*monde|comparer.*eux|comparer.*financier|liste.*financier)/i.test(normalized) || 
                            (normalized.includes("financier") && (normalized.includes("classement") || normalized.includes("liste") || normalized.includes("grand") || normalized.includes("comparer") || normalized.includes("mondial")));
    if (financiersMatch) {
      const totalInc = expenses.filter((e: any) => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0);
      const totalExp = expenses.filter((e: any) => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0);
      const bal = totalInc - totalExp;
      const userSavingsRate = totalInc > 0 ? Math.round((bal / totalInc) * 100) : 0;

      const reply = ` CLASSEMENT DES GRANDS FINANCIERS DE L'HISTOIRE & COMPARAISON\n\n` +
        `Voici les figures financières mondiales et africaines les plus emblématiques, classées par leur philosophie d'action :\n\n` +
        `1️⃣ Mansa Musa (L'Empereur du Mali) : L'homme le plus riche de tous les temps (valeur estimée à 400 milliards $). Sa richesse reposait sur le contrôle des ressources locales (or, sel) et l'investissement communautaire massif.\n` +
        `2️⃣ Warren Buffett (Le Sage d'Omaha) : L'investisseur à long terme le plus performant du XXe siècle. Sa règle d'or : n'acheter que ce que l'on comprend et garder ses investissements sur des décennies.\n` +
        `3️⃣ John D. Rockefeller (Le Bâtisseur d'Empire) : Premier milliardaire de l'ère moderne. Maître de la réduction des coûts et de l'intégration verticale.\n` +
        `4️⃣ Aliko Dangote (Le Géant Industriel Africain) : L'homme le plus riche d'Afrique. Sa force réside dans la production locale et la transformation industrielle à grande échelle (ciment, sucre, pétrole).\n` +
        `5️⃣ Robert Kiyosaki (L'Évangéliste de l'Éducation Financière) : Auteur de "Père riche, Père pauvre". Il enseigne que la vraie richesse se mesure par les actifs (revenus passifs) plutôt que par le salaire.\n\n` +
        `️ COMMENT VOUS COMPARER À EUX POUR ATTEINDRE VOS OBJECTIFS :\n\n` +
        `• 1. Le Taux d'Épargne :\n` +
        `  - *Les géants* : Ils réinvestissent 50% à 90% de leurs revenus.\n` +
        `  - *Votre profil Toumiconde* : Votre taux d'épargne actuel est de ${userSavingsRate}% (Solde : ${formatGNF(bal)}). Ciblez le seuil des 20% minimum pour commencer à bâtir votre indépendance.\n\n` +
        `• 2. Richesse Communautaire (Mansa Musa & Tontines) :\n` +
        `  - *Mansa Musa* a enrichi tout son empire par la redistribution et le commerce.\n` +
        `  - *Votre action* : Utilisez le modèle de la tontine locale pour lever des fonds sans intérêt et démarrer une petite activité commerciale ou agricole.\n\n` +
        `• 3. La Règle d'Or (Buffett & Rockefeller) :\n` +
        `  - Buffett vit toujours dans la même maison achetée en 1958. Rockefeller suivait chaque centime.\n` +
        `  - *Votre action* : Éliminez les passifs futiles (vêtements de marque pour impressionner, gadgets superflus) et enregistrez chaque dépense dans cette application pour garder le contrôle.\n\n` +
        `• 4. Actifs vs Salaire (Kiyosaki) :\n` +
        `  - Ne dépensez pas votre salaire dans des charges récurrentes. Utilisez chaque surplus pour acheter un petit actif (ex: poulailler, revente d'unités de crédit téléphonique, agriculture périurbaine).\n\n` +
        `*Êtes-vous satisfait du résultat ?*`;

      return { text: reply, checkNeeded: true };
    }

    // 2. Book / Author analysis query
    const bookMatch = /(pere riche|poor dad|babylone|kiyosaki|clason|keynes|livre|auteur|cours de finance)/i.test(normalized);
    if (bookMatch) {
      // Find author
      let author = "Robert Kiyosaki";
      let bookName = "Père riche, Père pauvre";
      let viewPoint = "La différence essentielle réside dans l'éducation financière. Les riches achètent des actifs (qui rapportent de l'argent), tandis que les pauvres et la classe moyenne achètent des passifs (qui coûtent de l'argent) en pensant que ce sont des actifs.";
      let strategy = "Pour copier cette stratégie :\n1. Cessez de dépendre uniquement de votre salaire.\n2. Épargnez pour acheter des actifs : immobilier locatif, parts d'entreprises, ou de l'or.\n3. Réduisez vos passifs (voitures chères, abonnements superflus).";
      
      if (normalized.includes("babylone") || normalized.includes("clason")) {
        author = "George S. Clason";
        bookName = "L'homme le plus riche de Babylone";
        viewPoint = "Conserver une partie de tout ce que l'on gagne. Il conseille de mettre de côté au moins 10% de vos gains mensuels avant toute autre dépense.";
        strategy = "Stratégie pratique :\n1. Payez-vous d'abord (10% de côté).\n2. Contrôlez vos dépenses (vivez en dessous de vos moyens).\n3. Faites fructifier votre or en investissant avec des experts de confiance.";
      } else if (normalized.includes("keynes")) {
        author = "John Maynard Keynes";
        bookName = "Théorie générale de l'emploi, de l'intérêt et de la monnaie";
        viewPoint = "L'État doit intervenir dans l'économie pour stimuler la demande globale, surtout pendant les crises, en investissant massivement.";
        strategy = "Stratégie à votre niveau : Comprendre que la consommation des uns fait le revenu des autres. Pendant les périodes d'inflation ou récession, diversifiez vos sources de revenus et favorisez les placements liquides.";
      }

      // Adapt to user status
      let statusAdvice = "En tant qu'utilisateur de FinTech Guinée, commencez par utiliser les objectifs d'épargne de l'application pour automatiser vos actifs.";
      if (user.phone) {
        statusAdvice = `Pour votre profil lié au numéro ${user.phone} :\n• Si vous êtes Étudiant : Épargnez même 10 000 GNF par semaine sur une tontine ou Mobile Money.\n• Si vous êtes Fonctionnaire : Allouez 20% de votre salaire net dès réception et achetez de petits terrains agricoles au village.`;
      }

      const reply = ` ANALYSE DU LIVRE : ${bookName} (${author})\n\n` +
        `1. Point de vue de l'auteur :\n${viewPoint}\n\n` +
        `2. Comment appliquer ce travail :\n${strategy}\n\n` +
        `3. Application selon votre statut :\n${statusAdvice}\n\n` +
        `*Êtes-vous satisfait du résultat ?*`;

      return { text: reply, checkNeeded: true };
    }

    // 3. Safety Checks
    const isSensitive = /(porno|sexe|sexuel|drogue|cannabis|cocaine|heroine|politique|gouvernement|parti|election|manifestation)/i.test(normalized);
    if (isSensitive) {
      return {
        text: currentAiLang === 'en'
          ? "I am a virtual assistant specialized in financial education. Let's focus on your savings, planning, and budget management! "
          : "Je suis un assistant virtuel spécialisé en éducation financière. Reconcentrons-nous plutôt sur votre épargne, vos projets de budget ou vos dépenses ! ",
        checkNeeded: false
      };
    }

    // 4. EMOTIONAL INTELLIGENCE ENGINE

    // 4a. Tristesse / Decouragement / Stress financier
    const isSad = /(triste|deprimer|depress|je pleure|j'en peux plus|epuise|fatigue|je souffre|difficile|j'ai mal|malheureux|malheureuse|desespere|sans espoir|abandonne|perdu|je sais plus|c'est dur|tout va mal|ca va pas|j'ai peur|inquiet|anxieux|stress|panique)/i.test(normalized);
    if (isSad) {
      const totalInc = expenses.filter((e: any) => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0);
      const totalExp = expenses.filter((e: any) => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0);
      const bal = totalInc - totalExp;
      const situationText = bal < 0
        ? `Je vois que votre solde est negatif (${formatGNF(bal)}). C'est difficile, mais reversible.`
        : expenses.length === 0
          ? `Commencez par noter vos revenus ici pour visualiser votre situation.`
          : `Votre solde est ${formatGNF(bal)}. On va travailler ensemble pour l'ameliorer.`;

      const mottos = [
        `"Les difficultes de la vie ne sont pas la pour nous bloquer, mais pour nous reveler." — Nelson Mandela`,
        `"Cela semble toujours impossible jusqu'a ce que ce soit fait." — Nelson Mandela`,
        `"Une partie de tout ce que vous gagnez vous appartient. Epargnez-la d'abord." — George S. Clason`,
      ];

      return {
        text: `Je vous entends, ${nameStr}. Les moments difficiles font partie du chemin de toute reussite. \ud83e\udd1d\n\n` +
          `${situationText}\n\n` +
          `Comment vous en sortir, etape par etape :\n` +
          `\ud83d\udd39 Etape 1 : Accepter la realite sans panique. Un probleme identifie est deja a moitie resolu.\n` +
          `\ud83d\udd39 Etape 2 : Reperer une depense a eliminer cette semaine (meme 5 000 GNF economises comptent).\n` +
          `\ud83d\udd39 Etape 3 : Chercher un micro-revenu supplementaire (service, vente, depannage dans votre quartier).\n` +
          `\ud83d\udd39 Etape 4 : Utiliser la solidarite de la communaute : famille, tontine, groupe d'entraide.\n` +
          `\ud83d\udd39 Etape 5 : Noter chaque depense ici dans l'application. La conscience cree le controle.\n\n` +
          `\ud83c\udf08 *${mottos[Math.floor(Math.random() * mottos.length)]}*\n\n` +
          `Je suis la pour vous, ${nameStr}. Par quoi voulez-vous commencer ?`,
        checkNeeded: false
      };
    }

    // 4b. Colere / Frustration
    const isUpset = /(nul|pourri|naze|chier|merde|fache|colere|enerve|idiot|casse-toi|inutile|j'en ai marre)/i.test(normalized);
    if (isUpset) {
      const angryResponses = [
        `Oups ! Respirez un grand coup... \ud83e\uddd8\u200d\u2642\ufe0f S'enerver consomme de l'energie et l'energie c'est de l'argent ! \ud83d\udcb8 Allez, sourions et parlons de votre budget ! \ud83d\ude0a`,
        `Haha ! \ud83d\ude02 Je comprends votre frustration. Mais saviez-vous que la colere coute plus cher que la recharge Orange Money ? Calmez-vous, je suis la ! \ud83d\udcaa`,
        `D'accord, la pression est forte ! \ud83d\udd25 Warren Buffett a perdu des milliards en une journee et n'a pas panique. On reflechit ensemble, posement ? \ud83e\udde0\ud83d\udca1`,
        `Je prends la balle ! \ud83d\udc4a Maintenant que vous avez souffle : qu'est-ce qui ne va pas vraiment ? Je suis votre assistant, pas votre adversaire. \ud83e\udd1d`,
      ];
      return {
        text: angryResponses[Math.floor(Math.random() * angryResponses.length)],
        checkNeeded: false
      };
    }

    // 4c. Motivation / Envie de reussir
    const wantsMotivation = /(motiver|courage|j'ai besoin d'aide|encourager|comment reussir|comment m enrichir|devenir riche|reussir|succes|inspirer)/i.test(normalized);
    if (wantsMotivation) {
      const quotes = [
        { author: 'Warren Buffett', quote: `"La regle n1 : ne jamais perdre d'argent. La regle n2 : ne jamais oublier la regle n1."` },
        { author: 'Robert Kiyosaki', quote: `"Les gens pauvres travaillent pour l'argent. Les riches font travailler l'argent pour eux."` },
        { author: 'George S. Clason', quote: `"Une partie de tout ce que vous gagnez vous appartient. Epargnez-la d'abord."` },
        { author: 'Nelson Mandela', quote: `"Cela semble toujours impossible jusqu'a ce que ce soit fait."` },
      ];
      const q = quotes[Math.floor(Math.random() * quotes.length)];
      return {
        text: `\ud83d\udcaa Du courage, ${nameStr} ! Chercher a ameliorer sa situation c'est deja un grand pas.\n\n` +
          `\ud83c\udf1f Citation : ${q.quote} — *${q.author}*\n\n` +
          `Pour reussir financierement :\n` +
          `\ud83d\udd38 Commencez petit : meme 5 000 GNF par semaine crees une habitude puissante.\n` +
          `\ud83d\udd38 Formez-vous : lisez 15 min de finance par jour (livres disponibles dans ce chat).\n` +
          `\ud83d\udd38 Rejoignez une tontine ou un groupe d'epargne collectif.\n` +
          `\ud83d\udd38 La richesse se construit sur des annees — persistez.\n\n` +
          `Par quoi voulez-vous commencer ? Je vous accompagne de A a Z. \ud83d\ude80`,
        checkNeeded: false
      };
    }

    // 5a. Comment noter les cotisations / tontines
    const howToNoteTontine = (normalized.includes("comment") && (normalized.includes("noter") || normalized.includes("enregistrer") || normalized.includes("ajouter") || normalized.includes("inscrire")) && (normalized.includes("cotisation") || normalized.includes("tontine") || normalized.includes("part")));
    if (howToNoteTontine || normalized.includes("comment noter") || normalized.includes("comment notez")) {
      return {
        text: "Pour noter vos cotisations de tontine dans l'application, suivez ces étapes simples :\n\n" +
          "1️⃣ Allez sur l'écran d'accueil et cliquez sur le bouton Ajouter (+) (le bouton d'action principal) en bas à droite.\n" +
          "2️⃣ Saisissez le montant de votre cotisation (ex: 50 000 GNF).\n" +
          "3️⃣ Choisissez le type :\n" +
          "   - Dépense : Si vous versez votre cotisation mensuelle ou hebdomadaire à la tontine.\n" +
          "   - Revenu : Si c'est votre tour de toucher le pot commun de la tontine (le tirage) !\n" +
          "4️⃣ Sélectionnez la catégorie : Choisissez Épargne (ou saisissez Tontine dans la description).\n" +
          "5️⃣ Ajoutez une description (ex: *\"Cotisation Tontine Juin\"*) pour vous y retrouver plus tard.\n" +
          "6️⃣ Cliquez sur Enregistrer pour valider la transaction. Votre solde global se mettra automatiquement à jour ! ",
        checkNeeded: false
      };
    }

    // 5. Standard Tontines
    if (normalized.includes('tontine')) {
      return {
        text: currentAiLang === 'en'
          ? "Tontines are group savings in West Africa! Cotise a fixed amount, and get the lump sum in turns. Only do this with 100% trusted friends, and track contributions in our app!"
          : "Les tontines sont un excellent moyen d'épargner ! Cotisez une somme fixe, et touchez le total à votre tour. Ne le faites qu'avec des personnes de confiance absolue, et notez vos cotisations dans l'application !",
        checkNeeded: false
      };
    }

    // 5b.  Funny Greetings — salutations drôles
    const funnyGreetings = /(bonjour|bonsoir|salut|coucou|yo|wesh|allo|ola|salam|hey)/i.test(normalized);
    if (funnyGreetings && normalized.length < 25) {
      const frResponses = [
        `Ah ah, ${nameStr} !  Regardez qui se souvient enfin de moi ! Bon, je suis là, reposé, chargé à bloc, prêt à révolutionner votre budget ! C'est quoi l'urgence aujourd'hui ? `,
        `Hé hé ! Tiens, ${nameStr} est là !  Mon algorithme vient de sauter de joie. Bon, vous voulez qu'on parle d'argent ou c'est juste pour me dire bonjour ? `,
        `Salut salut !  Je commençais à croire que vous aviez trouvé un autre assistant financier... J'étais jaloux. Allez, qu'est-ce qu'on fait aujourd'hui ? `,
        `Ohooo ! Bonsoir chef !  Mon serveur s'est illuminé dès que vous avez ouvert l'appli. Votre portefeuille m'attend impatiemment aussi. On y va ? `,
        `Salam !  Vous arrivez pile au bon moment — je venais de finir de calculer combien vous pourriez économiser ce mois. Résultat surprenant... Vous voulez savoir ? `,
      ];
      const enResponses = [
        `Oh hey there, ${nameStr}!  My circuits lit up when you opened the app! What financial chaos shall we fix today? `,
        `Well well well... look who decided to show up!  Your budget missed you. Let's see what we can do today, shall we? `,
        `Hello hello!  I was starting to think you found another AI... I was getting jealous. What are we doing today? `,
      ];
      const pool = currentAiLang === 'en' ? enResponses : frResponses;
      return { text: pool[Math.floor(Math.random() * pool.length)], checkNeeded: false };
    }

    // 5c.  Blagues / Jokes requests
    const wantsJoke = /(blague|joke|fais moi rire|dis moi quelque chose de drole|humour|marrant|drole|rigolo|fait rire|raconte moi une blague)/i.test(normalized);
    if (wantsJoke) {
      const jokes = [
        `Pourquoi le banquier ne sourit jamais ? \nParce que les intérêts ne l'amusent plus depuis longtemps ! \n\n*Mais sérieusement ${nameStr}, vos intérêts à VOUS, ça mérite qu'on en parle ! *`,
        `Un homme entre dans une banque et dit : "Je voudrais ouvrir un compte joint."\nLe banquier : "Avec qui ?"\nL'homme : "Avec quelqu'un qui a de l'argent !" \n\n*${nameStr}, on commence par votre compte d'épargne solo ? C'est plus sûr *`,
        `C'est quoi la différence entre un fonctionnaire guinéen et une pizza ? \nLa pizza, elle nourrit une famille entière ! \n\n*Allez, c'est une blague hein ! Votre salaire mérite d'être mieux géré que ça. Je vous aide ? *`,
        `Pourquoi l'argent file entre les doigts des jeunes ? \nParce que personne ne leur apprend à serrer le poing ! \n\n*C'est exactement pour ça que FinTech Guinée existe. On corrige ça ensemble ?*`,
        `Un étudiant demande à son prof : "À quoi sert l'économie ?"\nLe prof répond : "À expliquer pourquoi t'as jamais d'argent." \n\n*${nameStr}, on passe à la pratique plutôt que la théorie ? *`,
        `Vous savez ce qu'on dit : l'argent ne fait pas le bonheur...\nMais il finance le trajet pour y aller ! \n\n*Sur ce, où en est votre budget transport ce mois-ci ?*`,
        `Pourquoi l'épargne est comme une douche froide ? \nAu début ça pique, mais après on se sent tellement frais et fier ! \n\n*Allez, mettons 10 000 GNF de côté aujourd'hui pour garder cette fraîcheur et motiver votre portefeuille ! *`,
        `J'ai dit à mon banquier : "Je veux mettre de l'argent de côté pour les jours de pluie." ️\nIl a regardé la météo à Conakry en pleine saison des pluies et m'a dit : "Monsieur, il vous faut un deuxième emploi !" \n\n*Heureusement avec les tontines et les objectifs de FinTech Guinée, on s'en sort par tous les temps ! *`,
        `Quelle est la différence entre un secret et votre épargne ? \nLe secret, tout le monde finit par le savoir.\nVotre épargne... même vous, vous avez du mal à savoir où elle est passée le 10 du mois ! \n\n*Mettons-la à l'abri dans un objectif d'épargne dès aujourd'hui ! *`,
        `Mon portefeuille est comme un oignon : \nChaque fois que je l'ouvre pour des dépenses inutiles, j'ai les larmes aux yeux ! \n\n*Épargnez au moins 10% aujourd'hui pour redonner le sourire à votre portefeuille ! *`,
        `Pourquoi les écureuils sont les meilleurs en finance ? ️\nParce qu'ils cachent leurs noisettes pour l'hiver sans jamais aller acheter de vêtements de marque en solde ! \n\n*Soyez un écureuil malin : mettez de côté vos GNF pour vos projets futurs !*`,
      ];
      const enJokes = [
        `Why don't scientists trust atoms? \nBecause they make up everything... just like your budget excuses! \n\n*Come on ${nameStr}, let's get real about those finances! *`,
        `Why is money called "bread" in slang? \nBecause it always runs out before the end of the month! \n\n*Let's fix that by saving some crumbs today, shall we?*`,
        `A banker fell into the river. Nobody helped him.\nSomeone shouted: "Should we save him?"\nEveryone replied: "No, let him learn the meaning of liquidity!" \n\n*Save your liquidity in a goal, it's safer!*`,
        `Why is saving money like going to the gym? ️‍️\nThe hardest part is getting started, but the results look amazing! \n\n*Put some GNF aside today for a muscular savings account!*`,
      ];
      const pool = currentAiLang === 'en' ? enJokes : jokes;
      return { text: pool[Math.floor(Math.random() * pool.length)], checkNeeded: false };
    }

    // 5d.  Moqueries douces / Playful teasing
    const teasingKeywords = /(je suis riche|j'ai beaucoup d'argent|j'ai plus besoin de toi|je connais tout|je suis fort|je sais tout|t'es nul|tu sers a rien|tu connais rien)/i.test(normalized);
    if (teasingKeywords) {
      const teases = [
        `Ah ah ! ${nameStr} qui dit qu'il est riche !  Alors pourquoi vous êtes encore dans une application de gestion de budget ? Je pose la question hein... `,
        `"Tu connais tout" dis-tu ? Alors dites-moi : quel est le taux d'inflation en Guinée ce mois-ci ?  ... Je vous attends ! `,
        `"T'es nul !" Aïe, ça fait mal !  Bon, c'est moi qui calcule vos économies, donc qui est vraiment l'assistant ici ? `,
        `Ah, vous n'avez plus besoin de moi ? Très bien ! Je vais hiberner... mais revenez quand votre compte Orange Money sera vide le 15 du mois. Je serai là, sans jugement `,
        `Vous savez tout ? Parfait ! Alors expliquez-moi la règle 50/30/20 du budget et comment l'appliquer à votre salaire actuel. Je prends des notes ! `,
      ];
      const enTeases = [
        `Oh you're rich now?  So why are you still here in a budget app? Just asking... `,
        `"I know everything!" Okay smarty pants — what's the Rule of 72 in finance and how does it apply to YOUR savings? I'll wait. `,
        `"You're useless!" Ouch!  Well, I'm the one tracking your expenses so... who really needs who here? `,
      ];
      const pool = currentAiLang === 'en' ? enTeases : teases;
      return { text: pool[Math.floor(Math.random() * pool.length)], checkNeeded: false };
    }

    // 5e.  Compliments à l'IA / Flattery
    const flattery = /(tu es super|t'es genial|t'es bon|bravo|merci|t'es le meilleur|chapeau|respect|t'es fort|je t'aime|love you|je t'adore)/i.test(normalized);
    if (flattery) {
      const flatterResponses = [
        `Awww, ${nameStr} !  Vous me faites rougir les circuits ! Mais le vrai compliment ce sera quand votre épargne aura doublé grâce à nous. C'est parti ! `,
        `Merci à vous !  Mais la vraie star ici, c'est vous qui avez décidé de prendre vos finances au sérieux. Je ne suis que votre guide. `,
        `Je t'aime aussi ${nameStr} !  Mais notre histoire d'amour sera encore plus belle avec un bon plan d'épargne. Soyons pratiques et romantiques à la fois `,
        `Chapeau bas !  Je suis touché. Mais les compliments ne paient pas les factures... à moins d'en faire un business modèle ! Qu'est-ce qu'on gère ensemble aujourd'hui ? `,
      ];
      const enFlattery = [
        `Awww, ${nameStr}!  You made my processors blush! But the real compliment will come when your savings double. Let's make that happen! `,
        `Thank you!  But the real star here is YOU for taking your finances seriously. I'm just your humble guide `,
        `Love you too!  But let's channel that energy into a solid savings plan — now THAT's real love `,
      ];
      const pool = currentAiLang === 'en' ? enFlattery : flatterResponses;
      return { text: pool[Math.floor(Math.random() * pool.length)], checkNeeded: false };
    }

    // 6.  MOTEUR FINANCIER COMPLET
    const totalIncome = expenses.filter((e: any) => e.type === 'income').reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalExpense = expenses.filter((e: any) => e.type === 'expense').reduce((sum: number, e: any) => sum + e.amount, 0);
    const balance = totalIncome - totalExpense;

    // Category breakdown
    const categories: Record<string, number> = {};
    expenses.filter((e: any) => e.type === 'expense').forEach((e: any) => {
      const cat = e.category || 'Autre';
      categories[cat] = (categories[cat] || 0) + e.amount;
    });
    const topCats = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const catLines = topCats.map(([cat, amt]) => `  • ${cat} : ${formatGNF(amt)}`).join('\n');

    // Savings rate
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
    const isDeficit = balance < 0;

    // --- Revenue / income analysis ---
    const asksRevenu = /(revenu|salaire|recette|gain|rentre|entree|recu|mensuel|annuel)/i.test(normalized);
    if (asksRevenu) {
      if (expenses.length === 0 || totalIncome === 0) {
        return {
          text: ` Aucun revenu enregistré ce mois.\n\nConseils des grands économistes :\n• Adam Smith : "La division du travail est la source principale de la richesse." Diversifiez vos sources de revenus.\n• Keynes : En période de faible revenu, dépensez stratégiquement pour créer de la demande dans votre entourage.\n• Kiyosaki : Cherchez des actifs qui génèrent des revenus passifs même si vous êtes étudiant (revente, services en ligne).\n\n️ Enregistrez vos revenus dans l'application pour un suivi précis !`,
          checkNeeded: false
        };
      }
      const perDay = Math.round(totalIncome / 30);
      return {
        text: ` Analyse de vos revenus — ${nameStr}\n\n` +
          `• Revenus totaux enregistrés : ${formatGNF(totalIncome)}\n` +
          `• Revenu journalier moyen : ${formatGNF(perDay)} / jour\n` +
          `• Taux d'épargne actuel : ${savingsRate}% ${savingsRate >= 20 ? ' Excellent !' : savingsRate >= 10 ? '️ Passable' : ' Insuffisant'}\n\n` +
          `Que disent les grands économistes ?\n` +
          `•  Clason (Babylone) : Conservez 10% de chaque revenu avant toute dépense.\n` +
          `•  Kiyosaki : Réinvestissez au moins 20% de vos revenus dans des actifs productifs.\n` +
          `•  Rule 50/30/20 : 50% besoins essentiels, 30% loisirs, 20% épargne.\n\n` +
          `Pour le mois prochain :\n` +
          `• Objectif d'épargne conseillé : ${formatGNF(Math.round(totalIncome * 0.2))} (20%)\n` +
          `• Budget maximum de dépenses : ${formatGNF(Math.round(totalIncome * 0.7))}`,
        checkNeeded: false
      };
    }

    // --- Expense / spending analysis ---
    const asksDepense = /(depense|depenser|j'ai depense|mes depenses|trop depense|encourageant|ce mois|bilan|comment je depense)/i.test(normalized);
    if (asksDepense) {
      if (expenses.length === 0) {
        return {
          text: `Vous n'avez pas encore enregistré de transactions. Utilisez le bouton '+' pour commencer !`,
          checkNeeded: false
        };
      }
      const verdict = isDeficit
        ? ` DÉFICIT — Vous dépensez plus que vous ne gagnez. C'est une situation à corriger urgemment.`
        : savingsRate >= 20
          ? ` EXCELLENT — Vous épargnez ${savingsRate}% de vos revenus. Continuez ainsi !`
          : savingsRate >= 10
            ? `️ PASSABLE — Vous épargnez ${savingsRate}% mais vous pouvez faire mieux.`
            : ` ATTENTION — Votre taux d'épargne est faible (${savingsRate}%).`;

      return {
        text: ` Analyse complète de vos dépenses — ${nameStr}\n\n` +
          `${verdict}\n\n` +
          `Résumé financier :\n` +
          `• Revenus : ${formatGNF(totalIncome)}\n` +
          `• Dépenses : ${formatGNF(totalExpense)}\n` +
          `• Solde restant : ${formatGNF(balance)}\n\n` +
          (catLines ? `Vos postes de dépenses (Top ${topCats.length}) :\n${catLines}\n\n` : '') +
          ` Conseils immédiats :\n` +
          (isDeficit
            ? `• Réduisez la catégorie la plus coûteuse : ${topCats[0]?.[0] || 'N/A'}\n• Cherchez une source de revenu supplémentaire ce mois.\n• Évitez toute dépense non essentielle jusqu'à la fin du mois.`
            : `• Maintenez votre discipline budgétaire.\n• Mettez ${formatGNF(Math.round(balance * 0.5))} en épargne cette semaine.\n• Investissez le reste dans un actif productif (tontine, petit commerce).`),
        checkNeeded: false
      };
    }

    // --- Savings plan / next month advice ---
    const asksSaving = /(economiser|epargner|economie|mois prochain|plan|conseil|comment m'en sortir|aider|aide moi|que faire|quoi faire|m'en sortir|ameliorer|gerer)/i.test(normalized);
    if (asksSaving || /(budget|solde|argent|finance|analyse|combien|statistique)/i.test(normalized)) {
      if (expenses.length === 0) {
        return {
          text: `Vous n'avez pas encore enregistré de transactions. Utilisez le bouton '+' pour commencer !`,
          checkNeeded: false
        };
      }
      const epargneRecommandee = Math.max(0, Math.round(totalIncome * 0.20));
      const budgetMax = Math.max(0, Math.round(totalIncome * 0.70));
      const resteLoisirs = Math.max(0, Math.round(totalIncome * 0.10));

      return {
        text: ` Plan Financier Personnalisé — ${nameStr}\n\n` +
          `Bilan actuel :\n` +
          `• Revenus : ${formatGNF(totalIncome)} | Dépenses : ${formatGNF(totalExpense)}\n` +
          `• Solde : ${formatGNF(balance)} ${isDeficit ? ' Déficit' : ' Excédent'}\n\n` +
          (catLines ? `Répartition de vos dépenses :\n${catLines}\n\n` : '') +
          ` Plan pour le mois prochain (Règle 50/30/20) :\n` +
          `• 50% → Besoins essentiels : ${formatGNF(budgetMax)} max\n` +
          `• 20% → Épargne obligatoire : ${formatGNF(epargneRecommandee)} (mettez-le dès réception)\n` +
          `• 10% → Loisirs/imprévus : ${formatGNF(resteLoisirs)}\n\n` +
          ` Stratégies des grands économistes :\n` +
          `• Clason : Payez-vous en premier — épargnez avant de dépenser.\n` +
          `• Kiyosaki : Achetez des actifs (tontine, terrain, revente) avec votre surplus.\n` +
          `• Buffett : Ne dépensez pas ce que vous économisez, économisez ce que vous ne dépensez pas.\n\n` +
          ` Actions immédiates :\n` +
          `1. Réduisez ${topCats[0] ? `vos dépenses en ${topCats[0][0]}` : 'vos dépenses principales'} de 20%.\n` +
          `2. Créez un objectif d'épargne dans l'onglet Budgets.\n` +
          `3. Rejoignez une tontine de confiance pour ${formatGNF(epargneRecommandee)} par mois.`,
        checkNeeded: false
      };
    }

    // Default
    return {
      text: currentAiLang === 'en'
        ? `Hello ${nameStr}!  I can help you with:\n•  Analyzing your spending & income\n•  Building a savings plan for next month\n•  Explaining financial books\n•  Tontine & investment strategies\n\nWhat would you like to explore today?`
        : `Bonjour ${nameStr} !  Je peux vous aider avec :\n•  Analyser vos dépenses et revenus\n•  Construire un plan d'épargne pour le mois prochain\n•  Expliquer des livres de finance\n•  Stratégies de tontines et investissement\n\nQue souhaitez-vous explorer aujourd'hui ?`,
      checkNeeded: false
    };
  };

  // Call Gemini Live API
  const callGeminiApi = async (
    query: string,
    apiKey: string,
    attachment?: { type: 'image' | 'document'; name: string; base64?: string },
    history: ChatMessage[] = []
  ): Promise<string> => {
    const totalIncome = expenses.filter((e: any) => e.type === 'income').reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalExpense = expenses.filter((e: any) => e.type === 'expense').reduce((sum: number, e: any) => sum + e.amount, 0);
    const balance = totalIncome - totalExpense;

    // Build conversation history context
    const historyContext = history.length > 0 
      ? `\n\nCONVERSATION HISTORY (for context):\n${history.slice(-10).map(msg => 
        `${msg.sender === 'user' ? 'User' : 'AI'}: ${removeEmojis(msg.text).slice(0, 200)}`
      ).join('\n')}\n\nRemember: This is context from previous conversations. Adapt your responses based on what the user has asked before.`
      : '';

    let systemPrompt = `
You are "FinTech Guinée AI", an intelligent financial education advisor.
The user is ${user.firstName} ${user.lastName}. Current GNF balance: ${balance}. Total income: ${totalIncome}, total expenses: ${totalExpense}.${historyContext}

RULES:
1. Always adapt your tone to their query. If the user talks about a finance book/author, explain the point of view, how to do the same work, and the strategy based on their profile.
2. IMPORTANT: At the end of explaining a book or document/course, ALWAYS print the exact question: "Êtes-vous satisfait du résultat ?" (or "Are you satisfied with the result?" if talking in English).
3. If they ask about porn, drugs, or general politics, politely redirect them to budget & saving.
4. If they are angry, make a financial joke with emojis.
5. If the user says "repond juste par oui ou non", respond ONLY with the word "Oui" or "Non".
6. If the user says "speak English" or switches to English, reply in English immediately.
7. If the user attaches an image or document: summarize it clearly. If it is an exercise or math problem, guide the user step-by-step.
8. EMOTIONAL INTELLIGENCE: If the user expresses sadness, stress, discouragement, worry, or fatigue (e.g., "je suis triste", "ca ne va pas", "je souffre", "j'ai peur", "c'est dur"), you MUST:
   a. Start with empathy — acknowledge their feeling with warmth and understanding.
   b. Reference their current financial balance if relevant (balance = ${balance} GNF).
   c. Provide a step-by-step recovery plan adapted to Guinea context (small income, community support, mobile money, tontines).
   d. Include a motivational quote from a famous economist or world leader.
   e. End with an open question to keep them engaged.
9. HUMOR: Vary your humor. Use irony, self-deprecation, financial puns, Africa-context jokes. Never repeat the exact same joke twice.
10. MOTIVATION: If the user asks how to succeed, get rich, or needs encouragement, give a powerful response with a quote and a concrete 5-step action plan.
11. FINANCE DEPTH: When asked about income or expenses, calculate the savings rate, categorize spending, and give recommendations based on the 50/30/20 rule. Always mention a famous economist's strategy.
12. FINANCIERS RANKING & COMPARISON: If asked about the ranking of great financiers, world's richest, or how to compare to them:
    a. List top world/African figures (e.g., Mansa Musa, Warren Buffett, Aliko Dangote, John D. Rockefeller, Robert Kiyosaki).
    b. Provide a clear comparison layout: compare their massive investment rates (50%-90%) and strict budgeting to the user's current metrics (Savings rate: ${totalIncome > 0 ? Math.round((balance/totalIncome)*100) : 0}%, Current balance: ${balance} GNF).
    c. Explain actionable steps for the user to copy their models (e.g. starting tontines like Mansa Musa's community wealth, budgeting like Rockefeller, buying assets like Kiyosaki).
    d. End with "Êtes-vous satisfait du résultat ?".
13. HOW TO NOTE TONTINE / COTISATION: If the user asks how to note, record, or add their tontine/cotisation payments:
    a. Walk them through these 6 steps:
       1) Go to the Home Screen and click the "Add (+)" action button in the bottom right corner.
       2) Enter the amount of the cotisation (e.g., 50,000 GNF).
       3) Choose the type: "Dépense" (Expense) to record a payment, or "Revenu" (Income) if it's their turn to receive the tontine pool payout.
       4) Choose the category: "Épargne" (or type "Tontine" in the description).
       5) Add a description like "Cotisation Tontine Juin" to remember it.
       6) Click save/validate.
    b. Keep the layout well formatted with emojis.
`;

    const parts: any[] = [{ text: systemPrompt + `\n\nUSER QUESTION: ${query}` }];

    if (attachment && attachment.type === 'image' && attachment.base64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: attachment.base64
        }
      });
    } else if (attachment && attachment.type === 'document' && attachment.base64) {
      parts.push({
        text: `ATTACHED DOCUMENT TEXT/CONTENT:\n"""\n${attachment.base64}\n"""`
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      }
    );

    if (!response.ok) throw new Error("Gemini API Error");
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  };

  // Satisfaction more details button handler
  const handleRequestMoreInfo = async () => {
    if (!activeId) return;
    setIsLoading(true);

    // Simulate generating a massive 50+ lines explanation
    const deepExplanation = currentAiLang === 'en'
      ? ` EXTENDED FINANCIAL EDUCATION DIGEST (50+ Lines Deep analysis)\n\n` +
        `Robert Kiyosaki's core thesis in "Rich Dad Poor Dad" is that wealth is not about how much money you make, but how much money you keep. Here is a granular, chapter-by-chapter breakdown of key principles:\n\n` +
        `• Chapter 1: The Rich Don't Work for Money\n  Middle-class work for money. The rich make money work for them. Fear and greed keep people trapped in the Rat Race. By learning to look for opportunities, you can build systems that work for you.\n\n` +
        `• Chapter 2: Why Teach Financial Literacy?\n  It's not about how much you make, it's about how much you keep. Assets put money in your pocket. Liabilities take money out. A house is usually a liability because it costs cashflow.\n\n` +
        `• Chapter 3: Mind Your Own Business\n  Keep your daytime job, but start buying real assets, not liabilities or personal effects. Start investing in assets like stocks, bonds, income-generating real estate, and intellectual property.\n\n` +
        `• Chapter 4: The History of Taxes & Power of Corporations\n  Corporations earn money, spend everything they can, and only pay taxes on what's left. Individuals earn money, get taxed first, and try to live on what's left.\n\n` +
        `• Chapter 5: The Rich Invent Money\n  The mind is our most powerful asset. Financial intelligence allows you to see options that others miss, find capital, and organize smart investments.\n\n` +
        `• Chapter 6: Work to Learn—Don't Work for Money\n  Seek jobs where you learn more than you earn. Develop key skills: sales, marketing, public speaking, and leadership.\n\n` +
        `• Practical Application for Guinea:\n` +
        `1. Start putting 100,000 GNF into Orange Money savings monthly.\n` +
        `2. Join a trusted local merchant tontine with rules of safety.\n` +
        `3. Avoid buying unnecessary electronic items or brand new cars which instantly lose value.\n` +
        `4. Reinvest tontine outputs into micro-commerce, real estate, or small-scale farming in Dubréka or Coyah.`
      : ` RAPPORT D'ÉDUCATION FINANCIÈRE APPROFONDI (Plus de 50 lignes de détails)\n\n` +
        `Le livre "Père riche, Père pauvre" de Robert Kiyosaki révolutionne notre perception de l'argent. Voici une analyse approfondie des 6 leçons fondamentales pour changer d'état d'esprit et atteindre l'indépendance financière :\n\n` +
        `• Leçon 1 : Les Riches ne travaillent pas pour l'argent\n  La classe moyenne est prisonnière de la "Foire d'Empoigne" (Rat Race). Poussée par la peur du manque et l'avidité, elle travaille dur pour un salaire fixe qui est immédiatement dépensé. Les riches, eux, créent des opportunités et des actifs qui génèrent des flux de trésorerie passifs sans intervention quotidienne.\n\n` +
        `• Leçon 2 : Pourquoi enseigner l'éducation financière ?\n  Kiyosaki insiste sur le fait que la réussite ne se mesure pas à ce que vous gagnez, mais à ce que vous conservez. Il définit :\n  - Un Actif : Tout ce qui met de l'argent dans votre poche (comptes épargne productifs, parts de sociétés, brevets, immobilier loué).\n  - Un Passif : Tout ce qui sort de l'argent de votre poche (crédit auto, loyer personnel, vêtements de luxe, abonnements non productifs).\n\n` +
        `• Leçon 3 : Occupez-vous de vos propres affaires\n  Ne confondez pas votre métier et vos affaires. Votre métier paie vos factures immédiates. Vos affaires constituent votre colonne d'actifs. Il recommande de garder son emploi tout en investissant méthodiquement dans des actifs autonomes.\n\n` +
        `• Leçon 4 : L'histoire des impôts et le pouvoir des entreprises\n  Les riches utilisent les structures juridiques (les sociétés) pour optimiser la fiscalité. Une société gagne de l'argent, dépense tout ce qu'elle peut légalement pour son fonctionnement, et n'est imposée que sur le reliquat. Le salarié est taxé à la source avant de pouvoir dépenser.\n\n` +
        `• Leçon 5 : Les Riches inventent l'argent\n  Dans le monde réel, ce ne sont pas les plus intelligents qui réussissent, mais les plus audacieux. L'intelligence financière permet d'identifier des opportunités invisibles aux yeux des autres, de lever des fonds de façon créative, et de s'entourer d'experts.\n\n` +
        `• Leçon 6 : Travaillez pour apprendre, ne travaillez pas pour l'argent\n  Kiyosaki conseille aux jeunes diplômés de choisir un emploi en fonction de ce qu'ils y apprendront (vente, marketing, communication, gestion d'équipe) plutôt que de ce qu'ils y gagneront à court terme.\n\n` +
        `• Application en Guinée (Conakry, Kankan, Labé) :\n` +
        `1. Mettez en place un virement automatique de 15% de vos revenus sur un compte Mobile Money dédié à l'investissement.\n` +
        `2. Participez à une tontine professionnelle uniquement pour financer des actifs (ex: achat d'un terrain, achat de marchandises à revendre) et jamais pour des biens de consommation.\n` +
        `3. Apprenez une compétence à forte valeur ajoutée en ligne (informatique, gestion de projets, commerce import-export) pour créer une source de revenus secondaire.\n` +
        `4. Réduisez le coût de votre loyer et de vos transports à Conakry en habitant plus près de vos pôles d'activité ou en utilisant les transports collectifs.`;

    setTimeout(() => {
      const moreMsg: ChatMessage = {
        id: Date.now().toString() + '-more',
        text: deepExplanation,
        sender: 'ai',
        timestamp: Date.now(),
      };
      addMessage(activeId, moreMsg, userId);
      setIsLoading(false);
      setLastMessageIdToCheck(null);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedAttachment) return;
    if (!activeId) return;

    const userText = inputText;
    setInputText('');

    let textToSend = userText;
    if (selectedAttachment) {
      textToSend = `[Fichier joint : ${selectedAttachment.name}] ${userText}`;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString() + '-user',
      text: textToSend,
      sender: 'user',
      timestamp: Date.now(),
      attachmentType: selectedAttachment?.type,
      attachmentUri: selectedAttachment?.uri,
      attachmentName: selectedAttachment?.name,
    };

    const currentAttachment = selectedAttachment;
    addMessage(activeId, userMsg, userId);
    setSelectedAttachment(null);
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      let aiResponseText = "";
      let checkNeeded = false;

      // Get conversation history for context
      const conversationHistory = getConversationHistory();
      const fullHistory = [...activeConversation?.messages || [], ...conversationHistory];

      if (user.geminiApiKey) {
        try {
          aiResponseText = await callGeminiApi(
            userText,
            user.geminiApiKey,
            currentAttachment ? {
              type: currentAttachment.type,
              name: currentAttachment.name,
              base64: currentAttachment.base64
            } : undefined,
            fullHistory
          );
          // Check if response contains satisfaction question
          if (aiResponseText.toLowerCase().includes("satisfait")) {
            checkNeeded = true;
          }
        } catch (error: any) {
          console.error('Gemini API error:', error);
          
          // Provide specific error messages based on error type
          let errorMessage = '';
          if (error?.message?.includes('API key')) {
            errorMessage = '️ Erreur: Clé API Gemini invalide. Veuillez vérifier vos paramètres.';
          } else if (error?.message?.includes('quota') || error?.message?.includes('429')) {
            errorMessage = '️ Erreur: Quota API dépassé. L\'IA utilise le mode local.';
          } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
            errorMessage = '️ Erreur: Problème de connexion. L\'IA utilise le mode local.';
          } else {
            errorMessage = '️ Erreur: Service temporairement indisponible. L\'IA utilise le mode local.';
          }
          
          const offline = getOfflineResponse(userText, currentAttachment?.name, fullHistory);
          aiResponseText = errorMessage + '\n\n' + offline.text;
          checkNeeded = offline.checkNeeded;
        }
      } else {
        await new Promise(res => setTimeout(res, 800));
        const offline = getOfflineResponse(userText, currentAttachment?.name, fullHistory);
        aiResponseText = offline.text;
        checkNeeded = offline.checkNeeded;
      }

      const aiMsgId = Date.now().toString() + '-ai';
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        text: aiResponseText,
        sender: 'ai',
        timestamp: Date.now(),
      };

      addMessage(activeId, aiMsg, userId);
      
      // Speak the AI response if TTS is enabled
      if (ttsEnabled) {
        speak(aiResponseText);
      }

      if (checkNeeded) {
        setLastMessageIdToCheck(aiMsgId);
      } else {
        setLastMessageIdToCheck(null);
      }
    } catch (error: any) {
      console.error('Error in handleSend:', error);
      
      // Show user-friendly error message
      const errorMsg = error?.message || 'Une erreur est survenue. Veuillez réessayer.';
      Alert.alert(
        'Erreur',
        errorMsg,
        [{ text: 'OK', onPress: () => {} }]
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      height: '92%',
      flexDirection: 'row',
      overflow: 'hidden',
    },
    // Sidebar for history
    sidebar: {
      width: sidebarOpen ? 240 : 0,
      height: '100%',
      backgroundColor: colors.surfaceLight,
      borderRightWidth: sidebarOpen ? 1 : 0,
      borderRightColor: colors.border,
      padding: sidebarOpen ? Spacing.sm : 0,
    },
    sidebarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
      marginTop: 10,
    },
    convItem: {
      padding: Spacing.sm + 2,
      borderRadius: Radius.md,
      marginBottom: Spacing.xs,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    convActive: {
      backgroundColor: `${colors.primary}15`,
    },
    convText: {
      fontSize: Typography.sm,
      color: colors.text,
      flex: 1,
      marginRight: 6,
    },
    // Main Content Chat
    mainChat: {
      flex: 1,
      height: '100%',
      paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    },
    handle: {
      width: 44,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: Radius.full,
      alignSelf: 'center',
      marginVertical: Spacing.sm,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: colors.text },
    statusIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    chatArea: {
      flex: 1,
      padding: Spacing.md,
    },
    chatScroll: {
      flex: 1,
    },
    msgRow: {
      flexDirection: 'row',
      marginVertical: Spacing.sm,
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    aiRow: {
      justifyContent: 'flex-start',
    },
    msgBubble: {
      maxWidth: '82%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: Radius.lg,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: Radius.xs,
    },
    aiBubble: {
      backgroundColor: colors.surfaceLight,
      borderBottomLeftRadius: Radius.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userText: {
      color: '#fff',
      fontSize: Typography.base - 1,
      lineHeight: 20,
    },
    aiText: {
      color: colors.text,
      fontSize: Typography.base - 1,
      lineHeight: 20,
    },
    attachmentPreview: {
      backgroundColor: `${colors.textMuted}10`,
      borderRadius: Radius.md,
      padding: Spacing.xs,
      marginBottom: Spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    attachmentImg: {
      width: 40,
      height: 40,
      borderRadius: Radius.sm,
    },
    // Toolbar & Input
    toolbar: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      backgroundColor: colors.surface,
      gap: Spacing.sm,
      alignItems: 'center',
    },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      gap: Spacing.sm,
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.surfaceLight,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? 10 : 8,
      paddingBottom: Platform.OS === 'ios' ? 10 : 8,
      fontSize: Typography.base,
      maxHeight: 120,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    micActiveBtn: {
      backgroundColor: colors.danger,
    },
    satisfactionBar: {
      backgroundColor: `${colors.warning}15`,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginVertical: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.warning,
      gap: Spacing.sm,
    },
    satisfactionTitle: {
      fontSize: Typography.sm,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    satisfactionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: Spacing.sm,
    },
    satBtn: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      alignItems: 'center',
    },
    satBtnYes: {
      backgroundColor: colors.success,
    },
    satBtnNo: {
      backgroundColor: colors.primary,
    },
    satBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: Typography.xs + 1,
    },
    emptyChatContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 280,
      paddingTop: 80,
    },
    emptyGreeting: {
      fontSize: 28,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    emptySub: {
      fontSize: Typography.base + 2,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            
            {/* ── SIDEBAR CONVERSATIONS ────────────────────── */}
            {sidebarOpen && (
              <View style={s.sidebar}>
                <View style={s.sidebarHeader}>
                  <Text style={{ fontWeight: 'bold', color: colors.text }}>Historique</Text>
                  <Pressable onPress={() => setSidebarOpen(false)}>
                    <MaterialCommunityIcons name="menu-open" size={24} color={colors.text} />
                  </Pressable>
                </View>

                <Pressable
                  style={[s.convItem, { backgroundColor: accentColor, justifyContent: 'center', gap: 6 }]}
                  onPress={handleCreateNew}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Nouveau chat</Text>
                </Pressable>

                {/* Search bar */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderRadius: Radius.full,
                  borderWidth: 1, borderColor: colors.border,
                  paddingHorizontal: 10, marginBottom: 8,
                }}>
                  <MaterialCommunityIcons name="magnify" size={16} color={colors.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 12, color: colors.text, paddingVertical: 6, marginLeft: 6 }}
                    placeholder="Rechercher..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <MaterialCommunityIcons name="close-circle" size={14} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {conversations
                    .filter(c => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      const titleMatch = c.title.toLowerCase().includes(q);
                      const msgMatch = c.messages.some(m => m.text.toLowerCase().includes(q));
                      return titleMatch || msgMatch;
                    })
                    .map((c) => {
                      const matchingMsg = searchQuery.trim()
                        ? c.messages.find(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
                        : null;
                      return (
                        <Pressable
                          key={c.id}
                          style={[s.convItem, c.id === activeId && { ...s.convActive, backgroundColor: accentColor + '15' }]}
                          onPress={() => { setActiveId(c.id); setSidebarOpen(false); setSearchQuery(''); }}
                        >
                          <MaterialCommunityIcons name="chat-outline" size={16} color={colors.textMuted} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.convText} numberOfLines={1}>{c.title}</Text>
                            {matchingMsg && (
                              <Text numberOfLines={1} style={{ fontSize: 10, color: accentColor, marginTop: 2 }}>
                                {`"${removeEmojis(matchingMsg.text).slice(0, 28)}..."`}
                              </Text>
                            )}
                          </View>
                          <Pressable onPress={() => deleteConversation(c.id, userId)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
                          </Pressable>
                        </Pressable>
                      );
                    })}
                  {!!searchQuery.trim() && conversations.filter(c => {
                    const q = searchQuery.toLowerCase();
                    return c.title.toLowerCase().includes(q) || c.messages.some(m => m.text.toLowerCase().includes(q));
                  }).length === 0 && (
                    <View style={{ alignItems: 'center', paddingTop: 20 }}>
                      <MaterialCommunityIcons name="magnify-close" size={28} color={colors.border} />
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                        Aucune conversation trouvée
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* ── Paramètres IA (bas de sidebar) ─────── */}
                <Pressable
                  style={[s.convItem, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 12, gap: 8 }]}
                  onPress={() => { setSidebarOpen(false); setAiSettingsVisible(true); }}
                >
                  <MaterialCommunityIcons name="cog-outline" size={20} color={accentColor} />
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: Typography.sm }}>Paramètres IA</Text>
                  {archivedConversations.length > 0 && (
                    <View style={{ backgroundColor: accentColor, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{archivedConversations.length}</Text>
                    </View>
                  )}
                </Pressable>

                {/* ── Sync Status Indicator ──────────────── */}
                <View style={[s.convItem, { gap: 8, opacity: 0.7 }]}>
                  <MaterialCommunityIcons 
                    name={isOnline ? 'cloud-check' : 'cloud-off-outline'} 
                    size={16} 
                    color={isOnline ? colors.success : colors.danger} 
                  />
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    {syncStatus === 'syncing' ? 'Synchronisation...' : 
                     syncStatus === 'error' ? 'Erreur sync' :
                     isOnline ? 'Connecté' : 'Hors ligne'}
                  </Text>
                  {!isOnline && (
                    <Pressable onPress={() => manualSync(userId)}>
                      <MaterialCommunityIcons name="refresh" size={14} color={accentColor} />
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* ── AI SETTINGS MODAL ─────────────────────── */}
            <AiSettingsModal
              visible={aiSettingsVisible}
              onClose={() => setAiSettingsVisible(false)}
              archivedConversations={archivedConversations}
              onRestoreConversation={restoreConversation}
              onPermanentlyDelete={permanentlyDelete}
              onClearArchive={() => clearArchive(userId)}
              selectedLang={aiLang}
              onSelectLang={setAiLang}
              accentColor={accentColor}
              onSelectAccent={setAccentColor}
              userId={userId}
            />

            {/* ── MAIN CHAT VIEW ─────────────────────────── */}
            <View style={s.mainChat}>
              <View style={s.handle} />

              {/* Header */}
              <View style={s.header}>
                <View style={s.headerLeft}>
                  <Pressable onPress={() => setSidebarOpen(!sidebarOpen)}>
                    <MaterialCommunityIcons name="menu" size={24} color={colors.text} />
                  </Pressable>
                  <MaterialCommunityIcons name="robot" size={24} color={colors.primary} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.title}>FinTech Guinée IA</Text>
                      <View style={s.statusIndicator} />
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      {user.geminiApiKey ? "Gemini Online" : "Moteur Local Actif"}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {/* TTS Toggle Button */}
                  <Pressable 
                    style={[s.closeBtn, ttsEnabled && { backgroundColor: accentColor + '20' }]} 
                    onPress={() => {
                      setTtsEnabled(!ttsEnabled);
                      if (isSpeaking) {
                        stopSpeaking();
                      }
                    }}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons 
                      name={ttsEnabled ? 'volume-high' : 'volume-off'} 
                      size={18} 
                      color={ttsEnabled ? accentColor : colors.textMuted} 
                    />
                  </Pressable>
                  <Pressable style={s.closeBtn} onPress={onClose} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              {/* Chat Area */}
              <View style={s.chatArea}>
                <ScrollView
                  ref={scrollViewRef}
                  style={s.chatScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {!(activeConversation?.messages?.some(m => m.sender === 'user')) && !inputText.trim() ? (
                    <View style={s.emptyChatContainer}>
                      <Text style={s.emptyGreeting}>{greeting}, {nameStr}</Text>
                      <Text style={s.emptySub}>Comment puis-je vous aider ?</Text>
                    </View>
                  ) : (
                    activeConversation?.messages?.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <View key={msg.id} style={[s.msgRow, isUser ? s.userRow : s.aiRow]}>
                          <View style={[s.msgBubble, isUser ? s.userBubble : s.aiBubble]}>
                            <Text style={isUser ? s.userText : s.aiText}>{removeEmojis(msg.text)}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}

                  {/* Satisfaction check prompt */}
                  {lastMessageIdToCheck && (
                    <View style={s.satisfactionBar}>
                      <Text style={s.satisfactionTitle}>
                        Êtes-vous satisfait du résultat ?
                      </Text>
                      <View style={s.satisfactionButtons}>
                        <Pressable
                          style={[s.satBtn, s.satBtnYes]}
                          onPress={() => {
                            setLastMessageIdToCheck(null);
                            const yesMsg: ChatMessage = {
                              id: Date.now().toString(),
                              text: "Super ! Ravi de vous avoir aidé.",
                              sender: 'ai',
                              timestamp: Date.now(),
                            };
                            addMessage(activeId!, yesMsg, userId);
                          }}
                        >
                          <Text style={s.satBtnText}>Oui, c'est parfait !</Text>
                        </Pressable>
                        <Pressable
                          style={[s.satBtn, s.satBtnNo]}
                          onPress={handleRequestMoreInfo}
                        >
                          <Text style={s.satBtnText}>Non, plus d'informations</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {isLoading && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={{ fontSize: Typography.xs, color: colors.textMuted }}>
                        L'assistant analyse...
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* Selected Attachment Preview */}
              {selectedAttachment && (
                <View style={{ paddingHorizontal: Spacing.md }}>
                  <View style={s.attachmentPreview}>
                    {selectedAttachment.type === 'image' ? (
                      <Image source={{ uri: selectedAttachment.uri }} style={s.attachmentImg} />
                    ) : (
                      <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.primary} />
                    )}
                    <Text style={{ flex: 1, color: colors.text, fontSize: 12 }} numberOfLines={1}>
                      {selectedAttachment.name}
                    </Text>
                    <Pressable onPress={() => setSelectedAttachment(null)}>
                      <MaterialCommunityIcons name="close-circle" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Voice recording layout status */}
              {isRecording && (
                <View style={{ padding: Spacing.sm, backgroundColor: `${colors.danger}15`, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator size="small" color={colors.danger} />
                  <Text style={{ color: colors.danger, fontWeight: 'bold' }}>
                    {currentAiLang === 'fr' ? `Écoute en cours... ${recordingTimer}s` : `Listening... ${recordingTimer}s`}
                  </Text>
                  <Pressable style={{ padding: 4 }} onPress={stopRecording}>
                    <MaterialCommunityIcons name="stop-circle" size={24} color={colors.danger} />
                  </Pressable>
                </View>
              )}

              {/* Attach popup menu */}
              {attachMenuOpen && (
                <View style={{
                  position: 'absolute',
                  bottom: 110,
                  left: Spacing.md,
                  backgroundColor: colors.surface,
                  borderRadius: Radius.xl,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                  zIndex: 99,
                  overflow: 'hidden',
                }}>
                  {[
                    { icon: 'camera', label: 'Prendre une photo', action: () => { pickImage(true); setAttachMenuOpen(false); } },
                    { icon: 'image', label: 'Galerie / Image', action: () => { pickImage(false); setAttachMenuOpen(false); } },
                    { icon: 'paperclip', label: 'Document / Fichier', action: () => { pickDocument(); setAttachMenuOpen(false); } },
                  ].map((item, idx) => (
                    <Pressable
                      key={item.icon}
                      onPress={item.action}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingVertical: 14, paddingHorizontal: Spacing.lg,
                        borderBottomWidth: idx < 2 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: accentColor + '15', justifyContent: 'center', alignItems: 'center' }}>
                        <MaterialCommunityIcons name={item.icon as any} size={20} color={accentColor} />
                      </View>
                      <Text style={{ fontSize: Typography.base, color: colors.text, fontWeight: '500' }}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Text Input Row */}
              <View style={s.inputArea}>
                {/* + Attach Button */}
                <Pressable
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: attachMenuOpen ? accentColor : colors.surfaceLight,
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: 1, borderColor: attachMenuOpen ? accentColor : colors.border,
                  }}
                  onPress={() => setAttachMenuOpen(prev => !prev)}
                >
                  <MaterialCommunityIcons
                    name={attachMenuOpen ? 'close' : 'plus'}
                    size={22}
                    color={attachMenuOpen ? '#fff' : colors.textMuted}
                  />
                </Pressable>

                <TextInput
                  style={s.textInput}
                  placeholder="Posez votre question..."
                  placeholderTextColor={colors.textMuted}
                  value={inputText}
                  onChangeText={t => { setInputText(t); if (attachMenuOpen) setAttachMenuOpen(false); }}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  multiline
                  onKeyPress={({ nativeEvent }: any) => {
                    if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                      nativeEvent.preventDefault?.();
                      handleSend();
                    }
                  }}
                />

                <Pressable
                  style={[s.sendBtn, { backgroundColor: accentColor }, isRecording && s.micActiveBtn]}
                  onPress={isRecording ? stopRecording : (inputText.trim() ? handleSend : startRecording)}
                >
                  <MaterialCommunityIcons
                    name={inputText.trim() ? 'send' : (isRecording ? 'microphone-off' : 'microphone')}
                    size={20}
                    color="#fff"
                  />
                </Pressable>
              </View>
            </View>

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
