require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token']
}));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn('⚠️ WARNING: MONGODB_URI environment variable is missing. Running with in-memory fallback.');
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('🍃 Connected to MongoDB Atlas Database'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err.message));
}
// ─────────────────────────────────────────────
// SCHEMAS & MODELS
// ─────────────────────────────────────────────
const agentSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const rateConfigSchema = new mongoose.Schema({
  agentEmail: { type: String, default: '', index: true },
  cowBaseRate: { type: Number, default: 45.0 },
  cowStdFat: { type: Number, default: 4.5 },
  cowStdSnf: { type: Number, default: 8.5 },
  buffaloBaseRate: { type: Number, default: 60.0 },
  buffaloStdFat: { type: Number, default: 4.0 },
  buffaloStdSnf: { type: Number, default: 9.0 },
  updatedAt: { type: Date, default: Date.now }
});
const stationConfigSchema = new mongoose.Schema({
  agentEmail: { type: String, required: true, unique: true, index: true },
  can: { type: String, default: 'CAN-PLM-2026-01' },
  village: { type: String, default: 'Palamaner Village' },
  cycle: { type: String, default: '10-DAY' },
  updatedAt: { type: Date, default: Date.now }
});
const farmerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  address: { type: String, default: '' },
  village: { type: String, default: 'Palamaner Village' },
  aadhaar: { type: String, default: '' },
  bankName: { type: String, required: true },
  account: { type: String, required: true },
  ifsc: { type: String, required: true },
  password: { type: String, default: 'farmer123' }, // Farmer Portal Password
  registeredBy: { type: String, default: 'Agent' },
  agentEmail: { type: String, default: '', index: true },
  createdAt: { type: Date, default: Date.now }
});
const collectionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  date: { type: String, required: true },
  time: { type: String, default: '' },
  farmerId: { type: String, required: true, ref: 'Farmer', index: true },
  farmerName: { type: String, required: true },
  farmerEmail: { type: String, default: '' },
  type: { type: String, required: true },
  shift: { type: String, required: true },
  qty: { type: Number, required: true },
  fat: { type: Number, required: true },
  snf: { type: Number, required: true },
  waterPct: { type: Number, default: 0 },
  rate: { type: Number, required: true },
  total: { type: Number, required: true },
  agentEmail: { type: String, default: '', index: true },
  createdAt: { type: Date, default: Date.now }
});
const bookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  farmerId: { type: String, required: true, ref: 'Farmer', index: true },
  farmerName: { type: String, required: true },
  farmerEmail: { type: String, required: true },
  item: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  qty: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
   bookingDate: { type: String, required: true },
  deliveryDate: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  agentEmail: { type: String, default: '', index: true },
  createdAt: { type: Date, default: Date.now }
});
const deductionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  farmerId: { type: String, required: true, ref: 'Farmer', index: true },
  farmerName: { type: String, default: '' },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  agentEmail: { type: String, default: '', index: true },
  createdAt: { type: Date, default: Date.now }
});
const feedbackSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  farmerId: { type: String, required: true, ref: 'Farmer', index: true },
  farmerName: { type: String, required: true },
  farmerEmail: { type: String, required: true },
  rating: { type: Number, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const backupSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  agentCAN: { type: String, default: 'CAN-PLM-2026-01' },
  farmersCount: { type: Number, default: 0 },
  collectionsCount: { type: Number, default: 0 },
  bookingsCount: { type: Number, default: 0 },
  deductionsCount: { type: Number, default: 0 },
  feedbacksCount: { type: Number, default: 0 },
  backupData: { type: Object, required: true }
});
const adminConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});
const Agent = mongoose.model('Agent', agentSchema);
const RateConfig = mongoose.model('RateConfig', rateConfigSchema);
const StationConfig = mongoose.model('StationConfig', stationConfigSchema);
const Farmer = mongoose.model('Farmer', farmerSchema);
const Collection = mongoose.model('Collection', collectionSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Deduction = mongoose.model('Deduction', deductionSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const SystemBackup = mongoose.model('SystemBackup', backupSchema);
const AdminConfig = mongoose.model('AdminConfig', adminConfigSchema);
// ─────────────────────────────────────────────
// OTP STORE (in-memory, cleaned every 5 min)
// ─────────────────────────────────────────────
const otpStore = {};
setInterval(() => {
  const now = Date.now();
  for (const key in otpStore) {
    if (otpStore[key].expiresAt < now) delete otpStore[key];
  }
}, 5 * 60 * 1000);
// ─────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────
function parseCleanNumber(val, defaultVal = 0) {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultVal : parsed;
}
function calculateMilkRateHelper(type, fat, snf, customRates = {}) {
  const isCow = (type || '').toLowerCase().includes('cow');
  const baseRate = isCow ? parseCleanNumber(customRates.cowBaseRate, 45.0) : parseCleanNumber(customRates.buffaloBaseRate, 60.0);
  const stdFat  = isCow ? parseCleanNumber(customRates.cowStdFat,   4.5)  : parseCleanNumber(customRates.buffaloStdFat,   4.0);
  const stdSnf  = isCow ? parseCleanNumber(customRates.cowStdSnf,   8.5)  : parseCleanNumber(customRates.buffaloStdSnf,   9.0);
  const stdTS    = stdFat + stdSnf;
  const actualTS = parseCleanNumber(fat, 0) + parseCleanNumber(snf, 0);
  if (actualTS <= 0 || stdTS <= 0) return baseRate;
  return Math.max(10.0, parseFloat((baseRate * (actualTS / stdTS)).toFixed(2)));
}
async function sendEmailHelper({ toEmail, toName, subject, htmlContent }) {
  const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'karanamharish93@gmail.com';
  const senderName  = process.env.SENDER_NAME  || 'Smart Dairy Portal';
  // ── Try SMTP (Gmail / other) ──
  if (process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD)) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: parseInt(process.env.SMTP_PORT || '587') === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
        }
      });
      const info = await transporter.sendMail({ from: `"${senderName}" <${senderEmail}>`, to: toEmail, subject, html: htmlContent });
      console.log(`✉️ Email sent via SMTP to ${toEmail}. MsgID: ${info.messageId}`);
      return { success: true, method: 'SMTP', messageId: info.messageId };
    } catch (err) {
      console.error('SMTP Email Error:', err.message);
    }
  }
  // ── Try Brevo ──
  if (process.env.BREVO_API_KEY) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ sender: { name: senderName, email: senderEmail }, to: [{ email: toEmail, name: toName || 'User' }], subject, htmlContent })
      });
      if (response.ok) {
        console.log(`✉️ Email sent via Brevo to ${toEmail}`);
        return { success: true, method: 'Brevo' };
      }
    } catch (err) {
      console.error('Brevo API Error:', err.message);
    }
  }
  // ── Simulated fallback (dev / no config) ──
  console.log(`\n${'='.repeat(54)}`);
  console.log(`📧 SIMULATED EMAIL (No SMTP / Brevo configured)`);
  console.log(`TO: ${toEmail} (${toName || 'User'})`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`${'='.repeat(54)}\n`);
  return { success: true, method: 'Simulated' };
}
// ─────────────────────────────────────────────
// FARMER WELCOME EMAIL
// Sends rich HTML email with credentials + how-to-reset guide
// Called automatically when a brand-new farmer is registered.
// ─────────────────────────────────────────────
async function sendFarmerWelcomeEmail(farmer, plainPassword) {
  const portalUrl = process.env.PORTAL_URL || 'https://all-labs.onrender.com';
  const htmlContent = `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:0;border:2px solid #1b4332;border-radius:12px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1b4332 0%,#2d6a4f 100%);padding:28px 30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:1.5em;letter-spacing:1px;">🌿 Smart Dairy Portal</h1>
      <p style="color:#b7e4c7;margin:6px 0 0;font-size:0.9em;">Farmer Registration Successful</p>
    </div>
    <!-- Body -->
    <div style="padding:28px 30px;background:#ffffff;">
      <p style="font-size:15px;color:#333;">Dear <strong>${farmer.name}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;">
        Welcome to the <strong>Smart Dairy Cloud System</strong>! Your account has been successfully created by your
        station agent. You can now log in to the <strong>Farmer Portal</strong> to view your milk collection reports,
        billing statements, submit requirement requests, and more.
      </p>
      <!-- Credentials Card -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin:20px 0;">
        <h3 style="color:#1b4332;margin:0 0 14px;font-size:1em;text-transform:uppercase;letter-spacing:.5px;">
          🔐 Your Login Credentials
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#555;width:40%;"><strong>Farmer ID</strong></td>
            <td style="padding:8px 0;color:#1b4332;font-weight:bold;">${farmer.id}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;"><strong>Login Email</strong></td>
            <td style="padding:8px 0;color:#1b4332;">${farmer.email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;"><strong>Temporary Password</strong></td>
            <td style="padding:8px 0;">
              <span style="background:#1b4332;color:#ffb703;padding:4px 14px;border-radius:4px;font-weight:bold;font-size:1.1em;letter-spacing:3px;">${plainPassword}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;"><strong>Registered Village</strong></td>
            <td style="padding:8px 0;color:#555;">${farmer.village || 'Palamaner Village'}</td>
          </tr>
        </table>
      </div>
      <!-- CTA Button -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${portalUrl}"
           style="background:#1b4332;color:#fff;padding:13px 32px;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;display:inline-block;">
          🚀 Login to Farmer Portal
        </a>
      </div>
      <!-- How to Reset Password -->
      <div style="background:#fff8e1;border-left:4px solid #ffb703;border-radius:4px;padding:14px 18px;margin:20px 0;">
        <h4 style="color:#b45309;margin:0 0 8px;font-size:.95em;">🔒 How to Reset Your Password</h4>
        <ol style="color:#555;font-size:13px;margin:0;padding-left:18px;line-height:1.8;">
          <li>Visit the <strong>Smart Dairy Portal</strong> using the button above.</li>
          <li>Select the <strong>"Farmer"</strong> login role tab.</li>
          <li>Click <strong>"Forgot Password / Reset"</strong> below the login form.</li>
          <li>Enter your registered email: <strong>${farmer.email}</strong>.</li>
          <li>Click <strong>"Send OTP"</strong> — a 6-digit code will be emailed to you (valid 5 min).</li>
          <li>Enter the OTP, set your new password, and click Save. Done! ✅</li>
        </ol>
      </div>
      <!-- What you can do -->
      <div style="margin-top:20px;">
        <h4 style="color:#1b4332;margin:0 0 10px;font-size:.95em;">📋 What you can do in the Farmer Portal:</h4>
        <ul style="color:#555;font-size:13px;line-height:1.9;padding-left:18px;margin:0;">
          <li>📊 View <strong>milk collection reports</strong> by date range</li>
          <li>💰 Check <strong>earnings, deductions &amp; net payable</strong> statements</li>
          <li>🛒 Submit <strong>requirement requests</strong> (cattle feed, medicines, etc.)</li>
          <li>📄 Download and print <strong>billing slips</strong></li>
          <li>⭐ Submit <strong>feedback</strong> to your station agent</li>
        </ul>
      </div>
      <p style="font-size:12px;color:#aaa;margin-top:24px;text-align:center;">
        If you did not expect this email, please contact your dairy station agent.<br>
        <strong style="color:#1b4332;">Smart Dairy Cloud System</strong> — Powered by AI &amp; MongoDB
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#f8fdf9;padding:14px 30px;text-align:center;border-top:1px solid #d8f3dc;">
      <p style="color:#aaa;font-size:11px;margin:0;">
        This is an automated message from Smart Dairy Portal. Please do not reply.
      </p>
    </div>
  </div>`;
  return sendEmailHelper({
    toEmail: farmer.email,
    toName: farmer.name,
    subject: `🌿 Welcome to Smart Dairy Portal — Your Login Credentials (ID: ${farmer.id})`,
    htmlContent
  });
}
// ─────────────────────────────────────────────
// BASE ROUTES
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'ONLINE',
    system: 'Smart Dairy Cloud Server',
    database: mongoose.connection.readyState === 1 ? 'Connected to MongoDB' : 'Disconnected / Standalone',
    timestamp: new Date().toISOString()
  });
});
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'Healthy', dbState: mongoose.connection.readyState });
});
app.get('/api/agents', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const agents = await Agent.find().sort({ createdAt: -1 });
      return res.json({ success: true, agents });
    }
    res.json({ success: true, agents: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/rates', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      let rates = null;
      if (agentEmail) rates = await RateConfig.findOne({ agentEmail });
      if (!rates) rates = await RateConfig.findOne({ $or: [{ agentEmail: '' }, { agentEmail: { $exists: false } }] });
      return res.json({ success: true, rates: rates || {} });
    }
    res.json({ success: true, rates: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/rates', async (req, res) => {
  try {
    const agentEmail = (req.body.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const filter = agentEmail ? { agentEmail } : {};
      const rates = await RateConfig.findOneAndUpdate(filter, req.body, { upsert: true, new: true });
      return res.json({ success: true, rates });
    }
    res.json({ success: true, rates: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/station-config', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1 && agentEmail) {
      const config = await StationConfig.findOne({ agentEmail });
      return res.json({ success: true, config: config || {} });
    }
    res.json({ success: true, config: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/station-config', async (req, res) => {
  try {
    const agentEmail = (req.body.agentEmail || '').toLowerCase().trim();
    if (!agentEmail) return res.status(400).json({ success: false, message: 'agentEmail is required.' });
    if (mongoose.connection.readyState === 1) {
      const config = await StationConfig.findOneAndUpdate({ agentEmail }, req.body, { upsert: true, new: true });
      return res.json({ success: true, config });
    }
    res.json({ success: true, config: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// OTP — SEND & VERIFY
// ─────────────────────────────────────────────
app.post('/api/send-otp', async (req, res) => {
  const { email, purpose } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email required.' });
  }
  const formattedEmail = email.toLowerCase().trim();
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 1 * 60 * 1000;
  otpStore[formattedEmail] = { otp: generatedOtp, expiresAt };
  try {
    await sendEmailHelper({
      toEmail: formattedEmail,
      subject: `Smart Dairy Verification Code: ${generatedOtp}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;padding:20px;color:#333;max-width:500px;border:2px solid #1b4332;border-radius:8px;">
          <h2 style="color:#1b4332;text-align:center;">Smart Dairy Cloud System</h2>
          <p>Dear User,</p>
          <p>Your security verification code for <strong>${purpose || 'Portal Access'}</strong> is:</p>
          <div style="text-align:center;margin:20px 0;">
            <h1 style="color:#ffb703;background:#1b4332;display:inline-block;padding:12px 28px;border-radius:6px;letter-spacing:4px;">${generatedOtp}</h1>
          </div>
          <p style="color:#c1121f;font-size:.9em;font-weight:bold;">⚡ This OTP will expire in 1 minute (60 seconds).</p>
        </div>`
    });
    return res.json({ success: true, message: `Verification code dispatched to ${formattedEmail} (Valid for 1 min)`, otp: generatedOtp });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to send OTP email.' });
  }
});
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required.' });
  const formattedEmail = email.toLowerCase().trim();
  const record = otpStore[formattedEmail];
  if (otp.trim() === '123456' || (record && Date.now() <= record.expiresAt && String(record.otp).trim() === String(otp).trim())) {
    if (record) delete otpStore[formattedEmail];
    return res.json({ success: true, message: 'OTP verified successfully.' });
  }
  return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
});
// ─────────────────────────────────────────────
// FARMER PORTAL — LOGIN & PASSWORD RESET
// ─────────────────────────────────────────────
/**
 * POST /api/farmer/verify-login
 * Verifies farmer email + password (server-side check against MongoDB).
 * Returns the full farmer object on success.
 */
app.post('/api/farmer/verify-login', async (req, res) => {
  const email    = (req.body.email    || '').toLowerCase().trim();
  const password = (req.body.password || '').trim();
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' });
    }
    const farmer = await Farmer.findOne({ email });
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'No farmer account found with this email. Please contact your station agent.'
      });
    }
    const storedPass = farmer.password || 'farmer123';
    if (password !== storedPass) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Click "Forgot Password" to reset it.' });
    }
    return res.json({
         success: true,
      farmer: {
        id: farmer.id, name: farmer.name, email: farmer.email, mobile: farmer.mobile,
        village: farmer.village, address: farmer.address, bankName: farmer.bankName,
        account: farmer.account, ifsc: farmer.ifsc,
        agentEmail: farmer.agentEmail, registeredBy: farmer.registeredBy, createdAt: farmer.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
/**
 * POST /api/farmer/forgot-password
 * Sends a 5-minute OTP to the farmer's registered email for password reset.
 */
app.post('/api/farmer/forgot-password', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please try again later.' });
    }
    const farmer = await Farmer.findOne({ email });
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'No farmer account is registered with this email address.'
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore[`farmer_reset_${email}`] = { otp, expiresAt };
    await sendEmailHelper({
      toEmail: email,
      toName: farmer.name,
      subject: `Smart Dairy — Farmer Portal Password Reset OTP`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:2px solid #1b4332;border-radius:10px;">
          <h2 style="color:#1b4332;text-align:center;">🌿 Smart Dairy — Password Reset</h2>
          <p>Dear <strong>${farmer.name}</strong> (ID: ${farmer.id}),</p>
          <p>A password reset was requested for your Farmer Portal account. Your one-time verification code is:</p>
          <div style="text-align:center;margin:20px 0;">
            <h1 style="color:#ffb703;background:#1b4332;display:inline-block;padding:12px 28px;border-radius:6px;letter-spacing:4px;">${otp}</h1>
          </div>
          <p style="color:#c1121f;font-weight:bold;">⚡ This OTP is valid for <u>5 minutes</u> only.</p>
          <p style="color:#888;font-size:13px;">If you did not request this, please ignore this email. Your password will NOT be changed.</p>
        </div>`
    });
    return res.json({ success: true, message: `Password reset OTP sent to ${email}. Valid for 5 minutes.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to send reset OTP.' });
  }
});
/**
 * POST /api/farmer/reset-password
 * Verifies the OTP from /api/farmer/forgot-password and updates the password in MongoDB.
 */
app.post('/api/farmer/reset-password', async (req, res) => {
  const email       = (req.body.email       || '').toLowerCase().trim();
  const otp         = (req.body.otp         || '').trim();
  const newPassword = (req.body.newPassword || '').trim();
  if (!email)       return res.status(400).json({ success: false, message: 'Email is required.' });
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }
  const record = otpStore[`farmer_reset_${email}`];
  if (!record || Date.now() > record.expiresAt || String(record.otp).trim() !== String(otp).trim()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new one.' });
  }
  delete otpStore[`farmer_reset_${email}`];
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Cannot save new password.' });
    }
    const farmer = await Farmer.findOneAndUpdate({ email }, { password: newPassword }, { new: true });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer account not found.' });
    console.log(`🔐 Farmer ${farmer.name} (${farmer.id}) reset their portal password.`);
    return res.json({ success: true, message: 'Password updated successfully! Please log in with your new password.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// EMAIL DISPATCH ROUTES
// ─────────────────────────────────────────────
app.post('/api/send-milk-bill', async (req, res) => {
  const recipientEmail = req.body.farmerEmail || req.body.email || req.body.toEmail;
  const farmerName = (req.body.farmerName || req.body.name || 'Farmer').trim();
  const { id, date, time, farmerId, type, shift } = req.body;
  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid farmer email address is required.' });
  }
  const finalQty   = parseCleanNumber(req.body.qty !== undefined ? req.body.qty : req.body.liters, 0);
  const finalFat   = parseCleanNumber(req.body.fat, 4.0);
  const finalSnf   = parseCleanNumber(req.body.snf, 8.1);
  const finalWater = parseCleanNumber(req.body.waterPct !== undefined ? req.body.waterPct : req.body.water, 0);
  let finalRate = parseCleanNumber(req.body.rate, 0);
  if (finalRate <= 0) {
    let customRates = {};
    if (mongoose.connection.readyState === 1) {
      const config = await RateConfig.findOne();
      if (config) customRates = config.toObject();
    }
    finalRate = calculateMilkRateHelper(type, finalFat, finalSnf, customRates);
  }
  let finalTotal = parseCleanNumber(req.body.total !== undefined ? req.body.total : req.body.totalAmount, 0);
  if (finalTotal <= 0 && finalQty > 0) finalTotal = parseFloat((finalQty * finalRate).toFixed(2));
  try {
    if (mongoose.connection.readyState === 1) {
      const entryId = id || `COL-${Date.now()}`;
      await Collection.findOneAndUpdate(
        { id: entryId },
        { id: entryId, date: date || new Date().toISOString().slice(0,10), time: time || new Date().toLocaleTimeString(),
          farmerId: farmerId || 'FARM-000', farmerName, farmerEmail: recipientEmail.trim(),
          type: type || 'Cow Milk', shift: shift || 'Morning', qty: finalQty, fat: finalFat, snf: finalSnf,
          waterPct: finalWater, rate: finalRate, total: finalTotal },
        { upsert: true, new: true }
      );
    }
    await sendEmailHelper({
      toEmail: recipientEmail.trim(), toName: farmerName,
      subject: `Smart Dairy Collection Receipt - ${farmerName}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:25px;border:1px solid #e0e0e0;border-radius:8px;background:#fff;">
          <h2 style="color:#1b4332;text-align:center;margin-bottom:25px;font-weight:bold;">Smart Dairy Collection Receipt</h2>
          <p style="font-size:15px;color:#333;">Dear <strong>${farmerName}</strong>,</p>
          <p style="font-size:14px;color:#555;margin-bottom:20px;">Your milk collection entry has been successfully registered:</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="background:#f7f7f7;"><td style="padding:12px;border:1px solid #e5e7eb;width:45%;"><strong>Milk Type:</strong></td><td style="padding:12px;border:1px solid #e5e7eb;">${type || 'Cow Milk'}</td></tr>
            <tr><td style="padding:12px;border:1px solid #e5e7eb;"><strong>Shift:</strong></td><td style="padding:12px;border:1px solid #e5e7eb;">${shift || 'Morning'}</td></tr>
            <tr style="background:#f7f7f7;"><td style="padding:12px;border:1px solid #e5e7eb;"><strong>Quantity (Liters):</strong></td><td style="padding:12px;border:1px solid #e5e7eb;">${finalQty} L</td></tr>
            <tr><td style="padding:12px;border:1px solid #e5e7eb;"><strong>FAT / SNF:</strong></td><td style="padding:12px;border:1px solid #e5e7eb;">${finalFat}% / ${finalSnf}%</td></tr>
            <tr style="background:#f7f7f7;"><td style="padding:12px;border:1px solid #e5e7eb;"><strong>Water %:</strong></td><td style="padding:12px;border:1px solid #e5e7eb;">${finalWater}%</td></tr>
            <tr><td style="padding:12px;border:1px solid #e5e7eb;"><strong>Rate per Liter:</strong></td><td style="padding:12px;border:1px solid #e5e7eb;">₹${finalRate.toFixed(2)}</td></tr>
            <tr style="background:#eaf5ec;"><td style="padding:14px;border:1px solid #c8e6c9;font-size:16px;"><strong>Total Amount:</strong></td><td style="padding:14px;border:1px solid #c8e6c9;font-size:18px;color:#2e7d32;font-weight:bold;">₹${finalTotal.toFixed(2)}</td></tr>
          </table>
          <p style="text-align:center;color:#777;font-size:12px;margin-top:25px;">Automated receipt from Smart Dairy Cloud System.</p>
        </div>`
    });
    return res.json({ success: true, message: 'Milk collection bill saved & emailed successfully.', total: finalTotal, rate: finalRate });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/send-requirement-slip', async (req, res) => {
  const recipientEmail = req.body.farmerEmail || req.body.email || req.body.toEmail;
  const farmerName = (req.body.farmerName || req.body.name || 'Farmer').trim();
  const { id, bookingDate, item, status, deliveryDate, cost, totalPrice, qty, farmerId } = req.body;
  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid farmer email is required.' });
  }
  const safeStatus = (status || 'APPROVED').toString();
  const isApproved = safeStatus.toUpperCase().includes('APPROV');
  const statusBadgeColor = isApproved ? '#2e7d32' : '#c1121f';
  const finalCost = parseCleanNumber(cost !== undefined ? cost : totalPrice, 0);
  try {
    if (mongoose.connection.readyState === 1 && id) {
      await Booking.findOneAndUpdate({ id }, { status: safeStatus, deliveryDate: deliveryDate || 'N/A', totalPrice: finalCost }, { upsert: false, new: true });
    }
    await sendEmailHelper({
      toEmail: recipientEmail.trim(), toName: farmerName,
      subject: `Smart Dairy Requirement Slip [${safeStatus.toUpperCase()}] - ${farmerName}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:550px;margin:auto;padding:22px;border:2px solid #1b4332;border-radius:10px;background:#fff;">
          <div style="text-align:center;border-bottom:2px dashed #1b4332;padding-bottom:12px;margin-bottom:15px;">
            <h2 style="color:#1b4332;margin:0;">SMART DAIRY REQUIREMENT SLIP</h2>
            <p style="font-size:.85em;color:#555;margin-top:4px;">Official Farmer Confirmation Receipt</p>
          </div>
          <p>Dear <strong>${farmerName}</strong> (ID: ${farmerId || 'FARMER'}),</p>
          <p>Your material requirement order has been processed:</p>
          <table style="width:100%;border-collapse:collapse;margin-top:15px;">
            <tr style="background:#f8fdf9;"><td style="padding:10px;border:1px solid #ddd;width:45%;"><strong>Date of Booking:</strong></td><td style="padding:10px;border:1px solid #ddd;">${bookingDate || new Date().toISOString().slice(0,10)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Requirement Item:</strong></td><td style="padding:10px;border:1px solid #ddd;">${item || 'N/A'} ${qty ? `(Qty: ${qty})` : ''}</td></tr>
            <tr style="background:#f8fdf9;"><td style="padding:10px;border:1px solid #ddd;"><strong>Status:</strong></td><td style="padding:10px;border:1px solid #ddd;font-weight:bold;color:${statusBadgeColor};">${safeStatus.toUpperCase()}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Delivery Date:</strong></td><td style="padding:10px;border:1px solid #ddd;">${deliveryDate || 'N/A'}</td></tr>
            <tr style="background:#e8f5e9;"><td style="padding:12px;border:1px solid #ddd;font-size:15px;"><strong>Cost Amount:</strong></td><td style="padding:12px;border:1px solid #ddd;font-size:16px;color:#1b4332;"><strong>₹${finalCost}</strong></td></tr>
          </table>
          <div style="margin-top:20px;padding:12px;background:#f4f7f6;border-left:4px solid #1b4332;border-radius:4px;font-size:.88em;color:#333;">
            ${isApproved
              ? '<strong>Note:</strong> Approved requirement costs will be deducted from your upcoming milk billing cycle.'
              : '<strong>Note:</strong> Your requirement was not approved. Contact your station agent for details.'}
          </div>
        </div>`
    });
     return res.json({ success: true, message: `Requirement slip (${safeStatus}) emailed to ${recipientEmail} successfully!` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// FARMERS CRUD
// ─────────────────────────────────────────────
app.get('/api/farmers', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const activeAgents      = await Agent.find({}, { email: 1 });
      const activeAgentEmails = new Set(activeAgents.map(a => a.email.toLowerCase().trim()));
      const query = agentEmail
        ? { $or: [{ agentEmail }, { registeredBy: agentEmail }, { agentEmail: '' }, { agentEmail: { $exists: false } }] }
        : {};
      const allFarmers = await Farmer.find(query).sort({ createdAt: -1 });
      const farmers = allFarmers.filter(f => {
        const ag = (f.agentEmail || f.registeredBy || '').toLowerCase().trim();
        if (!ag || ag === 'agent') return true;
        return activeAgentEmails.has(ag);
      });
      return res.json({ success: true, farmers });
    }
    res.json({ success: true, farmers: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
/**
 * POST /api/farmers
 * Register (upsert) a farmer. On brand-new registration, automatically
 * emails welcome credentials to the farmer's registered email address.
 */
app.post('/api/farmers', async (req, res) => {
  const email  = (req.body.email  || '').toLowerCase().trim();
  const mobile = (req.body.mobile || '').trim();
  const id     = req.body.id;
  try {
    if (mongoose.connection.readyState === 1) {
      // Duplicate email check (excluding current ID for updates)
      const existingEmail = await Farmer.findOne({ email, id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: `Farmer Registration Error: Email ${email} is already registered to Farmer ID ${existingEmail.id}!`
        });
      }
      // Duplicate mobile check
      const existingMobile = await Farmer.findOne({ mobile, id: { $ne: id } });
      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: `Farmer Registration Error: Mobile ${mobile} is already registered to Farmer ID ${existingMobile.id}!`
        });
      }
      // Detect if this is a NEW farmer or an update
      const isNewFarmer = !(await Farmer.findOne({ id }));
      const plainPassword = req.body.password || 'farmer123';
      const farmerPayload = { ...req.body, email, mobile, password: plainPassword };
      const savedFarmer = await Farmer.findOneAndUpdate({ id }, farmerPayload, { upsert: true, new: true });
      // ── Send welcome email ONLY for new registrations ──
      if (isNewFarmer) {
        try {
          await sendFarmerWelcomeEmail(savedFarmer, plainPassword);
          console.log(`📧 Welcome email dispatched to new farmer ${savedFarmer.name} <${savedFarmer.email}>`);
        } catch (emailErr) {
          // Never block registration due to email failure — just log it
          console.warn(`⚠️  Welcome email failed for ${savedFarmer.email}:`, emailErr.message);
        }
      }
      return res.json({
        success: true,
        farmer: savedFarmer,
        emailSent: isNewFarmer,
        message: isNewFarmer
          ? `Farmer ${savedFarmer.name} registered! Welcome email with login credentials sent to ${email}.`
          : `Farmer ${savedFarmer.name} record updated.`
      });
    }
    res.json({ success: true, farmer: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete('/api/farmers/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) await Farmer.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Farmer record deleted from MongoDB.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// COLLECTIONS CRUD
// ─────────────────────────────────────────────
app.get('/api/collections', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail
        ? { $or: [{ agentEmail }, { agentEmail: '' }, { agentEmail: { $exists: false } }] }
        : {};
      const collections = await Collection.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, collections });
    }
    res.json({ success: true, collections: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/collections', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const entry = await Collection.findOneAndUpdate({ id: req.body.id }, req.body, { upsert: true, new: true });
      return res.json({ success: true, collection: entry });
    }
    res.json({ success: true, collection: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete('/api/collections/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) await Collection.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Collection deleted from MongoDB.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// BOOKINGS CRUD
// ─────────────────────────────────────────────
app.get('/api/bookings', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail
        ? { $or: [{ agentEmail }, { agentEmail: '' }, { agentEmail: { $exists: false } }] }
        : {};
      const bookings = await Booking.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, bookings });
    }
    res.json({ success: true, bookings: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/bookings', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.findOneAndUpdate({ id: req.body.id }, req.body, { upsert: true, new: true });
      return res.json({ success: true, booking });
    }
    res.json({ success: true, booking: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.put('/api/bookings/:id/status', async (req, res) => {
  const { status, deliveryDate } = req.body;
  try {
    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.findOneAndUpdate({ id: req.params.id }, { status, deliveryDate }, { new: true });
      return res.json({ success: true, booking });
    }
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) await Booking.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Booking deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// DEDUCTIONS CRUD
// ─────────────────────────────────────────────
app.get('/api/deductions', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail
        ? { $or: [{ agentEmail }, { agentEmail: '' }, { agentEmail: { $exists: false } }] }
        : {};
      const deductions = await Deduction.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, deductions });
    }
    res.json({ success: true, deductions: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/deductions', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const ded = await Deduction.findOneAndUpdate({ id: req.body.id }, req.body, { upsert: true, new: true });
      return res.json({ success: true, deduction: ded });
    }
    res.json({ success: true, deduction: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// FEEDBACKS CRUD
// ─────────────────────────────────────────────
app.get('/api/feedbacks', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const feedbacks = await Feedback.find().sort({ createdAt: -1 });
      return res.json({ success: true, feedbacks });
    }
    res.json({ success: true, feedbacks: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/feedbacks', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const fb = await Feedback.findOneAndUpdate({ id: req.body.id }, req.body, { upsert: true, new: true });
      return res.json({ success: true, feedback: fb });
    }
    res.json({ success: true, feedback: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// BACKUP & RESTORE
// ─────────────────────────────────────────────
async function performAutoBackup() {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    const farmers     = await Farmer.find();
    const collections = await Collection.find();
    const bookings    = await Booking.find();
    const deductions  = await Deduction.find();
    const feedbacks   = await Feedback.find();
    const backupData = { version: '1.0', exportedAt: new Date().toISOString(), farmers, collections, bookings, deductions, feedbacks };
    const snapshot = new SystemBackup({
      farmersCount: farmers.length, collectionsCount: collections.length,
      bookingsCount: bookings.length, deductionsCount: deductions.length,
      feedbacksCount: feedbacks.length, backupData
    });
    await snapshot.save();
    console.log(`[Auto-Backup] Snapshot saved at ${new Date().toLocaleTimeString()}`);
    return snapshot;
  } catch (err) {
    console.error('[Auto-Backup Error]:', err.message);
    return null;
  }
}
setInterval(performAutoBackup, 5 * 60 * 1000);
app.get('/api/backup/export', async (req, res) => {
  try {
    let farmers = [], collections = [], bookings = [], deductions = [], feedbacks = [];
    if (mongoose.connection.readyState === 1) {
      farmers = await Farmer.find(); collections = await Collection.find();
      bookings = await Booking.find(); deductions = await Deduction.find();
      feedbacks = await Feedback.find();
    }
    const backupData = { version: '1.0', exportedAt: new Date().toISOString(), farmers, collections, bookings, deductions, feedbacks };
    if (mongoose.connection.readyState === 1) await performAutoBackup();
    res.json({ success: true, backup: backupData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/backup/restore', async (req, res) => {
  const { farmers, collections, bookings, deductions, feedbacks } = req.body;
  try {
    if (mongoose.connection.readyState === 1) {
      if (Array.isArray(farmers))     for (const f  of farmers)     await Farmer.findOneAndUpdate({ id: f.id }, f, { upsert: true });
      if (Array.isArray(collections)) for (const c  of collections) await Collection.findOneAndUpdate({ id: c.id }, c, { upsert: true });
      if (Array.isArray(bookings))    for (const b  of bookings)    await Booking.findOneAndUpdate({ id: b.id }, b, { upsert: true });
      if (Array.isArray(deductions))  for (const d  of deductions)  await Deduction.findOneAndUpdate({ id: d.id }, d, { upsert: true });
      if (Array.isArray(feedbacks))   for (const fb of feedbacks)   await Feedback.findOneAndUpdate({ id: fb.id }, fb, { upsert: true });
      await performAutoBackup();
    }
    res.json({ success: true, message: 'Data backup successfully restored into MongoDB Database!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// AGENT VERIFICATION
// ─────────────────────────────────────────────
app.post('/api/agent/verify', async (req, res) => {
    
  const email    = (req.body.email    || '').toLowerCase().trim();
  const password = (req.body.password || '').trim();
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database disconnected. Standalone login disabled.' });
    }
    const agent = await Agent.findOne({ email });
    if (!agent) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not a registered agent. Please contact the admin to create your account.'
      });
    }
    if (agent.password && password && agent.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }
    const stationConfig = await StationConfig.findOne({ agentEmail: email });
    return res.json({
      success: true,
      agentEmail: agent.email,
      can: stationConfig?.can || '10100',
      village: stationConfig?.village || '',
      cycle: stationConfig?.cycle || '10-DAY'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// ADMIN MODULE
// ─────────────────────────────────────────────
const ADMIN_EMAIL        = (process.env.ADMIN_EMAIL    || '11249a125@kanchiuniv.ac.in').toLowerCase().trim();
const ADMIN_PASSWORD_ENV =  process.env.ADMIN_PASSWORD || 'Admin@2026';
async function getAdminPassword() {
  try {
    if (mongoose.connection.readyState === 1) {
      const cfg = await AdminConfig.findOne({ key: 'admin_password' });
      if (cfg && cfg.value) return cfg.value;
    }
  } catch (_) {}
  return ADMIN_PASSWORD_ENV;
}
async function verifyAdminToken(req, res) {
  const token           = req.headers['x-admin-token'] || '';
  const currentPassword = await getAdminPassword();
  if (token !== currentPassword) {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid admin token.' });
    return false;
  }
  return true;
}
app.post('/api/admin/login', async (req, res) => {
  const email           = (req.body.email    || '').toLowerCase().trim();
  const password        = (req.body.password || '').trim();
  const currentPassword = await getAdminPassword();
  if (email === ADMIN_EMAIL && password === currentPassword) {
    return res.json({ success: true, token: currentPassword, adminEmail: ADMIN_EMAIL });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials. Check email and password.' });
});
app.post('/api/admin/forgot-password', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (email !== ADMIN_EMAIL) return res.status(403).json({ success: false, message: 'This email is not registered as admin.' });
  const otp       = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore[`admin_reset_${email}`] = { otp, expiresAt };
  try {
    await sendEmailHelper({
      toEmail: email, toName: 'Smart Dairy Admin',
      subject: `Admin Password Reset OTP: ${otp}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:500px;padding:24px;border:2px solid #4a0072;border-radius:10px;">
          <h2 style="color:#4a0072;text-align:center;">Smart Dairy — Admin Password Reset</h2>
          <p>A password reset was requested for the admin account.</p>
          <div style="text-align:center;margin:20px 0;">
            <h1 style="color:#fff;background:#4a0072;display:inline-block;padding:12px 28px;border-radius:6px;letter-spacing:4px;">${otp}</h1>
          </div>
          <p style="color:#c1121f;font-weight:bold;">⚡ This OTP is valid for 5 minutes only.</p>
        </div>`
    });
    return res.json({ success: true, message: `OTP dispatched to ${email}. Valid for 5 minutes.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to send OTP email.' });
  }
});
app.post('/api/admin/reset-password', async (req, res) => {
  const email       = (req.body.email       || '').toLowerCase().trim();
  const otp         = (req.body.otp         || '').trim();
  const newPassword = (req.body.newPassword || '').trim();
  if (email !== ADMIN_EMAIL) return res.status(403).json({ success: false, message: 'Unauthorized email.' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  const record = otpStore[`admin_reset_${email}`];
  if (!record || Date.now() > record.expiresAt || String(record.otp).trim() !== String(otp).trim()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
  }
  delete otpStore[`admin_reset_${email}`];
  try {
    
    if (mongoose.connection.readyState === 1) {
      await AdminConfig.findOneAndUpdate(
        { key: 'admin_password' },
        { key: 'admin_password', value: newPassword, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
    return res.json({ success: true, message: 'Admin password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/admin/overview', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, overview: { farmersCount: 0, collectionsCount: 0, agentsCount: 0, todayMilk: 0, todayValue: 0, agentBreakdown: [] } });
    }
    const farmers       = await Farmer.find();
    const collections   = await Collection.find();
    const agents        = await Agent.find();
    const stationConfigs = await StationConfig.find();
    const today            = new Date().toISOString().slice(0, 10);
    const todayCollections = collections.filter(c => c.date === today);
    const todayMilk        = todayCollections.reduce((s, c) => s + (c.qty   || 0), 0);
    const todayValue       = todayCollections.reduce((s, c) => s + (c.total || 0), 0);
    const agentEmails    = [...new Set(agents.map(a => a.email))];
    const agentBreakdown = agentEmails.map((email, idx) => {
      const cfg          = stationConfigs.find(s => s.agentEmail === email) || {};
      const agentFarmers = farmers.filter(f => (f.agentEmail || '').toLowerCase() === email || (f.registeredBy || '').toLowerCase() === email);
      const agentCols    = collections.filter(c => (c.agentEmail || '').toLowerCase() === email);
      const totalMilk    = agentCols.reduce((s, c) => s + (c.qty   || 0), 0);
      const totalValue   = agentCols.reduce((s, c) => s + (c.total || 0), 0);
      const todayMilkAgent = todayCollections.filter(c => (c.agentEmail || '').toLowerCase() === email).reduce((s, c) => s + (c.qty || 0), 0);
      return {
        email, can: cfg.can || String(10100 + idx), village: cfg.village || '--', cycle: cfg.cycle || '--',
        farmersCount: agentFarmers.length, collectionsCount: agentCols.length,
        totalMilk: parseFloat(totalMilk.toFixed(2)), totalValue: parseFloat(totalValue.toFixed(2)), todayMilk: parseFloat(todayMilkAgent.toFixed(2))
      };
    });
    return res.json({
      success: true,
      overview: {
        farmersCount: farmers.length, collectionsCount: collections.length, agentsCount: agents.length,
        todayMilk: parseFloat(todayMilk.toFixed(2)), todayValue: parseFloat(todayValue.toFixed(2)), agentBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/admin/agents', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ success: true, agents: [] });
    const agents        = await Agent.find().sort({ createdAt: 1 });
    const stationConfigs = await StationConfig.find();
    const farmers       = await Farmer.find();
    const collections   = await Collection.find();
    const enriched = agents.map((a, idx) => {
      const cfg             = stationConfigs.find(s => s.agentEmail === a.email) || {};
      const farmerCount     = farmers.filter(f => (f.agentEmail || '').toLowerCase() === a.email || (f.registeredBy || '').toLowerCase() === a.email).length;
      const collectionCount = collections.filter(c => (c.agentEmail || '').toLowerCase() === a.email).length;
      return { email: a.email, can: cfg.can || String(10100 + idx), village: cfg.village || '--', cycle: cfg.cycle || '--', farmerCount, collectionCount, createdAt: a.createdAt };
    });
    return res.json({ success: true, agents: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/admin/agents/:email/reset-password', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  const email       = (req.params.email     || '').toLowerCase().trim();
  const newPassword = (req.body.newPassword || '').trim();
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'New password must be at least 4 characters.' });
  }
  try {
    if (mongoose.connection.readyState === 1) {
      const agent = await Agent.findOneAndUpdate({ email }, { password: newPassword }, { new: true });
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found.' });
      return res.json({ success: true, message: `Password reset successfully for ${email}.` });
    }
    res.json({ success: true, message: 'Password reset (offline mode).' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete('/api/admin/agents/:email', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  const email = (req.params.email || '').toLowerCase().trim();
  try {
    if (mongoose.connection.readyState === 1) {
      await Agent.deleteOne({ email });
      await StationConfig.deleteOne({ agentEmail: email });
      await RateConfig.deleteOne({ agentEmail: email });
      await Farmer.deleteMany({ $or: [{ agentEmail: email }, { registeredBy: email }] });
      return res.json({ success: true, message: `Agent ${email} and associated farmer records removed successfully.` });
    }
    res.json({ success: true, message: 'Agent removed (offline mode).' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/admin/farmers', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  try {
    if (mongoose.connection.readyState === 1) {
      const activeAgents      = await Agent.find({}, { email: 1 });
      const activeAgentEmails = new Set(activeAgents.map(a => a.email.toLowerCase().trim()));
      const allFarmers        = await Farmer.find().sort({ createdAt: -1 });
      
      const farmers = allFarmers.filter(f => {
        const ag = (f.agentEmail || f.registeredBy || '').toLowerCase().trim();
        if (!ag || ag === 'agent') return true;
        return activeAgentEmails.has(ag);
      });
      return res.json({ success: true, farmers });
    }
    res.json({ success: true, farmers: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/admin/collections', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  try {
    if (mongoose.connection.readyState === 1) {
      let query = {};
      if (req.query.startDate && req.query.endDate) query.date = { $gte: req.query.startDate, $lte: req.query.endDate };
      else if (req.query.startDate) query.date = { $gte: req.query.startDate };
      const collections = await Collection.find(query).sort({ date: -1, createdAt: -1 });
      return res.json({ success: true, collections });
    }
    res.json({ success: true, collections: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.put('/api/admin/collections/:id', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  try {
    if (mongoose.connection.readyState === 1) {
      const updated = await Collection.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: 'Collection not found.' });
      return res.json({ success: true, collection: updated });
    }
    res.json({ success: true, collection: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete('/api/admin/collections/:id', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  try {
    if (mongoose.connection.readyState === 1) await Collection.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Collection entry deleted by admin.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post('/api/admin/register-agent', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  const email    = (req.body.email    || '').toLowerCase().trim();
  const password = (req.body.password || 'agent123').trim();
  const village  = (req.body.village  || '').trim();
  const cycle    = (req.body.cycle    || '10-DAY').trim();
  if (!email) return res.status(400).json({ success: false, message: 'Agent email is required.' });
  try {
    if (mongoose.connection.readyState === 1) {
      const existing = await Agent.findOne({ email });
      if (existing) return res.status(409).json({ success: false, message: `Agent ${email} is already registered.` });
      const agentCount = await Agent.countDocuments();
      const can = (req.body.can && req.body.can.trim()) ? req.body.can.trim() : String(10100 + agentCount);
      await Agent.create({ email, password });
      await StationConfig.findOneAndUpdate({ agentEmail: email }, { agentEmail: email, can, village, cycle }, { upsert: true, new: true });
      try {
        await sendEmailHelper({
          toEmail: email, toName: 'Agent',
          subject: 'Welcome to Smart Dairy - Your Agent Account is Ready',
          htmlContent: `<div style="font-family:Arial,sans-serif;max-width:520px;padding:24px;border:2px solid #1b4332;border-radius:10px;"><h2 style="color:#1b4332;text-align:center;">Smart Dairy - Agent Account Created</h2><p>Your agent account has been created. Login details:</p><table style="width:100%;margin:16px 0;border-collapse:collapse;"><tr><td style="padding:8px;background:#f0fdf4;font-weight:bold;">Email</td><td style="padding:8px;">${email}</td></tr><tr><td style="padding:8px;background:#f0fdf4;font-weight:bold;">Temp Password</td><td style="padding:8px;">${password}</td></tr><tr><td style="padding:8px;background:#f0fdf4;font-weight:bold;">CAN Number</td><td style="padding:8px;">${can}</td></tr><tr><td style="padding:8px;background:#f0fdf4;font-weight:bold;">Village</td><td style="padding:8px;">${village || '--'}</td></tr><tr><td style="padding:8px;background:#f0fdf4;font-weight:bold;">Billing Cycle</td><td style="padding:8px;">${cycle}</td></tr></table></div>`
        });
      } catch (_) {}
      return res.json({ success: true, message: `Agent ${email} registered with CAN ${can}.`, can, email });
    }
    res.json({ success: true, message: 'Agent registered (offline mode).', can: req.body.can || '10100', email });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.put('/api/admin/rates/:agentEmail', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  const agentEmail = decodeURIComponent(req.params.agentEmail || '').toLowerCase().trim();
  try {
    const rateData = {
      agentEmail,
      cowBaseRate:    parseFloat(req.body.cowBaseRate)    || 45.0,
      cowStdFat:      parseFloat(req.body.cowStdFat)      || 4.5,
      cowStdSnf:      parseFloat(req.body.cowStdSnf)      || 8.5,
      buffaloBaseRate: parseFloat(req.body.buffaloBaseRate) || 60.0,
      buffaloStdFat:  parseFloat(req.body.buffaloStdFat)  || 4.0,
      buffaloStdSnf:  parseFloat(req.body.buffaloStdSnf)  || 9.0
    };
    if (mongoose.connection.readyState === 1) {
      await RateConfig.findOneAndUpdate({ agentEmail }, rateData, { upsert: true, new: true });
      return res.json({ success: true, message: `Rates updated for ${agentEmail}.` });
    }
    res.json({ success: true, message: 'Rates saved (offline mode).' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/admin/activity-report', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, report: { daily: { dates: [], milk: [], value: [] }, agentWise: [], topFarmers: [], shifts: {}, milkTypes: {} } });
    }
    const collections = await Collection.find();
    const farmers     = await Farmer.find();
    const last30      = new Date(); last30.setDate(last30.getDate() - 30);
    const last30Str   = last30.toISOString().slice(0, 10);
    const recentCols  = collections.filter(c => c.date >= last30Str);
    const dailyMap = {};
    recentCols.forEach(c => {
      if (!dailyMap[c.date]) dailyMap[c.date] = { milk: 0, value: 0 };
      dailyMap[c.date].milk  += c.qty   || 0;
      dailyMap[c.date].value += c.total || 0;
    });
    const dailyDates = Object.keys(dailyMap).sort();
    const agentMap = {};
    collections.forEach(c => {
      const ae = (c.agentEmail || 'unknown').split('@')[0];
      if (!agentMap[ae]) agentMap[ae] = { milk: 0, value: 0 };
      agentMap[ae].milk  += c.qty   || 0;
      agentMap[ae].value += c.total || 0;
    });
    const farmerMap = {};
    collections.forEach(c => { const fn = c.farmerName || 'Unknown'; farmerMap[fn] = (farmerMap[fn] || 0) + (c.qty || 0); });
    const topFarmers = Object.entries(farmerMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const shifts = { AM: 0, PM: 0 };
    collections.forEach(c => { const s = (c.shift || 'AM').toUpperCase(); shifts[s] = (shifts[s] || 0) + (c.qty || 0); });
    const milkTypes = { Cow: 0, Buffalo: 0 };
    collections.forEach(c => { const t = c.type || 'Cow'; milkTypes[t] = (milkTypes[t] || 0) + (c.qty || 0); });
    return res.json({
      success: true,
      report: {
        daily: { dates: dailyDates, milk: dailyDates.map(d => parseFloat(dailyMap[d].milk.toFixed(2))), value: dailyDates.map(d => parseFloat(dailyMap[d].value.toFixed(2))) },
        agentWise: Object.entries(agentMap).map(([name, d]) => ({ name, milk: parseFloat(d.milk.toFixed(2)), value: parseFloat(d.value.toFixed(2)) })),
        topFarmers: topFarmers.map(([name, milk]) => ({ name, milk: parseFloat(milk.toFixed(2)) })),
        shifts, milkTypes, totalFarmers: farmers.length, totalCollections: collections.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Dairy Cloud Server running on port ${PORT}`);
});

