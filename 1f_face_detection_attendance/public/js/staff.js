import {
  getFirestore,
  collection,
  getDocs,
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

// ✅ Initialize Firebase (Avoid Duplicate App Error)
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
const db = getFirestore(app);

// 🔥 Fetch Student Attendance Records
async function loadStudentAttendance() {
  const studentTable = document.getElementById("student-table-body");
  studentTable.innerHTML = ""; // Clear previous data

  const querySnapshot = await getDocs(collection(db, "attendance_logs"));
  querySnapshot.forEach((doc) => {
    const logData = doc.data();
    const row = `
      <tr>
        <td>${logData.name}</td>
        <td>${logData.timestamp}</td>
      </tr>
    `;
    studentTable.innerHTML += row;
  });
  console.log("✅ Student Attendance Loaded!");
}

// 🚀 Run the function on page load
window.onload = () => {
  loadStudentAttendance();
};
