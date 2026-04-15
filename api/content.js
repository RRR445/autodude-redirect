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
    ? `<span style="text-decoration:line-through;color:#999;font-size:12px;">${price}</span>&nbsp;<span style="color:#BD4580;font-weight:bold;font-size:15px;">${salePrice}</span>`
    : `<span style="color:#BD4580;font-weight:bold;font-size:15px;">${price}</span>`;

  const html = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
  <tr>
    <td width="90" style="padding:0 14px 0 0;vertical-align:top;">
      <a href="${productUrl}"><img src="${imageUrl}" width="90" height="90" style="display:block;border-radius:6px;object-fit:cover;" alt="${title}"></a>
    </td>
    <td style="vertical-align:middle;">
      <p style="margin:0 0 4px 0;font-size:14px;font-weight:bold;color:#222;font-family:Arial,sans-serif;">${title}</p>
      <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;">${priceHtml}</p>
      <a href="${productUrl}" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:7px 16px;border-radius:4px;font-size:13px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso tuote →</a>
    </td>
  </tr>
</table>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
