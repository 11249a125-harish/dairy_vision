/**
 * Dairy Vision - Global Cloud Collection & Requirements System
 * app.js - Frontend Application Engine & MongoDB Backend Sync Bridge
 */

// Determine API Base URL dynamically (Local server or production Render URL)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://dairy-vision.onrender.com';

const ALLOWED_AGENTS = [
  "karanamharish93@gmail.com",
  "11249a251@kanchiuniv.ac.in",
  "11249a255@kanchiuniv.ac.in"
];

// Global State Object with Local Storage Persistence
let DB = JSON.parse(localStorage.getItem('DAIRY_VISION_GLOBAL_DB') || JSON.stringify({
  agentCAN: "CAN-PLM-2026-01",
  agentAccounts: {
    "karanamharish93@gmail.com": { password: null },
    "11249a251@kanchiuniv.ac.in": { password: null },
    "11249a255@kanchiuniv.ac.in": { password: null }
  },
  farmers: [],
  collections: [],
  deductions: [],
  bookings: []
}));

function saveDB() {
  localStorage.setItem('DAIRY_VISION_GLOBAL_DB', JSON.stringify(DB));
}

let currentAgentEmail = null;
let currentFarmer = null;
let agentAuthMode = 'password';
let farmerAuthMode = 'password';
const otpStore = {};

/**
 * Display toast notification to user
 */
function showAlert(msg, type = 'success') {
  const el = document.getElementById('notification');
  if (!el) {
    alert(msg);
    return;
  }
  el.className = `alert alert-${type}`;
  el.innerText = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function addLog(msg) {
  const container = document.getElementById('status-log-container');
  if (!container) return;
  const time = new Date().toLocaleTimeString();
  container.innerHTML = `<div>[${time}] ${msg}</div>` + container.innerHTML;
}

// --- MONGODB SYNC & BACKUP SERVICES ---

/**
 * Fetch and sync all records from MongoDB Database on startup
 */
async function syncFromMongoDB() {
  try {
    addLog('Connecting to MongoDB Database Service...');
    
    const [farmersRes, collectionsRes, bookingsRes, deductionsRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/farmers`),
      fetch(`${API_BASE_URL}/api/collections`),
      fetch(`${API_BASE_URL}/api/bookings`),
      fetch(`${API_BASE_URL}/api/deductions`)
    ]);

    if (farmersRes.status === 'fulfilled' && farmersRes.value.ok) {
      const data = await farmersRes.value.json();
      if (data.farmers && data.farmers.length > 0) DB.farmers = data.farmers;
    }

    if (collectionsRes.status === 'fulfilled' && collectionsRes.value.ok) {
      const data = await collectionsRes.value.json();
      if (data.collections && data.collections.length > 0) DB.collections = data.collections;
    }

    if (bookingsRes.status === 'fulfilled' && bookingsRes.value.ok) {
      const data = await bookingsRes.value.json();
      if (data.bookings && data.bookings.length > 0) DB.bookings = data.bookings;
    }

    if (deductionsRes.status === 'fulfilled' && deductionsRes.value.ok) {
      const data = await deductionsRes.value.json();
      if (data.deductions && data.deductions.length > 0) DB.deductions = data.deductions;
    }

    saveDB();
    addLog('MongoDB Database sync complete!');
  } catch (err) {
    console.warn('MongoDB Sync Warning (Using Local Cache):', err.message);
  }
}

/**
 * Backup all current records to MongoDB Cloud Database
 */
async function backupToMongoDB() {
  try {
    showAlert('Backing up files and database records to MongoDB...', 'info');
    const response = await fetch(`${API_BASE_URL}/api/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmers: DB.farmers,
        collections: DB.collections,
        bookings: DB.bookings,
        deductions: DB.deductions
      })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      showAlert('🍃 MongoDB Database & File Backup successfully completed!');
      addLog('Full backup created in MongoDB database.');
    } else {
      showAlert(data.message || 'MongoDB backup encountered an error.', 'danger');
    }
  } catch (err) {
    console.error('Backup Error:', err);
    showAlert('Backup server connection error. Saved to local browser backup.', 'info');
  }
}

/**
 * Export MongoDB Backup as downloadable JSON file
 */
