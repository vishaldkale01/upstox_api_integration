const mongoose = require('mongoose');

function requireUser(req, res) {
  const userId = req.query.user_id;
  if (!userId) {
    res.status(400).json({ success: false, message: 'user_id is required' });
    return null;
  }
  return userId;
}

function database() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    const error = new Error('MongoDB is not connected');
    error.statusCode = 503;
    throw error;
  }
  return mongoose.connection.db;
}

function dateRange(date) {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { $gte: start, $lt: end };
}
function queryDateRange(query) {
  if (query.from || query.to) { const start = query.from ? new Date(`${query.from}T00:00:00.000+05:30`) : new Date('1970-01-01T00:00:00.000Z'); const end = query.to ? new Date(`${query.to}T23:59:59.999+05:30`) : new Date('2999-12-31T23:59:59.999Z'); if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || (query.from && query.to && start > end)) return null; return { $gte: start, $lte: end }; }
  return dateRange(query.date);
}

async function getPaperTrades(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const db = database();
    const query = { user_id: userId, mode: 'PAPER' };
    const range = queryDateRange(req.query);
    if ((req.query.date || req.query.from || req.query.to) && !range) return res.status(400).json({ success: false, message: 'dates must be YYYY-MM-DD' });
    if (range) query.created_at = range;
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const rows = await db.collection('trades').find(query, {
      projection: { _id: 1, id: 1, trade_id: 1, user_id: 1, session_id: 1, strategy_version: 1, opportunity_id: 1, symbol: 1, label: 1, trade_type: 1, mode: 1, fill_source: 1, status: 1, quantity: 1, entry: 1, exit: 1, pnl: 1, risk_params: 1, created_at: 1, updated_at: 1 }
    }).sort({ created_at: -1 }).limit(limit).toArray();
    const signalIds = rows.map((row) => row.entry?.signal_id).filter(Boolean);
    const objectIds = signalIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
    const signalRows = objectIds.length ? await db.collection('signals').find({ _id: { $in: objectIds } }, { projection: { _id: 1, signal_data: 1, strategy: 1 } }).toArray() : [];
    const signalMap = new Map(signalRows.map((row) => [String(row._id), row]));
    for (const row of rows) { const signal = signalMap.get(String(row.entry?.signal_id)); if (signal) { row.setup = signal.signal_data?.setup || signal.strategy || null; row.signal = signal.signal_data; } }
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: 'Unable to read paper trades' });
  }
}

async function getPaperSessions(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const db = database();
    const range = queryDateRange(req.query); if ((req.query.date || req.query.from || req.query.to) && !range) return res.status(400).json({ success: false, message: 'dates must be YYYY-MM-DD' });
    const tradeQuery = { user_id: userId, mode: 'PAPER' }; const signalQuery = { user_id: userId }; if (range) { tradeQuery.created_at = range; signalQuery.timestamp = range; }
    const [trades, signals] = await Promise.all([
      db.collection('trades').find(tradeQuery, { projection: { session_id: 1, strategy_version: 1, created_at: 1, status: 1, pnl: 1 } }).sort({ created_at: -1 }).limit(5000).toArray(),
      db.collection('signals').find(signalQuery, { projection: { session_id: 1, strategy_version: 1, timestamp: 1, status: 1 } }).sort({ timestamp: -1 }).limit(10000).toArray()
    ]);
    const grouped = new Map();
    const keyFor = (row) => row.session_id || `legacy:${new Date(row.created_at || row.timestamp || 0).toISOString().slice(0, 10)}`;
    const ensure = (key, row) => {
      if (!grouped.has(key)) grouped.set(key, { session_id: row.session_id || null, strategy_version: row.strategy_version || null, date: row.created_at || row.timestamp || null, signal_count: 0, accepted_signals: 0, rejected_signals: 0, ignored_signals: 0, trade_count: 0, closed_trades: 0, net_pnl: 0, recording_validity: 'Unavailable' });
      return grouped.get(key);
    };
    for (const signal of signals) {
      const out = ensure(keyFor(signal), signal); out.signal_count += 1;
      if (signal.strategy_version && !out.strategy_version) out.strategy_version = signal.strategy_version;
      if (signal.status === 'EXECUTED') out.accepted_signals += 1;
      else if (signal.status === 'IGNORED') out.ignored_signals += 1;
      else out.rejected_signals += 1;
    }
    for (const trade of trades) {
      const out = ensure(keyFor(trade), trade); out.trade_count += 1; if (trade.status === 'CLOSED') out.closed_trades += 1;
      if (trade.strategy_version && !out.strategy_version) out.strategy_version = trade.strategy_version;
      if (typeof trade.pnl?.net_pnl === 'number') out.net_pnl += trade.pnl.net_pnl;
    }
    for (const out of grouped.values()) {
      if (out.session_id) {
        if (out.closed_trades > 0 && out.closed_trades === out.trade_count) {
          out.recording_validity = 'Valid (Reconciled)';
        } else if (out.trade_count > 0) {
          out.recording_validity = 'Recorded (Active)';
        } else {
          out.recording_validity = 'Signals Recorded';
        }
      } else {
        out.recording_validity = 'Legacy Validated';
        if (!out.strategy_version) out.strategy_version = 'v2026.10.x';
      }
    }
    const data = [...grouped.values()].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: 'Unable to read paper sessions' });
  }
}

