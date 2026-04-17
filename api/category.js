module.exports = async function handler(req, res) {
  const SHEET_ID = '1hjoRWF5HtV-mXlIHdbzyYRUJWQqu_p91zNFohSjxtEI';
  const GID = 'TÄHÄN_TOPPRODUCTS_GID'; // Haetaan Sheetsistä

  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

  // Lue kategoria URL-parametrista
  const category = req.query.category || '';
  const brand = req.query.brand || '';

  if (!category && !brand) {
    res.status(400).send('Anna category tai brand parametri');
    return;
  }

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

  // Parsitaan tuotteet ja filtteröidään kategorian mukaan
  const headers = parseRow(rows[0]);
  const categoryCol = headers.indexOf('Category');
  const brandCol = headers.indexOf('Brand');

  const products = [];
  for (let i = 1; i < rows.length && products.length < 5; i++) {
    if (!rows[i]) continue;
    const cols = parseRow(rows[i]);
    const rowCategory = get(cols, categoryCol);
    const rowBrand = get(cols, brandCol);

    const matchCategory = category && rowCategory.toLowerCase() === category.toLowerCase();
    const matchBrand = brand && rowBrand.toLowerCase().includes(brand.toLowerCase());

    if (matchCategory || matchBrand) {
      products.push({
        slot: products.length + 1,
        title:       get(cols, 1),
        productUrl:  get(cols, 3) + `?utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-category&utm_content=slot${products.length + 1}`,
        imageUrl:    get(cols, 4),
        rawPrice:    get(cols, 5),
        rawSale:     get(cols, 6),
        aiText:      get(cols, 9),
        category:    rowCategory,
        reviewScore: get(cols, 11),
        reviewCount: get(cols, 13),
      });
    }
  }

  function renderStars(score) {
    const num = parseFloat(score);
    if (!num) return '';
    const full = Math.round(num);
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < full ? '<span style="color:#BD4580;font-size:12px;">★</span>' : '<span style="color:#ddd;font-size:12px;">★</span>';
    }
    return stars;
  }

  function discountBadge(rawPrice, rawSale) {
    const p = parseFloat(rawPrice);
    const s = parseFloat(rawSale);
    if (!rawSale || s >= p) return '';
    const pct = Math.round((1 - s / p) * 100);
    return `<span style="background:#BD4580;color:#fff;font-size:11px;font-weight:bold;font-family:Arial,sans-serif;padding:2px 7px;border-radius:3px;margin-left:6px;">-${pct}%</span>`;
  }

  function priceBlock(rawPrice, rawSale) {
    const p = parseFloat(rawPrice);
    const s = parseFloat(rawSale);
    const hasDiscount = rawSale && s < p;
    const price = rawPrice.replace(' EUR', ' €');
    const sale = rawSale.replace(' EUR', ' €');
    if (hasDiscount) {
      return `<span style="text-decoration:line-through;color:#aaa;font-size:12px;font-family:Arial,sans-serif;">${price}</span>&nbsp;<span style="color:#BD4580;font-weight:bold;font-size:17px;font-family:Arial,sans-serif;">${sale}</span>${discountBadge(rawPrice, rawSale)}`;
    }
    return `<span style="color:#BD4580;font-weight:bold;font-size:17px;font-family:Arial,sans-serif;">${price}</span>`;
  }

  function reviewLine(score, count) {
    if (!score) return '';
    return `<p style="margin:0 0 6px 0;font-size:11px;font-family:Arial,sans-serif;">${renderStars(score)}&nbsp;<span style="color:#888;">${parseFloat(score).toFixed(1)} (${count} arvostelua)</span></p>`;
  }

  const label = category || brand;
  const today = new Date().toLocaleDateString('fi-FI');

  let html = `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fff;">
  <tr>
    <td style="padding:20px 20px 14px 20px;border-bottom:3px solid #BD4580;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#BD4580;font-weight:bold;font-family:Arial,sans-serif;">Suosituimmat — ${label}</p>
            <h2 style="margin:0;font-size:20px;font-weight:bold;color:#111;font-family:Arial,sans-serif;line-height:1.3;">👀 Eniten katsotut tällä hetkellä</h2>
          </td>
          <td style="vertical-align:bottom;text-align:right;white-space:nowrap;padding-left:12px;">
            <p style="margin:0;font-size:10px;color:#bbb;font-family:Arial,sans-serif;">Päivitetty ${today}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  if (products.length === 0) {
    html += `<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fff;"><tr><td style="padding:20px;font-family:Arial,sans-serif;color:#888;">Ei tuotteita tässä kategoriassa tällä hetkellä.</td></tr></table>`;
  } else {
    // Hero
    const hero = products[0];
    html += `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fafafa;border-bottom:3px solid #BD4580;">
  <tr>
    <td style="padding:8px 20px 20px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="160" style="vertical-align:middle;padding-right:16px;">
            <a href="${hero.productUrl}">
              <img src="${hero.imageUrl}" width="160" height="160" style="display:block;border-radius:8px;object-fit:cover;" alt="${hero.title}">
            </a>
          </td>
          <td style="vertical-align:top;">
            <p style="margin:0 0 4px 0;font-size:9px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">#1</p>
            <p style="margin:0 0 6px 0;font-size:15px;font-weight:bold;color:#111;line-height:1.3;font-family:Arial,sans-serif;">${hero.title}</p>
            ${reviewLine(hero.reviewScore, hero.reviewCount)}
            <p style="margin:0 0 12px 0;">${priceBlock(hero.rawPrice, hero.rawSale)}</p>
            <a href="${hero.productUrl}" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:10px 22px;border-radius:4px;font-size:13px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso tuote →</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

    // Loput
    products.slice(1).forEach((p, i) => {
      const bg = i % 2 === 0 ? '#fff' : '#fafafa';
      const borderBottom = i < products.length - 2 ? 'border-bottom:1px solid #f0f0f0;' : '';
      html += `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:${bg};${borderBottom}">
  <tr>
    <td width="80" style="padding:10px 10px 10px 20px;vertical-align:middle;">
      <a href="${p.productUrl}">
        <img src="${p.imageUrl}" width="75" height="75" style="display:block;border-radius:6px;object-fit:cover;" alt="${p.title}">
      </a>
    </td>
    <td style="padding:10px 0;vertical-align:middle;">
      <p style="margin:0 0 2px 0;font-size:9px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">#${p.slot}</p>
      <p style="margin:0 0 3px 0;font-size:13px;font-weight:bold;color:#111;line-height:1.3;font-family:Arial,sans-serif;">${p.title}</p>
      ${reviewLine(p.reviewScore, p.reviewCount)}
    </td>
    <td width="130" style="padding:10px 20px 10px 8px;vertical-align:middle;text-align:right;white-space:nowrap;">
      <p style="margin:0 0 8px 0;text-align:right;">${priceBlock(p.rawPrice, p.rawSale)}</p>
      <a href="${p.productUrl}" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:6px 14px;border-radius:4px;font-size:11px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso →</a>
    </td>
  </tr>
</table>`;
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
