/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  GOBBLE BY PIXIE — Google Apps Script Backend
 *  File: code.gs
 *
 *  Covers: Customer accounts + Gobble Rewards points/tiers, Orders,
 *  Coupon codes, Product catalog sheet setup, Site content sheet setup,
 *  and (once Razorpay keys are added) payment webhook handling.
 *
 *  HOW TO DEPLOY:
 *  1. Create/open a Google Sheet under gobblebypixie@gmail.com — this becomes
 *     the single backend spreadsheet (Products, SiteContent, Customers,
 *     Orders, Coupons all live as tabs in it).
 *  2. Extensions → Apps Script → paste this entire file in, replacing any
 *     existing code.
 *  3. In the function dropdown (top toolbar), select `runInitialSetup` and
 *     click Run. First run asks you to authorize — click through
 *     (Advanced → Go to project (unsafe) is normal for your own script).
 *     This creates ALL tabs (Products pre-filled with the current 37-item
 *     placeholder catalog, SiteContent pre-filled with current site copy,
 *     empty Customers/Orders/Coupons with correct headers) and sets sharing
 *     so the CSV export URLs work without login.
 *  4. Check View → Executions (or the Logger output) for:
 *       - Products CSV URL   → paste into GOOGLE_SHEET_CSV_URL
 *       - SiteContent CSV URL → for the future site-content wiring (not
 *         yet read by the site — the sheet is ready, the Astro code to
 *         consume it isn't built yet)
 *  5. Deploy → New Deployment → Web App
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Copy the Web App URL → paste into the site's APPS_SCRIPT_URL env var.
 *  6. Once Razorpay is ready: fill in RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET /
 *     RAZORPAY_WEBHOOK_SECRET below, then add the Web App URL as a webhook
 *     in Razorpay Dashboard → Settings → Webhooks (event: payment.captured).
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CONFIG = {
  // ── Fill in once Razorpay is set up — everything else works without these ──
  RAZORPAY_WEBHOOK_SECRET: 'PASTE_RAZORPAY_WEBHOOK_SECRET',
  RAZORPAY_KEY_ID:         'PASTE_RAZORPAY_KEY_ID',
  RAZORPAY_KEY_SECRET:     'PASTE_RAZORPAY_KEY_SECRET',

  PRODUCTS_SHEET_NAME:     'Products',
  SITE_CONTENT_SHEET_NAME: 'SiteContent',
  ORDERS_SHEET_NAME:       'Orders',
  CUSTOMERS_SHEET_NAME:    'Customers',
  COUPONS_SHEET_NAME:      'Coupons',

  OWNER_EMAIL:    'gobblebypixie@gmail.com',
  OWNER_NAME:     'Gobble by Pixie',
  WHATSAPP_LINK:  'https://wa.link/sngzs9',
  SITE_URL:       'https://gobblebypixie.com',

  // Internal HMAC signing secret for auth tokens — this is NOT a third-party
  // credential, it's a self-contained secret only this script ever uses.
  // Safe to leave as-is, or change it any time (doing so just logs everyone out).
  AUTH_SECRET: 'GobbleByPixie_Auth_Secret_2026',
};

// ═══════════════════════════════════════════════════════════════════
//  TIER / POINTS LOGIC — matches the site's Gobble Rewards copy exactly
//  (Nibbler → Foodie → Gobbler VIP, see src/pages/account.astro)
// ═══════════════════════════════════════════════════════════════════

function getTier(points) {
  if (points >= 1000) return 'Gobbler VIP';
  if (points >= 300)  return 'Foodie';
  return 'Nibbler';
}

// ═══════════════════════════════════════════════════════════════════
//  AUTH HELPERS (unchanged pattern — HMAC-signed daily tokens)
// ═══════════════════════════════════════════════════════════════════

function serverHash(clientHash) {
  var sig = Utilities.computeHmacSha256Signature(clientHash, CONFIG.AUTH_SECRET);
  return sig.map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function generateToken(email) {
  var today = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  var sig   = Utilities.computeHmacSha256Signature(email + ':' + today, CONFIG.AUTH_SECRET);
  var hex   = sig.map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  return Utilities.base64Encode(email + ':' + hex);
}

function verifyToken(token) {
  try {
    var decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    var colonIdx = decoded.indexOf(':');
    if (colonIdx < 0) return null;
    var email = decoded.substring(0, colonIdx);
    for (var offset = 0; offset <= 1; offset++) {
      var d = new Date(); d.setDate(d.getDate() - offset);
      var day = Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
      var sig = Utilities.computeHmacSha256Signature(email + ':' + day, CONFIG.AUTH_SECRET);
      var hex = sig.map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
      if (token === Utilities.base64Encode(email + ':' + hex)) return email;
    }
    return null;
  } catch(e) { return null; }
}

function generateResetToken(email) {
  var expiry = Date.now() + 30 * 60 * 1000; // 30 minutes
  var sig    = Utilities.computeHmacSha256Signature(email + ':' + expiry + ':reset', CONFIG.AUTH_SECRET);
  var hex    = sig.map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  return Utilities.base64Encode(email + ':' + expiry + ':' + hex);
}

function verifyResetToken(token) {
  try {
    var decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    var parts   = decoded.split(':');
    if (parts.length !== 3) return null;
    var email = parts[0], expiry = parseInt(parts[1], 10), hex = parts[2];
    if (!expiry || Date.now() > expiry) return null;
    var sig = Utilities.computeHmacSha256Signature(email + ':' + expiry + ':reset', CONFIG.AUTH_SECRET);
    var expectedHex = sig.map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
    if (hex !== expectedHex) return null;
    return email;
  } catch(e) { return null; }
}

function jsonOut(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════
//  CUSTOMERS SHEET (rewards, profile, auth)
// ═══════════════════════════════════════════════════════════════════

function getCustomersSheet() {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var sheet    = ss.getSheetByName(CONFIG.CUSTOMERS_SHEET_NAME);
  var required = ['Timestamp','Name','Email','Phone','Address','Password Hash','Points','Tier','Total Spent','Last Login'];

  function styleHeaders(s) {
    var r = s.getRange(1, 1, 1, required.length);
    r.setBackground('#A15F60').setFontColor('#F7F0E7').setFontWeight('bold').setFontSize(11);
    s.setFrozenRows(1);
    s.getRange('D:D').setNumberFormat('@'); // Phone as text
  }

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.CUSTOMERS_SHEET_NAME);
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    styleHeaders(sheet);
    return sheet;
  }

  var lastCol  = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h){ return h.toString().trim(); });
  var hasHeaders = existing.some(function(h){ return h !== ''; });

  if (!hasHeaders) {
    if (sheet.getLastRow() > 0) sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    styleHeaders(sheet);
    return sheet;
  }

  required.forEach(function(col) {
    if (existing.map(function(h){ return h.toLowerCase(); }).indexOf(col.toLowerCase()) < 0) {
      var newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(col)
        .setBackground('#A15F60').setFontColor('#F7F0E7').setFontWeight('bold');
    }
  });

  return sheet;
}

