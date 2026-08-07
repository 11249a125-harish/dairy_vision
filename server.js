const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serves index.html if placed in a /public folder

// In-memory OTP store
const otpStore = {};

// Setup Gmail SMTP Transporter (Using Port 465 SSL for cloud host compatibility)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL port 465 helps bypass cloud platform port blocks
  auth: {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER,
    pass: process.env.GMAIL_APP_PASS || process.env.EMAIL_PASS,
  },
});

// Verify SMTP connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error);
  } else {
    console.log('✅ Gmail SMTP Server is ready to send verification emails.');
  }
});

// Endpoint: Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { email, purpose } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email required.' });
  }

  const senderEmail = process.env.GMAIL_USER || process.env.EMAIL_USER;
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins expiration
  
  otpStore[email.toLowerCase().trim()] = { otp: generatedOtp, expiresAt };

  const mailOptions = {
    from: `"Dairy Vision Portal" <${senderEmail}>`,
    to: email.trim(),
    subject: `Dairy Vision Verification Code: ${generatedOtp}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #1b4332;">Dairy Vision Cloud System</h2>
        <p>Your OTP code for <strong>${purpose || 'Verification'}</strong> is:</p>
        <h1 style="color: #ffb703; background: #1b4332; display: inline-block; padding: 10px 20px; border-radius: 5px; letter-spacing: 3px;">
          ${generatedOtp}
        </h1>
        <p>This code expires in 5 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[OTP SENT] Code sent to ${email}`);
    return res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('[SMTP ERROR]', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP. Please check server logs and email configuration.' 
    });
  }
});

// Endpoint: Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
  }

  const formattedEmail = email.toLowerCase().trim();
  const record = otpStore[formattedEmail];

  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP requested for this email.' });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[formattedEmail];
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }

  // Type-safe string comparison
  if (String(record.otp).trim() !== String(otp).trim()) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
  }

  // Clear OTP on successful verification
  delete otpStore[formattedEmail];
  return res.json({ success: true, message: 'OTP verified successfully.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});