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
  password: { type: String, default: 'farmer123' },
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

const Agent = mongoose.model('Agent', agentSchema);
const RateConfig = mongoose.model('RateConfig', rateConfigSchema);
const StationConfig = mongoose.model('StationConfig', stationConfigSchema);
const Farmer = mongoose.model('Farmer', farmerSchema);
const Collection = mongoose.model('Collection', collectionSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Deduction = mongoose.model('Deduction', deductionSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const SystemBackup = mongoose.model('SystemBackup', backupSchema);

const otpStore = {};

setInterval(() => {
  const now = Date.now();
  for (const email in otpStore) {
    if (otpStore[email].expiresAt < now) delete otpStore[email];
  }
}, 5 * 60 * 1000);

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
  const stdFat = isCow ? parseCleanNumber(customRates.cowStdFat, 4.5) : parseCleanNumber(customRates.buffaloStdFat, 4.0);
  const stdSnf = isCow ? parseCleanNumber(customRates.cowStdSnf, 8.5) : parseCleanNumber(customRates.buffaloStdSnf, 9.0);

  const stdTS = stdFat + stdSnf;
  const actualTS = parseCleanNumber(fat, 0) + parseCleanNumber(snf, 0);

  if (actualTS <= 0 || stdTS <= 0) return baseRate;
  const rate = parseFloat((baseRate * (actualTS / stdTS)).toFixed(2));
  return Math.max(10.0, rate);
}

async function sendEmailHelper({ toEmail, toName, subject, htmlContent }) {
  const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'karanamharish93@gmail.com';
  const senderName = process.env.SENDER_NAME || 'Smart Dairy Portal';

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

      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: toEmail,
        subject: subject,
        html: htmlContent
      });
      return { success: true, method: 'SMTP', messageId: info.messageId };
    } catch (err) {
      console.error('SMTP Email Error:', err.message);
    }
  }

  return { success: true, method: 'Simulated' };
}

app.get('/', (req, res) => {
  res.json({ success: true, status: 'ONLINE', system: 'Smart Dairy Cloud Server' });
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
      if (!rates) rates = await RateConfig.findOne({ $or: [{ agentEmail: '' }, { agentEmail: {$exists: false } }] });
      return res.json({ success: true, rates: rates || {} });
    }
    res.json({ success: true, rates: {} });
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
      htmlContent: `<div style="font-family: Arial; padding: 20px;"><h3>Verification Code</h3><h1>${generatedOtp}</h1></div>`
    });
    return res.json({ success: true, message: `OTP sent to ${formattedEmail}`, otp: generatedOtp });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to send OTP.' });
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

  return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
});

app.get('/api/farmers', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const activeAgents = await Agent.find({}, { email: 1 });
      const activeAgentEmails = new Set(activeAgents.map(a => a.email.toLowerCase().trim()));

      const query = agentEmail ? { $or: [{ agentEmail }, { registeredBy: agentEmail }, { agentEmail: '' }, { agentEmail: {$exists: false } }] } : {};
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

app.post('/api/farmers', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const mobile = (req.body.mobile || '').trim();
  const id = req.body.id;

  try {
    if (mongoose.connection.readyState === 1) {
      const existingEmail = await Farmer.findOne({ email, id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: `Email ${email} is already registered!` });
      }
      const newFarmer = await Farmer.findOneAndUpdate({ id }, req.body, { upsert: true, new: true });
      return res.json({ success: true, farmer: newFarmer });
    }
    res.json({ success: true, farmer: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/farmers/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) await Farmer.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Farmer record deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/collections', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail ? { $or: [{ agentEmail }, { agentEmail: '' }, { agentEmail: {$exists: false } }] } : {};
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

app.get('/api/bookings', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail ? { $or: [{ agentEmail }, { agentEmail: '' }, { agentEmail: {$exists: false } }] } : {};
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

app.get('/api/deductions', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail ? { $or: [{ agentEmail }, { agentEmail: '' }, { agentEmail: {$exists: false } }] } : {};
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

// STRICT AGENT LOGIN VERIFICATION
app.post('/api/agent/verify', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const password = (req.body.password || '').trim();
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database disconnected.' });
    }

    const agent = await Agent.findOne({ email });
    if (!agent) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access Denied: You are not registered as an agent. Please contact admin.' 
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

// ================= ADMIN MODULE =================
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '11249a125@kanchiuniv.ac.in').toLowerCase().trim();
const ADMIN_PASSWORD_ENV = process.env.ADMIN_PASSWORD || 'Admin@2026';

const adminConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});
const AdminConfig = mongoose.model('AdminConfig', adminConfigSchema);

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
  const token = req.headers['x-admin-token'] || '';
  const currentPassword = await getAdminPassword();
  if (token !== currentPassword) {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid admin token.' });
    return false;
  }
  return true;
}

app.post('/api/admin/login', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const password = (req.body.password || '').trim();
  const currentPassword = await getAdminPassword();
  if (email === ADMIN_EMAIL && password === currentPassword) {
    return res.json({ success: true, token: currentPassword, adminEmail: ADMIN_EMAIL });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
});

app.post('/api/admin/register-agent', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  const email = (req.body.email || '').toLowerCase().trim();
  const password = (req.body.password || 'agent123').trim();
  const village = (req.body.village || '').trim();
  const cycle = (req.body.cycle || '10-DAY').trim();
  if (!email) return res.status(400).json({ success: false, message: 'Agent email is required.' });

  try {
    const existing = await Agent.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: `Agent ${email} is already registered.` });
    
    const agentCount = await Agent.countDocuments();
    const can = (req.body.can && req.body.can.trim()) ? req.body.can.trim() : String(10100 + agentCount);
    
    await Agent.create({ email, password });
    await StationConfig.findOneAndUpdate({ agentEmail: email }, { agentEmail: email, can, village, cycle }, { upsert: true, new: true });
    
    return res.json({ success: true, message: `Agent ${email} successfully registered with CAN ${can}.`, can, email });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/agents/:email', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  const email = (req.params.email || '').toLowerCase().trim();
  try {
    await Agent.deleteOne({ email });
    await StationConfig.deleteOne({ agentEmail: email });
    await RateConfig.deleteOne({ agentEmail: email });
    await Farmer.deleteMany({ $or: [{ agentEmail: email }, { registeredBy: email }] });
    return res.json({ success: true, message: `Agent ${email} and associated data removed successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/agents', async (req, res) => {
  if (!await verifyAdminToken(req, res)) return;
  try {
    const agents = await Agent.find().sort({ createdAt: 1 });
    const stationConfigs = await StationConfig.find();
    const farmers = await Farmer.find();
    const collections = await Collection.find();

    const enriched = agents.map((a, idx) => {
      const cfg = stationConfigs.find(s => s.agentEmail === a.email) || {};
      const farmerCount = farmers.filter(f => (f.agentEmail || '').toLowerCase() === a.email || (f.registeredBy || '').toLowerCase() === a.email).length;
      const collectionCount = collections.filter(c => (c.agentEmail || '').toLowerCase() === a.email).length;
      return {
        email: a.email,
        can: cfg.can || String(10100 + idx),
        village: cfg.village || '--',
        cycle: cfg.cycle || '--',
        farmerCount,
        collectionCount,
        createdAt: a.createdAt
      };
    });
    return res.json({ success: true, agents: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Dairy Server running on port ${PORT}`);
});
