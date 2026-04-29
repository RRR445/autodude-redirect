'use strict';

const SHEET_ID = '1hjoRWF5HtV-mXlIHdbzyYRUJWQqu_p91zNFohSjxtEI';
const GID      = '955363836';
const CSV_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const DEALER_URL = 'https://www.autodude.fi/fi/tuote/autodude_jalleenmyyjat?utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-category&utm_content=weather_cta';

// GR-tagit muuttujina — ei sekoita template literaaleja
const GR_FIRSTNAME = "{{CONTACT `ucfw(subscriber_first_name)`}}";
const GR_LINK_OPEN = "{{LINK `";
const GR_LINK_CLOSE = "`}}";

module.exports = async function handler(req, res) {
  const category  = req.query.category || '';
  const brand     = req.query.brand    || '';
  const firstname = req.query.firstname || '';
  const geoCity   = req.query.geo_city  || '';

  if (!category && !brand) {
    res.status(400).send('Anna category tai brand parametri');
    return;
  }

  // ── Sää ──────────────────────────────────────────────────────────────
  let weatherLine  = '';
  let weatherPromo = '';
  let weatherCta   = '';

  if (geoCity) {
    try {
      const geoRes  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(geoCity)}&count=1&language=fi`);
      const geoData = await geoRes.json();
      const place   = geoData.results && geoData.results[0];
      if (place) {
        const wRes  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weathercode&timezone=Europe%2FHelsinki`);
        const wData = await wRes.json();
        if (wData.current) {
          const temp  = Math.round(wData.current.temperature_2m);
          const code  = wData.current.weathercode;
          const icon  = getWeatherIcon(code);
          weatherLine = `${icon} ${place.name}: ${temp}°C`;
          const promo = getWeatherPromo(code, temp);
          weatherPromo = promo.text;
          weatherCta   = promo.cta;
        }
      }
    } catch (_) { /* ei säätietoa — ei haittaa */ }
  }

  // ── Apufunktiot ───────────────────────────────────────────────────────
  function getWeatherIcon(code) {
    if (code === 0)  return '☀️';
    if (code <= 2)   return '🌤️';
    if (code <= 3)   return '☁️';
    if (code <= 49)  return '🌫️';
    if (code <= 59)  return '🌦️';
    if (code <= 69)  return '🌧️';
    if (code <= 79)  return '❄️';
    if (code <= 82)  return '🌧️';
    if (code <= 99)  return '⛈️';
    return '🌡️';
  }

  function getWeatherPromo(code, temp) {
    if (code >= 50) return {
      text: 'Siellä näyttää olevan melko märkä keli — hyvä hetki tilata pesuvehkeet kotiin odottamaan parempaa. Kun aurinko lopulta paistaa, olet valmis.',
      cta:  ''
    };
    if (code >= 70 || temp < 0) return {
      text: 'Talvikeli käynnissä — auton suojaus ja hoito on nyt tärkeintä. Tilaa tuotteet kotiin, niin pääset hoitamaan auton heti kun keli hellittää.',
      cta:  ''
    };
    if (code >= 3) return {
      text: 'Kuiva keli mutta pilvistä — juuri sopiva hetki pesupuuhiin ilman suoraa auringonpaistetta. Kiillotus onnistuu parhaiten pilvisellä säällä.',
      cta:  ''
    };
    if (temp >= 15) return {
      text: `Täydellinen pesupäivä! ${temp}°C ja aurinkoista — juuri nyt kannattaa hakea autot kuntoon. Jos tuntuu että ollaan myöhässä tämän viestin suhteen, löydät Duden tuotteet sadoilta jälleenmyyjiltä ympäri Suomen.`,
      cta:  'Katso lähin jälleenmyyjäsi →'
    };
    return {
      text: 'Aurinkoinen päivä — vaikka vähän viileää, nyt on huikea hetki käydä auton kimppuun. Oikeat tuotteet tekevät hommasta helpon. Jos tuntuu että ollaan myöhässä tämän viestin suhteen — löydät Duden tuotteet sadoilta jälleenmyyjiltä ympäri Suomen.',
      cta:  'Katso lähin jälleenmyyjäsi →'
    };
  }

  function parseCSVRow(row) {
    const cols = [];
    let cur = '', inQ = false;
    for (const ch of row) {
      if (ch === '"')                   { inQ = !inQ; }
      else if (ch === ',' && !inQ)      { cols.push(cur); cur = ''; }
      else                              { cur += ch; }
    }
    cols.push(cur);
    return cols;
  }

  function col(cols, i) {
    const v = cols[i];
    return v && typeof v.trim === 'function' ? v.trim() : '';
  }

  function stars(score) {
    const n = parseFloat(score);
    if (!n) return '';
    const full = Math.round(n);
    return Array.from({ length: 5 }, (_, i) =>
      i < full
        ? '<span style="color:#BD4580;font-size:12px;">★</span>'
        : '<span style="color:#ddd;font-size:12px;">★</span>'
    ).join('');
  }

  function discountBadge(rawPrice, rawSale) {
    const p = parseFloat(rawPrice), s = parseFloat(rawSale);
    if (!rawSale || s >= p) return '';
    const pct = Math.round((1 - s / p) * 100);
    return `<span style="background:#BD4580;color:#fff;font-size:11px;font-weight:bold;font-family:Arial,sans-serif;padding:2px 7px;border-radius:3px;margin-left:6px;">-${pct}%</span>`;
  }

  function priceBlock(rawPrice, rawSale, large) {
    const p = parseFloat(rawPrice), s = parseFloat(rawSale);
    const hasDiscount = rawSale && s < p;
    const priceStr = rawPrice.replace(' EUR', ' €');
    const saleStr  = rawSale.replace(' EUR', ' €');
    const bigSize  = large ? '22px' : '17px';
    const smSize   = large ? '13px' : '12px';
    if (hasDiscount) return `
      <span style="text-decoration:line-through;color:#aaa;font-size:${smSize};font-family:Arial,sans-serif;">${priceStr}</span>&nbsp;<span style="color:#BD4580;font-weight:bold;font-size:${bigSize};font-family:Arial,sans-serif;">${saleStr}</span>${discountBadge(rawPrice, rawSale)}`;
    return `<span style="color:#BD4580;font-weight:bold;font-size:${bigSize};font-family:Arial,sans-serif;">${priceStr}</span>`;
  }

  function reviewRow(score, count) {
    if (!score) return '';
    return `
      <p style="margin:0 0 6px 0;font-size:11px;font-family:Arial,sans-serif;">
        ${stars(score)}&nbsp;<span style="color:#888;">${parseFloat(score).toFixed(1)} (${count} arvostelua)</span>
      </p>`;
  }

  function aiBullets(aiText) {
    if (!aiText) return '';
    let bullets = [];
    if (aiText.includes(' | '))
      bullets = aiText.split(' | ').map(s => s.replace(/^•\s*/, '').trim()).filter(s => s.length > 2);
    else if (aiText.includes('•'))
      bullets = aiText.split('•').map(s => s.trim()).filter(s => s.length > 2);

    if (bullets.length > 0) return `
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
        ${bullets.map(b => `
        <tr>
          <td style="font-size:12px;color:#444;font-family:Arial,sans-serif;padding:2px 4px 2px 0;vertical-align:top;">✓</td>
          <td style="font-size:12px;color:#444;font-family:Arial,sans-serif;padding:2px 0;">${b}</td>
        </tr>`).join('')}
      </table>`;

    return `<p style="margin:0 0 8px 0;font-size:13px;color:#555;font-family:Arial,sans-serif;font-style:italic;border-left:2px solid #BD4580;padding-left:8px;">${aiText}</p>`;
  }

  // ── CSV → tuotteet ────────────────────────────────────────────────────
  const csvText = await (await fetch(CSV_URL)).text();
  const rows    = csvText.trim().split('\n');
  const hdrs    = parseCSVRow(rows[0]);
  const catCol  = hdrs.indexOf('Category');
  const bndCol  = hdrs.indexOf('Brand');
  const aiCol   = hdrs.indexOf('AI Text');

  const products = [];
  for (let i = 1; i < rows.length && products.length < 5; i++) {
    if (!rows[i]) continue;
    const c = parseCSVRow(rows[i]);
    const matchCat   = category && col(c, catCol).toLowerCase() === category.toLowerCase();
    const matchBrand = brand    && col(c, bndCol).toLowerCase().includes(brand.toLowerCase());
    if (!matchCat && !matchBrand) continue;
    const slot = products.length + 1;
    products.push({
      slot,
      title:       col(c, 1),
      productUrl:  col(c, 3) + `?utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-category&utm_content=slot${slot}`,
      imageUrl:    col(c, 4),
      rawPrice:    col(c, 5),
      rawSale:     col(c, 6),
      aiText:      col(c, aiCol),
      reviewScore: col(c, 11),
      reviewCount: col(c, 13),
    });
  }

  // ── HTML ──────────────────────────────────────────────────────────────
  const label    = category || brand;
  const today    = new Date().toLocaleDateString('fi-FI');
  const nameText = firstname || GR_FIRSTNAME;
  const title    = `Moro ${nameText}! Nämä on juuri nyt suosiossa — ettei vaan naapurin Pertti oo jo tilannut 👀`;

  function heroHTML(p) {
    return `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fafafa;border-bottom:3px solid #BD4580;">
  <tr>
    <td style="padding:8px 20px 20px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="160" style="vertical-align:middle;padding-right:16px;">
            <a href="${GR_LINK_OPEN}${p.productUrl}${GR_LINK_CLOSE}">
              <img src="${p.imageUrl}" width="160" height="160" style="display:block;border-radius:8px;object-fit:cover;" alt="${p.title}">
            </a>
          </td>
          <td style="vertical-align:top;">
            <p style="margin:0 0 4px 0;font-size:9px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">🏆 #1</p>
            <p style="margin:0 0 6px 0;font-size:15px;font-weight:bold;color:#111;line-height:1.3;font-family:Arial,sans-serif;">${p.title}</p>
            ${reviewRow(p.reviewScore, p.reviewCount)}
            ${aiBullets(p.aiText)}
            <p style="margin:0 0 12px 0;">${priceBlock(p.rawPrice, p.rawSale, true)}</p>
            <a href="${GR_LINK_OPEN}${p.productUrl}${GR_LINK_CLOSE}"
               style="background-color:#BD4580;color:#fff;text-decoration:none;padding:10px 22px;border-radius:4px;font-size:13px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">
              Katso tuote →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
  }

  function listItemHTML(p, idx, total) {
    const bg     = idx % 2 === 0 ? '#fff' : '#fafafa';
    const border = idx < total - 1 ? 'border-bottom:1px solid #f0f0f0;' : '';
    return `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:${bg};${border}">
  <tr>
    <td width="80" style="padding:10px 10px 10px 20px;vertical-align:middle;">
      <a href="${GR_LINK_OPEN}${p.productUrl}${GR_LINK_CLOSE}">
        <img src="${p.imageUrl}" width="75" height="75" style="display:block;border-radius:6px;object-fit:cover;" alt="${p.title}">
      </a>
    </td>
    <td style="padding:10px 0;vertical-align:middle;">
      <p style="margin:0 0 2px 0;font-size:9px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">#${p.slot}</p>
      <p style="margin:0 0 3px 0;font-size:13px;font-weight:bold;color:#111;line-height:1.3;font-family:Arial,sans-serif;">${p.title}</p>
      ${reviewRow(p.reviewScore, p.reviewCount)}
    </td>
    <td width="130" style="padding:10px 20px 10px 8px;vertical-align:middle;text-align:right;white-space:nowrap;">
      <p style="margin:0 0 8px 0;text-align:right;">${priceBlock(p.rawPrice, p.rawSale, false)}</p>
      <a href="${GR_LINK_OPEN}${p.productUrl}${GR_LINK_CLOSE}"
         style="background-color:#BD4580;color:#fff;text-decoration:none;padding:6px 14px;border-radius:4px;font-size:11px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">
        Katso →
      </a>
    </td>
  </tr>
</table>`;
  }

  const html = `
<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fff;">
  <tr>
    <td style="padding:20px 20px 14px 20px;border-bottom:3px solid #BD4580;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#BD4580;font-weight:bold;font-family:Arial,sans-serif;">
              Suosituimmat — ${label}
            </p>
            <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#111;font-family:Arial,sans-serif;line-height:1.3;">
              ${title}
            </h2>
            ${weatherLine  ? `<p style="margin:0 0 6px 0;font-size:12px;color:#888;font-family:Arial,sans-serif;">${weatherLine}</p>` : ''}
            ${weatherPromo ? `<p style="margin:0 0 8px 0;font-size:13px;color:#555;line-height:1.5;font-family:Arial,sans-serif;">${weatherPromo}</p>` : ''}
            ${weatherCta   ? `<a href="${GR_LINK_OPEN}${DEALER_URL}${GR_LINK_CLOSE}"
                                style="display:inline-block;background:#BD4580;color:#fff;text-decoration:none;padding:8px 18px;border-radius:4px;font-size:12px;font-weight:bold;font-family:Arial,sans-serif;">
                                ${weatherCta}
                              </a>` : ''}
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:12px;">
            <p style="margin:0;font-size:10px;color:#bbb;font-family:Arial,sans-serif;">Päivitetty ${today}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

${products.length === 0
  ? `<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fff;">
       <tr><td style="padding:20px;font-family:Arial,sans-serif;color:#888;">Ei tuotteita tässä kategoriassa tällä hetkellä.</td></tr>
     </table>`
  : heroHTML(products[0]) + products.slice(1).map((p, i) => listItemHTML(p, i, products.length - 1)).join('')
}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
