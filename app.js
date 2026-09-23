/**
 * Smart Dairy - Global Cloud Collection & Reports System
 * app.js - Frontend Application Engine
 */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://all-labs.onrender.com';

let DB = JSON.parse(localStorage.getItem('SMART_DAIRY_GLOBAL_DB') || JSON.stringify({
  agentCAN: "10100",
  agentAccounts: {},
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

function saveDB() {
  localStorage.setItem('SMART_DAIRY_GLOBAL_DB', JSON.stringify(DB));
}

function calculateMilkRate(type, fat, snf) {
  const isCow = (type || '').toLowerCase().includes('cow');
  const r = DB.rates || { cowBaseRate: 45.0, cowStdFat: 4.5, cowStdSnf: 8.5, buffaloBaseRate: 60.0, buffaloStdFat: 4.0, buffaloStdSnf: 9.0 };

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

function showAlert(msg, type = 'success') {
  const el = document.getElementById('notification');
  if (!el) { alert(msg); return; }
  el.className = `alert alert-${type}`;
  el.innerText = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
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

async function syncFromMongoDB(isSilent = false) {
  try {
    const qEmail = currentAgentEmail ? `?agentEmail=${encodeURIComponent(currentAgentEmail)}` : '';
    const [farmersRes, collectionsRes, bookingsRes, deductionsRes, ratesRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/farmers${qEmail}`),
      fetch(`${API_BASE_URL}/api/collections${qEmail}`),
      fetch(`${API_BASE_URL}/api/bookings${qEmail}`),
      fetch(`${API_BASE_URL}/api/deductions${qEmail}`),
      fetch(`${API_BASE_URL}/api/rates${qEmail}`)
    ]);

    if (farmersRes.status === 'fulfilled' && farmersRes.value.ok) {
      const data = await farmersRes.value.json();
      if (data.farmers && Array.isArray(data.farmers)) DB.farmers = data.farmers;
    }
    if (collectionsRes.status === 'fulfilled' && collectionsRes.value.ok) {
      const data = await collectionsRes.value.json();
      if (data.collections && Array.isArray(data.collections)) DB.collections = data.collections;
    }
    if (bookingsRes.status === 'fulfilled' && bookingsRes.value.ok) {
      const data = await bookingsRes.value.json();
      if (data.bookings && Array.isArray(data.bookings)) DB.bookings = data.bookings;
    }
    if (deductionsRes.status === 'fulfilled' && deductionsRes.value.ok) {
      const data = await deductionsRes.value.json();
      if (data.deductions && Array.isArray(data.deductions)) DB.deductions = data.deductions;
    }
    if (ratesRes.status === 'fulfilled' && ratesRes.value.ok) {
      const data = await ratesRes.value.json();
      if (data.rates && data.rates.cowBaseRate) DB.rates = data.rates;
    }

    saveDB();
    renderFarmers();
    renderCollections();
    renderAgentBookings();
    updateDashboardMetrics();
    populateDropdowns();
  } catch (err) {
    if (!isSilent) console.warn('Sync Warning:', err.message);
  }
}

let currentCaptchas = { agent: '', farmer: '', admin: '' };
function generateCaptcha(role = 'agent') {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  currentCaptchas[role] = code;
  const box = document.getElementById(`${role}-captcha-box`);
  if (box) box.textContent = code;
}

function verifyCaptcha(role = 'agent') {
  const input = document.getElementById(`${role}-captcha-input`);
  if (!input) return true;
  const val = input.value.trim().toUpperCase();
  if (!val || val !== currentCaptchas[role]) {
    showAlert('Invalid Security CAPTCHA code!', 'danger');
    generateCaptcha(role);
    input.value = '';
    input.focus();
    return false;
  }
  return true;
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');
  
  if (tabId === 'farmers') renderFarmers();
  else if (tabId === 'collection') { renderCollections(); populateDropdowns(); }
  else if (tabId === 'bookings') renderAgentBookings();
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

function initAppView(role) {
  document.getElementById('auth-section')?.classList.add('hidden');
  document.getElementById('user-status')?.classList.remove('hidden');
  
  if (role === 'agent') {
    document.getElementById('app-section')?.classList.remove('hidden');
    document.getElementById('sidebar')?.classList.remove('hidden');
    document.getElementById('farmer-portal-section')?.classList.add('hidden');
    document.getElementById('active-user-label').innerText = `Agent: ${currentAgentEmail}`;
    syncFromMongoDB();
    updateDashboardMetrics();
    renderFarmers();
    renderAgentBookings();
  } else {
    document.getElementById('app-section')?.classList.add('hidden');
    document.getElementById('sidebar')?.classList.add('hidden');
    document.getElementById('farmer-portal-section')?.classList.remove('hidden');
    if (!currentFarmer) {
      const scoped = getScopedFarmers();
      currentFarmer = scoped.length > 0 ? scoped[0] : { id: 'FARM-101', name: 'Farmer', email: '' };
    }
    document.getElementById('active-user-label').innerText = `Farmer: ${currentFarmer.name}`;
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

// ================= ADMIN MODULE =================
let currentAdminToken = null;

function adminLogout() {
  currentAdminToken = null;
  document.getElementById('auth-section')?.classList.remove('hidden');
  document.getElementById('admin-section')?.classList.add('hidden');
  document.getElementById('user-status')?.classList.add('hidden');
  document.getElementById('sidebar')?.classList.add('hidden');
  switchLoginRole('agent');
}

document.addEventListener('DOMContentLoaded', () => {
  generateCaptcha('agent');
  generateCaptcha('farmer');
  generateCaptcha('admin');

  // Agent Login Handling with Strict Backend Check
  document.getElementById('agent-login-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!verifyCaptcha('agent')) return;
    const email = document.getElementById('agent-email-input').value.trim().toLowerCase();
    const pass = document.getElementById('agent-password-input').value.trim();

    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (data.success) {
        currentAgentEmail = email;
        initAppView('agent');
      } else {
        showAlert(data.message || 'Access Denied: You are not registered as an agent.', 'danger');
      }
    } catch (err) {
      showAlert('Server connection error. Please verify network status.', 'danger');
    }
  });

  // Farmer Login Handling: Restricted strictly to farmers registered under an active agent
  document.getElementById('farmer-login-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!verifyCaptcha('farmer')) return;
    const email = document.getElementById('farmer-login-email').value.trim().toLowerCase();
    const pass = document.getElementById('farmer-password-input').value.trim();

    await syncFromMongoDB(true);
    const farmer = (DB.farmers || []).find(f => f.email.toLowerCase() === email);

    if (!farmer) {
      showAlert('Access Denied: No farmer record found registered with this Gmail address.', 'danger');
      return;
    }

    if (pass === (farmer.password || 'farmer123')) {
      currentFarmer = farmer;
      initAppView('farmer');
    } else {
      showAlert('Incorrect password for this farmer account.', 'danger');
    }
  });

  document.getElementById('admin-login-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = (document.getElementById('admin-email-input')?.value || '').trim().toLowerCase();
    const password = (document.getElementById('admin-password-input')?.value || '').trim();
    if (!verifyCaptcha('admin')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.success) { showAlert(data.message || 'Invalid admin credentials.', 'danger'); return; }

      currentAdminToken = data.token;
      document.getElementById('auth-section')?.classList.add('hidden');
      document.getElementById('admin-section')?.classList.remove('hidden');
      document.getElementById('user-status')?.classList.remove('hidden');
      document.getElementById('active-user-label').innerText = `👑 Admin: ${email}`;
    } catch (err) {
      showAlert('Admin login failed — server unreachable.', 'danger');
    }
  });
});
