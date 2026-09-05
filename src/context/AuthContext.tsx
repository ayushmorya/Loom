import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged, UserCredential } from 'firebase/auth';
import { auth, signInWithGoogle, signInAsGuest, logOut } from '../lib/firebase';
import { syncUserProfile } from '../lib/firestoreUtils';

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<UserCredential | void>;
  loginAsGuest: () => Promise<UserCredential | void>;
  logout: () => Promise<void>;
  refreshIdToken: () => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) {
      setIdToken(null);
      return null;
    }
    try {
      const token = await auth.currentUser.getIdToken(true);
      setIdToken(token);
      return token;
    } catch (err: unknown) {
      console.warn('Failed to refresh ID token:', (err as Error)?.message);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async currentUser => {
        setUser(currentUser);
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            setIdToken(token);
            // Sync user profile to Firestore
            await syncUserProfile({
              uid: currentUser.uid,
              email: currentUser.email || 'guest@reflective.vault',
              displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Guest Reflective User' : 'Reflective User'),
              photoURL: currentUser.photoURL,
            });
          } catch (err: unknown) {
            console.warn('Auth state sync notice:', (err as Error)?.message);
          }
        } else {
          setIdToken(null);
        }
        setLoading(false);
      },
      authError => {
        console.warn('onAuthStateChanged notice:', authError?.message);
        setError(authError.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<UserCredential | void> => {
    setError(null);
    try {
      const cred = await signInWithGoogle();
      return cred;
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === 'auth/popup-closed-by-user' || errObj.code === 'auth/cancelled-popup-request') {
        console.log('Google Sign-In popup closed by user.');
        // User closed or cancelled popup window, no fatal error
        return;
      } else if (errObj.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or open in a new tab.');
      } else {
        console.warn('Google Sign-In notice:', errObj.message);
        setError(errObj.message || 'Failed to sign in with Google');
      }
    }
  };

  const loginAsGuest = async (): Promise<UserCredential | void> => {
    setError(null);
    try {
      const cred = await signInAsGuest();
      return cred;
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      console.warn('Guest sign-in notice:', errObj.message);
      setError(errObj.message || 'Failed to initialize guest session.');
    }
  };

  const logout = async (): Promise<void> => {
    setError(null);
    try {
      await logOut();
      setUser(null);
      setIdToken(null);
    } catch (err: unknown) {
      console.warn('Logout notice:', (err as Error).message);
      setError((err as Error).message || 'Failed to sign out');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        loading,
        error,
        loginWithGoogle,
        loginAsGuest,
        logout,
        refreshIdToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
