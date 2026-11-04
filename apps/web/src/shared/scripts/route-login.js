/*
 * Login logic for the dedicated login routes (/login/, /doctor/login/, /hospital/login/).
 * Talks to the Express API, stores the access token where portal-guard.js expects it,
 * and opens the dashboard returned by the API.
 */
(() => {
  const api = window.SWASTHSETU_API_URL || 'http://127.0.0.1:3000/api/v1';
  const TOKEN_KEY = 'swasthsetu_access_token';
  const form = document.querySelector('[data-login]');
  if (!form) return;
  const portal = form.dataset.login; // "patient" | "doctor" | "hospital"
  const message = document.querySelector('#loginMessage');
  const submit = form.querySelector('button[type="submit"]');

  const show = (text, tone = 'error') => {
    message.textContent = text;
    message.className = `login-message ${tone}`;
    message.hidden = !text;
  };

  async function post(path, body) {
    const response = await fetch(`${api}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(data.message) ? data.message.join(' ') : data.message;
      throw new Error(detail || 'Request failed. Please try again.');
    }
    return data;
  }

  function decodeRole(token) {
    try {
      return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role;
    } catch (_) {
      return null;
    }
  }

  function finish(result) {
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    const target = result.redirectTo.endsWith('/') ? result.redirectTo : `${result.redirectTo}/`;
    window.location.assign(target);
  }

  async function withBusy(task) {
    submit.disabled = true;
    try { await task(); } catch (error) { show(error.message); } finally { submit.disabled = false; }
  }

  if (portal === 'doctor' || portal === 'hospital') {
    form.addEventListener('submit', event => {
      event.preventDefault();
      show('');
      withBusy(async () => {
        const result = await post('/auth/staff/login', {
          employeeId: form.elements.employeeId.value.trim(),
          password: form.elements.password.value,
        });
        const role = decodeRole(result.accessToken);
        const allowed = portal === 'doctor' ? role === 'DOCTOR' : ['HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(role);
        if (!allowed) {
          const other = role === 'DOCTOR' ? '<a href="/doctor/login/">Doctor Portal</a>' : '<a href="/hospital/login/">Hospital Portal</a>';
          message.innerHTML = `This account cannot open the ${portal === 'doctor' ? 'Doctor' : 'Hospital'} Portal. Please use the ${other}.`;
          message.className = 'login-message error';
          message.hidden = false;
          return;
        }
        finish(result);
      });
    });
    return;
  }

  // Patient: mobile number -> OTP -> (registration for new patients) -> dashboard.
  let step = 'mobile';
  const otpStep = document.querySelector('#otpStep');
  const registerStep = document.querySelector('#registerStep');
  const mobileInput = form.elements.mobileNumber;

  const setStep = next => {
    step = next;
    otpStep.hidden = next !== 'otp';
    registerStep.hidden = next !== 'register';
    form.elements.otp.required = next === 'otp';
    registerStep.querySelectorAll('[data-required]').forEach(input => { input.required = next === 'register'; });
    mobileInput.readOnly = next !== 'mobile';
    submit.textContent = { mobile: 'Send OTP', otp: 'Verify OTP and continue', register: 'Create account and continue' }[next];
  };

  document.querySelector('#changeNumber').addEventListener('click', () => { show(''); form.elements.otp.value = ''; setStep('mobile'); mobileInput.focus(); });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const mobileNumber = mobileInput.value.trim();
    withBusy(async () => {
      if (step === 'mobile') {
        const result = await post('/auth/patient/send-otp', { mobileNumber });
        setStep('otp');
        show(result.demoOtp ? `Development OTP: ${result.demoOtp}` : 'OTP sent to your mobile number.', 'info');
        form.elements.otp.focus();
        return;
      }
      if (step === 'otp') {
        const result = await post('/auth/patient/verify-otp', { mobileNumber, otp: form.elements.otp.value.trim() });
        if (result.registrationRequired) {
          setStep('register');
          show('Mobile number verified. Complete your profile to create your patient account.', 'info');
          form.elements.fullName.focus();
          return;
        }
        finish(result);
        return;
      }
      const body = {
        mobileNumber,
        fullName: form.elements.fullName.value.trim(),
        dateOfBirth: form.elements.dateOfBirth.value,
        gender: form.elements.gender.value,
        address: form.elements.address.value.trim(),
        emergencyContact: form.elements.emergencyContact.value.trim(),
      };
      const bloodGroup = form.elements.bloodGroup.value.trim();
      if (bloodGroup) body.bloodGroup = bloodGroup;
      finish(await post('/auth/patient/register', body));
    });
  });

  setStep('mobile');
})();
