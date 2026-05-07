// Lukee GPT:n generoiman HTML:n EditorialContent-välilehdeltä (solu A1)
// ja servaa sen sellaisenaan GR:lle.
//
// GR-käyttö: {{EXTERNAL `https://handshake-newsletter.vercel.app/api/autodude/content-editorial`}}

const SHEET_ID = '1hjoRWF5HtV-mXlIHdbzyYRUJWQqu_p91zNFohSjxtEI';

module.exports = async function handler(req, res) {
  // EditorialContent-välilehden GID — päivitä tähän oikea GID kun olet luonut välilehden
  // Löydät sen Sheetsin URL:sta: ...#gid=XXXXXXX
  const GID = process.env.EDITORIAL_GID || '';

  if (!GID) {
    res.status(500).send('<p style="font-family:Arial;color:#c00;">Virhe: EDITORIAL_GID ei asetettu Vercel-ympäristömuuttujiin.</p>');
    return;
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('Sheets-haku epäonnistui: ' + response.status);

    const text = await response.text();

    // A1 voi sisältää HTML:ää jossa on pilkkuja ja rivinvaihtoja —
    // CSV-export wrappaa sen lainausmerkkeihin ja escapaa sisäiset "" → """"
    // Parsitaan ensimmäinen solu oikein
    const html = parseFirstCell(text);

    if (!html || html.trim().length < 10) {
      res.status(200).send('<p style="font-family:Arial;color:#888;">Editorial-sisältöä ei ole vielä generoitu. Aja Apps Scriptin generateEditorialEmail().</p>');
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (e) {
    res.status(500).send('<p style="font-family:Arial;color:#c00;">Virhe ladattaessa editorial-sisältöä: ' + e.message + '</p>');
  }
};

function parseFirstCell(csvText) {
  const text = csvText.trim();
  if (!text) return '';
  // Jos solu alkaa lainausmerkillä → quoted field
  if (text.startsWith('"')) {
    let i = 1;
    let result = '';
    while (i < text.length) {
      if (text[i] === '"' && text[i + 1] === '"') {
        result += '"';
        i += 2;
      } else if (text[i] === '"') {
        break;
      } else {
        result += text[i];
        i++;
      }
    }
    return result;
  }
  // Ei lainausmerkkiä — palauta ensimmäinen rivi ensimmäiseen pilkkuun asti
  return text.split(',')[0];
}
