/**
 * Normalise un numéro de téléphone pour la Guinée.
 * Supprime tous les caractères non numériques et ne garde que les 9 derniers chiffres.
 * Exemple : "+224 622 12 34 56" -> "622123456"
 * Exemple : "622 12 34 56" -> "622123456"
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : digits;
};
