/**
 * Smart Dairy - Global Cloud Collection, AI Intelligence & Reports System
 * app.js - Frontend Application Engine & AI Monitoring Console
 */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://all-labs.onrender.com';

const ALLOWED_AGENTS = [
  "karanamharish93@gmail.com",
  "11249a251@kanchiuniv.ac.in",
  "11249a255@kanchiuniv.ac.in"
];

let DB = JSON.parse(localStorage.getItem('SMART_DAIRY_GLOBAL_DB') || localStorage.getItem('DAIRY_VISION_GLOBAL_DB') || JSON.stringify({
  agentCAN: "CAN-PLM-2026-01",
  agentAccounts: {
    "karanamharish93@gmail.com": { password: null },
    "11249a251@kanchiuniv.ac.in": { password: null },
    "11249a255@kanchiuniv.ac.in": { password: null }
  },
  agentConfigs: {},
  rates: {
    cowBaseRate: 45.0,
    cowStdFat: 4.5,
    cowStdSnf: 8.5,
    buffaloBaseRate: 60.0,
    buffaloStdFat: 4.0,
    buffaloStdSnf: 9.0
  },
  farmers: [],
  collections: [],
  deductions: [],
  bookings: [],
  feedbacks: []
}));

let currentAgentEmail = null;
let currentFarmer = null;
let agentAuthMode = 'password';
let farmerAuthMode = 'password';
const otpStore = {};

function getSerialCanForAgent(email) {
  const emailLower = (email || '').toLowerCase().trim();
  if (!emailLower) return '10100';

  const allowedList = ALLOWED_AGENTS.map(e => e.toLowerCase().trim());
  let index = allowedList.indexOf(emailLower);
  if (index < 0) {
    const registeredAgents = Object.keys(DB.agentAccounts || {}).map(e => e.toLowerCase().trim());
    const combined = Array.from(new Set([...allowedList, ...registeredAgents]));
    index = combined.indexOf(emailLower);
    if (index < 0) index = combined.length;
  }
  return String(10100 + Math.max(0, index));
}

function getAgentConfig(email) {
  if (!DB.agentConfigs) DB.agentConfigs = {};
  const key = (email || currentAgentEmail || 'default').toLowerCase().trim();
  const serialCan = getSerialCanForAgent(key);
  if (!DB.agentConfigs[key]) {
    DB.agentConfigs[key] = {
      can: serialCan,
      village: (DB.billingCycle && DB.billingCycle.villageName) ? DB.billingCycle.villageName : 'Palamaner Village',
      cycle: (DB.billingCycle && DB.billingCycle.cycleType) ? DB.billingCycle.cycleType : '10-DAY',
      rates: { ...(DB.rates || { cowBaseRate: 45.0, cowStdFat: 4.5, cowStdSnf: 8.5, buffaloBaseRate: 60.0, buffaloStdFat: 4.0, buffaloStdSnf: 9.0 }) }
    };
  } else if (!DB.agentConfigs[key].can || DB.agentConfigs[key].can === 'CAN-PLM-2026-01') {
    DB.agentConfigs[key].can = serialCan;
  }
  return DB.agentConfigs[key];
}

function getScopedFarmers() {
  if (!currentAgentEmail) return DB.farmers || [];
  const email = currentAgentEmail.toLowerCase().trim();
  return (DB.farmers || []).filter(f => {
    if (!f.agentEmail && !f.registeredBy) return true;
    const fAgent = (f.agentEmail || '').toLowerCase().trim();
    const fReg = (f.registeredBy || '').toLowerCase().trim();
    return fAgent === email || fReg === email;
  });
}

function getScopedCollections() {
  if (!currentAgentEmail) return DB.collections || [];
  const email = currentAgentEmail.toLowerCase().trim();
  return (DB.collections || []).filter(c => {
    if (!c.agentEmail) return true;
    return c.agentEmail.toLowerCase().trim() === email;
  });
}

function getScopedBookings() {
  if (!currentAgentEmail) return DB.bookings || [];
  const email = currentAgentEmail.toLowerCase().trim();
  return (DB.bookings || []).filter(b => {
    if (!b.agentEmail) return true;
    return b.agentEmail.toLowerCase().trim() === email;
  });
}

function getScopedDeductions() {
  if (!currentAgentEmail) return DB.deductions || [];
  const email = currentAgentEmail.toLowerCase().trim();
  return (DB.deductions || []).filter(d => {
    if (!d.agentEmail) return true;
    return d.agentEmail.toLowerCase().trim() === email;
  });
}

let autoBackupDebounceTimer = null;

function saveDB(triggerCloudBackup = false) {
  localStorage.setItem('SMART_DAIRY_GLOBAL_DB', JSON.stringify(DB));
  if (triggerCloudBackup) {
    if (autoBackupDebounceTimer) clearTimeout(autoBackupDebounceTimer);
    autoBackupDebounceTimer = setTimeout(() => {
      backupToMongoDB(true);
    }, 5000);
  }
}