function signalFilter(query) {
  const filter = { user_id: query.user_id };
  if (query.status) filter['signal_data.decision'] = query.status;
  if (query.setup) filter['signal_data.setup'] = query.setup;
  if (query.direction) filter['signal_data.signal'] = query.direction;
  if (query.session_id) filter.session_id = query.session_id;
  if (query.search) filter.$or = [{ opportunity_id: { $regex: query.search, $options: 'i' } }, { 'signal_data.setup': { $regex: query.search, $options: 'i' } }];
  const range = queryDateRange(query);
  if (range) filter.timestamp = range;
  return filter;
}

async function getPaperSignals(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    if ((req.query.date || req.query.from || req.query.to) && !queryDateRange(req.query)) return res.status(400).json({ success: false, message: 'dates must be YYYY-MM-DD' });
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const db = database();
    const rows = await db.collection('signals').find(signalFilter(req.query), { projection: { _id: 1, signal_id: 1, user_id: 1, session_id: 1, strategy_version: 1, opportunity_id: 1, timestamp: 1, analysis: 1, candle: 1, signal_data: 1, indicators: 1, technical_context: 1, ai_validation: 1, status: 1, rejection_reason: 1 } }).sort({ timestamp: -1 }).limit(limit).toArray();

    const signalObjectIds = rows.map((r) => r._id).filter(Boolean);
    const signalStringIds = rows.map((r) => String(r.signal_id || r._id)).filter(Boolean);
    const tradeRows = (signalObjectIds.length || signalStringIds.length) ? await db.collection('trades').find({
      $or: [
        { 'entry.signal_id': { $in: signalObjectIds } },
        { 'entry.signal_id': { $in: signalStringIds } }
      ]
    }, {
      projection: { 'entry.signal_id': 1, trade_id: 1, id: 1, status: 1, symbol: 1, label: 1, pnl: 1, setup: 1 }
    }).toArray() : [];

    const tradeMap = new Map();
    for (const t of tradeRows) {
      if (t.entry?.signal_id) tradeMap.set(String(t.entry.signal_id), t);
    }

    // A generated signal can be rejected after signal generation by an
    // execution gate (cooldown, spread/depth, risk, quote freshness, etc.).
    // Keep that decision in the table instead of falling back to the vague
    // "No trade taken" label. Audit logs are read-only here and only the
    // derived gate/reason text is returned to the browser.
    const signalKeys = [...new Set(rows.flatMap((row) => [row.signal_id, row._id].filter(Boolean).map(String)))];
    const auditRows = signalKeys.length ? await db.collection('audit_logs').find({
      user_id: userId,
      'details.signal_id': { $in: signalKeys }
    }, { projection: { 'details.signal_id': 1, 'details.gate': 1, 'details.reason': 1, timestamp: 1 } }).sort({ timestamp: -1 }).toArray() : [];
    const auditMap = new Map();
    for (const audit of auditRows) {
      const signalKey = audit.details?.signal_id ? String(audit.details.signal_id) : null;
      if (signalKey && !auditMap.has(signalKey) && (audit.details?.reason || audit.details?.gate)) {
        auditMap.set(signalKey, audit.details);
      }
    }

    for (const row of rows) {
      const matched = tradeMap.get(String(row._id)) || tradeMap.get(String(row.signal_id));
      if (matched) {
        row.trade = {
          trade_id: matched.trade_id || matched.id,
          status: matched.status,
          symbol: matched.label || matched.symbol,
          net_pnl: matched.pnl?.net_pnl
        };
        row.trade_taken = true;
      } else {
        row.trade_taken = false;
        const score = row.analysis?.score_after_filters ?? row.signal_data?.confidence;
        const audit = auditMap.get(String(row.signal_id || row._id));
        const reason = row.rejection_reason 
          || row.signal_data?.rejection_reason 
          || row.signal_data?.reason 
          || row.analysis?.rejection_reason
          || audit?.reason;
        
        if (reason && reason !== 'SIGNAL_GENERATED' && reason !== 'NONE') {
          row.why_not_trade = audit?.gate && audit.gate !== reason ? `${audit.gate}: ${reason}` : reason;
        } else if (score != null && score < 7) {
          row.why_not_trade = `Score ${score} < 7 (Cutoff Gate)`;
        } else if (row.signal_data?.decision === 'IGNORED' || row.status === 'IGNORED') {
          row.why_not_trade = 'Cutoff gate / Filter ignored';
        } else if (row.signal_data?.signal === 'NEUTRAL' || row.direction === 'NEUTRAL') {
          row.why_not_trade = 'Setup filters not met (Neutral)';
        } else {
          row.why_not_trade = 'Signal generated; execution-gate reason was not recorded';
        }
      }
    }

    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error) { return res.status(error.statusCode || 500).json({ success: false, message: 'Unable to read paper signals' }); }
}

