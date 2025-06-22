require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const rateLimit = require("express-rate-limit");

const app = express();
const server = http.createServer(app);

// ─── CORS CONFIGURATION ────────────────────────────────────────────────────────
// Allow https://www.proofofworks.com (and its subdomains) plus localhost for dev
const allowedOrigins = [
  /^https:\/\/([a-zA-Z0-9-]+\.)?proofofworks\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. Postman, mobile)
    if (!origin) return callback(null, true);
    // check against our whitelist
    if (allowedOrigins.some(rx => rx.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
}));

// Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(rx => rx.test(origin))) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ─── BASIC MIDDLEWARES ─────────────────────────────────────────────────────────
app.use(express.json());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 60,
  keyGenerator: req => req.user?.wallet || req.ip,
});
app.use(limiter);

// ─── MONGODB CONNECTION ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", err => console.error("MongoDB error:", err));
mongoose.connection.once("open", () => console.log("✅ MongoDB connected"));

// ─── MONGOOSE MODELS ────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  wallet:       { type: String, unique: true, required: true },
  displayName:  { type: String, required: true, immutable: true },
  role:         { type: String, enum: ["employer", "worker"], required: true },
  createdAt:    { type: Date, default: Date.now },
});
const POWUser = mongoose.model("POWUser", userSchema);

const jobSchema = new mongoose.Schema({
  paymentType:     { type: String, enum: ["WEEKLY", "ONE_OFF"], required: true },
  jobName:         { type: String, required: true },
  jobDescription:  { type: String, required: true },
  jobTags:         { type: [String], default: [] },
  employerAddress: { type: String, required: true },
  employeeAddress: { type: String, default: null },
  status:          { type: String, enum: ["OPEN", "IN_PROGRESS", "FINISHED"], default: "OPEN" },
  createdAt:       { type: Date, default: Date.now },
});
const POWJob = mongoose.model("POWJob", jobSchema);

const messageSchema = new mongoose.Schema({
  disputeId:  { type: Number, required: true, index: true },
  sender:     { type: String, required: true },
  content:    { type: String, required: true },
  createdAt:  { type: Date, default: Date.now },
});
messageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 14 * 24 * 3600 }
);
const POWMessage = mongoose.model("POWMessage", messageSchema);

// ─── AUTH HELPERS ──────────────────────────────────────────────────────────────
const challenges = new Map();

app.post("/api/auth/challenge", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet required" });
  const challenge = `ProofOfWork login: ${Date.now()}|${Math.random()}`;
  const expires  = Date.now() + (parseInt(process.env.CHALLENGE_EXPIRY_MIN, 10) || 10) * 60_000;
  challenges.set(wallet.toLowerCase(), { challenge, expires });
  res.json({ challenge });
});

app.post("/api/auth/verify", async (req, res) => {
  try {
    const { wallet, signature, displayName, role } = req.body;
    if (!wallet || !signature)
      return res.status(400).json({ error: "Missing wallet or signature" });

    const record = challenges.get(wallet.toLowerCase());
    if (!record || record.expires < Date.now())
      return res.status(401).json({ error: "Challenge expired" });

    const signer = ethers.verifyMessage(record.challenge, signature);
    if (signer.toLowerCase() !== wallet.toLowerCase())
      throw new Error("Invalid signature");

    let user = await POWUser.findOne({ wallet });
    if (!user) {
      if (!displayName || !role)
        return res.status(400).json({ error: "displayName and role required" });
      user = await POWUser.create({ wallet, displayName, role });
    }

    const accessToken  = jwt.sign(
      { wallet, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { wallet, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ accessToken, refreshToken });
  } catch (e) {
    console.error("Auth error:", e);
    res.status(401).json({ error: "Auth failed", details: e.message });
  }
});

app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "Refresh token required" });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { wallet: payload.wallet, role: payload.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ accessToken: newAccessToken });
  } catch (e) {
    console.error("Refresh error:", e);
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

function requireAuth(req, res, next) {
  const auth = req.headers.authorization?.split(" ");
  if (auth?.[0] !== "Bearer" || !auth[1])
    return res.status(401).json({ error: "Missing access token" });
  try {
    const payload = jwt.verify(auth[1], process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}

// ─── USER ENDPOINTS ────────────────────────────────────────────────────────────
app.get("/api/users/:wallet", async (req, res) => {
  const user = await POWUser.findOne({ wallet: req.params.wallet });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});
app.head("/api/users/:wallet", async (req, res) => {
  const exists = await POWUser.exists({ wallet: req.params.wallet });
  res.sendStatus(exists ? 200 : 404);
});

// ─── JOB ENDPOINTS ─────────────────────────────────────────────────────────────
app.post("/api/jobs", requireAuth, async (req, res) => {
  if (req.user.role !== "employer")
    return res.status(403).json({ error: "Only employers can create jobs" });

  const { paymentType, jobName, jobDescription, jobTags } = req.body;
  if (!paymentType || !jobName || !jobDescription)
    return res.status(400).json({ error: "Missing required fields" });

  const job = await POWJob.create({
    paymentType,
    jobName,
    jobDescription,
    jobTags: jobTags || [],
    employerAddress: req.user.wallet
  });
  res.status(201).json(job);
});

app.put("/api/jobs/:jobId", requireAuth, async (req, res) => {
  const job = await POWJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  if (req.body.employeeAddress) {
    if (req.user.role !== "employer" || job.employerAddress !== req.user.wallet)
      return res.status(403).json({ error: "Not authorized to assign" });
    job.employeeAddress = req.body.employeeAddress;
    job.status = "IN_PROGRESS";
  }
  if (req.body.finish === true) {
    if (req.user.role !== "worker" || job.employeeAddress !== req.user.wallet)
      return res.status(403).json({ error: "Not authorized to finish" });
    job.status = "FINISHED";
  }

  await job.save();
  res.json(job);
});

app.get("/api/jobs", async (req, res) => {
  const jobs = await POWJob.find();
  res.json(jobs);
});
app.get("/api/jobs/:jobId", async (req, res) => {
  const job = await POWJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json(job);
});

// ─── DISPUTE MESSAGING ────────────────────────────────────────────────────────
app.post("/api/messages", requireAuth, async (req, res) => {
  const { disputeId, content } = req.body;
  if (disputeId == null || !content)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const msg = await POWMessage.create({
      disputeId: Number(disputeId),
      sender:    req.user.wallet,
      content,
    });
    io.to(`dispute_${disputeId}`).emit("newMessage", msg);
    res.json(msg);
  } catch (e) {
    console.error("Message creation error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/messages/:disputeId", requireAuth, async (req, res) => {
  const page  = parseInt(req.query.page, 10)  || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const msgs  = await POWMessage.find({ disputeId: req.params.disputeId })
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.json(msgs);
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("WS connected:", socket.id);
  socket.on("joinRoom", (id) => socket.join(`dispute_${id}`));
  socket.on("sendMessage", (msg) => {
    if (msg.disputeId && msg.content && msg.sender) {
      io.to(`dispute_${msg.disputeId}`).emit("newMessage", msg);
    }
  });
});

// ─── HEALTHCHECK & START ──────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("🔥 ProofOfWork API is live!"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🌐 Listening on port ${PORT}`));

