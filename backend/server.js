const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const cors = require("cors");
const FormData = require("form-data");
require("dotenv").config();

const app = express();
const upload = multer();

app.use(cors());

app.post("/remove-bg", upload.single("image"), async (req, res) => {
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

    const data = await response.buffer();

    res.set("Content-Type", "image/png");
    res.send(data);

  } catch (err) {
    console.error("Internal Server Error Loop:", err);
    res.status(500).send("Server Error");
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
