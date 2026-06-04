import { store } from '../redux/store';

// ─── Formater un montant en devise dynamique ───────────────────────────────────────────────
export const formatGNF = (amount: number): string => {
  const state = store.getState();
  const currency = state.user?.currency || 'GNF';
  if (amount === null || amount === undefined || isNaN(amount)) return `0 ${currency}`;
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + currency;
};

// ─── Formater avec décimales ──────────────────────────────────────────────────
export const formatMoyenne = (amount: number): string => {
  const state = store.getState();
  const currency = state.user?.currency || 'GNF';
  if (!amount || isNaN(amount)) return `0 ${currency}`;
  return Number(amount)
    .toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' ' + currency;
};

// ─── Valider un montant ───────────────────────────────────────────────────────
export const isValidAmount = (value: string): boolean => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};