const express = require("express");
const cors = require("cors");
const connectDB = require("./config/EventDB"); // remember

const app = express();

app.use(express.json());

app.use(cors());

connectDB();

app.use("/api/campus", require("./routes/EventRoute"));

app.listen(5000, () => {
  console.log("🚀 Server is on 5000 PORT");
});
