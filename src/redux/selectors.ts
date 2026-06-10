// src/redux/selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';
import { Expense } from './expenseSlice';

/**
 * Retourne uniquement les dépenses du numéro de téléphone actuellement connecté.
 * Chaque utilisateur ne voit QUE ses propres transactions.
 */
export const selectUserExpenses = createSelector(
  (state: RootState): Expense[] => state.expenses.expenses,
  (state: RootState): string => state.user.phone,
  (expenses: Expense[], phone: string): Expense[] =>
    phone ? expenses.filter((e) => e.phone === phone) : []
);