function findCustomer(sheet, email) {
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
  var emailCol = headers.indexOf('email');
  if (emailCol < 0) return null;
  for (var i = 1; i < data.length; i++) {
    if ((data[i][emailCol]||'').toString().toLowerCase() === email.toLowerCase()) {
      var row = { _rowIndex: i + 1 };
      headers.forEach(function(h, idx){ row[h] = data[i][idx]; });
      return row;
    }
  }
  return null;
}

function updateCustomerCol(sheet, rowIndex, headers, colName, value) {
  var col = headers.indexOf(colName);
  if (col >= 0) sheet.getRange(rowIndex, col + 1).setValue(value);
}

// 1 point per ₹100 spent — matches the "How to earn points" copy on /account
function addCustomerPoints(email, amountInRupees) {
  if (!email) return;
  try {
    var sheet    = getCustomersSheet();
    var customer = findCustomer(sheet, email);
    if (!customer) return;
    var data    = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
    var newPts   = (parseInt(customer.points) || 0) + Math.floor(amountInRupees / 100);
    var newSpent = (parseFloat(customer['total spent'] || 0)) + amountInRupees;
    updateCustomerCol(sheet, customer._rowIndex, headers, 'points',      newPts);
    updateCustomerCol(sheet, customer._rowIndex, headers, 'tier',        getTier(newPts));
    updateCustomerCol(sheet, customer._rowIndex, headers, 'total spent', newSpent);
  } catch(e) { Logger.log('addCustomerPoints error: ' + e.message); }
}

function deductCustomerPoints(email, amountInRupees) {
  if (!email) return;
  try {
    var sheet    = getCustomersSheet();
    var customer = findCustomer(sheet, email);
    if (!customer) return;
    var data    = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
    var newPts   = Math.max(0, (parseInt(customer.points) || 0) - Math.floor(amountInRupees / 100));
    var newSpent = Math.max(0, (parseFloat(customer['total spent'] || 0)) - amountInRupees);
    updateCustomerCol(sheet, customer._rowIndex, headers, 'points',      newPts);
    updateCustomerCol(sheet, customer._rowIndex, headers, 'tier',        getTier(newPts));
    updateCustomerCol(sheet, customer._rowIndex, headers, 'total spent', newSpent);
  } catch(e) { Logger.log('deductCustomerPoints error: ' + e.message); }
}

// ═══════════════════════════════════════════════════════════════════
//  AUTH ACTIONS (doGet ?action=signup|signin|...)
// ═══════════════════════════════════════════════════════════════════

function handleAuthSignup(p) {
  var name = (p.name||'').trim(), email = (p.email||'').trim().toLowerCase();
  var phone = (p.phone||'').trim(), ph = (p.ph||'').trim();
  if (!name || !email || !ph)
    return jsonOut({ success: false, error: 'Name, email and password are required.' });

  var sheet = getCustomersSheet();
  if (findCustomer(sheet, email))
    return jsonOut({ success: false, error: 'An account already exists for this email. Please sign in.' });

  var now = new Date();
  // Timestamp | Name | Email | Phone | Address | Password Hash | Points | Tier | Total Spent | Last Login
  sheet.appendRow([now, name, email, phone, '', serverHash(ph), 100, 'Nibbler', 0, now]);
  sheet.autoResizeColumns(1, 10);
  try { sendWelcomeEmail(name, email); } catch(e) {}
  return jsonOut({ success: true, token: generateToken(email), name: name, email: email, phone: phone, address: '', points: 100, tier: 'Nibbler', totalSpent: 0 });
}

function handleAuthSignin(p) {
  var email = (p.email||'').trim().toLowerCase(), ph = (p.ph||'').trim();
  if (!email || !ph) return jsonOut({ success: false, error: 'Email and password required.' });

  var sheet    = getCustomersSheet();
  var customer = findCustomer(sheet, email);
  if (!customer) return jsonOut({ success: false, error: 'No account found. Please sign up first.' });

  var stored = customer['password hash'] || '';
  if (!stored) return jsonOut({ success: false, error: 'This email was registered without a password. Please create a new account.' });
  if (serverHash(ph) !== stored) return jsonOut({ success: false, error: 'Incorrect password. Please try again.' });

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
  updateCustomerCol(sheet, customer._rowIndex, headers, 'last login', new Date());

  var pts = parseInt(customer.points) || 0;
  return jsonOut({ success: true, token: generateToken(email), name: customer.name||'', email: email, phone: customer.phone||'', address: customer.address||'', points: pts, tier: getTier(pts), totalSpent: parseFloat(customer['total spent']||0) });
}

function handleRequestReset(p) {
  var email = (p.email||'').trim().toLowerCase();
  if (!email) return jsonOut({ success: false, error: 'Email is required.' });

  var sheet    = getCustomersSheet();
  var customer = findCustomer(sheet, email);
  if (!customer) return jsonOut({ success: true }); // don't leak account existence

  try {
    var token = generateResetToken(email);
    var link  = CONFIG.SITE_URL + '/reset-password?token=' + encodeURIComponent(token) + '&email=' + encodeURIComponent(email);
    sendResetEmail(customer.name || '', email, link);
  } catch(e) { Logger.log('handleRequestReset error: ' + e.message); }

  return jsonOut({ success: true });
}

function handleResetPassword(p) {
  var token = (p.token||'').trim(), ph = (p.ph||'').trim();
  if (!token || !ph) return jsonOut({ success: false, error: 'Missing token or password.' });

  var email = verifyResetToken(token);
  if (!email) return jsonOut({ success: false, error: 'This reset link is invalid or has expired. Please request a new one.' });

  var sheet    = getCustomersSheet();
  var customer = findCustomer(sheet, email);
  if (!customer) return jsonOut({ success: false, error: 'Account not found.' });

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
  updateCustomerCol(sheet, customer._rowIndex, headers, 'password hash', serverHash(ph));

  return jsonOut({ success: true, token: generateToken(email), name: customer.name||'', email: email });
}

