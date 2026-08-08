require('dotenv').config(); // Loads secret keys safely from your local .env file
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serves your HTML UI files smoothly

// Temporary local cache memory array to hold active validation tokens
const otpCacheMemory = {}; 

/**
 * Endpoint 1: Triggers, generates, and fires an OTP to Brevo's API nodes
 */
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: "Recipient email address parameter is missing." });
    }

    // 1. Generate a secure, pseudo-random 6 digit verification string
    const generatedOTP = String(Math.floor(100000 + Math.random() * 900000));
    
    // 2. Temporarily store it in memory for 5 minutes before auto-expiring it
    otpCacheMemory[email] = {
        code: generatedOTP,
        expiresAt: Date.now() + 5 * 60 * 1000 
    };

    // 3. Prepare the transactional structure framework for Brevo
    const BREVO_ENDPOINT = 'https://brevo.com';
    const payload = {
        sender: { 
            name: "Dairy Vision Procurement", 
            email: process.env.SENDER_EMAIL 
        },
        to: [{ email: email }],
        subject: "Secure Dashboard Access Token",
        htmlContent: `
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 30px;">
                    <div style="max-width: 500px; margin: 0 auto; background: white; padding: 25px; border-radius: 12px; border-top: 6px solid #1b4332; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <h2 style="color: #1b4332; margin-bottom: 5px;">Dairy Vision Gateway</h2>
                        <p style="color: #555;">Your secure cloud portal login access token is ready:</p>
                        <div style="font-size: 28px; font-weight: bold; background: #e2f0d9; padding: 12px 25px; display: inline-block; color: #1b4332; border-radius: 8px; letter-spacing: 4px; margin: 15px 0;">
                            ${generatedOTP}
                        </div>
                        <p style="font-size: 0.85em; color: #888; border-top: 1px dashed #ccc; padding-top: 15px; margin-top: 15px;">
                            This authorization code is strictly valid for 5 minutes. If you did not trigger this connection attempt, safely discard this notice.
                        </p>
                    </div>
                </body>
            </html>`
    };

    try {
        // 4. Send the data request payload out over the network connection
        await axios.post(BREVO_ENDPOINT, payload, {
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        return res.status(200).json({ success: true, message: "Secure authentication verification code dispatched successfully." });
    } catch (error) {
        console.error("Brevo API Node Transmission Fault Details:", error.response ? error.response.data : error.message);
        return res.status(500).json({ success: false, error: "Failed to dispatch email transmission request via remote gateway nodes." });
    }
});

/**
 * Endpoint 2: Validates the token typed into your frontend interface form
 */
app.post('/api/auth/verify-otp', (req, res) => {
    const { email, code } = req.body;
    const cachedRecord = otpCacheMemory[email];

    if (!cachedRecord) {
        return res.status(400).json({ success: false, error: "No active token registration mapped to this address. Request a fresh token." });
    }

    if (Date.now() > cachedRecord.expiresAt) {
        delete otpCacheMemory[email]; // Clean cache trees safely
        return res.status(400).json({ success: false, error: "Verification session validation expired. Please re-verify." });
    }

    if (cachedRecord.code === String(code).trim()) {
        delete otpCacheMemory[email]; // Consume code instantly to prevent replay loops
        return res.status(200).json({ success: true, message: "Consensus met. Authorization initialized successfully." });
    } else {
        return res.status(400).json({ success: false, error: "Secure access token verification string mismatch." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Dairy Vision Enterprise infrastructure listening securely on port ${PORT}...`));
