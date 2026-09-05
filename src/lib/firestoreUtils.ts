import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { JournalEntry, JournalMessage, UserProfile, FutureCapsule } from '../types';

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively removes all undefined values from an object before writing to Firestore.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Sync or create User Profile in Firestore: users/{userId}
 */
export async function syncUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
  const userRef = doc(db, 'users', profile.uid);
  const nowIso = new Date().toISOString();
  
  const payload = stripUndefined({
    uid: profile.uid,
    email: profile.email || null,
    displayName: profile.displayName || 'Journaler',
    photoURL: profile.photoURL || null,
    lastLoginAt: nowIso,
    updatedAt: serverTimestamp(),
  });

  await setDoc(userRef, payload, { merge: true });
}

/**
 * Create a new journal entry: users/{userId}/journals/{journalId}
 */
export async function createJournalEntry(
  userId: string,
  data?: Partial<JournalEntry>
): Promise<string> {
  const journalsCol = collection(db, 'users', userId, 'journals');
  const newJournalRef = doc(journalsCol);
  const nowIso = new Date().toISOString();

  const payload = stripUndefined({
    id: newJournalRef.id,
    title: data?.title?.trim() || 'New Reflection',
    summary: data?.summary || '',
    sentiment: data?.sentiment || 'Reflective',
    tags: Array.isArray(data?.tags) ? data.tags : ['Uncategorized'],
    createdAt: data?.createdAt || nowIso,
    updatedAt: data?.updatedAt || nowIso,
  });

  await setDoc(newJournalRef, payload);
  return newJournalRef.id;
}

/**
 * Update an existing journal entry: users/{userId}/journals/{journalId}
 */
export async function updateJournalEntry(
  userId: string,
  journalId: string,
  updates: Partial<JournalEntry>
): Promise<void> {
  const journalRef = doc(db, 'users', userId, 'journals', journalId);
  const nowIso = new Date().toISOString();

  const payload = stripUndefined({
    ...updates,
    updatedAt: nowIso,
  });

  await updateDoc(journalRef, payload);
}

/**
 * Delete a journal entry and its messages
 */
export async function deleteJournalEntry(
  userId: string,
  journalId: string
): Promise<void> {
  // First delete all messages in subcollection
  const messagesCol = collection(db, 'users', userId, 'journals', journalId, 'messages');
  const snap = await getDocs(messagesCol);
  const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);

  // Then delete the journal doc itself
  const journalRef = doc(db, 'users', userId, 'journals', journalId);
  await deleteDoc(journalRef);
}

/**
 * Add a message to a journal: users/{userId}/journals/{journalId}/messages/{messageId}
 */
export async function addMessageToJournal(
  userId: string,
  journalId: string,
  message: { role: 'user' | 'model'; content: string; id?: string }
): Promise<string> {
  const messagesCol = collection(db, 'users', userId, 'journals', journalId, 'messages');
  const msgRef = message.id ? doc(messagesCol, message.id) : doc(messagesCol);
  const nowIso = new Date().toISOString();

  const payload = stripUndefined({
    id: msgRef.id,
    role: message.role,
    content: message.content,
    timestamp: nowIso,
  });

  await setDoc(msgRef, payload);

  // Also touch the journal's updatedAt timestamp
  const journalRef = doc(db, 'users', userId, 'journals', journalId);
  await updateDoc(journalRef, {
    updatedAt: nowIso,
  }).catch(() => {
    // Ignore updateDoc error if journal doc was just created
  });

  return msgRef.id;
}

/**
 * Real-time subscription to user's journals list: users/{userId}/journals
 */
export function subscribeToUserJournals(
  userId: string,
  onData: (journals: JournalEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const journalsCol = collection(db, 'users', userId, 'journals');
  const q = query(journalsCol, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    snapshot => {
      const entries: JournalEntry[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || 'Untitled Entry',
          summary: data.summary || '',
          sentiment: data.sentiment || 'Reflective',
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      });
      onData(entries);
    },
    error => {
      console.error('Error subscribing to journals:', error);
      onError(error);
    }
  );
}

