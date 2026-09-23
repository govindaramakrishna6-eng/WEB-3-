/* Live Ethereum ticker for the hero card.
   Reads the latest block straight from public Ethereum nodes via JSON-RPC
   (no API key, no wallet needed). Falls back gracefully when offline. */
(function () {
  "use strict";

  var RPC_URLS = [
    "https://ethereum-rpc.publicnode.com",
    "https://eth.llamarpc.com",
    "https://1rpc.io/eth"
  ];
  var POLL_MS = 12000;

  var el = {
    status: document.getElementById("live-status"),
    pulse: document.getElementById("live-pulse"),
    number: document.getElementById("live-block"),
    txs: document.getElementById("live-txs"),
    age: document.getElementById("live-age"),
    fee: document.getElementById("live-fee")
  };
  if (!el.number) return;

  var rpcIndex = 0;
  var lastNumber = null;
  var lastTimestamp = null;
  var failures = 0;

  function rpc(method, params) {
    var url = RPC_URLS[rpcIndex];
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 8000);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { if (j.error) throw new Error(j.error.message); return j.result; })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  function formatGwei(hexWei) {
    if (!hexWei) return "—";
    var gwei = Number(BigInt(hexWei)) / 1e9;
    return (gwei < 1 ? gwei.toFixed(3) : gwei.toFixed(1)) + " gwei";
  }

  function renderAge() {
    if (!lastTimestamp) return;
    var secs = Math.max(0, Math.round(Date.now() / 1000 - lastTimestamp));
    el.age.textContent = secs < 60 ? secs + "s ago" : Math.floor(secs / 60) + "m ago";
  }

  function update() {
    rpc("eth_getBlockByNumber", ["latest", false])
      .then(function (block) {
        failures = 0;
        var n = parseInt(block.number, 16);
        if (n !== lastNumber) {
          el.number.textContent = "#" + n.toLocaleString("en-US");
          el.number.classList.remove("bump");
          void el.number.offsetWidth; // restart the highlight animation
          el.number.classList.add("bump");
          lastNumber = n;
        }
        lastTimestamp = parseInt(block.timestamp, 16);
        el.txs.textContent = block.transactions.length.toLocaleString("en-US");
        el.fee.textContent = formatGwei(block.baseFeePerGas);
        el.status.textContent = "live";
        el.pulse.className = "pulse on";
        renderAge();
      })
      .catch(function () {
        failures++;
        rpcIndex = (rpcIndex + 1) % RPC_URLS.length;
        if (failures >= RPC_URLS.length) {
          el.status.textContent = "offline right now";
          el.pulse.className = "pulse off";
          if (lastNumber === null) {
            el.number.textContent = "no signal";
          }
        } else {
          setTimeout(update, 800); // try the next node straight away
        }
      });
  }

  update();
  setInterval(update, POLL_MS);
  setInterval(renderAge, 1000);
})();
