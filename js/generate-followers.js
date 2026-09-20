/**
 * generate-followers.js
 * ------------------------------------------------------------------
 * Da lanciare in locale (sul PC del cliente) ogni volta che si vuole
 * "cuocere" dentro le pagine HTML dei talent i numeri di follower
 * aggiornati presi dal Google Sheet.
 *
 * Non serve un server: basta avere Node.js installato una volta
 * (https://nodejs.org - versione LTS) e poi lanciare questo file
 * con doppio click su uno dei due launcher:
 *   - Aggiorna Follower.bat      (Windows)
 *   - Aggiorna Follower.command  (Mac)
 *
 * Cosa fa:
 * 1. Scarica il CSV pubblicato dal Google Sheet.
 * 2. Apre ogni file dentro pages/talents/*.html
 * 3. Trova l'attributo data-creator="NomeCreator" sulla pagina
 * 4. Cerca la riga corrispondente nel foglio
 * 5. Sostituisce il contenuto tra i marker
 *      <!-- FOLLOWERS:START -->  ... <!-- FOLLOWERS:END -->
 *    con le platform card aggiornate (mostra solo le piattaforme
 *    con follower > 0)
 * 6. Salva il file
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRF3bGtin67mqyviJd_rSjv17Xqnuu-YdnSocu2kQQ9YmC0r3qUrJCmIa1CA1XKHhY-RGTqC6KJtGRk/pub?output=csv';

const TALENTS_DIR = path.join(__dirname, '..', 'pages', 'talents');

const PLATFORM_ICONS = {
  INSTAGRAM: '../../images/elements/Insta.png',
  YOUTUBE: '../../images/elements/Youtube.png',
  TIKTOK: '../../images/elements/TikTok.png',
  TWITCH: '../../images/elements/Twitch.png'
};
const PLATFORM_ORDER = ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITCH'];

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toUpperCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    headers.forEach((h, idx) => (row[h] = (cols[idx] || '').trim()));
    return row;
  });
}

function parseFollowers(value) {
  if (!value) return 0;
  const n = parseInt(String(value).replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function formatFollowers(n) {
  if (n >= 1000000) {
    const m = Math.round((n / 1000000) * 10) / 10;
    return (Number.isInteger(m) ? m : m) + 'M';
  }
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
}

function findCreator(byNormalizedName, name) {
  const key = normalizeName(name);
  if (byNormalizedName[key]) return byNormalizedName[key];
  const match = Object.keys(byNormalizedName).find(
    (k) => k.includes(key) || key.includes(k)
  );
  return match ? byNormalizedName[match] : null;
}

function buildCardsHtml(row) {
  const cards = PLATFORM_ORDER.map((key) => {
    const n = parseFollowers(row[key]);
    if (n <= 0) return null;
    return (
      '            <div class="platform__card">\n' +
      '              <img src="' + PLATFORM_ICONS[key] + '" alt="">\n' +
      '              <p class="card__text">' + formatFollowers(n) + ' <br>Followers</p>\n' +
      '            </div>'
    );
  }).filter(Boolean);

  return cards.length
    ? cards.join('\n')
    : '            <p class="card__text">Dati non disponibili</p>';
}

async function main() {
  console.log('Scarico il Google Sheet...');
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) throw new Error('Errore HTTP ' + res.status + ' nello scaricare il foglio');
  const csvText = await res.text();

  const rows = parseCSV(csvText);
  const byNormalizedName = {};
  rows.forEach((row) => {
    const key = normalizeName(row.CREATOR);
    if (key) byNormalizedName[key] = row;
  });

  const files = fs.readdirSync(TALENTS_DIR).filter((f) => f.endsWith('.html'));
  let updated = 0;
  let skipped = 0;

  files.forEach((file) => {
    const filePath = path.join(TALENTS_DIR, file);
    let html = fs.readFileSync(filePath, 'utf8');

    const creatorMatch = html.match(/data-creator="([^"]+)"/);
    if (!creatorMatch) {
      console.warn('  [SALTATO] ' + file + ': nessun attributo data-creator trovato');
      skipped++;
      return;
    }
    const creatorName = creatorMatch[1];

    const row = findCreator(byNormalizedName, creatorName);
    if (!row) {
      console.warn('  [SALTATO] ' + file + ': "' + creatorName + '" non trovato nel foglio');
      skipped++;
      return;
    }

    const markerRegex = /<!-- FOLLOWERS:START -->[\s\S]*?<!-- FOLLOWERS:END -->/;
    if (!markerRegex.test(html)) {
      console.warn('  [SALTATO] ' + file + ': marker FOLLOWERS:START/END non trovati');
      skipped++;
      return;
    }

    const newBlock =
      '<!-- FOLLOWERS:START -->\n' + buildCardsHtml(row) + '\n            <!-- FOLLOWERS:END -->';

    html = html.replace(markerRegex, newBlock);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('  [OK] ' + file + ' -> ' + creatorName);
    updated++;
  });

  console.log('\nFatto! Pagine aggiornate: ' + updated + ', saltate: ' + skipped + '.');
}

main().catch((err) => {
  console.error('\nERRORE:', err.message);
  process.exitCode = 1;
});