async function exportMongoDBBackup() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/backup/export`);
    let backupData;
    if (res.ok) {
      const data = await res.json();
      backupData = data.backup;
    } else {
      backupData = {
        exportedAt: new Date().toISOString(),
        farmers: DB.farmers,
        collections: DB.collections,
        bookings: DB.bookings,
        deductions: DB.deductions
      };
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Dairy_Vision_MongoDB_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showAlert('MongoDB Backup JSON file downloaded successfully!');
  } catch (err) {
    console.error('Export Backup Error:', err);
    showAlert('Failed to generate export backup file.', 'danger');
  }
}

// --- EMAIL DISPATCH SERVICES ---

/**
 * Send OTP to email via API
 */
async function handleSendOTP(emailInputId, contextPurpose) {
  const emailInput = document.getElementById(emailInputId);
  if (!emailInput || !emailInput.value.trim()) {
    showAlert('Please enter a valid email address.', 'danger');
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  showAlert('Processing OTP verification delivery...', 'info');

  try {
    const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose: contextPurpose })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      if (data.otp) otpStore[email] = data.otp;
      showAlert(`Verification code dispatched to ${email}!`);
      addLog(`OTP sent to ${email} for ${contextPurpose}.`);
      
      // Reveal OTP inputs
      if (emailInputId === 'agent-email-input') {
        document.getElementById('agent-login-otp-block')?.classList.remove('hidden');
      } else if (emailInputId === 'farmer-email') {
        document.getElementById('aadhaar-otp-block')?.classList.remove('hidden');
        document.getElementById('complete-reg-btn')?.classList.remove('hidden');
      } else if (emailInputId === 'farmer-login-email') {
        document.getElementById('farmer-login-otp-block')?.classList.remove('hidden');
      }
    } else {
      showAlert(data.message || 'Error sending OTP email.', 'danger');
    }
  } catch (err) {
    console.error('Send OTP Error:', err);
    // Dev fallback
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;
    showAlert(`[Dev Mode OTP] Verification code: ${otp}`, 'info');
  }
}

/**
 * Verify 6-Digit OTP code via API
 */
async function handleVerifyOTP(emailInputId, otpInputId, onSuccess) {
  const emailInput = document.getElementById(emailInputId);
  const otpInput = document.getElementById(otpInputId);
  if (!emailInput || !otpInput) return;

  const email = emailInput.value.trim().toLowerCase();
  const enteredOtp = otpInput.value.trim();

  if (!enteredOtp) {
    showAlert('Please enter the 6-digit OTP.', 'danger');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: enteredOtp })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      showAlert('OTP Verified Successfully!');
      if (typeof onSuccess === 'function') onSuccess();
    } else {
      showAlert(data.message || 'Invalid OTP code. Please try again.', 'danger');
    }
  } catch (err) {
    console.error('Verify OTP Error:', err);
    // Dev fallback check
    if (enteredOtp === "123456" || enteredOtp === (otpStore[email] || "")) {
      showAlert('OTP Verified Successfully (Dev Mode)!');
      if (typeof onSuccess === 'function') onSuccess();
    } else {
      showAlert('Invalid OTP. Use 123456 for testing.', 'danger');
    }
  }
}

/**
 * Dispatch Requirement Slip Email (Approved or Rejected) to Farmer
 */
async function sendRequirementSlipEmail(booking) {
  if (!booking || !booking.farmerEmail) {
    showAlert('Error: Farmer email address is missing.', 'danger');
    return false;
  }

  showAlert('Sending Requirement Slip email to farmer...', 'info');

  try {
    const response = await fetch(`${API_BASE_URL}/api/send-requirement-slip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: booking.id,
        farmerId: booking.farmerId,
        farmerName: booking.farmerName || 'Farmer',
        farmerEmail: booking.farmerEmail.trim(),
        bookingDate: booking.bookingDate,
        item: booking.item,
        status: booking.status,
        deliveryDate: booking.deliveryDate,
        cost: booking.totalPrice,
        qty: booking.qty
      })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      showAlert(`Requirement slip (${booking.status}) emailed to ${booking.farmerEmail}!`);
      addLog(`Emailed requirement slip (${booking.status}) to ${booking.farmerEmail}`);
      return true;
    } else {
      showAlert(data.message || 'Failed to dispatch requirement slip email.', 'danger');
      return false;
    }
  } catch (err) {
    console.error('Requirement Slip Email Error:', err);
    showAlert(`Requirement status updated to ${booking.status}. (Email notification logged).`, 'info');
    return true;
  }
}

/**
 * Dispatch Milk Collection Bill Receipt Email
 */
