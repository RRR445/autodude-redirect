// GR-tagit muuttujina — ei sekoita JS template literaaleja
const GR_LINK_O = '{{LINK `';
const GR_LINK_C = '`}}';

module.exports = async function handler(req, res) {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXl_5Pil_OW6Du4iL5BG7Cnp4_d1eC-2jbfxgS2pax9piqalt0RwAgtyZI6P11bobUQUkkYaOg9RNh/pub?gid=2120963522&single=true&output=csv';

  const response = await fetch(csvUrl);
  const text = await response.text();
  const rows = text.trim().split('\n');

  function parseRow(row) {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '"') { inQuotes = !inQuotes; }
      else if (row[i] === ',' && !inQuotes) { cols.push(current); current = ''; }
      else { current += row[i]; }
    }
    cols.push(current);
    return cols;
  }

  function get(cols, i) {
    return (cols[i] && typeof cols[i].trim === 'function') ? cols[i].trim() : '';
  }

  function link(url) {
    return GR_LINK_O + url + GR_LINK_C;
  }

  function renderStars(score) {
    const num = parseFloat(score);
    if (!num) return '';
    const full = Math.round(num);
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < full
        ? '<span style="color:#BD4580;font-size:11px;">★</span>'
        : '<span style="color:#ddd;font-size:11px;">★</span>';
    }
    return stars;
  }

  function priceBlock(rawPrice, rawSale) {
    const p = parseFloat(rawPrice);
    const s = parseFloat(rawSale);
    const hasDiscount = rawSale && s < p;
    const price = rawPrice.replace(' EUR', ' €');
    const sale  = rawSale.replace(' EUR', ' €');
    if (hasDiscount) {
      const pct = Math.round((1 - s / p) * 100);
      return `<span style="text-decoration:line-through;color:#aaa;font-size:11px;font-family:Arial,sans-serif;">${price}</span>&nbsp;<span style="color:#BD4580;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;">${sale}</span>&nbsp;<span style="background:#BD4580;color:#fff;font-size:10px;font-weight:bold;font-family:Arial,sans-serif;padding:1px 5px;border-radius:3px;">-${pct}%</span>`;
    }
    return `<span style="color:#BD4580;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;">${price}</span>`;
  }

  const products = [];
  for (let slot = 1; slot <= 5; slot++) {
    if (!rows[slot]) continue;
    const cols = parseRow(rows[slot]);
    products.push({
      slot,
      title:       get(cols, 1),
      productUrl:  get(cols, 3),
      imageUrl:    get(cols, 4),
      rawPrice:    get(cols, 5),
      rawSale:     get(cols, 6),
      reviewScore: get(cols, 10),
      reviewCount: get(cols, 12),
    });
  }

  let html = '';

  products.forEach((p, i) => {
    const bg           = i % 2 === 0 ? '#fff' : '#fafafa';
    const borderBottom = i < products.length - 1 ? 'border-bottom:1px solid #f0f0f0;' : '';
    const reviewHtml   = p.reviewScore
      ? `<span style="font-size:10px;color:#888;font-family:Arial,sans-serif;">${renderStars(p.reviewScore)}&nbsp;${parseFloat(p.reviewScore).toFixed(1)}</span>`
      : '';

    html += `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:${bg};${borderBottom}">
  <tr>
    <td width="70" style="padding:10px 10px 10px 16px;vertical-align:middle;">
      <a href="${link(p.productUrl)}">
        <img src="${p.imageUrl}" width="60" height="60" style="display:block;border-radius:5px;object-fit:cover;" alt="${p.title}">
      </a>
    </td>
    <td style="padding:10px 8px;vertical-align:middle;">
      <p style="margin:0 0 2px 0;font-size:12px;font-weight:bold;color:#111;line-height:1.3;font-family:Arial,sans-serif;">${p.title}</p>
      ${reviewHtml}
    </td>
    <td width="140" style="padding:10px 16px 10px 8px;vertical-align:middle;text-align:right;white-space:nowrap;">
      <p style="margin:0 0 6px 0;">${priceBlock(p.rawPrice, p.rawSale)}</p>
      <a href="${link(p.productUrl)}" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:5px 12px;border-radius:3px;font-size:11px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso →</a>
    </td>
  </tr>
</table>`;
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
