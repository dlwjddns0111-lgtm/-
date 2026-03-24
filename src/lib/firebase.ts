import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDRsiidkyYct4kg-Uq2ADHJky6fWBsgi2w",
    authDomain: "fir-ce14f.firebaseapp.com",
    databaseURL: "https://fir-ce14f-default-rtdb.firebaseio.com",
    projectId: "fir-ce14f",
    storageBucket: "fir-ce14f.firebasestorage.app",
    messagingSenderId: "410493311550",
    appId: "1:410493311550:web:909b3323b79948c99acf6f",
    measurementId: "G-HDNW9K0M21"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