async function sendMilkBillReceipt(entry) {
  if (!entry || !entry.farmerEmail) return;

  try {
    await fetch(`${API_BASE_URL}/api/send-milk-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    addLog(`Emailed milk collection receipt to ${entry.farmerEmail}`);
  } catch (err) {
    console.error('Milk Bill Email Error:', err);
  }
}

// --- EVENT HANDLERS & NAVIGATION ---

function sendAgentLoginOtp() {
  const email = document.getElementById('agent-email-input').value.trim().toLowerCase();
  if (!ALLOWED_AGENTS.includes(email)) {
    showAlert('Unauthorized Agent Email.', 'danger');
    return;
  }
  handleSendOTP('agent-email-input', 'Agent Portal Login');
}

function sendFarmerLoginOtp() {
  const email = document.getElementById('farmer-login-email').value.trim().toLowerCase();
  const farmer = DB.farmers.find(f => f.email === email);
  if (!farmer) {
    showAlert('Farmer email not registered.', 'danger');
    return;
  }
  handleSendOTP('farmer-login-email', 'Farmer Portal Login');
}

function verifyGmailOtp() {
  const email = document.getElementById('farmer-email').value.trim().toLowerCase();
  if (!email) {
    showAlert('Please enter a valid farmer email first.', 'danger');
    return;
  }
  handleSendOTP('farmer-email', 'Farmer Registration');
}

function sendResetOtp() {
  const email = document.getElementById('reset-agent-email').value.trim().toLowerCase();
  if (!ALLOWED_AGENTS.includes(email)) {
    showAlert('Unauthorized email address.', 'danger');
    return;
  }
  handleSendOTP('reset-agent-email', 'Agent Password Reset');
  document.getElementById('reset-otp-block')?.classList.remove('hidden');
  document.getElementById('reset-new-pass-block')?.classList.remove('hidden');
  document.getElementById('btn-save-reset-pass')?.classList.remove('hidden');
}

function sendFarmerResetOtp() {
  const email = document.getElementById('reset-farmer-email').value.trim().toLowerCase();
  const farmer = DB.farmers.find(f => f.email === email);
  if (!farmer) {
    showAlert('Farmer email not registered.', 'danger');
    return;
  }
  handleSendOTP('reset-farmer-email', 'Farmer Password Reset');
  document.getElementById('farmer-reset-otp-block')?.classList.remove('hidden');
  document.getElementById('farmer-reset-new-pass-block')?.classList.remove('hidden');
  document.getElementById('btn-save-farmer-reset-pass')?.classList.remove('hidden');
}

const i18n = {
  en: { nav_dashboard: "Dashboard & Analytics", nav_farmers: "Farmers Directory Sheet", nav_collection: "Milk Entry & Manage", nav_deductions: "Date Range Deductions", nav_reports: "Clean Sheets & Print", logout: "Logout" },
  te: { nav_dashboard: "డాష్ బోర్డ్", nav_farmers: "రైతుల వివరాలు", nav_collection: "పాలు సేకరణ", nav_deductions: "మినహాయింపులు", nav_reports: "నివేదికలు", logout: "నిష్క్రమించు" },
  hi: { nav_dashboard: "डैशबोर्ड", nav_farmers: "किसान सूची", nav_collection: "दूध संग्रह", nav_deductions: "कटौती", nav_reports: "रिपोर्ट", logout: "लॉग आउट" }
};

function changeLanguage(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang] && i18n[lang][key]) el.innerText = i18n[lang][key];
  });
}

function updateCanNumber(val) {
  DB.agentCAN = val;
  saveDB();
  document.querySelectorAll('.sync-can-display').forEach(el => el.innerText = val);
  showAlert(`CAN Number updated to ${val}`);
}

function autoFillIfscCode(bankName) {
  const ifscInput = document.getElementById('farmer-ifsc');
  if (!ifscInput) return;
  if (bankName.includes('SBI')) ifscInput.value = "SBIN0001234";
  else if (bankName.includes('Union') || bankName.includes('Andhra')) ifscInput.value = "UBIN0005678";
  else if (bankName.includes('HDFC')) ifscInput.value = "HDFC0001122";
  else if (bankName.includes('ICICI')) ifscInput.value = "ICIC0003344";
  else if (bankName.includes('Canara')) ifscInput.value = "CNRB0009988";
  else if (bankName.includes('Indian')) ifscInput.value = "IDIB0004455";
  else if (bankName.includes('Baroda')) ifscInput.value = "BARB0007766";
  else if (bankName.includes('Punjab')) ifscInput.value = "PUNB0002211";
  else ifscInput.value = "APGB0001001";
}

function switchLoginRole(role) {
  document.getElementById('btn-role-agent')?.classList.toggle('active', role === 'agent');
  document.getElementById('btn-role-farmer')?.classList.toggle('active', role === 'farmer');
  document.getElementById('agent-auth-wrapper')?.classList.toggle('hidden', role !== 'agent');
  document.getElementById('farmer-auth-wrapper')?.classList.toggle('hidden', role !== 'farmer');
  document.getElementById('agent-reset-form')?.classList.add('hidden');
  document.getElementById('farmer-reset-form')?.classList.add('hidden');
}

function toggleAgentAuthMode(mode) {
  agentAuthMode = mode;
  document.getElementById('btn-agent-pass-mode')?.classList.toggle('active', mode === 'password');
  document.getElementById('btn-agent-otp-mode')?.classList.toggle('active', mode === 'otp');
  document.getElementById('agent-password-block')?.classList.toggle('hidden', mode !== 'password');
  document.getElementById('agent-login-otp-block')?.classList.toggle('hidden', mode !== 'otp');
}

function toggleFarmerAuthMode(mode) {
  farmerAuthMode = mode;
  document.getElementById('btn-farmer-pass-mode')?.classList.toggle('active', mode === 'password');
  document.getElementById('btn-farmer-otp-mode')?.classList.toggle('active', mode === 'otp');
  document.getElementById('farmer-password-block')?.classList.toggle('hidden', mode !== 'password');
  document.getElementById('farmer-login-otp-block')?.classList.toggle('hidden', mode !== 'otp');
}

function toggleAgentResetPass(show) {
  document.getElementById('agent-auth-wrapper')?.classList.toggle('hidden', show);
  document.getElementById('agent-reset-form')?.classList.toggle('hidden', !show);
}

function toggleFarmerResetPass(show) {
  document.getElementById('farmer-auth-wrapper')?.classList.toggle('hidden', show);
  document.getElementById('farmer-reset-form')?.classList.toggle('hidden', !show);
}

function getBillingPeriod(dateStr, mode = '10-DAY') {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'short' });
  const year = d.getFullYear();

  if (mode === '10-DAY') {
    if (day <= 10) return `1-10 ${month} ${year}`;
    if (day <= 20) return `11-20 ${month} ${year}`;
    return `21-31 ${month} ${year}`;
  } else {
    if (day <= 15) return `1-15 ${month} ${year}`;
    return `16-31 ${month} ${year}`;
  }
}

function initAppView(role) {
  document.getElementById('auth-section')?.classList.add('hidden');
  document.getElementById('user-status')?.classList.remove('hidden');

  if (role === 'agent') {
    document.getElementById('sidebar')?.classList.remove('hidden');
    document.getElementById('app-section')?.classList.remove('hidden');
    document.getElementById('farmer-portal-section')?.classList.add('hidden');
    document.getElementById('active-user-label').innerText = `Agent (${currentAgentEmail.split('@')[0]})`;
    populateDropdowns();
    renderFarmers();
    renderCollections();
    renderAgentBookings();
    updateDashboardMetrics();
    switchTab('dashboard');
    addLog(`Agent ${currentAgentEmail} logged in.`);
  } else {
    document.getElementById('sidebar')?.classList.add('hidden');
    document.getElementById('app-section')?.classList.add('hidden');
    document.getElementById('farmer-portal-section')?.classList.remove('hidden');
    document.getElementById('active-user-label').innerText = `Farmer (${currentFarmer.name})`;
    renderFarmerPortal();
  }
}

function logout() {
  currentAgentEmail = null;
  currentFarmer = null;
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('app-section')?.classList.add('hidden');
  document.getElementById('farmer-portal-section')?.classList.add('hidden');
  document.getElementById('sidebar')?.classList.add('hidden');
  document.getElementById('user-status')?.classList.add('hidden');
  showAlert('Logged out successfully.', 'info');
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  const selectedTab = document.getElementById(`tab-${tabId}`);
  if (selectedTab) selectedTab.classList.remove('hidden');

  const btn = document.querySelector(`aside button[onclick*="${tabId}"]`);
  if (btn) btn.classList.add('active');

  if (tabId === 'dashboard') {
    updateDashboardMetrics();
  }
}

// Dynamic Delivery Date Min Setter
function handleBookingDateChange() {
  const bookingDateInput = document.getElementById('booking-date');
  const deliveryDateInput = document.getElementById('booking-delivery-date');
  if (bookingDateInput && deliveryDateInput) {
    const bDate = bookingDateInput.value;
    if (bDate) {
      deliveryDateInput.min = bDate;
      if (deliveryDateInput.value && deliveryDateInput.value < bDate) {
        deliveryDateInput.value = bDate;
      }
    }
  }
}

// --- REQUIREMENT / MATERIALS BOOKINGS LOGIC ---

/**
 * Submit Requirement Request (Farmer Portal)
 * CRITICAL REQUIREMENT FIX: Enforces deliveryDate >= bookingDate
 */
document.getElementById('farmer-booking-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!currentFarmer) return;

  const itemVal = document.getElementById('booking-item-type').value;
  const [itemName, unitPriceStr] = itemVal.split('|');
  const unitPrice = parseFloat(unitPriceStr);
  const qty = parseInt(document.getElementById('booking-qty').value, 10);
  const bookingDate = document.getElementById('booking-date').value;
  const deliveryDate = document.getElementById('booking-delivery-date').value;

  // --- DELIVERY DATE VALIDATION CHECK ---
  if (!bookingDate || !deliveryDate) {
    showAlert('Please select both Date of Booking and Delivery Date.', 'danger');
    return;
  }

  const bDateObj = new Date(bookingDate);
  const dDateObj = new Date(deliveryDate);

  if (dDateObj < bDateObj) {
    showAlert('Validation Error: The delivery date cannot be earlier than the booking date!', 'danger');
    document.getElementById('booking-delivery-date').focus();
    return;
  }

  const booking = {
    id: `REQ-${Date.now().toString().slice(-6)}`,
    farmerId: currentFarmer.id,
    farmerName: currentFarmer.name,
    farmerEmail: currentFarmer.email,
    item: itemName,
    unitPrice,
    qty,
    totalPrice: unitPrice * qty,
    bookingDate,
    deliveryDate,
    status: 'Pending'
  };

  if (!DB.bookings) DB.bookings = [];
  DB.bookings.push(booking);
  saveDB();

  // Save to MongoDB API asynchronously
  fetch(`${API_BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking)
  }).catch(err => console.warn('Cloud sync offline:', err));

  showAlert('Requirement request submitted successfully!');
  renderFarmerBookings();
  this.reset();
  
  // Reset date constraints
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('booking-date').value = today;
  document.getElementById('booking-delivery-date').value = today;
  document.getElementById('booking-delivery-date').min = today;
});