function handleGetProfile(p) {
  var email = verifyToken(p.token||'');
  if (!email) return jsonOut({ success: false, error: 'Session expired. Please sign in again.' });
  var customer = findCustomer(getCustomersSheet(), email);
  if (!customer) return jsonOut({ success: false, error: 'Account not found.' });
  var pts = parseInt(customer.points) || 0;
  return jsonOut({ success: true, name: customer.name||'', email: email, phone: customer.phone||'', address: customer.address||'', points: pts, tier: getTier(pts), totalSpent: parseFloat(customer['total spent']||0) });
}

function handleUpdateProfile(p) {
  var email = verifyToken(p.token||'');
  if (!email) return jsonOut({ success: false, error: 'Session expired. Please sign in again.' });
  var sheet    = getCustomersSheet();
  var customer = findCustomer(sheet, email);
  if (!customer) return jsonOut({ success: false, error: 'Account not found.' });
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
  if (p.name)    updateCustomerCol(sheet, customer._rowIndex, headers, 'name',    p.name.trim());
  if (p.phone)   updateCustomerCol(sheet, customer._rowIndex, headers, 'phone',   p.phone.trim());
  if (p.address) updateCustomerCol(sheet, customer._rowIndex, headers, 'address', p.address.trim());
  return jsonOut({ success: true });
}

function handleGetOrders(p) {
  var email = verifyToken(p.token||'');
  if (!email) return jsonOut({ success: false, error: 'Session expired. Please sign in again.' });

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);
  if (!sheet) return jsonOut({ success: true, orders: [] });

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
  var emailCol = headers.indexOf('customer email');
  if (emailCol < 0) return jsonOut({ success: true, orders: [] });

  var orders = [];
  for (var i = 1; i < data.length; i++) {
    if ((data[i][emailCol]||'').toString().toLowerCase() === email.toLowerCase()) {
      var row = {};
      headers.forEach(function(h, idx){ row[h] = data[i][idx]; });
      orders.push({
        paymentId:   row['payment id']   || '',
        orderId:     row['order id']     || '',
        productName: row['product name'] || '',
        amountPaid:  parseFloat((row['amount paid'] || '0').toString().replace(/[^0-9.]/g, '')) || 0,
        date:        row['timestamp'] ? new Date(row['timestamp']).toISOString() : '',
        status:      row['status'] || 'Confirmed',
      });
    }
  }
  orders.reverse();

  return jsonOut({ success: true, orders: orders });
}

// ═══════════════════════════════════════════════════════════════════
//  COUPON CODE SYSTEM
//  Coupons sheet columns: code | discount_percent | active | description
// ═══════════════════════════════════════════════════════════════════

function getCouponDiscountPercent(code) {
  if (!code) return 0;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.COUPONS_SHEET_NAME);
  if (!sheet) return 0;
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
  var codeCol   = headers.indexOf('code');
  var pctCol    = headers.indexOf('discount_percent');
  var activeCol = headers.indexOf('active');
  if (codeCol < 0) return 0;

  for (var i = 1; i < data.length; i++) {
    if ((data[i][codeCol] || '').toString().trim().toUpperCase() === code.trim().toUpperCase()) {
      var active = (data[i][activeCol] || '').toString().toLowerCase();
      if (active !== 'true' && active !== '1') return 0;
      return Number(data[i][pctCol]) || 0;
    }
  }
  return 0;
}

// Lets the site check a coupon and show the discount BEFORE checkout,
// without needing a full order to be created.
function handleValidateCoupon(p) {
  var code = (p.code || '').trim();
  if (!code) return jsonOut({ success: false, error: 'No coupon code provided.' });
  var pct = getCouponDiscountPercent(code);
  if (pct <= 0) return jsonOut({ success: false, error: 'This coupon code is invalid or has expired.' });
  return jsonOut({ success: true, code: code.toUpperCase(), discountPercent: pct });
}

function getProductPrice(productId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PRODUCTS_SHEET_NAME);
  if (!sheet) return null;
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
  var idCol    = headers.indexOf('id');
  var priceCol = headers.indexOf('price');
  if (idCol < 0 || priceCol < 0) return null;

  for (var i = 1; i < data.length; i++) {
    if ((data[i][idCol] || '').toString().trim() === productId) {
      var price = Number(data[i][priceCol]);
      return price > 0 ? price : null;
    }
  }
  return null;
}

/**
 * Computes the real order amount server-side from the Products/Coupons
 * sheets — never trusts a price sent by the browser.
 */
function computeVerifiedAmount(itemsJson, couponCode) {
  var items = JSON.parse(itemsJson);
  if (!Array.isArray(items) || items.length === 0) throw new Error('No items provided.');

  var subtotal = 0;
  for (var i = 0; i < items.length; i++) {
    var price = getProductPrice(items[i].id);
    if (price === null) throw new Error('Unknown product: ' + items[i].id);
    var qty = parseInt(items[i].qty, 10) || 1;
    subtotal += price * qty;
  }

  var discountPct = getCouponDiscountPercent(couponCode);
  var total = discountPct > 0 ? Math.round(subtotal * (1 - discountPct / 100)) : subtotal;
  return total * 100; // paise
}

function createRazorpayOrder(amountInPaise) {
  var auth = Utilities.base64Encode(CONFIG.RAZORPAY_KEY_ID + ':' + CONFIG.RAZORPAY_KEY_SECRET);
  var res = UrlFetchApp.fetch('https://api.razorpay.com/v1/orders', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Basic ' + auth },
    payload: JSON.stringify({ amount: amountInPaise, currency: 'INR', payment_capture: 1 }),
    muteHttpExceptions: true,
  });
  var data = JSON.parse(res.getContentText());
  if (!data.id) throw new Error(data.error ? data.error.description : 'Could not create order.');
  return data.id;
}