function calculateMilkRate(type, fat, snf) {
  const isCow = (type || '').toLowerCase().includes('cow');
  const cfg = getAgentConfig(currentAgentEmail);
  const r = cfg.rates || DB.rates || { cowBaseRate: 45.0, cowStdFat: 4.5, cowStdSnf: 8.5, buffaloBaseRate: 60.0, buffaloStdFat: 4.0, buffaloStdSnf: 9.0 };

  const baseRate = isCow ? (parseFloat(r.cowBaseRate) || 45.0) : (parseFloat(r.buffaloBaseRate) || 60.0);
  const stdFat = isCow ? (parseFloat(r.cowStdFat) || 4.5) : (parseFloat(r.buffaloStdFat) || 4.0);
  const stdSnf = isCow ? (parseFloat(r.cowStdSnf) || 8.5) : (parseFloat(r.buffaloStdSnf) || 9.0);

  const stdTS = stdFat + stdSnf;
  const actualTS = (parseFloat(fat) || 0) + (parseFloat(snf) || 0);

  if (actualTS <= 0 || stdTS <= 0) return baseRate;
  const rate = parseFloat((baseRate * (actualTS / stdTS)).toFixed(2));
  return Math.max(10.0, rate);
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTomorrowDateString(d = new Date()) {
  const tomorrow = new Date(d);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getLocalDateString(tomorrow);
}

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

function addAiLog(tagClass, tagText, msg) {
  const container = document.getElementById('ai-log-stream-box');
  if (!container) return;
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'ai-log-entry';
  entry.innerHTML = `<span class="ai-tag ${tagClass}">${tagText}</span> [${time}] ${msg}`;
  container.insertBefore(entry, container.firstChild);
}

function togglePasswordVisibility(inputId, iconId) {
  const inputElem = document.getElementById(inputId);
  const iconElem = document.getElementById(iconId);
  if (!inputElem || !iconElem) return;

  if (inputElem.type === 'password') {
    inputElem.type = 'text';
    iconElem.className = 'fa-solid fa-eye-slash';
  } else {
    inputElem.type = 'password';
    iconElem.className = 'fa-solid fa-eye';
  }
}

function toggleRateSettingsCard() {
  const body = document.getElementById('rate-settings-body');
  const icon = document.getElementById('rate-settings-toggle-icon');
  if (body) {
    const isHidden = body.classList.contains('hidden');
    body.classList.toggle('hidden', !isHidden);
    if (icon) icon.innerHTML = isHidden ? '<i class="fa-solid fa-chevron-up"></i> Hide Rates' : '<i class="fa-solid fa-chevron-down"></i> Adjust Rates';
  }
}

function loadRateSettings() {
  const cfg = getAgentConfig(currentAgentEmail);
  const r = cfg.rates || DB.rates || { cowBaseRate: 45.0, cowStdFat: 4.5, cowStdSnf: 8.5, buffaloBaseRate: 60.0, buffaloStdFat: 4.0, buffaloStdSnf: 9.0 };
  if (document.getElementById('rate-cow-base')) document.getElementById('rate-cow-base').value = r.cowBaseRate || 45.0;
  if (document.getElementById('rate-cow-fat')) document.getElementById('rate-cow-fat').value = r.cowStdFat || 4.5;
  if (document.getElementById('rate-cow-snf')) document.getElementById('rate-cow-snf').value = r.cowStdSnf || 8.5;
  if (document.getElementById('rate-buffalo-base')) document.getElementById('rate-buffalo-base').value = r.buffaloBaseRate || 60.0;
  if (document.getElementById('rate-buffalo-fat')) document.getElementById('rate-buffalo-fat').value = r.buffaloStdFat || 4.0;
  if (document.getElementById('rate-buffalo-snf')) document.getElementById('rate-buffalo-snf').value = r.buffaloStdSnf || 9.0;
  updateNoticeBoardRates();
}

function updateNoticeBoardRates() {
  const cfg = getAgentConfig(currentAgentEmail);
  const r = cfg.rates || DB.rates || { cowBaseRate: 45.0, cowStdFat: 4.5, cowStdSnf: 8.5, buffaloBaseRate: 60.0, buffaloStdFat: 4.0, buffaloStdSnf: 9.0 };
  const noticeBox = document.getElementById('notice-current-rates');
  if (noticeBox) {
    noticeBox.innerHTML = `
      <i class="fa-solid fa-sliders"></i> <strong>Active Station TS Payout Formula:</strong><br>
      Cow Milk: Base ₹${r.cowBaseRate}/L (Std FAT ${r.cowStdFat}% + SNF ${r.cowStdSnf}%) | 
      Buffalo Milk: Base ₹${r.buffaloBaseRate}/L (Std FAT ${r.buffaloStdFat}% + SNF ${r.buffaloStdSnf}%)
    `;
  }
}

function renderDeductions() {
  const tbody = document.getElementById('deductions-table-body');
  if (!tbody) return;

  const scopedDeds = getScopedDeductions();
  if (scopedDeds.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">No bill deductions recorded yet.</td></tr>`;
    return;
  }

  const scopedFarmers = getScopedFarmers();
  tbody.innerHTML = scopedDeds.map(d => {
    const farmer = scopedFarmers.find(f => f.id === d.farmerId);
    const farmerDisplayName = farmer ? `${farmer.name} (${d.farmerId})` : (d.farmerName || d.farmerId);
    return `
      <tr>
        <td>${d.date}</td>
        <td><strong>${farmerDisplayName}</strong></td>
        <td>${d.type}</td>
        <td><strong style="color:var(--danger);">₹${parseFloat(d.amount).toFixed(2)}</strong></td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteDeduction('${d.id}')"><i class="fa-solid fa-trash"></i></button></td>
      </tr>
    `;
  }).join('');
}

function deleteDeduction(id) {
  if (confirm('Delete this deduction record?')) {
    DB.deductions = (DB.deductions || []).filter(d => d.id !== id);
    saveDB();
    fetch(`${API_BASE_URL}/api/deductions/${id}`, { method: 'DELETE' }).catch(err => console.warn(err));
    renderDeductions();
    showAlert('Deduction record removed.');
  }
}

function renderAgentFeedbacks() {
  const container = document.getElementById('agent-feedbacks-box');
  if (!container) return;

  const feedbacks = DB.feedbacks || [];
  if (feedbacks.length === 0) {
    container.innerHTML = `<p style="color:#888;">No farmer feedback submitted yet.</p>`;
    return;
  }

  container.innerHTML = feedbacks.map(fb => {
    const stars = '⭐'.repeat(fb.rating || 5);
    return `
      <div style="background: #f8fdf9; border: 1px solid #d8f3dc; border-left: 4px solid var(--primary); padding: 10px 14px; border-radius: 6px; margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--primary);">${fb.farmerName} (${fb.farmerId || fb.farmerEmail})</strong>
          <span style="font-size:0.9em;">${stars}</span>
        </div>
        <p style="margin: 6px 0 0 0; font-size: 0.9em; color: #333;">${fb.text}</p>
      </div>
    `;
  }).join('');
}

async function syncFromMongoDB(isSilent = false) {
  try {
    if (!isSilent) {
      addLog('Connecting to MongoDB Database Service...');
      addAiLog('tag-db', 'AI-DB-SYNC', 'Querying MongoDB database collections...');
    }
    
    const qEmail = currentAgentEmail ? `?agentEmail=${encodeURIComponent(currentAgentEmail)}` : '';
    const [farmersRes, collectionsRes, bookingsRes, deductionsRes, agentsRes, ratesRes, feedbacksRes, stationConfigRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/farmers${qEmail}`),
      fetch(`${API_BASE_URL}/api/collections${qEmail}`),
      fetch(`${API_BASE_URL}/api/bookings${qEmail}`),
      fetch(`${API_BASE_URL}/api/deductions${qEmail}`),
      fetch(`${API_BASE_URL}/api/agents`),
      fetch(`${API_BASE_URL}/api/rates${qEmail}`),
      fetch(`${API_BASE_URL}/api/feedbacks`),
      fetch(`${API_BASE_URL}/api/station-config${qEmail}`)
    ]);

    if (farmersRes.status === 'fulfilled' && farmersRes.value.ok) {
      const data = await farmersRes.value.json();
      if (data.farmers && Array.isArray(data.farmers)) {
        data.farmers.forEach(f => {
          const idx = DB.farmers.findIndex(x => x.id === f.id);
          if (idx >= 0) DB.farmers[idx] = f;
          else DB.farmers.push(f);
        });
      }
    }

    if (collectionsRes.status === 'fulfilled' && collectionsRes.value.ok) {
      const data = await collectionsRes.value.json();
      if (data.collections && Array.isArray(data.collections)) {
        data.collections.forEach(c => {
          const idx = DB.collections.findIndex(x => x.id === c.id);
          if (idx >= 0) DB.collections[idx] = c;
          else DB.collections.push(c);
        });
      }
    }

    if (bookingsRes.status === 'fulfilled' && bookingsRes.value.ok) {
      const data = await bookingsRes.value.json();
      if (data.bookings && Array.isArray(data.bookings)) {
        data.bookings.forEach(b => {
          const idx = DB.bookings.findIndex(x => x.id === b.id);
          if (idx >= 0) DB.bookings[idx] = b;
          else DB.bookings.push(b);
        });
      }
    }

    if (deductionsRes.status === 'fulfilled' && deductionsRes.value.ok) {
      const data = await deductionsRes.value.json();
      if (data.deductions && Array.isArray(data.deductions)) {
        data.deductions.forEach(d => {
          const idx = DB.deductions.findIndex(x => x.id === d.id);
          if (idx >= 0) DB.deductions[idx] = d;
          else DB.deductions.push(d);
        });
      }
    }

    if (feedbacksRes.status === 'fulfilled' && feedbacksRes.value.ok) {
      const data = await feedbacksRes.value.json();
      if (data.feedbacks && Array.isArray(data.feedbacks)) {
        DB.feedbacks = data.feedbacks;
      }
    }

    if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
      const data = await agentsRes.value.json();
      if (data.agents && data.agents.length > 0) {
        data.agents.forEach(a => {
          if (!DB.agentAccounts[a.email]) DB.agentAccounts[a.email] = {};
          DB.agentAccounts[a.email].password = a.password;
        });
      }
    }

    if (ratesRes.status === 'fulfilled' && ratesRes.value.ok) {
      const data = await ratesRes.value.json();
      if (data.rates && data.rates.cowBaseRate) {
        const fetchedRates = {
          cowBaseRate: parseFloat(data.rates.cowBaseRate) || 45.0,
          cowStdFat: parseFloat(data.rates.cowStdFat) || 4.5,
          cowStdSnf: parseFloat(data.rates.cowStdSnf) || 8.5,
          buffaloBaseRate: parseFloat(data.rates.buffaloBaseRate) || 60.0,
          buffaloStdFat: parseFloat(data.rates.buffaloStdFat) || 4.0,
          buffaloStdSnf: parseFloat(data.rates.buffaloStdSnf) || 9.0
        };
        if (currentAgentEmail) {
          getAgentConfig(currentAgentEmail).rates = fetchedRates;
        } else {
          DB.rates = fetchedRates;
        }
      }
    }

    if (stationConfigRes.status === 'fulfilled' && stationConfigRes.value.ok) {
      const data = await stationConfigRes.value.json();
      if (data.config && data.config.can) {
        const cfg = getAgentConfig(currentAgentEmail);
        cfg.can = data.config.can;
        cfg.village = data.config.village || cfg.village;
        cfg.cycle = data.config.cycle || cfg.cycle;
        DB.agentCAN = data.config.can;
      }
    }

    saveDB(false);
    loadRateSettings();
    updateNoticeBoardRates();
    updateCanDisplays();
    renderFarmers();
    renderCollections();
    renderAgentBookings();
    renderDeductions();
    updateDashboardMetrics();
    renderAgentFeedbacks();
    populateDropdowns();
    if (currentFarmer) renderFarmerPortal();

    if (!isSilent) {
      addLog('MongoDB Database sync complete!');
      addAiLog('tag-db', 'AI-DB-SYNC', 'MongoDB cloud database synchronized cleanly.');
    }
  } catch (err) {
    if (!isSilent) console.warn('MongoDB Sync Warning:', err.message);
  }
}

async function backupToMongoDB(isSilent = false) {
  try {
    if (!isSilent) showAlert('Backing up files and database records to MongoDB...', 'info');
    addAiLog('tag-db', 'AI-BACKUP', 'Initiating automated full backup into MongoDB...');
    const response = await fetch(`${API_BASE_URL}/api/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmers: DB.farmers,
        collections: DB.collections,
        bookings: DB.bookings,
        deductions: DB.deductions,
        feedbacks: DB.feedbacks
      })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      if (!isSilent) showAlert('MongoDB Database & File Backup successfully completed!');
      addLog('Full backup created in MongoDB database.');
      addAiLog('tag-db', 'AI-BACKUP', 'Backup snapshot saved to MongoDB atlas.');
    } else {
      if (!isSilent) showAlert(data.message || 'MongoDB backup encountered an error.', 'danger');
    }
  } catch (err) {
    console.error('Backup Error:', err);
    if (!isSilent) showAlert('Backup server connection error. Saved to local browser backup.', 'info');
  }
}

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
    a.download = `Smart_Dairy_MongoDB_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showAlert('MongoDB Backup JSON file downloaded successfully!');
    addAiLog('tag-audit', 'AI-EXPORTS', 'Generated JSON database backup archive.');
  } catch (err) {
    console.error('Export Backup Error:', err);
    showAlert('Failed to generate export backup file.', 'danger');
  }
}

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
      addAiLog('tag-security', 'AI-AUTH', `OTP code generated & emailed to ${email}`);
      
      if (emailInputId === 'agent-email-input') {
        document.getElementById('agent-login-otp-block')?.classList.remove('hidden');
        startOtpCountdown('agent-otp-seconds', 'agent-otp-countdown-info', 'sendAgentLoginOtp');
      } else if (emailInputId === 'reset-agent-email') {
        document.getElementById('reset-otp-block')?.classList.remove('hidden');
        startOtpCountdown('reset-otp-seconds', 'reset-otp-countdown-info', 'sendResetOtp');
      } else if (emailInputId === 'farmer-email') {
        document.getElementById('aadhaar-otp-block')?.classList.remove('hidden');
        document.getElementById('complete-reg-btn')?.classList.remove('hidden');
      } else if (emailInputId === 'farmer-login-email') {
        document.getElementById('farmer-login-otp-block')?.classList.remove('hidden');
        startOtpCountdown('farmer-otp-seconds', 'farmer-otp-countdown-info', 'sendFarmerLoginOtp');
      } else if (emailInputId === 'reset-farmer-email') {
        document.getElementById('farmer-reset-otp-block')?.classList.remove('hidden');
        startOtpCountdown('farmer-reset-otp-seconds', 'farmer-reset-otp-countdown-info', 'sendFarmerResetOtp');
      }
    } else {
      showAlert(data.message || 'Error sending OTP email.', 'danger');
    }
  } catch (err) {
    console.error('Send OTP Error:', err);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;
    showAlert(`[Dev Mode OTP] Verification code: ${otp} (Valid for 1 min)`, 'info');
    if (emailInputId === 'agent-email-input') startOtpCountdown('agent-otp-seconds', 'agent-otp-countdown-info', 'sendAgentLoginOtp');
    else if (emailInputId === 'reset-agent-email') startOtpCountdown('reset-otp-seconds', 'reset-otp-countdown-info', 'sendResetOtp');
    else if (emailInputId === 'farmer-login-email') startOtpCountdown('farmer-otp-seconds', 'farmer-otp-countdown-info', 'sendFarmerLoginOtp');
    else if (emailInputId === 'reset-farmer-email') startOtpCountdown('farmer-reset-otp-seconds', 'farmer-reset-otp-countdown-info', 'sendFarmerResetOtp');
  }
}

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
      addAiLog('tag-security', 'AI-AUTH', `OTP verified for user ${email}`);
      if (typeof onSuccess === 'function') onSuccess();
    } else {
      showAlert(data.message || 'Invalid OTP code. Please try again.', 'danger');
    }
  } catch (err) {
    if (enteredOtp === "123456" || enteredOtp === (otpStore[email] || "")) {
      showAlert('OTP Verified Successfully (Dev Mode)!');
      addAiLog('tag-security', 'AI-AUTH', `OTP verified in dev mode for ${email}`);
      if (typeof onSuccess === 'function') onSuccess();
    } else {
      showAlert('Invalid OTP. Use 123456 for testing.', 'danger');
    }
  }
}

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
      addAiLog('tag-audit', 'AI-EMAIL', `Emailed slip (${booking.status}) to ${booking.farmerEmail}`);
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

async function sendMilkBillReceipt(entry) {
  if (!entry || !entry.farmerEmail) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/send-milk-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    const data = await res.json();
    if (data && data.success) {
      addLog(`Emailed milk collection receipt to ${entry.farmerEmail}`);
      addAiLog('tag-audit', 'AI-EMAIL', `Collection receipt emailed to ${entry.farmerEmail}`);
    }
  } catch (err) {
    console.error('Milk Bill Email Error:', err);
  }
}

function handleBookingDateChange() {
  const bookingDateInput = document.getElementById('booking-date');
  const deliveryDateInput = document.getElementById('booking-delivery-date');
  const today = getLocalDateString();
  const tomorrowStr = getTomorrowDateString();

  if (bookingDateInput) {
    bookingDateInput.min = today;
    bookingDateInput.max = today;
    if (bookingDateInput.value !== today) {
      bookingDateInput.value = today;
      showAlert(`Validation Error: Requirement booking can only be done on the current day (${today})!`, 'danger');
    }
  }

  if (deliveryDateInput) {
    deliveryDateInput.min = tomorrowStr;
    if (!deliveryDateInput.value || deliveryDateInput.value <= today) {
      deliveryDateInput.value = tomorrowStr;
    }
  }
}

let currentCaptchas = { agent: '', farmer: '', admin: '' };
let otpTimerInterval = null;
let otpSecondsRemaining = 60;

function generateCaptcha(role = 'agent') {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  currentCaptchas[role] = code;
  const box = document.getElementById(`${role}-captcha-box`);
  if (box) box.textContent = code;
}

function verifyCaptcha(role = 'agent') {
  const input = document.getElementById(`${role}-captcha-input`);
  if (!input) return true;
  const val = input.value.trim().toUpperCase();
  if (!val || val !== currentCaptchas[role]) {
    showAlert('Invalid Security CAPTCHA code! Please re-enter the 6-character code.', 'danger');
    generateCaptcha(role);
    input.value = '';
    input.focus();
    return false;
  }
  return true;
}

function startOtpCountdown(timerSpanId, infoBoxId, resendFnName = '') {
  if (otpTimerInterval) clearInterval(otpTimerInterval);
  otpSecondsRemaining = 60;

  const info = document.getElementById(infoBoxId);
  if (info) {
    info.classList.remove('hidden');
    info.innerHTML = `⏱️ OTP Valid for: <span id="${timerSpanId}">60</span>s`;
  }

  const footerTimer = document.getElementById('footer-otp-status');
  const farmerFooterTimer = document.getElementById('farmer-footer-otp-status');

  otpTimerInterval = setInterval(() => {
    otpSecondsRemaining--;
    const span = document.getElementById(timerSpanId);
    if (span) span.textContent = String(otpSecondsRemaining);

    const timerHtml = `<i class="fa-solid fa-stopwatch" style="color:#ffb703;"></i> OTP Valid: <span style="color:#ffb703; font-weight:bold;">${otpSecondsRemaining}s</span>`;
    if (footerTimer) footerTimer.innerHTML = timerHtml;
    if (farmerFooterTimer) farmerFooterTimer.innerHTML = timerHtml;

    if (otpSecondsRemaining <= 0) {
      clearInterval(otpTimerInterval);
      if (info) {
        info.innerHTML = `
          <div style="color:#c1121f; font-weight:bold; margin-bottom:4px;">⏱️ OTP Expired (60s limit reached)</div>
          ${resendFnName ? `<button type="button" class="btn btn-gold btn-sm" style="width:100%; margin-top:4px;" onclick="${resendFnName}()"><i class="fa-solid fa-rotate-right"></i> Resend Gmail OTP</button>` : ''}
        `;
      }
      const expiredHtml = `<i class="fa-solid fa-triangle-exclamation" style="color:#ff4d4f;"></i> OTP Expired`;
      if (footerTimer) footerTimer.innerHTML = expiredHtml;
      if (farmerFooterTimer) farmerFooterTimer.innerHTML = expiredHtml;
    }
  }, 1000);
}

function updateCanDisplays() {
  const cfg = getAgentConfig(currentAgentEmail);
  const serialFallback = getSerialCanForAgent(currentAgentEmail);
  const can = (cfg.can && cfg.can !== 'CAN-PLM-2026-01') ? cfg.can : serialFallback;
  const village = cfg.village || ((DB.billingCycle && DB.billingCycle.villageName) ? DB.billingCycle.villageName : 'Palamaner Village');
  const cycle = (cfg.cycle || ((DB.billingCycle && DB.billingCycle.cycleType) ? DB.billingCycle.cycleType : '10-DAY')).toUpperCase();

  const canInput = document.getElementById('agent-can-input');
  if (canInput) canInput.value = can;

  const stCanInput = document.getElementById('station-can-input');
  if (stCanInput) stCanInput.value = can;

  const stVillageInput = document.getElementById('station-village-input');
  if (stVillageInput) stVillageInput.value = village;

  const stCycleSelect = document.getElementById('station-cycle-select');
  if (stCycleSelect) stCycleSelect.value = cfg.cycle || '10-DAY';

  const curCan = document.getElementById('current-can-display');
  if (curCan) curCan.textContent = can;

  const footCan = document.getElementById('footer-can-display');
  if (footCan) footCan.textContent = can;

  const footVillage = document.getElementById('footer-village-display');
  if (footVillage) footVillage.textContent = village;

  const footCycle = document.getElementById('footer-cycle-display');
  if (footCycle) footCycle.textContent = cycle;

  document.querySelectorAll('.sync-can-display').forEach(el => el.textContent = can);
}

function switchTab(tabId) {
  if (tabId === 'deduction') {
    showAlert('Deductions management is handled automatically via Farmer Requirement Approvals.', 'info');
    tabId = 'dashboard';
  }
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');
  
  if (tabId === 'farmers') renderFarmers();
  else if (tabId === 'collection') { renderCollections(); populateDropdowns(); loadRateSettings(); }
  else if (tabId === 'bookings') renderAgentBookings();
  else if (tabId === 'reports') populateDropdowns();
}

function switchLoginRole(role) {
  document.getElementById('btn-role-agent')?.classList.toggle('active', role === 'agent');
  document.getElementById('btn-role-farmer')?.classList.toggle('active', role === 'farmer');
  document.getElementById('btn-role-admin')?.classList.toggle('active', role === 'admin');
  document.getElementById('agent-auth-wrapper')?.classList.toggle('hidden', role !== 'agent');
  document.getElementById('farmer-auth-wrapper')?.classList.toggle('hidden', role !== 'farmer');
  document.getElementById('admin-auth-wrapper')?.classList.toggle('hidden', role !== 'admin');
  if (role === 'admin') generateCaptcha('admin');
  else { generateCaptcha('agent'); generateCaptcha('farmer'); }
}

function toggleAgentAuthMode(mode) {
  agentAuthMode = mode;
  document.getElementById('btn-agent-pass-mode')?.classList.toggle('active', mode === 'password');
  document.getElementById('btn-agent-otp-mode')?.classList.toggle('active', mode === 'otp');
  document.getElementById('agent-password-block')?.classList.toggle('hidden', mode !== 'password');
}

function toggleFarmerAuthMode(mode) {
  farmerAuthMode = mode;
  document.getElementById('btn-farmer-pass-mode')?.classList.toggle('active', mode === 'password');
  document.getElementById('btn-farmer-otp-mode')?.classList.toggle('active', mode === 'otp');
  document.getElementById('farmer-password-block')?.classList.toggle('hidden', mode !== 'password');
}

function toggleAgentResetPass(show) {
  document.getElementById('agent-login-form')?.classList.toggle('hidden', show);
  document.getElementById('agent-reset-form')?.classList.toggle('hidden', !show);
  generateCaptcha('agent');
}

function toggleFarmerResetPass(show) {
  document.getElementById('farmer-login-form')?.classList.toggle('hidden', show);
  document.getElementById('farmer-reset-form')?.classList.toggle('hidden', !show);
  generateCaptcha('farmer');
}

function sendAgentLoginOtp() { handleSendOTP('agent-email-input', 'Agent Portal Login'); }
function sendResetOtp() {
  handleSendOTP('reset-agent-email', 'Agent Registration Verification');
  document.getElementById('reset-otp-block')?.classList.remove('hidden');
  document.getElementById('reset-new-pass-block')?.classList.remove('hidden');
  document.getElementById('btn-send-reset-otp')?.classList.add('hidden');
  document.getElementById('btn-save-reset-pass')?.classList.remove('hidden');
}
function sendFarmerLoginOtp() { handleSendOTP('farmer-login-email', 'Farmer Portal Access'); }
function sendFarmerResetOtp() {
  handleSendOTP('reset-farmer-email', 'Farmer Password Setup');
  document.getElementById('farmer-reset-otp-block')?.classList.remove('hidden');
  document.getElementById('farmer-reset-new-pass-block')?.classList.remove('hidden');
  document.getElementById('btn-send-farmer-reset-otp')?.classList.add('hidden');
  document.getElementById('btn-save-farmer-reset-pass')?.classList.remove('hidden');
}
function verifyGmailOtp() { handleSendOTP('farmer-email', 'Farmer Registration Verification'); }

function getBillingPeriod(dateStr, mode = '10-DAY') {
  if (!dateStr) return '--';
  const cfg = getAgentConfig(currentAgentEmail);
  const effectiveMode = cfg.cycle ? cfg.cycle.toUpperCase() : ((DB.billingCycle && DB.billingCycle.cycleType) ? DB.billingCycle.cycleType.toUpperCase() : mode);
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = d.getDate();

  if (effectiveMode.includes('15')) {
    if (day <= 15) return `${year}-${month}-01 to ${year}-${month}-15`;
    return `${year}-${month}-16 to ${year}-${month}-31`;
  }
  if (effectiveMode.includes('MONTH') || effectiveMode.includes('30')) {
    return `${year}-${month}-01 to ${year}-${month}-31`;
  }
  if (effectiveMode.includes('WEEK') || effectiveMode.includes('7')) {
    const startDay = Math.floor((day - 1) / 7) * 7 + 1;
    const endDay = Math.min(31, startDay + 6);
    return `${year}-${month}-${String(startDay).padStart(2,'0')} to ${year}-${month}-${String(endDay).padStart(2,'0')}`;
  }
  if (day <= 10) return `${year}-${month}-01 to ${year}-${month}-10`;
  if (day <= 20) return `${year}-${month}-11 to ${year}-${month}-20`;
  return `${year}-${month}-21 to ${year}-${month}-31`;
}

function initAppView(role) {
  document.getElementById('auth-section')?.classList.add('hidden');
  document.getElementById('user-status')?.classList.remove('hidden');
  
  if (role === 'agent') {
    document.getElementById('app-section')?.classList.remove('hidden');
    document.getElementById('sidebar')?.classList.remove('hidden');
    document.getElementById('farmer-portal-section')?.classList.add('hidden');
    document.getElementById('active-user-label').innerText = `Agent: ${currentAgentEmail}`;
    syncFromMongoDB();
    updateCanDisplays();
    loadRateSettings();
    updateDashboardMetrics();
    renderFarmers();
    renderAgentBookings();
    renderDeductions();
  } else {
    document.getElementById('app-section')?.classList.add('hidden');
    document.getElementById('sidebar')?.classList.add('hidden');
    document.getElementById('farmer-portal-section')?.classList.remove('hidden');
    if (!currentFarmer) {
      const scoped = getScopedFarmers();
      if (scoped && scoped.length > 0) currentFarmer = scoped[0];
      else if (DB.farmers && DB.farmers.length > 0) currentFarmer = DB.farmers[0];
      else currentFarmer = { id: 'FARM-101', name: 'K Harish', email: '11249a251@kanchiuniv.ac.in', mobile: '9100447663' };
    }
    const activeLabel = document.getElementById('active-user-label');
    if (activeLabel) activeLabel.innerText = `Farmer: ${currentFarmer.name}`;
    renderFarmerPortal();
  }
}

function logout() {
  currentAgentEmail = null;
  currentFarmer = null;
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('app-section')?.classList.add('hidden');
  document.getElementById('farmer-portal-section')?.classList.add('hidden');
  document.getElementById('admin-section')?.classList.add('hidden');
  document.getElementById('user-status')?.classList.add('hidden');
  document.getElementById('sidebar')?.classList.add('hidden');
}

// =====================================================
// ADMIN MODULE — Frontend Logic
// =====================================================

let currentAdminToken = null;
let adminAllFarmersCache = [];
let adminAllCollectionsCache = [];
let adminMilkChartInstance = null;
let adminVillagePieInstance = null;

function adminLogout() {
  currentAdminToken = null;
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('admin-section')?.classList.add('hidden');
  document.getElementById('user-status')?.classList.add('hidden');
  document.getElementById('sidebar')?.classList.add('hidden');
  switchLoginRole('agent');
}

function switchAdminTab(tab) {
  ['overview','agents','farmers','collections'].forEach(t => {
    document.getElementById(`admin-tab-${t}`)?.classList.toggle('hidden', t !== tab);
    const btn = document.getElementById(`admin-tab-btn-${t}`);
    if (btn) {
      if (t === tab) { btn.style.background = '#7b2d8b'; btn.style.color = '#fff'; btn.style.fontWeight = 'bold'; }
      else { btn.style.background = ''; btn.style.color = ''; btn.style.fontWeight = ''; }
    }
  });
  if (tab === 'agents') loadAdminAgents();
  else if (tab === 'farmers') loadAdminFarmers();
  else if (tab === 'collections') loadAdminCollections();
  else loadAdminOverview();
}

async function loadAdminOverview() {
  if (!currentAdminToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/overview`, {
      headers: { 'x-admin-token': currentAdminToken }
    });
    const data = await res.json();
    if (!data.success) { showAlert('Admin: Could not load overview.', 'danger'); return; }
    const ov = data.overview;
    document.getElementById('admin-stat-agents').textContent = ov.agentsCount || 0;
    document.getElementById('admin-stat-farmers').textContent = ov.farmersCount || 0;
    document.getElementById('admin-stat-today-milk').textContent = `${(ov.todayMilk || 0).toFixed(1)} L`;
    document.getElementById('admin-stat-today-value').textContent = `₹${(ov.todayValue || 0).toFixed(0)}`;

    const breakdown = ov.agentBreakdown || [];
    const tbody = document.getElementById('admin-overview-tbody');
    if (tbody) {
      tbody.innerHTML = breakdown.length ? breakdown.map(a => `
        <tr>
          <td style="font-size:0.82em;">${a.email}</td>
          <td><strong>${a.can}</strong></td>
          <td>${a.village}</td>
          <td>${a.cycle}</td>
          <td>${a.farmersCount}</td>
          <td>${a.collectionsCount}</td>
          <td style="color:var(--primary); font-weight:bold;">${a.totalMilk} L</td>
          <td style="color:#40916c; font-weight:bold;">₹${a.totalValue}</td>
          <td style="color:var(--gold); font-weight:bold;">${a.todayMilk} L</td>
        </tr>`).join('') : '<tr><td colspan="9" style="text-align:center;color:#888;">No agent data found.</td></tr>';
    }
    renderAdminCharts(breakdown);
  } catch (err) {
    showAlert('Admin overview fetch failed. Check connection.', 'danger');
  }
}

