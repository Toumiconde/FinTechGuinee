import { configureStore, combineReducers } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import expenseReducer from './expenseSlice';
import userReducer from './userSlice';
import recurringReducer from './recurringSlice';
import goalsReducer from './goalsSlice';
import { supabase } from '../utils/supabaseClient';

const appReducer = combineReducers({
  expenses: expenseReducer,
  user: userReducer,
  recurring: recurringReducer,
  goals: goalsReducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'HYDRATE_STATE') {
    return {
      ...state,
      ...action.payload,
    };
  }
  return appReducer(state, action);
};

let isHydrated = false;

const persistenceMiddleware = (storeAPI: any) => (next: any) => (action: any) => {
  if (action.type === 'HYDRATE_STATE') {
    isHydrated = true;
  }

  const result = next(action);

  if (
    isHydrated &&
    action.type !== 'HYDRATE_STATE' &&
    !action.type.startsWith('persist/') &&
    !action.type.startsWith('@@')
  ) {
    const state = storeAPI.getState();
    AsyncStorage.setItem('@fintech_app_state', JSON.stringify(state))
      .catch(err => console.error('Persist error', err));
  }
  return result;
};

const supabaseSyncMiddleware = (storeAPI: any) => (next: any) => (action: any) => {
  const result = next(action);

  if (isHydrated) {
    const state = storeAPI.getState();
    const phone = state.user?.phone;

    if (phone) {
      const type = action.type;

      if (type.startsWith('expenses/')) {
        (async () => {
          try {
            if (type === 'expenses/addExpense') {
              const newExpense = state.expenses.expenses[0];
              if (newExpense) {
                await supabase.from('expenses').insert({
                  id: String(newExpense.id),
                  phone,
                  category: newExpense.category,
                  amount: newExpense.amount,
                  currency: newExpense.currency,
                  description: newExpense.description || '',
                  icon: newExpense.icon,
                  date: newExpense.date,
                  type: newExpense.type || 'expense',
                  status: newExpense.status,
                });
              }
            } 
            else if (type === 'expenses/addPlannedExpenses') {
              const count = action.payload.length;
              const newPlanned = state.expenses.expenses.slice(0, count);
              for (const item of newPlanned) {
                await supabase.from('expenses').insert({
                  id: String(item.id),
                  phone,
                  category: item.category,
                  amount: item.amount,
                  currency: item.currency,
                  description: item.description || '',
                  icon: item.icon,
                  date: item.date,
                  type: item.type || 'expense',
                  status: item.status,
                });
              }
            } 
            else if (type === 'expenses/updateExpense') {
              const updated = action.payload;
              await supabase.from('expenses').upsert({
                id: String(updated.id),
                phone,
                category: updated.category,
                amount: updated.amount,
                currency: updated.currency,
                description: updated.description || '',
                icon: updated.icon,
                date: updated.date,
                type: updated.type || 'expense',
                status: updated.status,
              });
            } 
            else if (type === 'expenses/confirmPlannedExpense') {
              const confirmedItem = state.expenses.expenses.find((e: any) => e.id === action.payload.id);
              if (confirmedItem) {
                await supabase.from('expenses').upsert({
                  id: String(confirmedItem.id),
                  phone,
                  category: confirmedItem.category,
                  amount: confirmedItem.amount,
                  currency: confirmedItem.currency,
                  description: confirmedItem.description || '',
                  icon: confirmedItem.icon,
                  date: confirmedItem.date,
                  type: confirmedItem.type || 'expense',
                  status: confirmedItem.status,
                });
              }
            } 
            else if (type === 'expenses/confirmAllPlannedForMonth') {
              const monthKey = action.payload;
              const updatedItems = state.expenses.expenses.filter((e: any) => {
                const parts = e.date.split('/');
                if (parts.length === 3) {
                  const expMonthKey = `${parts[1].padStart(2, '0')}-${parts[2]}`;
                  return expMonthKey === monthKey;
                }
                return false;
              });
              for (const item of updatedItems) {
                await supabase.from('expenses').upsert({
                  id: String(item.id),
                  phone,
                  category: item.category,
                  amount: item.amount,
                  currency: item.currency,
                  description: item.description || '',
                  icon: item.icon,
                  date: item.date,
                  type: item.type || 'expense',
                  status: item.status,
                });
              }
            } 
            else if (type === 'expenses/deleteExpense') {
              const idToDelete = action.payload;
              await supabase.from('expenses').delete().eq('id', String(idToDelete));
            }
          } catch (err) {
            console.error('Supabase sync expense error:', err);
          }
        })();
      } 
      else if (type === 'user/updateProfile') {
        (async () => {
          try {
            const userState = state.user;
            await supabase.from('profiles').upsert({
              phone: userState.phone,
              first_name: userState.firstName,
              last_name: userState.lastName,
              avatar_seed: userState.avatarSeed,
              avatar_uri: userState.avatarUri,
              currency: userState.currency || 'GNF',
              language: userState.language || 'fr',
            });
          } catch (err) {
            console.error('Supabase sync profile error:', err);
          }
        })();
      }
    }
  }

  return result;
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistenceMiddleware, supabaseSyncMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Action de démarrage pour charger les données sauvegardées
export const hydrateState = () => async (dispatch: any) => {
  try {
    const savedState = await AsyncStorage.getItem('@fintech_app_state');
    if (savedState) {
      dispatch({ type: 'HYDRATE_STATE', payload: JSON.parse(savedState) });
    } else {
      // Migration backward compatibility
      const oldProfile = await AsyncStorage.getItem('@user_profile');
      if (oldProfile) {
        dispatch({ 
          type: 'HYDRATE_STATE', 
          payload: { user: JSON.parse(oldProfile) } 
        });
      }
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
};