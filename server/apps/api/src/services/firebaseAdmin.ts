import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import jwt from "jsonwebtoken";

let app: App | null = null;
let isInitialized = false;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
    isInitialized = true;
    console.log("[FirebaseAdmin] Successfully initialized with FIREBASE_SERVICE_ACCOUNT.");
  } else if (projectId && clientEmail && privateKey) {
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    isInitialized = true;
    console.log(`[FirebaseAdmin] Successfully initialized for project "${projectId}".`);
  } else if (getApps().length > 0) {
    app = getApps()[0];
    isInitialized = true;
  } else {
    console.warn(
      "[FirebaseAdmin] Credentials not configured in .env. Running in development fallback mode."
    );
  }
} catch (err: any) {
  console.warn(`[FirebaseAdmin] Initialization warning: ${err.message}. Using fallback.`);
}

export interface VerifiedGoogleUser {
  uid: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Verifies a Google ID Token issued by Firebase Auth client.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  if (isInitialized && app) {
    try {
      const auth = getAuth(app);
      const decoded = await auth.verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email || "",
        name: decoded.name || decoded.email?.split("@")[0] || "Trader",
        picture: decoded.picture,
      };
    } catch (err: any) {
      console.error("[FirebaseAdmin] verifyIdToken error:", err.message);
      throw new Error(`Google token verification failed: ${err.message}`);
    }
  }

  // Graceful development fallback: decode without cryptographic verify if admin not configured
  console.warn("[FirebaseAdmin] Decoding token in dev fallback mode (admin SDK not initialized).");
  const decoded = jwt.decode(idToken) as any;
  if (!decoded || !decoded.email) {
    throw new Error("Invalid Google token payload.");
  }

  return {
    uid: decoded.sub || decoded.user_id || `google-dev-${Date.now()}`,
    email: decoded.email,
    name: decoded.name || decoded.email.split("@")[0] || "Trader",
    picture: decoded.picture,
  };
}

/**
 * Sends web push notifications via FCM multicast.
 */
export async function sendMulticastPush(
  tokens: string[],
  notification: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, string>;
  }
): Promise<{ successCount: number; failureCount: number }> {
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const cleanTokens = Array.from(new Set(tokens.filter(Boolean)));

  if (!isInitialized || !app) {
    console.log(
      `[FirebaseAdmin Mock] Would push to ${cleanTokens.length} devices: "${notification.title} - ${notification.body}"`
    );
    return { successCount: cleanTokens.length, failureCount: 0 };
  }

  try {
    const messaging = getMessaging(app);
    const response = await messaging.sendEachForMulticast({
      tokens: cleanTokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || "/favicon.ico",
          badge: "/favicon.ico",
        },
        fcmOptions: {
          link: notification.data?.link || "/notifications",
        },
      },
    });

    console.log(
      `[FirebaseAdmin] Multicast sent. Success: ${response.successCount}, Failures: ${response.failureCount}`
    );
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err: any) {
    console.error("[FirebaseAdmin] Multicast send error:", err.message);
    return { successCount: 0, failureCount: cleanTokens.length };
  }
}

export function isFirebaseConfigured(): boolean {
  return isInitialized;
}
