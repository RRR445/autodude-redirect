module.exports = async function handler(req, res) {
  const slot = parseInt(req.query.slot) || 1;

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

  const title = cols[1].trim();
  const productUrl = cols[3].trim() + '?utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-top5&utm_content=slot' + slot;
  const imageUrl = cols[4].trim();
  const price = cols[5] ? cols[5].trim().replace(' EUR', ' €') : '';
  const salePrice = cols[6] ? cols[6].trim().replace(' EUR', ' €') : '';

  const priceHtml = salePrice
    ? `<span style="text-decoration:line-through;color:#aaa;font-size:13px;font-family:Arial,sans-serif;">${price}</span>&nbsp;&nbsp;<span style="color:#BD4580;font-weight:bold;font-size:18px;font-family:Arial,sans-serif;">${salePrice}</span>`
    : `<span style="color:#BD4580;font-weight:bold;font-size:18px;font-family:Arial,sans-serif;">${price}</span>`;

  const rankLabel = ['', '🥇 #1 Suosituin', '🥈 #2', '🥉 #3', '⭐ #4', '⭐ #5'][slot] || '#' + slot;

  const html = `<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px auto;border:1px solid #eee;border-radius:8px;overflow:hidden;background:#fff;">
  <tr>
    <td width="130" style="padding:0;vertical-align:top;background:#f9f9f9;">
      <a href="${productUrl}">
        <img src="${imageUrl}" width="130" height="130" style="display:block;object-fit:cover;" alt="${title}">
      </a>
    </td>
    <td style="padding:14px 16px;vertical-align:middle;">
      <p style="margin:0 0 4px 0;font-size:11px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">${rankLabel}</p>
      <p style="margin:0 0 8px 0;font-size:14px;font-weight:bold;color:#222;line-height:1.4;font-family:Arial,sans-serif;">${title}</p>
      <p style="margin:0 0 12px 0;">${priceHtml}</p>
      <a href="${productUrl}" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:8px 20px;border-radius:4px;font-size:13px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso tuote →</a>
    </td>
  </tr>
</table>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
