// Import SDK Firebase dari CDN resmi menggunakan ES Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Konfigurasi Firebase milik Anda
const firebaseConfig = {
    apiKey: "AIzaSyDs_DrMlshxHJAyA2l4hu2h4uqS_eG7pSY",
    authDomain: "nays-laundry.firebaseapp.com",
    projectId: "nays-laundry",
    storageBucket: "nays-laundry.firebasestorage.app",
    messagingSenderId: "285012734396",
    appId: "1:285012734396:web:63fcf971852a8b4be13bb9"
};

// Inisialisasi Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Ekspor instansi db dan fungsi Firestore agar bisa dipakai di file app.js
export { db, doc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot };
