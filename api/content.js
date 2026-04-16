module.exports = async function handler(req, res) {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXl_5Pil_OW6Du4iL5BG7Cnp4_d1eC-2jbfxgS2pax9piqalt0RwAgtyZI6P11bobUQUkkYaOg9RNh/pub?gid=2120963522&single=true&output=csv';

  const response = await fetch(csvUrl);
  const text = await response.text();
  const rows = text.trim().split('\n');

  const rankLabels = ['', '🥇 #1 Suosituin', '🥈 #2', '🥉 #3', '⭐ #4', '⭐ #5'];

  const monthNames = ['tammikuuta','helmikuuta','maaliskuuta','huhtikuuta','toukokuuta',
    'kesäkuuta','heinäkuuta','elokuuta','syyskuuta','lokakuuta','marraskuuta','joulukuuta'];
  const monthName = monthNames[new Date().getMonth()];

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

  let html = `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fff;">
  <tr>
    <td style="padding:28px 24px 20px 24px;border-bottom:3px solid #BD4580;">
      <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#BD4580;font-weight:bold;font-family:Arial,sans-serif;">Viikon tilastot puhuvat puolestaan</p>
      <h2 style="margin:0 0 12px 0;font-size:24px;font-weight:bold;color:#111;font-family:Arial,sans-serif;line-height:1.3;">🔥 Nämä tuotteet kiinnostavat eniten juuri nyt</h2>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.6;font-family:Arial,sans-serif;">Emme arvaa — me katsomme dataa. Nämä ovat ne tuotteet, joita muut autoilijat ovat selailleet eniten tänä ${monthName}. Jos olet miettinyt auton hoitoa, nämä kannattaa katsoa ensin.</p>
    </td>
  </tr>
</table>`;

  for (let slot = 1; slot <= 5; slot++) {
    if (!rows[slot]) continue;
    const cols = parseRow(rows[slot]);

    const title      = cols[1].trim();
    const productUrl = cols[3].trim() + '?utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-top5&utm_content=slot' + slot;
    const imageUrl   = cols[4].trim();
    const rawPrice   = cols[5] ? cols[5].trim() : '';
    const rawSale    = cols[6] ? cols[6].trim() : '';
    const aiText     = cols[9] ? cols[9].trim() : '';

    const priceNum   = parseFloat(rawPrice);
    const saleNum    = parseFloat(rawSale);
    const hasDiscount = rawSale && saleNum < priceNum;

    const price    = rawPrice.replace(' EUR', ' €');
    const salePrice = rawSale.replace(' EUR', ' €');

    const priceHtml = hasDiscount
      ? `<span style="text-decoration:line-through;color:#aaa;font-size:13px;font-family:Arial,sans-serif;">${price}</span>&nbsp;&nbsp;<span style="color:#BD4580;font-weight:bold;font-size:20px;font-family:Arial,sans-serif;">${salePrice}</span>`
      : `<span style="color:#BD4580;font-weight:bold;font-size:20px;font-family:Arial,sans-serif;">${price}</span>`;

    const borderBottom = slot < 5 ? 'border-bottom:1px solid #f0f0f0;' : '';

    html += `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;${borderBottom}">
  <tr>
    <td width="120" style="padding:20px 16px 20px 24px;vertical-align:top;">
      <a href="${productUrl}">
        <img src="${imageUrl}" width="120" height="120" style="display:block;border-radius:8px;object-fit:cover;" alt="${title}">
      </a>
    </td>
    <td style="padding:20px 24px 20px 0;vertical-align:middle;">
      <p style="margin:0 0 4px 0;font-size:11px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">${rankLabels[slot]}</p>
      <p style="margin:0 0 8px 0;font-size:15px;font-weight:bold;color:#111;line-height:1.4;font-family:Arial,sans-serif;">${title}</p>
      <p style="margin:0 0 12px 0;font-size:13px;color:#555;line-height:1.6;font-family:Arial,sans-serif;font-style:italic;border-left:3px solid #BD4580;padding-left:10px;">${aiText}</p>
      <p style="margin:0 0 14px 0;">${priceHtml}</p>
      <a href="${productUrl}" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:9px 22px;border-radius:4px;font-size:13px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso tuote →</a>
    </td>
  </tr>
</table>`;
  }

  html += `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fafafa;border-top:1px solid #eee;">
  <tr>
    <td align="center" style="padding:24px;">
      <p style="margin:0 0 14px 0;font-size:13px;color:#777;font-family:Arial,sans-serif;">Haluatko nähdä koko valikoiman suosituimmat?</p>
      <a href="https://www.autodude.fi/fi/c/autonhoitotuotteet?sort=popularity&utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-top5&utm_content=cta" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:13px 36px;border-radius:4px;font-size:15px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso kaikki suosituimmat →</a>
    </td>
  </tr>
</table>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
