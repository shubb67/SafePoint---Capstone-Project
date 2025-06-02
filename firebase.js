// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEPdu0CPk7Cqvg7iXZ8_a7vA5uPuzAQhc",
  authDomain: "safepoint-124f8.firebaseapp.com",
  projectId: "safepoint-124f8",
  storageBucket: "safepoint-124f8.firebasestorage.app",
  messagingSenderId: "864493923534",
  appId: "1:864493923534:web:91a8cb782281b2242f349f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);