async function getPaperSignal(req, res) {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ success: false, message: 'user_id is required' });
  try {
    const { ObjectId } = mongoose.Types;
    const rawId = req.params.signal_id;
    const id = ObjectId.isValid(rawId) ? new ObjectId(rawId) : rawId;
    const db = database();
    const row = await db.collection('signals').findOne({ _id: id, user_id: userId }, { projection: { _id: 1, signal_id: 1, user_id: 1, session_id: 1, strategy_version: 1, opportunity_id: 1, timestamp: 1, analysis: 1, candle: 1, instrument: 1, latency_ms: 1, signal_data: 1, technical_context: 1, ai_validation: 1, status: 1, rejection_reason: 1 } });
    if (!row) return res.status(404).json({ success: false, message: 'Signal not found' });

    const matched = await db.collection('trades').findOne({
      $or: [
        { 'entry.signal_id': row._id },
        { 'entry.signal_id': String(row._id) },
        { 'entry.signal_id': row.signal_id }
      ]
    }, { projection: { trade_id: 1, id: 1, status: 1, symbol: 1, label: 1, pnl: 1, setup: 1, entry: 1, exit: 1 } });

    if (matched) {
      row.trade = {
        trade_id: matched.trade_id || matched.id,
        status: matched.status,
        symbol: matched.label || matched.symbol,
        net_pnl: matched.pnl?.net_pnl,
        entry: matched.entry,
        exit: matched.exit
      };
      row.trade_taken = true;
    } else {
      row.trade_taken = false;
      const audit = await db.collection('audit_logs').findOne({
        user_id: userId,
        'details.signal_id': { $in: [String(row.signal_id || ''), String(row._id)] }
      }, { projection: { 'details.gate': 1, 'details.reason': 1 } });
      const score = row.analysis?.score_after_filters ?? row.signal_data?.confidence;
      const reason = row.rejection_reason || row.signal_data?.rejection_reason || row.signal_data?.reason || row.analysis?.rejection_reason || audit?.details?.reason;
      if (reason && reason !== 'SIGNAL_GENERATED' && reason !== 'NONE') {
        row.why_not_trade = audit?.details?.gate && audit.details.gate !== reason ? `${audit.details.gate}: ${reason}` : reason;
      } else if (score != null && score < 7) {
        row.why_not_trade = `Score ${score} < 7 (Cutoff Gate)`;
      } else {
        row.why_not_trade = 'Signal generated; execution-gate reason was not recorded';
      }
    }

    return res.json({ success: true, data: row });
  } catch (error) { return res.status(error.statusCode || 500).json({ success: false, message: 'Unable to read signal' }); }
}

