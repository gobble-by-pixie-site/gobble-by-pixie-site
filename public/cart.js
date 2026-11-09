/**
 * GobbleCart — shared cart engine, loaded on every page via BaseLayout.
 * localStorage-backed so it persists across navigation. Checkout builds one
 * combined WhatsApp message to the Business number injected by BaseLayout
 * (window.GOBBLE_WHATSAPP_HREF) — Business-only, no fallback (owner
 * 2026-11-09): unset means no checkout URL and the button stays disabled.
 */
(function () {
  var KEY = 'gbp_cart';
  var listeners = [];

  function waBase() {
    try { return window.GOBBLE_WHATSAPP_HREF || null; } catch (e) { return null; }
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    listeners.forEach(function (fn) { try { fn(items); } catch (e) {} });
  }

  function add(item) {
    // item: { id, name, price (number or null), qty, note (optional, e.g. BYOP description), image (optional) }
    var items = read();
    var existing = !item.note && items.find(function (i) { return i.id === item.id && !i.note; });
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      items.push({
        id: item.id || ('custom-' + Date.now()),
        name: item.name,
        price: item.price === undefined ? null : item.price,
        qty: item.qty || 1,
        note: item.note || '',
        image: item.image || '',
      });
    }
    write(items);
  }

  function removeAt(index) {
    var items = read();
    items.splice(index, 1);
    write(items);
  }

  function setQtyAt(index, qty) {
    var items = read();
    if (!items[index]) return;
    if (qty <= 0) { items.splice(index, 1); }
    else { items[index].qty = qty; }
    write(items);
  }

  function clear() { write([]); }

  function count() {
    return read().reduce(function (sum, i) { return sum + (i.qty || 1); }, 0);
  }

  function total() {
    return read().reduce(function (sum, i) {
      return sum + (typeof i.price === 'number' ? i.price * i.qty : 0);
    }, 0);
  }

  function hasUnpricedItems() {
    return read().some(function (i) { return typeof i.price !== 'number'; });
  }

  // Mirrors code.gs's computeGstBreakdown() exactly — prices are GST-inclusive,
  // this reverse-calculates the taxable value + CGST 2.5% + SGST 2.5% (5% total)
  // for display only. Assumes intra-state (Delhi NCR) delivery, same assumption
  // the backend order-creation flow makes.
  var GST_RATE = 0.05;
  function gstBreakdown() {
    var inclusive = total();
    var taxableValue = inclusive / (1 + GST_RATE);
    var totalGst = inclusive - taxableValue;
    return {
      taxableValue: Math.round(taxableValue * 100) / 100,
      cgst: Math.round((totalGst / 2) * 100) / 100,
      sgst: Math.round((totalGst / 2) * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      total: inclusive,
    };
  }

  function checkoutWhatsAppUrl() {
    var base = waBase();
    if (!base) return null;
    var items = read();
    if (!items.length) return base;
    var lines = ['Hi! I\'d like to place an order:', ''];
    items.forEach(function (i) {
      var priceStr = typeof i.price === 'number' ? (' — ₹' + (i.price * i.qty).toLocaleString('en-IN')) : ' — price on request';
      lines.push('• ' + i.qty + ' × ' + i.name + priceStr + (i.note ? ('\n   (' + i.note + ')') : ''));
    });
    if (!hasUnpricedItems()) {
      var gst = gstBreakdown();
      lines.push(
        '',
        'Taxable value: ₹' + gst.taxableValue.toLocaleString('en-IN'),
        'CGST (2.5%): ₹' + gst.cgst.toLocaleString('en-IN'),
        'SGST (2.5%): ₹' + gst.sgst.toLocaleString('en-IN'),
        'Total (incl. GST): ₹' + gst.total.toLocaleString('en-IN')
      );
    }
    return base + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  function subscribe(fn) { listeners.push(fn); fn(read()); }

  window.GobbleCart = {
    get: read, add: add, removeAt: removeAt, setQtyAt: setQtyAt, clear: clear,
    count: count, total: total, hasUnpricedItems: hasUnpricedItems,
    gstBreakdown: gstBreakdown,
    checkoutWhatsAppUrl: checkoutWhatsAppUrl, subscribe: subscribe,
  };
})();
