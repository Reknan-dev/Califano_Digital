/**
 * creators-data.js
 * ------------------------------------------------------------------
 * Modulo condiviso che scarica il foglio Google pubblicato in CSV e
 * lo rende disponibile a tutte le pagine (players.html + pagine talent).
 *
 * Il cliente aggiorna i numeri dei follower direttamente sul Google Sheet:
 * https://docs.google.com/spreadsheets/d/e/2PACX-1vRF3bGtin67mqyviJd_rSjv17Xqnuu-YdnSocu2kQQ9YmC0r3qUrJCmIa1CA1XKHhY-RGTqC6KJtGRk/pub?output=csv
 *
 * Colonne attese nel foglio: CREATOR, YOUTUBE, INSTAGRAM, TIKTOK, TWITCH
 * (i valori dei follower sono numeri semplici, es. 112000)
 *
 * Include: <script src="assets/js/creators-data.js"></script>
 * PRIMA degli altri script che lo usano (players-filters.js / talent-page.js)
 * ------------------------------------------------------------------
 */
(function (window) {
  'use strict';

  var SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRF3bGtin67mqyviJd_rSjv17Xqnuu-YdnSocu2kQQ9YmC0r3qUrJCmIa1CA1XKHhY-RGTqC6KJtGRk/pub?output=csv';

  // Rimuove spazi, accenti, apostrofi e maiuscole/minuscole per confrontare i nomi
  // in modo "tollerante" (es. "Filo D'oro" === "Filo D’Oro").
  function normalizeName(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
      .replace(/[^a-z0-9]/g, ''); // rimuove spazi, apostrofi, punteggiatura
  }

  // Parser CSV semplice (nessun campo contiene virgole nel nostro foglio).
  function parseCSV(text) {
    var lines = text.split(/\r?\n/).filter(function (l) {
      return l.trim().length > 0;
    });
    if (lines.length === 0) return [];

    var headers = lines[0].split(',').map(function (h) {
      return h.trim().toUpperCase();
    });

    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      var cols = lines[i].split(',');
      var row = {};
      headers.forEach(function (h, idx) {
        row[h] = (cols[idx] || '').trim();
      });
      rows.push(row);
    }
    return rows;
  }

  function parseFollowers(value) {
    if (value === undefined || value === null || value === '') return 0;
    var n = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }

  function formatFollowers(n) {
    n = parseFollowers(n);
    if (n >= 1000000) {
      var m = n / 1000000;
      return (Math.round(m * 10) / 10).toString().replace('.0', '') + 'M';
    }
    if (n >= 1000) return Math.round(n / 1000) + 'K';
    return String(n);
  }

  var cachedData = null;
  var fetchPromise = null;

  // Scarica (una sola volta per pagina) e restituisce una Promise con:
  // { rows: [...], byNormalizedName: { nomenormalizzato: row } }
  function getCreatorsData() {
    if (cachedData) return Promise.resolve(cachedData);
    if (fetchPromise) return fetchPromise;

    fetchPromise = fetch(SHEET_CSV_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Errore HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        var byNormalizedName = {};
        rows.forEach(function (row) {
          var key = normalizeName(row.CREATOR);
          if (key) byNormalizedName[key] = row;
        });
        cachedData = { rows: rows, byNormalizedName: byNormalizedName };
        return cachedData;
      })
      .catch(function (err) {
        console.error('CreatorsData: impossibile caricare il foglio Google', err);
        cachedData = { rows: [], byNormalizedName: {} };
        return cachedData;
      });

    return fetchPromise;
  }

  // Trova la riga corrispondente a un nome. Prova prima il match esatto
  // (dopo normalizzazione), poi un match "per contenimento" come rete di
  // sicurezza per piccole differenze (es. "Golgota79" vs "Golgota").
  function findCreator(data, name) {
    var key = normalizeName(name);
    if (!key) return null;

    if (data.byNormalizedName[key]) return data.byNormalizedName[key];

    var found = null;
    Object.keys(data.byNormalizedName).forEach(function (k) {
      if (found) return;
      if (k.indexOf(key) !== -1 || key.indexOf(k) !== -1) {
        found = data.byNormalizedName[k];
      }
    });
    return found;
  }

  window.CreatorsData = {
    getCreatorsData: getCreatorsData,
    findCreator: findCreator,
    normalizeName: normalizeName,
    parseFollowers: parseFollowers,
    formatFollowers: formatFollowers
  };
})(window);