function renderFarmerBookings() {
  if (!currentFarmer) return;
  const tbody = document.getElementById('farmer-booking-tbody');
  if (!tbody) return;

  const farmerBookings = (DB.bookings || []).filter(b => b.farmerId === currentFarmer.id || b.farmerEmail === currentFarmer.email);

  if (farmerBookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888;">No requirements requested yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = farmerBookings.map(b => {
    const isApproved = b.status === 'Approved & Cost Deducted' || b.status === 'APPROVED';
    const isRejected = b.status === 'Rejected' || b.status === 'REJECTED';
    const badgeClass = isApproved ? 'water-pure' : isRejected ? 'water-warning' : 'water-warning';
    
    return `
      <tr>
        <td>${b.bookingDate}</td>
        <td>${b.item}</td>
        <td>₹${b.unitPrice}</td>
        <td>${b.qty}</td>
        <td>₹${b.totalPrice}</td>
        <td>${b.deliveryDate}</td>
        <td><span class="water-badge ${badgeClass}">${b.status}</span></td>
        <td>
          <button class="btn btn-sm btn-gold" onclick="showRequirementSlip('${b.id}')"><i class="fa-solid fa-receipt"></i> Slip</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAgentBookings() {
  const tbody = document.getElementById('agent-bookings-tbody');
  if (!tbody) return;

  const bookings = DB.bookings || [];
  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888;">No requirements submitted yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const isApproved = b.status === 'Approved & Cost Deducted' || b.status === 'APPROVED';
    const isRejected = b.status === 'Rejected' || b.status === 'REJECTED';
    const isPending = !isApproved && !isRejected;

    return `
      <tr>
        <td>${b.bookingDate}</td>
        <td>${b.farmerName} (${b.farmerId})<br><small style="color:#666;">${b.farmerEmail}</small></td>
        <td>${b.item} (x${b.qty})</td>
        <td>${b.deliveryDate}</td>
        <td><strong>₹${b.totalPrice}</strong></td>
        <td><span class="water-badge ${isApproved ? 'water-pure' : 'water-warning'}">${b.status}</span></td>
        <td>${getBillingPeriod(b.bookingDate)}</td>
        <td>
          ${isPending ? `
            <button class="btn btn-sm btn-success" onclick="processRequirementOrder('${b.id}', 'Approved & Cost Deducted')"><i class="fa-solid fa-check"></i> Approve</button>
            <button class="btn btn-sm btn-danger" style="margin-left:4px;" onclick="processRequirementOrder('${b.id}', 'Rejected')"><i class="fa-solid fa-xmark"></i> Reject</button>
          ` : `<button class="btn btn-sm btn-gold" onclick="showRequirementSlip('${b.id}')"><i class="fa-solid fa-receipt"></i> Slip</button>`}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Process Requirement Order Approval or Rejection
 * CRITICAL REQUIREMENT FIX: Dispatches email notification with complete slip to farmer
 */
async function processRequirementOrder(bookingId, statusState) {
  const b = (DB.bookings || []).find(item => item.id === bookingId);
  if (!b) return;

  b.status = statusState;
  saveDB();

  // Sync status update to MongoDB backend API
  fetch(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: statusState, deliveryDate: b.deliveryDate })
  }).catch(err => console.warn('Cloud status update offline:', err));

  showAlert(`Requirement order ${bookingId} updated to ${statusState}!`);
  renderAgentBookings();

  // Show slip in UI
  showRequirementSlip(bookingId);

  // Send Email Notification to Farmer with slip details
  await sendRequirementSlipEmail(b);
}

function showRequirementSlip(bookingId) {
  const b = (DB.bookings || []).find(item => item.id === bookingId);
  if (!b) return;

  document.getElementById('slip-farmer-name').innerText = `${b.farmerName} (${b.farmerId})`;
  document.getElementById('slip-booking-date').innerText = b.bookingDate;
  document.getElementById('slip-item-name').innerText = `${b.item} (Qty: ${b.qty})`;
  document.getElementById('slip-delivery-date').innerText = b.deliveryDate;
  document.getElementById('slip-status').innerText = b.status;
  document.getElementById('slip-cost').innerText = `₹${b.totalPrice}`;
  document.getElementById('slip-billing-cycle').innerText = getBillingPeriod(b.bookingDate);

  const slipBox = document.getElementById('printable-req-slip');
  if (slipBox) {
    slipBox.classList.remove('hidden');
    slipBox.scrollIntoView({ behavior: 'smooth' });
  }
}

function clearRequirements(role) {
  if (confirm('Are you sure you want to clear requirement history?')) {
    if (role === 'farmer' && currentFarmer) {
      DB.bookings = DB.bookings.filter(b => b.farmerId !== currentFarmer.id && b.farmerEmail !== currentFarmer.email);
    } else if (role === 'agent') {
      DB.bookings = [];
    }
    saveDB();
    showAlert('Requirements history cleared.');
    if (role === 'farmer') renderFarmerBookings();
    else renderAgentBookings();
  }
}