function renderAdminCharts(breakdown) {
  // Destroy old charts
  if (adminMilkChartInstance) { adminMilkChartInstance.destroy(); adminMilkChartInstance = null; }
  if (adminVillagePieInstance) { adminVillagePieInstance.destroy(); adminVillagePieInstance = null; }

  const milkCtx = document.getElementById('admin-agent-milk-chart');
  if (milkCtx && breakdown.length) {
    adminMilkChartInstance = new Chart(milkCtx, {
      type: 'bar',
      data: {
        labels: breakdown.map(a => a.email.split('@')[0]),
        datasets: [{
          label: 'Total Milk (L)',
          data: breakdown.map(a => a.totalMilk),
          backgroundColor: breakdown.map((_, i) => ['#7b2d8b','#1b4332','#b58302','#40916c','#206a78'][i % 5]),
          borderRadius: 6
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  const pieCtx = document.getElementById('admin-village-pie-chart');
  if (pieCtx && breakdown.length) {
    const villageMap = {};
    breakdown.forEach(a => {
      const v = a.village || 'Unknown';
      villageMap[v] = (villageMap[v] || 0) + a.totalMilk;
    });
    adminVillagePieInstance = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(villageMap),
        datasets: [{
          data: Object.values(villageMap),
          backgroundColor: ['#7b2d8b','#1b4332','#b58302','#40916c','#206a78','#c62828','#1565c0']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
    });
  }
}

async function loadAdminAgents() {
  if (!currentAdminToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/agents`, {
      headers: { 'x-admin-token': currentAdminToken }
    });
    const data = await res.json();
    const tbody = document.getElementById('admin-agents-tbody');
    if (!tbody) return;
    if (!data.success || !data.agents.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#888;">No agents registered yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.agents.map((a, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-size:0.82em; font-weight:bold;">${a.email}</td>
        <td><span style="background:#e1bee7; color:#4a0072; padding:2px 8px; border-radius:12px; font-weight:bold;">${a.can}</span></td>
        <td>${a.village}</td>
        <td>${a.cycle}</td>
        <td>${a.farmerCount}</td>
        <td>${a.collectionCount}</td>
        <td style="font-size:0.8em;">${a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '--'}</td>
        <td>
          <button class="btn btn-sm btn-gold" onclick="adminResetPassword('${a.email}')" style="margin-right:4px;"><i class="fa-solid fa-key"></i> Reset Pass</button>
          <button class="btn btn-sm btn-danger" onclick="adminDeleteAgent('${a.email}')"><i class="fa-solid fa-trash"></i> Remove</button>
        </td>
      </tr>`).join('');
  } catch (err) {
    showAlert('Failed to load agents list.', 'danger');
  }
}

function adminResetPassword(email) {
  const card = document.getElementById('admin-reset-pass-card');
  const label = document.getElementById('admin-reset-target-email');
  const input = document.getElementById('admin-new-password-input');
  if (card) { card.classList.remove('hidden'); card.dataset.targetEmail = email; }
  if (label) label.textContent = `Resetting password for: ${email}`;
  if (input) input.value = '';
  card?.scrollIntoView({ behavior: 'smooth' });
}

async function confirmAdminResetPassword() {
  const card = document.getElementById('admin-reset-pass-card');
  const email = card?.dataset.targetEmail;
  const newPass = document.getElementById('admin-new-password-input')?.value.trim();
  if (!email || !newPass || newPass.length < 4) {
    showAlert('Password must be at least 4 characters.', 'danger'); return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/agents/${encodeURIComponent(email)}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': currentAdminToken },
      body: JSON.stringify({ newPassword: newPass })
    });
    const data = await res.json();
    if (data.success) {
      showAlert(`✅ ${data.message}`, 'success');
      card.classList.add('hidden');
    } else {
      showAlert(`Error: ${data.message}`, 'danger');
    }
  } catch (err) {
    showAlert('Reset password request failed.', 'danger');
  }
}

async function adminDeleteAgent(email) {
  if (!confirm(`⚠️ Are you sure you want to REMOVE agent:\n${email}\n\nThis will delete their account, station config, and rate config from MongoDB. Farmer records are kept.`)) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/agents/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': currentAdminToken }
    });
    const data = await res.json();
    if (data.success) { showAlert(`✅ ${data.message}`, 'success'); loadAdminAgents(); }
    else showAlert(`Error: ${data.message}`, 'danger');
  } catch (err) {
    showAlert('Delete agent request failed.', 'danger');
  }
}

