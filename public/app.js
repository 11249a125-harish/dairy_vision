const API_BASE_URL = 'http://localhost:5000';

// Global Utility Notification Banner Handler
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.style.background = isError ? '#d90429' : '#1b4332';
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// 1. Hook Outgoing Dispatches to Backend node server
async function handleSendOTP(emailInputId, contextPurpose) {
    const emailValue = document.getElementById(emailInputId).value;

    if (!emailValue || !emailValue.includes('@')) {
        showToast('Please enter a valid Gmail address.', true);
        return;
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
            
            // Toggle step visibility dynamically depending on target block
            if (emailInputId === 'agent-email') {
                document.getElementById('agent-email-step').classList.add('hidden');
                document.getElementById('agent-otp-step').classList.remove('hidden');
            } else if (emailInputId === 'farmer-email') {
                document.getElementById('farmer-reg-email-step').classList.add('hidden');
                document.getElementById('farmer-reg-otp-step').classList.remove('hidden');
            }
        } else {
            showToast(data.message || 'Error executing OTP delivery.', true);
        }
    } catch (error) {
        console.error('Request Execution Failure:', error);
        showToast('Unable to connect to local cloud server network.', true);
    }
}

// 2. Validate User Submission Strings via Backend Array Checkers
async function handleVerifyOTP(emailInputId, otpInputId, successActionMessage) {
    const emailValue = document.getElementById(emailInputId).value;
    const otpValue = document.getElementById(otpInputId).value;

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
            showToast(successActionMessage);
            // Execute portal entrance transition actions or document persistence operations here
            setTimeout(() => {
                window.location.reload(); 
            }, 2000);
        } else {
            showToast(data.message || 'Incorrect verification security credentials.', true);
        }
    } catch (error) {
        console.error('Validation Connection Failure:', error);
        showToast('Network synchronization fault encountered.', true);
    }
}
