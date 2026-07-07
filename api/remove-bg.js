const express = require("express");
const multer = require("multer");
const cors = require("cors");
const FormData = require("form-data");
require("dotenv").config();

const app = express();
const upload = multer();

app.use(cors());

app.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No image file provided.");
    }

    const form = new FormData();
    form.append("size", "auto");
    form.append("image_file", req.file.buffer, {
      filename: req.file.originalname || "upload.png",
      contentType: req.file.mimetype || "image/png",
    });

    // Uses native built-in global fetch engine to avoid version crashes
    const response = await fetch("https://remove.bg", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.API_KEY,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Remove.bg API Error Response:", errorText);
      return res.status(response.status).send(`API Error: ${response.statusText}`);
    }

    // Modern serverless array buffer extraction structure 
    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    res.set("Content-Type", "image/png");
    res.send(data);

  } catch (err) {
    console.error("Serverless Crash Log:", err.message);
    res.status(500).send("Server Error: " + err.message);
  }
});

module.exports = app;
