(() => {
  const path = window.location.pathname.replaceAll('\\', '/');
  const mode = document.body.dataset.mode || new URLSearchParams(window.location.search).get('mode');
  const requiredRole = path.includes('/doctor/') || path.endsWith('/doctor-portal.html') ? 'DOCTOR' : path.includes('/hospital/') || mode === 'hospital' ? 'HOSPITAL_ADMIN' : path.includes('/patient/') || mode === 'patient' ? 'PATIENT' : null;
  if (!requiredRole) return;
  const routes = { PATIENT: '/login/', DOCTOR: '/staff-login/', HOSPITAL_ADMIN: '/staff-login/' };
  const redirect = () => window.location.replace(routes[requiredRole]);
  const token = localStorage.getItem('swasthsetu_access_token');
  if (!token) return redirect();
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 <= Date.now()) { localStorage.removeItem('swasthsetu_access_token'); return redirect(); }
    if (requiredRole === 'HOSPITAL_ADMIN' ? !['HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(payload.role) : payload.role !== requiredRole) return redirect();
  } catch (_) { localStorage.removeItem('swasthsetu_access_token'); redirect(); }
})();