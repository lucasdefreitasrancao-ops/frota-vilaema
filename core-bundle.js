/**
 * Vila Ema — core-bundle.js
 * storage-api + frota-excel (arquivo único para GitHub Pages)
 */
(function () {
  'use strict';

  /* ── STORAGE API ── */
  if (!window.VilaEmaStorage) {
    var PREFIX = 've_frota_v1_';
    var TABLES = ['caminhoes', 'manutencoes', 'trocas_pneus', 'checklists'];
    var nativeFetch = window.fetch.bind(window);

    function uid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    function loadTable(name) {
      try {
        var raw = localStorage.getItem(PREFIX + name);
        if (!raw) return [];
        var rows = JSON.parse(raw);
        return Array.isArray(rows) ? rows : [];
      } catch (e) { return []; }
    }
    function saveTable(name, rows) {
      localStorage.setItem(PREFIX + name, JSON.stringify(rows));
      window.dispatchEvent(new CustomEvent('ve-storage-change', { detail: { table: name } }));
    }
    function parseUrl(url) {
      var path = String(url || '').split('?')[0];
      path = path.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
      var base = path.indexOf('tables/') >= 0 ? path.slice(path.indexOf('tables/')) : path;
      var m = base.match(/^tables\/([^/?#]+)(?:\/([^/?#]+))?\/?$/);
      return m ? { table: m[1], id: m[2] || null } : null;
    }
    function parseQuery(url) {
      var q = {}, i = String(url || '').indexOf('?');
      if (i < 0) return q;
      String(url).slice(i + 1).split('&').forEach(function (part) {
        var kv = part.split('=');
        if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
      return q;
    }
    function listResponse(table, url) {
      var rows = loadTable(table).slice(), q = parseQuery(url);
      var search = q.search || q.q || '';
      if (search) {
        var s = search.toLowerCase();
        rows = rows.filter(function (r) { return JSON.stringify(r).toLowerCase().indexOf(s) >= 0; });
      }
      rows.sort(function (a, b) {
        var ta = a.created_at || a.data_servico || a.data_checklist || '';
        var tb = b.created_at || b.data_servico || b.data_checklist || '';
        return String(tb).localeCompare(String(ta));
      });
      var limit = parseInt(q.limit, 10) || 500, page = parseInt(q.page, 10) || 1;
      var start = (page - 1) * limit;
      return { status: 200, body: { data: rows.slice(start, start + limit), total: rows.length, page: page, limit: limit } };
    }
    function getOne(table, id) {
      var row = loadTable(table).find(function (r) { return String(r.id) === String(id); });
      return row ? { status: 200, body: row } : { status: 404, body: { error: 'Registro não encontrado', id: id } };
    }
    function createRow(table, body) {
      var rows = loadTable(table), row = Object.assign({}, body || {});
      if (!row.id) row.id = uid();
      if (!row.created_at) row.created_at = new Date().toISOString().slice(0, 10);
      rows.push(row); saveTable(table, rows);
      return { status: 201, body: row };
    }
    function replaceRow(table, id, body) {
      var rows = loadTable(table), idx = rows.findIndex(function (r) { return String(r.id) === String(id); });
      if (idx < 0) return { status: 404, body: { error: 'Registro não encontrado' } };
      rows[idx] = Object.assign({}, body || {}, { id: rows[idx].id });
      saveTable(table, rows);
      return { status: 200, body: rows[idx] };
    }
    function patchRow(table, id, body) {
      var rows = loadTable(table), idx = rows.findIndex(function (r) { return String(r.id) === String(id); });
      if (idx < 0) return { status: 404, body: { error: 'Registro não encontrado' } };
      rows[idx] = Object.assign({}, rows[idx], body || {}, { id: rows[idx].id });
      saveTable(table, rows);
      return { status: 200, body: rows[idx] };
    }
    function deleteRow(table, id) {
      var rows = loadTable(table), next = rows.filter(function (r) { return String(r.id) !== String(id); });
      if (next.length === rows.length) return { status: 404, body: { error: 'Registro não encontrado' } };
      saveTable(table, next);
      return { status: 204, body: null };
    }
    function handleTablesRequest(method, url, body) {
      var parsed = parseUrl(url);
      if (!parsed || TABLES.indexOf(parsed.table) < 0) return null;
      method = (method || 'GET').toUpperCase();
      if (method === 'GET' && !parsed.id) return listResponse(parsed.table, url);
      if (method === 'GET' && parsed.id) return getOne(parsed.table, parsed.id);
      if (method === 'POST' && !parsed.id) return createRow(parsed.table, body);
      if (method === 'PUT' && parsed.id) return replaceRow(parsed.table, parsed.id, body);
      if (method === 'PATCH' && parsed.id) return patchRow(parsed.table, parsed.id, body);
      if (method === 'DELETE' && parsed.id) return deleteRow(parsed.table, parsed.id);
      return { status: 405, body: { error: 'Método não suportado' } };
    }
    function jsonResponse(result) {
      if (result.status === 204) return new Response(null, { status: 204 });
      return new Response(JSON.stringify(result.body), { status: result.status, headers: { 'Content-Type': 'application/json' } });
    }
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = (init && init.method) || (input && input.method) || 'GET', body;
      if (init && init.body && typeof init.body === 'string') {
        try { body = JSON.parse(init.body); } catch (e) { body = null; }
      }
      if (url.indexOf('tables/') >= 0) {
        var result = handleTablesRequest(method, url, body);
        if (result) return Promise.resolve(jsonResponse(result));
      }
      return nativeFetch(input, init);
    };
    function exportAll() {
      var out = { version: 1, exported_at: new Date().toISOString(), tables: {} };
      TABLES.forEach(function (t) { out.tables[t] = loadTable(t); });
      return out;
    }
    function importAll(payload, merge) {
      if (!payload || !payload.tables) throw new Error('Backup inválido');
      TABLES.forEach(function (t) {
        if (!Array.isArray(payload.tables[t])) return;
        if (merge) {
          var cur = loadTable(t), byId = {};
          cur.forEach(function (r) { byId[r.id] = r; });
          payload.tables[t].forEach(function (r) { if (r.id) byId[r.id] = r; else byId[uid()] = r; });
          saveTable(t, Object.keys(byId).map(function (k) { return byId[k]; }));
        } else saveTable(t, payload.tables[t]);
      });
    }
    TABLES.forEach(function (t) { if (localStorage.getItem(PREFIX + t) === null) saveTable(t, []); });
    window.VilaEmaStorage = {
      PREFIX: PREFIX, TABLES: TABLES, exportAll: exportAll, importAll: importAll,
      clearAll: function () { TABLES.forEach(function (t) { localStorage.removeItem(PREFIX + t); }); },
      stats: function () { var s = {}; TABLES.forEach(function (t) { s[t] = loadTable(t).length; }); return s; },
      loadTable: loadTable
    };
    console.log('[StorageAPI] Modo GitHub Pages — localStorage ativo (core-bundle.js)');
  }

  /* ── FROTA EXCEL ── */
  if (!window.FrotaExcel) {
    var FIELDS = [
      { key: 'placa', label: 'Placa', type: 'text', required: true },
      { key: 'tipo', label: 'Tipo', type: 'text', required: false },
      { key: 'marca', label: 'Marca', type: 'text', required: false },
      { key: 'modelo', label: 'Modelo', type: 'text', required: false },
      { key: 'ano', label: 'Ano', type: 'number', required: false },
      { key: 'motorista', label: 'Motorista', type: 'text', required: false },
      { key: 'km_atual', label: 'KM Atual', type: 'number', required: false },
      { key: 'eixos', label: 'Eixos', type: 'number', required: false },
      { key: 'pneus', label: 'Pneus', type: 'number', required: false },
      { key: 'renavam', label: 'RENAVAM', type: 'text', required: false },
      { key: 'chassi', label: 'Chassi', type: 'text', required: false },
      { key: 'status', label: 'Status', type: 'text', required: false },
      { key: 'vencimento_ipva', label: 'Venc. IPVA', type: 'text', required: false },
      { key: 'vencimento_seguro', label: 'Venc. Seguro', type: 'text', required: false }
    ];
    var AUTO_DETECT = {
      placa: ['placa', 'plate', 'numero', 'veiculo'],
      tipo: ['tipo', 'type', 'categoria'],
      marca: ['marca', 'brand', 'fabricante'],
      modelo: ['modelo', 'model'],
      ano: ['ano', 'year', 'fabricacao'],
      motorista: ['motorista', 'condutor', 'driver'],
      km_atual: ['km', 'quilometragem', 'odometro', 'km_atual', 'hodometro'],
      eixos: ['eixos', 'eixo'], pneus: ['pneus', 'pneu'],
      renavam: ['renavam'], chassi: ['chassi', 'chassis'],
      status: ['status', 'situacao'],
      vencimento_ipva: ['ipva', 'vencimento_ipva'],
      vencimento_seguro: ['seguro', 'vencimento_seguro']
    };
    function feNorm(s) {
      return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-_.]/g, '');
    }
    function readWorkbook(file) {
      return new Promise(function (resolve, reject) {
        if (!window.XLSX) { reject(new Error('Biblioteca XLSX não carregada')); return; }
        var reader = new FileReader();
        reader.onload = function (e) {
          try { resolve(XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true })); }
          catch (err) { reject(err); }
        };
        reader.onerror = function () { reject(new Error('Erro ao ler arquivo')); };
        reader.readAsArrayBuffer(file);
      });
    }
    function sheetToData(wb, sheetName) {
      var name = sheetName || wb.SheetNames[0], ws = wb.Sheets[name];
      var raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }), headerRow = 0;
      for (var i = 0; i < Math.min(10, raw.length); i++) {
        if (raw[i].some(function (c) { return String(c).trim().length > 1; })) { headerRow = i; break; }
      }
      var headers = raw[headerRow].map(function (h) { return String(h || '').trim(); }), rows = [];
      for (var j = headerRow + 1; j < raw.length; j++) {
        var row = raw[j];
        if (!row.some(function (c) { return String(c || '').trim(); })) continue;
        var obj = {}; headers.forEach(function (h, idx) { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
        rows.push(obj);
      }
      return { sheetName: name, headers: headers, rows: rows, sheetNames: wb.SheetNames };
    }
    function autoDetectMapping(headers) {
      var headersLower = headers.map(feNorm), mapping = {};
      FIELDS.forEach(function (field) {
        var keywords = AUTO_DETECT[field.key] || [field.key], matched = '';
        keywords.forEach(function (kw) {
          if (matched) return;
          var idx = headersLower.findIndex(function (h) { return h === kw || h.indexOf(kw) >= 0; });
          if (idx >= 0) matched = headers[idx];
        });
        mapping[field.key] = matched;
      });
      return mapping;
    }
    function cleanNum(val) {
      if (val === null || val === undefined || val === '') return 0;
      var n = parseFloat(String(val).replace(/[R$\s.]/g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    }
    function buildPayload(row, mapping, tiposVeiculo) {
      var payload = { created_at: new Date().toISOString().slice(0, 10) };
      FIELDS.forEach(function (field) {
        var col = mapping[field.key];
        if (!col || !(col in row)) return;
        var val = row[col];
        if (val === null || val === undefined || String(val).trim() === '') return;
        if (field.type === 'number') { var n = cleanNum(val); if (n || field.key === 'km_atual') payload[field.key] = n; }
        else payload[field.key] = String(val).trim();
      });
      if (payload.placa) payload.placa = String(payload.placa).trim().toUpperCase();
      if (!payload.status) payload.status = 'Ativo';
      if (!payload.tipo) payload.tipo = 'Caminhão';
      if (!payload.modelo) payload.modelo = payload.marca || payload.tipo || '—';
      if (payload.tipo && tiposVeiculo && tiposVeiculo[payload.tipo]) {
        if (!payload.eixos) payload.eixos = tiposVeiculo[payload.tipo].eixos;
        if (!payload.pneus) payload.pneus = tiposVeiculo[payload.tipo].pneus;
      }
      return payload;
    }
    function importRows(rows, mapping, apiPostFn, options) {
      options = options || {};
      var tipos = options.tiposVeiculo || {}, existingPlacas = options.existingPlacas || {};
      var onProgress = options.onProgress || function () {};
      var stats = { ok: 0, err: 0, skip: 0, errors: [] }, chain = Promise.resolve();
      rows.forEach(function (row, i) {
        chain = chain.then(function () {
          var payload = buildPayload(row, mapping, tipos);
          if (!payload.placa) { stats.skip++; onProgress(i + 1, rows.length, stats); return; }
          var placaKey = payload.placa.replace(/[\s\-_.]/g, '').toUpperCase();
          if (existingPlacas[placaKey]) { stats.skip++; onProgress(i + 1, rows.length, stats); return; }
          return apiPostFn('caminhoes', payload).then(function () {
            stats.ok++; existingPlacas[placaKey] = true; onProgress(i + 1, rows.length, stats);
          }).catch(function (e) {
            stats.err++; stats.errors.push({ placa: payload.placa, msg: e.message }); onProgress(i + 1, rows.length, stats);
          });
        });
      });
      return chain.then(function () { return stats; });
    }
    window.FrotaExcel = {
      FIELDS: FIELDS, readFile: function (file, sheetName) {
        return readWorkbook(file).then(function (wb) { return sheetToData(wb, sheetName); });
      },
      autoDetectMapping: autoDetectMapping, buildPayload: buildPayload, importRows: importRows
    };
  }
})();
