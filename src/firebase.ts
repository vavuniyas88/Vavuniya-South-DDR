import {getApps, initializeApp, type FirebaseOptions} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';

export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC4WeoS2mpbGpA835o95-pAfPGwQOCa82w',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vavuniyasouth-775b2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vavuniyasouth-775b2',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'vavuniyasouth-775b2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '850182335264',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:850182335264:web:a72a4d1f536bf9960e0545',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-59X5M56HPS',
};

const app = getApps().find((existing) => existing.name === '[DEFAULT]') ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const db: Firestore = createFirestoreInstance();

export function getSecondaryAuth() {
  const secondaryApp =
    getApps().find((existing) => existing.name === 'userCreator') ??
    initializeApp(firebaseConfig, 'userCreator');
  return getAuth(secondaryApp);
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration and ensure Firestore is enabled.');
    }
  }
}

void testConnection();
