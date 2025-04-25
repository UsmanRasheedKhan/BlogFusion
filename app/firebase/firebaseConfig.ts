// firebaseConfig.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIL2V3oyjtPE9ebdy_rpL4rcZDYzPEIY4",
  authDomain: "blogfusion2.firebaseapp.com",
  projectId: "blogfusion2",
  storageBucket: "blogfusion2.firebasestorage.app",
  messagingSenderId: "937341251977",
  appId: "1:937341251977:web:57939489805a497387b158"
};

// Initialize Firebase (check if already initialized)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleAuthProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Custom sign-out function (renamed to avoid conflict)
const customSignOut = async () => {
  await signOut(auth);
};

export { auth, db, firebaseConfig, googleAuthProvider, customSignOut};