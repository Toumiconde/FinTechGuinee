import { configureStore, combineReducers } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import expenseReducer from './expenseSlice';
import userReducer from './userSlice';
import recurringReducer from './recurringSlice';
import goalsReducer from './goalsSlice';

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

const persistenceMiddleware = (storeAPI: any) => (next: any) => (action: any) => {
  const result = next(action);
  if (action.type !== 'HYDRATE_STATE' && !action.type.startsWith('persist/')) {
    const state = storeAPI.getState();
    AsyncStorage.setItem('@fintech_app_state', JSON.stringify(state))
      .catch(err => console.error('Persist error', err));
  }
  return result;
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistenceMiddleware),
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