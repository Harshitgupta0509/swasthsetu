const hospitals = [
  { name: "Safdarjung Hospital", location: "Ring Road, New Delhi", opd: "08:00 AM - 01:00 PM", queue: "Moderate", department: "General Medicine" },
  { name: "Lok Nayak Hospital", location: "Jawaharlal Nehru Marg, New Delhi", opd: "08:30 AM - 02:00 PM", queue: "Open", department: "Cardiology" },
  { name: "Dr. RML Hospital", location: "Baba Kharak Singh Marg, New Delhi", opd: "09:00 AM - 01:30 PM", queue: "Busy", department: "Orthopaedics" }
];

const availability = {
  blood: [
    ["Safdarjung Hospital", "Blood bank", "A+", "24 units", "Available"],
    ["Lok Nayak Hospital", "Blood bank", "O+", "18 units", "Available"],
    ["Dr. RML Hospital", "Blood bank", "B−", "03 units", "Low stock"]
  ],
  beds: [
    ["Safdarjung Hospital", "General ward", "General", "42 beds", "Available"],
    ["Lok Nayak Hospital", "Emergency ward", "Emergency", "11 beds", "Available"],
    ["Dr. RML Hospital", "ICU", "ICU", "02 beds", "Low stock"]
  ]
};

const grid = document.querySelector('#hospitalGrid');
const dialog = document.querySelector('#appointmentDialog');
let activeHospital = hospitals[0];

function displayHospitals(city = 'New Delhi') {
  const cityName = city.trim() || 'your area';
  document.querySelector('#resultsTitle').textContent = `Hospitals in ${cityName}`;
  document.querySelector('#resultCount').textContent = `${hospitals.length} verified government hospitals found`;
  grid.innerHTML = hospitals.map((hospital, index) => `<article class="hospital-card"><div class="hospital-card-top"><span class="hospital-type">GOVERNMENT HOSPITAL</span></div><div class="hospital-card-body"><h3>${hospital.name}</h3><p class="location">⌖ ${hospital.location}</p><div class="hospital-meta"><span>OPD: ${hospital.opd}</span><span class="status ${hospital.queue === 'Open' ? 'open' : 'busy'}">● ${hospital.queue}</span></div><button type="button" class="book-button" data-index="${index}">Book OPD appointment →</button></div></article>`).join('');
  document.querySelectorAll('.book-button').forEach(button => button.addEventListener('click', () => openBooking(hospitals[button.dataset.index])));
}

function renderAvailability(tab = 'blood') {
  document.querySelector('#availabilityList').innerHTML = availability[tab].map(row => `<div class="availability-row"><div><b>${row[0]}</b><small>${row[1]}</small></div><span class="availability-pill ${row[4] === 'Low stock' ? 'low' : ''}">${row[4]}</span><div class="availability-number"><small>${row[2]}</small><strong>${row[3]}</strong></div></div>`).join('');
}

function openBooking(hospital) {
  activeHospital = hospital;
  document.querySelector('#selectedHospital').textContent = `${hospital.name} · ${hospital.department} OPD`;
  document.querySelector('#appointmentForm').hidden = false;
  document.querySelector('#bookingConfirmation').hidden = true;
  dialog.showModal();
}

displayHospitals();
renderAvailability();

