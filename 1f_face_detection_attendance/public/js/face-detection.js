// ================================
// Attendance System with Face API
// ================================

// Get HTML Elements
const video = document.getElementById("webcam");
const startButton = document.getElementById("start-recognition");
const distanceDisplay = document.getElementById("distanceDisplay");
const attendanceLogButton = document.getElementById("attendance-log-btn");
const webcamContainer = document.getElementById("webcam-container");
const attendanceLogContainer = document.getElementById("attendance-log");
const statusMessage = document.getElementById("statusMessage");
const attendanceMarkedMessage = document.getElementById("attendance-marked");
const resetButton = document.getElementById("reset-attendance");

console.log("HTML elements loaded successfully");

// System State
let isFaceDetectionActive = false;
let userDistance = null;
let detectionInterval = null;
let faceMatcher = null;
let modelsReady = false;

// ================================
// Helpers
// ================================

// Check if attendance was marked today
function isAttendanceMarkedToday() {
  const today = new Date().toDateString();
  return localStorage.getItem("attendanceDate") === today;
}

// Update UI
function updateUI() {
  const attendanceMarked = isAttendanceMarkedToday();
  startButton.disabled =
    attendanceMarked || (typeof userDistance === "number" && userDistance > 50);
  startButton.innerHTML = attendanceMarked
    ? '<i class="fas fa-check-circle"></i> Attendance Already Marked'
    : '<i class="fas fa-camera"></i> Start Face Recognition';
  attendanceMarkedMessage.style.display = attendanceMarked ? "block" : "none";
  if (attendanceMarked) showAttendanceLog();
}

// Show status messages
function showStatus(message, type = "info") {
  console.log(`Status: ${message}`);
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusMessage.style.display = "block";
  if (type === "info")
    setTimeout(() => (statusMessage.style.display = "none"), 3000);
}

// ================================
// Location
// ================================

async function checkLocation() {
  if (!navigator.geolocation)
    return showStatus("Geolocation not supported", "error");

  showStatus("Getting your location...", "info");
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude: userLat, longitude: userLong } = position.coords;
      const collegeLat = 13.101308,
        collegeLong = 80.200307;
      userDistance =
        getDistance(userLat, userLong, collegeLat, collegeLong) * 1000;

      distanceDisplay.innerHTML = `
        <i class="fas fa-map-marker-alt"></i> Distance: ${userDistance.toFixed(
          2
        )}m
        <span class="badge ${
          userDistance > 50 ? "badge-danger" : "badge-success"
        }">
          ${userDistance > 50 ? "Too far" : "Within range"}
        </span>`;
      updateUI();
    },
    () => {
      console.error("Geolocation failed");
      showStatus("Could not get your location", "error");
      distanceDisplay.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Location access denied`;
    }
  );
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371,
    dLat = deg2rad(lat2 - lat1),
    dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// ================================
// Face API
// ================================

// Load models
async function loadModels() {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("models"),
    ]);
    modelsReady = true;
    showStatus("System ready", "success");
  } catch (error) {
    console.error("Model load error:", error);
    showStatus("Error loading models", "error");
  }
}

// Load labeled images safely
async function loadLabeledImages() {
  console.log("Loading labeled images...");
  const labels = ["ajith_kumar", "Daniel"];

  const results = await Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 3; i++) {
        const path = `models/${label}/${i}.jpg`;
        try {
          const img = await faceapi.fetchImage(path);

          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection && detection.descriptor) {
            descriptions.push(detection.descriptor);
            console.log(`✅ Descriptor loaded: ${path}`);
          } else {
            console.warn(`⚠️ No usable face in ${path}`);
          }
        } catch (err) {
          console.error(`❌ Error loading ${path}:`, err);
        }
      }

      if (descriptions.length === 0) {
        console.warn(`⚠️ Skipping ${label}, no valid descriptors`);
        return null;
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );

  const filtered = results.filter((r) => r !== null);
  console.log(`Final labels loaded: ${filtered.length}`);
  return filtered;
}

// ================================
// Detection Loop
// ================================

function stopFaceDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  if (video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
  isFaceDetectionActive = false;
  updateUI();
}

async function startFaceDetection() {
  if (!modelsReady) return showStatus("Models not loaded yet", "error");
  if (isAttendanceMarkedToday())
    return showStatus("Attendance already marked", "info");
  if (isFaceDetectionActive)
    return showStatus("Face detection already running", "info");
  if (typeof userDistance === "number" && userDistance > 50)
    return showStatus("Too far to mark attendance", "error");

  isFaceDetectionActive = true;
  startButton.disabled = true;
  startButton.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Processing...';
  webcamContainer.style.display = "flex";
  showStatus("Starting face detection...", "info");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
    await video.play().catch(() => {});

    if (!faceMatcher) {
      const labeled = await loadLabeledImages();
      if (!labeled || labeled.length === 0) {
        showStatus("No valid labeled faces. Check training images.", "error");
        stopFaceDetection();
        return;
      }
      faceMatcher = new faceapi.FaceMatcher(labeled, 0.55);
    }

    detectionInterval = setInterval(async () => {
      try {
        if (isAttendanceMarkedToday()) return stopFaceDetection();

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const validDetections = detections.filter((d) => d && d.descriptor);
        if (validDetections.length === 0) return; // skip frame safely

        console.log(`Detected ${validDetections.length} face(s)`);

        const bestMatch = faceMatcher.findBestMatch(
          validDetections[0].descriptor
        );
        if (bestMatch && bestMatch.label !== "unknown") {
          markAttendance(bestMatch.label);
        }
      } catch (err) {
        console.error("Detection loop error:", err);
        // Skip frame silently instead of breaking
      }
    }, 1000);
  } catch (error) {
    console.error("Webcam error:", error);
    showStatus("Webcam error", "error");
    stopFaceDetection();
  }
}

// ================================
// Attendance
// ================================

function markAttendance(name) {
  if (isAttendanceMarkedToday()) return;
  localStorage.setItem("attendanceDate", new Date().toDateString());
  localStorage.setItem(
    "attendanceLog",
    JSON.stringify({ name, timestamp: new Date().toLocaleString() })
  );
  showStatus(`Attendance marked for ${name}`, "success");
  stopFaceDetection();
  updateUI();
  showAttendanceLog();
}

function showAttendanceLog() {
  const logData = localStorage.getItem("attendanceLog");
  if (logData) {
    const { name, timestamp } = JSON.parse(logData);
    document.getElementById(
      "log-content"
    ).innerHTML = `<p><strong>Name:</strong> ${name}</p><p><strong>Time:</strong> ${timestamp}</p>`;
  }
  attendanceLogContainer.style.display = "block";
}

// ================================
// Event Listeners
// ================================

startButton.addEventListener("click", startFaceDetection);
attendanceLogButton.addEventListener("click", showAttendanceLog);
resetButton.addEventListener("click", () => {
  localStorage.clear();
  showStatus("Attendance data reset", "success");
  updateUI();
});

document.addEventListener("DOMContentLoaded", () => {
  loadModels();
  checkLocation();
  updateUI();
});
