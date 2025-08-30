import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCWbpyrhItvG6YUByQIl1JTSR9xnDEsJ0Q",
  authDomain: "face-attendance-14b8f.firebaseapp.com",
  projectId: "face-attendance-14b8f",
  storageBucket: "face-attendance-14b8f.appspot.com",
  messagingSenderId: "735218782614",
  appId: "1:735218782614:web:cfa54194182bef4808cdb7",
};

// ✅ Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized:", app.name);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * ✅ Sign up a new user (Called via console or button)
 * @param {string} email
 * @param {string} password
 * @param {string} role (admin, staff, student)
 */
async function signUpUser(email, password, role) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // ✅ Store user role in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role,
    });

    console.log(`✅ User ${email} registered as ${role}`);
  } catch (error) {
    console.error("🚨 Error signing up:", error);
  }
}

/**
 * ✅ Sign in an existing user
 * @param {string} email
 * @param {string} password
 */
async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log(`✅ User ${userCredential.user.email} logged in`);
  } catch (error) {
    console.error("🚨 Error logging in:", error);
  }
}

/**
 * ✅ Logs out the current user
 */
async function logoutUser() {
  try {
    await signOut(auth);
    console.log("✅ User logged out");
  } catch (error) {
    console.error("🚨 Error logging out:", error);
  }
}

/**
 * ✅ Listen for authentication state changes
 */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log(`👤 User logged in: ${user.email}`);

    // ✅ Fetch user role from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const role = userDoc.data().role;
      console.log(`🎭 User role: ${role}`);

      // ✅ Redirect based on role
      if (role === "admin") {
        window.location.href = "admin.html";
      } else if (role === "staff") {
        window.location.href = "staff.html";
      } else {
        window.location.href = "index.html";
      }
    } else {
      console.warn("⚠ No user data found in Firestore");
    }
  } else {
    console.log("❌ No user logged in");
    window.location.href = "login.html"; // Redirect to login if not authenticated
  }
});

// ✅ Expose functions globally for debugging (Optional)
window.signUpUser = signUpUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