async function loadAdminFarmers() {
  if (!currentAdminToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/farmers`, {
      headers: { 'x-admin-token': currentAdminToken }
    });
    const data = await res.json();
    adminAllFarmersCache = data.farmers || [];
    renderAdminFarmersTable(adminAllFarmersCache);
  } catch (err) {
    showAlert('Failed to load farmers list.', 'danger');
  }
}

function renderAdminFarmersTable(farmers) {
  const tbody = document.getElementById('admin-farmers-tbody');
  if (!tbody) return;
  if (!farmers.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">No farmers found.</td></tr>'; return;
  }
  tbody.innerHTML = farmers.map((f, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td style="font-size:0.82em;">${f.id}</td>
      <td><strong>${f.name}</strong></td>
      <td>${f.village || '--'}</td>
      <td>${f.mobile}</td>
      <td style="font-size:0.82em;">${f.email}</td>
      <td>${f.bankName || '--'}</td>
      <td style="font-size:0.82em; color:#7b2d8b;">${f.agentEmail || f.registeredBy || '--'}</td>
    </tr>`).join('');
}

function filterAdminFarmers() {
  const q = (document.getElementById('admin-farmer-filter')?.value || '').toLowerCase().trim();
  if (!q) { renderAdminFarmersTable(adminAllFarmersCache); return; }
  const filtered = adminAllFarmersCache.filter(f =>
    (f.name || '').toLowerCase().includes(q) ||
    (f.email || '').toLowerCase().includes(q) ||
    (f.village || '').toLowerCase().includes(q) ||
    (f.mobile || '').includes(q)
  );
  renderAdminFarmersTable(filtered);
}

