/* Concept explorer, myth flip cards and the pocket quiz. */
(function () {
  "use strict";

  /* ---------- Concept explorer ---------- */
  var ICONS = {
    coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 8h4.5a2 2 0 0 1 0 4H9h5a2 2 0 0 1 0 4H9M9 8v8M11 6v2M11 16v2"/></svg>',
    key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></svg>',
    fuel: '<svg viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M7 7h5v4H7zM15 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-3-3"/></svg>',
    gem: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 18 3-18"/></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14.5 14.5A5 5 0 0 1 21 19"/></svg>',
    scale: '<svg viewBox="0 0 24 24"><path d="M12 3v18M7 21h10M4 7h16M4 7l-2 6a3 3 0 0 0 5 0zM20 7l-2 6a3 3 0 0 0 5 0z"/></svg>'
  };

  var CONCEPTS = [
    {
      id: "crypto", icon: "coin", color: "var(--butter)",
      title: "Cryptocurrency", tag: "Money without a bank in the middle",
      plain: "Digital money tracked on a blockchain. Instead of a bank updating its private spreadsheet, thousands of computers update a shared public one. You can send it to anyone, anywhere, at 3am on a Sunday.",
      like: "Handing someone cash — but over the internet. Nobody approves it; the network just checks that you really have it.",
      real: "On 22 May 2010, programmer Laszlo Hanyecz paid 10,000 BTC for two Papa John's pizzas. It's now celebrated every year as “Bitcoin Pizza Day” — those coins later became worth hundreds of millions of dollars.",
      caveat: "Prices swing wildly, and a payment to a mistyped address can't be reversed. There is no “cancel” button."
    },
    {
      id: "wallet", icon: "key", color: "var(--lilac)",
      title: "Wallets & keys", tag: "Your password is also your vault",
      plain: "A wallet doesn't actually hold coins — they live on the blockchain. The wallet holds your private key, a secret number that proves you're allowed to move them. Your public address is like an account number you can share.",
      like: "Your address is your mailbox number: share it freely. Your private key is the only key to that mailbox: share it with no one.",
      real: "Most wallets back up your key as 12 or 24 ordinary words picked from a fixed list of 2,048 (the BIP-39 standard). Whoever has those words has your money — which is exactly why scammers ask for them.",
      caveat: "Lose the key and nobody can recover it. That's the price of nobody being able to take it from you."
    },
    {
      id: "gas", icon: "fuel", color: "var(--sky)",
      title: "Gas fees", tag: "A tip for the computers doing the work",
      plain: "Every action that changes the blockchain costs a small fee, paid to the validators who process it. Fees go up when the network is busy — like surge pricing for a taxi.",
      like: "Postage on a letter. Heavier letters (complex actions) and busy seasons cost more to send.",
      real: "In December 2017, a game of collectable cartoon cats called CryptoKitties became so popular it clogged Ethereum and pushed fees up for everyone. Today many apps run on cheaper “Layer 2” networks like Arbitrum, Optimism and Base. The base fee in the live card at the top of this page is the real number, right now.",
      caveat: "You still pay gas if your transaction fails. Reading data and signing messages are free."
    },
    {
      id: "nft", icon: "gem", color: "var(--tomato-soft)",
      title: "NFTs", tag: "A receipt for one specific thing",
      plain: "NFT stands for non-fungible token. “Fungible” means swappable — any dollar equals any other dollar. An NFT is one-of-a-kind: a blockchain record saying a particular address owns a particular item.",
      like: "A concert ticket with your seat number printed on it. It isn't interchangeable with anyone else's.",
      real: "In March 2021, Christie's auctioned Beeple's “Everydays: The First 5000 Days” as an NFT for $69.3 million. A quieter example: ENS names like vitalik.eth are NFTs too, and they work as usernames across apps.",
      caveat: "The image usually lives somewhere else; the NFT just points to it. And most 2021-era NFT prices collapsed afterwards."
    },
    {
      id: "dao", icon: "people", color: "var(--mint)",
      title: "DAOs", tag: "A group chat with a shared bank account",
      plain: "A decentralized autonomous organization is a group that makes decisions by voting with tokens, while its treasury is held by a smart contract. If a vote passes, the contract carries it out — no CEO signs off.",
      like: "A club where the rulebook is also the treasurer. Majority says yes? The money moves by itself.",
      real: "In November 2021, ConstitutionDAO raised about $47 million from more than 17,000 people in under a week to bid on an original printing of the US Constitution. They lost the auction to billionaire Ken Griffin — then had to refund everyone.",
      caveat: "Voting power usually follows money, and often only a small share of token holders actually vote."
    },
    {
      id: "defi", icon: "scale", color: "var(--butter-soft)",
      title: "Stablecoins & DeFi", tag: "Steady coins and banks made of code",
      plain: "Stablecoins are tokens designed to stay worth $1, usually backed by cash and government bonds held by a company. DeFi (decentralized finance) uses smart contracts to lend, borrow and trade them without a bank.",
      like: "Casino chips that are always worth exactly one dollar — and that you can carry to any table in the world.",
      real: "USDT and USDC are the largest stablecoins, with well over $200 billion in circulation combined. People use them to send money across borders in minutes instead of days.",
      caveat: "“Stable” is only as good as the backing. In May 2022, the algorithmic stablecoin TerraUSD lost its $1 peg and it and its sister token LUNA collapsed, erasing tens of billions of dollars in days."
    }
  ];

  var list = document.getElementById("concept-list");
  var panel = document.getElementById("concept-panel");

  if (list && panel) {
    CONCEPTS.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.id = "concept-tab-" + c.id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "concept-panel");
      b.innerHTML = '<span class="ico" style="background:' + c.color + '">' + ICONS[c.icon] + "</span>" +
        "<span>" + c.title + "<small>" + c.tag + "</small></span>";
      list.appendChild(b);
    });

    var conceptTabs = Array.prototype.slice.call(list.children);

    var selectConcept = function (index) {
      var c = CONCEPTS[index];
      conceptTabs.forEach(function (t, i) {
        t.setAttribute("aria-selected", String(i === index));
        t.tabIndex = i === index ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", conceptTabs[index].id);
      panel.innerHTML =
        '<div class="cp-in">' +
        '<div class="cp-head"><span class="ico" style="background:' + c.color + '">' + ICONS[c.icon] + "</span>" +
        "<div><h3>" + c.title + "</h3><p>" + c.tag + "</p></div></div>" +
        '<p class="cp-plain">' + c.plain + "</p>" +
        '<div class="cp-grid">' +
        '<div class="cp-box like"><h4>Think of it like</h4><p>' + c.like + "</p></div>" +
        '<div class="cp-box real"><h4>Real example</h4><p>' + c.real + "</p></div>" +
        '<div class="cp-box catch"><h4>The catch</h4><p>' + c.caveat + "</p></div>" +
        "</div></div>";
    };

    window.FG.tabs(conceptTabs, selectConcept);
    selectConcept(0);
  }

  /* ---------- Myth flip cards ---------- */
  document.querySelectorAll(".flip").forEach(function (card) {
    card.addEventListener("click", function () {
      var on = card.getAttribute("aria-pressed") !== "true";
      card.setAttribute("aria-pressed", String(on));
    });
  });

  /* ---------- Pocket quiz ---------- */
  var QUESTIONS = [
    {
      q: "Someone quietly edits a transaction in an old block. How does everyone notice?",
      options: [
        "A central admin gets an email alert",
        "Its hash changes, so the next block's “previous hash” no longer matches",
        "The block is automatically deleted",
        "They don't — old blocks can't be checked"
      ],
      answer: 1,
      why: "Every block stores the previous block's fingerprint. Change anything and the fingerprints stop lining up — exactly what you saw in the demo."
    },
    {
      q: "Which of these should you never share with anyone?",
      options: ["Your wallet address", "Your ENS name", "Your 12-word recovery phrase", "A transaction hash"],
      answer: 2,
      why: "The recovery phrase is your private key in word form. Addresses, names and transaction hashes are public by design."
    },
    {
      q: "What does “non-fungible” mean?",
      options: ["Free to copy", "One-of-a-kind, not swappable", "Impossible to sell", "Stored off the internet"],
      answer: 1,
      why: "A dollar is fungible — any one will do. Your concert seat isn't. NFTs are like the seat."
    },
    {
      q: "In 2021, ConstitutionDAO pooled about $47 million to buy…",
      options: ["A football club", "Beeple's $69M artwork", "An original printing of the US Constitution", "Two pizzas"],
      answer: 2,
      why: "Over 17,000 people chipped in within a week. They were outbid, but it showed how fast a DAO can organize strangers around a goal."
    },
    {
      q: "What happens when you “sign a message” with your wallet?",
      options: [
        "You pay a gas fee",
        "Your coins move to the website",
        "You prove you own the address, without spending anything",
        "The site learns your private key"
      ],
      answer: 2,
      why: "Signing creates a digital autograph only your key could make. No transaction, no gas, no key revealed. Try it in the wallet section below."
    }
  ];

  var body = document.getElementById("quiz-body");
  var count = document.getElementById("quiz-count");
  var barFill = document.getElementById("quiz-bar");
  if (!body) return;

  var current = 0, score = 0;

  function renderQuestion() {
    var item = QUESTIONS[current];
    count.textContent = current + 1 + " / " + QUESTIONS.length;
    barFill.style.width = (current / QUESTIONS.length) * 100 + "%";
    body.innerHTML = '<p class="quiz-q">' + item.q + '</p><div class="quiz-opts"></div>';
    var opts = body.querySelector(".quiz-opts");

    item.options.forEach(function (text, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", function () { choose(i); });
      opts.appendChild(b);
    });

    function choose(i) {
      var buttons = opts.querySelectorAll("button");
      buttons.forEach(function (b) { b.disabled = true; });
      buttons[item.answer].classList.add("right");
      var correct = i === item.answer;
      if (correct) score++;
      else buttons[i].classList.add("wrong");

      var explain = document.createElement("p");
      explain.className = "quiz-explain";
      explain.innerHTML = "<b>" + (correct ? "Nice. " : "Not quite. ") + "</b>" + item.why;
      body.appendChild(explain);

      var next = document.createElement("button");
      next.type = "button";
      next.className = "btn btn-primary quiz-next";
      next.textContent = current < QUESTIONS.length - 1 ? "Next question" : "See my score";
      next.addEventListener("click", function () {
        current++;
        if (current < QUESTIONS.length) renderQuestion(); else renderResult();
      });
      body.appendChild(next);
      next.focus({ preventScroll: true });
    }
  }

  function renderResult() {
    barFill.style.width = "100%";
    count.textContent = "Done";
    var msg = score === QUESTIONS.length ? "Perfect. You could explain Web3 at dinner now."
      : score >= 3 ? "Solid. You've got the fundamentals."
      : "Good start — scroll back up and poke the demos again.";
    body.innerHTML = '<div class="quiz-result"><p class="big">' + score + "/" + QUESTIONS.length + "</p><p>" + msg + "</p></div>";
    var again = document.createElement("button");
    again.type = "button";
    again.className = "btn btn-ghost quiz-next";
    again.textContent = "Try again";
    again.addEventListener("click", function () { current = 0; score = 0; renderQuestion(); });
    body.querySelector(".quiz-result").appendChild(again);
  }

  renderQuestion();
})();