document.querySelector('#hospitalForm').addEventListener('submit', event => { event.preventDefault(); displayHospitals(document.querySelector('#city').value); document.querySelector('#find-hospital').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
document.querySelector('#locationButton').addEventListener('click', () => { document.querySelector('#city').value = 'New Delhi'; showToast('Location selected: New Delhi'); });
document.querySelector('#filterButton').addEventListener('click', () => showToast('Filters are available in the full portal.'));
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(item => item.classList.remove('active')); tab.classList.add('active'); renderAvailability(tab.dataset.tab); }));
document.querySelector('#queueForm').addEventListener('submit', event => { event.preventDefault(); const id = document.querySelector('#appointmentId').value.trim(); document.querySelector('#queueResult').textContent = id ? `Queue status for ${id}: 7 patients ahead · approx. 24 min wait.` : 'Enter your appointment ID to continue.'; });
document.querySelector('#appointmentForm').addEventListener('submit', event => { event.preventDefault(); document.querySelector('#appointmentForm').hidden = true; const id = `SS-${String(Date.now()).slice(-8)}`; document.querySelector('#bookingId').textContent = id; document.querySelector('#bookingConfirmation').hidden = false; });
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
const apiBaseUrl = window.SWASTHSETU_API_URL || 'http://127.0.0.1:3000/api/v1';
const authDialogs = { patient: document.querySelector('#patientLoginDialog'), staff: document.querySelector('#staffLoginDialog') };
function openAuth(name) { Object.values(authDialogs).forEach(item => { if (item.open) item.close(); }); authDialogs[name].showModal(); }
async function authRequest(path, body) { const response = await fetch(`${apiBaseUrl}${path}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || 'Authentication request failed.'); return result; }
function launchPortalFromRedirect(redirectTo) { const role = redirectTo.includes('/doctor/') ? 'doctor' : redirectTo.includes('/hospital/') ? 'hospital' : 'patient'; const destinations = { patient: 'patient/dashboard/', doctor: 'doctor/dashboard/', hospital: 'hospital/dashboard/' }; const names = { patient: 'SwasthSetuPatientPortal', doctor: 'SwasthSetuDoctorPortal', hospital: 'SwasthSetuHospitalPortal' }; const portal = window.open(destinations[role], names[role], 'popup=yes,width=1440,height=900,resizable=yes,scrollbars=yes'); if (!portal) throw new Error('Please allow pop-ups to open your portal window.'); portal.focus(); Object.values(authDialogs).forEach(item => { if (item.open) item.close(); }); }
function completePortalLogin(result) { localStorage.setItem('swasthsetu_access_token', result.accessToken); launchPortalFromRedirect(result.redirectTo); showToast('Your portal is open in its dedicated window.'); }
document.querySelector('#patientLoginButton').addEventListener('click', () => openAuth('patient'));
document.querySelector('#staffLoginButton').addEventListener('click', () => openAuth('staff'));
document.querySelectorAll('.close-auth').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelector('#sendPatientOtpButton').addEventListener('click', async () => { const mobileNumber = document.querySelector('#patientMobile').value.trim(); if (!/^\d{10}$/.test(mobileNumber)) { showToast('Enter a valid 10-digit mobile number.'); return; } try { const result = await authRequest('/auth/patient/send-otp', { mobileNumber }); document.querySelector('#patientOtpFields').hidden = false; document.querySelector('#demoOtpMessage').textContent = result.demoOtp ? `Development OTP: ${result.demoOtp}` : 'OTP sent to your registered mobile number.'; showToast('OTP sent.'); } catch (error) { showToast(error.message); } });
document.querySelector('#patientLoginForm').addEventListener('submit', async event => { event.preventDefault(); const mobileNumber = document.querySelector('#patientMobile').value.trim(); const otp = document.querySelector('#patientOtp').value.trim(); try { const result = await authRequest('/auth/patient/verify-otp', { mobileNumber, otp }); if (result.registrationRequired) { document.querySelector('#patientRegistrationFields').hidden = false; document.querySelector('#patientLoginForm').hidden = true; return; } completePortalLogin(result); } catch (error) { showToast(error.message); } });
document.querySelector('#completeRegistrationButton').addEventListener('click', async () => { const mobileNumber = document.querySelector('#patientMobile').value.trim(); const payload = { mobileNumber, fullName: document.querySelector('#registerName').value.trim(), dateOfBirth: document.querySelector('#registerDob').value, gender: document.querySelector('#registerGender').value, address: document.querySelector('#registerAddress').value.trim(), bloodGroup: document.querySelector('#registerBloodGroup').value.trim() || undefined, emergencyContact: document.querySelector('#registerEmergencyContact').value.trim() }; try { const result = await authRequest('/auth/patient/register', payload); completePortalLogin(result); } catch (error) { showToast(error.message); } });
document.querySelector('#staffLoginForm').addEventListener('submit', async event => { event.preventDefault(); try { const result = await authRequest('/auth/staff/login', { employeeId: document.querySelector('#staffEmployeeId').value.trim(), password: document.querySelector('#staffPassword').value }); if (result.forcePasswordChange) { showToast('You must change your temporary password before continuing.'); return; } completePortalLogin(result); } catch (error) { showToast(error.message); } });document.querySelector('#menuButton').addEventListener('click', event => { const nav = document.querySelector('#mainNav'); nav.classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', nav.classList.contains('open')); });
document.querySelectorAll('#mainNav a').forEach(link => link.addEventListener('click', () => document.querySelector('#mainNav').classList.remove('open')));
let size = 16;
document.querySelector('#fontUp').addEventListener('click', () => { size = Math.min(size + 1, 20); document.documentElement.style.fontSize = `${size}px`; });
document.querySelector('#fontDown').addEventListener('click', () => { size = Math.max(size - 1, 14); document.documentElement.style.fontSize = `${size}px`; });
document.querySelector('#fontReset').addEventListener('click', () => { size = 16; document.documentElement.style.fontSize = '16px'; });
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000); }
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); document.querySelector('#appointmentDate').min = tomorrow.toISOString().split('T')[0];
