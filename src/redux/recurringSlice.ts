import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RecurringTransaction {
  id: number;
  name: string;
  category: string;
  amount: number;
  currency: string;
  icon: string;
  type: 'expense' | 'income';
  frequency: 'monthly' | 'weekly';
  /** Day of month (1–31) for monthly, or day of week (0=Sun) for weekly */
  dayOfPeriod: number;
  active: boolean;
  /** ISO date string of last time this was auto-generated */
  lastGeneratedMonth: string | null;
}

interface RecurringState {
  items: RecurringTransaction[];
}

const initialState: RecurringState = {
  items: [],
};

const recurringSlice = createSlice({
  name: 'recurring',
  initialState,
  reducers: {
    addRecurring: (state, action: PayloadAction<Omit<RecurringTransaction, 'id'>>) => {
      state.items.push({ ...action.payload, id: Date.now() });
    },
    updateRecurring: (state, action: PayloadAction<RecurringTransaction>) => {
      const idx = state.items.findIndex(r => r.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
    deleteRecurring: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(r => r.id !== action.payload);
    },
    toggleRecurring: (state, action: PayloadAction<number>) => {
      const item = state.items.find(r => r.id === action.payload);
      if (item) item.active = !item.active;
    },
    markGenerated: (state, action: PayloadAction<{ id: number; monthKey: string }>) => {
      const item = state.items.find(r => r.id === action.payload.id);
      if (item) item.lastGeneratedMonth = action.payload.monthKey;
    },
  },
});

export const { addRecurring, updateRecurring, deleteRecurring, toggleRecurring, markGenerated } = recurringSlice.actions;
export default recurringSlice.reducer;
