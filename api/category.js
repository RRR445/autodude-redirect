module.exports = async function handler(req, res) {
  const SHEET_ID = '1hjoRWF5HtV-mXlIHdbzyYRUJWQqu_p91zNFohSjxtEI';
  const GID = '955363836';

  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

  const category  = req.query.category || '';
  const brand     = req.query.brand || '';
  const firstname = req.query.firstname || '';
  const geoCity   = req.query.geo_city || '';

  if (!category && !brand) {
    res.status(400).send('Anna category tai brand parametri');
    return;
  }

  let weatherLine = '';
  let weatherPromo = '';
  let weatherCta = '';

  if (geoCity) {
    try {
      const geoResp = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(geoCity) + '&count=1&language=fi');
      const geoData = await geoResp.json();
      if (geoData.results && geoData.results[0]) {
        const lat = geoData.results[0].latitude;
        const lon = geoData.results[0].longitude;
        const cityName = geoData.results[0].name;
        const weatherResp = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weathercode&timezone=Europe%2FHelsinki');
        const weatherData = await weatherResp.json();
        if (weatherData.current) {
          const temp = Math.round(weatherData.current.temperature_2m);
          const code = weatherData.current.weathercode;
          weatherLine = weatherIcon(code) + ' ' + cityName + ': ' + temp + '\u00b0C';
          const promo = weatherSalesText(code, temp);
          weatherPromo = promo.text;
          weatherCta = promo.cta;
        }
      }
    } catch(e) {
      weatherLine = '';
    }
  }

  function weatherIcon(code) {
    if (code === 0) return '\u2600\ufe0f';
    if (code <= 2) return '\ud83c\udf24\ufe0f';
    if (code <= 3) return '\u2601\ufe0f';
    if (code <= 49) return '\ud83c\udf2b\ufe0f';
    if (code <= 59) return '\ud83c\udf26\ufe0f';
    if (code <= 69) return '\ud83c\udf27\ufe0f';
    if (code <= 79) return '\u2744\ufe0f';
    if (code <= 82) return '\ud83c\udf27\ufe0f';
    if (code <= 99) return '\u26c8\ufe0f';
    return '\ud83c\udf21\ufe0f';
  }

  function weatherSalesText(code, temp) {
    if (code >= 50) {
      return {
        text: 'Siell\u00e4 n\u00e4ytt\u00e4\u00e4 olevan melko m\u00e4rk\u00e4 keli \u2014 hyv\u00e4 hetki tilata pesuvehkeet kotiin odottamaan parempaa. Kun aurinko lopulta paistaa, olet valmis.',
        cta: ''
      };
    }
    if (code >= 70 || temp < 0) {
      return {
        text: 'Talvikeli k\u00e4ynniss\u00e4 \u2014 auton suojaus ja hoito on nyt t\u00e4rkeint\u00e4. Tilaa tuotteet kotiin, niin p\u00e4\u00e4set hoitamaan auton heti kun keli hellitt\u00e4\u00e4.',
        cta: ''
      };
    }
    if (code >= 3) {
      return {
        text: 'Kuiva keli mutta pilvista \u2014 juuri sopiva hetki pesupuuhiin ilman suoraa auringonpaistetta. Kiillotus onnistuu parhaiten pilvisell\u00e4 s\u00e4\u00e4ll\u00e4.',
        cta: ''
      };
    }
    if (temp >= 15) {
      return {
        text: 'T\u00e4ydellinen pesup\u00e4iv\u00e4! ' + temp + '\u00b0C ja aurinkoista \u2014 juuri nyt kannattaa hakea autot kuntoon. Jos tuntuu ett\u00e4 ollaan my\u00f6h\u00e4ss\u00e4 t\u00e4m\u00e4n viestin suhteen, l\u00f6yd\u00e4t Duden tuotteet sadoilta j\u00e4lleenmyyjilt\u00e4 ymp\u00e4ri Suomen.',
        cta: 'Katso l\u00e4hin j\u00e4lleenmyyjasi \u2192'
      };
    }
    return {
      text: 'Aurinkoinen p\u00e4iv\u00e4 \u2014 vaikka v\u00e4h\u00e4n viile\u00e4\u00e4, nyt on huikea hetki k\u00e4yd\u00e4 auton kimppuun. Oikeat tuotteet tekev\u00e4t hommasta helpon. Jos tuntuu ett\u00e4 ollaan my\u00f6h\u00e4ss\u00e4 t\u00e4m\u00e4n viestin suhteen \u2014 l\u00f6yd\u00e4t Duden tuotteet sadoilta j\u00e4lleenmyyjilt\u00e4 ymp\u00e4ri Suomen.',
      cta: 'Katso l\u00e4hin j\u00e4lleenmyyjasi \u2192'
    };
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

  function renderStars(score) {
    const num = parseFloat(score);
    if (!num) return '';
    const full = Math.round(num);
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < full
        ? '<span style="color:#BD4580;font-size:12px;">\u2605</span>'
        : '<span style="color:#ddd;font-size:12px;">\u2605</span>';
    }
    return stars;
  }

  function discountBadge(rawPrice, rawSale) {
    const p = parseFloat(rawPrice);
    const s = parseFloat(rawSale);
    if (!rawSale || s >= p) return '';
    const pct = Math.round((1 - s / p) * 100);
    return '<span style="background:#BD4580;color:#fff;font-size:11px;font-weight:bold;font-family:Arial,sans-serif;padding:2px 7px;border-radius:3px;margin-left:6px;">-' + pct + '%</span>';
  }

  function priceBlock(rawPrice, rawSale, large) {
    const p = parseFloat(rawPrice);
    const s = parseFloat(rawSale);
    const hasDiscount = rawSale && s < p;
    const price = rawPrice.replace(' EUR', ' \u20ac');
    const sale = rawSale.replace(' EUR', ' \u20ac');
    const mainSize = large ? '22px' : '17px';
    const oldSize = large ? '13px' : '12px';
    if (hasDiscount) {
      return '<span style="text-decoration:line-through;color:#aaa;font-size:' + oldSize + ';font-family:Arial,sans-serif;">' + price + '</span>&nbsp;<span style="color:#BD4580;font-weight:bold;font-size:' + mainSize + ';font-family:Arial,sans-serif;">' + sale + '</span>' + discountBadge(rawPrice, rawSale);
    }
    return '<span style="color:#BD4580;font-weight:bold;font-size:' + mainSize + ';font-family:Arial,sans-serif;">' + price + '</span>';
  }

  function reviewLine(score, count) {
    if (!score) return '';
    return '<p style="margin:0 0 6px 0;font-size:11px;font-family:Arial,sans-serif;">' + renderStars(score) + '&nbsp;<span style="color:#888;">' + parseFloat(score).toFixed(1) + ' (' + count + ' arvostelua)</span></p>';
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
      return '<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">' + bullets.map(s => '<tr><td style="font-size:12px;color:#444;font-family:Arial,sans-serif;padding:2px 4px 2px 0;vertical-align:top;">\u2713</td><td style="font-size:12px;color:#444;font-family:Arial,sans-serif;padding:2px 0;">' + s + '</td></tr>').join('') + '</table>';
    }
    return '<p style="margin:0 0 8px 0;font-size:13px;color:#555;font-family:Arial,sans-serif;font-style:italic;border-left:2px solid #BD4580;padding-left:8px;">' + aiText + '</p>';
  }

  const headers = parseRow(rows[0]);
  const categoryCol = headers.indexOf('Category');
  const brandCol    = headers.indexOf('Brand');
  const aiTextCol   = headers.indexOf('AI Text');

  const products = [];
  for (let i = 1; i < rows.length && products.length < 5; i++) {
    if (!rows[i]) continue;
    const cols = parseRow(rows[i]);
    const rowCategory = get(cols, categoryCol);
    const rowBrand    = get(cols, brandCol);
    const matchCategory = category && rowCategory.toLowerCase() === category.toLowerCase();
    const matchBrand    = brand && rowBrand.toLowerCase().includes(brand.toLowerCase());
    if (matchCategory || matchBrand) {
      products.push({
        slot:        products.length + 1,
        title:       get(cols, 1),
        productUrl:  get(cols, 3) + '?utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-category&utm_content=slot' + (products.length + 1),
        imageUrl:    get(cols, 4),
        rawPrice:    get(cols, 5),
        rawSale:     get(cols, 6),
        aiText:      get(cols, aiTextCol),
        reviewScore: get(cols, 11),
        reviewCount: get(cols, 13),
      });
    }
  }

  const label = category || brand;
  const today = new Date().toLocaleDateString('fi-FI');
  const dealerUrl = 'https://www.autodude.fi/fi/tuote/autodude_jalleenmyyjat?utm_source=gr&utm_medium=email&utm_campaign=AD.FIa-category&utm_content=weather_cta';

  // Käytetään GR CONTACT-tagia suoraan — ei template literal backtickejä
  const contactTag = '{{CONTACT `ucfw(subscriber_first_name)`}}';
  const funTitle = firstname
    ? 'Moro ' + firstname + '! N\u00e4m\u00e4 on juuri nyt suosiossa \u2014 ett\u00e4 vaan naapurin Pertti oo jo tilannut \ud83d\udc40'
    : 'Moro ' + contactTag + '! N\u00e4m\u00e4 on juuri nyt suosiossa \u2014 ett\u00e4 vaan naapurin Pertti oo jo tilannut \ud83d\udc40';

  const contactTest = 'CONTACT testi: ' + contactTag;
  const linkV1open = '{{LINK `';
  const linkV1close = '`}}';
  const linkV2open = "{{LINK '";
  const linkV2close = "'}}";

  let html = '<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fff;">' +
  '<tr><td style="padding:20px 20px 14px 20px;border-bottom:3px solid #BD4580;">' +
  '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>' +
  '<p style="margin:0 0 4px 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#BD4580;font-weight:bold;font-family:Arial,sans-serif;">Suosituimmat \u2014 ' + label + '</p>' +
  '<h2 style="margin:0 0 8px 0;font-size:20px;font-weight:bold;color:#111;font-family:Arial,sans-serif;line-height:1.3;">' + funTitle + '</h2>' +
  '<p style="margin:0 0 8px 0;font-size:11px;color:#ccc;font-family:monospace;">' + contactTest + '</p>' +
  (weatherLine ? '<p style="margin:0 0 6px 0;font-size:12px;color:#888;font-family:Arial,sans-serif;">' + weatherLine + '</p>' : '') +
  (weatherPromo ? '<p style="margin:0 0 8px 0;font-size:13px;color:#555;line-height:1.5;font-family:Arial,sans-serif;">' + weatherPromo + '</p>' : '') +
  (weatherCta ? '<a href="' + linkV1open + dealerUrl + linkV1close + '" style="display:inline-block;background:#BD4580;color:#fff;text-decoration:none;padding:8px 18px;border-radius:4px;font-size:12px;font-weight:bold;font-family:Arial,sans-serif;">' + weatherCta + '</a>' : '') +
  '</td><td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:12px;">' +
  '<p style="margin:0;font-size:10px;color:#bbb;font-family:Arial,sans-serif;">P\u00e4ivitetty ' + today + '</p>' +
  '</td></tr></table></td></tr></table>';

  if (products.length === 0) {
    html += '<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fff;"><tr><td style="padding:20px;font-family:Arial,sans-serif;color:#888;">Ei tuotteita t\u00e4ss\u00e4 kategoriassa t\u00e4ll\u00e4 hetkell\u00e4.</td></tr></table>';
  } else {
    const hero = products[0];
    html += '<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:#fafafa;border-bottom:3px solid #BD4580;">' +
    '<tr><td style="padding:8px 20px 20px 20px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td width="160" style="vertical-align:middle;padding-right:16px;">' +
    '<a href="' + linkV1open + hero.productUrl + linkV1close + '">' +
    '<img src="' + hero.imageUrl + '" width="160" height="160" style="display:block;border-radius:8px;object-fit:cover;" alt="' + hero.title + '">' +
    '</a></td>' +
    '<td style="vertical-align:top;">' +
    '<p style="margin:0 0 4px 0;font-size:9px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">\ud83c\udfc6 #1</p>' +
    '<p style="margin:0 0 6px 0;font-size:15px;font-weight:bold;color:#111;line-height:1.3;font-family:Arial,sans-serif;">' + hero.title + '</p>' +
    reviewLine(hero.reviewScore, hero.reviewCount) +
    aiBullets(hero.aiText) +
    '<p style="margin:0 0 12px 0;">' + priceBlock(hero.rawPrice, hero.rawSale, true) + '</p>' +
    '<a href="' + linkV1open + hero.productUrl + linkV1close + '" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:10px 22px;border-radius:4px;font-size:13px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Katso tuote \u2192 (v1 backtick)</a>' +
    '</td></tr></table></td></tr></table>';

    products.slice(1).forEach((p, i) => {
      const bg = i % 2 === 0 ? '#fff' : '#fafafa';
      const borderBottom = i < products.length - 2 ? 'border-bottom:1px solid #f0f0f0;' : '';
      const linkHref = i === 0 ? linkV2open + p.productUrl + linkV2close : p.productUrl;
      const linkLabel = i === 0 ? 'Katso \u2192 (v2 quote)' : 'Katso \u2192';

      html += '<table width="560" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background:' + bg + ';' + borderBottom + '">' +
      '<tr>' +
      '<td width="80" style="padding:10px 10px 10px 20px;vertical-align:middle;">' +
      '<a href="' + linkHref + '"><img src="' + p.imageUrl + '" width="75" height="75" style="display:block;border-radius:6px;object-fit:cover;" alt="' + p.title + '"></a>' +
      '</td>' +
      '<td style="padding:10px 0;vertical-align:middle;">' +
      '<p style="margin:0 0 2px 0;font-size:9px;font-weight:bold;color:#BD4580;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">#' + p.slot + '</p>' +
      '<p style="margin:0 0 3px 0;font-size:13px;font-weight:bold;color:#111;line-height:1.3;font-family:Arial,sans-serif;">' + p.title + '</p>' +
      reviewLine(p.reviewScore, p.reviewCount) +
      '</td>' +
      '<td width="130" style="padding:10px 20px 10px 8px;vertical-align:middle;text-align:right;white-space:nowrap;">' +
      '<p style="margin:0 0 8px 0;text-align:right;">' + priceBlock(p.rawPrice, p.rawSale, false) + '</p>' +
      '<a href="' + linkHref + '" style="background-color:#BD4580;color:#fff;text-decoration:none;padding:6px 14px;border-radius:4px;font-size:11px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">' + linkLabel + '</a>' +
      '</td></tr></table>';
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
