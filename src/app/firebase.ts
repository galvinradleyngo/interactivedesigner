import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;

export const firebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID,
);
/** Storage needs the Blaze plan; off by default so the free Spark plan just works. */
export const useStorage =
  env.VITE_FIREBASE_USE_STORAGE === 'true' && !!env.VITE_FIREBASE_STORAGE_BUCKET;

let app: FirebaseApp | null = null;
export function getApp(): FirebaseApp {
  app ??= initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  return app;
}
export const auth = (): Auth => getAuth(getApp());
export const db = (): Firestore => getFirestore(getApp());
