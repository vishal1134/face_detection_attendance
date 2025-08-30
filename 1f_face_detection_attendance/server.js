const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// ✅ Test Route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running!" });
});

// ✅ Start Server
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
