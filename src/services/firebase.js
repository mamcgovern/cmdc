import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCx4HATW99JlbtBY8HSmqwsYSkVpEFkh0",
  authDomain: "cmdc-e5c35.firebaseapp.com",
  projectId: "cmdc-e5c35",
  storageBucket: "cmdc-e5c35.firebasestorage.app",
  messagingSenderId: "1041983005809",
  appId: "1:1041983005809:web:924c2627a53e8102ff27d0",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);