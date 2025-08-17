import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDj557G13WHDLLCi1Y-XdojIaDgIiDhUyQ",
  authDomain: "ai-study-assistant-7e585.firebaseapp.com",
  projectId: "ai-study-assistant-7e585",
  storageBucket: "ai-study-assistant-7e585.firebasestorage.app",
  messagingSenderId: "92256421558",
  appId: "1:92256421558:web:a834c809e78a0e8d468817"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function loginAndGetToken() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, "shubhgugada0712@gmail.com", "123456");
    const token = await userCredential.user.getIdToken();
    console.log("ID Token:", token);
  } catch (error) {
    console.error("Error getting token:", error.message);
  }
}

loginAndGetToken();