/**
 * Real-time subscription to a journal's messages: users/{userId}/journals/{journalId}/messages
 */
export function subscribeToJournalMessages(
  userId: string,
  journalId: string,
  onData: (messages: JournalMessage[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const messagesCol = collection(db, 'users', userId, 'journals', journalId, 'messages');
  const q = query(messagesCol, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    snapshot => {
      const msgs: JournalMessage[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          role: (data.role as 'user' | 'model') || 'user',
          content: data.content || '',
          timestamp: data.timestamp || new Date().toISOString(),
        };
      });
      onData(msgs);
    },
    error => {
      console.error('Error subscribing to messages:', error);
      onError(error);
    }
  );
}

/**
 * Fetch all journals with their messages for a user (for full data export)
 */
export async function exportAllUserData(userId: string): Promise<Record<string, unknown>> {
  const journalsCol = collection(db, 'users', userId, 'journals');
  const journalsSnap = await getDocs(journalsCol);
  
  const allJournals = await Promise.all(
    journalsSnap.docs.map(async jDoc => {
      const jData = jDoc.data();
      const messagesCol = collection(db, 'users', userId, 'journals', jDoc.id, 'messages');
      const messagesSnap = await getDocs(query(messagesCol, orderBy('timestamp', 'asc')));
      const messages = messagesSnap.docs.map(mDoc => mDoc.data());

      return {
        ...jData,
        id: jDoc.id,
        messages,
      };
    })
  );

  return {
    exportDate: new Date().toISOString(),
    userId,
    totalJournals: allJournals.length,
    journals: allJournals,
  };
}

/**
 * Create a new Future Capsule
 */
export async function createFutureCapsule(
  userId: string,
  capsule: Omit<FutureCapsule, 'id'>
): Promise<string> {
  const capsulesCol = collection(db, 'users', userId, 'future_capsules');
  const capsuleRef = doc(capsulesCol);
  const payload = stripUndefined({
    ...capsule,
    id: capsuleRef.id,
    userId,
    createdAt: capsule.createdAt || new Date().toISOString(),
    status: capsule.status || 'sealed',
  });

  await setDoc(capsuleRef, payload);
  return capsuleRef.id;
}

/**
 * Update an existing Future Capsule (e.g. unlocking, adding nowReflection, adding aiComparison)
 */
export async function updateFutureCapsule(
  userId: string,
  capsuleId: string,
  updates: Partial<FutureCapsule>
): Promise<void> {
  const capsuleRef = doc(db, 'users', userId, 'future_capsules', capsuleId);
  const payload = stripUndefined(updates);
  await updateDoc(capsuleRef, payload);
}

/**
 * Delete a Future Capsule
 */
export async function deleteFutureCapsule(
  userId: string,
  capsuleId: string
): Promise<void> {
  const capsuleRef = doc(db, 'users', userId, 'future_capsules', capsuleId);
  await deleteDoc(capsuleRef);
}

/**
 * Subscribe in real-time to all future capsules for a user
 */
export function subscribeToUserFutureCapsules(
  userId: string,
  onData: (capsules: FutureCapsule[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const capsulesCol = collection(db, 'users', userId, 'future_capsules');
  const q = query(capsulesCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    snapshot => {
      const capsules: FutureCapsule[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId || userId,
          title: data.title || 'Message to My Future Self',
          message: data.message || '',
          createdAt: data.createdAt || new Date().toISOString(),
          unlockDate: data.unlockDate || new Date().toISOString(),
          status: (data.status as 'sealed' | 'opened') || 'sealed',
          openedAt: data.openedAt,
          aiReflectionBeforeSeal: data.aiReflectionBeforeSeal,
          nowReflection: data.nowReflection,
          aiComparison: data.aiComparison,
        };
      });
      onData(capsules);
    },
    error => {
      console.error('Error subscribing to future capsules:', error);
      onError(error);
    }
  );
}