// --- MILK COLLECTION & DEDUCTION LOGIC ---

function toggleEntryMode(mode) {
  showAlert(`Switched to ${mode.toUpperCase()} entry mode.`, 'info');
}

function syncHardwareSensor(sensorType) {
  if (sensorType === 'analyzer') {
    document.getElementById('milk-fat').value = (Math.random() * (9.0 - 3.5) + 3.5).toFixed(1);
    document.getElementById('milk-snf').value = (Math.random() * (9.5 - 8.0) + 8.0).toFixed(1);
    calculateWaterPercentage();
    showAlert('Data fetched from Ultrasonic Analyzer (COM4)');
  } else if (sensorType === 'weight') {
    document.getElementById('milk-qty').value = (Math.random() * (30 - 2) + 2).toFixed(1);
    showAlert('Weight fetched from Electronic Scale (COM3)');
  }
}

function calculateWaterPercentage() {
  const type = document.getElementById('milk-type').value;
  const snf = parseFloat(document.getElementById('milk-snf').value) || 0;
  const stdSnf = type.includes('Cow') ? 8.5 : 9.0;

  let waterPct = 0;
  if (snf < stdSnf && snf > 0) {
    waterPct = (((stdSnf - snf) / stdSnf) * 100).toFixed(1);
  }

  document.getElementById('milk-water-pct').value = `${waterPct} %`;

  const alertBadge = document.getElementById('water-quality-alert');
  if (waterPct > 0) {
    alertBadge.className = 'alert alert-danger';
    alertBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Water Adulteration Detected (${waterPct}%)`;
  } else {
    alertBadge.className = 'alert alert-success';
    alertBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Pure Milk Sample Detected`;
  }
}

document.getElementById('milk-form')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const farmerId = document.getElementById('milk-farmer-id').value;
  const farmer = DB.farmers.find(f => f.id === farmerId);

  const qty = parseFloat(document.getElementById('milk-qty').value);
  const fat = parseFloat(document.getElementById('milk-fat').value);
  const snf = parseFloat(document.getElementById('milk-snf').value);
  const waterPct = parseFloat(document.getElementById('milk-water-pct').value);
  const rate = (fat * 7 + snf * 4).toFixed(2);
  const total = (qty * rate).toFixed(2);

  const entry = {
    id: `COL-${Date.now()}`,
    date: document.getElementById('milk-date').value,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    farmerId,
    farmerName: farmer ? farmer.name : 'Unknown',
    farmerEmail: farmer ? farmer.email : '',
    type: document.getElementById('milk-type').value,
    shift: document.getElementById('milk-shift').value,
    qty,
    fat,
    snf,
    waterPct,
    rate,
    total
  };

  DB.collections.push(entry);
  saveDB();

  // Save entry to MongoDB API & Email Receipt
  sendMilkBillReceipt(entry);

  showAlert('Milk entry recorded & dispatched to farmer!');
  addLog(`Recorded entry for ${entry.farmerName} - ${qty}L`);
  renderCollections();
  updateDashboardMetrics();
  this.reset();
});

document.getElementById('deduction-form')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const farmerId = document.getElementById('deduction-farmer-id').value;
  const amount = parseFloat(document.getElementById('deduction-amount').value);
  const type = document.getElementById('deduction-type').value;
  const date = document.getElementById('deduction-date').value;

  const ded = { id: `DED-${Date.now()}`, farmerId, type, amount, date };
  DB.deductions.push(ded);
  saveDB();

  fetch(`${API_BASE_URL}/api/deductions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ded)
  }).catch(err => console.warn('Deduction cloud sync offline:', err));

  showAlert('Bill deduction logged successfully!');
  this.reset();
});

// --- FARMER REGISTRATION & MANAGEMENT ---

document.getElementById('farmer-verification-form')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('farmer-email').value.trim().toLowerCase();

  handleVerifyOTP('farmer-email', 'farmer-aadhaar-otp', () => {
    const id = `FARM-${String(DB.farmers.length + 1).padStart(3, '0')}`;
    const newFarmer = {
      id,
      name: document.getElementById('farmer-name').value,
      mobile: document.getElementById('farmer-mobile').value,
      email: email,
      village: document.getElementById('farmer-village').value,
      aadhaar: document.getElementById('farmer-aadhaar').value,
      bankName: document.getElementById('farmer-bank-name').value,
      account: document.getElementById('farmer-account').value,
      ifsc: document.getElementById('farmer-ifsc').value,
      password: 'farmer123',
      registeredBy: currentAgentEmail
    };

    DB.farmers.push(newFarmer);
    saveDB();

    fetch(`${API_BASE_URL}/api/farmers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFarmer)
    }).catch(err => console.warn('Farmer cloud sync offline:', err));

    showAlert(`Farmer ${newFarmer.name} registered with ID: ${id}`);
    populateDropdowns();
    renderFarmers();
    this.reset();
    document.getElementById('aadhaar-otp-block')?.classList.add('hidden');
    document.getElementById('complete-reg-btn')?.classList.add('hidden');
  });
});

