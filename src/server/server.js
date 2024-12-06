import express, { json } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import RegisterModel from "./models/Register.js";

dotenv.config();

const JWT_SECRET = "afnowieuojnvaoiniofojwe0e";

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(json());
app.use(cookieParser());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.post("/api/register", async (req, res) => {
  const { house, nickname, name, email, password } = req.body;
  try {
    const user = await RegisterModel.create({
      house,
      nickname,
      name,
      email,
      password: bcrypt.hashSync(password, 10),
    });
    res.json(user);
  } catch (error) {
    console.error("Error registering user:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/register", (req, res) => {
  RegisterModel.find({})
    .then(function (register) {
      res.json(register);
    })
    .catch(function (err) {
      res.status(500).send(err);
    });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await RegisterModel.findOne({ email });
  if (user) {
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (passwordMatch) {
      jwt.sign(
        {
          email: user.email,
          id: user._id,
        },
        JWT_SECRET,
        {},
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, { sameSite: "None", secure: true }) // ensure secure option is set
            .json({ success: true, message: "Password matches!" });
        }
      );
    } else {
      res.json({ message: "Password does not match" });
    }
  } else {
    res.json({ success: false });
  }
});

app.get("/api/profile", async (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  jwt.verify(token, JWT_SECRET, {}, async (err, userData) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    try {
      const user = await RegisterModel.findById(userData.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { house, nickname, name, email, _id } = user;
      res.json({ house, nickname, name, email, _id, token });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
});

app.get("/api/user", async (req, res) => {
  const { email } = req.query;

  try {
    const user = await RegisterModel.findOne({ email });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
