export default async function handler(req, res) {
  const slot = parseInt(req.query.slot);

  const SHEET_ID = '1hjoRWF5HtV-mXlIHdbzyYRUJWQqu_p91zNFohSjxtEI';
  const GID = '2120963522';

  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
  const response = await fetch(csvUrl);
  const text = await response.text();

  const rows = text.trim().split('\n').map(r => r.match(/(".*?"|[^,]+)/g).map(v => v.replace(/"/g, '')));
  const url = rows[slot][3];

  res.redirect(302, url);
}