function handleCreateOrder(p) {
  if (!CONFIG.RAZORPAY_KEY_ID || CONFIG.RAZORPAY_KEY_ID.indexOf('PASTE_') === 0) {
    return jsonOut({ success: false, error: 'Payments are not set up yet — Razorpay keys are pending.' });
  }
  try {
    var amount = computeVerifiedAmount(p.items || '[]', p.coupon || '');
    if (!amount || amount <= 0) return jsonOut({ success: false, error: 'Invalid order total.' });
    var orderId = createRazorpayOrder(amount);
    return jsonOut({ success: true, orderId: orderId, amount: amount });
  } catch (e) {
    Logger.log('handleCreateOrder error: ' + e.message);
    return jsonOut({ success: false, error: e.message });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  doGet — router for all read/auth/order actions
// ═══════════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    var action = e.parameter.action || '';
    switch(action) {
      case 'signup':          return handleAuthSignup(e.parameter);
      case 'signin':          return handleAuthSignin(e.parameter);
      case 'request-reset':   return handleRequestReset(e.parameter);
      case 'reset-password':  return handleResetPassword(e.parameter);
      case 'get-profile':     return handleGetProfile(e.parameter);
      case 'update-profile':  return handleUpdateProfile(e.parameter);
      case 'get-orders':      return handleGetOrders(e.parameter);
      case 'validate-coupon': return handleValidateCoupon(e.parameter);
      case 'create-order':    return handleCreateOrder(e.parameter);
      default:
        // Contact / flavour-suggestion form fallback (the site currently routes
        // these straight to WhatsApp, but this is here if that ever changes)
        if (e.parameter.type === 'contact') {
          var cName = e.parameter.name||'', cContact = e.parameter.contact||'', cMsg = e.parameter.message||'';
          if (cName && cMsg) {
            MailApp.sendEmail({
              to: CONFIG.OWNER_EMAIL,
              subject: 'Website enquiry from ' + cName,
              body: 'Name: ' + cName + '\nContact: ' + cContact + '\n\nMessage:\n' + cMsg
            });
          }
        }
        return jsonOut({ status: 'ok' });
    }
  } catch(err) {
    Logger.log('doGet error: ' + err.message);
    return jsonOut({ success: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  EMAILS — Gobble by Pixie branded (rose/cream, Cormorant Garamond,
//  matching the current site redesign)
// ═══════════════════════════════════════════════════════════════════

function emailShell(heading, bodyHtml) {
  return '<!DOCTYPE html>'
    + '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{background:#F7F0E7;font-family:Georgia,"Times New Roman",serif;-webkit-font-smoothing:antialiased;color:#241512}'
    + '.wrap{max-width:540px;margin:0 auto;padding:56px 32px 48px}'
    + '.brand{font-family:Georgia,serif;font-style:italic;font-size:20px;color:#A15F60;margin-bottom:36px}'
    + '.rule{width:36px;height:2px;background:#B8863F;margin-bottom:36px}'
    + 'h1{font-family:Georgia,"Times New Roman",serif;font-size:32px;font-weight:normal;color:#241512;line-height:1.2;margin-bottom:28px}'
    + 'p{font-family:Georgia,serif;font-size:14px;font-weight:400;color:#4A322B;line-height:1.8;margin-bottom:16px}'
    + '.cta{display:inline-block;background:#A15F60;color:#F7F0E7 !important;text-decoration:none;font-family:Georgia,serif;font-size:13px;letter-spacing:0.04em;padding:13px 34px;margin-top:8px;border-radius:2px}'
    + '.footer{font-family:Georgia,serif;font-size:12px;color:#785A52;line-height:1.7;margin-top:40px}'
    + '.footer a{color:#A15F60;text-decoration:none}'
    + 'table.details td{padding:11px 0;border-bottom:1px solid rgba(161,95,96,0.15);font-family:Georgia,serif;font-size:13px}'
    + 'table.details td.label{color:#785A52;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap}'
    + 'table.details td.value{color:#241512;font-weight:600;text-align:right;padding-left:16px}'
    + '</style></head>'
    + '<body><div class="wrap">'
    + '<p class="brand">Gobble by Pixie</p>'
    + '<div class="rule"></div>'
    + '<h1>' + heading + '</h1>'
    + bodyHtml
    + '<p class="footer">Handmade Flavoured Cream Cheese · Delhi NCR<br>'
    + '<a href="' + CONFIG.WHATSAPP_LINK + '">Chat with us on WhatsApp</a></p>'
    + '</div></body></html>';
}

function sendWelcomeEmail(name, email) {
  if (!email) return;
  var body = '<p>Dear ' + name + ',</p>'
    + '<p>Welcome to Gobble Rewards! You\'ve got <strong>100 points</strong> just for signing up — every order after this earns you more, and unlocks discounts as you climb from Nibbler to Foodie to Gobbler VIP.</p>'
    + '<a href="' + CONFIG.SITE_URL + '/menu" class="cta">Browse the Menu</a>';
  try {
    MailApp.sendEmail({ to: email, subject: 'Welcome to Gobble Rewards! 🧀', htmlBody: emailShell('Welcome to<br>the family.', body) });
  } catch(err) { Logger.log('Welcome email failed: ' + err.message); }
}

function sendResetEmail(name, email, link) {
  var body = '<p>' + (name ? ('Dear ' + name + ',') : 'Hi,') + '</p>'
    + '<p>We received a request to reset the password on your account. This link expires in 30 minutes — if you didn\'t request this, just ignore this email.</p>'
    + '<a href="' + link + '" class="cta">Reset Password</a>';
  MailApp.sendEmail({ to: email, subject: 'Reset your password — Gobble by Pixie', htmlBody: emailShell('Reset your<br>password.', body) });
}

function sendOwnerNotification(order) {
  const subject = `🧀 New Order — ${order.productName} (₹${order.amountPaid.toLocaleString('en-IN')})`;
  const body = `New order on Gobble by Pixie!\n\n`
    + `━━━━━━━━━━━━━━━━━━━━━━━━\nORDER DETAILS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`
    + `Item(s):       ${order.productName}\nProduct ID(s): ${order.productId}\n`
    + `Amount Paid:   ₹${order.amountPaid.toLocaleString('en-IN')}\nPayment ID:    ${order.paymentId}\nOrder ID:      ${order.orderId}\n`
    + `Time:          ${order.timestamp.toLocaleString('en-IN')}\n\n`
    + `━━━━━━━━━━━━━━━━━━━━━━━━\nCUSTOMER DETAILS\n━━━━━━━━━━━━━━━━━━━━━━━━\n`
    + `Name:    ${order.customerName}\nEmail:   ${order.customerEmail}\nPhone:   ${order.customerPhone}\nAddress: ${order.shippingAddress || 'Confirm via WhatsApp'}\n\n`
    + `ACTION REQUIRED: confirm delivery/dispatch details with the customer on WhatsApp.\n\n`
    + `View all orders: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`;
  MailApp.sendEmail({ to: CONFIG.OWNER_EMAIL, subject: subject, body: body });
}

function sendCustomerConfirmation(order) {
  const subject = `Your order from Gobble by Pixie — ${order.productName}`;
  const dateStr = order.timestamp.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const row = (label, value, style) => `<tr><td class="label">${label}</td><td class="value" style="${style||''}">${value}</td></tr>`;
  const body = `<p>Dear ${order.customerName || 'valued customer'},</p>`
    + `<p>Thank you for your order! We're preparing it fresh — you'll hear from us on WhatsApp with dispatch details.</p>`
    + `<table class="details" width="100%" cellpadding="0" cellspacing="0">`
    + row('Item(s)', order.productName)
    + row('Amount Paid', '₹' + order.amountPaid.toLocaleString('en-IN'), 'color:#A15F60;font-size:18px')
    + row('Payment ID', order.paymentId, 'font-family:monospace;font-weight:400;font-size:11px')
    + row('Date', dateStr)
    + `</table>`
    + `<a href="${CONFIG.WHATSAPP_LINK}" class="cta">Chat with us on WhatsApp</a>`;
  MailApp.sendEmail({ to: order.customerEmail, subject: subject, htmlBody: emailShell('Thank you for<br>your order.', body) });
}

function sendRefundEmail(name, email, productName, refundAmount, paymentId, isPartial) {
  const subject = isPartial ? 'Partial refund processed — Gobble by Pixie' : 'Your order has been cancelled — Gobble by Pixie';
  const row = (label, value, style) => `<tr><td class="label">${label}</td><td class="value" style="${style||''}">${value}</td></tr>`;
  const body = `<p>${name ? ('Dear ' + name + ',') : 'Hi,'}</p>`
    + `<p>${isPartial ? 'A partial refund for your order has been processed.' : 'Your order has been cancelled and refunded.'} The amount will reflect in your original payment method within 5–7 business days.</p>`
    + `<table class="details" width="100%" cellpadding="0" cellspacing="0">`
    + row('Item', productName)
    + row('Refund Amount', '₹' + refundAmount.toLocaleString('en-IN'), 'color:#A15F60;font-size:18px')
    + row('Payment ID', paymentId, 'font-family:monospace;font-weight:400;font-size:11px')
    + `</table>`
    + `<a href="${CONFIG.WHATSAPP_LINK}" class="cta">Chat with us on WhatsApp</a>`;
  MailApp.sendEmail({ to: email, subject: subject, htmlBody: emailShell(isPartial ? 'A partial refund<br>has been issued.' : 'Your order has<br>been cancelled.', body) });
}

// ═══════════════════════════════════════════════════════════════════
//  doPost — Razorpay webhook (works once RAZORPAY_* config is filled in)
// ═══════════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    const rawBody = e.postData.contents;
    const payload = JSON.parse(rawBody);
    Logger.log('Webhook received: ' + rawBody);

    const razorpaySignature = e.parameter['X-Razorpay-Signature']
      || (e.headers && e.headers['X-Razorpay-Signature']) || '';

    const isValidSignature = razorpaySignature
      && verifyWebhookSignature(rawBody, razorpaySignature, CONFIG.RAZORPAY_WEBHOOK_SECRET);
    if (!isValidSignature) {
      Logger.log('❌ Missing or invalid webhook signature — rejected');
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid signature' })).setMimeType(ContentService.MimeType.JSON);
    }

    const event = payload.event;

    if (event === 'refund.processed') {
      handleRefundEvent(payload.payload);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', event: event })).setMimeType(ContentService.MimeType.JSON);
    }
    if (event === 'refund.created') {
      Logger.log('Refund created (awaiting processing)');
      return ContentService.createTextOutput(JSON.stringify({ status: 'noted', event: event })).setMimeType(ContentService.MimeType.JSON);
    }
    if (event === 'payment.failed') {
      handlePaymentFailedEvent(payload.payload.payment.entity);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', event: event })).setMimeType(ContentService.MimeType.JSON);
    }
    if (event === 'refund.failed') {
      handleRefundFailedEvent(payload.payload.refund.entity);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', event: event })).setMimeType(ContentService.MimeType.JSON);
    }
    if (event !== 'payment.captured' && event !== 'order.paid') {
      Logger.log('Ignoring event: ' + event);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ignored', event: event })).setMimeType(ContentService.MimeType.JSON);
    }

    const paymentEntity = payload.payload.payment ? payload.payload.payment.entity
      : (payload.payload.order ? payload.payload.order.entity : null);
    if (!paymentEntity) throw new Error('Could not extract payment entity');

    const orderData = extractOrderData(paymentEntity);
    appendOrderToSheet(orderData);
    sendOwnerNotification(orderData);
    if (orderData.customerEmail) sendCustomerConfirmation(orderData);
    addCustomerPoints(orderData.customerEmail, orderData.amountPaid);

    Logger.log('✅ Order processed: ' + orderData.paymentId);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', payment_id: orderData.paymentId })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('❌ Error: ' + err.message);
    logError(err.message, e.postData ? e.postData.contents : 'No body');
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function extractOrderData(payment) {
  const notes = payment.notes || {};
  const amountInRupees = (payment.amount || 0) / 100;
  return {
    timestamp: new Date(),
    paymentId: payment.id || '',
    orderId: payment.order_id || '',
    customerName: notes.customer_name || extractNameFromEmail(payment.email) || 'Customer',
    customerEmail: payment.email || '',
    customerPhone: payment.contact || '',
    productId: notes.product_ids || '',
    productName: notes.product_names || 'Gobble by Pixie order',
    amountPaid: amountInRupees,
    currency: payment.currency || 'INR',
    shippingAddress: extractShippingAddress(payment),
    status: payment.status || 'captured',
    method: payment.method || '',
  };
}

function appendOrderToSheet(order) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(CONFIG.ORDERS_SHEET_NAME); setupOrdersSheet(sheet); }
  else if (sheet.getLastRow() === 0) { setupOrdersSheet(sheet); }

  sheet.appendRow([
    order.timestamp, order.paymentId, order.orderId,
    order.customerName, order.customerEmail, order.customerPhone,
    order.productId, order.productName, order.amountPaid,
    order.currency, order.shippingAddress, order.method, order.status,
  ]);
  sheet.getRange(sheet.getLastRow(), 6).setNumberFormat('@');
  sheet.getRange(sheet.getLastRow(), 9).setNumberFormat('₹#,##0');
  sheet.autoResizeColumns(1, 13);
  Logger.log('✅ Order appended: ' + order.paymentId);
}

function findOrderRowByPaymentId(sheet, paymentId) {
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return h.toString().toLowerCase().trim(); });
  var idCol   = headers.indexOf('payment id');
  if (idCol < 0) return null;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === paymentId) {
      var row = { _rowIndex: i + 1 };
      headers.forEach(function(h, idx){ row[h] = data[i][idx]; });
      return row;
    }
  }
  return null;
}

