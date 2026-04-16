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

  function priceBlock(rawPrice, rawSale, large) {
    const p = parseFloat(rawPrice);
    const s = parseFloat(rawSale);
    const hasDiscount = rawSale && s < p;
    const price = rawPrice.replace(' EUR', ' €');
    const sale = rawSale.replace(' EUR', ' €');
    const mainSize = large ? '22px' : '17px';
    const oldSize = large ? '13px' : '12px';
    if (hasDiscount) {
      return `<span style="text-decoration:line-through;color:#aaa;font-size:${oldSize};font-family:Arial,sans-serif;">${price}</span>&nbsp;<span style="color:#BD4580;font-weight:bold;font-size:${mainSize};font-family:Arial,sans-serif;">${sale}</span>${discountBadge(rawPrice, rawSale)}`;
    }
    return `<span style="color:#BD4580;font-weight:bold;font-size:${mainSize};font-family:Arial,sans-serif;">${price}</span>`;
  }

  function reviewLine(score, count) {
    if (!score) return '';
    return `<p style="margin:0 0 6px 0;font-size:11px;font-family:Arial,sans-serif;">${renderStars(score)}&nbsp;<span style="color:#888;">${parseFloat(score).toFixed(1)} (${count} arvostelua)</span></p>`;
  }

  function aiBullets(aiText) {
    if (!aiText) return '';
    let bullets = [];
    if (aiText.includes(' | ')) {
      bullets = aiText.split(' | ').map(s => s.replace(/^•\s*/, '').trim()).filter(s => s.length > 2);
    } else if (aiText.includes('•')) {
      bullets = aiText.split('•').map(s => s.trim()).filter(s => s.length > 2);
    }
    if (bullets.length > 0) {
      return `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">${bullets.map(s => `<tr><td style="font-size:12px;color:#444;font-family:Arial,sans-serif;padding:2px 4px 2px 0;vertical-align:top;">✓</td><td style="font-size:12px;color:#444;font-family:Arial,sans-serif;padding:2px 0;">${s}</td></tr>`).join('')}</table>`;
    }
    return `<p style="margin:0 0 8px 0;font-size:13px;color:#555;font-family:Arial,sans-serif;font-style:italic;border-left:2px solid #BD4580;padding-left:8px;">${aiText}</p>`;
  }

  // Lue intro (rivi 6) ja kampanja (rivi 7)
  let introText = '';
  let campaignText = '';
  if (rows[6]) { const c = parseRow(rows[6]); if (c[0] === 'INTRO') introText = get(c, 1); }
  if (rows[7]) { const c = parseRow(rows[7]); if (c[0] === 'CAMPAIGN') campaignText = get(c, 1); }

  // Parsitaan kampanjatekstistä pääviesti
  let campaignBanner = '';
  if (campaignText) {
    const tilaMatch = campaignText.match(/TILAA[^!]+!/);
    const aleMatch = campaignText.match(/ALE\s*-[^!K]+/);
    if (tilaMatch) {
      campaignBanner = (aleMatch ? aleMatch[0].trim() + ' · ' : '') + tilaMatch[0].trim();
    } else {
      campaignBanner = campaignText.split('!')[0].trim() + '!';
    }
  }

  // Parsitaan tuotteet
  const products = [];
  for (let slot = 1; slot <= 5; slot++) {
    if (!rows[slot]) continue;
    const cols = parseRow(rows[slot]);
    products.push({
      slot,
      title:       get(cols, 1),
      productUrl:  get(cols, 3) + '?utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-top5&utm_content=slot' + slot,
      imageUrl:    get(cols, 4),
      rawPrice:    get(cols, 5),
      rawSale:     get(cols, 6),
      aiText:      get(cols, 9),
      reviewScore: get(cols, 10),
      reviewCount: get(cols, 12),
    });
  }

  const hero = products[0];
  const rest = products.slice(1);

  let html = `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fff;">
  <tr>
    <td style="padding:20px 20px 14px 20px;border-bottom:3px solid #BD4580;">
      <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#BD4580;font-weight:bold;font-family:Arial,sans-serif;">Näitä tutkitaan poikkeuksellisen paljon</p>
      <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#111;font-family:Arial,sans-serif;line-height:1.3;">👀 Nämä kiinnosti Google haussa eilen!</h2>
      <p style="margin:0;font-size:13px;color:#666;line-height:1.5;font-family:Arial,sans-serif;">${introText}</p>
    </td>
  </tr>
</table>`;

  if (campaignBanner) {
    html += `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#d63737;">
  <tr>
    <td align="center" style="padding:10px 20px;">
      <p style="margin:0;font-size:13px;font-weight:bold;color:#fff;font-family:Arial,sans-serif;">🎁 ${campaignBanner}</p>
    </td>
  </tr>
</table>`;
  }

  if (hero) {
    html += `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fafafa;border-bottom:3px solid #BD4580;">
  <tr>
    <td style="padding:16px 20px 8px 20px;">
      <p style="margin:0;font-size:10px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">🏆 #1 Katsotuimmat tällä viikolla</p>
    </td>
  </tr>
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
            <p style="margin:0 0 6px 0;font-size:15px;font-weight:bold;color:#111;line-height:1.3;font-family:Arial,sans-serif;">${hero.title}</p>
            ${reviewLine(hero.reviewScore, hero.reviewCount)}
            ${aiBullets(hero.aiText)}
            <p style="margin:0 0 12px 0;">${priceBlock(hero.rawPrice, hero.rawSale, true)}</p>
            <a href="${hero.productUrl}" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:10px 22px;border-radius:4px;font-size:13px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso tuote →</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
  }

  rest.forEach((p, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#fafafa';
    const borderBottom = i < rest.length - 1 ? 'border-bottom:1px solid #f0f0f0;' : '';
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
      <p style="margin:0 0 8px 0;text-align:right;">${priceBlock(p.rawPrice, p.rawSale, false)}</p>
      <a href="${p.productUrl}" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:6px 14px;border-radius:4px;font-size:11px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso →</a>
    </td>
  </tr>
</table>`;
  });

  html += `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fff;border-top:1px solid #eee;">
  <tr>
    <td align="center" style="padding:16px 20px;">
      <a href="https://www.autodude.fi/fi/c/autonhoitotuotteet?sort=popularity&utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-top5&utm_content=cta" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:11px 28px;border-radius:4px;font-size:14px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso koko valikoima →</a>
    </td>
  </tr>
</table>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
