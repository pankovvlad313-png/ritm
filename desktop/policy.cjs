const allowed = new Set(['/index.html', '/app.js', '/planner.js', '/style.css', '/tour-model.js', '/tour.js', '/tour.css', '/updater-ui.js']);
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
function assetFor(url, method='GET') {
  try {
    const u = new URL(url);
    if (u.protocol !== 'ritm:' || u.host !== 'app' || u.username || u.password || !['GET','HEAD'].includes(method)) return null;
    const name = u.pathname === '/' ? '/index.html' : u.pathname;
    return allowed.has(name) ? name.slice(1) : null;
  } catch { return null; }
}
function internal(url) { try { const u = new URL(url); return u.protocol === 'ritm:' && u.host === 'app' && !u.username && !u.password; } catch { return false; } }
module.exports = {assetFor, internal, types, csp};
