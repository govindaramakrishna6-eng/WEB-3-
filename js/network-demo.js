/* Decentralization demo: knock computers offline in a client–server
   network vs a peer-to-peer network and see what survives. */
(function () {
  "use strict";

  var svg = document.getElementById("net-svg");
  var statusEl = document.getElementById("net-status");
  var resetBtn = document.getElementById("net-reset");
  var modeBtns = Array.prototype.slice.call(document.querySelectorAll(".segmented [data-mode]"));
  if (!svg) return;

  var NS = "http://www.w3.org/2000/svg";
  var CX = 200, CY = 160;

  var LAYOUTS = {
    central: (function () {
      var nodes = [{ x: CX, y: CY, hub: true, label: "Server" }];
      for (var i = 0; i < 6; i++) {
        var a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        nodes.push({ x: CX + Math.cos(a) * 125, y: CY + Math.sin(a) * 118, label: "User " + (i + 1) });
      }
      var edges = [];
      for (var j = 1; j < nodes.length; j++) edges.push([0, j]);
      return { nodes: nodes, edges: edges };
    })(),
    p2p: (function () {
      var pts = [[200, 38], [318, 92], [336, 214], [238, 286], [118, 276], [62, 168], [104, 64], [206, 160]];
      var nodes = pts.map(function (p, i) { return { x: p[0], y: p[1], label: "Node " + (i + 1) }; });
      var edges = [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
        [7, 0], [7, 2], [7, 4], [7, 5], [1, 7], [6, 1], [3, 5]
      ];
      return { nodes: nodes, edges: edges };
    })()
  };

  var mode = "central";
  var off = new Set();

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  // Which online nodes can still reach each other? Returns list of groups.
  function components(layout) {
    var adj = layout.nodes.map(function () { return []; });
    layout.edges.forEach(function (e) {
      if (off.has(e[0]) || off.has(e[1])) return;
      adj[e[0]].push(e[1]);
      adj[e[1]].push(e[0]);
    });
    var seen = new Set(), groups = [];
    layout.nodes.forEach(function (_, i) {
      if (off.has(i) || seen.has(i)) return;
      var stack = [i], group = [];
      seen.add(i);
      while (stack.length) {
        var n = stack.pop();
        group.push(n);
        adj[n].forEach(function (m) { if (!seen.has(m)) { seen.add(m); stack.push(m); } });
      }
      groups.push(group);
    });
    return groups;
  }

  function draw() {
    var layout = LAYOUTS[mode];
    var hubDown = mode === "central" && off.has(0);

    while (svg.lastChild && svg.lastChild.tagName !== "title") svg.removeChild(svg.lastChild);

    var gEdges = el("g", {});
    layout.edges.forEach(function (e) {
      var a = layout.nodes[e[0]], b = layout.nodes[e[1]];
      var dead = off.has(e[0]) || off.has(e[1]) || hubDown;
      gEdges.appendChild(el("line", {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: "edge " + (dead ? "dead" : "flow")
      }));
    });
    svg.appendChild(gEdges);

    layout.nodes.forEach(function (n, i) {
      var isOff = off.has(i);
      // In client–server mode, users are stranded when the server is down.
      var cut = !isOff && hubDown && !n.hub;
      var g = el("g", {
        class: "node" + (n.hub ? " hub" : "") + (isOff ? " off" : "") + (cut ? " cut" : ""),
        transform: "translate(" + n.x + " " + n.y + ")",
        tabindex: "0",
        role: "button",
        "aria-pressed": String(isOff),
        "aria-label": n.label + (isOff ? ", offline. Activate to bring back online" : ", online. Activate to take offline")
      });
      g.appendChild(el("circle", { r: n.hub ? 30 : 22 }));
      var glyph = el("text", { class: "glyph", y: "5" });
      glyph.textContent = isOff ? "✕" : n.hub ? "▣" : "●";
      g.appendChild(glyph);
      var label = el("text", { y: n.hub ? 48 : 38 });
      label.textContent = n.label;
      g.appendChild(label);

      function flip() {
        if (off.has(i)) off.delete(i); else off.add(i);
        draw();
        var again = svg.querySelectorAll(".node")[i];
        if (again) again.focus();
      }
      g.addEventListener("click", flip);
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
      });
      svg.appendChild(g);
    });

    updateStatus(layout);
  }

  function setStatus(kind, title, detail) {
    statusEl.className = "net-status" + (kind ? " " + kind : "");
    statusEl.innerHTML = title + "<small>" + detail + "</small>";
  }

  function updateStatus(layout) {
    var total = layout.nodes.length;
    if (mode === "central") {
      if (off.has(0)) {
        setStatus("down", "Service is down for everyone.",
          "One server failed, so all " + (total - 1) + " users lost access — even the ones whose computers are fine.");
      } else if (off.size) {
        setStatus("", "Service is up.", off.size + " user(s) offline, but only they are affected. Now try the server.");
      } else {
        setStatus("", "Everything's running.", "Every user depends on that one server in the middle. What if it fails?");
      }
      return;
    }

    var online = total - off.size;
    var groups = components(layout);
    if (online === 0) {
      setStatus("down", "You switched off every node.",
        "On Ethereum that would mean unplugging thousands of independent computers across dozens of countries at once.");
    } else if (groups.length > 1) {
      setStatus("warn", "Still running, but split into " + groups.length + " groups.",
        "Each group keeps its own copy. When they reconnect, they re-sync to the chain with the most work or stake behind it.");
    } else if (off.size) {
      setStatus("", "Ledger still running on " + online + " of " + total + " nodes.",
        "Every node holds a full copy, so there's nothing central to break. Keep going — how many can you remove?");
    } else {
      setStatus("", "All " + total + " nodes agree on the same ledger.", "There's no middle to attack. Try switching some off.");
    }
  }

  modeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      mode = btn.dataset.mode;
      off.clear();
      modeBtns.forEach(function (b) { b.setAttribute("aria-checked", String(b === btn)); });
      draw();
    });
  });
  resetBtn.addEventListener("click", function () { off.clear(); draw(); });

  draw();
})();