function handleRefundEvent(entities) {
  const paymentEntity = entities.payment && entities.payment.entity;
  const refundEntity  = entities.refund && entities.refund.entity;
  const paymentId = (paymentEntity && paymentEntity.id) || (refundEntity && refundEntity.payment_id) || '';
  const isPartial = paymentEntity ? paymentEntity.refund_status === 'partial' : false;
  const newStatus = isPartial ? 'Partially Refunded' : 'Refunded';
  const refundAmt = ((refundEntity && refundEntity.amount) || (paymentEntity && paymentEntity.amount_refunded) || 0) / 100;

  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);
    let orderRow = null;
    if (sheet && paymentId) {
      orderRow = findOrderRowByPaymentId(sheet, paymentId);
      if (orderRow) {
        const headers = sheet.getDataRange().getValues()[0].map(function(h){ return h.toString().toLowerCase().trim(); });
        updateCustomerCol(sheet, orderRow._rowIndex, headers, 'status', newStatus);
      }
    }
    const customerEmail = (orderRow && orderRow['customer email']) || (paymentEntity && paymentEntity.email) || '';
    const customerName  = (orderRow && orderRow['customer name']) || '';
    const productName   = (orderRow && orderRow['product name']) || (paymentEntity && paymentEntity.notes && paymentEntity.notes.product_names) || 'your order';
    const finalAmount   = refundAmt || ((paymentEntity && paymentEntity.amount) || 0) / 100;

    if (customerEmail) {
      sendRefundEmail(customerName, customerEmail, productName, finalAmount, paymentId, isPartial);
      deductCustomerPoints(customerEmail, finalAmount);
    }
    MailApp.sendEmail({ to: CONFIG.OWNER_EMAIL, subject: `↩️ Refund processed — ${productName}`, body: `Payment ID: ${paymentId}\nCustomer: ${customerName} (${customerEmail})\nAmount: ₹${finalAmount.toLocaleString('en-IN')}\nType: ${isPartial ? 'Partial' : 'Full'}` });
    Logger.log('✅ Refund processed: ' + paymentId);
  } catch (e) { Logger.log('handleRefundEvent error: ' + e.message); }
}

