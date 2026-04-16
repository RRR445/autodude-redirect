module.exports = async function handler(req, res) {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXl_5Pil_OW6Du4iL5BG7Cnp4_d1eC-2jbfxgS2pax9piqalt0RwAgtyZI6P11bobUQUkkYaOg9RNh/pub?gid=2120963522&single=true&output=csv';

  const response = await fetch(csvUrl);
  const text = await response.text();
  const rows = text.trim().split('\n');

  const rankLabels = ['', '🥇 #1 Suosituin', '🥈 #2', '🥉 #3', '⭐ #4', '⭐ #5'];

  function parseRow(row) {
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
    return cols;
  }

  let html = `<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 8px auto;">
  <tr>
    <td align="center" style="padding:24px 0 16px 0;border-bottom:3px solid #BD4580;">
      <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#BD4580;font-weight:bold;font-family:Arial,sans-serif;">Viikon tilastot puhuvat puolestaan</p>
      <h2 style="margin:0;font-size:22px;font-weight:bold;color:#222;font-family:Arial,sans-serif;">🔥 Nämä tuotteet kiinnostavat eniten juuri nyt</h2>
    </td>
  </tr>
</table>`;

  for (let slot = 1; slot <= 5; slot++) {
    if (!rows[slot]) continue;
    const cols = parseRow(rows[slot]);

    const title     = cols[1].trim();
    const productUrl = cols[3].trim() + '?utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-top5&utm_content=slot' + slot;
    const imageUrl  = cols[4].trim();
    const price     = cols[5] ? cols[5].trim().replace(' EUR', ' €') : '';
    const salePrice = cols[6] ? cols[6].trim().replace(' EUR', ' €') : '';
    const aiText    = cols[9] ? cols[9].trim() : '';

    const priceHtml = salePrice
      ? `<span style="text-decoration:line-through;color:#aaa;font-size:13px;font-family:Arial,sans-serif;">${price}</span>&nbsp;&nbsp;<span style="color:#BD4580;font-weight:bold;font-size:18px;font-family:Arial,sans-serif;">${salePrice}</span>`
      : `<span style="color:#BD4580;font-weight:bold;font-size:18px;font-family:Arial,sans-serif;">${price}</span>`;

    const borderBottom = slot < 5 ? 'border-bottom:1px solid #eee;' : '';

    html += `<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;${borderBottom}">
  <tr>
    <td width="110" style="padding:16px 14px 16px 0;vertical-align:top;">
      <a href="${productUrl}">
        <img src="${imageUrl}" width="110" height="110" style="display:block;border-radius:8px;object-fit:cover;" alt="${title}">
      </a>
    </td>
    <td style="padding:16px 0;vertical-align:middle;">
      <p style="margin:0 0 3px 0;font-size:11px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">${rankLabels[slot]}</p>
      <p style="margin:0 0 6px 0;font-size:14px;font-weight:bold;color:#222;line-height:1.4;font-family:Arial,sans-serif;">${title}</p>
      <p style="margin:0 0 8px 0;font-size:13px;color:#555;line-height:1.5;font-family:Arial,sans-serif;font-style:italic;">${aiText}</p>
      <p style="margin:0 0 10px 0;">${priceHtml}</p>
      <a href="${productUrl}" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:8px 20px;border-radius:4px;font-size:13px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso tuote →</a>
    </td>
  </tr>
</table>`;
  }

  html += `<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td align="center" style="padding:20px 0 28px 0;border-top:1px solid #eee;">
      <a href="https://www.autodude.fi/fi/c/autonhoitotuotteet?sort=popularity&utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-top5&utm_content=cta" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:13px 32px;border-radius:4px;font-size:15px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso kaikki suosituimmat →</a>
    </td>
  </tr>
</table>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
