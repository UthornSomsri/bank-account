(function () {
  'use strict';

  // ---------- ตั้งค่า ----------
  // เลขพร้อมเพย์: เบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก
  // (ถ้าไม่อยากให้เลขบัตรอยู่ใน QR แนะนำให้ผูกพร้อมเพย์กับเบอร์โทรแล้วใส่เบอร์แทน)
  var PROMPTPAY_ID = '1320700153069';
  var ACCOUNT_NAME = 'อุทร สมศรี';
  var MAX_AMOUNT = 9999999.99;

  // ---------- สร้างข้อความ PromptPay (EMVCo) ----------
  function tlv(tag, value) {
    return tag + ('0' + value.length).slice(-2) + value;
  }

  function crc16(text) {
    var crc = 0xFFFF;
    for (var i = 0; i < text.length; i++) {
      crc ^= text.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return ('0000' + crc.toString(16).toUpperCase()).slice(-4);
  }

  function promptPayPayload(id, amount) {
    var digits = String(id).replace(/\D/g, '');
    var type, value;
    if (digits.length >= 15) {            // e-Wallet
      type = '03'; value = digits;
    } else if (digits.length >= 13) {     // เลขบัตรประชาชน / เลขผู้เสียภาษี
      type = '02'; value = digits;
    } else {                              // เบอร์โทร -> 0066xxxxxxxxx
      type = '01';
      value = ('0000000000000' + digits.replace(/^0/, '66')).slice(-13);
    }
    var hasAmount = amount > 0;
    var data = [
      tlv('00', '01'),
      tlv('01', hasAmount ? '12' : '11'),
      tlv('29', tlv('00', 'A000000677010111') + tlv(type, value)),
      tlv('58', 'TH'),
      tlv('53', '764')
    ];
    if (hasAmount) data.push(tlv('54', amount.toFixed(2)));
    var body = data.join('') + '6304';
    return body + crc16(body);
  }

  // ---------- วาด QR ลง canvas ----------
  function drawQR(canvas, text, size) {
    var qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    var count = qr.getModuleCount();
    var quiet = 4;
    var cell = Math.max(1, Math.floor(size / (count + quiet * 2)));
    var full = cell * (count + quiet * 2);
    canvas.width = full;
    canvas.height = full;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, full, full);
    ctx.fillStyle = '#000';
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
      }
    }
    return canvas;
  }

  // ---------- ส่วนช่วย ----------
  var $ = function (id) { return document.getElementById(id); };
  var toastTimer;

  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2000);
  }

  function formatMoney(n) {
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---------- คัดลอกเลขบัญชี ----------
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function initCopy() {
    var buttons = document.querySelectorAll('[data-copy]');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var raw = $(btn.getAttribute('data-copy')).getAttribute('data-raw');
        copyText(raw).then(function () {
          toast('คัดลอกเลขบัญชีแล้ว');
          var old = btn.textContent;
          btn.textContent = 'แล้ว';
          btn.classList.add('done');
          setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1500);
        }, function () {
          toast('คัดลอกไม่ได้ กดค้างที่เลขบัญชีเพื่อคัดลอกเอง');
        });
      });
    });
  }

  // ---------- จำนวนเงิน + QR ----------
  var amount = 0;

  function readAmount(input) {
    // เก็บเฉพาะตัวเลขกับจุดทศนิยมหนึ่งจุด ทศนิยมไม่เกิน 2 ตำแหน่ง
    var v = input.value.replace(/,/g, '').replace(/[^\d.]/g, '');
    var firstDot = v.indexOf('.');
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
    }
    if (parseFloat(v) > MAX_AMOUNT) v = v.slice(0, -1);
    if (v !== input.value) input.value = v;
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function render() {
    var payload = promptPayPayload(PROMPTPAY_ID, amount);
    drawQR($('qr'), payload, 560);
    var label = $('qr-amount');
    if (amount > 0) {
      label.textContent = 'จำนวนเงิน ' + formatMoney(amount) + ' บาท';
      label.classList.add('has-amount');
    } else {
      label.textContent = 'ไม่ระบุจำนวนเงิน';
      label.classList.remove('has-amount');
    }
    $('amount-clear').hidden = !$('amount').value;
  }

  function initAmount() {
    var input = $('amount');
    input.addEventListener('input', function () {
      amount = readAmount(input);
      render();
    });
    $('amount-clear').addEventListener('click', function () {
      input.value = '';
      amount = 0;
      render();
      input.focus();
    });
  }

  // ---------- บันทึกภาพ ----------
  function loadLogo() {
    return new Promise(function (resolve) {
      var img = $('pp-logo');
      if (img.complete && img.naturalWidth) return resolve(img);
      img.addEventListener('load', function () { resolve(img); }, { once: true });
      img.addEventListener('error', function () { resolve(null); }, { once: true });
    });
  }

  function compose(logo) {
    var W = 720, H = 1000;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    var y = 40;
    if (logo) {
      var lw = 460, lh = Math.round(lw * logo.naturalHeight / logo.naturalWidth);
      ctx.drawImage(logo, (W - lw) / 2, y, lw, lh);
      y += lh + 24;
    } else {
      ctx.fillStyle = '#003d6a';
      ctx.font = '600 40px Sarabun, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PromptPay', W / 2, y + 40);
      y += 70;
    }

    var qrSize = 560;
    var qrCanvas = $('qr');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, (W - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 50;

    ctx.fillStyle = '#1f2328';
    ctx.textAlign = 'center';
    ctx.font = '600 40px Sarabun, Tahoma, sans-serif';
    ctx.fillText(ACCOUNT_NAME, W / 2, y);
    y += 50;
    ctx.font = '400 32px Sarabun, Tahoma, sans-serif';
    ctx.fillStyle = '#4a4f57';
    ctx.fillText(amount > 0 ? 'จำนวนเงิน ' + formatMoney(amount) + ' บาท' : 'ไม่ระบุจำนวนเงิน', W / 2, y);
    return cv;
  }

  function toBlob(cv) {
    return new Promise(function (resolve, reject) {
      try {
        cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('blob')); }, 'image/png');
      } catch (e) { reject(e); }
    });
  }

  function saveImage() {
    var fileName = 'promptpay-qr' + (amount > 0 ? '-' + amount.toFixed(2) : '') + '.png';
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return Promise.all([loadLogo(), ready]).then(function (r) {
      // เปิดไฟล์ตรง ๆ (file://) เบราว์เซอร์อาจห้ามใช้รูปโลโก้ ให้ลองใหม่แบบไม่มีโลโก้
      return toBlob(compose(r[0])).catch(function () { return toBlob(compose(null)); });
    }).then(function (blob) {
      var file = null;
      try { file = new File([blob], fileName, { type: 'image/png' }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: 'QR พร้อมเพย์' }).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          throw err;
        });
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('บันทึกภาพแล้ว');
    }).catch(function () {
      toast('บันทึกไม่ได้ ลองกดค้างที่ QR แล้วเลือกบันทึกรูป');
    });
  }

  // ---------- เริ่มทำงาน ----------
  document.addEventListener('DOMContentLoaded', function () {
    initCopy();
    initAmount();
    $('save-img').addEventListener('click', saveImage);
    render();
  });
})();
