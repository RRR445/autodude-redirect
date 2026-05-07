// Päiväkohtainen viesti — luetaan day_messaging-välilehdeltä Sheetsissä
// ja servataan HTML-blokkina GR:lle reaaliaikaisesti lähetyshetkellä.
//
// GR-käyttö: {{EXTERNAL `https://handshake-newsletter.vercel.app/api/autodude/content-day-message`}}

const SHEET_ID = '1hjoRWF5HtV-mXlIHdbzyYRUJWQqu_p91zNFohSjxtEI';
const GID      = process.env.DAY_MESSAGING_GID || '';  // ← lisää Verceliin

module.exports = async function handler(req, res) {
  if (!GID) {
    res.status(500).send('<p style="font-family:Arial;color:#c00;">DAY_MESSAGING_GID puuttuu Vercel-ympäristömuuttujista.</p>');
    return;
  }

  // Helsinki-aika (UTC+2 talvi / UTC+3 kesä)
  const now          = new Date();
  const offset       = getHelsinkiOffset(now);
  const helsinkiTime = new Date(now.getTime() + offset * 3600 * 1000);
  const dayIndex     = helsinkiTime.getUTCDay(); // 0=Su, 1=Ma, ...
  const dayNames     = ['Sunnuntai','Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai','Lauantai'];
  const todayName    = dayNames[dayIndex];

  try {
    const csvUrl  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    const resp    = await fetch(csvUrl);
    if (!resp.ok) throw new Error('Sheets-haku epäonnistui: ' + resp.status);

    const rows      = parseCSV(await resp.text());
    let dayMessage  = '';
    let deliveryMsg = '';

    for (const row of rows.slice(1)) {
      if (row[0] === todayName) {
        dayMessage  = row[1] || '';
        deliveryMsg = row[2] || '';
        break;
      }
    }

    if (!dayMessage) {
      res.status(200).send('');
      return;
    }

    const GR_LINK_O = '{{LINK `';
    const GR_LINK_C = '`}}';
    function link(url) { return GR_LINK_O + url + GR_LINK_C; }

    let html = '<table width="560" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;max-width:560px;">';
    html += '<tr><td style="padding:12px 0 8px 0;">';
    html += '<p style="margin:0 0 3px 0;font-size:15px;font-weight:bold;color:#111111;">' + esc(dayMessage) + '</p>';
    if (deliveryMsg) {
      html += '<p style="margin:0;font-size:13px;color:#888888;">' + esc(deliveryMsg) + '</p>';
    }
    html += '</td></tr>';
    html += '</table>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (e) {
    res.status(500).send('<p style="font-family:Arial;color:#c00;">Virhe: ' + e.message + '</p>');
  }
};

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getHelsinkiOffset(date) {
  const year     = date.getUTCFullYear();
  const dstStart = lastSundayUTC(year, 2);  // maaliskuun viimeinen su
  const dstEnd   = lastSundayUTC(year, 9);  // lokakuun viimeinen su
  return (date.getTime() >= dstStart && date.getTime() < dstEnd) ? 3 : 2;
}

function lastSundayUTC(year, month) {
  // Viimeinen sunnuntai kuussa (month 0-indeksoitu)
  const d = new Date(Date.UTC(year, month + 1, 0)); // kuun viimeinen päivä
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());      // taaksepäin sunnuntaihin
  return d.getTime();
}

function parseCSV(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (line[i] === ',' && !inQ) {
        cols.push(cur.trim()); cur = '';
      } else {
        cur += line[i];
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}
