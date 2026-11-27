import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, firebaseConfigured } from './firebase';

export interface User {
  uid: string;
  name: string;
  email: string;
}
interface AuthState {
  user: User | null;
  loading: boolean;
  /** True when Firebase isn't configured: data is kept in this browser only. */
  localMode: boolean;
  signIn(): Promise<void>;
  logout(): Promise<void>;
}

const LOCAL_USER: User = { uid: 'local', name: 'Local (this browser only)', email: '' };
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(firebaseConfigured ? null : LOCAL_USER);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth(), (u) => {
      setUser(u ? { uid: u.uid, name: u.displayName ?? 'User', email: u.email ?? '' } : null);
      setLoading(false);
    });
  }, []);

  const value: AuthState = {
    user,
    loading,
    localMode: !firebaseConfigured,
    signIn: async () => {
      await signInWithPopup(auth(), new GoogleAuthProvider());
    },
    logout: async () => {
      if (firebaseConfigured) await signOut(auth());
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider missing');
  return v;
}
