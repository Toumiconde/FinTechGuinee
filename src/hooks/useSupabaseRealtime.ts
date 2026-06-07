import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { supabase } from '../utils/supabaseClient';
import { upsertExpense, deleteExpense } from '../redux/expenseSlice';
import { updateProfile } from '../redux/userSlice';

/**
 * Hook personnalisé pour s'abonner aux modifications Supabase en temps réel.
 * Permet la synchronisation instantanée entre plusieurs téléphones connectés au même compte.
 */
export const useSupabaseRealtime = () => {
  const dispatch = useDispatch();
  const phone = useSelector((state: RootState) => state.user.phone);

  useEffect(() => {
    if (!phone) return;

    console.log('Subscribing to Supabase Realtime for phone:', phone);

    // 1. Abonnement en temps réel aux dépenses du compte
    const expenseChannel = supabase
      .channel(`realtime_expenses_${phone}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `phone=eq.${phone}`,
        },
        (payload) => {
          console.log('Realtime expense change received:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const exp = payload.new;
            dispatch(
              upsertExpense({
                id: isNaN(Number(exp.id)) ? exp.id : Number(exp.id),
                category: exp.category,
                amount: Number(exp.amount),
                currency: exp.currency || 'GNF',
                description: exp.description || '',
                icon: exp.icon || 'receipt',
                date: exp.date,
                status: exp.status || 'real',
                type: exp.type || 'expense',
              })
            );
          } else if (payload.eventType === 'DELETE') {
            dispatch(deleteExpense(payload.old.id));
          }
        }
      )
      .subscribe();

    // 2. Abonnement en temps réel aux modifications de profil
    const profileChannel = supabase
      .channel(`realtime_profile_${phone}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `phone=eq.${phone}`,
        },
        (payload) => {
          console.log('Realtime profile change received:', payload);
          const prof = payload.new;
          dispatch(
            updateProfile({
              firstName: prof.first_name,
              lastName: prof.last_name,
              avatarSeed: prof.avatar_seed || 'Felix',
              avatarUri: prof.avatar_uri,
              currency: prof.currency || 'GNF',
              language: prof.language || 'fr',
            })
          );
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from Supabase Realtime');
      supabase.removeChannel(expenseChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [phone, dispatch]);
};
