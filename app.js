/**
 * Dairy Vision - Global Cloud Collection System
 * script.js - API Synchronization & Client Helper Module
 */

const API_BASE_URL = 'https://dairy-vision.onrender.com';

function showToast(message, isError = false) {
    const toast = document.getElementById('notification');
    if (!toast) {
        alert(message);
        return;
    }
    toast.innerText = message;
    toast.className = `alert ${isError ? 'alert-danger' : 'alert-success'}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

async function handleSendOTP(emailInputId, contextPurpose, event) {
    const emailField = document.getElementById(emailInputId);
    if (!emailField) {
        console.error(`Input element with ID '${emailInputId}' was not found in HTML.`);
        return;
    }
    const emailValue = emailField.value.trim().toLowerCase();

    if (!emailValue || !emailValue.includes('@')) {
        showToast('Please enter a valid email address.', true);
        return;
    }

    const sendBtn = document.querySelector(`button[onclick*="${emailInputId}"]`) || (event ? event.target : null);
    let originalText = '';

    if (sendBtn && sendBtn.tagName === 'BUTTON') {
        originalText = sendBtn.innerText;
        sendBtn.disabled = true;
        sendBtn.innerText = 'Sending...';
    }

    try {
        showToast('Processing verification delivery...');
        const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailValue, purpose: contextPurpose })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Verification code dispatched successfully to your inbox!');
            
            if (emailInputId === 'agent-email-input') {
                document.getElementById('agent-login-otp-block')?.classList.remove('hidden');
            } else if (emailInputId === 'farmer-email') {
                document.getElementById('aadhaar-otp-block')?.classList.remove('hidden');
            } else if (emailInputId === 'farmer-login-email') {
                document.getElementById('farmer-login-otp-block')?.classList.remove('hidden');
            }
        } else {
            showToast(data.message || 'Error executing OTP delivery.', true);
        }
    } catch (error) {
        console.error('Request Execution Failure:', error);
        showToast('Unable to connect to local cloud server network.', true);
    } finally {
        if (sendBtn && sendBtn.tagName === 'BUTTON') {
            setTimeout(() => {
                sendBtn.disabled = false;
                sendBtn.innerText = originalText || 'Send Gmail OTP';
            }, 30000);
        }
    }
}

async function handleVerifyOTP(emailInputId, otpInputId, successCallback) {
    const emailValue = document.getElementById(emailInputId)?.value;
    const otpValue = document.getElementById(otpInputId)?.value;

    if (!otpValue || otpValue.length !== 6) {
        showToast('Please submit an authentic 6-digit numeric token.', true);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailValue, otp: otpValue })
        });

        const data = await response.json();

        if (data.success) {
            showToast('OTP verified successfully!');
            if (typeof successCallback === 'function') successCallback();
        } else {
            showToast(data.message || 'Incorrect verification security credentials.', true);
        }
    } catch (error) {
        console.error('Validation Connection Failure:', error);
        showToast('Network synchronization fault encountered.', true);
    }
}

function sendAgentLoginOtp(event) {
    handleSendOTP('agent-email-input', 'Agent Login Verification', event);
}

function verifyGmailOtp(event) {
    handleSendOTP('farmer-email', 'Farmer Registration', event);
}

function sendFarmerLoginOtp(event) {
    handleSendOTP('farmer-login-email', 'Farmer Portal Login', event);
}