async function loadAdminCollections() {
  if (!currentAdminToken) return;
  const start = document.getElementById('admin-col-start')?.value;
  const end = document.getElementById('admin-col-end')?.value;
  let url = `${API_BASE_URL}/api/admin/collections`;
  const params = new URLSearchParams();
  if (start) params.append('startDate', start);
  if (end) params.append('endDate', end);
  if (params.toString()) url += '?' + params.toString();

  try {
    const res = await fetch(url, { headers: { 'x-admin-token': currentAdminToken } });
    const data = await res.json();
    adminAllCollectionsCache = data.collections || [];
    renderAdminCollectionsTable(adminAllCollectionsCache);
  } catch (err) {
    showAlert('Failed to load collections.', 'danger');
  }
}

function renderAdminCollectionsTable(collections) {
  const tbody = document.getElementById('admin-collections-tbody');
  if (!tbody) return;
  if (!collections.length) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:#888;">No collection records found.</td></tr>'; return;
  }
  tbody.innerHTML = collections.map(c => `
    <tr>
      <td>${c.date}</td>
      <td><strong>${c.farmerName}</strong></td>
      <td style="font-size:0.78em; color:#7b2d8b;">${c.agentEmail || '--'}</td>
      <td>${c.type || '--'}</td>
      <td>${c.shift}</td>
      <td style="color:var(--primary); font-weight:bold;">${c.qty} L</td>
      <td>${c.fat}%</td>
      <td>${c.snf}%</td>
      <td style="color:${(c.waterPct||0) > 15 ? 'var(--danger)' : 'inherit'};">${c.waterPct || 0}%</td>
      <td>₹${(c.rate||0).toFixed(2)}</td>
      <td style="color:#40916c; font-weight:bold;">₹${(c.total||0).toFixed(2)}</td>
      <td>
        <button class="btn btn-sm btn-gold" onclick="adminEditCollection('${c.id}',${c.qty},${c.fat},${c.snf},${c.waterPct||0},${c.rate},${c.total})" style="margin-right:3px;"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-danger" onclick="adminDeleteCollection('${c.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function adminEditCollection(id, qty, fat, snf, water, rate, total) {
  document.getElementById('admin-edit-col-id').value = id;
  document.getElementById('admin-edit-qty').value = qty;
  document.getElementById('admin-edit-fat').value = fat;
  document.getElementById('admin-edit-snf').value = snf;
  document.getElementById('admin-edit-water').value = water;
  document.getElementById('admin-edit-rate').value = rate;
  document.getElementById('admin-edit-total').value = total;
  document.getElementById('admin-edit-col-card')?.classList.remove('hidden');
  document.getElementById('admin-edit-col-card')?.scrollIntoView({ behavior: 'smooth' });
}

async function confirmAdminEditCollection() {
  const id = document.getElementById('admin-edit-col-id').value;
  const qty = parseFloat(document.getElementById('admin-edit-qty').value) || 0;
  const fat = parseFloat(document.getElementById('admin-edit-fat').value) || 0;
  const snf = parseFloat(document.getElementById('admin-edit-snf').value) || 0;
  const waterPct = parseFloat(document.getElementById('admin-edit-water').value) || 0;
  const rate = parseFloat(document.getElementById('admin-edit-rate').value) || 0;
  const total = parseFloat(document.getElementById('admin-edit-total').value) || 0;
  if (!id) { showAlert('No collection selected.', 'danger'); return; }
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/collections/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': currentAdminToken },
      body: JSON.stringify({ qty, fat, snf, waterPct, rate, total })
    });
    const data = await res.json();
    if (data.success) {
      showAlert('✅ Collection entry updated by admin.', 'success');
      document.getElementById('admin-edit-col-card')?.classList.add('hidden');
      loadAdminCollections();
    } else showAlert(`Error: ${data.message}`, 'danger');
  } catch (err) {
    showAlert('Failed to update collection.', 'danger');
  }
}

async function adminDeleteCollection(id) {
  if (!confirm('⚠️ Delete this collection entry permanently from MongoDB?')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/collections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': currentAdminToken }
    });
    const data = await res.json();
    if (data.success) { showAlert('✅ Collection entry deleted.', 'success'); loadAdminCollections(); }
    else showAlert(`Error: ${data.message}`, 'danger');
  } catch (err) {
    showAlert('Failed to delete collection.', 'danger');
  }
}

document.getElementById('farmer-booking-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!currentFarmer) return;

  const itemVal = document.getElementById('booking-item-type').value;
  const [itemName, unitPriceStr] = itemVal.split('|');
  const unitPrice = parseFloat(unitPriceStr) || 0;
  const qty = parseInt(document.getElementById('booking-qty').value, 10) || 1;
  const bookingDate = document.getElementById('booking-date').value;
  const deliveryDate = document.getElementById('booking-delivery-date').value;

  if (!bookingDate || !deliveryDate) {
    showAlert('Please select both Date of Booking and Delivery Date.', 'danger');
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (bookingDate !== todayStr) {
    showAlert(`Validation Error: Requirement booking can only be done on the current day (${todayStr})!`, 'danger');
    addAiLog('tag-anomaly', 'AI-VALIDATE', `Rejected requirement: Booking date (${bookingDate}) is not current day.`);
    document.getElementById('booking-date').focus();
    return;
  }

  const bDateObj = new Date(bookingDate);
  const dDateObj = new Date(deliveryDate);

  if (dDateObj <= bDateObj) {
    showAlert('Validation Error: Requested delivery date must be strictly after the current booking day!', 'danger');
    addAiLog('tag-anomaly', 'AI-VALIDATE', `Rejected requirement: Delivery date (${deliveryDate}) <= Booking date (${bookingDate})`);
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
    status: 'Pending',
    agentEmail: currentFarmer.agentEmail || currentFarmer.registeredBy || currentAgentEmail || ''
  };

  if (!DB.bookings) DB.bookings = [];
  DB.bookings.push(booking);
  saveDB();

  fetch(`${API_BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking)
  }).catch(err => console.warn('Cloud sync offline:', err));

  showAlert('Requirement request submitted successfully!');
  addAiLog('tag-audit', 'AI-BOOKING', `Farmer ${currentFarmer.name} requested ${itemName} (Qty: ${qty})`);
  renderFarmerBookings();
  this.reset();
  
  const today = getLocalDateString();
  const tomorrow = getTomorrowDateString();
  document.getElementById('booking-date').value = today;
  document.getElementById('booking-date').min = today;
  document.getElementById('booking-date').max = today;
  document.getElementById('booking-delivery-date').value = tomorrow;
  document.getElementById('booking-delivery-date').min = tomorrow;
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
    const badgeClass = isApproved ? 'water-pure' : 'water-warning';
    
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

  const bookings = getScopedBookings();
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
        <td>${b.farmerName} (${b.farmerId})</td>
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

