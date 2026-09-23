/* Wallet connection (bonus).
   - Discovers every installed wallet via EIP-6963, falls back to window.ethereum
   - Connects with eth_requestAccounts (EIP-1193)
   - Reads network + balance straight from the chain through the wallet
   - Signs a free message with personal_sign
   - Offers a one-click switch to the Sepolia testnet
   No private data ever leaves the wallet; nothing is stored by this page. */
(function () {
  "use strict";

  var CHAINS = {
    "0x1": { name: "Ethereum Mainnet", symbol: "ETH" },
    "0xaa36a7": { name: "Sepolia testnet", symbol: "SepoliaETH" },
    "0x89": { name: "Polygon", symbol: "POL" },
    "0xa": { name: "OP Mainnet", symbol: "ETH" },
    "0xa4b1": { name: "Arbitrum One", symbol: "ETH" },
    "0x2105": { name: "Base", symbol: "ETH" },
    "0x38": { name: "BNB Smart Chain", symbol: "BNB" },
    "0xe708": { name: "Linea", symbol: "ETH" }
  };
  var SEPOLIA = "0xaa36a7";

  var $ = function (id) { return document.getElementById(id); };
  var ui = {
    disconnected: $("wallet-disconnected"),
    connected: $("wallet-connected"),
    detect: $("wallet-detect"),
    providers: $("wallet-providers"),
    connect: $("wallet-connect"),
    install: $("wallet-install"),
    mobile: $("wallet-mobile"),
    error: $("wallet-error"),
    error2: $("wallet-error-2"),
    avatar: $("wallet-avatar"),
    addr: $("wallet-addr"),
    copy: $("wallet-copy"),
    network: $("wallet-network"),
    balance: $("wallet-balance"),
    name: $("wallet-name"),
    sign: $("wallet-sign"),
    sepolia: $("wallet-sepolia"),
    disconnect: $("wallet-disconnect"),
    sigBox: $("wallet-signature"),
    sigOut: $("wallet-sig-out")
  };
  if (!ui.connect) return;

  var discovered = []; // [{ info, provider }]
  var active = null;   // { info, provider }
  var account = null;

  /* ---------- Discovery ---------- */
  window.addEventListener("eip6963:announceProvider", function (event) {
    var d = event.detail;
    if (!d || !d.info || !d.provider) return;
    if (discovered.some(function (x) { return x.info.uuid === d.info.uuid; })) return;
    discovered.push({ info: d.info, provider: d.provider });
    renderProviders();
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  // Give wallets a moment to announce, then decide what to show.
  setTimeout(renderProviders, 500);

  function isMobile() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

  function renderProviders() {
    ui.providers.innerHTML = "";
    ui.connect.hidden = true;
    ui.install.hidden = true;
    ui.mobile.hidden = true;

    if (discovered.length > 1) {
      ui.detect.textContent = "Found " + discovered.length + " wallets. Pick one:";
      discovered.forEach(function (w) {
        var b = document.createElement("button");
        b.type = "button";
        var img = document.createElement("img");
        img.src = w.info.icon;
        img.alt = "";
        var label = document.createElement("span");
        label.textContent = w.info.name;
        var arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        b.append(img, label, arrow);
        b.addEventListener("click", function () { connect(w); });
        ui.providers.appendChild(b);
      });
    } else if (discovered.length === 1 || window.ethereum) {
      var w = discovered[0] || { info: { name: window.ethereum.isMetaMask ? "MetaMask" : "Browser wallet" }, provider: window.ethereum };
      ui.detect.textContent = w.info.name + " detected. Connecting only shares your public address.";
      ui.connect.textContent = "Connect " + w.info.name;
      ui.connect.hidden = false;
      ui.connect.onclick = function () { connect(w); };
    } else {
      ui.detect.textContent = "No wallet found in this browser. You can still explore everything else on the page.";
      ui.install.hidden = false;
      if (isMobile()) {
        ui.mobile.hidden = false;
        ui.mobile.href = "https://metamask.app.link/dapp/" + location.host + location.pathname;
      }
    }
  }

  /* ---------- Helpers ---------- */
  function short(a) { return a.slice(0, 6) + "…" + a.slice(-4); }

  function formatEth(hexWei, symbol) {
    var wei = BigInt(hexWei);
    var whole = wei / 10n ** 18n;
    var frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
    return whole.toString() + "." + frac + " " + symbol;
  }

  function friendlyError(err) {
    if (!err) return "Something went wrong.";
    if (err.code === 4001) return "Request cancelled in the wallet. No problem — nothing happened.";
    if (err.code === -32002) return "Your wallet already has a request open. Check the wallet pop-up.";
    if (err.code === 4902) return "This network isn't added to your wallet yet.";
    return err.message || String(err);
  }

  function setError(msg) {
    (account ? ui.error2 : ui.error).textContent = msg || "";
  }

  // Deterministic 5x5 "identicon" from the address so each wallet gets its own badge.
  function identicon(address) {
    var palette = ["#a8e6cf", "#ff6b4a", "#ffd66b", "#c8b6ff", "#9ed3f0"];
    var hex = address.slice(2).toLowerCase();
    var bg = palette[parseInt(hex[0], 16) % palette.length];
    var fg = palette[(parseInt(hex[1], 16) % (palette.length - 1) + palette.indexOf(bg) + 1) % palette.length];
    var cells = "";
    for (var y = 0; y < 5; y++) {
      for (var x = 0; x < 3; x++) {
        if (parseInt(hex[2 + y * 3 + x], 16) % 2 === 0) {
          cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
          if (x < 2) cells += '<rect x="' + (4 - x) + '" y="' + y + '" width="1" height="1"/>';
        }
      }
    }
    return 'url("data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 7 7" shape-rendering="crispEdges">' +
      '<rect x="-1" y="-1" width="7" height="7" fill="' + bg + '"/><g fill="' + fg + '">' + cells + "</g></svg>"
    ) + '")';
  }

  /* ---------- Connect & read ---------- */
  function connect(w) {
    setError("");
    active = w;
    w.provider.request({ method: "eth_requestAccounts" })
      .then(function (accounts) {
        if (!accounts || !accounts.length) throw new Error("No account was shared.");
        attachListeners(w.provider);
        return showAccount(accounts[0]);
      })
      .catch(function (err) { setError(friendlyError(err)); });
  }

  function showAccount(address) {
    account = address;
    ui.disconnected.hidden = true;
    ui.connected.hidden = false;
    ui.addr.textContent = short(address);
    ui.addr.title = address;
    ui.avatar.style.backgroundImage = identicon(address);
    ui.avatar.style.backgroundSize = "cover";
    ui.name.textContent = active.info.name;
    ui.sigBox.hidden = true;
    ui.error2.textContent = "";
    return refreshChain();
  }

  function refreshChain() {
    var p = active.provider;
    ui.network.textContent = "…";
    ui.balance.textContent = "…";
    return p.request({ method: "eth_chainId" }).then(function (chainId) {
      chainId = String(chainId).toLowerCase();
      var chain = CHAINS[chainId] || { name: "Chain " + parseInt(chainId, 16), symbol: "native" };
      ui.network.textContent = chain.name;
      ui.sepolia.hidden = chainId === SEPOLIA;
      return p.request({ method: "eth_getBalance", params: [account, "latest"] }).then(function (bal) {
        ui.balance.textContent = formatEth(bal, chain.symbol);
      });
    }).catch(function (err) {
      ui.balance.textContent = "unavailable";
      setError(friendlyError(err));
    });
  }

  var listening = new WeakSet();
  function attachListeners(provider) {
    if (!provider.on || listening.has(provider)) return;
    listening.add(provider);
    provider.on("accountsChanged", function (accounts) {
      if (!active || active.provider !== provider) return;
      if (accounts.length) showAccount(accounts[0]); else resetUI();
    });
    provider.on("chainChanged", function () {
      if (active && active.provider === provider && account) refreshChain();
    });
  }

  function resetUI() {
    account = null;
    ui.connected.hidden = true;
    ui.disconnected.hidden = false;
    ui.sigBox.hidden = true;
    renderProviders();
  }

  /* ---------- Actions ---------- */
  ui.sign.addEventListener("click", function () {
    setError("");
    var nonce = Math.random().toString(36).slice(2, 10);
    var message =
      "Hello from the Web3 Field Guide!\n\n" +
      "Signing this proves I control " + account + ".\n" +
      "It is free, sends no transaction and moves no funds.\n\n" +
      "Nonce: " + nonce;
    var hexMsg = "0x" + Array.from(new TextEncoder().encode(message))
      .map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");

    ui.sign.disabled = true;
    active.provider.request({ method: "personal_sign", params: [hexMsg, account] })
      .then(function (sig) {
        ui.sigOut.textContent = sig;
        ui.sigBox.hidden = false;
      })
      .catch(function (err) { setError(friendlyError(err)); })
      .finally(function () { ui.sign.disabled = false; });
  });

  ui.sepolia.addEventListener("click", function () {
    setError("");
    active.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA }] })
      .catch(function (err) {
        if (err && err.code === 4902) {
          return active.provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: SEPOLIA,
              chainName: "Sepolia",
              nativeCurrency: { name: "Sepolia Ether", symbol: "SepoliaETH", decimals: 18 },
              rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"]
            }]
          });
        }
        throw err;
      })
      .then(refreshChain)
      .catch(function (err) { setError(friendlyError(err)); });
  });

  ui.copy.addEventListener("click", function () {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(account).then(function () {
      ui.copy.classList.add("copied");
      ui.copy.setAttribute("aria-label", "Address copied");
      setTimeout(function () {
        ui.copy.classList.remove("copied");
        ui.copy.setAttribute("aria-label", "Copy address");
      }, 1500);
    });
  });

  ui.disconnect.addEventListener("click", function () {
    // Sites can't force a wallet to forget them, but MetaMask supports revoking
    // the permission. Try it, and reset the page either way.
    var p = active && active.provider;
    if (p) {
      p.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }).catch(function () {});
    }
    resetUI();
  });
})();