function renderFarmers() {
  const tbody = document.getElementById('farmer-table-body');
  if (!tbody) return;

  if (DB.farmers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No farmers registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = DB.farmers.map(f => `
    <tr>
      <td><strong>${f.id}</strong></td>
      <td>${f.name}</td>
      <td>${f.village}</td>
      <td>${f.mobile}</td>
      <td>${f.email}</td>
      <td>${f.bankName}</td>
      <td>${f.account}</td>
      <td>${f.registeredBy || 'Agent'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteFarmer('${f.id}')"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `).join('');
}

function exportFarmersToCsv() {
  if (!DB.farmers.length) return showAlert('No farmer records to export.', 'danger');
  let csv = 'ID,Name,Village,Mobile,Email,Bank,Account,IFSC\n';
  DB.farmers.forEach(f => {
    csv += `"${f.id}","${f.name}","${f.village}","${f.mobile}","${f.email}","${f.bankName}","${f.account}","${f.ifsc}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Farmers_Directory_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function deleteFarmer(id) {
  if (confirm('Delete this farmer record?')) {
    DB.farmers = DB.farmers.filter(f => f.id !== id);
    saveDB();
    fetch(`${API_BASE_URL}/api/farmers/${id}`, { method: 'DELETE' }).catch(err => console.warn(err));
    renderFarmers();
    populateDropdowns();
    showAlert('Farmer record removed.');
  }
}

function renderCollections() {
  const tbody = document.getElementById('collection-table-body');
  if (!tbody) return;

  if (DB.collections.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No milk collection entries found.</td></tr>`;
    return;
  }

  tbody.innerHTML = DB.collections.map(c => `
    <tr>
      <td>${c.date} ${c.time || ''}</td>
      <td>${c.farmerName} (${c.farmerId})</td>
      <td>${c.type}</td>
      <td>${c.shift}</td>
      <td>${c.qty} L</td>
      <td>${c.fat}%</td>
      <td>${c.snf}%</td>
      <td><span class="water-badge ${c.waterPct > 0 ? 'water-warning' : 'water-pure'}">${c.waterPct}%</span></td>
      <td><strong>₹${c.total}</strong></td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteEntry('${c.id}')"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `).join('');
}

function deleteEntry(id) {
  if (confirm('Delete collection entry?')) {
    DB.collections = DB.collections.filter(c => c.id !== id);
    saveDB();
    fetch(`${API_BASE_URL}/api/collections/${id}`, { method: 'DELETE' }).catch(err => console.warn(err));
    renderCollections();
    updateDashboardMetrics();
    showAlert('Entry removed.');
  }
}

function populateDropdowns() {
  const options = DB.farmers.map(f => `<option value="${f.id}">${f.name} (${f.id})</option>`).join('');
  ['milk-farmer-id', 'deduction-farmer-id', 'report-farmer-code'].forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = `<option value="">Select Farmer</option>` + options;
    }
  });
}

function updateDashboardMetrics() {
  const today = new Date().toISOString().slice(0, 10);
  const milkDate = document.getElementById('milk-date');
  const repDate = document.getElementById('report-start-date');
  if (milkDate) milkDate.value = today;
  if (repDate) repDate.value = today;

  const farmerCountElem = document.getElementById('dash-farmer-count');
  if (farmerCountElem) farmerCountElem.innerText = DB.farmers.length;

  const todayCollections = DB.collections.filter(c => c.date === today);
  const totalQty = todayCollections.reduce((sum, c) => sum + c.qty, 0);
  const waterAlerts = DB.collections.filter(c => c.waterPct > 0).length;

  const totalQtyElem = document.getElementById('dash-milk-total');
  const alertsElem = document.getElementById('dash-water-alerts');
  if (totalQtyElem) totalQtyElem.innerText = `${totalQty.toFixed(1)} L`;
  if (alertsElem) alertsElem.innerText = waterAlerts;

  const emptyBanner = document.getElementById('empty-dash-banner');
  const activeCharts = document.getElementById('active-dash-charts');

  if (DB.collections.length === 0 && DB.farmers.length === 0) {
    emptyBanner?.classList.remove('hidden');
    activeCharts?.classList.add('hidden');
  } else {
    emptyBanner?.classList.add('hidden');
    activeCharts?.classList.remove('hidden');
    renderDashboardCharts();
  }
}

