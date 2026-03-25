import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAVGgy6Tp5GOMiOZOrIrL2Zyy-08tciX3s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "voxaraaa.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "voxaraaa",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "voxaraaa.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "420321143449",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:420321143449:web:3aaf74e3c2b94572682608"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
