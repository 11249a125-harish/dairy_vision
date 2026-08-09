const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

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

// Endpoint: Send Milk Collection Bill via Brevo API
app.post('/api/send-milk-bill', async (req, res) => {
  const { farmerName, farmerEmail, milkType, shift, liters, fat, snf, water, totalAmount } = req.body;

  console.log(`[MILK BILL ATTEMPT] Preparing email bill for: ${farmerEmail}`);

  if (!farmerEmail || typeof farmerEmail !== 'string' || !farmerEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid farmer email address is required.' });
  }

  const senderEmail = process.env.SENDER_EMAIL || 'karanamharish93@gmail.com';

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "Dairy Vision Portal", email: senderEmail },
        to: [{ email: farmerEmail.trim(), name: farmerName || 'Farmer' }],
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
                <td style="padding: 10px; border: 1px solid #ddd;">${liters} L</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>FAT / SNF:</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${fat}% / ${snf}%</td>
              </tr>
              <tr style="background-color: #f2f2f2;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Water %:</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${water || '0'}%</td>
              </tr>
              <tr style="background-color: #e8f5e9;">
                <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px;"><strong>Total Amount:</strong></td>
                <td style="padding: 12px; border: 1px solid #ddd; font-size: 16px; color: #2e7d32;"><strong>₹${totalAmount}</strong></td>
              </tr>
            </table>

            <p style="margin-top: 20px; font-size: 12px; color: #777; text-align: center;">
              This is an automated receipt from Dairy Vision Cloud System.
            </p>
          </div>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ BREVO MILK BILL ERROR:', JSON.stringify(data));
      return res.status(response.status).json({ success: false, message: data.message || 'Failed to dispatch milk bill email.' });
    }

    console.log(`[MILK BILL SENT] Sent to ${farmerEmail}. Message ID: ${data.messageId}`);
    return res.json({ success: true, message: 'Milk bill emailed to farmer successfully.' });

  } catch (err) {
    console.error('❌ CRITICAL BILL EMAIL ERROR:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error while sending bill email.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
