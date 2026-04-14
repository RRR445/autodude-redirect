module.exports = async function handler(req, res) {
  const slot = parseInt(req.query.slot) || 1;
  const type = req.query.type || 'link';

  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXl_5Pil_OW6Du4iL5BG7Cnp4_d1eC-2jbfxgS2pax9piqalt0RwAgtyZI6P11bobUQUkkYaOg9RNh/pub?gid=2120963522&single=true&output=csv';

  const response = await fetch(csvUrl);
  const text = await response.text();

  const rows = text.trim().split('\n');
  const row = rows[slot];

  const cols = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '"') {
      inQuotes = !inQuotes;
    } else if (row[i] === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += row[i];
    }
  }
  cols.push(current);

  if (type === 'image') {
    const imageUrl = cols[4].trim();
    res.redirect(302, imageUrl);
  } else {
    const url = cols[3].trim();
    res.redirect(302, url);
  }
}
