const http = require('http');
const fs = require('fs');
const path = require('path');

const repositoryRoot = path.resolve(__dirname, '..');
const webRoot = path.join(repositoryRoot, 'apps', 'web');
const port = Number(process.env.FRONTEND_PORT || process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

// Keep browser URLs stable while serving portal source files from their modules.
const routes = new Map([
  ['/', 'public/index.html'],
  ['/index.html', 'public/index.html'],
  ['/login/', 'public/login/index.html'],
  ['/staff-login/', 'public/staff-login/index.html'],
  ['/doctor/login/', 'public/doctor/login/index.html'],
  ['/hospital/login/', 'public/hospital/login/index.html'],
  ['/patient/dashboard/', 'src/patient-portal/pages/dashboard.html'],
  ['/doctor/dashboard/', 'src/doctor-portal/pages/dashboard.html'],
  ['/hospital/dashboard/', 'src/hospital-portal/pages/dashboard.html'],
  ['/app.html', 'src/shared/components/legacy-app-shell.html'],
  ['/doctor-portal.html', 'src/doctor-portal/pages/legacy.html'],
  ['/login.html', 'public/legacy/login.html'],
  ['/patient-login.html', 'public/legacy/patient-login.html'],
  ['/doctor-login.html', 'public/legacy/doctor-login.html'],
  ['/hospital-login.html', 'public/legacy/hospital-login.html'],
]);

function resolveRequest(pathname) {
  if (routes.has(pathname)) return path.join(webRoot, routes.get(pathname));
  if (!pathname.endsWith('/') && routes.has(`${pathname}/`)) return path.join(webRoot, routes.get(`${pathname}/`));
  if (pathname.startsWith('/assets/')) {
    const assetPath = pathname.slice('/assets/'.length);
    const candidate = path.resolve(webRoot, 'src', assetPath);
    if (candidate.startsWith(path.join(webRoot, 'src') + path.sep)) return candidate;
  }
  return null;
}

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  if (pathname === '/runtime-config.js') {
    const apiUrl = process.env.SWASTHSETU_API_URL || 'http://127.0.0.1:3000/api/v1';
    response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    return response.end(`window.SWASTHSETU_API_URL = ${JSON.stringify(apiUrl)};`);
  }
  const filePath = resolveRequest(pathname);
  if (!filePath) {
    response.writeHead(404);
    return response.end('Not found');
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      return response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
    }
    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(data);
  });
}).listen(port, process.env.HOST || '0.0.0.0', () => console.log(`SwasthSetu frontend running on port ${port}`));