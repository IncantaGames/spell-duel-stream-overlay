import express from "express";
import path from "path";

const app = express();

app.use("/app.js", express.static(path.join(__dirname, "..", "dist", "app.js")));

app.use("/media", express.static(path.join(__dirname, "..", "resources", "media")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "resources", "index.html"));
});

app.listen(8080, () => {
  console.log("Server listening on http://localhost:8080");
});