function handlePaymentFailedEvent(payment) {
  try {
    const notes = payment.notes || {};
    MailApp.sendEmail({
      to: CONFIG.OWNER_EMAIL,
      subject: `⚠️ Payment failed — ${notes.customer_name || payment.contact || 'a customer'}`,
      body: `Customer: ${notes.customer_name || '(not captured)'}\nPhone: ${payment.contact || ''}\nEmail: ${payment.email || ''}\nAmount: ₹${((payment.amount||0)/100).toLocaleString('en-IN')}\nError: ${payment.error_description || payment.error_reason || 'Unknown'}`,
    });
  } catch (e) { Logger.log('handlePaymentFailedEvent error: ' + e.message); }
}

function handleRefundFailedEvent(refund) {
  try {
    MailApp.sendEmail({
      to: CONFIG.OWNER_EMAIL,
      subject: `🚨 Refund FAILED — needs your attention`,
      body: `Refund ID: ${refund.id}\nPayment ID: ${refund.payment_id}\nAmount: ₹${((refund.amount||0)/100).toLocaleString('en-IN')}\n\nCheck Razorpay Dashboard → Payments.`,
    });
  } catch (e) { Logger.log('handleRefundFailedEvent error: ' + e.message); }
}

function setupOrdersSheet(sheet) {
  const headers = ['Timestamp','Payment ID','Order ID','Customer Name','Customer Email','Customer Phone','Product ID','Product Name','Amount Paid','Currency','Shipping Address','Payment Method','Status'];
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#A15F60').setFontColor('#F7F0E7').setFontWeight('bold').setFontSize(11);
  sheet.setFrozenRows(1);
  sheet.getRange('F:F').setNumberFormat('@');
}

function verifyWebhookSignature(payload, signature, secret) {
  try {
    const computed = Utilities.computeHmacSha256Signature(payload, secret);
    const hex = computed.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
    return hex === signature;
  } catch (e) { Logger.log('Signature error: ' + e.message); return false; }
}

function extractShippingAddress(payment) {
  if (payment.shipping_address) {
    const a = payment.shipping_address;
    return [a.line1, a.line2, a.city, a.state, a.zipcode, a.country].filter(Boolean).join(', ');
  }
  if (payment.notes && payment.notes.delivery_address) return payment.notes.delivery_address;
  return 'To be confirmed via WhatsApp';
}

