import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: firebaseConfigData.projectId,
  appId: firebaseConfigData.appId,
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
};

// Initialize Firebase App
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (with databaseId support)
export const db: Firestore = firebaseConfigData.firestoreDatabaseId && firebaseConfigData.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

let authInitPromise: Promise<User | null> | null = null;

/**
 * Ensures a valid Firebase Authentication session (using Anonymous Auth if not logged in).
 * Resolves quickly with a 1200ms timeout so database queries are never held hostage.
 */
export async function ensureFirebaseAuth(): Promise<User | null> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (authInitPromise) {
    return authInitPromise;
  }

  const authPromise = new Promise<User | null>((resolve) => {
    let hasResolved = false;
    const safeResolve = (user: User | null) => {
      if (!hasResolved) {
        hasResolved = true;
        resolve(user);
      }
    };

    // Fast fallback after 1200ms so Firestore requests can proceed immediately
    const timer = setTimeout(() => {
      safeResolve(auth.currentUser || null);
    }, 1200);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      clearTimeout(timer);
      if (user) {
        safeResolve(user);
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          safeResolve(userCredential.user);
        } catch (error) {
          console.warn('[Firebase] Anonymous signIn warning (will still attempt Firestore operations):', error);
          safeResolve(null);
        }
      }
    });
  });

  authInitPromise = authPromise;
  return authPromise;
}

// Start auth immediately in background upon module load
ensureFirebaseAuth().catch(() => {});