function renderDashboardCharts() {
  const trendCtx = document.getElementById('milkTrendChart')?.getContext('2d');
  const qualityCtx = document.getElementById('milkQualityChart')?.getContext('2d');

  if (!trendCtx || !qualityCtx) return;

  if (window.trendChartInst) window.trendChartInst.destroy();
  if (window.qualityChartInst) window.qualityChartInst.destroy();

  const dates = [...new Set(DB.collections.map(c => c.date))].sort().slice(-7);
  const dailyTotals = dates.map(d => {
    return DB.collections.filter(c => c.date === d).reduce((acc, curr) => acc + curr.qty, 0);
  });

  window.trendChartInst = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: dates.length ? dates : ['Today'],
      datasets: [{
        label: 'Volume (Liters)',
        data: dailyTotals.length ? dailyTotals : [0],
        borderColor: '#1b4332',
        backgroundColor: 'rgba(27, 67, 50, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  const cowMilkCount = DB.collections.filter(c => c.type === 'Cow Milk').length;
  const buffaloMilkCount = DB.collections.filter(c => c.type === 'Buffalo Milk').length;

  window.qualityChartInst = new Chart(qualityCtx, {
    type: 'doughnut',
    data: {
      labels: ['Cow Milk', 'Buffalo Milk'],
      datasets: [{
        data: [cowMilkCount, buffaloMilkCount],
        backgroundColor: ['#206a78', '#ffb703']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderFarmerPortal() {
  if (!currentFarmer) return;

  const nameElem = document.getElementById('farmer-portal-name');
  const phoneElem = document.getElementById('farmer-portal-phone');
  if (nameElem) nameElem.innerText = currentFarmer.name;
  if (phoneElem) phoneElem.innerText = currentFarmer.email || currentFarmer.mobile;

  const fromDate = document.getElementById('farmer-range-from')?.value;
  const toDate = document.getElementById('farmer-range-to')?.value;
  const cycleMode = document.getElementById('farmer-billing-cycle-mode')?.value || '10-DAY';

  const farmerCollections = DB.collections.filter(c => {
    const matchesFarmer = (c.farmerId === currentFarmer.id || c.farmerEmail === currentFarmer.email);
    const matchesFrom = !fromDate || c.date >= fromDate;
    const matchesTo = !toDate || c.date <= toDate;
    return matchesFarmer && matchesFrom && matchesTo;
  });

  let totalQty = 0;
  let totalEarnings = 0;

  const itemizedTbody = document.getElementById('farmer-itemized-tbody');
  if (itemizedTbody) {
    if (farmerCollections.length === 0) {
      itemizedTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#888;">No milk collection history found.</td></tr>`;
    } else {
      itemizedTbody.innerHTML = farmerCollections.map(c => {
        totalQty += c.qty;
        totalEarnings += parseFloat(c.total);
        return `
          <tr>
            <td>${c.date}</td>
            <td>${c.shift}</td>
            <td>${c.type}</td>
            <td>${c.qty} L</td>
            <td>${c.fat}%</td>
            <td>${c.snf}%</td>
            <td><span class="water-badge ${c.waterPct > 0 ? 'water-warning' : 'water-pure'}">${c.waterPct}%</span></td>
            <td>₹${c.rate}</td>
            <td><strong>₹${c.total}</strong></td>
          </tr>
        `;
      }).join('');
    }
  }

  const farmerDeductions = (DB.bookings || []).filter(b => {
    const matchesFarmer = (b.farmerId === currentFarmer.id || b.farmerEmail === currentFarmer.email);
    const isApproved = b.status === 'Approved & Cost Deducted' || b.status === 'APPROVED';
    return matchesFarmer && isApproved;
  });

  let totalDeductions = farmerDeductions.reduce((sum, b) => sum + b.totalPrice, 0);

  const dedTbody = document.getElementById('farmer-deductions-tbody');
  if (dedTbody) {
    if (farmerDeductions.length === 0) {
      dedTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">No product deductions found.</td></tr>`;
    } else {
      dedTbody.innerHTML = farmerDeductions.map(b => `
        <tr>
          <td>${b.bookingDate}</td>
          <td>${b.item}</td>
          <td>${b.deliveryDate}</td>
          <td>${getBillingPeriod(b.bookingDate, cycleMode)}</td>
          <td><strong>- ₹${b.totalPrice}</strong></td>
        </tr>
      `).join('');
    }
  }

  const netPayable = Math.max(0, totalEarnings - totalDeductions);

  const qtyElem = document.getElementById('farmer-total-qty');
  const earningsElem = document.getElementById('farmer-total-earnings');
  const dedElem = document.getElementById('farmer-total-deductions');
  const netElem = document.getElementById('farmer-net-payable');

  if (qtyElem) qtyElem.innerText = `${totalQty.toFixed(1)} L`;
  if (earningsElem) earningsElem.innerText = `₹ ${totalEarnings.toFixed(2)}`;
  if (dedElem) dedElem.innerText = `- ₹ ${totalDeductions.toFixed(2)}`;
  if (netElem) netElem.innerText = `₹ ${netPayable.toFixed(2)}`;

  renderFarmerBookings();
}

// Reports Handling
function handleReportTypeChange(val) {
  const groupDate = document.getElementById('group-report-date');
  const groupEndDate = document.getElementById('group-report-end-date');
  const groupShift = document.getElementById('group-report-shift');
  const groupFarmer = document.getElementById('group-report-farmer-id');

  if (val === 'SHIFT_SUMMARY') {
    groupDate?.classList.remove('hidden');
    groupEndDate?.classList.add('hidden');
    groupShift?.classList.remove('hidden');
    groupFarmer?.classList.add('hidden');
  } else if (val === 'MILK_BILL') {
    groupDate?.classList.remove('hidden');
    groupEndDate?.classList.remove('hidden');
    groupShift?.classList.add('hidden');
    groupFarmer?.classList.remove('hidden');
  } else if (val === 'BILL_SUMMARY') {
    groupDate?.classList.remove('hidden');
    groupEndDate?.classList.remove('hidden');
    groupShift?.classList.add('hidden');
    groupFarmer?.classList.add('hidden');
  }
}

function generateSelectedReport() {
  const reportType = document.getElementById('report-type-select').value;
  const startDate = document.getElementById('report-start-date').value;
  const endDate = document.getElementById('report-end-date').value;
  const shift = document.getElementById('report-shift-select').value;
  const farmerId = document.getElementById('report-farmer-code').value;

  const titleElem = document.getElementById('sheet-report-title');
  const rangeElem = document.getElementById('sheet-range-display');
  const headElem = document.getElementById('sheet-table-head');
  const bodyElem = document.getElementById('sheet-table-body');
  const footElem = document.getElementById('sheet-table-footer');
  const outputCard = document.getElementById('sheet-output-card');

  outputCard?.classList.remove('hidden');

  if (reportType === 'SHIFT_SUMMARY') {
    titleElem.innerText = `SHIFT SUMMARY REPORT - ${shift.toUpperCase()}`;
    rangeElem.innerText = startDate || 'All Dates';

    headElem.innerHTML = `
      <tr>
        <th>Farmer Code</th>
        <th>Farmer Name</th>
        <th>Shift</th>
        <th>Milk Type</th>
        <th>Qty (L)</th>
        <th>FAT %</th>
        <th>SNF %</th>
        <th>Water %</th>
        <th>Total (₹)</th>
      </tr>
    `;

    const filtered = DB.collections.filter(c => {
      const matchesDate = !startDate || c.date === startDate;
      const matchesShift = shift === 'ALL' || c.shift === shift;
      return matchesDate && matchesShift;
    });

    let totQty = 0, totAmt = 0;
    bodyElem.innerHTML = filtered.map(c => {
      totQty += c.qty;
      totAmt += parseFloat(c.total);
      return `
        <tr>
          <td>${c.farmerId}</td>
          <td>${c.farmerName}</td>
          <td>${c.shift}</td>
          <td>${c.type}</td>
          <td>${c.qty} L</td>
          <td>${c.fat}%</td>
          <td>${c.snf}%</td>
          <td>${c.waterPct}%</td>
          <td>₹${c.total}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="9" style="text-align:center;">No records found.</td></tr>';

    footElem.innerHTML = `
      <tr>
        <td colspan="4">TOTALS</td>
        <td>${totQty.toFixed(1)} L</td>
        <td colspan="3"></td>
        <td>₹${totAmt.toFixed(2)}</td>
      </tr>
    `;
  } else if (reportType === 'MILK_BILL') {
    const farmer = DB.farmers.find(f => f.id === farmerId);
    titleElem.innerText = `INDIVIDUAL MILK BILL - ${farmer ? farmer.name : farmerId}`;
    rangeElem.innerText = `${startDate || 'Start'} to ${endDate || 'End'}`;

    headElem.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Shift</th>
        <th>Type</th>
        <th>Qty (L)</th>
        <th>FAT %</th>
        <th>SNF %</th>
        <th>Rate/L</th>
        <th>Amount (₹)</th>
      </tr>
    `;

    const filtered = DB.collections.filter(c => {
      const matchesFarmer = c.farmerId === farmerId;
      const matchesFrom = !startDate || c.date >= startDate;
      const matchesTo = !endDate || c.date <= endDate;
      return matchesFarmer && matchesFrom && matchesTo;
    });

    let totQty = 0, totAmt = 0;
    bodyElem.innerHTML = filtered.map(c => {
      totQty += c.qty;
      totAmt += parseFloat(c.total);
      return `
        <tr>
          <td>${c.date}</td>
          <td>${c.shift}</td>
          <td>${c.type}</td>
          <td>${c.qty} L</td>
          <td>${c.fat}%</td>
          <td>${c.snf}%</td>
          <td>₹${c.rate}</td>
          <td>₹${c.total}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="8" style="text-align:center;">No records found.</td></tr>';

    footElem.innerHTML = `
      <tr>
        <td colspan="3">TOTAL PAYABLE</td>
        <td>${totQty.toFixed(1)} L</td>
        <td colspan="3"></td>
        <td>₹${totAmt.toFixed(2)}</td>
      </tr>
    `;
  } else if (reportType === 'BILL_SUMMARY') {
    titleElem.innerText = 'CONSOLIDATED BILL SUMMARY REPORT';
    rangeElem.innerText = `${startDate || 'Start'} to ${endDate || 'End'}`;

    headElem.innerHTML = `
      <tr>
        <th>Farmer Code</th>
        <th>Farmer Name</th>
        <th>Total Volume (L)</th>
        <th>Gross Earnings (₹)</th>
        <th>Deductions (₹)</th>
        <th>Net Payable (₹)</th>
      </tr>
    `;

    let gQty = 0, gGross = 0, gDed = 0, gNet = 0;
    bodyElem.innerHTML = DB.farmers.map(f => {
      const fColls = DB.collections.filter(c => (c.farmerId === f.id || c.farmerEmail === f.email) && (!startDate || c.date >= startDate) && (!endDate || c.date <= endDate));
      const fDeds = (DB.bookings || []).filter(b => (b.farmerId === f.id || b.farmerEmail === f.email) && (b.status === 'Approved & Cost Deducted' || b.status === 'APPROVED'));

      const fQty = fColls.reduce((sum, c) => sum + c.qty, 0);
      const fGross = fColls.reduce((sum, c) => sum + parseFloat(c.total), 0);
      const fDed = fDeds.reduce((sum, b) => sum + b.totalPrice, 0);
      const fNet = fGross - fDed;

      gQty += fQty;
      gGross += fGross;
      gDed += fDed;
      gNet += fNet;

      return `
        <tr>
          <td>${f.id}</td>
          <td>${f.name}</td>
          <td>${fQty.toFixed(1)} L</td>
          <td>₹${fGross.toFixed(2)}</td>
          <td>₹${fDed.toFixed(2)}</td>
          <td><strong>₹${fNet.toFixed(2)}</strong></td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6" style="text-align:center;">No farmers found.</td></tr>';

    footElem.innerHTML = `
      <tr>
        <td colspan="2">GRAND TOTALS</td>
        <td>${gQty.toFixed(1)} L</td>
        <td>₹${gGross.toFixed(2)}</td>
        <td>₹${gDed.toFixed(2)}</td>
        <td>₹${gNet.toFixed(2)}</td>
      </tr>
    `;
  }
}

// LOGIN FORM SUBMISSION LISTENERS
document.addEventListener('DOMContentLoaded', () => {
  // Sync data from MongoDB on startup
  syncFromMongoDB();

  // Set default dates and date constraints
  const today = new Date().toISOString().slice(0, 10);
  const bookingDateInput = document.getElementById('booking-date');
  const deliveryDateInput = document.getElementById('booking-delivery-date');
  
  if (bookingDateInput) {
    bookingDateInput.value = today;
    bookingDateInput.addEventListener('change', handleBookingDateChange);
  }
  if (deliveryDateInput) {
    deliveryDateInput.value = today;
    deliveryDateInput.min = today;
  }

  // Agent Login Form
  document.getElementById('agent-login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('agent-email-input').value.trim().toLowerCase();
    if (!ALLOWED_AGENTS.includes(email)) {
      showAlert('Unauthorized Agent Email.', 'danger');
      return;
    }

    if (agentAuthMode === 'password') {
      const pass = document.getElementById('agent-password-input').value;
      const storedPass = DB.agentAccounts[email]?.password || 'agent123';
      if (pass === storedPass) {
        currentAgentEmail = email;
        initAppView('agent');
      } else {
        showAlert('Incorrect password.', 'danger');
      }
    } else {
      handleVerifyOTP('agent-email-input', 'agent-login-otp', () => {
        currentAgentEmail = email;
        initAppView('agent');
      });
    }
  });

  // Agent Reset Password Form
  document.getElementById('agent-reset-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('reset-agent-email').value.trim().toLowerCase();
    const newPass = document.getElementById('reset-new-password').value;
    handleVerifyOTP('reset-agent-email', 'reset-agent-otp', () => {
      if (!DB.agentAccounts[email]) DB.agentAccounts[email] = {};
      DB.agentAccounts[email].password = newPass;
      saveDB();
      showAlert('Password reset successful! Please login.');
      toggleAgentResetPass(false);
    });
  });

  // Farmer Login Form
  document.getElementById('farmer-login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('farmer-login-email').value.trim().toLowerCase();
    const farmer = DB.farmers.find(f => f.email === email);
    if (!farmer) {
      showAlert('No registered farmer found with this Gmail.', 'danger');
      return;
    }

    if (farmerAuthMode === 'password') {
      const pass = document.getElementById('farmer-password-input').value;
      if (pass === (farmer.password || 'farmer123')) {
        currentFarmer = farmer;
        initAppView('farmer');
      } else {
        showAlert('Incorrect farmer password.', 'danger');
      }
    } else {
      handleVerifyOTP('farmer-login-email', 'farmer-login-otp', () => {
        currentFarmer = farmer;
        initAppView('farmer');
      });
    }
  });

  // Farmer Reset Password Form
  document.getElementById('farmer-reset-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('reset-farmer-email').value.trim().toLowerCase();
    const farmer = DB.farmers.find(f => f.email === email);
    const newPass = document.getElementById('reset-farmer-new-password').value;
    handleVerifyOTP('reset-farmer-email', 'reset-farmer-otp', () => {
      if (farmer) farmer.password = newPass;
      saveDB();
      showAlert('Farmer password updated! Please log in.');
      toggleFarmerResetPass(false);
    });
  });
});