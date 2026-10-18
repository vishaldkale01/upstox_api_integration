(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { user: null, config: {}, status: null, pendingAction: null };
  const api = (path, options) => fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {}));
  function applyTheme(theme) { const selected = ['blue', 'dark', 'black'].includes(theme) ? theme : 'light'; document.body.classList.remove('theme-blue', 'theme-dark', 'theme-black'); if (selected !== 'light') document.body.classList.add(`theme-${selected}`); const picker = $('themeSelect'); if (picker) picker.value = selected; localStorage.setItem('dashboardTheme', selected); }

  function readUser() {
    const query = new URLSearchParams(location.search);
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem('userSession') || '{}'); } catch (_) {}
    state.user = {
      id: query.get('user_id') || saved.user_id || saved.userId || 'DEV0',
      name: saved.name || saved.user_name || 'Trading account',
      token: query.get('access_token') || saved.access_token || saved.accessToken || ''
    };
    $('userName').firstChild.textContent = state.user.name;
    $('userId').textContent = state.user.id;
  }

  function setText(id, value) { const node = $(id); if (node) node.textContent = value == null || value === '' ? 'Unavailable' : String(value); }
  function pct(value) { return value == null ? 'Unavailable' : `${(Number(value) * 100).toFixed(1)}%`; }
  function showMessage(text, kind) { const node = $('message'); node.textContent = text || ''; node.className = `message ${kind || ''}`; }

  function applyDefaults(defaults) {
    Object.entries(defaults || {}).forEach(([key, value]) => {
      const map = { capital: 'capital', lots: 'lots', target_symbol: 'targetSymbol', risk_per_trade: 'riskPerTrade', max_daily_loss: 'maxDailyLoss', sl_cooldown_minutes: 'slCooldown', direction_flip_cooldown_minutes: 'flipCooldown', post_exit_cooldown_minutes: 'exitCooldown', ENABLE_DYNAMIC_COOLDOWN: 'dynamicCooldown', USE_AI_VALIDATION: 'aiValidation', ENABLE_DEPTH_GATING: 'depthGating', REQUIRE_DEPTH_TO_ENTER: 'requireDepth', ENABLE_OFI_DEPTH_GATING: 'ofiGating', ENABLE_L2_DUAL_GUARD: 'l2Guard', MIN_DEPTH_QTY: 'minDepth', MAX_SPREAD_WIDTH: 'maxSpread', MAX_DEPTH_IMBALANCE_RATIO: 'maxImbalance', MAX_L2_SPREAD: 'maxL2Spread', MIN_L2_BID_IMBALANCE: 'minBidImbalance', ENABLE_MARKET_DATA_RECORDER: 'recorderEnabled', DEBUG_MODE: 'debugMode', RECORDER_OUTPUT_PATH: 'recorderPath', RECORDER_BUFFER_SIZE: 'bufferSize', RECORDER_FLUSH_BATCH_SIZE: 'flushBatch', RECORDER_FLUSH_INTERVAL_SEC: 'flushInterval', RECORDER_MIN_DISK_FREE_GB: 'minDisk', RECORDER_MAX_RECOVERY_ATTEMPTS: 'recoveryAttempts', WATCHDOG_INTERVAL_SEC: 'watchdogInterval', TICK_GAP_THRESHOLD_SEC: 'tickGap', EVAL_GAP_THRESHOLD_SEC: 'evalGap' };
      const id = map[key] || key; const node = $(id); if (!node || document.activeElement === node) return;
      if (node.type === 'checkbox') node.checked = Boolean(value); else if (key === 'risk_per_trade' || key === 'max_daily_loss') node.value = Number(value) * 100; else node.value = value;
    });
  }

  function collectForm() {
    const value = (id) => $(id)?.value;
    const checked = (id) => Boolean($(id)?.checked);
    return { user_id: state.user.id, access_token: state.user.token, capital: Number(value('capital')), trade_mode: 'PAPER', target_symbol: value('targetSymbol'), lots: Number(value('lots')), risk_per_trade: Number(value('riskPerTrade')) / 100, max_daily_loss: Number(value('maxDailyLoss')) / 100, sl_cooldown_minutes: Number(value('slCooldown')), direction_flip_cooldown_minutes: Number(value('flipCooldown')), post_exit_cooldown_minutes: Number(value('exitCooldown')), ENABLE_DYNAMIC_COOLDOWN: checked('dynamicCooldown'), USE_AI_VALIDATION: checked('aiValidation'), DEBUG_MODE: checked('debugMode'), ENABLE_DEPTH_GATING: checked('depthGating'), REQUIRE_DEPTH_TO_ENTER: checked('requireDepth'), MIN_DEPTH_QTY: Number(value('minDepth')), MAX_SPREAD_WIDTH: Number(value('maxSpread')), ENABLE_OFI_DEPTH_GATING: checked('ofiGating'), MAX_DEPTH_IMBALANCE_RATIO: Number(value('maxImbalance')), ENABLE_L2_DUAL_GUARD: checked('l2Guard'), MAX_L2_SPREAD: Number(value('maxL2Spread')), MIN_L2_BID_IMBALANCE: Number(value('minBidImbalance')), ENABLE_MARKET_DATA_RECORDER: checked('recorderEnabled'), RECORDER_OUTPUT_PATH: value('recorderPath'), RECORDER_BUFFER_SIZE: Number(value('bufferSize')), RECORDER_FLUSH_INTERVAL_SEC: Number(value('flushInterval')), RECORDER_FLUSH_BATCH_SIZE: Number(value('flushBatch')), RECORDER_MIN_DISK_FREE_GB: Number(value('minDisk')), RECORDER_MAX_RECOVERY_ATTEMPTS: Number(value('recoveryAttempts')), WATCHDOG_INTERVAL_SEC: Number(value('watchdogInterval')), TICK_GAP_THRESHOLD_SEC: Number(value('tickGap')), EVAL_GAP_THRESHOLD_SEC: Number(value('evalGap')) };
  }

  function validate(payload) {
    const errors = [];
    if (!Number.isFinite(payload.capital) || payload.capital < 1000) errors.push('Capital must be at least ₹1,000.');
    if (!Number.isInteger(payload.lots) || payload.lots < 1) errors.push('Lots must be a whole number of at least 1.');
    if (payload.risk_per_trade > 0.02) errors.push('Risk per trade cannot exceed the backend cap of 2%.');
    if (payload.max_daily_loss > 0.05) errors.push('Daily loss limit cannot exceed the backend cap of 5%.');
    if (!payload.RECORDER_OUTPUT_PATH) errors.push('Recording output path is required.');
    return errors;
  }

  function renderReview() {
    const p = collectForm(); const errors = validate(p); const list = $('reviewList');
    list.innerHTML = [['Mode', 'Paper'], ['Symbol', p.target_symbol || 'Unavailable'], ['Capital', Number.isFinite(p.capital) ? `₹${p.capital.toLocaleString('en-IN')}` : 'Unavailable'], ['Lots', p.lots || 'Unavailable'], ['Risk / daily cap', `${pct(p.risk_per_trade)} / ${pct(p.max_daily_loss)}`], ['Loss cooldown', `${p.sl_cooldown_minutes} min`], ['Dynamic cooldown', p.ENABLE_DYNAMIC_COOLDOWN ? 'Enabled' : 'Disabled'], ['Direction flip cooldown', `${p.direction_flip_cooldown_minutes} min`], ['Post-exit cooldown', `${p.post_exit_cooldown_minutes} min`], ['Depth / spread guards', `${p.ENABLE_DEPTH_GATING ? 'On' : 'Off'} / ${p.MAX_SPREAD_WIDTH} pts`], ['Recorder', p.ENABLE_MARKET_DATA_RECORDER ? 'Enabled' : 'Disabled'], ['AI validation', p.USE_AI_VALIDATION ? 'Enabled' : 'Disabled'], ['Debug logging', p.DEBUG_MODE ? 'Enabled' : 'Disabled'], ['Strategy', state.config.strategy_version || 'Unavailable']].map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
    const notice = $('validationNotice'); notice.textContent = errors.length ? errors.join(' ') : 'Configuration is ready for a paper session.'; notice.className = `validation ${errors.length ? 'error' : 'ok'}`;
    $('startBtn').disabled = Boolean(errors.length || state.status?.active);
  }

  function renderStatus(data) {
    state.status = data || {};
    const active = Boolean(data?.active);
    setText('sessionState', active ? 'Running' : 'Stopped'); setText('sessionHint', active ? `${data.mode || 'PAPER'} · ${data.symbol || 'target unavailable'}` : 'No active paper session');
    setText('strategyVersion', data?.strategy_version); setText('sessionId', data?.session_id); setText('lastEvaluation', data?.telemetry?.last_evaluation_at || data?.last_evaluation_at);
    setText('ticks', data?.telemetry?.ticks); setText('candles', data?.telemetry?.candles); setText('evaluations', data?.telemetry?.evaluations); setText('recorderState', data?.recorder?.state);
    const pnl = data?.risk?.pnl; setText('dailyPnl', pnl == null ? null : `₹${Number(pnl).toFixed(2)}`);
    const tick = data?.telemetry?.last_tick_at || data?.last_tick_at; setText('lastTick', tick ? `Last tick · ${tick}` : 'Last tick unavailable'); setText('feedAge', tick ? 'Last tick received' : null);
    const locked = Boolean(data?.risk?.locked); setText('riskLock', locked ? 'Blocked' : (data?.risk ? 'Open' : null)); setText('blockReason', locked ? (data.risk.reason || 'Risk lock active — reason unavailable') : 'No active risk lock reported');
    const pos = data?.active_trade || data?.position; $('positionEmpty').hidden = Boolean(pos); $('positionDetails').hidden = !pos; $('positionBadge').textContent = pos ? 'OPEN' : 'NONE';
    if (pos) { setText('positionSymbol', pos.symbol); setText('positionId', pos.trade_id || pos.id); setText('positionStatus', pos.status); }
    $('stopBtn').disabled = !active; setFormDisabled(active); $('connection').textContent = 'Connected'; $('connection').className = 'connection connected';
  }

  function setUnavailable() { ['sessionState','dailyPnl','feedAge','riskLock','ticks','candles','evaluations','sessionId','strategyVersion','lastEvaluation','recorderState'].forEach((id) => setText(id, null)); setText('sessionHint', 'Execution service unavailable'); setText('lastTick', 'Last tick unavailable'); $('connection').textContent = 'Unavailable'; $('connection').className = 'connection'; }
  async function refreshStatus() { try { const r = await api(`/trading-status/${encodeURIComponent(state.user.id)}`); if (!r.ok) throw new Error(); renderStatus(await r.json()); } catch (_) { setUnavailable(); } }

  function setFormDisabled(disabled) { document.querySelectorAll('#configForm input, #configForm select').forEach((n) => { n.disabled = disabled || n.id === 'tradeMode'; }); }
  function navigate(page) { document.querySelectorAll('.page').forEach((p) => { p.hidden = p.id !== page; }); document.querySelectorAll('[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === page)); const titles = { overview: ['Overview', 'Live paper-session health and entry protection'], configuration: ['Configuration', 'Review supported settings before starting'], sessions: ['Past sessions', 'Completed recording history from the execution service'], trades: ['Trade history', 'Paper fills and lifecycle outcomes'], signals: ['Signals', 'Stored strategy decisions and full signal context'], analytics: ['Analytics', 'Paper performance after recorded costs'] }; setText('breadcrumb', titles[page][0]); setText('pageTitle', titles[page][0]); setText('pageSubtitle', titles[page][1]); if (page === 'configuration') renderReview(); if (page === 'sessions' || page === 'trades') loadPaperHistory(page); if (page === 'signals') loadSignals(); if (page === 'analytics') loadAnalytics(); }

  function renderHistoryUnavailable(page, message) { const body = document.querySelector(`#${page} tbody`); if (!body) return; body.innerHTML = `<tr><td colspan="${page === 'trades' ? 7 : 6}"><div class="table-empty"><span class="empty-icon">◷</span><h3>${page === 'trades' ? 'Trade history unavailable' : 'Session history unavailable'}</h3><p>${message}</p></div></td></tr>`; }
  function ensureDateFilter(page) { const card = document.querySelector(`#${page} .history-card`); if (!card || card.querySelector('.history-filters')) return; const bar = document.createElement('div'); bar.className = 'history-filters'; bar.innerHTML = `<label>From <input type="date" id="${page}From"></label><label>To <input type="date" id="${page}To"></label><button class="button secondary" id="${page}FilterBtn">Apply</button>`; card.insertBefore(bar, card.querySelector('.table-scroll')); $(page + 'FilterBtn').addEventListener('click', () => loadPaperHistory(page)); }
  async function loadPaperHistory(page) {
    ensureDateFilter(page);
    try {
      const from = $(`${page}From`)?.value; const to = $(`${page}To`)?.value; const range = `${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`; const endpoint = page === 'trades' ? `/paper-trades?user_id=${encodeURIComponent(state.user.id)}${range}` : `/paper-sessions?user_id=${encodeURIComponent(state.user.id)}${range}`;
      const response = await api(endpoint); if (!response.ok) throw new Error(); const payload = await response.json(); const rows = payload.data || [];
      const body = document.querySelector(`#${page} tbody`); if (!body) return;
      if (!rows.length) return renderHistoryUnavailable(page, 'No persisted paper records were returned for this account.');
      body.innerHTML = rows.map((row) => page === 'trades'
        ? `<tr><td>${row.label || row.symbol || 'Unavailable'}</td><td>${row.entry?.time || 'Unavailable'}<br>${row.exit?.time || 'Open'}</td><td>${row.setup || 'Unavailable'}</td><td>${row.entry?.signal_id ? `<button class="link-button signal-link" data-signal-id="${row.entry.signal_id}">${row.entry.signal_id}</button>` : 'Unavailable'}</td><td>${row.pnl?.brokerage_est == null ? 'Unavailable' : `₹${Number(row.pnl.brokerage_est).toFixed(2)}`}</td><td>${row.pnl?.net_pnl == null ? 'Unavailable' : `₹${Number(row.pnl.net_pnl).toFixed(2)}`}</td><td>${row.exit?.reason || 'Open'}</td></tr>`
        : `<tr><td>${row.date ? new Date(row.date).toLocaleDateString('en-IN') : 'Unavailable'}</td><td>${row.session_id || 'Legacy / unavailable'}</td><td>${row.strategy_version || 'Unavailable'}</td><td>${row.trade_count}</td><td>₹${Number(row.net_pnl || 0).toFixed(2)}</td><td>${row.recording_validity || 'Unavailable'}</td></tr>`).join('');
      body.querySelectorAll('.signal-link').forEach((button) => button.addEventListener('click', () => openSignal(button.dataset.signalId)));
    } catch (_) { renderHistoryUnavailable(page, 'The paper-history service is unavailable. No totals are inferred locally.'); }
  }
  async function loadSignals() {
    const signalFilters = document.querySelector('#signals .signal-filters'); if (signalFilters && !document.querySelector('#signalsFrom')) { const dates = document.createElement('span'); dates.className = 'signal-date-range'; dates.innerHTML = '<label>From <input type="date" id="signalsFrom"></label><label>To <input type="date" id="signalsTo"></label>'; signalFilters.prepend(dates); }
    const params = new URLSearchParams({ user_id: state.user.id, limit: '200' });
    if ($('signalsFrom').value) params.set('from', $('signalsFrom').value); if ($('signalsTo').value) params.set('to', $('signalsTo').value);
    if ($('signalSearch').value) params.set('search', $('signalSearch').value);
    if ($('signalStatus').value) params.set('status', $('signalStatus').value);
    if ($('signalSetup').value) params.set('setup', $('signalSetup').value);
    try {
      const response = await api(`/paper-signals?${params}`); if (!response.ok) throw new Error(); const rows = (await response.json()).data || [];
      const body = document.querySelector('#signals tbody'); $('signalCount').textContent = `${rows.length} loaded`;
      const setups = [...new Set(rows.map((row) => row.signal_data?.setup).filter(Boolean))]; $('signalSetup').innerHTML = '<option value="">All setups</option>' + setups.map((s) => `<option>${s}</option>`).join('');
      body.innerHTML = rows.length ? rows.map((row) => `<tr><td>${row.timestamp || 'Unavailable'}</td><td>${row.signal_data?.setup || 'Unavailable'}</td><td>${row.signal_data?.signal || row.direction || 'NEUTRAL'} / ${row.signal_data?.decision || row.status || 'Unavailable'}</td><td>${row.signal_data?.confidence_score ?? row.confidence_score ?? 'Unavailable'}</td><td>${row.session_id || 'Unavailable'}</td><td>${row.opportunity_id || 'Unavailable'}</td><td><button class="link-button signal-detail" data-signal-id="${row._id?.$oid || row._id}">View details</button></td></tr>`).join('') : '<tr><td colspan="7"><div class="table-empty"><h3>No matching signals</h3><p>Try a different filter.</p></div></td></tr>';
      body.querySelectorAll('.signal-detail').forEach((button) => button.addEventListener('click', () => openSignal(button.dataset.signalId)));
    } catch (_) { $('signalCount').textContent = 'Unavailable'; renderHistoryUnavailable('signals', 'The signal-history service is unavailable.'); }
  }
  async function loadAnalytics() { const from = $('analyticsFrom')?.value || ''; const to = $('analyticsTo')?.value || ''; const error = $('analyticsFilterError'); if (from && to && from > to) { error.textContent = 'From date must not be after To date.'; error.hidden = false; return; } error.hidden = true; const params = new URLSearchParams({ user_id: state.user.id, include_signals: 'false' }); if (from) params.set('from', from); if (to) params.set('to', to); history.replaceState(null, '', `${location.pathname}?${params.toString()}`); try { const response = await api(`/api/analytics?${params.toString()}`); if (!response.ok) throw new Error(); const d = (await response.json()).data || {}; const money = (v) => v == null ? 'Unavailable' : `₹${Number(v).toFixed(2)}`; setText('analyticsNet', money(d.net_pnl)); setText('analyticsGross', money(d.gross_pnl)); setText('analyticsBrokerage', money(d.brokerage)); setText('analyticsWinRate', `${(Number(d.win_rate || 0) * 100).toFixed(1)}%`); setText('analyticsSample', d.sample_size ?? 0); setText('analyticsFeeDrag', d.fees_pct_gross_profit == null ? 'n/a' : `${Number(d.fees_pct_gross_profit).toFixed(2)}%`); setText('analyticsExpectancy', money(d.net_per_trade)); setText('analyticsProfitFactor', d.profit_factor == null ? 'n/a' : Number(d.profit_factor).toFixed(2)); setText('analyticsQuality', d.data_quality?.recording_validity || 'Unavailable'); $('analyticsExitReasons').textContent = JSON.stringify(d.by_exit_reason || {}, null, 2); $('analyticsHours').textContent = JSON.stringify(d.entry_hours || [], null, 2); $('analyticsDirections').textContent = JSON.stringify(d.directions || [], null, 2); $('analyticsCurve').textContent = JSON.stringify(d.equity_curve || [], null, 2); $('analyticsWarning').textContent = d.range_capped ? 'Signal joins are capped to 90 days.' : ''; $('analyticsSubtitle').textContent = from || to ? `Paper performance for ${from || 'all time'} to ${to || 'today'}` : 'Paper performance calculated from stored trades'; } catch (_) { ['analyticsNet','analyticsGross','analyticsFeeDrag','analyticsExpectancy','analyticsProfitFactor','analyticsBrokerage','analyticsWinRate','analyticsSample','analyticsQuality'].forEach((id) => setText(id, null)); $('analyticsExitReasons').textContent = 'Unavailable'; } }
  function renderSignalTable(row) { const values = { signal_id: row.signal_id || row._id, timestamp: row.timestamp, decision: row.signal_data?.decision || row.analysis?.decision, direction: row.signal_data?.signal || row.analysis?.direction, setup: row.signal_data?.setup || row.analysis?.setup_detected, confidence: row.signal_data?.confidence ?? row.analysis?.score_after_filters, rejection_reason: row.signal_data?.rejection_reason ?? row.analysis?.rejection_reason, session_id: row.session_id, strategy_version: row.strategy_version, opportunity_id: row.opportunity_id, analysis: row.analysis, candle: row.candle, technical_context: row.technical_context, score_components: row.analysis?.score_components }; const key = 'signalFields'; let visible = JSON.parse(localStorage.getItem(key) || 'null') || Object.keys(values); const picker = $('signalFieldPicker') || document.createElement('div'); picker.id = 'signalFieldPicker'; picker.className = 'signal-field-picker'; picker.hidden = true; const dialog = $('signalDialog'); if (!picker.parentElement) dialog.insertBefore(picker, $('signalDialogBody')); const table = $('signalDialogTable') || document.createElement('div'); table.id = 'signalDialogTable'; table.className = 'signal-detail-table'; if (!table.parentElement) dialog.insertBefore(table, $('signalDialogBody')); $('signalDialogBody').hidden = true; picker.innerHTML = Object.keys(values).map((field) => `<label><input type="checkbox" data-field="${field}" ${visible.includes(field) ? 'checked' : ''}> ${field}</label>`).join(''); picker.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => { visible = [...picker.querySelectorAll('input:checked')].map((node) => node.dataset.field); localStorage.setItem(key, JSON.stringify(visible)); renderSignalTable(row); })); table.innerHTML = `<table><tbody>${visible.filter((field) => values[field] !== undefined && values[field] !== null).map((field) => `<tr><td>${field}</td><td><code>${typeof values[field] === 'object' ? JSON.stringify(values[field], null, 2) : String(values[field])}</code></td></tr>`).join('')}</tbody></table>`; $('signalFieldsBtn')?.addEventListener('click', () => { picker.hidden = !picker.hidden; }); }
  async function openSignal(signalId) {
    try {
      const response = await api(`/paper-signals/${encodeURIComponent(signalId)}?user_id=${encodeURIComponent(state.user.id)}`);
      if (!response.ok) throw new Error();
      const row = (await response.json()).data;
      const analysis = row.analysis || {};
      const signal = row.signal_data || {};
      const dialog = $('signalDialog');
      // The dialog is declared inside the Signals page for layout purposes. Move it
      // to document.body before opening so it is never trapped by a hidden page.
      if (dialog.parentElement !== document.body) document.body.appendChild(dialog);
      $('signalDialogTitle').textContent = signal.setup || analysis.setup_detected || 'Signal details';
      const detailRecord = {
        signal_id: row.signal_id || row._id,
        timestamp: row.timestamp || signal.timestamp || analysis.timestamp,
        decision: signal.decision || analysis.decision,
        direction: signal.signal || analysis.signal || analysis.direction,
        setup: signal.setup || analysis.setup_detected,
        confidence: signal.confidence ?? analysis.score_after_filters,
        rejection_reason: signal.rejection_reason ?? analysis.rejection_reason,
        session_id: row.session_id || signal.session_id,
        strategy_version: row.strategy_version || signal.strategy_version,
        opportunity_id: row.opportunity_id || signal.opportunity_id,
        analysis,
        candle: row.candle,
        technical_context: row.technical_context,
        score_components: analysis.score_components
      };
      renderSignalTable({ ...row, signal_data: signal, analysis, signal_id: row.signal_id || row._id });
      dialog.showModal();
    } catch (_) { showMessage('The full signal record could not be loaded.', 'error'); }
  }

  function openConfirm(action) { state.pendingAction = action; $('confirmTitle').textContent = action === 'start' ? 'Start paper session?' : 'Stop paper session?'; $('confirmText').textContent = action === 'start' ? 'The approved configuration will be sent to the paper execution service.' : 'Stop the active paper session and keep its recording available for review.'; $('confirmDialog').showModal(); }
  async function confirmAction() { const action = state.pendingAction; $('confirmDialog').close(); try { if (action === 'start') { const p = collectForm(); if (!state.user.token) return showMessage('An access token is required to start a session.', 'error'); const r = await api('/start-trading', { method: 'POST', body: JSON.stringify(p) }); if (!r.ok) throw new Error(await r.text()); showMessage('Paper session start requested.', 'ok'); } else { const r = await api('/stop-trading', { method: 'POST', body: JSON.stringify({ user_id: state.user.id, access_token: state.user.token }) }); if (!r.ok) throw new Error(await r.text()); showMessage('Paper session stop requested.', 'ok'); } await refreshStatus(); } catch (e) { showMessage(e.message || 'Request failed.', 'error'); } }

  async function loadConfig() { try { const r = await api('/control-panel/config'); if (!r.ok) throw new Error(); state.config = await r.json(); applyDefaults(state.config.defaults); setText('strategyVersion', state.config.strategy_version); setText('strategyFlags', state.config.frozen_strategy?.setups?.join(' · ')); renderReview(); } catch (_) { showMessage('Configuration metadata unavailable; backend defaults were not loaded.', 'error'); renderReview(); } }
  document.addEventListener('DOMContentLoaded', () => { readUser(); document.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.page))); document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go))); $('configureBtn').addEventListener('click', () => navigate('configuration')); $('refreshBtn').addEventListener('click', () => { refreshStatus(); loadConfig(); }); $('stopBtn').addEventListener('click', () => openConfirm('stop')); $('startBtn').addEventListener('click', () => openConfirm('start')); $('cancelConfirm').addEventListener('click', () => $('confirmDialog').close()); $('confirmAction').addEventListener('click', confirmAction); $('logoutBtn').addEventListener('click', () => { if (state.status?.active) return showMessage('Stop the active paper session before signing out.', 'error'); location.href = '/login'; }); $('configForm').addEventListener('input', renderReview); $('signalFilterBtn').addEventListener('click', loadSignals); $('closeSignalDialog').addEventListener('click', () => $('signalDialog').close()); navigate('overview'); loadConfig().then(refreshStatus); setInterval(refreshStatus, 15000); });
  document.addEventListener('DOMContentLoaded', () => { applyTheme(localStorage.getItem('dashboardTheme') || 'light'); $('themeSelect')?.addEventListener('change', (event) => applyTheme(event.target.value)); document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => { document.body.dataset.page = button.dataset.page; })); $('analyticsFilterBtn')?.addEventListener('click', loadAnalytics); document.querySelectorAll('[data-range]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-range]').forEach((chip) => chip.classList.remove('active')); button.classList.add('active'); const today = new Date(); const iso = (d) => d.toISOString().slice(0, 10); const kind = button.dataset.range; if (kind === 'all') { $('analyticsFrom').value = ''; $('analyticsTo').value = ''; } else { const from = new Date(today); if (kind === '7') from.setDate(today.getDate() - 6); if (kind === '30') from.setDate(today.getDate() - 29); $('analyticsFrom').value = iso(from); $('analyticsTo').value = iso(today); } loadAnalytics(); })); });
  function renderAnalyticsVisuals() {
    const table = (el, headers, rows) => { if (!el || !rows.length) return; el.innerHTML = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`; };
    const observe = (id, headers, parse) => { const el = $(id); if (!el || el.dataset.visualized) return; const observer = new MutationObserver(() => { try { const value = JSON.parse(el.textContent); const rows = parse(value); if (rows.length) { table(el, headers, rows); el.dataset.visualized = '1'; observer.disconnect(); } } catch (_) {} }); observer.observe(el, { childList: true, characterData: true }); };
    observe('analyticsDirections', ['Side', 'Trades', 'Wins', 'Win rate', 'Net'], (v) => (Array.isArray(v) ? v : []).map((x) => [x._id || 'Unavailable', x.trades, x.wins, x.trades ? `${(x.wins * 100 / x.trades).toFixed(1)}%` : 'Unavailable', `₹${Number(x.net || 0).toFixed(2)}`]));
    observe('analyticsHours', ['Hour', 'Trades', 'Wins', 'Win rate', 'Net'], (v) => (Array.isArray(v) ? v : []).map((x) => [`${String(x._id).padStart(2, '0')}:00`, x.trades, x.wins, x.trades ? `${(x.wins * 100 / x.trades).toFixed(1)}%` : 'Unavailable', `₹${Number(x.net || 0).toFixed(2)}`]));
    observe('analyticsCurve', ['Date', 'Cumulative net'], (v) => { let total = 0; return (Array.isArray(v) ? v : []).map((x) => { total += Number(x.net || 0); return [x._id, `₹${total.toFixed(2)}`]; }); });
  }
  document.addEventListener('DOMContentLoaded', renderAnalyticsVisuals);
}());
