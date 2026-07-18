import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// TODO: reemplaza estos valores con los reales de tu consola de Firebase
// (Configuración del proyecto -> Tus apps -> SDK setup and configuration)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAT0PJIWeph_0wu63V-mDjnnj1J9B7lJcM",
  authDomain: "balones-1834b.firebaseapp.com",
  databaseURL: "https://balones-1834b-default-rtdb.firebaseio.com",
  projectId: "balones-1834b",
  storageBucket: "balones-1834b.firebasestorage.app",
  messagingSenderId: "396891894851",
  appId: "1:396891894851:web:572ef0392fedd1610510f6",
  measurementId: "G-W3JQE8GBXZ"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
