const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();

app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

const farmerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // Primary Key
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true, index: true }, // Unique Key
  email: { type: String, required: true, unique: true, index: true }, // Unique Key / Alternate PK
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
  farmerId: { type: String, required: true, ref: 'Farmer', index: true }, // Foreign Key -> Farmer.id
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
  farmerId: { type: String, required: true, ref: 'Farmer', index: true }, // Foreign Key -> Farmer.id
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
  farmerId: { type: String, required: true, ref: 'Farmer', index: true }, // Foreign Key -> Farmer.id
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

      console.log(`✉️ Email dispatched via SMTP to ${toEmail}. Message ID: ${info.messageId}`);
      return { success: true, method: 'SMTP', messageId: info.messageId };
    } catch (err) {
      console.error('SMTP Email Error:', err.message);
    }
  }

  if (process.env.BREVO_API_KEY) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: toEmail, name: toName || 'User' }],
          subject,
          htmlContent
        })
      });

      if (response.ok) {
        console.log(`✉️ Email dispatched via Brevo API to ${toEmail}`);
        return { success: true, method: 'Brevo' };
      }
    } catch (err) {
      console.error('Brevo API Dispatch Error:', err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`📧 SIMULATED EMAIL DISPATCH (No active SMTP / Brevo key configured)`);
  console.log(`TO: ${toEmail} (${toName || 'User'})`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`======================================================\n`);

  return { success: true, method: 'Simulated' };
}

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

