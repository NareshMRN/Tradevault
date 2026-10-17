import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
} from "firebase/auth";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== "your-api-key"
);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let messagingPromise: Promise<Messaging | null> | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
  } catch (err) {
    console.warn("[Firebase] Initialization error:", err);
  }
}

export { app, auth };

/**
 * Sign in with Google using Firebase Popup
 */
export async function signInWithGoogle(): Promise<{
  idToken: string;
  displayName?: string;
  email?: string;
}> {
  if (!auth) {
    throw new Error(
      "Firebase authentication is not configured. Please check your frontend/.env credentials."
    );
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();

  return {
    idToken,
    displayName: result.user.displayName || undefined,
    email: result.user.email || undefined,
  };
}

/**
 * Get or initialize Firebase Messaging instance
 */
async function getMessagingInstance(): Promise<Messaging | null> {
  if (!isFirebaseConfigured || !app) return null;
  if (typeof window === "undefined") return null;

  if (!messagingPromise) {
    messagingPromise = isSupported()
      .then((supported: boolean) => {
        if (supported && app) {
          return getMessaging(app);
        }
        return null;
      })
      .catch((err: any) => {
        console.warn("[FCM] isSupported check failed:", err);
        return null;
      });
  }
  return messagingPromise;
}

/**
 * Request FCM Device Push Token
 */
export async function requestFcmToken(): Promise<string | null> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const vapidKey =
      import.meta.env.VITE_FIREBASE_VAPID_KEY ||
      import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY;

    // Register or get active service worker
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      swRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      await navigator.serviceWorker.ready;
    }

    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: swRegistration,
    });

    return currentToken || null;
  } catch (err) {
    console.warn("[FCM] Token acquisition failed:", err);
    return null;
  }
}

/**
 * Listen for FCM push messages when app is open in foreground
 */
export function onForegroundMessage(
  callback: (payload: {
    notification?: { title?: string; body?: string };
    data?: any;
  }) => void
): () => void {
  let unsubscribe: (() => void) | null = null;

  getMessagingInstance().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload: any) => {
        callback(payload);
      });
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}
