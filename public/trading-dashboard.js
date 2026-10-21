(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { user: null, config: {}, status: null, pendingAction: null, statusRefreshInFlight: false, snapshotRefreshInFlight: false, refreshTimer: null, charts: {} };
  const api = (path, options) => fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {}));
  function applyTheme(theme) {
    const selected = ['blue', 'dark', 'black'].includes(theme) ? theme : 'light';
    document.body.classList.remove('theme-blue', 'theme-dark', 'theme-black');
    if (selected !== 'light') document.body.classList.add(`theme-${selected}`);
    const picker = $('themeSelect'); if (picker) picker.value = selected;
    localStorage.setItem('dashboardTheme', selected);
    // Reload charts so they pick up the new theme's text/grid colours
    if (!$('analytics').hidden) loadAnalytics();
  }

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
  function formatIst(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); }
  function formatPnl(value) {
    if (value == null || Number.isNaN(Number(value))) return '—';
    const amount = Number(value);
    const formatted = Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
  }
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

  function isMarketHoursClient() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const ist = new Date(utc + istOffset);
    const day = ist.getDay();
    const mins = ist.getHours() * 60 + ist.getMinutes();
    const isWeekend = day === 0 || day === 6;
    const isOpen = !isWeekend && mins >= 555 && mins <= 930;
    return { isOpen, isWeekend, text: isWeekend ? 'Market closed (Weekend)' : (mins > 930 ? 'Market closed (Post-market)' : (mins < 555 ? 'Market opens at 09:15 IST' : 'Market open')) };
  }

  function renderStatus(data) {
    state.status = data || {};
    const active = Boolean(data?.active);
    const marketOpen = Boolean(data?.market_open ?? isMarketHoursClient().isOpen);
    const scheduleText = data?.market_schedule_text || (marketOpen ? 'Market open' : 'Market closed');

    if (active) {
      setText('sessionState', 'Running');
      setText('sessionHint', `${data.mode || 'PAPER'} · ${data.target_symbol || data.symbol || 'target unavailable'}`);
      $('connection').textContent = 'Live';
      $('connection').className = 'connection connected';
    } else {
      setText('sessionState', marketOpen ? 'Standby' : 'Closed');
      setText('sessionHint', marketOpen ? 'Session in standby · Ready to start' : `${scheduleText} · Standby`);
      $('connection').textContent = marketOpen ? 'Standby' : 'Market Closed';
      $('connection').className = 'connection standby';
    }

    setText('strategyVersion', data?.strategy_version || state.config.strategy_version);
    setText('sessionId', data?.session_id);
    setText('lastEvaluation', formatIst(data?.telemetry?.last_evaluation || data?.last_evaluation));
    setText('ticks', data?.telemetry?.ticks ?? '—');
    setText('candles', data?.telemetry?.candles ?? '—');
    setText('evaluations', data?.telemetry?.evaluations ?? '0');

    const recorderEnabled = data?.recorder ? Boolean(data.recorder.enabled) : true;
    setText('recorderState', active ? (recorderEnabled ? 'Recording' : 'Disabled') : (recorderEnabled ? 'Ready (Configured)' : 'Disabled'));

    const pnl = data?.risk?.pnl;
    setText('dailyPnl', pnl == null ? '₹0.00' : `₹${Number(pnl).toFixed(2)}`);

    const snapshot = data?.market_snapshot;
    const quote = snapshot?.quote || {};
    const candle = snapshot?.candle || quote.ohlc || quote || {};
    const price = (v) => (v == null || v === '' || Number.isNaN(Number(v))) ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    setText('snapshotOpen', price(candle.open));
    setText('snapshotHigh', price(candle.high));
    setText('snapshotLow', price(candle.low));
    setText('snapshotClose', price(candle.close));
    setText('snapshotVwap', price(snapshot?.vwap));
    setText('snapshotTrend', snapshot?.trend || (marketOpen ? 'WAITING' : 'CLOSED'));
    setText('snapshotRegime', snapshot?.regime || (marketOpen ? 'STANDBY' : 'CLOSED'));
    setText('snapshotDirection', snapshot?.bias || (marketOpen ? 'NEUTRAL' : 'CLOSED'));
    setText('snapshotBias', snapshot?.bias || (marketOpen ? 'STANDBY' : 'CLOSED'));
    setText('snapshotTime', snapshot?.timestamp ? (marketOpen ? `Latest candle · ${formatIst(snapshot.timestamp)} IST` : `Market close · ${formatIst(snapshot.timestamp)} IST`) : (marketOpen ? 'Waiting for market feed' : 'Market closed'));

    const tick = data?.telemetry?.last_tick || data?.last_tick;
    if (active) {
      setText('feedAge', 'Live feed active');
      setText('lastTick', tick ? `Last tick · ${formatIst(tick)} IST` : 'Awaiting first tick');
    } else if (marketOpen) {
      setText('feedAge', 'Standby');
      setText('lastTick', 'Waiting for session start');
    } else {
      setText('feedAge', 'Market closed');
      setText('lastTick', 'NSE hours: 09:15 – 15:30 IST');
    }

    const locked = Boolean(data?.risk?.locked);
    if (active) {
      setText('riskLock', locked ? 'Blocked' : 'Open');
      setText('blockReason', locked ? (data.risk.reason || 'Risk lock active') : 'No active risk lock reported');
    } else {
      setText('riskLock', locked ? 'Blocked' : 'Standby');
      setText('blockReason', data?.risk?.reason || (marketOpen ? 'Risk controls standby' : 'Outside trading hours'));
    }

    const pos = data?.active_trade || data?.position;
    $('positionEmpty').hidden = Boolean(pos);
    $('positionDetails').hidden = !pos;
    $('positionBadge').textContent = pos ? 'OPEN' : 'NONE';
    if (!pos) {
      $('positionEmptyTitle').textContent = 'No open position';
      $('positionEmptyText').textContent = active ? 'There is currently no active paper trade.' : 'The session is stopped and has no active position.';
      if (!active && state.user?.id) loadLastClosedTrades();
    } else {
      $('positionTitle').textContent = 'Open position';
      $('positionSubtitle').textContent = 'Position reported by the execution service';
      setText('positionSymbol', pos.symbol);
      setText('positionId', pos.trade_id || pos.id);
      setText('positionStatus', pos.status);
      setText('positionTimes', pos.entry?.time || pos.entry_time || null);
      setText('positionPnl', pos.pnl?.net_pnl == null ? null : `₹${Number(pos.pnl.net_pnl).toFixed(2)}`);
      setText('positionExitReason', null);
    }

    $('stopBtn').disabled = !active;
    setFormDisabled(active);
  }

  async function loadLastClosedTrades() {
    try {
      const response = await api(`/paper-trades?user_id=${encodeURIComponent(state.user.id)}&limit=20`);
      if (!response.ok) throw new Error();
      const rows = (await response.json()).data || [];
      const allClosed = rows.filter((row) => String(row.status || '').toUpperCase() === 'CLOSED' && row.exit);
      const latestSession = allClosed[0]?.session_id;
      const closed = latestSession ? allClosed.filter((row) => row.session_id === latestSession) : allClosed;
      if (state.status?.active) return;
      if (closed.length) {
        const total = closed.reduce((sum, row) => sum + (Number(row.pnl?.net_pnl) || 0), 0);
        setText('dailyPnl', `₹${total.toFixed(2)}`);
        const sched = isMarketHoursClient();
        setText('feedAge', sched.isOpen ? 'Standby' : 'Market closed');
        setText('lastTick', sched.isOpen ? 'Waiting for session start' : 'NSE hours: 09:15 – 15:30 IST');
        setText('riskLock', 'Standby');
        setText('blockReason', sched.isOpen ? 'Session stopped' : 'Market closed');
        setText('ticks', '—');
        setText('candles', '—');
        setText('evaluations', closed.length);
        setText('sessionHint', `${sched.text} · today's summary`);
        setText('positionEmptyText', 'No active position. Showing completed paper trades.');
        setText('sessionId', closed[0].session_id);
        setText('strategyVersion', closed[0].strategy_version || state.config.strategy_version);
        setText('lastEvaluation', formatIst(closed[0].exit?.time));
        setText('recorderState', 'Ready (Configured)');
      }
      const trade = closed[0];
      if (!trade) return;
      $('positionTitle').textContent = 'Last closed position';
      $('positionSubtitle').textContent = 'Most recent completed paper trade';
      $('positionBadge').textContent = 'CLOSED';
      $('positionEmpty').hidden = true;
      $('positionDetails').hidden = false;
      $('closedPositionToggle').hidden = false;
      $('closedPositionToggle').onclick = () => {
        const list = $('closedPositions');
        list.hidden = !list.hidden;
        if (!list.hidden) list.innerHTML = closed.map((row) => `<div class="closed-position-row"><b>${row.label || row.symbol || '—'}</b><span>${formatIst(row.entry?.time) || '—'} → ${formatIst(row.exit?.time) || '—'}</span><strong>${row.pnl?.net_pnl == null ? '—' : `₹${Number(row.pnl.net_pnl).toFixed(2)}`}</strong><em>${row.exit?.reason || '—'}</em></div>`).join('');
      };
      $('openPositionToggle').onclick = () => {
        $('closedPositions').hidden = true;
        $('positionDetails').hidden = true;
        $('positionEmpty').hidden = false;
        $('positionTitle').textContent = 'Open position';
        $('positionSubtitle').textContent = 'No active position after session stop';
        $('positionBadge').textContent = 'NONE';
      };
      setText('positionSymbol', trade.label || trade.symbol);
      setText('positionId', trade.trade_id || trade.id || trade._id);
      setText('positionStatus', trade.status);
      setText('positionTimes', `${formatIst(trade.entry?.time) || '—'} → ${formatIst(trade.exit?.time) || '—'}`);
      setText('positionPnl', trade.pnl?.net_pnl == null ? null : `₹${Number(trade.pnl.net_pnl).toFixed(2)}`);
      setText('positionExitReason', trade.exit?.reason);
    } catch (_) { /* live status remains authoritative; historical panel stays empty when unavailable */ }
  }

  function setUnavailable() {
    const sched = isMarketHoursClient();
    setText('sessionState', sched.isOpen ? 'Standby' : 'Closed');
    setText('sessionHint', sched.isOpen ? 'Session in standby · Ready to start' : `${sched.text} · Standby`);
    setText('feedAge', sched.isOpen ? 'Standby' : 'Market closed');
    setText('lastTick', sched.isOpen ? 'Waiting for session start' : 'NSE hours: 09:15 – 15:30 IST');
    setText('riskLock', 'Standby');
    setText('blockReason', sched.isOpen ? 'Risk controls standby' : 'Outside trading hours');
    setText('recorderState', 'Ready (Configured)');
    $('connection').textContent = sched.isOpen ? 'Standby' : 'Market Closed';
    $('connection').className = 'connection standby';
    loadLastClosedTrades();
    loadPersistedSnapshot();
  }

  async function refreshStatus() {
    if (state.statusRefreshInFlight) return;
    state.statusRefreshInFlight = true;
    try {
      const r = await api(`/trading-status/${encodeURIComponent(state.user.id)}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      renderStatus(data);
      if (data?.active) {
        if (!state.refreshTimer) state.refreshTimer = setInterval(() => { refreshStatus(); refreshMarketSnapshot(); }, 15000);
      } else if (state.refreshTimer) {
        clearInterval(state.refreshTimer);
        state.refreshTimer = null;
      }
    } catch (_) {
      setUnavailable();
      if (state.refreshTimer) {
        clearInterval(state.refreshTimer);
        state.refreshTimer = null;
      }
    } finally {
      state.statusRefreshInFlight = false;
    }
  }

  async function refreshMarketSnapshot() {
    if (state.snapshotRefreshInFlight) return;
    state.snapshotRefreshInFlight = true;
    try {
      const r = await api(`/market-snapshot/${encodeURIComponent(state.user.id)}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      const q = d.quote || d.candle || {};
      const o = q.ohlc || q;
      const price = (v) => (v == null || v === '' || Number.isNaN(Number(v))) ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
      const hasOhlc = ['open','high','low','close'].some((key) => o[key] != null);
      if (hasOhlc) {
        setText('snapshotOpen', price(o.open));
        setText('snapshotHigh', price(o.high));
        setText('snapshotLow', price(o.low));
        setText('snapshotClose', price(o.close));
      }
      if (d.vwap != null) setText('snapshotVwap', price(d.vwap));
      if (d.trend) setText('snapshotTrend', d.trend);
      if (d.regime) setText('snapshotRegime', d.regime);
      if (d.bias) {
        setText('snapshotDirection', d.bias);
        setText('snapshotBias', d.bias);
      }
      if (d.timestamp) setText('snapshotTime', `${isMarketHoursClient().isOpen ? 'Latest candle' : 'Market close'} · ${formatIst(d.timestamp)} IST`);
    } catch (_) {} finally {
      state.snapshotRefreshInFlight = false;
    }
  }

  async function loadPersistedSnapshot() {
    try {
      const r = await api(`/paper-signals?user_id=${encodeURIComponent(state.user.id)}&limit=1`);
      if (!r.ok) return;
      const row = (await r.json()).data?.[0];
      if (!row || state.status?.active) return;
      const c = row.candle || {};
      const a = row.analysis || {};
      const price = (v) => (v == null || v === '' || Number.isNaN(Number(v))) ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
      setText('snapshotOpen', price(c.open));
      setText('snapshotHigh', price(c.high));
      setText('snapshotLow', price(c.low));
      setText('snapshotClose', price(c.close != null ? c.close : a.vwap));
      setText('snapshotVwap', price(a.vwap));
      setText('snapshotTrend', a.tf15_trend || 'CLOSED');
      setText('snapshotRegime', a.regime || 'CLOSED');
      setText('snapshotDirection', a.dow_bias || a.tf15_trend || 'CLOSED');
      setText('snapshotBias', a.dow_bias || a.tf15_trend || 'CLOSED');
      setText('snapshotTime', c.timestamp ? `Market close · ${formatIst(c.timestamp)} IST` : (row.timestamp ? `Market close · ${formatIst(row.timestamp)} IST` : 'Latest signal snapshot'));
    } catch (_) {}
  }

  function setFormDisabled(disabled) { document.querySelectorAll('#configForm input, #configForm select').forEach((n) => { n.disabled = disabled || n.id === 'tradeMode'; }); }
  function navigate(page) { document.querySelectorAll('.page').forEach((p) => { p.hidden = p.id !== page; }); document.querySelectorAll('[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === page)); const titles = { overview: ['Overview', 'Live paper-session health and entry protection'], configuration: ['Configuration', 'Review supported settings before starting'], sessions: ['Past sessions', 'Completed recording history from the execution service'], trades: ['Trade history', 'Paper fills and lifecycle outcomes'], signals: ['Signals', 'Stored strategy decisions and full signal context'], analytics: ['Analytics', 'Paper performance after recorded costs'] }; setText('breadcrumb', titles[page][0]); setText('pageTitle', titles[page][0]); setText('pageSubtitle', titles[page][1]); if (page === 'configuration') renderReview(); if (page === 'sessions' || page === 'trades') loadPaperHistory(page); if (page === 'signals') loadSignals(); if (page === 'analytics') loadAnalytics(); }

  function renderHistoryUnavailable(page, message) { const body = document.querySelector(`#${page} tbody`); if (!body) return; body.innerHTML = `<tr><td colspan="${page === 'trades' ? 7 : 6}"><div class="table-empty"><span class="empty-icon">◷</span><h3>${page === 'trades' ? 'Trade history unavailable' : 'Session history unavailable'}</h3><p>${message}</p></div></td></tr>`; }
  function ensureDateFilter(page) {
    const card = document.querySelector(`#${page} .history-card`);
    if (!card || card.querySelector('.history-filters')) return;
    const bar = document.createElement('div');
    bar.className = 'history-filters';
    bar.innerHTML = `
      <div class="quick-filter-chips">
        <button type="button" class="chip active" data-filter-range="all">All</button>
        <button type="button" class="chip" data-filter-range="today">Today</button>
        <button type="button" class="chip" data-filter-range="7d">Last 7 days</button>
        <button type="button" class="chip" data-filter-range="30d">Last 30 days</button>
      </div>
      <div class="custom-date-range">
        <label>From <input type="date" id="${page}From"></label>
        <label>To <input type="date" id="${page}To"></label>
        <button class="button secondary" id="${page}FilterBtn">Apply</button>
      </div>
    `;
    card.insertBefore(bar, card.querySelector('.table-scroll'));

    $(`${page}FilterBtn`).addEventListener('click', () => {
      bar.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      loadPaperHistory(page);
    });

    bar.querySelectorAll('[data-filter-range]').forEach((btn) => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        const range = btn.dataset.filterRange;
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const ist = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
        const iso = (d) => d.toISOString().slice(0, 10);
        const fromInput = $(`${page}From`);
        const toInput = $(`${page}To`);

        if (range === 'today') {
          fromInput.value = iso(ist);
          toInput.value = iso(ist);
        } else if (range === '7d') {
          const past = new Date(ist);
          past.setDate(past.getDate() - 6);
          fromInput.value = iso(past);
          toInput.value = iso(ist);
        } else if (range === '30d') {
          const past = new Date(ist);
          past.setDate(past.getDate() - 29);
          fromInput.value = iso(past);
          toInput.value = iso(ist);
        } else {
          fromInput.value = '';
          toInput.value = '';
        }
        loadPaperHistory(page);
      });
    });
  }

  async function loadPaperHistory(page) {
    ensureDateFilter(page);
    try {
      const from = $(`${page}From`)?.value;
      const to = $(`${page}To`)?.value;
      const range = `${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`;
      const endpoint = page === 'trades' ? `/paper-trades?user_id=${encodeURIComponent(state.user.id)}${range}` : `/paper-sessions?user_id=${encodeURIComponent(state.user.id)}${range}`;
      const response = await api(endpoint);
      if (!response.ok) throw new Error();
      const payload = await response.json();
      const rows = payload.data || [];
      const body = document.querySelector(`#${page} tbody`);
      const badge = $(`${page}Badge`) || document.querySelector(`#${page} .history-card .card-head .badge`);
      if (badge) badge.textContent = `${rows.length} ${page === 'trades' ? (rows.length === 1 ? 'trade' : 'trades') : (rows.length === 1 ? 'session' : 'sessions')}`;

      if (!body) return;
      if (!rows.length) return renderHistoryUnavailable(page, 'No persisted paper records were returned for this account.');

      const formatPnl = (val) => {
        if (val == null || Number.isNaN(Number(val))) return '—';
        const n = Number(val);
        const formatted = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return n < 0 ? `-₹${formatted}` : `₹${formatted}`;
      };

      body.innerHTML = rows.map((row) => {
        if (page === 'trades') {
          const net = row.pnl?.net_pnl;
          const netClass = net != null ? (Number(net) >= 0 ? 'an-pos' : 'an-neg') : '';
          return `<tr>
            <td><b>${row.label || row.symbol || '—'}</b></td>
            <td>${row.entry?.time ? formatIst(row.entry.time) : '—'}<br><small style="color:var(--muted)">${row.exit?.time ? formatIst(row.exit.time) : 'Open'}</small></td>
            <td>${row.setup || '—'}</td>
            <td>${row.entry?.signal_id ? `<button class="link-button signal-link" data-signal-id="${row.entry.signal_id}">${String(row.entry.signal_id).slice(-8)}</button>` : '—'}</td>
            <td>${row.pnl?.brokerage_est == null ? '—' : `₹${Number(row.pnl.brokerage_est).toFixed(2)}`}</td>
            <td class="${netClass}"><b>${formatPnl(net)}</b></td>
            <td>${row.exit?.reason || 'Open'}</td>
          </tr>`;
        } else {
          const net = row.net_pnl;
          const netClass = net != null ? (Number(net) >= 0 ? 'an-pos' : 'an-neg') : '';
          const rawVal = row.recording_validity;
          const displayValidity = (rawVal && rawVal !== 'Unavailable')
            ? rawVal
            : (row.trade_count > 0 ? 'Valid (Complete)' : 'Recorded');
          const validityClass = displayValidity.toLowerCase().includes('valid') ? 'badge-ok' : '';
          const sessionIdDisplay = row.session_id ? `<code title="${row.session_id}">${row.session_id.length > 18 ? row.session_id.slice(0, 18) + '…' : row.session_id}</code>` : '<span style="color:var(--muted)">Legacy session</span>';
          return `<tr>
            <td><b>${row.date ? new Date(row.date).toLocaleDateString('en-IN') : '—'}</b></td>
            <td>${sessionIdDisplay}</td>
            <td>${row.strategy_version || 'v2026.10.x'}</td>
            <td><b>${row.trade_count}</b></td>
            <td class="${netClass}"><b>${formatPnl(net)}</b></td>
            <td><span class="badge ${validityClass}">${displayValidity}</span></td>
          </tr>`;
        }
      }).join('');
      body.querySelectorAll('.signal-link').forEach((button) => button.addEventListener('click', () => openSignal(button.dataset.signalId)));
    } catch (_) { renderHistoryUnavailable(page, 'The paper-history service is unavailable. No totals are inferred locally.'); }
  }
  async function loadSignals() {
    const signalFilters = document.querySelector('#signals .signal-filters');
    if (signalFilters && !document.querySelector('#signalsQuickFilters')) {
      const quickBar = document.createElement('div');
      quickBar.id = 'signalsQuickFilters';
      quickBar.className = 'quick-filter-chips';
      quickBar.style.marginBottom = '12px';
      quickBar.innerHTML = `
        <button type="button" class="chip active" data-signal-range="all">All</button>
        <button type="button" class="chip" data-signal-range="today">Today</button>
        <button type="button" class="chip" data-signal-range="7d">Last 7 days</button>
        <button type="button" class="chip" data-signal-range="30d">Last 30 days</button>
      `;
      signalFilters.parentElement.insertBefore(quickBar, signalFilters);

      quickBar.querySelectorAll('[data-signal-range]').forEach((btn) => {
        btn.addEventListener('click', () => {
          quickBar.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          const range = btn.dataset.signalRange;
          const now = new Date();
          const istOffset = 5.5 * 60 * 60 * 1000;
          const ist = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
          const iso = (d) => d.toISOString().slice(0, 10);
          const fromInput = $('signalsFrom');
          const toInput = $('signalsTo');

          if (range === 'today') {
            if (fromInput) fromInput.value = iso(ist);
            if (toInput) toInput.value = iso(ist);
          } else if (range === '7d') {
            const past = new Date(ist);
            past.setDate(past.getDate() - 6);
            if (fromInput) fromInput.value = iso(past);
            if (toInput) toInput.value = iso(ist);
          } else if (range === '30d') {
            const past = new Date(ist);
            past.setDate(past.getDate() - 29);
            if (fromInput) fromInput.value = iso(past);
            if (toInput) toInput.value = iso(ist);
          } else {
            if (fromInput) fromInput.value = '';
            if (toInput) toInput.value = '';
          }
          loadSignals();
        });
      });
    }

    if (signalFilters && !document.querySelector('#signalsFrom')) {
      const dates = document.createElement('span');
      dates.className = 'signal-date-range';
      dates.style.display = 'inline-flex';
      dates.style.alignItems = 'center';
      dates.style.gap = '8px';
      dates.innerHTML = '<label style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px">From <input type="date" id="signalsFrom" style="padding:5px 8px;font-size:11px;border-radius:6px"></label><label style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px">To <input type="date" id="signalsTo" style="padding:5px 8px;font-size:11px;border-radius:6px"></label>';
      signalFilters.prepend(dates);
    }

    const params = new URLSearchParams({ user_id: state.user.id, limit: '200' });
    if ($('signalsFrom')?.value) params.set('from', $('signalsFrom').value);
    if ($('signalsTo')?.value) params.set('to', $('signalsTo').value);
    if ($('signalSearch')?.value) params.set('search', $('signalSearch').value);
    if ($('signalStatus')?.value) params.set('status', $('signalStatus').value);
    if ($('signalSetup')?.value) params.set('setup', $('signalSetup').value);

    try {
      const response = await api(`/paper-signals?${params}`);
      if (!response.ok) throw new Error();
      const rows = (await response.json()).data || [];
      const body = document.querySelector('#signals tbody');
      $('signalCount').textContent = `${rows.length} loaded`;

      const setups = [...new Set(rows.map((row) => row.signal_data?.setup || row.analysis?.setup_detected).filter(Boolean))];
      $('signalSetup').innerHTML = '<option value="">All setups</option>' + setups.map((s) => `<option>${s}</option>`).join('');

      body.innerHTML = rows.length ? rows.map((row) => {
        const rawScore = row.analysis?.score_after_filters 
          ?? row.signal_data?.confidence 
          ?? row.signal_data?.confidence_score 
          ?? row.confidence_score 
          ?? row.analysis?.score_before_filters 
          ?? row.analysis?.score 
          ?? ((row.signal_data?.decision === 'IGNORED' || row.signal_data?.decision === 'REJECTED' || row.status === 'REJECTED' || row.status === 'IGNORED') ? 0 : null);

        let scoreBadge = '—';
        if (rawScore != null) {
          const num = Number(rawScore);
          if (!Number.isNaN(num)) {
            const badgeClass = num >= 7 ? 'badge-ok' : '';
            scoreBadge = `<span class="badge ${badgeClass}"><b>${num}</b>/10</span>`;
          } else {
            scoreBadge = `<span class="badge">${rawScore}</span>`;
          }
        }

        const setupName = row.signal_data?.setup || row.analysis?.setup_detected || '—';
        const direction = row.signal_data?.signal || row.analysis?.direction || row.direction || 'NEUTRAL';
        const decision = row.signal_data?.decision || row.analysis?.decision || row.status || '—';
        const decisionClass = (decision === 'SIGNAL_GENERATED' || decision === 'EXECUTED') ? 'badge-ok' : '';
        const sessId = row.session_id ? `<code title="${row.session_id}">${row.session_id.length > 14 ? row.session_id.slice(0, 14) + '…' : row.session_id}</code>` : '—';

        let tradeOutcomeHtml = '';
        if (row.trade_taken) {
          const pnlText = row.trade?.net_pnl != null ? ` (${formatPnl(row.trade.net_pnl)})` : '';
          const tradeId = row.trade?.trade_id == null ? '' : String(row.trade.trade_id);
          const tradeIdText = tradeId ? `<br><small style="color:var(--muted);font-size:10px;">ID: ${tradeId.slice(0, 12)}…</small>` : '';
          tradeOutcomeHtml = `<span class="badge badge-ok">✅ TRADE TAKEN${pnlText}</span>${tradeIdText}`;
        } else {
          const reasonText = row.why_not_trade || (row.status === 'REJECTED' ? 'Rejected by filter' : 'No trade taken');
          tradeOutcomeHtml = `<span class="badge" style="background:rgba(234,179,8,0.12);color:var(--yellow,#b45309);border:1px solid rgba(234,179,8,0.25);">⛔ NO TRADE</span><br><small style="color:var(--muted);font-size:11px;line-height:1.2;display:inline-block;max-width:210px;" title="${reasonText}">${reasonText}</small>`;
        }

        return `<tr>
          <td><small>${formatIst(row.timestamp) || row.timestamp || '—'}</small></td>
          <td><b>${setupName}</b></td>
          <td><span class="${decisionClass}">${direction} / ${decision}</span></td>
          <td>${tradeOutcomeHtml}</td>
          <td>${scoreBadge}</td>
          <td>${sessId}</td>
          <td><button class="link-button signal-detail" data-signal-id="${row._id?.$oid || row._id}">View details</button></td>
        </tr>`;
      }).join('') : '<tr><td colspan="7"><div class="table-empty"><h3>No matching signals</h3><p>Try a different filter.</p></div></td></tr>';

      body.querySelectorAll('.signal-detail').forEach((button) => button.addEventListener('click', () => openSignal(button.dataset.signalId)));
    } catch (error) {
      console.error('[Signals] Failed to render signal history', error);
      $('signalCount').textContent = 'Unavailable';
      renderHistoryUnavailable('signals', 'The signal-history service is unavailable.');
    }
  }
  async function loadAnalytics() {
    const from = $('analyticsFrom')?.value || '';
    const to = $('analyticsTo')?.value || '';
    const error = $('analyticsFilterError');
    if (from && to && from > to) { error.textContent = 'From date must not be after To date.'; error.hidden = false; return; }
    error.hidden = true;
    const params = new URLSearchParams({ user_id: state.user.id, include_signals: 'false' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
    // Destroy existing charts
    ['equityCurve', 'exitReasons', 'entryHours'].forEach((key) => { if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; } });
    const money = (v) => v == null ? 'Unavailable' : `₹${Number(v).toFixed(2)}`;
    // Read theme colors from computed CSS so they match every theme automatically
    const cs = getComputedStyle(document.documentElement);
    const mutedColor = cs.getPropertyValue('--muted').trim() || '#738197';
    const lineColor  = cs.getPropertyValue('--line').trim()  || '#e6ebf2';
    // Palette that works across all four themes (uses semi-transparent so dark bg shines through)
    const chartColors = ['#5b7cf2','#12956b','#e0963a','#c9404d','#7c3aed','#0891b2','#be123c','#2d9d78'];
    // Reset KPIs
    ['analyticsNet','analyticsGross','analyticsFeeDrag','analyticsExpectancy','analyticsProfitFactor','analyticsBrokerage','analyticsWinRate','analyticsSample'].forEach((id) => setText(id, null));
    try {
      const response = await api(`/api/analytics?${params.toString()}`);
      if (!response.ok) throw new Error();
      const d = (await response.json()).data || {};
      setText('analyticsNet', money(d.net_pnl));
      setText('analyticsGross', money(d.gross_pnl));
      setText('analyticsBrokerage', money(d.brokerage));
      setText('analyticsWinRate', `${(Number(d.win_rate || 0) * 100).toFixed(1)}%`);
      setText('analyticsSample', d.sample_size ?? 0);
      setText('analyticsFeeDrag', d.fees_pct_gross_profit == null ? 'n/a' : `${Number(d.fees_pct_gross_profit).toFixed(2)}%`);
      setText('analyticsExpectancy', money(d.net_per_trade));
      setText('analyticsProfitFactor', d.profit_factor == null ? 'n/a' : Number(d.profit_factor).toFixed(2));
      setText('analyticsQuality', d.data_quality?.recording_validity || 'Unavailable');
      $('analyticsWarning').textContent = d.range_capped ? 'Signal joins are capped to 90 days.' : '';
      $('analyticsSubtitle').textContent = from || to ? `Paper performance for ${from || 'all time'} to ${to || 'today'}` : 'Paper performance calculated from stored trades';
      // Net P&L: use CSS class so var(--green/--red) applies correctly
      const netEl = $('analyticsNet');
      if (netEl && d.net_pnl != null) {
        netEl.classList.remove('an-pos', 'an-neg');
        if (Number(d.net_pnl) > 0) netEl.classList.add('an-pos');
        else if (Number(d.net_pnl) < 0) netEl.classList.add('an-neg');
      }
      // Equity Curve (line)
      const curve = Array.isArray(d.equity_curve) ? d.equity_curve : [];
      const curvePlaceholder = $('equityCurvePlaceholder');
      const curveCanvas = $('equityCurveChart');
      curvePlaceholder.hidden = curve.length > 0; curveCanvas.hidden = curve.length === 0;
      if (curve.length) {
        let cumulative = 0;
        const labels = curve.map((x) => x._id);
        const values = curve.map((x) => { cumulative += Number(x.net || 0); return cumulative; });
        const posColor = 'rgba(18,149,107,0.9)', negColor = 'rgba(201,64,77,0.9)';
        state.charts.equityCurve = new Chart(curveCanvas, { type: 'line', data: { labels, datasets: [{ label: 'Cumulative Net P&L', data: values, fill: true, tension: 0.38, borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5, segment: { borderColor: (ctx) => ctx.p1.parsed.y >= 0 ? posColor : negColor }, borderColor: posColor, backgroundColor: 'rgba(18,149,107,0.06)' }] }, options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ₹${Number(c.raw).toFixed(2)}` } } }, scales: { x: { grid: { color: lineColor }, ticks: { color: mutedColor, maxTicksLimit: 10, maxRotation: 0 } }, y: { grid: { color: lineColor }, ticks: { color: mutedColor, callback: (v) => `₹${v}` } } } } });
      }
      // Exit Reasons (doughnut)
      const exitObj = (d.by_exit_reason && typeof d.by_exit_reason === 'object' && !Array.isArray(d.by_exit_reason)) ? d.by_exit_reason : {};
      const exitEntries = Object.entries(exitObj);
      const exitPlaceholder = $('exitReasonsPlaceholder');
      const exitCanvas = $('exitReasonsChart');
      const exitTableEl = $('analyticsExitReasonsTable');
      exitPlaceholder.hidden = exitEntries.length > 0; exitCanvas.hidden = exitEntries.length === 0;
      if (exitEntries.length) {
        state.charts.exitReasons = new Chart(exitCanvas, { type: 'doughnut', data: { labels: exitEntries.map((e) => e[0]), datasets: [{ data: exitEntries.map((e) => e[1]), backgroundColor: chartColors, borderColor: lineColor, borderWidth: 2, hoverOffset: 8 }] }, options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: mutedColor, font: { size: 11 }, padding: 12, boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} trades` } } } } });
        const total = exitEntries.reduce((s, e) => s + Number(e[1]), 0);
        exitTableEl.innerHTML = `<table class="an-table"><thead><tr><th>Exit Reason</th><th>Trades</th><th>%</th></tr></thead><tbody>${exitEntries.map(([reason, count], i) => `<tr><td><span class="an-dot" style="background:${chartColors[i % chartColors.length]}"></span>${reason}</td><td>${count}</td><td>${total ? ((count / total) * 100).toFixed(1) : 0}%</td></tr>`).join('')}</tbody></table>`;
      } else { exitTableEl.innerHTML = ''; }
      // Entry Hours (bar)
      const hours = Array.isArray(d.entry_hours) ? d.entry_hours : [];
      const hourPlaceholder = $('entryHoursPlaceholder');
      const hourCanvas = $('entryHoursChart');
      const hourTableEl = $('analyticsHoursTable');
      hourPlaceholder.hidden = hours.length > 0; hourCanvas.hidden = hours.length === 0;
      if (hours.length) {
        state.charts.entryHours = new Chart(hourCanvas, { type: 'bar', data: { labels: hours.map((x) => `${String(x._id).padStart(2,'0')}:00`), datasets: [{ label: 'Trades', data: hours.map((x) => x.trades || 0), backgroundColor: 'rgba(91,124,242,0.75)', borderRadius: 4 }, { label: 'Wins', data: hours.map((x) => x.wins || 0), backgroundColor: 'rgba(18,149,107,0.75)', borderRadius: 4 }] }, options: { responsive: true, plugins: { legend: { labels: { color: mutedColor, font: { size: 11 }, boxWidth: 12 } }, tooltip: { mode: 'index' } }, scales: { x: { grid: { color: lineColor }, ticks: { color: mutedColor, maxRotation: 0 } }, y: { grid: { color: lineColor }, ticks: { color: mutedColor, stepSize: 1 }, beginAtZero: true } } } });
        hourTableEl.innerHTML = `<table class="an-table"><thead><tr><th>Hour</th><th>Trades</th><th>Wins</th><th>Win Rate</th><th>Net</th></tr></thead><tbody>${hours.map((x) => { const wr = x.trades ? ((x.wins * 100 / x.trades).toFixed(1) + '%') : '—'; const net = Number(x.net || 0); return `<tr><td>${String(x._id).padStart(2,'0')}:00</td><td>${x.trades}</td><td>${x.wins}</td><td>${wr}</td><td class="${net >= 0 ? 'an-pos' : 'an-neg'}">₹${net.toFixed(2)}</td></tr>`; }).join('')}</tbody></table>`;
      } else { hourTableEl.innerHTML = ''; }
      // CALL vs PUT (table)
      const dirs = Array.isArray(d.directions) ? d.directions : [];
      const dirContainer = $('analyticsDirectionsContent');
      const dirPlaceholder = $('analyticsDirectionsPlaceholder');
      if (dirs.length) {
        dirPlaceholder.hidden = true;
        const rows = dirs.map((x) => { const losses = (x.trades||0)-(x.wins||0); const wr = x.trades ? ((x.wins*100/x.trades).toFixed(1)+'%') : '—'; const net = Number(x.net||0); const avg = x.trades ? Number(net/x.trades) : null; const isCall = String(x._id||'').toUpperCase()==='CALL'; return `<tr><td><span class="${isCall?'an-badge-call':'an-badge-put'}">${x._id||'Unknown'}</span></td><td>${x.trades||0}</td><td class="an-pos">${x.wins||0}</td><td class="an-neg">${losses}</td><td>${wr}</td><td class="${net>=0?'an-pos':'an-neg'}">₹${net.toFixed(2)}</td><td class="${avg!=null&&avg>=0?'an-pos':'an-neg'}">${avg!=null?'₹'+avg.toFixed(2):'—'}</td></tr>`; }).join('');
        dirContainer.innerHTML = `<table class="an-table"><thead><tr><th>Direction</th><th>Trades</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>Net P&amp;L</th><th>Avg Net</th></tr></thead><tbody>${rows}</tbody></table>`;
        dirContainer.appendChild(dirPlaceholder);
      } else {
        dirPlaceholder.hidden = false;
        dirContainer.innerHTML = '';
        dirContainer.appendChild(dirPlaceholder);
      }
    } catch (_) {
      ['analyticsNet','analyticsGross','analyticsFeeDrag','analyticsExpectancy','analyticsProfitFactor','analyticsBrokerage','analyticsWinRate','analyticsSample','analyticsQuality'].forEach((id) => setText(id, null));
      $('analyticsWarning').textContent = 'Analytics service unavailable.';
    }
  }
  function renderSignalTable(row) { 
    const tradeOutcome = row.trade_taken ? `✅ EXECUTED (Trade ID: ${row.trade?.trade_id || 'N/A'}${row.trade?.net_pnl != null ? ', Net P&L: ₹' + Number(row.trade.net_pnl).toFixed(2) : ''})` : '⛔ NO TRADE TAKEN';
    const whyNot = row.trade_taken ? 'N/A — Trade was successfully initiated' : (row.why_not_trade || 'Score < 7 cutoff or filter/risk block');
    const values = { 
      trade_taken: row.trade_taken ? 'YES (Order Placed)' : 'NO (Blocked / Filtered)', 
      why_not_trade: whyNot, 
      trade_outcome: tradeOutcome, 
      trade_details: row.trade || null, 
      signal_id: row.signal_id || row._id, 
      timestamp: row.timestamp, 
      decision: row.signal_data?.decision || row.analysis?.decision, 
      direction: row.signal_data?.signal || row.analysis?.direction, 
      setup: row.signal_data?.setup || row.analysis?.setup_detected, 
      confidence: row.signal_data?.confidence ?? row.analysis?.score_after_filters, 
      rejection_reason: row.signal_data?.rejection_reason ?? row.analysis?.rejection_reason ?? row.why_not_trade, 
      session_id: row.session_id, 
      strategy_version: row.strategy_version, 
      opportunity_id: row.opportunity_id, 
      analysis: row.analysis, 
      candle: row.candle, 
      technical_context: row.technical_context, 
      score_components: row.analysis?.score_components 
    }; 
    const key = 'signalFields'; 
    let visible = JSON.parse(localStorage.getItem(key) || 'null') || Object.keys(values); 
    const picker = $('signalFieldPicker') || document.createElement('div'); 
    picker.id = 'signalFieldPicker'; 
    picker.className = 'signal-field-picker'; 
    picker.hidden = true; 
    const dialog = $('signalDialog'); 
    if (!picker.parentElement) dialog.insertBefore(picker, $('signalDialogBody')); 
    const table = $('signalDialogTable') || document.createElement('div'); 
    table.id = 'signalDialogTable'; 
    table.className = 'signal-detail-table'; 
    if (!table.parentElement) dialog.insertBefore(table, $('signalDialogBody')); 
    $('signalDialogBody').hidden = true; 
    picker.innerHTML = Object.keys(values).map((field) => `<label><input type="checkbox" data-field="${field}" ${visible.includes(field) ? 'checked' : ''}> ${field}</label>`).join(''); 
    picker.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => { 
      visible = [...picker.querySelectorAll('input:checked')].map((node) => node.dataset.field); 
      localStorage.setItem(key, JSON.stringify(visible)); 
      renderSignalTable(row); 
    })); 
    table.innerHTML = `<table><tbody>${visible.filter((field) => values[field] !== undefined && values[field] !== null).map((field) => `<tr><td style="font-weight:600;min-width:140px;">${field}</td><td><code>${typeof values[field] === 'object' ? JSON.stringify(values[field], null, 2) : String(values[field])}</code></td></tr>`).join('')}</tbody></table>`; 
    $('signalFieldsBtn')?.addEventListener('click', () => { picker.hidden = !picker.hidden; }); 
  }
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
      renderSignalTable({ ...row, signal_data: signal, analysis, signal_id: row.signal_id || row._id });
      dialog.showModal();
    } catch (_) { showMessage('The full signal record could not be loaded.', 'error'); }
  }

  function openConfirm(action) { state.pendingAction = action; $('confirmTitle').textContent = action === 'start' ? 'Start paper session?' : 'Stop paper session?'; $('confirmText').textContent = action === 'start' ? 'The approved configuration will be sent to the paper execution service.' : 'Stop the active paper session and keep its recording available for review.'; $('confirmDialog').showModal(); }
  async function confirmAction() { const action = state.pendingAction; $('confirmDialog').close(); try { if (action === 'start') { const p = collectForm(); if (!state.user.token) return showMessage('An access token is required to start a session.', 'error'); const r = await api('/start-trading', { method: 'POST', body: JSON.stringify(p) }); if (!r.ok) throw new Error(await r.text()); showMessage('Paper session start requested.', 'ok'); } else { const r = await api('/stop-trading', { method: 'POST', body: JSON.stringify({ user_id: state.user.id, access_token: state.user.token }) }); if (!r.ok) throw new Error(await r.text()); showMessage('Paper session stop requested.', 'ok'); } await refreshStatus(); } catch (e) { showMessage(e.message || 'Request failed.', 'error'); } }

  async function loadConfig() { try { const r = await api('/control-panel/config'); if (!r.ok) throw new Error(); state.config = await r.json(); applyDefaults(state.config.defaults); setText('strategyVersion', state.config.strategy_version); setText('strategyFlags', state.config.frozen_strategy?.setups?.join(' · ')); renderReview(); } catch (_) { showMessage('Configuration metadata unavailable; backend defaults were not loaded.', 'error'); renderReview(); } }
  document.addEventListener('DOMContentLoaded', () => { readUser(); document.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.page))); document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go))); $('configureBtn').addEventListener('click', () => navigate('configuration')); $('refreshBtn').addEventListener('click', () => { refreshStatus(); refreshMarketSnapshot(); loadConfig(); }); $('stopBtn').addEventListener('click', () => openConfirm('stop')); $('startBtn').addEventListener('click', () => openConfirm('start')); $('cancelConfirm').addEventListener('click', () => $('confirmDialog').close()); $('confirmAction').addEventListener('click', confirmAction); $('logoutBtn').addEventListener('click', () => { if (state.status?.active) return showMessage('Stop the active paper session before signing out.', 'error'); location.href = '/login'; }); $('configForm').addEventListener('input', renderReview); $('signalFilterBtn').addEventListener('click', loadSignals); $('closeSignalDialog').addEventListener('click', () => $('signalDialog').close()); navigate('overview'); loadConfig().then(() => { refreshStatus(); refreshMarketSnapshot(); }); });
  document.addEventListener('DOMContentLoaded', () => { applyTheme(localStorage.getItem('dashboardTheme') || 'light'); $('themeSelect')?.addEventListener('change', (event) => applyTheme(event.target.value)); document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => { document.body.dataset.page = button.dataset.page; })); $('analyticsFilterBtn')?.addEventListener('click', loadAnalytics); document.querySelectorAll('[data-range]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-range]').forEach((chip) => chip.classList.remove('active')); button.classList.add('active'); const today = new Date(); const iso = (d) => d.toISOString().slice(0, 10); const kind = button.dataset.range; if (kind === 'all') { $('analyticsFrom').value = ''; $('analyticsTo').value = ''; } else { const from = new Date(today); if (kind === '7') from.setDate(today.getDate() - 6); if (kind === '30') from.setDate(today.getDate() - 29); $('analyticsFrom').value = iso(from); $('analyticsTo').value = iso(today); } loadAnalytics(); })); });
}());
