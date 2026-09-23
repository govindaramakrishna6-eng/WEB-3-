/* "Break the chain" demo.
   Four blocks, each hashing (number + nonce + data + previous hash).
   A block is valid when its hash starts with DIFFICULTY zeros and its
   "previous" field matches the block before it. Editing data breaks the
   block and everything after it; mining searches for a new nonce. */
(function () {
  "use strict";

  var DIFFICULTY = "000";
  var GENESIS_PREV = "0".repeat(64);
  var DEFAULT_DATA = [
    "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks",
    "Alice pays Bob 5 coins",
    "Bob pays Carol 2 coins",
    "Carol pays Dan 1 coin"
  ];

  var hashInput = document.getElementById("hash-input");
  var hashOutput = document.getElementById("hash-output");
  var chainEl = document.getElementById("chain");
  var verdict = document.getElementById("chain-verdict");
  var resetBtn = document.getElementById("chain-reset");
  if (!chainEl || !window.sha256) return;

  /* ---------- Fingerprint playground ---------- */
  var prevHash = "";
  function renderHash() {
    var h = window.sha256(hashInput.value);
    // Highlight the characters that changed since the last keystroke.
    var html = "";
    for (var i = 0; i < h.length; i++) {
      html += prevHash && prevHash[i] !== h[i] ? '<span class="chg">' + h[i] + "</span>" : h[i];
    }
    hashOutput.innerHTML = html;
    prevHash = h;
  }
  hashInput.addEventListener("input", renderHash);
  renderHash();

  /* ---------- Chain ---------- */
  var blocks = [];

  function hashBlock(b) {
    return window.sha256(b.number + "|" + b.nonce + "|" + b.data + "|" + b.prev);
  }

  function mineSync(b) {
    b.nonce = 0;
    while (!hashBlock(b).startsWith(DIFFICULTY)) b.nonce++;
    b.hash = hashBlock(b);
  }

  function build() {
    blocks = DEFAULT_DATA.map(function (data, i) {
      return { number: i, nonce: 0, data: data, prev: "", hash: "" };
    });
    // Pre-mine so the chain starts out valid.
    blocks.forEach(function (b, i) {
      b.prev = i === 0 ? GENESIS_PREV : blocks[i - 1].hash;
      mineSync(b);
    });
    render();
  }

  function recompute() {
    blocks.forEach(function (b, i) {
      b.prev = i === 0 ? GENESIS_PREV : blocks[i - 1].hash;
      b.hash = hashBlock(b);
    });
  }

  function isValid(i) {
    // Valid only if this block's proof-of-work holds AND every earlier block is valid.
    for (var j = 0; j <= i; j++) {
      if (!blocks[j].hash.startsWith(DIFFICULTY)) return false;
    }
    return true;
  }

  function short(h) { return h.slice(0, 18) + "…" + h.slice(-6); }

  function fieldHTML(h) {
    var s = short(h);
    var zeros = s.match(/^0*/)[0];
    return "<b>" + zeros + "</b>" + s.slice(zeros.length);
  }

  function render() {
    chainEl.innerHTML = "";
    blocks.forEach(function (b, i) {
      var li = document.createElement("li");
      li.className = "block";
      li.innerHTML =
        '<div class="block-top"><strong>Block #' + b.number + '</strong><span class="block-badge"></span></div>' +
        '<label for="blk-data-' + i + '">Data</label>' +
        '<textarea id="blk-data-' + i + '" rows="3" spellcheck="false"></textarea>' +
        "<label>Nonce</label><div class=\"field nonce\"></div>" +
        "<label>Previous hash</label><div class=\"field prev\"></div>" +
        "<label>This block's hash</label><div class=\"field hash\"></div>" +
        '<button type="button" class="btn btn-small btn-ghost mine-btn">Mine this block</button>';
      var ta = li.querySelector("textarea");
      ta.value = b.data;
      ta.addEventListener("input", function () {
        b.data = ta.value;
        recompute();
        paint();
      });
      li.querySelector(".mine-btn").addEventListener("click", function () { mine(i); });
      chainEl.appendChild(li);
    });
    paint();
  }

  function paint() {
    var items = chainEl.children;
    var broken = -1;
    blocks.forEach(function (b, i) {
      var li = items[i];
      var ok = isValid(i);
      if (!ok && broken < 0) broken = i;
      li.classList.toggle("invalid", !ok);
      li.querySelector(".block-badge").textContent = ok ? "valid" : "broken";
      li.querySelector(".nonce").textContent = b.nonce.toLocaleString("en-US");
      li.querySelector(".prev").innerHTML = fieldHTML(b.prev);
      li.querySelector(".hash").innerHTML = fieldHTML(b.hash);
      li.setAttribute("aria-label", "Block " + b.number + ", " + (ok ? "valid" : "broken"));
    });

    if (broken < 0) {
      verdict.className = "chain-verdict";
      verdict.textContent = "Chain is valid. Every block's fingerprint lines up with the next one.";
    } else {
      verdict.className = "chain-verdict bad";
      var n = blocks.length - broken;
      verdict.textContent = "Tampering detected from block #" + broken + ". " +
        (n > 1 ? n + " blocks now need re-mining" : "1 block needs re-mining") +
        " — and on a real network you'd have to out-mine everyone else to get away with it.";
    }
  }

  // Animated mining: hash in small batches per frame so the nonce visibly counts up.
  var mining = false;
  function mine(i) {
    if (mining) return;
    mining = true;
    var b = blocks[i];
    var li = chainEl.children[i];
    var btn = li.querySelector(".mine-btn");
    var nonceEl = li.querySelector(".nonce");
    var hashEl = li.querySelector(".hash");
    var buttons = chainEl.querySelectorAll(".mine-btn");
    buttons.forEach(function (x) { x.disabled = true; });
    btn.textContent = "Mining…";
    b.nonce = 0;

    function step() {
      for (var k = 0; k < 150; k++) {
        b.hash = hashBlock(b);
        if (b.hash.startsWith(DIFFICULTY)) {
          recompute();
          paint();
          li.classList.remove("mined");
          void li.offsetWidth;
          li.classList.add("mined");
          btn.textContent = "Mined in " + (b.nonce + 1).toLocaleString("en-US") + " tries";
          setTimeout(function () { btn.textContent = "Mine this block"; }, 2200);
          buttons.forEach(function (x) { x.disabled = false; });
          mining = false;
          return;
        }
        b.nonce++;
      }
      nonceEl.textContent = b.nonce.toLocaleString("en-US");
      hashEl.innerHTML = fieldHTML(b.hash);
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  resetBtn.addEventListener("click", function () {
    if (!mining) build();
  });

  build();
})();
