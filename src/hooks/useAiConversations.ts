import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  attachmentType?: 'image' | 'document' | 'audio';
  attachmentUri?: string;
  attachmentName?: string;
  attachmentBase64?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  userId?: string; // For Supabase sync
  synced?: boolean; // Track sync status
}

function storageKey(userId: string)  { return `@fintech_ai_conversations_${userId}`; }
function archiveKey(userId: string)   { return `@fintech_ai_archive_${userId}`; }

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useAiConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // ── Check online status ────────────────────────────────────────
  const checkOnlineStatus = useCallback(async () => {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      setIsOnline(!error);
      return !error;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  // ── Load both active + archive (local + Supabase) ─────────────────
  const load = useCallback(async (userId?: string) => {
    if (!userId) return [];
    try {
      const raw = await AsyncStorage.getItem(storageKey(userId));
      const rawArchive = await AsyncStorage.getItem(archiveKey(userId));

      let localConversations: Conversation[] = [];
      if (raw) {
        localConversations = JSON.parse(raw);
        setConversations(localConversations);
        if (localConversations.length > 0) setActiveId(localConversations[0].id);
      }
      if (rawArchive) {
        setArchivedConversations(JSON.parse(rawArchive));
      }

      // Try to sync with Supabase if online
      if (await checkOnlineStatus()) {
        setSyncStatus('syncing');
        try {
          const { data: remoteConvos, error } = await supabase
            .from('ai_conversations')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

          if (!error && remoteConvos) {
            const mergedConversations = mergeConversations(localConversations, remoteConvos);
            setConversations(mergedConversations);
            await AsyncStorage.setItem(storageKey(userId), JSON.stringify(mergedConversations));
            setSyncStatus('idle');
          }
        } catch (syncError) {
          console.error('Supabase sync error:', syncError);
          setSyncStatus('error');
        }
      }

      return localConversations;
    } catch (_) {}
    return [];
  }, [checkOnlineStatus]);

  // ── Merge local and remote conversations ────────────────────────
  const mergeConversations = (local: Conversation[], remote: any[]): Conversation[] => {
    const mergedMap = new Map<string, Conversation>();

    // Add local conversations
    local.forEach(conv => mergedMap.set(conv.id, { ...conv, synced: false }));

    // Update or add remote conversations
    remote.forEach(remoteConv => {
      const localConv = mergedMap.get(remoteConv.id);
      if (localConv) {
        // Use the most recently updated version
        if (remoteConv.updated_at > localConv.updatedAt) {
          mergedMap.set(remoteConv.id, {
            ...localConv,
            messages: remoteConv.messages || [],
            title: remoteConv.title,
            updatedAt: remoteConv.updated_at,
            synced: true,
          });
        }
      } else {
        // Add remote conversation
        mergedMap.set(remoteConv.id, {
          id: remoteConv.id,
          title: remoteConv.title,
          messages: remoteConv.messages || [],
          createdAt: remoteConv.created_at,
          updatedAt: remoteConv.updated_at,
          userId: remoteConv.user_id,
          synced: true,
        });
      }
    });

    return Array.from(mergedMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const save = useCallback(async (convs: Conversation[], userId?: string) => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(convs));
    } catch (_) {}
  }, []);

  const saveArchive = useCallback(async (convs: Conversation[], userId?: string) => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(archiveKey(userId), JSON.stringify(convs));
    } catch (_) {}
  }, []);

  // ── Sync conversation to Supabase ────────────────────────────────
  const syncToSupabase = useCallback(async (conv: Conversation, userId?: string) => {
    if (!userId || !isOnline) return;

    try {
      setSyncStatus('syncing');
      const { error } = await supabase
        .from('ai_conversations')
        .upsert({
          id: conv.id,
          user_id: userId,
          title: conv.title,
          messages: conv.messages,
          created_at: conv.createdAt,
          updated_at: conv.updatedAt,
          archived_at: conv.archivedAt,
        });

      if (!error) {
        setConversations(prev => 
          prev.map(c => c.id === conv.id ? { ...c, synced: true } : c)
        );
        setSyncStatus('idle');
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error('Sync to Supabase error:', error);
      setSyncStatus('error');
    }
  }, [isOnline]);

  // ── Create new empty conversation ──────────────────────────────
  const createNew = useCallback(
    (userId?: string) => {
      const newConv: Conversation = {
        id: generateId(),
        title: 'Nouvelle conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId,
        synced: false,
      };
      setConversations(prev => {
        const updated = [newConv, ...prev];
        save(updated, userId);
        syncToSupabase(newConv, userId);
        return updated;
      });
      setActiveId(newConv.id);
      return newConv.id;
    },
    [save, syncToSupabase]
  );

  // ── Add message + auto-title + sync ────────────────────────────
  const addMessage = useCallback(
    (convId: string, msg: ChatMessage, userId?: string) => {
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id !== convId) return c;
          const newMessages = [...c.messages, msg];
          let title = c.title;
          if (
            title === 'Nouvelle conversation' &&
            msg.sender === 'user' &&
            msg.text.length > 0
          ) {
            title = msg.text.slice(0, 36) + (msg.text.length > 36 ? '…' : '');
          }
          const updatedConv = { ...c, messages: newMessages, title, updatedAt: Date.now(), synced: false };
          setTimeout(() => syncToSupabase(updatedConv, userId), 100);
          return updatedConv;
        });
        save(updated, userId);
        return updated;
      });
    },
    [save, syncToSupabase]
  );

  // ── Archive (soft-delete) a conversation ───────────────────────
  const deleteConversation = useCallback(
    (convId: string, userId?: string) => {
      setConversations(prev => {
        const target = prev.find(c => c.id === convId);
        let updated = prev.filter(c => c.id !== convId);
        
        if (target) {
          const archived = { ...target, archivedAt: Date.now(), synced: false };
          setArchivedConversations(arch => {
            const newArch = [archived, ...arch];
            saveArchive(newArch, userId);
            return newArch;
          });
          setTimeout(() => syncToSupabase(archived, userId), 100);
        }

        if (updated.length === 0) {
          const newConv: Conversation = {
            id: generateId(),
            title: 'Nouvelle conversation',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userId,
            synced: false,
          };
          updated = [newConv];
          setActiveId(newConv.id);
        } else {
          setActiveId(current => {
            if (current === convId) {
              return updated[0].id;
            }
            return current;
          });
        }

        save(updated, userId);
        return updated;
      });
    },
    [save, saveArchive, syncToSupabase]
  );

  // ── Restore an archived conversation ───────────────────────────
  const restoreConversation = useCallback(
    (convId: string, userId?: string) => {
      setArchivedConversations(arch => {
        const target = arch.find(c => c.id === convId);
        const newArch = arch.filter(c => c.id !== convId);
        saveArchive(newArch, userId);
        if (target) {
          const restored: Conversation = { ...target, archivedAt: undefined, updatedAt: Date.now(), synced: false };
          setConversations(prev => {
            const updated = [restored, ...prev];
            save(updated, userId);
            setTimeout(() => syncToSupabase(restored, userId), 100);
            return updated;
          });
          setActiveId(restored.id);
        }
        return newArch;
      });
    },
    [save, saveArchive, syncToSupabase]
  );

  // ── Permanently delete from archive ────────────────────────────
  const permanentlyDelete = useCallback(
    (convId: string, userId?: string) => {
      setArchivedConversations(arch => {
        const updated = arch.filter(c => c.id !== convId);
        saveArchive(updated, userId);
        // Delete from Supabase as well
        if (userId && isOnline) {
          supabase.from('ai_conversations').delete().eq('id', convId).then();
        }
        return updated;
      });
    },
    [saveArchive, isOnline]
  );

  // ── Clear entire archive ────────────────────────────────────────
  const clearArchive = useCallback(async (userId?: string) => {
    setArchivedConversations([]);
    if (!userId) return;
    try { await AsyncStorage.removeItem(archiveKey(userId)); } catch (_) {}
  }, []);

  // ── Manual sync trigger ────────────────────────────────────────
  const manualSync = useCallback(async (userId?: string) => {
    if (!userId) return;
    
    setSyncStatus('syncing');
    const online = await checkOnlineStatus();
    if (!online) {
      setSyncStatus('error');
      return;
    }

    // Sync all unsynced conversations
    const unsynced = conversations.filter(c => !c.synced);
    for (const conv of unsynced) {
      await syncToSupabase(conv, userId);
    }

    // Load latest from Supabase
    await load(userId);
    setSyncStatus('idle');
  }, [conversations, checkOnlineStatus, syncToSupabase, load]);

  const activeConversation =
    conversations.find(c => c.id === activeId) ?? null;

  return {
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
  };
}