async function getPaperAnalytics(req, res) {
  const userId = requireUser(req, res); if (!userId) return;
  try {
    const range = queryDateRange(req.query);
    if ((req.query.date || req.query.from || req.query.to) && !range) return res.status(400).json({ success: false, message: 'dates must be YYYY-MM-DD and from must not be after to' });
    const match = { user_id: userId, mode: 'PAPER', status: 'CLOSED', 'exit.reason': { $type: 'string' }, 'pnl.net_pnl': { $type: 'number' } }; if (range) match.created_at = range;
    const base = [{ $match: match }, { $sort: { created_at: 1 } }];
    const facet = await database().collection('trades').aggregate([...base, { $facet: {
      summary: [{ $group: { _id: null, sample_size: { $sum: 1 }, wins: { $sum: { $cond: [{ $gt: ['$pnl.net_pnl', 0] }, 1, 0] } }, losses: { $sum: { $cond: [{ $lt: ['$pnl.net_pnl', 0] }, 1, 0] } }, gross_pnl: { $sum: '$pnl.absolute' }, brokerage: { $sum: '$pnl.brokerage_est' }, net_pnl: { $sum: '$pnl.net_pnl' }, gross_profit: { $sum: { $cond: [{ $gt: ['$pnl.net_pnl', 0] }, '$pnl.absolute', 0] } }, gross_loss: { $sum: { $cond: [{ $lt: ['$pnl.net_pnl', 0] }, '$pnl.absolute', 0] } }, avg_win: { $avg: { $cond: [{ $gt: ['$pnl.net_pnl', 0] }, '$pnl.net_pnl', null] } }, avg_loss: { $avg: { $cond: [{ $lt: ['$pnl.net_pnl', 0] }, '$pnl.net_pnl', null] } } } }],
      exit_reasons: [{ $group: { _id: '$exit.reason', count: { $sum: 1 }, net: { $sum: '$pnl.net_pnl' } } }, { $sort: { count: -1 } }],
      hours: [{ $project: { hour: { $hour: { date: '$created_at', timezone: 'Asia/Kolkata' } }, net: '$pnl.net_pnl', win: { $cond: [{ $gt: ['$pnl.net_pnl', 0] }, 1, 0] } } }, { $group: { _id: '$hour', trades: { $sum: 1 }, wins: { $sum: '$win' }, net: { $sum: '$net' } } }, { $sort: { _id: 1 } }],
      directions: [{ $group: { _id: '$trade_type', trades: { $sum: 1 }, wins: { $sum: { $cond: [{ $gt: ['$pnl.net_pnl', 0] }, 1, 0] } }, net: { $sum: '$pnl.net_pnl' } } }],
      versions: [{ $group: { _id: '$strategy_version', trades: { $sum: 1 }, wins: { $sum: { $cond: [{ $gt: ['$pnl.net_pnl', 0] }, 1, 0] } }, net: { $sum: '$pnl.net_pnl' } } }],
      curve: [{ $group: { _id: { $dateToString: { date: '$created_at', format: '%Y-%m-%d', timezone: 'Asia/Kolkata' } }, net: { $sum: '$pnl.net_pnl' } } }, { $sort: { _id: 1 } }],
      validity: [{ $group: { _id: null, missing_exit_reason: { $sum: { $cond: [{ $eq: [{ $type: '$exit.reason' }, 'string'] }, 0, 1] } }, missing_net_pnl: { $sum: { $cond: [{ $eq: [{ $type: '$pnl.net_pnl' }, 'number'] }, 0, 1] } }, abs_pnl_outliers: { $sum: { $cond: [{ $gt: [{ $abs: '$pnl.net_pnl' }, 1000000] }, 1, 0] } } } }]
    } }]).toArray();
    const f = facet[0] || {}; const s = f.summary?.[0] || { sample_size: 0, wins: 0, losses: 0, gross_pnl: 0, brokerage: 0, net_pnl: 0, gross_profit: 0, gross_loss: 0, avg_win: null, avg_loss: null };
    const validity = f.validity?.[0] || { missing_exit_reason: 0, missing_net_pnl: 0, abs_pnl_outliers: 0 }; validity.no_linked_signal = null;
    const quality = validity.missing_exit_reason || validity.missing_net_pnl || validity.abs_pnl_outliers ? 'Partial data' : 'Data valid';
    return res.json({ success: true, data: { ...s, win_rate: s.sample_size ? s.wins / s.sample_size : 0, profit_factor: s.gross_loss ? s.gross_profit / Math.abs(s.gross_loss) : null, net_per_trade: s.sample_size ? s.net_pnl / s.sample_size : null, payoff_ratio: s.avg_loss ? s.avg_win / Math.abs(s.avg_loss) : null, fees_pct_gross_profit: s.gross_profit ? s.brokerage * 100 / s.gross_profit : null, by_exit_reason: Object.fromEntries((f.exit_reasons || []).map((x) => [x._id, x.count])), entry_hours: f.hours || [], directions: f.directions || [], strategy_versions: f.versions || [], equity_curve: f.curve || [], recording_validity: validity, data_quality: { recording_validity: quality }, range_capped: false } });
  } catch (error) { return res.status(error.statusCode || 500).json({ success: false, message: 'Unable to read paper analytics' }); }
}

module.exports = { getPaperTrades, getPaperSessions, getPaperSignals, getPaperSignal, getPaperAnalytics };
