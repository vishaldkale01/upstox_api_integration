const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', 'public');
let active = false;
let starts = 0;
let stops = 0;
const server = http.createServer((req, res) => {
  console.log('request', req.method, req.url);
  if (req.url === '/control-panel/config') {
    return reply(res, { strategy_version: 'strategy-v2026.10.15', defaults: { capital: 100000, lots: 1, target_symbol: 'NSE_INDEX|Nifty Bank', risk_per_trade: 0.02, max_daily_loss: 0.05, RECORDER_OUTPUT_PATH: 'data/market_data' }, risk_engine: { enabled: true, max_risk_per_trade: 0.02, max_daily_loss: 0.05 }, frozen_strategy: { setups: ['MOMENTUM_ENTRY'] } });
  }
  if (req.url === '/trading-status/DEV0') return reply(res, { active, session_id: active ? 'session-test' : null, strategy_version: 'strategy-v2026.10.15', mode: 'PAPER', symbol: 'NSE_INDEX|Nifty Bank', risk: { pnl: 0, locked: false }, telemetry: { ticks: 3, candles: 1, evaluations: 1, last_tick_at: '2026-10-18T09:20:00+05:30' }, recorder: { state: 'READY' } });
  if (req.url.startsWith('/paper-signals?')) return reply(res, { success: true, data: [{ _id: 'signal-test', timestamp: '2026-10-18T09:20:00Z', session_id: 'session-test', opportunity_id: 'opp-test', signal_data: { setup: 'EMA_RETEST', signal: 'BUY_CALL', decision: 'SIGNAL_GENERATED', confidence: 7 }, analysis: { score_components: { final: 7 } } }] });
  if (req.url.startsWith('/paper-signals/signal-test?')) return reply(res, { success: true, data: { _id: 'signal-test', signal_id: 'signal-test', session_id: 'session-test', strategy_version: 'strategy-v2026.10.15', opportunity_id: 'opp-test', signal_data: { setup: 'EMA_RETEST', signal: 'BUY_CALL', decision: 'SIGNAL_GENERATED', confidence: 7 }, analysis: { score_components: { final: 7 }, decision: 'SIGNAL_GENERATED' }, candle: { close: 100 } } });
  if (req.url === '/start-trading') { starts += 1; active = true; return reply(res, { ok: true }); }
  if (req.url === '/stop-trading') { stops += 1; active = false; return reply(res, { ok: true }); }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname === '/' ? 'trading-dashboard.html' : pathname.slice(1);
  const full = path.join(root, file);
  if (!full.startsWith(root) || !fs.existsSync(full)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': full.endsWith('.css') ? 'text/css' : full.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(fs.readFileSync(full));
});
function reply(res, value) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); }

(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage();
  page.on('console', (message) => console.log('browser:', message.type(), message.text()));
  page.on('pageerror', (error) => console.log('pageerror:', error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/trading-dashboard.html?user_id=DEV0&access_token=test-token`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('loaded');
  await page.waitForFunction(() => document.querySelector('#strategyVersion')?.textContent === 'strategy-v2026.10.15', null, { timeout: 5000 });
  console.log('config loaded');
  for (const label of ['overview', 'configuration', 'sessions', 'trades']) await page.locator(`[data-page="${label}"]`).waitFor();
  await page.locator('[data-page="configuration"]').click(); console.log('configuration');
  if (!(await page.locator('details.advanced').count())) throw new Error('advanced configuration missing');
  if (!(await page.getByText('Risk engine', { exact: false }).count())) throw new Error('risk settings missing');
  await page.locator('[data-page="sessions"]').click(); console.log('sessions');
  await page.getByText('Session history unavailable', { exact: true }).waitFor();
  await page.locator('[data-page="trades"]').click(); console.log('trades');
  await page.getByText('Trade history unavailable', { exact: true }).waitFor();
  await page.locator('[data-page="signals"]').click();
  await page.locator('.signal-detail').click();
  await page.getByRole('dialog').getByRole('heading', { name: 'EMA_RETEST', exact: true }).waitFor();
  await page.locator('#closeSignalDialog').click();
  await page.locator('[data-page="overview"]').click();
  await page.locator('#configureBtn').click();
  await page.locator('#startBtn').waitFor();
  await page.locator('#startBtn').click();
  await page.getByRole('dialog').getByText('Start paper session?', { exact: true }).waitFor();
  await page.getByRole('dialog').getByText('Confirm', { exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#sessionState')?.textContent === 'Running');
  await page.getByText('Stop session', { exact: true }).click();
  await page.getByRole('dialog').getByText('Confirm', { exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#sessionState')?.textContent === 'Stopped');
  if (starts !== 1 || stops !== 1) throw new Error(`unexpected API calls: starts=${starts}, stops=${stops}`);
  console.log('dashboard browser smoke: PASS');
  await browser.close(); server.close();
})().catch((error) => { console.error(error.stack || error); server.close(); process.exitCode = 1; });
