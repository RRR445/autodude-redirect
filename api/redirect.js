module.exports = async function handler(req, res) {
  const slot = parseInt(req.query.slot);

  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXl_5Pil_OW6Du4iL5BG7Cnp4_d1eC-2jbfxgS2pax9piqalt0RwAgtyZI6P11bobUQUkkYaOg9RNh/pub?gid=2120963522&single=true&output=csv';

  const response = await fetch(csvUrl);
  const text = await response.text();

  const rows = text.trim().split('\n');
  const cols = rows[slot].split(',');
  const url = cols[3].replace(/"/g, '').trim();

  res.redirect(302, url);
}
