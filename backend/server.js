const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
const upload = multer();

app.use(cors());

app.post("/remove-bg", upload.single("image"), async (req, res) => {
  try {
    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.API_KEY
      },
      body: req.file.buffer
    });

    if (!response.ok) {
      return res.status(400).send("API Error");
    }

    const data = await response.buffer();

    res.set("Content-Type", "image/png");
    res.send(data);

  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));