/* Vending-machine smart contract simulation.
   Steps through the Solidity-style code line by line and produces a
   transaction receipt. Amounts are tracked in hundredths of ETH to avoid
   floating-point rounding. Nothing here touches a real network. */
(function () {
  "use strict";

  var snacks = Array.prototype.slice.call(document.querySelectorAll("#snacks [role=radio]"));
  var coins = document.querySelectorAll(".coin");
  var paidEl = document.getElementById("vm-paid");
  var buyBtn = document.getElementById("vm-buy");
  var clearBtn = document.getElementById("vm-clear");
  var tray = document.getElementById("vm-tray");
  var receipt = document.getElementById("vm-receipt");
  var code = document.getElementById("vm-code");
  if (!buyBtn) return;

  var selected = snacks[0];
  var paid = 0; // hundredths of ETH
  var running = false;

  function fmt(cents) { return (cents / 100).toFixed(2) + " ETH"; }
  function priceOf(btn) { return Math.round(parseFloat(btn.dataset.price) * 100); }
  function line(n) { return code.querySelector('[data-line="' + n + '"]'); }
  function clearHighlights() {
    code.querySelectorAll(".ln").forEach(function (l) { l.classList.remove("hl", "hl-bad", "hl-ok"); });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  snacks.forEach(function (btn) {
    btn.addEventListener("click", function () {
      selected = btn;
      snacks.forEach(function (b) { b.setAttribute("aria-checked", String(b === btn)); });
    });
  });

  coins.forEach(function (c) {
    c.addEventListener("click", function () {
      paid += Math.round(parseFloat(c.dataset.coin) * 100);
      paidEl.textContent = fmt(paid);
    });
  });

  clearBtn.addEventListener("click", function () {
    paid = 0;
    paidEl.textContent = fmt(paid);
  });

  function fakeTxHash() {
    var seed = Date.now() + ":" + Math.random();
    return "0x" + (window.sha256 ? window.sha256(seed) : seed);
  }

  function showReceipt(ok, extra) {
    var gas = ok ? 51000 + Math.floor(Math.random() * 3000) : 23000 + Math.floor(Math.random() * 900);
    receipt.innerHTML =
      "<dl>" +
      "<dt>Status</dt><dd class=\"" + (ok ? "status-ok" : "status-bad") + "\">" +
      (ok ? "Success" : "Reverted: \"Not enough ETH\"") + "</dd>" +
      "<dt>Tx hash</dt><dd>" + fakeTxHash().slice(0, 30) + "…</dd>" +
      "<dt>From</dt><dd>0xYou…</dd>" +
      "<dt>Sent</dt><dd>" + fmt(extra.sent) + "</dd>" +
      (ok ? "<dt>Change</dt><dd>" + fmt(extra.change) + " returned</dd>" : "<dt>Refund</dt><dd>" + fmt(extra.sent) + " (whole payment)</dd>") +
      "<dt>Gas used</dt><dd>" + gas.toLocaleString("en-US") + " units (simulated)</dd>" +
      "</dl>";
  }

  buyBtn.addEventListener("click", async function () {
    if (running) return;
    running = true;
    buyBtn.disabled = true;
    clearHighlights();
    receipt.innerHTML = '<p class="receipt-empty">Running on every node…</p>';

    var price = priceOf(selected);
    var name = selected.dataset.name;
    var sent = paid;

    line(4).classList.add("hl");
    await wait(550);
    line(4).classList.remove("hl");

    if (sent < price) {
      line(5).classList.add("hl-bad");
      showReceipt(false, { sent: sent });
      tray.innerHTML = "<span>Nothing dispensed. Needed " + fmt(price) + ", got " + fmt(sent) + ".</span>";
    } else {
      line(5).classList.add("hl-ok");
      await wait(500);
      line(6).classList.add("hl");
      await wait(500);
      line(7).classList.add("hl");
      await wait(500);
      line(8).classList.add("hl-ok");
      var change = sent - price;
      tray.innerHTML = '<span class="item">&#10003; ' + name + " dispensed</span>" +
        (change ? "<span>+ " + fmt(change) + " change</span>" : "");
      showReceipt(true, { sent: sent, change: change });
    }

    paid = 0;
    paidEl.textContent = fmt(paid);
    running = false;
    buyBtn.disabled = false;
  });
})();
