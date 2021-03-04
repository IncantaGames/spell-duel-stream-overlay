import express from "express";
import path from "path";

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.use("/app.js", express.static(path.join(__dirname, "..", "dist", "app.js")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(8080, () => {
  console.log("Server listening on http://localhost:8080");
});