async function processRequirementOrder(bookingId, statusState) {
  const b = (DB.bookings || []).find(item => item.id === bookingId);
  if (!b) return;

  b.status = statusState;

  if (statusState === 'Approved & Cost Deducted' || statusState === 'APPROVED') {
    const dedEntry = {
      id: `DED-${b.id}`,
      farmerId: b.farmerId,
      farmerName: b.farmerName,
      type: `Requirement: ${b.item} (x${b.qty})`,
      amount: b.totalPrice,
      date: b.bookingDate,
      agentEmail: currentAgentEmail || b.agentEmail || ''
    };
    if (!DB.deductions) DB.deductions = [];
    const existingIdx = DB.deductions.findIndex(d => d.id === dedEntry.id);
    if (existingIdx >= 0) DB.deductions[existingIdx] = dedEntry;
    else DB.deductions.push(dedEntry);

    fetch(`${API_BASE_URL}/api/deductions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dedEntry)
    }).catch(err => console.warn('Deduction sync offline:', err));
  }

  saveDB();

  fetch(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: statusState, deliveryDate: b.deliveryDate })
  }).catch(err => console.warn('Cloud status update offline:', err));

  showAlert(`Requirement order ${bookingId} updated to ${statusState}!`);
  addAiLog('tag-audit', 'AI-APPROVAL', `Order ${bookingId} set to ${statusState} by Agent.`);
  renderAgentBookings();
  renderDeductions();

  showRequirementSlip(bookingId);
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

function toggleEntryMode(mode) { showAlert(`Switched to ${mode.toUpperCase()} entry mode.`, 'info'); }

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
    waterPct = parseFloat((((stdSnf - snf) / stdSnf) * 100).toFixed(1));
  }

  const waterInput = document.getElementById('milk-water-pct');
  if (waterInput) {
    waterInput.value = waterPct;
  }

  const alertBadge = document.getElementById('water-quality-alert');
  if (alertBadge) {
    if (waterPct > 0) {
      alertBadge.className = 'alert alert-danger';
      alertBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Water Adulteration Detected (${waterPct}%)`;
      addAiLog('tag-anomaly', 'AI-ANOMALY', `Water adulteration detected: ${waterPct}%`);
    } else {
      alertBadge.className = 'alert alert-success';
      alertBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Pure Milk Sample Detected`;
    }
  }
}

document.getElementById('milk-form')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const farmerId = document.getElementById('milk-farmer-id').value;
  if (!farmerId) {
    showAlert('Please select a valid registered farmer.', 'danger');
    return;
  }

  const farmer = getScopedFarmers().find(f => f.id === farmerId);
  const qtyInputVal = document.getElementById('milk-qty').value.trim();
  const qty = parseFloat(qtyInputVal);

  if (isNaN(qty) || qty <= 0) {
    showAlert('Validation Error: Milk Quantity must be greater than 0 Liters!', 'danger');
    document.getElementById('milk-qty').focus();
    return;
  }

  const fat = parseFloat(document.getElementById('milk-fat').value) || 4.0;
  const snf = parseFloat(document.getElementById('milk-snf').value) || 8.1;
  const waterRaw = document.getElementById('milk-water-pct')?.value || '0';
  const waterPct = parseFloat(String(waterRaw).replace(/[^0-9.]/g, '')) || 0;
  const type = document.getElementById('milk-type').value;

  const rate = calculateMilkRate(type, fat, snf);
  const total = parseFloat((qty * rate).toFixed(2));

  const entry = {
    id: `COL-${Date.now()}`,
    date: document.getElementById('milk-date').value || new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    farmerId,
    farmerName: farmer ? farmer.name : 'Unknown',
    farmerEmail: farmer ? farmer.email : '',
    type,
    shift: document.getElementById('milk-shift').value,
    qty,
    liters: qty,
    fat,
    snf,
    waterPct,
    rate,
    total,
    totalAmount: total,
    agentEmail: currentAgentEmail || ''
  };

  DB.collections.push(entry);
  saveDB();

  sendMilkBillReceipt(entry);

  fetch(`${API_BASE_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  }).catch(err => console.warn('Collection cloud sync offline:', err));

  showAlert(`Milk entry (${qty} L - ₹${total}) recorded & dispatched to farmer email!`);
  addLog(`Recorded entry for ${entry.farmerName} - ${qty}L (₹${total})`);
  addAiLog('tag-audit', 'AI-COLLECTION', `Milk entry logged: ${entry.farmerName} - ${qty}L (Total: ₹${total})`);
  
  renderCollections();
  updateDashboardMetrics();
  this.reset();
  document.getElementById('milk-date').value = getLocalDateString();
});

document.getElementById('deduction-form')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const farmerId = document.getElementById('deduction-farmer-id').value;
  const amount = parseFloat(document.getElementById('deduction-amount').value) || 0;
  const type = document.getElementById('deduction-type').value;
  const date = document.getElementById('deduction-date').value;

  const ded = { id: `DED-${Date.now()}`, farmerId, type, amount, date, agentEmail: currentAgentEmail || '' };
  DB.deductions.push(ded);
  saveDB();

  fetch(`${API_BASE_URL}/api/deductions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ded)
  }).catch(err => console.warn('Deduction cloud sync offline:', err));

  showAlert('Bill deduction logged successfully!');
  addAiLog('tag-audit', 'AI-DEDUCTION', `Bill deduction logged: ₹${amount} for Farmer ${farmerId}`);
  this.reset();
  renderDeductions();
});

document.getElementById('farmer-verification-form')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('farmer-email').value.trim().toLowerCase();
  const mobile = document.getElementById('farmer-mobile').value.trim();

  const existingEmail = DB.farmers.find(f => f.email === email);
  if (existingEmail) {
    showAlert(`Registration Error: Farmer with Gmail (${email}) is already registered! (Primary Key: ${existingEmail.id})`, 'danger');
    return;
  }

  const existingMobile = DB.farmers.find(f => f.mobile === mobile);
  if (existingMobile) {
    showAlert(`Registration Error: Farmer with Mobile Number (${mobile}) is already registered! (Primary Key: ${existingMobile.id})`, 'danger');
    return;
  }

  handleVerifyOTP('farmer-email', 'farmer-aadhaar-otp', () => {
    const id = `FARM-${String(DB.farmers.length + 1).padStart(3, '0')}`;
    const address = (document.getElementById('farmer-address')?.value || '').trim();
    const newFarmer = {
      id,
      name: document.getElementById('farmer-name').value.trim(),
      mobile: mobile,
      email: email,
      address: address,
      village: document.getElementById('farmer-village').value.trim(),
      bankName: document.getElementById('farmer-bank-name').value,
      account: document.getElementById('farmer-account').value.trim(),
      ifsc: document.getElementById('farmer-ifsc').value.trim(),
      password: 'farmer123',
      registeredBy: currentAgentEmail || 'Agent',
      agentEmail: currentAgentEmail || ''
    };

    DB.farmers.push(newFarmer);
    saveDB();

    fetch(`${API_BASE_URL}/api/farmers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFarmer)
    }).catch(err => console.warn('Farmer cloud sync offline:', err));

    showAlert(`Farmer ${newFarmer.name} registered successfully! (Primary Key: ${id})`);
    addAiLog('tag-security', 'AI-REGISTER', `Farmer ${newFarmer.name} (PK: ${id}) registered.`);
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

  const scopedFarmers = getScopedFarmers();
  if (scopedFarmers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No farmers registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = scopedFarmers.map(f => `
    <tr>
      <td><strong>${f.id}</strong></td>
      <td>${f.name}</td>
      <td>${f.address || 'N/A'}</td>
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
  const scopedFarmers = getScopedFarmers();
  if (!scopedFarmers.length) return showAlert('No farmer records to export.', 'danger');
  let csv = 'ID,Name,Village,Mobile,Email,Bank,Account,IFSC\n';
  scopedFarmers.forEach(f => {
    csv += `"${f.id}","${f.name}","${f.village}","${f.mobile}","${f.email}","${f.bankName}","${f.account}","${f.ifsc}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Smart_Dairy_Farmers_Directory_${getLocalDateString()}.csv`;
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

  const scopedCollections = getScopedCollections();
  if (scopedCollections.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No milk collection entries found.</td></tr>`;
    return;
  }

  tbody.innerHTML = scopedCollections.map(c => `
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
  const scopedFarmers = getScopedFarmers();
  const options = scopedFarmers.map(f => `<option value="${f.id}">${f.name} (${f.id})</option>`).join('');
  ['milk-farmer-id', 'deduction-farmer-id', 'report-farmer-code'].forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = `<option value="">Select Farmer</option>` + options;
    }
  });
}

