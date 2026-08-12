/**
 * Dairy Vision - Global Cloud Collection System
 * app.js - Frontend Client Script
 */

const API_BASE_URL = 'https://dairy-vision.onrender.com';

/**
 * Display toast notification to the user
 */
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

/**
 * Send OTP to user's email address
 */
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

    const sendBtn = event?.target || document.querySelector(`button[onclick*="${emailInputId}"]`);
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

        if (response.ok && data.success) {
            showToast('Verification code dispatched successfully to your inbox!');
            
            // Reveal OTP input sections in HTML if present
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
        showToast('Unable to connect to server network.', true);
    } finally {
        if (sendBtn && sendBtn.tagName === 'BUTTON') {
            setTimeout(() => {
                sendBtn.disabled = false;
                sendBtn.innerText = originalText || 'Send OTP';
            }, 30000);
        }
    }
}

/**
 * Verify standard 6-digit OTP code
 */
async function handleVerifyOTP(emailInputId, otpInputId, successCallback) {
    const emailValue = document.getElementById(emailInputId)?.value?.trim();
    const otpValue = document.getElementById(otpInputId)?.value?.trim();

    if (!emailValue) {
        showToast('Email address missing for verification.', true);
        return;
    }

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

        if (response.ok && data.success) {
            showToast('OTP verified successfully!');
            if (typeof successCallback === 'function') {
                successCallback();
            }
        } else {
            showToast(data.message || 'Incorrect verification security credentials.', true);
        }
    } catch (error) {
        console.error('Validation Connection Failure:', error);
        showToast('Network synchronization fault encountered.', true);
    }
}

/**
 * Dispatch Milk Collection Bill Receipt to Farmer Email
 */
async function sendMilkBillReceipt(billData) {
    const recipientEmail = billData.farmerEmail || billData.email || billData.toEmail;

    if (!recipientEmail || !recipientEmail.includes('@')) {
        showToast('Valid farmer email address is required.', true);
        return false;
    }

    try {
        showToast('Sending collection bill receipt...');
        const response = await fetch(`${API_BASE_URL}/api/send-milk-bill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                farmerName: billData.farmerName || billData.name || 'Farmer',
                farmerEmail: recipientEmail.trim(),
                milkType: billData.type || billData.milkType || 'Standard Milk',
                shift: billData.shift || 'Morning',
                liters: parseFloat(billData.qty || billData.liters) || 0,
                fat: parseFloat(billData.fat) || 0,
                snf: parseFloat(billData.snf) || 0,
                water: parseFloat(billData.waterPct || billData.water) || 0,
                totalAmount: parseFloat(billData.total || billData.totalAmount) || 0
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Milk collection bill emailed successfully!');
            return true;
        } else {
            showToast(data.message || 'Failed to dispatch milk bill email.', true);
            return false;
        }
    } catch (error) {
        console.error('Milk Bill API Error:', error);
        showToast('Network error while emailing milk bill.', true);
        return false;
    }
}

/**
 * Dispatch Requirement Slip Status Email to Farmer via Backend API
 */
async function sendRequirementSlipEmail(slipData) {
    const recipientEmail = slipData.farmerEmail || slipData.email || slipData.toEmail;

    if (!recipientEmail || !recipientEmail.includes('@')) {
        showToast('Error: Farmer email address is missing or invalid.', true);
        console.error('Requirement slip aborted: Missing valid email', slipData);
        return false;
    }

    try {
        showToast('Sending requirement slip email...');
        const response = await fetch(`${API_BASE_URL}/api/send-requirement-slip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                farmerName: slipData.farmerName || 'Farmer',
                farmerEmail: recipientEmail.trim(),
                bookingDate: slipData.bookingDate || new Date().toISOString().slice(0, 10),
                item: slipData.item || 'Dairy Requirement Item',
                status: (slipData.status || 'APPROVED').toUpperCase(),
                deliveryDate: slipData.deliveryDate || 'N/A',
                cost: parseFloat(slipData.cost || slipData.totalPrice) || 0
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast(`Requirement slip (${slipData.status}) emailed to farmer successfully!`);
            return true;
        } else {
            showToast(data.message || 'Failed to send requirement slip email.', true);
            return false;
        }
    } catch (error) {
        console.error('Requirement Slip API Error:', error);
        showToast('Network error while sending requirement slip email.', true);
        return false;
    }
}

/**
 * Triggered when the Agent clicks the "Approve" button in Requirement Table
 */
async function approveRequirement(farmerName, farmerEmail, item, bookingDate, cost, deliveryDate, rowId) {
    const slipPayload = {
        farmerName: farmerName,
        farmerEmail: farmerEmail,
        item: item,
        bookingDate: bookingDate,
        status: 'APPROVED',
        deliveryDate: deliveryDate || 'Expected in 2-3 Days',
        cost: cost || 0
    };

    const isSent = await sendRequirementSlipEmail(slipPayload);
    if (isSent && rowId) {
        const statusElem = document.getElementById(`status-${rowId}`);
        if (statusElem) {
            statusElem.innerText = 'APPROVED';
            statusElem.className = 'status-badge status-approved';
        }
    }
}

/**
 * Triggered when the Agent clicks the "Reject" button in Requirement Table
 */
async function rejectRequirement(farmerName, farmerEmail, item, bookingDate, rowId) {
    const slipPayload = {
        farmerName: farmerName,
        farmerEmail: farmerEmail,
        item: item,
        bookingDate: bookingDate,
        status: 'REJECTED',
        deliveryDate: 'N/A',
        cost: 0
    };

    const isSent = await sendRequirementSlipEmail(slipPayload);
    if (isSent && rowId) {
        const statusElem = document.getElementById(`status-${rowId}`);
        if (statusElem) {
            statusElem.innerText = 'REJECTED';
            statusElem.className = 'status-badge status-rejected';
        }
    }
}

// Action Trigger Helpers linked to HTML onclick attributes
function sendAgentLoginOtp(event) {
    handleSendOTP('agent-email-input', 'Agent Login Verification', event);
}

function verifyGmailOtp(event) {
    handleSendOTP('farmer-email', 'Farmer Registration', event);
}

function sendFarmerLoginOtp(event) {
    handleSendOTP('farmer-login-email', 'Farmer Portal Login', event);
}