function extractNameFromEmail(email) {
  if (!email) return '';
  return email.split('@')[0].replace(/[._\-+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function logError(message, body) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Webhook Errors');
    if (!sheet) {
      sheet = ss.insertSheet('Webhook Errors');
      sheet.appendRow(['Timestamp', 'Error Message', 'Raw Body']);
      sheet.getRange(1, 1, 1, 3).setBackground('#CC0000').setFontColor('#FFFFFF').setFontWeight('bold');
    }
    sheet.appendRow([new Date(), message, body.substring(0, 2000)]);
  } catch (e) { Logger.log('Could not log error: ' + e.message); }
}

// ═══════════════════════════════════════════════════════════════════
//  ONE-TIME SETUP — creates every tab with correct headers + starter data
// ═══════════════════════════════════════════════════════════════════

function setupProductsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.PRODUCTS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.PRODUCTS_SHEET_NAME);
  if (sheet.getLastRow() > 0) { Logger.log('Products sheet already has data — skipping seed.'); return sheet; }

  const DATA = [["id","name","category","subcategory","price","net_weight","image_url","description","dietary","fulfillment","in_stock","rating","review_count"],["gbp-jar-1","Jar Flavour 1","Jars","","","","","","GF","weekly-batch","TRUE","",""],["gbp-jar-2","Jar Flavour 2","Jars","","","","","","GF","weekly-batch","TRUE","",""],["gbp-jar-3","Jar Flavour 3","Jars","","","","","","GF","weekly-batch","TRUE","",""],["gbp-jar-4","Jar Flavour 4","Jars","","","","","","GF","weekly-batch","TRUE","",""],["gbp-jar-5","Jar Flavour 5","Jars","","","","","","GF","weekly-batch","TRUE","",""],["gbp-jar-6","Jar Flavour 6","Jars","","","","","","GF","weekly-batch","TRUE","",""],["gbp-jar-7","Jar Flavour 7","Jars","","","","","","GF","weekly-batch","TRUE","",""],["gbp-jar-8","Jar Flavour 8","Jars","","","","","","GF","weekly-batch","TRUE","",""],["gbp-ball-1","Set Cheese Ball 1","Set Cheese Balls","","","","","","GF","weekly-batch","TRUE","",""],["gbp-ball-2","Set Cheese Ball 2","Set Cheese Balls","","","","","","GF","weekly-batch","TRUE","",""],["gbp-ball-3","Set Cheese Ball 3","Set Cheese Balls","","","","","","GF","weekly-batch","TRUE","",""],["gbp-ball-4","Set Cheese Ball 4","Set Cheese Balls","","","","","","GF","weekly-batch","TRUE","",""],["gbp-ball-5","Set Cheese Ball 5","Set Cheese Balls","","","","","","GF","weekly-batch","TRUE","",""],["gbp-ball-6","Set Cheese Ball 6","Set Cheese Balls","","","","","","GF","weekly-batch","TRUE","",""],["gbp-plat-picnic","Picnic Platter","Platters","Picnic Platters","","","","","","next-day","TRUE","",""],["gbp-plat-boat-s","Boat Platter — Small","Platters","Boat Platters","","S","","","","next-day","TRUE","",""],["gbp-plat-boat-m","Boat Platter — Medium","Platters","Boat Platters","","M","","","","next-day","TRUE","",""],["gbp-plat-boat-l","Boat Platter — Large","Platters","Boat Platters","","L","","","","next-day","TRUE","",""],["gbp-plat-box","Box Platter","Platters","Box Platters","","","","","","next-day","TRUE","",""],["gbp-plat-party","Party Platter","Platters","Party Platters","","","","","","next-day","TRUE","",""],["gbp-plat-wooden","Wooden Platter","Platters","Wooden Platters","","","","","","next-day","TRUE","",""],["gbp-butter-1","Butter Candle Flavour 1","Butter Candles","","","","","","Veg","next-day","TRUE","",""],["gbp-butter-2","Butter Candle Flavour 2","Butter Candles","","","","","","Veg","next-day","TRUE","",""],["gbp-butter-3","Butter Candle Flavour 3","Butter Candles","","","","","","Veg","next-day","TRUE","",""],["gbp-butter-4","Butter Candle Flavour 4","Butter Candles","","","","","","Veg","next-day","TRUE","",""],["gbp-art-s","Cheese Art — Size 1","Cheese Art","Sizes","","","","","","next-day","TRUE","",""],["gbp-art-m","Cheese Art — Size 2","Cheese Art","Sizes","","","","","","next-day","TRUE","",""],["gbp-art-l","Cheese Art — Size 3","Cheese Art","Sizes","","","","","","next-day","TRUE","",""],["gbp-art-xl","Cheese Art — Size 4","Cheese Art","Sizes","","","","","","next-day","TRUE","",""],["gbp-art-addon-crackers","Add-on: Crackers / Sticks","Cheese Art","Add-ons","","","","","","next-day","TRUE","",""],["gbp-art-platter","Cheese Art Platter","Cheese Art","Platter","","","","","","next-day","TRUE","",""],["gbp-gift-1","Graze & Gift Box 1","Graze & Gift Boxes","","","","","","","next-day","TRUE","",""],["gbp-gift-2","Graze & Gift Box 2","Graze & Gift Boxes","","","","","","","next-day","TRUE","",""],["gbp-gift-3","Graze & Gift Box 3","Graze & Gift Boxes","","","","","","","next-day","TRUE","",""],["gbp-gift-4","Graze & Gift Box 4","Graze & Gift Boxes","","","","","","","next-day","TRUE","",""],["gbp-gift-5","Graze & Gift Box 5","Graze & Gift Boxes","","","","","","","next-day","TRUE","",""],["gbp-gift-6","Graze & Gift Box 6","Graze & Gift Boxes","","","","","","","next-day","TRUE","",""]];
  sheet.getRange(1, 1, DATA.length, DATA[0].length).setValues(DATA);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, DATA[0].length).setBackground('#A15F60').setFontColor('#F7F0E7').setFontWeight('bold');
  sheet.autoResizeColumns(1, DATA[0].length);
  return sheet;
}

function setupSiteContentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SITE_CONTENT_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SITE_CONTENT_SHEET_NAME);
  if (sheet.getLastRow() > 0) { Logger.log('SiteContent sheet already has data — skipping seed.'); return sheet; }

  // One row per editable text field currently hardcoded on the site.
  // NOTE: the Astro site does not read this sheet yet — this just gets the
  // sheet ready ahead of that wiring being built.
  const DATA = [
    ['key', 'value', 'where_it_appears'],
    ['tagline', 'Handmade Flavoured Cream Cheese', 'Hero heading, footer, meta description'],
    ['hero_eyebrow', "Delhi NCR's Artisanal Cheese House", 'Homepage hero'],
    ['hero_sub', 'Small-batch cream cheeses and handcrafted grazing boards — 100% vegetarian, gluten-free, keto-friendly. Zero preservatives, always fresh.', 'Homepage hero'],
    ['hero_trust', 'Loved by 1,700+ fellow food lovers on Instagram', 'Homepage hero'],
    ['about_intro', "Gobble by Pixie began with a simple belief: cheese should be honest — real ingredients, small batches, zero preservatives.", 'About page'],
    ['fulfillment_platters', 'Cheese Platters: Next-Day Dispatch', 'Fulfillment banner, FAQ'],
    ['fulfillment_jars', 'Cream Cheese Jars: Order by Thu Midnight, Shipped Sat', 'Fulfillment banner, FAQ'],
    ['grazing_table_price', 'Starting at ₹25,000', 'Menu — Grazing Tables panel'],
    ['fssai_number', '23323002000839', 'Footer'],
    ['gstin', '07CHAPS2957P2ZL', 'Footer'],
  ];
  sheet.getRange(1, 1, DATA.length, DATA[0].length).setValues(DATA);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 3).setBackground('#A15F60').setFontColor('#F7F0E7').setFontWeight('bold');
  sheet.autoResizeColumns(1, 3);
  return sheet;
}

function setupCouponsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.COUPONS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.COUPONS_SHEET_NAME);
  if (sheet.getLastRow() > 0) { Logger.log('Coupons sheet already has data — skipping seed.'); return sheet; }

  const DATA = [
    ['code', 'discount_percent', 'active', 'description'],
    ['WELCOME10', 10, 'FALSE', 'Example: 10% off — flip active to TRUE to turn it on'],
  ];
  sheet.getRange(1, 1, DATA.length, DATA[0].length).setValues(DATA);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 4).setBackground('#A15F60').setFontColor('#F7F0E7').setFontWeight('bold');
  sheet.autoResizeColumns(1, 4);
  return sheet;
}

/**
 * Run this once. Creates Products (pre-filled), SiteContent (pre-filled),
 * Coupons (with an example row), Customers, and Orders (empty, correct
 * headers) — then sets the whole file to "anyone with the link can view"
 * so the CSV export URLs work without login, and logs every URL you need.
 */
function runInitialSetup() {
  setupProductsSheet();
  setupSiteContentSheet();
  setupCouponsSheet();
  getCustomersSheet();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);
  if (!ordersSheet) { ordersSheet = ss.insertSheet(CONFIG.ORDERS_SHEET_NAME); setupOrdersSheet(ordersSheet); }

  const file = DriveApp.getFileById(ss.getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const productsGid = ss.getSheetByName(CONFIG.PRODUCTS_SHEET_NAME).getSheetId();
  const contentGid  = ss.getSheetByName(CONFIG.SITE_CONTENT_SHEET_NAME).getSheetId();
  const productsCsv = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=csv&gid=${productsGid}`;
  const contentCsv  = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=csv&gid=${contentGid}`;

  Logger.log('✅ All tabs created: Products, SiteContent, Coupons, Customers, Orders');
  Logger.log('Spreadsheet URL: ' + ss.getUrl());
  Logger.log('Products CSV URL (→ GOOGLE_SHEET_CSV_URL): ' + productsCsv);
  Logger.log('SiteContent CSV URL (for future use): ' + contentCsv);
  Logger.log('Next: Deploy → New deployment → Web app → Execute as Me, Who has access: Anyone. Copy that URL → APPS_SCRIPT_URL env var.');
}

/** Shows the deployed Web App URL — run after deploying */
function getWebAppUrl() {
  const url = ScriptApp.getService().getUrl();
  Logger.log('Web App URL: ' + url);
}

/** Run once after adding Razorpay keys to verify Order creation works */
function testCreateOrder() {
  try {
    const orderId = createRazorpayOrder(100); // ₹1 test order
    Logger.log('✅ Order created: ' + orderId);
  } catch (e) {
    Logger.log('❌ Order creation failed: ' + e.message);
  }
}

/** Test the full order + email flow (safe — doesn't touch real payments) */
function testWebhook() {
  const fakeOrder = {
    timestamp: new Date(), paymentId: 'pay_TEST_' + Date.now(), orderId: 'order_TEST_' + Date.now(),
    customerName: 'Test Customer', customerEmail: CONFIG.OWNER_EMAIL, customerPhone: '+91 98765 43210',
    productId: 'gbp-jar-1', productName: 'Test — Herbs & Chilli Cream Cheese',
    amountPaid: 750, currency: 'INR', shippingAddress: '123 Test Street, New Delhi, 110001',
    status: 'captured', method: 'upi',
  };
  appendOrderToSheet(fakeOrder);
  sendOwnerNotification(fakeOrder);
  sendCustomerConfirmation(fakeOrder);
  Logger.log('✅ Test done — check the Orders sheet and ' + CONFIG.OWNER_EMAIL);
}

// ═══════════════════════════════════════════════════════════════════
//  AUTO-DEPLOY — rebuild the website when the Products sheet changes
//
//  NOTE: this only works once the Cloudflare Pages project is connected
//  to Git-based builds (Settings → Builds & deployments). Right now the
//  site deploys via a direct file upload, not a Cloudflare-triggered
//  build, so a deploy hook has nothing to trigger yet — this is scaffolded
//  and ready, not yet wired to a live hook.
//
//  SETUP (once ready):
//  1. Paste your Cloudflare Pages Deploy Hook URL into DEPLOY_HOOK_URL
//  2. Apps Script → Triggers → Add Trigger:
//       Function: onProductSheetChange | From: spreadsheet | Event: On change
// ═══════════════════════════════════════════════════════════════════

const DEPLOY_HOOK_URL = 'PASTE_CLOUDFLARE_DEPLOY_HOOK_URL_HERE';

function onProductSheetChange(e) {
  const changedSheet = e && e.source ? e.source.getActiveSheet().getName() : '';
  const SKIP_SHEETS = ['Orders', 'Webhook Errors', 'Customers'];
  if (SKIP_SHEETS.includes(changedSheet)) {
    Logger.log('Skipping rebuild — change was in: ' + changedSheet);
    return;
  }
  if (!DEPLOY_HOOK_URL || DEPLOY_HOOK_URL.indexOf('PASTE_') === 0) {
    Logger.log('⚠️ DEPLOY_HOOK_URL not set — skipping auto-deploy');
    return;
  }
  try {
    const response = UrlFetchApp.fetch(DEPLOY_HOOK_URL, { method: 'POST', muteHttpExceptions: true });
    Logger.log('✅ Cloudflare build triggered — status: ' + response.getResponseCode());
  } catch (err) {
    Logger.log('❌ Failed to trigger Cloudflare build: ' + err.message);
  }
}

/** Run manually to test the deploy hook is wired up correctly, once DEPLOY_HOOK_URL is set */
function testDeployHook() {
  if (!DEPLOY_HOOK_URL || DEPLOY_HOOK_URL.indexOf('PASTE_') === 0) {
    Logger.log('⚠️ Please paste your Cloudflare Deploy Hook URL into DEPLOY_HOOK_URL first.');
    return;
  }
  const response = UrlFetchApp.fetch(DEPLOY_HOOK_URL, { method: 'POST', muteHttpExceptions: true });
  Logger.log(response.getResponseCode() === 200
    ? '✅ Deploy triggered! Site will rebuild in ~60 seconds.'
    : '❌ Something went wrong — status ' + response.getResponseCode() + '. Double-check the deploy hook URL.');
}