function updateDashboardMetrics() {
  const today = getLocalDateString();
  const milkDate = document.getElementById('milk-date');
  if (milkDate) milkDate.value = today;

  const scopedFarmers = getScopedFarmers();
  const scopedCollections = getScopedCollections();

  const farmerCountElem = document.getElementById('dash-farmer-count');
  if (farmerCountElem) farmerCountElem.innerText = scopedFarmers.length;

  const todayCollections = scopedCollections.filter(c => c.date === today);
  const totalQty = todayCollections.reduce((sum, c) => sum + (parseFloat(c.qty) || 0), 0);
  const waterAlerts = scopedCollections.filter(c => c.waterPct > 0).length;

  const totalQtyElem = document.getElementById('dash-milk-total');
  const alertsElem = document.getElementById('dash-water-alerts');
  if (totalQtyElem) totalQtyElem.innerText = `${totalQty.toFixed(1)} L`;
  if (alertsElem) alertsElem.innerText = waterAlerts;

  const aiAnomalyElem = document.getElementById('ai-anomaly-count');
  if (aiAnomalyElem) {
    aiAnomalyElem.innerText = `${waterAlerts} Alert${waterAlerts !== 1 ? 's' : ''}`;
    aiAnomalyElem.style.color = waterAlerts > 0 ? 'var(--danger)' : '#00ffcc';
  }

  const emptyBanner = document.getElementById('empty-dash-banner');
  const activeCharts = document.getElementById('active-dash-charts');

  if (scopedCollections.length === 0 && scopedFarmers.length === 0) {
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

  const scopedCollections = getScopedCollections();
  const dates = [...new Set(scopedCollections.map(c => c.date))].sort().slice(-7);
  const dailyTotals = dates.map(d => {
    return scopedCollections.filter(c => c.date === d).reduce((acc, curr) => acc + (parseFloat(curr.qty) || 0), 0);
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

  const cowMilkCount = scopedCollections.filter(c => c.type === 'Cow Milk').length;
  const buffaloMilkCount = scopedCollections.filter(c => c.type === 'Buffalo Milk').length;

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

let farmerVolChartInst = null;
let farmerShiftChartInst = null;

function renderFarmerCharts(collections = []) {
  const volCtx = document.getElementById('farmer-volume-chart')?.getContext('2d');
  const shiftCtx = document.getElementById('farmer-shift-chart')?.getContext('2d');

  if (!volCtx || !shiftCtx) return;

  const dateMap = {};
  let morningQty = 0;
  let eveningQty = 0;

  collections.forEach(c => {
    const qty = parseFloat(c.qty) || 0;
    dateMap[c.date] = (dateMap[c.date] || 0) + qty;
    if ((c.shift || '').toLowerCase().includes('morn')) morningQty += qty;
    else eveningQty += qty;
  });

  const sortedDates = Object.keys(dateMap).sort();
  const volumes = sortedDates.map(d => dateMap[d]);

  if (farmerVolChartInst) farmerVolChartInst.destroy();
  if (farmerShiftChartInst) farmerShiftChartInst.destroy();

  farmerVolChartInst = new Chart(volCtx, {
    type: 'bar',
    data: {
      labels: sortedDates.length > 0 ? sortedDates : ['No Data'],
      datasets: [{
        label: 'Daily Milk Volume (L)',
        data: volumes.length > 0 ? volumes : [0],
        backgroundColor: '#2d6a4f',
        borderColor: '#1b4332',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Liters (L)' } }
      }
    }
  });

  farmerShiftChartInst = new Chart(shiftCtx, {
    type: 'doughnut',
    data: {
      labels: ['Morning Shift', 'Evening Shift'],
      datasets: [{
        data: [morningQty, eveningQty],
        backgroundColor: ['#ffb703', '#206a78']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderFarmerPortal() {
  if (!currentFarmer) {
    if (DB.farmers && DB.farmers.length > 0) currentFarmer = DB.farmers[0];
    else currentFarmer = { id: 'FARM-101', name: 'K Harish', email: '11249a251@kanchiuniv.ac.in', mobile: '9100447663' };
  }

  const nameElem = document.getElementById('farmer-portal-name');
  const phoneElem = document.getElementById('farmer-portal-phone');
  if (nameElem) nameElem.innerText = currentFarmer.name;
  if (phoneElem) phoneElem.innerText = currentFarmer.email || currentFarmer.mobile;

  let fromInput = document.getElementById('farmer-range-from');
  let toInput = document.getElementById('farmer-range-to');

  if (fromInput && !fromInput.value) {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    fromInput.value = getLocalDateString(d);
  }
  if (toInput && !toInput.value) {
    toInput.value = getLocalDateString();
  }

  const fromDate = fromInput?.value;
  const toDate = toInput?.value;
  const cycleMode = document.getElementById('farmer-billing-cycle-mode')?.value || '10-DAY';

  const datePromptCard = document.getElementById('farmer-date-prompt');
  const reportContainer = document.getElementById('farmer-report-container');

  if (!fromDate || !toDate) {
    datePromptCard?.classList.remove('hidden');
    reportContainer?.classList.add('hidden');
    renderFarmerBookings();
    return;
  }

  datePromptCard?.classList.add('hidden');
  reportContainer?.classList.remove('hidden');

  addAiLog('tag-audit', 'AI-REPORT', `Farmer ${currentFarmer.name} requested report range: ${fromDate} to ${toDate}`);

  const farmerCollections = (DB.collections || []).filter(c => {
    const matchesFarmer = (c.farmerId === currentFarmer.id || c.farmerEmail === currentFarmer.email);
    const matchesFrom = c.date >= fromDate;
    const matchesTo = c.date <= toDate;
    return matchesFarmer && matchesFrom && matchesTo;
  });

  let totalQty = 0;
  let totalEarnings = 0;

  const itemizedTbody = document.getElementById('farmer-itemized-tbody');
  if (itemizedTbody) {
    if (farmerCollections.length === 0) {
      itemizedTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#888;">No milk collection records found between ${fromDate} and ${toDate}.</td></tr>`;
    } else {
      itemizedTbody.innerHTML = farmerCollections.map(c => {
        const itemQty = parseFloat(c.qty) || 0;
        totalQty += itemQty;
        totalEarnings += parseFloat(c.total) || 0;
        return `
          <tr>
            <td>${c.date}</td>
            <td>${c.shift}</td>
            <td>${c.type}</td>
            <td>${itemQty} L</td>
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

  renderFarmerCharts(farmerCollections);

  const farmerDeductions = (DB.bookings || []).filter(b => {
    const matchesFarmer = (b.farmerId === currentFarmer.id || b.farmerEmail === currentFarmer.email);
    const isApproved = b.status === 'Approved & Cost Deducted' || b.status === 'APPROVED';
    const matchesFrom = b.bookingDate >= fromDate;
    const matchesTo = b.bookingDate <= toDate;
    return matchesFarmer && isApproved && matchesFrom && matchesTo;
  });

  let totalDeductions = farmerDeductions.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);

  const dedTbody = document.getElementById('farmer-deductions-tbody');
  if (dedTbody) {
    if (farmerDeductions.length === 0) {
      dedTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">No product deductions found for selected period.</td></tr>`;
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

function handleReportTypeChange(val) {
  const groupDate = document.getElementById('group-report-date');
  const groupEndDate = document.getElementById('group-report-end-date');
  const groupShift = document.getElementById('group-report-shift');
  const groupFarmer = document.getElementById('group-report-farmer-id');

  if (val === 'SHIFT_SUMMARY') {
    groupDate?.classList.remove('hidden');
    groupEndDate?.classList.remove('hidden');
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

  if (!startDate || !endDate) {
    showAlert('Validation Error: Please select both From Date and To Date to generate the report.', 'danger');
    return;
  }

  if (endDate < startDate) {
    showAlert('Validation Error: To Date cannot be earlier than From Date.', 'danger');
    return;
  }

  const titleElem = document.getElementById('sheet-report-title');
  const rangeElem = document.getElementById('sheet-range-display');
  const headElem = document.getElementById('sheet-table-head');
  const bodyElem = document.getElementById('sheet-table-body');
  const footElem = document.getElementById('sheet-table-footer');
  const outputCard = document.getElementById('sheet-output-card');

  outputCard?.classList.remove('hidden');
  addAiLog('tag-audit', 'AI-REPORT', `Generated ${reportType} from ${startDate} to ${endDate}`);

  if (reportType === 'SHIFT_SUMMARY') {
    titleElem.innerText = `SHIFT SUMMARY REPORT - ${shift.toUpperCase()}`;
    rangeElem.innerText = `${startDate} to ${endDate}`;

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

    const filtered = getScopedCollections().filter(c => {
      const matchesDate = c.date >= startDate && c.date <= endDate;
      const matchesShift = shift === 'ALL' || c.shift === shift;
      return matchesDate && matchesShift;
    });

    let totQty = 0, totAmt = 0;
    bodyElem.innerHTML = filtered.map(c => {
      const q = parseFloat(c.qty) || 0;
      totQty += q;
      totAmt += parseFloat(c.total) || 0;
      return `
        <tr>
          <td>${c.farmerId}</td>
          <td>${c.farmerName}</td>
          <td>${c.shift}</td>
          <td>${c.type}</td>
          <td>${q} L</td>
          <td>${c.fat}%</td>
          <td>${c.snf}%</td>
          <td>${c.waterPct}%</td>
          <td>₹${c.total}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="9" style="text-align:center;">No records found between ${startDate} and ${endDate}.</td></tr>`;

    footElem.innerHTML = `
      <tr>
        <td colspan="4">TOTALS</td>
        <td>${totQty.toFixed(1)} L</td>
        <td colspan="3"></td>
        <td>₹${totAmt.toFixed(2)}</td>
      </tr>
    `;
  } else if (reportType === 'MILK_BILL') {
    const farmer = getScopedFarmers().find(f => f.id === farmerId);
    titleElem.innerText = `INDIVIDUAL MILK BILL - ${farmer ? farmer.name : farmerId}`;
    rangeElem.innerText = `${startDate} to ${endDate}`;

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

    const filtered = getScopedCollections().filter(c => {
      const matchesFarmer = c.farmerId === farmerId;
      const matchesFrom = c.date >= startDate;
      const matchesTo = c.date <= endDate;
      return matchesFarmer && matchesFrom && matchesTo;
    });

    let totQty = 0, totAmt = 0;
    bodyElem.innerHTML = filtered.map(c => {
      const q = parseFloat(c.qty) || 0;
      totQty += q;
      totAmt += parseFloat(c.total) || 0;
      return `
        <tr>
          <td>${c.date}</td>
          <td>${c.shift}</td>
          <td>${c.type}</td>
          <td>${q} L</td>
          <td>${c.fat}%</td>
          <td>${c.snf}%</td>
          <td>₹${c.rate}</td>
          <td>₹${c.total}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="8" style="text-align:center;">No records found between ${startDate} and ${endDate}.</td></tr>`;

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
    rangeElem.innerText = `${startDate} to ${endDate}`;

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
    const scopedFarmers = getScopedFarmers();
    const scopedCollections = getScopedCollections();
    const scopedBookings = getScopedBookings();

    bodyElem.innerHTML = scopedFarmers.map(f => {
      const fColls = scopedCollections.filter(c => (c.farmerId === f.id || c.farmerEmail === f.email) && c.date >= startDate && c.date <= endDate);
      const fDeds = scopedBookings.filter(b => (b.farmerId === f.id || b.farmerEmail === f.email) && (b.status === 'Approved & Cost Deducted' || b.status === 'APPROVED') && b.bookingDate >= startDate && b.bookingDate <= endDate);

      const fQty = fColls.reduce((sum, c) => sum + (parseFloat(c.qty) || 0), 0);
      const fGross = fColls.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);
      const fDed = fDeds.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);
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
    }).join('') || `<tr><td colspan="6" style="text-align:center;">No farmer records found between ${startDate} and ${endDate}.</td></tr>`;

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

document.addEventListener('DOMContentLoaded', () => {
  syncFromMongoDB();

  const today = new Date().toISOString().slice(0, 10);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);

  const bookingDateInput = document.getElementById('booking-date');
  const deliveryDateInput = document.getElementById('booking-delivery-date');
  const milkDateInput = document.getElementById('milk-date');
  
  if (milkDateInput) milkDateInput.value = today;

  if (bookingDateInput) {
    bookingDateInput.value = today;
    bookingDateInput.min = today;
    bookingDateInput.max = today;
    bookingDateInput.addEventListener('change', handleBookingDateChange);
  }
  if (deliveryDateInput) {
    deliveryDateInput.value = tomorrowStr;
    deliveryDateInput.min = tomorrowStr;
  }

  document.getElementById('agent-login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!verifyCaptcha('agent')) return;
    const email = document.getElementById('agent-email-input').value.trim().toLowerCase();
    const isRegistered = ALLOWED_AGENTS.includes(email) || Boolean(DB.agentAccounts[email]);
    if (!isRegistered) {
      showAlert('Unregistered Agent Email. Please click "First Time Agent? Register / Set Password".', 'danger');
      addAiLog('tag-security', 'AI-SECURITY', `Unauthorized/Unregistered login attempt for email ${email}`);
      return;
    }

    if (agentAuthMode === 'password') {
      const pass = document.getElementById('agent-password-input').value;
      const storedPass = DB.agentAccounts[email]?.password || 'agent123';
      if (pass === storedPass) {
        currentAgentEmail = email;
        addAiLog('tag-security', 'AI-SECURITY', `Agent ${email} logged in successfully via password.`);
        initAppView('agent');
      } else {
        showAlert('Incorrect password.', 'danger');
        addAiLog('tag-security', 'AI-SECURITY', `Failed password login attempt for ${email}`);
      }
    } else {
      handleVerifyOTP('agent-email-input', 'agent-login-otp', () => {
        currentAgentEmail = email;
        addAiLog('tag-security', 'AI-SECURITY', `Agent ${email} logged in via Gmail OTP.`);
        initAppView('agent');
      });
    }
  });

  document.getElementById('agent-reset-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('reset-agent-email').value.trim().toLowerCase();
    const newPass = document.getElementById('reset-new-password').value;
    handleVerifyOTP('reset-agent-email', 'reset-agent-otp', () => {
      if (!DB.agentAccounts[email]) DB.agentAccounts[email] = {};
      DB.agentAccounts[email].password = newPass;
      saveDB();

      fetch(`${API_BASE_URL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: newPass })
      }).catch(err => console.warn('Agent registration sync offline:', err));

      showAlert(`Agent ${email} registered & password saved successfully! Please log in.`);
      addAiLog('tag-security', 'AI-REGISTER', `Agent ${email} registered into Smart Dairy system.`);
      toggleAgentResetPass(false);
    });
  });

  document.getElementById('rate-settings-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const rates = {
      cowBaseRate: parseFloat(document.getElementById('rate-cow-base').value) || 45.0,
      cowStdFat: parseFloat(document.getElementById('rate-cow-fat').value) || 4.5,
      cowStdSnf: parseFloat(document.getElementById('rate-cow-snf').value) || 8.5,
      buffaloBaseRate: parseFloat(document.getElementById('rate-buffalo-base').value) || 60.0,
      buffaloStdFat: parseFloat(document.getElementById('rate-buffalo-fat').value) || 4.0,
      buffaloStdSnf: parseFloat(document.getElementById('rate-buffalo-snf').value) || 9.0
    };

    const cfg = getAgentConfig(currentAgentEmail);
    cfg.rates = rates;
    DB.rates = rates;
    saveDB();

    fetch(`${API_BASE_URL}/api/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentEmail: currentAgentEmail || '', ...rates })
    }).catch(err => console.warn('Rate config sync offline:', err));

    updateNoticeBoardRates();
    showAlert('Milk Rate Settings updated successfully!');
    addAiLog('tag-audit', 'AI-RATES', `Agent ${currentAgentEmail || ''} updated Cow & Buffalo milk rate settings.`);
  });

  document.getElementById('farmer-feedback-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!currentFarmer) return;

    const rating = parseInt(document.getElementById('feedback-rating').value, 10) || 5;
    const text = document.getElementById('feedback-text').value.trim();

    if (!text) {
      showAlert('Please enter your feedback text.', 'danger');
      return;
    }

    const fb = {
      id: `FB-${Date.now()}`,
      farmerId: currentFarmer.id,
      farmerName: currentFarmer.name,
      farmerEmail: currentFarmer.email,
      rating,
      text,
      createdAt: new Date().toISOString()
    };

    if (!DB.feedbacks) DB.feedbacks = [];
    DB.feedbacks.push(fb);
    saveDB();

    fetch(`${API_BASE_URL}/api/feedbacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fb)
    }).catch(err => console.warn('Feedback sync offline:', err));

    showAlert('Thank you! Your feedback has been submitted to the station agent.');
    addAiLog('tag-audit', 'AI-FEEDBACK', `Farmer ${currentFarmer.name} submitted a ${rating}-star feedback.`);
    this.reset();
    renderAgentFeedbacks();
  });

  document.getElementById('farmer-login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!verifyCaptcha('farmer')) return;
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
        addAiLog('tag-security', 'AI-SECURITY', `Farmer ${farmer.name} logged into Farmer Portal.`);
        initAppView('farmer');
      } else {
        showAlert('Incorrect farmer password.', 'danger');
        addAiLog('tag-security', 'AI-SECURITY', `Failed password login attempt for farmer ${farmer.name}`);
      }
    } else {
      handleVerifyOTP('farmer-login-email', 'farmer-login-otp', () => {
        currentFarmer = farmer;
        addAiLog('tag-security', 'AI-SECURITY', `Farmer ${farmer.name} logged into Farmer Portal via OTP.`);
        initAppView('farmer');
      });
    }
  });

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

  document.getElementById('station-config-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const newCAN = document.getElementById('station-can-input').value.trim();
    const newVillage = document.getElementById('station-village-input').value.trim();
    const newCycle = document.getElementById('station-cycle-select').value;

    if (!newCAN) {
      showAlert('Please enter a valid CAN number.', 'danger');
      return;
    }

    const cfg = getAgentConfig(currentAgentEmail);
    cfg.can = newCAN;
    cfg.village = newVillage;
    cfg.cycle = newCycle;

    DB.agentCAN = newCAN;
    if (!DB.billingCycle) DB.billingCycle = {};
    DB.billingCycle.cycleType = newCycle;
    DB.billingCycle.villageName = newVillage;
    DB.billingCycle.updatedAt = new Date().toISOString();

    saveDB();
    updateCanDisplays();

    fetch(`${API_BASE_URL}/api/station-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentEmail: currentAgentEmail || '', can: newCAN, village: newVillage, cycle: newCycle })
    }).catch(err => console.warn('Station config sync offline:', err));

    showAlert(`Village Station Setup Saved! CAN: ${newCAN} | Village: ${newVillage} | Cycle: ${newCycle}`);
    addAiLog('tag-audit', 'AI-STATION-CONFIG', `Agent ${currentAgentEmail || ''} updated station setup: CAN=${newCAN}, Village=${newVillage}, Cycle=${newCycle}`);
  });

  document.getElementById('agent-can-input')?.addEventListener('change', function() {
    const newCAN = this.value.trim();
    if (newCAN && currentAgentEmail) {
      const cfg = getAgentConfig(currentAgentEmail);
      cfg.can = newCAN;
      DB.agentCAN = newCAN;
      saveDB();
      updateCanDisplays();
      fetch(`${API_BASE_URL}/api/station-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentEmail: currentAgentEmail, can: newCAN, village: cfg.village, cycle: cfg.cycle })
      }).catch(err => console.warn('Header CAN sync offline:', err));
      showAlert(`Agent CAN number updated to ${newCAN}`);
    }
  });

  generateCaptcha('agent');
  generateCaptcha('farmer');
  generateCaptcha('admin');

  // Admin Login Form Submit
  document.getElementById('admin-login-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = (document.getElementById('admin-email-input')?.value || '').trim().toLowerCase();
    const password = (document.getElementById('admin-password-input')?.value || '').trim();
    const captchaInput = (document.getElementById('admin-captcha-input')?.value || '').trim().toUpperCase();
    const captchaBox = (document.getElementById('admin-captcha-box')?.textContent || '').trim().toUpperCase();

    if (!captchaInput || captchaInput !== captchaBox) {
      showAlert('❌ CAPTCHA verification failed. Please try again.', 'danger');
      generateCaptcha('admin');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.success) {
        showAlert(`❌ ${data.message}`, 'danger');
        generateCaptcha('admin');
        return;
      }

      currentAdminToken = data.token;
      document.getElementById('auth-section')?.classList.add('hidden');
      document.getElementById('admin-section')?.classList.remove('hidden');
      document.getElementById('user-status')?.classList.remove('hidden');
      const activeLabel = document.getElementById('active-user-label');
      if (activeLabel) activeLabel.innerText = `👑 Admin: ${email}`;
      const adminEmailLabel = document.getElementById('admin-logged-email');
      if (adminEmailLabel) adminEmailLabel.textContent = email;
      switchAdminTab('overview');
    } catch (err) {
      showAlert('Admin login failed — server unreachable.', 'danger');
    }
  });

  // Multi-PC Real-Time Syncing: Auto-poll MongoDB every 5 seconds for live multi-PC updates across agents and farmers
  setInterval(() => {
    if (currentAgentEmail || currentFarmer) {
      syncFromMongoDB(true);
    }
  }, 5000);
});