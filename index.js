const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express(); // <

// Allow requests from your GitHub Pages site
app.use(cors({
  origin: 'https://11249a125-harish.github.io',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// In-memory OTP store
const otpStore = {};

// Endpoint: Send OTP via Brevo REST API
app.post('/api/send-otp', async (req, res) => {
  const { email, purpose } = req.body;

  console.log(`[OTP ATTEMPT] Received request for: ${email}`);

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email required.' });
  }

  const senderEmail = process.env.SENDER_EMAIL || 'karanamharish93@gmail.com'; 
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
  
  otpStore[email.toLowerCase().trim()] = { otp: generatedOtp, expiresAt };

  try {
    console.log(`[BREVO HTTP] Dispatching payload to Brevo API...`);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "Dairy Vision Portal", email: senderEmail },
        to: [{ email: email.trim() }],
        subject: `Dairy Vision Verification Code: ${generatedOtp}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #1b4332;">Dairy Vision Cloud System</h2>
            <p>Your verification code for <strong>${purpose || 'Verification'}</strong> is:</p>
            <h1 style="color: #ffb703; background: #1b4332; display: inline-block; padding: 10px 20px; border-radius: 5px; letter-spacing: 3px;">
              ${generatedOtp}
            </h1>
            <p>This code expires in 5 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ BREVO API ERROR DETAILS:', JSON.stringify(data));
      return res.status(response.status).json({ success: false, message: data.message || 'Brevo API rejection.' });
    }

    console.log(`[OTP SENT] Code ${generatedOtp} successfully accepted by Brevo. Message ID: ${data.messageId}`);
    return res.json({ success: true, message: 'OTP sent successfully via Brevo API.' });

  } catch (err) {
    console.error('❌ CRITICAL SERVER ERROR:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error while sending OTP.' });
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

  if (String(record.otp).trim() !== String(otp).trim()) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
  }

  delete otpStore[formattedEmail];
  return res.json({ success: true, message: 'OTP verified successfully.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});