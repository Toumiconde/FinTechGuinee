import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface CategoryDetails {
  icon: string;
  color: string;
}

const defaultColor = '#64748B'; // Slate 500

export const getCategoryDetails = (categoryName: string, themeColors: any): CategoryDetails => {
  const name = categoryName.toLowerCase().trim();
  // === ALIMENTATION ===
  if (['mangue', 'pomme', 'banane', 'orange', 'fruit', 'fraise', 'ananas'].some(k => name.includes(k))) return { icon: 'food-apple', color: '#F59E0B' };
  if (['viande', 'poulet', 'boeuf', 'poisson', 'mouton'].some(k => name.includes(k))) return { icon: 'food-drumstick', color: '#F59E0B' };
  if (['riz', 'couscous', 'fonio', 'attieke'].some(k => name.includes(k))) return { icon: 'bowl-rice', color: '#F59E0B' };
  if (['pain', 'baguette', 'croissant', 'boulangerie'].some(k => name.includes(k))) return { icon: 'baguette', color: '#F59E0B' };
  if (['légume', 'legume', 'tomate', 'carotte', 'oignon', 'salade'].some(k => name.includes(k))) return { icon: 'carrot', color: '#F59E0B' };
  if (['boisson', 'eau', 'jus', 'coca', 'biere', 'café', 'cafe'].some(k => name.includes(k))) return { icon: 'cup-water', color: '#F59E0B' };
  if (['restaurant', 'resto', 'manger', 'repas', 'diner', 'déjeuner', 'fast-food', 'shawarma'].some(k => name.includes(k))) return { icon: 'silverware-fork-knife', color: '#F59E0B' };
  if (['alimentation', 'supermarché', 'marché', 'courses'].some(k => name.includes(k))) return { icon: 'cart', color: '#F59E0B' };

  // === TRANSPORT ===
  if (['moto', 'motard', 'scooter'].some(k => name.includes(k))) return { icon: 'motorbike', color: '#3B82F6' };
  if (['essence', 'carburant', 'gasoil', 'station'].some(k => name.includes(k))) return { icon: 'gas-station', color: '#3B82F6' };
  if (['taxi', 'voiture', 'deplacement', 'transport'].some(k => name.includes(k))) return { icon: 'taxi', color: '#3B82F6' };
  if (['bus', 'magbana', 'minibus'].some(k => name.includes(k))) return { icon: 'bus', color: '#3B82F6' };
  if (['avion', 'vol', 'billet'].some(k => name.includes(k))) return { icon: 'airplane', color: '#3B82F6' };
  if (['train'].some(k => name.includes(k))) return { icon: 'train', color: '#3B82F6' };

  // === SANTE ===
  if (['médicament', 'medicament', 'comprimé', 'pharmacie', 'sirop', 'ordonnance'].some(k => name.includes(k))) return { icon: 'pill', color: '#EF4444' };
  if (['hopital', 'hôpital', 'clinique', 'docteur', 'consultation', 'sante', 'santé', 'medecin'].some(k => name.includes(k))) return { icon: 'hospital-building', color: '#EF4444' };
  if (['dent', 'dentiste'].some(k => name.includes(k))) return { icon: 'tooth', color: '#EF4444' };
  if (['lunette', 'ophtalmologue'].some(k => name.includes(k))) return { icon: 'glasses', color: '#EF4444' };

  // === VETEMENTS / BEAUTE ===
  if (['pantalon', 'jean', 'culotte', 'short'].some(k => name.includes(k))) return { icon: 'wardrobe', color: '#D946EF' }; // Utilise wardrobe comme fallback vetement général
  if (['chemise', 't-shirt', 'tshirt', 'tricot', 'vetement', 'vêtement', 'habit', 'robe'].some(k => name.includes(k))) return { icon: 'tshirt-crew', color: '#D946EF' };
  if (['chaussure', 'basket', 'sandale', 'chaussette'].some(k => name.includes(k))) return { icon: 'shoe-sneaker', color: '#D946EF' };
  if (['coiffure', 'cheveux', 'salon', 'barbier'].some(k => name.includes(k))) return { icon: 'content-cut', color: '#D946EF' };
  if (['boutique', 'shopping'].some(k => name.includes(k))) return { icon: 'shopping', color: '#D946EF' };

  // === EDUCATION ===
  if (['cahier', 'livre', 'stylo', 'fourniture'].some(k => name.includes(k))) return { icon: 'book-open-page-variant', color: '#8B5CF6' };
  if (['education', 'école', 'ecole', 'université', 'scolarité', 'frais', 'formation'].some(k => name.includes(k))) return { icon: 'school', color: '#8B5CF6' };

  // === TELECOMMUNICATION ===
  if (['internet', 'wifi', 'connexion', 'data'].some(k => name.includes(k))) return { icon: 'wifi', color: '#10B981' };
  if (['téléphone', 'telephone', 'crédit', 'forfait', 'orange', 'mtn', 'cellcom', 'appel'].some(k => name.includes(k))) return { icon: 'cellphone', color: '#10B981' };

  // === EPARGNE / FINANCE ===
  if (['epargne', 'épargne', 'tontine', 'banque'].some(k => name.includes(k))) return { icon: 'piggy-bank', color: '#14B8A6' };
  if (['virement', 'transfert', 'orange money', 'mobile money', 'frais', 'dette'].some(k => name.includes(k))) return { icon: 'bank-transfer', color: '#14B8A6' };

  // === LOISIRS ===
  if (['football', 'sport', 'salle', 'gym', 'match'].some(k => name.includes(k))) return { icon: 'soccer', color: '#F43F5E' };
  if (['cinéma', 'cinema', 'film', 'netflix'].some(k => name.includes(k))) return { icon: 'movie-open', color: '#F43F5E' };
  if (['musique', 'concert', 'fête', 'soirée'].some(k => name.includes(k))) return { icon: 'music-note', color: '#F43F5E' };
  if (['loisir', 'jeu', 'sortie'].some(k => name.includes(k))) return { icon: 'gamepad-variant', color: '#F43F5E' };

  // === MAISON / FACTURES ===
  if (['électricité', 'electricite', 'edg', 'courant'].some(k => name.includes(k))) return { icon: 'lightning-bolt', color: '#0EA5E9' };
  if (['eau', 'seg'].some(k => name.includes(k))) return { icon: 'water-pump', color: '#0EA5E9' };
  if (['loyer', 'maison', 'logement', 'location'].some(k => name.includes(k))) return { icon: 'home', color: '#0EA5E9' };
  if (['télévision', 'tv', 'canal'].some(k => name.includes(k))) return { icon: 'television', color: '#0EA5E9' };

  // === REVENUS ===
  if (['salaire', 'paie'].some(k => name.includes(k))) return { icon: 'cash-multiple', color: '#10B981' };
  if (['prime', 'bonus'].some(k => name.includes(k))) return { icon: 'star-circle', color: '#10B981' };
  if (['remboursement'].some(k => name.includes(k))) return { icon: 'cash-refund', color: '#10B981' };
  if (['vente', 'bénéfice', 'benefice'].some(k => name.includes(k))) return { icon: 'tag-outline', color: '#10B981' };

  // === DIVERS ===
  if (['cadeau', 'don', 'offrande'].some(k => name.includes(k))) return { icon: 'gift', color: '#F59E0B' };

  // Default fallback
  return { icon: 'tag-outline', color: themeColors.primary || defaultColor };
};
