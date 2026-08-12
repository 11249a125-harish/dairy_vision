const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(express.json());

// Enable CORS for cross-origin frontend requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logger to track incoming requests in Render logs
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const otpStore = {};

// Clean expired OTPs periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const email in otpStore) {
    if (otpStore[email].expiresAt < now) {
      delete otpStore[email];
    }
  }
}, 5 * 60 * 1000);

// Helper: Generic Brevo Email Dispatcher
async function sendBrevoEmail({ toEmail, toName, subject, htmlContent }) {
  const senderEmail = process.env.SENDER_EMAIL || 'karanamharish93@gmail.com';
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is missing in server environment.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: "Dairy Vision Portal", email: senderEmail },
      to: [{ email: toEmail, name: toName || 'User' }],
      subject,
      htmlContent
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Brevo API Error Details:', errorData);
    throw new Error(errorData.message || `Brevo API rejected request with status ${response.status}`);
  }

  return response;
}

// 1. Send OTP Endpoint
app.post('/api/send-otp', async (req, res) => {
  const { email, purpose } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email required.' });
  }

  const formattedEmail = email.toLowerCase().trim();
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  
  otpStore[formattedEmail] = { otp: generatedOtp, expiresAt };

  try {
    await sendBrevoEmail({
      toEmail: formattedEmail,
      subject: `Dairy Vision Verification Code: ${generatedOtp}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1b4332;">Dairy Vision Cloud System</h2>
          <p>Your verification code for <strong>${purpose || 'Verification'}</strong> is:</p>
          <h1 style="color: #ffb703; background: #1b4332; display: inline-block; padding: 10px 20px; border-radius: 5px;">${generatedOtp}</h1>
          <p>This code expires in 5 minutes.</p>
        </div>
      `
    });

    return res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Send OTP Error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Failed to send OTP email.' });
  }
});

// 2. Verify OTP Endpoint
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required.' });

  const formattedEmail = email.toLowerCase().trim();
  const record = otpStore[formattedEmail];

  if (!record || Date.now() > record.expiresAt || String(record.otp).trim() !== String(otp).trim()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
  }

  delete otpStore[formattedEmail];
  return res.json({ success: true, message: 'OTP verified successfully.' });
});

// 3. Send Milk Collection Bill Receipt Endpoint
app.post('/api/send-milk-bill', async (req, res) => {
  // Supports flexible key names from frontend
  const recipientEmail = req.body.farmerEmail || req.body.email || req.body.toEmail;
  const farmerName = req.body.farmerName || req.body.name;
  const { milkType, shift, liters, fat, snf, water, totalAmount } = req.body;

  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid farmer email address is required.' });
  }

  try {
    await sendBrevoEmail({
      toEmail: recipientEmail.trim(),
      toName: farmerName || 'Farmer',
      subject: `Milk Collection Receipt - ${farmerName || 'Dairy Member'}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1b4332; text-align: center;">Dairy Vision Collection Receipt</h2>
          <p>Dear <strong>${farmerName || 'Valued Farmer'}</strong>,</p>
          <p>Your milk collection entry has been successfully registered. Below are your collection details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f2f2f2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Milk Type:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${milkType || 'Standard Milk'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Shift:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${shift || 'Morning/Evening'}</td>
            </tr>
            <tr style="background-color: #f2f2f2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Quantity (Liters):</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${liters ?? 0} L</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>FAT / SNF:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${fat ?? 0}% / ${snf ?? 0}%</td>
            </tr>
            <tr style="background-color: #f2f2f2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Water %:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${water ?? 0}%</td>
            </tr>
            <tr style="background-color: #e8f5e9;">
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px;"><strong>Total Amount:</strong></td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px; color: #2e7d32;"><strong>₹${totalAmount ?? 0}</strong></td>
            </tr>
          </table>

          <p style="margin-top: 20px; font-size: 12px; color: #777; text-align: center;">
            This is an automated receipt from Dairy Vision Cloud System.
          </p>
        </div>
      `
    });

    return res.json({ success: true, message: 'Milk bill emailed to farmer successfully.' });
  } catch (err) {
    console.error('Send Milk Bill Error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error while sending bill email.' });
  }
});

// 4. Send Farmer Requirement Request Slip Endpoint
app.post('/api/send-requirement-slip', async (req, res) => {
  console.log('Received requirement slip payload:', req.body);

  // Fallback checks for email and name keys in case frontend sends 'email' or 'farmerEmail'
  const recipientEmail = req.body.farmerEmail || req.body.email || req.body.toEmail;
  const farmerName = req.body.farmerName || req.body.name;
  const { bookingDate, item, status, deliveryDate, cost } = req.body;

  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    console.error('Requirement Slip Rejection: Invalid or missing email address.', { recipientEmail });
    return res.status(400).json({ success: false, message: 'Valid farmer email is required.' });
  }

  const safeStatus = (status || 'APPROVED').toString().toUpperCase();
  const statusColor = safeStatus === 'APPROVED' ? '#2e7d32' : safeStatus === 'REJECTED' ? '#c1121f' : '#e65100';

  try {
    await sendBrevoEmail({
      toEmail: recipientEmail.trim(),
      toName: farmerName || 'Farmer',
      subject: `Farmer Requirement Request Slip: ${safeStatus}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 2px solid #1b4332; border-radius: 8px;">
          <h2 style="color: #1b4332; text-align: center;">Dairy Vision Requirement Slip</h2>
          <p>Dear <strong>${farmerName || 'Farmer'}</strong>,</p>
          <p>Your product requirement request status has been updated by the Agent:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f2f2f2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date of Booking:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${bookingDate || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requirement:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${item || 'N/A'}</td>
            </tr>
            <tr style="background-color: #f2f2f2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: ${statusColor};">${safeStatus}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Delivery Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${deliveryDate || 'N/A'}</td>
            </tr>
            <tr style="background-color: #e8f5e9;">
              <td style="padding: 12px; border: 1px solid #ddd;"><strong>Cost:</strong></td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px; color: #2e7d32;"><strong>₹${cost ?? 0}</strong></td>
            </tr>
          </table>

          <p style="margin-top: 20px; font-size: 12px; color: #777; text-align: center;">
            This requirement cost will be automatically deducted from your respective payment statement.
          </p>
        </div>
      `
    });

    return res.json({ success: true, message: 'Requirement slip email sent successfully.' });
  } catch (err) {
    console.error('Send Requirement Slip Error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error while sending requirement slip.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});