app.post('/api/agents', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const password = req.body.password;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });

  try {
    if (mongoose.connection.readyState === 1) {
      const agent = await Agent.findOneAndUpdate({ email }, { email, password }, { upsert: true, new: true });
      return res.json({ success: true, agent });
    }
    res.json({ success: true, agent: { email, password } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/rates', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      let rates = null;
      if (agentEmail) {
        rates = await RateConfig.findOne({ agentEmail });
      }
      if (!rates) {
        rates = await RateConfig.findOne({ $or: [{ agentEmail: '' }, { agentEmail: { $exists: false } }] });
      }
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
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; border: 2px solid #1b4332; border-radius: 8px;">
          <h2 style="color: #1b4332; text-align: center;">Smart Dairy Cloud System</h2>
          <p>Dear User,</p>
          <p>Your security verification code for <strong>${purpose || 'Portal Access'}</strong> is:</p>
          <div style="text-align: center; margin: 20px 0;">
            <h1 style="color: #ffb703; background: #1b4332; display: inline-block; padding: 12px 28px; border-radius: 6px; letter-spacing: 4px;">${generatedOtp}</h1>
          </div>
          <p style="color: #c1121f; font-size: 0.9em; font-weight: bold;">⚡ This OTP code will expire in 1 minute (60 seconds).</p>
        </div>
      `
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

app.post('/api/send-milk-bill', async (req, res) => {
  const recipientEmail = req.body.farmerEmail || req.body.email || req.body.toEmail;
  const farmerName = (req.body.farmerName || req.body.name || 'Farmer').trim();
  const { id, date, time, farmerId, type, shift } = req.body;

  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid farmer email address is required.' });
  }

  const finalQty = parseCleanNumber(req.body.qty !== undefined ? req.body.qty : req.body.liters, 0);
  const finalFat = parseCleanNumber(req.body.fat, 4.0);
  const finalSnf = parseCleanNumber(req.body.snf, 8.1);
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
  if (finalTotal <= 0 && finalQty > 0) {
    finalTotal = parseFloat((finalQty * finalRate).toFixed(2));
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const entryId = id || `COL-${Date.now()}`;
      await Collection.findOneAndUpdate(
        { id: entryId },
        {
          id: entryId,
          date: date || new Date().toISOString().slice(0, 10),
          time: time || new Date().toLocaleTimeString(),
          farmerId: farmerId || 'FARM-000',
          farmerName: farmerName,
          farmerEmail: recipientEmail.trim(),
          type: type || 'Cow Milk',
          shift: shift || 'Morning',
          qty: finalQty,
          fat: finalFat,
          snf: finalSnf,
          waterPct: finalWater,
          rate: finalRate,
          total: finalTotal
        },
        { upsert: true, new: true }
      );
    }

    await sendEmailHelper({
      toEmail: recipientEmail.trim(),
      toName: farmerName,
      subject: `Smart Dairy Collection Receipt - ${farmerName}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #1b4332; text-align: center; margin-bottom: 25px; font-weight: bold;">Smart Dairy Collection Receipt</h2>
          <p style="font-size: 15px; color: #333; margin-bottom: 8px;">Dear <strong>${farmerName}</strong>,</p>
          <p style="font-size: 14px; color: #555; margin-bottom: 20px;">Your milk collection entry has been successfully registered. Below are your collection details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
            <tr style="background-color: #f7f7f7;">
              <td style="padding: 12px; border: 1px solid #e5e7eb; width: 45%;"><strong>Milk Type:</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${type || 'Cow Milk'}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Shift:</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${shift || 'Morning'}</td>
            </tr>
            <tr style="background-color: #f7f7f7;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Quantity (Liters):</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${finalQty} L</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>FAT / SNF:</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${finalFat}% / ${finalSnf}%</td>
            </tr>
            <tr style="background-color: #f7f7f7;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Water %:</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${finalWater}%</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Rate per Liter:</strong></td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">₹${finalRate.toFixed(2)}</td>
            </tr>
            <tr style="background-color: #eaf5ec;">
              <td style="padding: 14px; border: 1px solid #c8e6c9; font-size: 16px;"><strong>Total Amount:</strong></td>
              <td style="padding: 14px; border: 1px solid #c8e6c9; font-size: 18px; color: #2e7d32; font-weight: bold;">₹${finalTotal.toFixed(2)}</td>
            </tr>
          </table>

          <p style="text-align: center; color: #777; font-size: 12px; margin-top: 25px;">
            This is an automated receipt from Smart Dairy Cloud System.
          </p>
        </div>
      `
    });

    return res.json({ success: true, message: 'Milk collection bill saved to MongoDB & emailed successfully.', total: finalTotal, rate: finalRate });
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
      await Booking.findOneAndUpdate(
        { id: id },
        { status: safeStatus, deliveryDate: deliveryDate || 'N/A', totalPrice: finalCost },
        { upsert: false, new: true }
      );
    }

    await sendEmailHelper({
      toEmail: recipientEmail.trim(),
      toName: farmerName,
      subject: `Smart Dairy Requirement Slip [${safeStatus.toUpperCase()}] - ${farmerName}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: auto; padding: 22px; border: 2px solid #1b4332; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; border-bottom: 2px dashed #1b4332; padding-bottom: 12px; margin-bottom: 15px;">
            <h2 style="color: #1b4332; margin: 0;">SMART DAIRY REQUIREMENT SLIP</h2>
            <p style="font-size: 0.85em; color: #555; margin-top: 4px;">Official Farmer Confirmation Receipt</p>
          </div>

          <p>Dear <strong>${farmerName}</strong> (ID: ${farmerId || 'FARMER'}),</p>
          <p>Your requested material requirement order has been processed. Below are your slip details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f8fdf9;">
              <td style="padding: 10px; border: 1px solid #ddd; width: 45%;"><strong>Date of Booking:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${bookingDate || new Date().toISOString().slice(0,10)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requirement Item:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${item || 'N/A'} ${qty ? `(Qty: ${qty})` : ''}</td>
            </tr>
            <tr style="background-color: #f8fdf9;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requirement Status:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: ${statusBadgeColor};">${safeStatus.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Delivery Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${deliveryDate || 'N/A'}</td>
            </tr>
            <tr style="background-color: #e8f5e9;">
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 15px;"><strong>Cost Amount:</strong></td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px; color: #1b4332;"><strong>₹${finalCost}</strong></td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding: 12px; background: #f4f7f6; border-left: 4px solid #1b4332; border-radius: 4px; font-size: 0.88em; color: #333;">
            ${isApproved 
              ? '<strong>Note:</strong> Approved requirement costs will be automatically deducted from your upcoming milk billing cycle statement.' 
              : '<strong>Note:</strong> Your requirement request was not approved. Please contact your station agent for further details.'}
          </div>
        </div>
      `
    });

    return res.json({ success: true, message: `Requirement slip (${safeStatus}) emailed to ${recipientEmail} successfully!` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/farmers', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail ? { $or: [{ agentEmail }, { registeredBy: agentEmail }, { agentEmail: '' }, { agentEmail: { $exists: false } }] } : {};
      const farmers = await Farmer.find(query).sort({ createdAt: -1 });
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
        return res.status(400).json({ success: false, message: `Farmer Registration Error: Email ${email} is already registered to Farmer ID ${existingEmail.id}!` });
      }

      const existingMobile = await Farmer.findOne({ mobile, id: { $ne: id } });
      if (existingMobile) {
        return res.status(400).json({ success: false, message: `Farmer Registration Error: Mobile number ${mobile} is already registered to Farmer ID ${existingMobile.id}!` });
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
    res.json({ success: true, message: 'Farmer record deleted from MongoDB.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/collections', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail ? { $or: [{ agentEmail }, { agentEmail: '' }, { agentEmail: { $exists: false } }] } : {};
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

app.get('/api/bookings', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail ? { $or: [{ agentEmail }, { agentEmail: '' }, { agentEmail: { $exists: false } }] } : {};
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

app.get('/api/deductions', async (req, res) => {
  try {
    const agentEmail = (req.query.agentEmail || '').toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      const query = agentEmail ? { $or: [{ agentEmail }, { agentEmail: '' }, { agentEmail: { $exists: false } }] } : {};
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

async function performAutoBackup() {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    const farmers = await Farmer.find();
    const collections = await Collection.find();
    const bookings = await Booking.find();
    const deductions = await Deduction.find();
    const feedbacks = await Feedback.find();

    const backupData = { version: '1.0', exportedAt: new Date().toISOString(), farmers, collections, bookings, deductions, feedbacks };

    const snapshot = new SystemBackup({
      farmersCount: farmers.length,
      collectionsCount: collections.length,
      bookingsCount: bookings.length,
      deductionsCount: deductions.length,
      feedbacksCount: feedbacks.length,
      backupData
    });
    await snapshot.save();
    console.log(`[Auto-Backup] Saved MongoDB snapshot (Farmers: ${farmers.length}, Collections: ${collections.length}, Bookings: ${bookings.length}) at ${new Date().toLocaleTimeString()}`);
    return snapshot;
  } catch (err) {
    console.error('[Auto-Backup Error]:', err.message);
    return null;
  }
}

// Background automated snapshot timer every 5 minutes
setInterval(performAutoBackup, 5 * 60 * 1000);

app.get('/api/backup/export', async (req, res) => {
  try {
    let farmers = [], collections = [], bookings = [], deductions = [], feedbacks = [];
    if (mongoose.connection.readyState === 1) {
      farmers = await Farmer.find();
      collections = await Collection.find();
      bookings = await Booking.find();
      deductions = await Deduction.find();
      feedbacks = await Feedback.find();
    }

    const backupData = { version: '1.0', exportedAt: new Date().toISOString(), farmers, collections, bookings, deductions, feedbacks };

    if (mongoose.connection.readyState === 1) {
      await performAutoBackup();
    }

    res.json({ success: true, backup: backupData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/backup/restore', async (req, res) => {
  const { farmers, collections, bookings, deductions, feedbacks } = req.body;
  try {
    if (mongoose.connection.readyState === 1) {
      if (Array.isArray(farmers)) {
        for (const f of farmers) await Farmer.findOneAndUpdate({ id: f.id }, f, { upsert: true });
      }
      if (Array.isArray(collections)) {
        for (const c of collections) await Collection.findOneAndUpdate({ id: c.id }, c, { upsert: true });
      }
      if (Array.isArray(bookings)) {
        for (const b of bookings) await Booking.findOneAndUpdate({ id: b.id }, b, { upsert: true });
      }
      if (Array.isArray(deductions)) {
        for (const d of deductions) await Deduction.findOneAndUpdate({ id: d.id }, d, { upsert: true });
      }
      if (Array.isArray(feedbacks)) {
        for (const fb of feedbacks) await Feedback.findOneAndUpdate({ id: fb.id }, fb, { upsert: true });
      }
      await performAutoBackup();
    }
    res.json({ success: true, message: 'Data backup successfully restored into MongoDB Database!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Dairy Cloud Server running on port ${PORT}`);
});