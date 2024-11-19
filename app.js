const express = require("express");
const path = require("path");
const fs = require("fs");
const OS = require("os");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const functions = require("@google-cloud/functions-framework");

dotenv.config();

const app = express();
const port = 5555;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

// MongoDB connection setup
mongoose
  .connect(process.env.MONGO_URI, {
    user: process.env.MONGO_USERNAME,
    pass: process.env.MONGO_PASSWORD,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {})
  .catch((err) => {
    process.exit(1); // Exit the app if DB connection fails
  });

// MongoDB Schema and Model
const Schema = mongoose.Schema;
const dataSchema = new Schema({
  name: String,
  id: Number,
  description: String,
  image: String,
  velocity: String,
  distance: String,
});
const planetModel = mongoose.model("planets", dataSchema);

// Routes
app.post("/planets", async (req, res) => {
  try {
    const planetData = await planetModel.findOne({ id: req.body.id });
    if (!planetData) {
      return res.status(404).send("Planet not found");
    }
    res.json(planetData);
  } catch (err) {
    res.status(500).send("Error fetching planet data");
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api-docs", (req, res) => {
  fs.readFile("oas.json", "utf8", (err, data) => {
    if (err) {
      return res.status(500).send("Error reading file");
    }
    res.json(JSON.parse(data));
  });
});

app.get("/os", (req, res) => {
  res.json({
    os: OS.hostname(),
  });
});

// Health check endpoints
app.get("/live", (req, res) => {
  // Here, we're just checking if the app is responding
  res.json({ status: "live" });
});

app.get("/ready", async (req, res) => {
  try {
    // Check if MongoDB is connected (for readiness probe)
    const dbStatus = mongoose.connection.readyState === 1; // 1 = connected
    if (dbStatus) {
      res.json({ status: "ready" });
    } else {
      res.status(500).json({ status: "not ready" });
    }
  } catch (err) {
    res.status(500).json({ status: "not ready" });
  }
});

// Start the server
app.listen(port);

// Export the app for testing
module.exports = app;
