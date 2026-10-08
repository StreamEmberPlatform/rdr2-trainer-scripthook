/* StreamEmber Trainer (RDR2) — the big overlay menu.
 *
 * Built on MHud's menu shell (.mh-menu: header, left navigation, main area, preview aside, footer). Opened and closed by
 * the game (F5 → trainer:menu). In UI input mode (default) the mouse and keyboard go straight to the page; otherwise
 * the game forwards the menu keys (trainer:key → keydown events). Keyboard: arrows move the focus spatially (nav,
 * tabs, cards, buttons), Enter activates, Q/E switch tabs, Backspace jumps to the navigation, Esc closes.
 *
 * page → game: MH.post('trainer', { op, ... })  (Trainer.cs RegisterCommands)
 * game → page: trainer:menu { open }, trainer:state { cash, cores, counts, settings, ... } every 250 ms while open,
 *              trainer:inventory { weapons: { id: { owned, ammo } }, ammo: { type: n }, current }
 * Pictures: thumbnails of the Red Dead Wiki articles (Fandom API, CC BY-SA), fetched once and cached; MHud icons until
 * they arrive or when the wiki cannot be reached.
 */
(function () {
  'use strict';
  var MH = window.MH, C = window.TRAINER_CATALOG;
  if (!MH || !C) return;
  var esc = MH.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };

  var ui = {
    open: false, mouse: true, version: '',
    section: 'player', tabs: {}, sel: {},
    s: {}, settings: {}, inv: { weapons: {}, ammo: {}, current: '' },
    ammoAmount: 999, lifeMode: 'Calm', lifeCount: 1, enterVehicle: true, horseMine: true, horseCoat: {},
    focus: null
  };

  function post(op, data) {
    data = data || {};
    data.op = op;
    MH.post('trainer', data);
  }
  function setting(key, value) {
    ui.settings[key] = value;
    post('set', { key: key, value: value });
    syncControls();
  }
  function fmt(n) { return MH.fmt ? MH.fmt(n) : String(n); }

  /* ======================================================================
     Scores
     ====================================================================== */
  var W = { dmg: 0.32, rng: 0.2, fr: 0.18, acc: 0.18, rel: 0.12 };
  function score(st) {
    if (!st) return null;
    var sum = 0, wsum = 0;
    for (var k in W) if (st[k] != null) { sum += Math.min(4, st[k]) / 4 * W[k]; wsum += W[k]; }
    return wsum ? Math.round(sum / wsum * 100) : null;
  }
  function tier(sc) {
    if (sc == null) return { t: '—', cls: 'is-common', tone: '' };
    if (sc >= 76) return { t: 'S', cls: 'is-legendary', tone: 'mh-t-gold' };
    if (sc >= 65) return { t: 'A', cls: 'is-epic', tone: 'mh-t-legendary' };
    if (sc >= 55) return { t: 'B', cls: 'is-rare', tone: 'mh-t-info' };
    if (sc >= 40) return { t: 'C', cls: 'is-common', tone: 'mh-t-success' };
    return { t: 'D', cls: 'is-common', tone: '' };
  }
  C.weapons.forEach(function (w) { w.score = score(w.st); });
  C.ammo.forEach(function (a) { a.score = score(a.st); });
  C.horses.forEach(function (h) {
    h.score = h.r ? Math.round((h.r[0] + h.r[1] + h.r[2] + h.r[3]) / 12 * 80 + h.hand / 4 * 20) : null;
  });
  var STAT_LABELS = [['dmg', 'Hasar'], ['rng', 'Menzil'], ['fr', 'Atış hızı'], ['acc', 'İsabet'], ['rel', 'Doldurma']];

  /* ======================================================================
     Pictures from the wiki (Fandom MediaWiki API, CORS with origin=*)
     ====================================================================== */
  var IMG_KEY = 'se.trainer.rdr2.img.v1';
  var img = {};
  try { img = JSON.parse(localStorage.getItem(IMG_KEY) || '{}') || {}; } catch (e) { img = {}; }
  var imgPending = {}, imgQueue = [], imgBusy = false, imgOffline = false;
  function saveImg() { try { localStorage.setItem(IMG_KEY, JSON.stringify(img)); } catch (e) { /* storage may be unavailable */ } }
  function wantImg(title) {
    if (!title || imgOffline || img[title] !== undefined || imgPending[title]) return;
    imgPending[title] = true;
    imgQueue.push(title);
    if (!imgBusy) setTimeout(pumpImg, 30);
  }
  function pumpImg() {
    if (!imgQueue.length || imgOffline) { imgBusy = false; return; }
    imgBusy = true;
    var batch = imgQueue.splice(0, 40);
    var url = 'https://reddead.fandom.com/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages' +
      '&piprop=thumbnail&pithumbsize=400&titles=' + encodeURIComponent(batch.join('|'));
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var q = (j && j.query) || {}, alias = {};
      (q.normalized || []).forEach(function (n) { alias[n.to] = n.from; });
      (q.redirects || []).forEach(function (n) { alias[n.to] = alias[n.from] || n.from; });
      var pages = q.pages || {};
      Object.keys(pages).forEach(function (k) {
        var p = pages[k], src = p.thumbnail && p.thumbnail.source;
        var t = p.title, orig = alias[t] || t;
        img[orig] = src || '';
        if (orig !== t) img[t] = src || '';
      });
      batch.forEach(function (t) { if (img[t] === undefined) img[t] = ''; delete imgPending[t]; });
      saveImg();
      paintImages();
      setTimeout(pumpImg, 120);
    }).catch(function () {
      imgOffline = true;   // no network to the wiki: icons stay
      imgBusy = false;
    });
  }
  function art(o, fallback) {
    var src = o.wiki ? img[o.wiki] : '';
    if (o.wiki && src === undefined) wantImg(o.wiki);
    return '<span class="x-art" data-wiki="' + esc(o.wiki || '') + '">' +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : fallback) + '</span>';
  }
  function paintImages() {
    if (!root) return;
    root.querySelectorAll('.x-art[data-wiki]').forEach(function (a) {
      var t = a.getAttribute('data-wiki'), src = t && img[t];
      if (src && !a.querySelector('img')) a.innerHTML = '<img src="' + esc(src) + '" alt="" loading="lazy">';
    });
  }
  function weaponFallback(w) {
    var cat = C.weaponCats.filter(function (c) { return c.id === w.cat; })[0];
    return cat && cat.weapon ? MH.weapon(cat.weapon) : MH.icon(w.icon || (cat && cat.icon) || 'crosshair');
  }

  /* ======================================================================
     Shell
     ====================================================================== */
  var SECTIONS = [
    { group: 'Oyuncu' },
    { id: 'player', label: 'Oyuncu', icon: 'user', render: renderPlayer },
    { id: 'weapons', label: 'Silahlar', icon: 'revolver', render: renderWeapons, aside: true },
    { id: 'horses', label: 'Atlar', icon: 'horse', render: renderHorses, aside: true },
    { id: 'models', label: 'Karakter', icon: 'cowboy', render: renderModels },
    { group: 'Dünya' },
    { id: 'life', label: 'Canlılar', icon: 'dog', render: renderLife, aside: true },
    { id: 'vehicles', label: 'Araçlar', icon: 'cart', render: renderVehicles },
    { id: 'travel', label: 'Işınlanma', icon: 'map', render: renderTravel },
    { id: 'world', label: 'Zaman ve hava', icon: 'sun', render: renderWorld },
    { id: 'cleanup', label: 'Dünya temizliği', icon: 'skull-crossbones', render: renderCleanup },
    { group: 'Sistem' },
    { id: 'perf', label: 'Performans testi', icon: 'gauge', render: renderPerf },
    { id: 'hud', label: 'HUD', icon: 'layers', render: renderHud },
    { id: 'close', label: 'Kapat', icon: 'door', action: function () { post('menu.close'); } }
  ];

  var root, main, aside, body, nav;

  function build() {
    root = document.createElement('div');
    root.className = 'mh-layer mh-catch x-tm mh-hidden';
    root.innerHTML =
      '<div class="mh-scrim mh-scrim--soft"></div>' +
      '<section class="mh-panel mh-menu x-tm__menu">' +
        '<header class="mh-menu__head">' +
          '<div class="mh-menu__title"><span class="mh-kicker mh-kicker--accent">StreamEmber · Red Dead Redemption 2</span>' +
          '<span class="mh-title">Trainer</span></div>' +
          '<div class="mh-menu__stats">' +
            '<div class="mh-stat"><span class="mh-kicker">Nakit</span><b class="x-cash" data-b="cash">$0</b></div>' +
            '<div class="mh-stat"><span class="mh-kicker">Ödül</span><b class="x-bounty" data-b="bounty">$0</b></div>' +
            '<div class="mh-stat"><span class="mh-kicker">Canlı · araç</span><b data-b="world">0 · 0</b></div>' +
          '</div>' +
          '<div class="mh-player"><span class="mh-avatar mh-t-accent">' + MH.icon('cowboy') + '</span><div>' +
            '<div class="mh-player__name" data-b="model">—</div><div class="mh-player__sub" data-b="where">—</div></div></div>' +
        '</header>' +
        '<div class="mh-menu__body"><nav class="mh-menu__nav mh-scroll"></nav>' +
          '<div class="mh-menu__main x-main"></div><aside class="mh-menu__aside x-aside"></aside></div>' +
        '<footer class="mh-menu__foot"><div class="mh-hints">' +
          '<span class="mh-hint"><span class="mh-key">↑</span><span class="mh-key">↓</span><span class="mh-key">←</span><span class="mh-key">→</span>Gez</span>' +
          '<span class="mh-hint"><span class="mh-key">ENTER</span>Uygula</span>' +
          '<span class="mh-hint"><span class="mh-key">Q</span><span class="mh-key">E</span>Sekme</span>' +
          '<span class="mh-hint"><span class="mh-key">⌫</span>Menü</span>' +
          '<span class="mh-hint"><span class="mh-key">ESC</span><span class="mh-key">F5</span>Kapat</span></div>' +
          '<span class="x-foot-note">Silah tabloları ve görseller: Red Dead Wiki (CC BY-SA) · <span data-b="version"></span></span>' +
        '</footer>' +
      '</section>';
    (document.getElementById('screen') || document.body).appendChild(root);
    body = root.querySelector('.mh-menu__body');
    nav = root.querySelector('.mh-menu__nav');
    main = root.querySelector('.x-main');
    aside = root.querySelector('.x-aside');

    nav.innerHTML = SECTIONS.map(function (s) {
      if (s.group) return '<div class="mh-nav__group"><span class="mh-kicker">' + esc(s.group) + '</span></div>';
      return '<button class="mh-nav__item" data-f data-sec="' + s.id + '">' + MH.icon(s.icon) + esc(s.label) + '</button>';
    }).join('');

    root.addEventListener('click', onClick);
    root.addEventListener('mousemove', function (e) {
      var f = e.target.closest('[data-f]');
      if (f && f !== ui.focus && root.contains(f)) setFocus(f, true);
    });
  }

  function section(id) { return SECTIONS.filter(function (s) { return s.id === id; })[0]; }

  function show(id, keepFocus) {
    var s = section(id);
    if (!s) return;
    if (s.action) { s.action(); return; }
    ui.section = id;
    nav.querySelectorAll('.mh-nav__item').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-sec') === id); });
    body.classList.toggle('mh-menu__body--2', !s.aside);
    aside.classList.toggle('mh-hidden', !s.aside);
    main.innerHTML = s.render();
    main.scrollTop = 0;
    if (s.aside) renderAside();
    syncControls();
    bindState();
    if (!keepFocus) {
      var first = main.querySelector('.x-tabs [data-f].is-active') || main.querySelector('[data-f]');
      if (first && ui.focus && nav.contains(ui.focus)) { /* keep the nav focus when browsing sections */ }
      else if (first) setFocus(first);
    }
    if (id === 'weapons') requestInventory();
  }

  function renderAside() {
    var s = ui.section, html = '';
    if (s === 'weapons') html = asideWeapon();
    else if (s === 'horses') html = asideHorse();
    else if (s === 'life') html = asideLife();
    aside.innerHTML = html;
    aside.querySelectorAll('.mh-bar[data-v]').forEach(function (b) { MH.bar(b, +b.getAttribute('data-v')); });
  }

  /* ---------------- building blocks ---------------- */
  function tabs(key, list, current) {
    return '<div class="mh-tabs x-tabs" data-tabs="' + key + '">' + list.map(function (t) {
      return '<button data-f data-tab="' + esc(t.id) + '" class="' + (t.id === current ? 'is-active' : '') + '">' +
        (t.icon ? MH.icon(t.icon) : '') + esc(t.label) + '</button>';
    }).join('') + '</div>';
  }
  function btn(label, act, args, o) {
    o = o || {};
    return '<button class="mh-btn ' + (o.cls || 'mh-btn--outline') + ' mh-btn--sm" data-f data-act="' + act + '"' +
      (args ? " data-args='" + esc(JSON.stringify(args)) + "'" : '') + (o.confirm ? ' data-confirm="' + esc(o.confirm) + '"' : '') + '>' +
      (o.icon ? MH.icon(o.icon) : '') + esc(label) + '</button>';
  }
  function toggleRow(key, title, desc) {
    return '<div class="mh-setting x-row" data-f data-set="' + key + '"><div class="mh-setting__text"><b>' + esc(title) + '</b>' +
      (desc ? '<span>' + esc(desc) + '</span>' : '') + '</div><div class="mh-setting__control">' +
      '<span class="mh-toggle"><input type="checkbox" tabindex="-1"><span class="mh-toggle__track"></span></span></div></div>';
  }
  function segRow(key, title, desc, options, local) {
    return '<div class="mh-setting x-row"><div class="mh-setting__text"><b>' + esc(title) + '</b>' + (desc ? '<span>' + esc(desc) + '</span>' : '') +
      '</div><div class="mh-setting__control x-wide">' + seg(key, options, local) + '</div></div>';
  }
  function seg(key, options, local) {
    return '<div class="mh-seg x-seg" data-' + (local ? 'local' : 'seg') + '="' + key + '">' + options.map(function (o) {
      return '<button data-f data-v="' + esc(String(o[0])) + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function box(title, inner, extra) {
    return '<div class="mh-box x-box"><div class="mh-box__head"><span class="mh-kicker">' + esc(title) + '</span>' + (extra || '') + '</div>' + inner + '</div>';
  }
  function tile(icon, label, bind, tone) {
    return '<div class="mh-tile x-tile ' + (tone || '') + '">' + MH.icon(icon) + '<span class="mh-kicker">' + esc(label) + '</span><b data-b="' + bind + '">—</b></div>';
  }
  function statlines(st, keys) {
    return '<div class="mh-statlines">' + keys.filter(function (k) { return st && st[k[0]] != null; }).map(function (k) {
      var v = st[k[0]], pct = Math.round(Math.min(4, v) / 4 * 100);
      return '<div class="mh-statline"><span class="mh-kicker">' + k[1] + '</span><div class="mh-bar" data-v="' + pct + '"><i class="mh-bar__fill"></i></div><b>' + (Math.round(v * 10) / 10) + '</b></div>';
    }).join('') + '</div>';
  }
  function scoreBadge(sc) {
    var t = tier(sc);
    return '<span class="mh-badge x-score ' + t.tone + '">' + (sc == null ? 'puan yok' : t.t + ' · ' + sc) + '</span>';
  }

  /* ======================================================================
     Sections
     ====================================================================== */
  function renderPlayer() {
    return '<div class="mh-scroll x-pad">' +
      '<div class="x-tiles">' +
        tile('heart-f', 'Can', 'health', 'mh-t-danger') + tile('run', 'Dayanıklılık', 'stamina', 'mh-t-success') +
        tile('eye', 'Dead Eye', 'deadeye', 'mh-t-warn') + tile('sheriff', 'Arananlık', 'wanted', 'mh-t-info') +
      '</div>' +
      box('Hızlı işlemler', '<div class="x-btns">' +
        btn('Hepsini doldur', 'player.fill', null, { cls: 'mh-btn--primary', icon: 'heart-f' }) +
        btn('Altın çekirdekler', 'player.gold', null, { icon: 'crown-f' }) +
        btn('Arananlığı temizle', 'player.clearWanted', null, { icon: 'sheriff' }) +
        btn('Temizlen (kan, çamur)', 'player.clean', null, { icon: 'droplet-f' }) +
        btn('Rastgele kıyafet', 'player.outfit', null, { icon: 'hat' }) +
        btn('+$100', 'player.money', { amount: 100 }, { icon: 'cash' }) +
        btn('+$1.000', 'player.money', { amount: 1000 }, { icon: 'cash' }) +
        btn('+$10.000', 'player.money', { amount: 10000 }, { icon: 'cash' }) +
        btn('Kendini öldür', 'player.kill', null, { cls: 'mh-btn--tone mh-t-danger', icon: 'skull', confirm: 'Karakter ölecek. Emin misin?' }) +
      '</div>') +
      box('Sürekli etkiler', '<div class="x-rows">' +
        toggleRow('player.god', 'Ölümsüzlük', 'Hasar almazsın.') +
        toggleRow('player.neverWanted', 'Asla aranma', 'Kanun kapalı: ödül, tanık ve takip oluşmaz; varsa temizlenir.') +
        toggleRow('player.infStamina', 'Sınırsız dayanıklılık', 'Çekirdek ve bar sürekli dolu.') +
        toggleRow('player.infDeadEye', 'Sınırsız Dead Eye', 'Dead Eye çekirdeği ve barı sürekli dolu.') +
        toggleRow('player.ignored', 'Herkes görmezden gelsin', 'NPC\'ler sana tepki vermez.') +
        toggleRow('player.invisible', 'Görünmezlik', 'Karakter görünmez olur.') +
        toggleRow('player.noRagdoll', 'Düşmeme (ragdoll kapalı)', 'Çarpınca, vurulunca yere düşmezsin.') +
        toggleRow('player.superJump', 'Süper zıplama', '') +
        toggleRow('player.silent', 'Sessiz hareket', 'Çıkardığın ses sıfır.') +
        segRow('player.damage', 'Hasar çarpanı', 'Silah ve yakın dövüş hasarı.', [[1, '1×'], [2, '2×'], [5, '5×'], [10, '10×'], [100, 'Tek vuruş']]) +
        segRow('player.moveRate', 'Hareket hızı', 'Animasyon hızı (koşu, yürüyüş).', [[1, 'Normal'], [1.25, '1,25×'], [1.5, '1,5×'], [2, '2×']]) +
      '</div>') + '</div>';
  }

  // ---------- weapons ----------
  function weaponsOf(cat) { return C.weapons.filter(function (w) { return w.cat === cat; }); }
  function allGiveable() { return C.weapons.filter(function (w) { return w.cat !== 'kit'; }).map(function (w) { return w.id; }); }

  function renderWeapons() {
    var cat = ui.tabs.weapons || 'revolver';
    var items = cat === 'ammo' ? C.ammo : weaponsOf(cat);
    if (!ui.sel.weapons || !items.some(function (x) { return x.id === ui.sel.weapons; })) ui.sel.weapons = items[0] && items[0].id;
    var cards = items.map(function (x) { return cat === 'ammo' ? ammoCard(x) : weaponCard(x); }).join('');
    return tabs('weapons', C.weaponCats, cat) +
      '<div class="mh-menu__toolbar x-toolbar">' +
        btn('Hepsini ver + mermi', 'weapon.giveAll', { ids: allGiveable(), amount: 999 }, { cls: 'mh-btn--primary', icon: 'rifle' }) +
        btn('Tüm mermi türleri', 'weapon.giveAll', { ids: allGiveable(), amount: 999, variants: true }, { icon: 'bullets' }) +
        btn('Elimdekini temizle', 'weapon.clean', null, { icon: 'tool' }) +
        btn('Tüm silahları al', 'weapon.removeAll', null, { cls: 'mh-btn--tone mh-t-danger', icon: 'x', confirm: 'Bütün silahların alınacak.' }) +
        '<span class="x-gap"></span>' +
        '<span class="mh-kicker">Miktar</span>' + seg('ammoAmount', [[10, '+10'], [50, '+50'], [100, '+100'], [999, 'Doldur']], true) +
      '</div>' +
      '<div class="x-chips">' +
        chipToggle('weapon.infAmmo', 'Sınırsız mermi') + chipToggle('weapon.infClip', 'Şarjör bitmesin') +
        chipToggle('weapon.noCap', 'Kapasite sınırı yok') +
        '<span class="x-chips__note">Kart: Enter / tıkla = ver + mermi ekle. Zaten varsa mermi eklenir.</span>' +
      '</div>' +
      '<div class="mh-cards x-cards mh-scroll" style="--cols:' + (cat === 'ammo' ? 4 : 3) + '">' + cards + '</div>';
  }
  function chipToggle(key, label) {
    return '<button class="mh-chip x-chip" data-f data-set="' + key + '"><i class="x-dot"></i>' + esc(label) + '</button>';
  }
  function weaponCard(w) {
    var t = tier(w.score), inv = ui.inv.weapons[w.id] || {};
    return '<div class="mh-card x-card ' + t.cls + (inv.owned ? ' is-owned' : '') + (ui.sel.weapons === w.id ? ' is-active' : '') +
      '" data-f data-card="weapon" data-id="' + w.id + '">' +
      '<div class="mh-card__art">' + scoreBadge(w.score) + art(w, weaponFallback(w)) + '</div>' +
      '<div class="mh-card__body"><span class="mh-card__name">' + esc(w.name) + '</span><span class="mh-card__sub">' + esc(w.note) + '</span></div>' +
      '<div class="mh-card__foot"><span class="mh-price x-own" data-own="' + w.id + '">' + ownText(w) + '</span>' +
      (w.price ? '<span class="x-price">$' + w.price + '</span>' : '<span class="x-price">benzersiz</span>') + '</div></div>';
  }
  function ownText(w) {
    var inv = ui.inv.weapons[w.id];
    if (!inv) return '—';
    if (!inv.owned) return 'Yok';
    return inv.ammo != null ? 'Sende · ' + inv.ammo : 'Sende';
  }
  function ammoCard(a) {
    var n = ui.inv.ammo[a.id] || 0;
    return '<div class="mh-card x-card ' + tier(a.score).cls + (ui.sel.weapons === a.id ? ' is-active' : '') + '" data-f data-card="ammo" data-id="' + a.id + '">' +
      '<div class="mh-card__art">' + (a.score != null ? scoreBadge(a.score) : '') + art(a, MH.icon(a.cls === 'bow' ? 'bow' : a.cls === 'throw' ? 'dynamite' : 'bullets')) + '</div>' +
      '<div class="mh-card__body"><span class="mh-card__name">' + esc(a.name) + '</span><span class="mh-card__sub">' + esc(a.id) + '</span></div>' +
      '<div class="mh-card__foot"><span class="mh-price" data-ammo="' + a.id + '">' + n + '</span><span class="x-price">+' + ui.ammoAmount + '</span></div></div>';
  }
  function asideWeapon() {
    var cat = ui.tabs.weapons || 'revolver', id = ui.sel.weapons;
    if (cat === 'ammo') {
      var a = C.ammo.filter(function (x) { return x.id === id; })[0];
      if (!a) return '';
      return '<div class="mh-preview x-preview">' + art(a, MH.icon('bullets')) + '</div>' +
        '<div><div class="mh-title mh-title--lg">' + esc(a.name) + '</div><div class="mh-sub">' + esc(a.id) + ' · ' + esc(a.cls) + '</div></div>' +
        (a.st ? statlines(a.st, STAT_LABELS) : '<div class="mh-sub">Bu mermi türünün tablo değeri yok.</div>') +
        '<div class="x-kv"><span>Sende</span><b data-ammo="' + a.id + '">' + (ui.inv.ammo[a.id] || 0) + '</b></div>' +
        '<div class="x-aside-btns">' + btn('Mermi ekle (+' + ui.ammoAmount + ')', 'ammo.give', { id: a.id, label: a.name }, { cls: 'mh-btn--primary mh-btn--block', icon: 'plus' }) + '</div>';
    }
    var w = C.weapons.filter(function (x) { return x.id === id; })[0];
    if (!w) return '';
    var inv = ui.inv.weapons[w.id] || {};
    return '<div class="mh-preview x-preview">' + scoreBadge(w.score) + art(w, weaponFallback(w)) + '</div>' +
      '<div><div class="mh-title mh-title--lg">' + esc(w.name) + '</div><div class="mh-sub">' + esc(w.note) + '</div></div>' +
      (w.st.dmg != null ? statlines(w.st, STAT_LABELS) : '<div class="mh-sub">Ekipman: değer yok.</div>') +
      '<div class="x-kv"><span>Puan</span><b>' + (w.score == null ? '—' : w.score + ' / 100 (' + tier(w.score).t + ')') + '</b></div>' +
      (w.clip ? '<div class="x-kv"><span>Şarjör</span><b>' + w.clip + '</b></div>' : '') +
      (w.price ? '<div class="x-kv"><span>Mağaza fiyatı</span><b>$' + w.price + '</b></div>' : '') +
      '<div class="x-kv"><span>Durum</span><b data-own="' + w.id + '">' + ownText(w) + '</b></div>' +
      '<div class="x-aside-btns">' +
        btn(inv.owned ? 'Mermi ekle' : 'Ver + mermi', 'weapon.give', { id: w.id, label: w.name }, { cls: 'mh-btn--primary mh-btn--block', icon: 'plus' }) +
        btn('Tüm mermi türleriyle', 'weapon.give', { id: w.id, label: w.name, variants: true }, { cls: 'mh-btn--outline mh-btn--block', icon: 'bullets' }) +
        '<div class="mh-flex mh-gap-2">' +
          btn('Kuşan', 'weapon.give', { id: w.id, label: w.name, amount: 0, equip: true }, { cls: 'mh-btn--ghost mh-grow', icon: 'hand' }) +
          btn('Kaldır', 'weapon.remove', { id: w.id, label: w.name }, { cls: 'mh-btn--tone mh-t-danger mh-grow', icon: 'x' }) +
        '</div></div>' +
      '<div class="x-src">Puan: hasar %32, menzil %20, atış hızı %18, isabet %18, doldurma %12 (wiki tablosu, 0-4 ölçeği; yükseltilmiş değer).</div>';
  }
  function requestInventory() {
    post('weapon.inventory', { ids: C.weapons.map(function (w) { return w.id; }) });
  }

  // ---------- horses ----------
  function renderHorses() {
    if (!ui.sel.horses) ui.sel.horses = 'arabian';
    var cards = C.horses.map(function (h) {
      var t = tier(h.score);
      return '<div class="mh-card x-card ' + t.cls + (ui.sel.horses === h.id ? ' is-active' : '') + '" data-f data-card="horse" data-id="' + h.id + '">' +
        '<div class="mh-card__art">' + (h.score != null ? scoreBadge(h.score) : '') + art(h, MH.icon('horse')) + '</div>' +
        '<div class="mh-card__body"><span class="mh-card__name">' + esc(h.name) + '</span><span class="mh-card__sub">' +
        (h.type ? esc(h.type + ' · ' + h.handling) : 'Tür bilgisi yok') + ' · ' + h.coats.length + ' renk</span></div></div>';
    }).join('');
    return '<div class="mh-menu__toolbar x-toolbar"><span class="mh-kicker">Atım</span><b class="x-horse" data-b="horse">—</b><span class="x-gap"></span>' +
        btn('Doldur', 'horse.fill', null, { icon: 'heart-f' }) + btn('Temizle', 'horse.clean', null, { icon: 'droplet-f' }) +
        btn('Bağ seviyesi 4', 'horse.bond', null, { icon: 'heart-plus' }) +
        btn('Atı sil', 'horse.delete', null, { cls: 'mh-btn--tone mh-t-danger', icon: 'x', confirm: 'Bindiğin / son atın silinecek.' }) + '</div>' +
      '<div class="x-chips">' + chipToggle('horse.god', 'Ölümsüz at') + chipToggle('horse.infStamina', 'Sınırsız at dayanıklılığı') +
        '<button class="mh-chip x-chip" data-f data-local-toggle="horseMine"><i class="x-dot"></i>Benim atım yap</button>' +
        '<span class="x-chips__note">Kart: Enter / tıkla = seçili renkte bin.</span></div>' +
      '<div class="mh-cards x-cards mh-scroll" style="--cols:3">' + cards + '</div>';
  }
  function asideHorse() {
    var h = C.horses.filter(function (x) { return x.id === ui.sel.horses; })[0];
    if (!h) return '';
    var coat = ui.horseCoat[h.id] || (h.coats[0] && h.coats[0].id);
    var R = ['', 'Düşük', 'Orta', 'Yüksek'];
    var rows = h.r ? [['Can', h.r[0]], ['Dayanıklılık', h.r[1]], ['Hız', h.r[2]], ['İvme', h.r[3]]].map(function (x) {
      return '<div class="mh-statline"><span class="mh-kicker">' + x[0] + '</span><div class="mh-bar" data-v="' + Math.round(x[1] / 3 * 100) + '"><i class="mh-bar__fill"></i></div><b class="x-q">' + R[x[1]] + '</b></div>';
    }).join('') : '<div class="mh-sub">Wiki tablosunda bu cinsin türü yok.</div>';
    var c = h.coats.filter(function (x) { return x.id === coat; })[0];
    return '<div class="mh-preview x-preview">' + (h.score != null ? scoreBadge(h.score) : '') + art(h, MH.icon('horse')) + '</div>' +
      '<div><div class="mh-title mh-title--lg">' + esc(h.name) + '</div><div class="mh-sub">' + (h.type ? esc(h.type + ' atı · kullanım: ' + h.handling) : '—') + '</div></div>' +
      '<div class="mh-statlines">' + rows + '</div>' +
      '<div class="mh-kicker">Renk / model</div><div class="x-coats mh-scroll">' + h.coats.map(function (x) {
        return '<button class="mh-chip x-coat' + (x.id === coat ? ' is-active' : '') + '" data-f data-coat="' + x.id + '">' + esc(x.name) + '</button>';
      }).join('') + '</div>' +
      '<div class="x-aside-btns">' +
        btn('Bin', 'horse.spawn', { id: coat, label: h.name + (c ? ' · ' + c.name : ''), mount: true }, { cls: 'mh-btn--primary mh-btn--block', icon: 'horse' }) +
        btn('Yanıma getir', 'horse.spawn', { id: coat, label: h.name + (c ? ' · ' + c.name : ''), mount: false }, { cls: 'mh-btn--outline mh-btn--block', icon: 'pin' }) +
      '</div><div class="x-src">Değerler: Red Dead Wiki "Horse" (at türüne göre Düşük/Orta/Yüksek). ✦ = ön sipariş rengi.</div>';
  }

  // ---------- life ----------
  function renderLife() {
    var cat = ui.tabs.life || 'predator';
    var items = C.life.filter(function (x) { return x.cat === cat; });
    if (!ui.sel.life || !items.some(function (x) { return x.id === ui.sel.life; })) ui.sel.life = items[0] && items[0].id;
    return tabs('life', C.lifeCats, cat) +
      '<div class="mh-menu__toolbar x-toolbar"><span class="mh-kicker">Davranış</span>' +
        seg('lifeMode', [['Calm', 'Sakin'], ['Hostile', 'Saldırgan'], ['Companion', 'Takipçi'], ['Flee', 'Kaçan']], true) +
        '<span class="mh-kicker">Adet</span>' + seg('lifeCount', [[1, '1'], [3, '3'], [5, '5'], [10, '10'], [25, '25']], true) + '</div>' +
      (cat === 'fish' ? '<div class="x-chips"><span class="x-chips__note">Balıklar karada ölür: suyun kenarında oluştur.</span></div>' : '') +
      '<div class="mh-cards x-cards mh-scroll" style="--cols:4">' + items.map(function (x) {
        return '<div class="mh-card x-card' + (ui.sel.life === x.id ? ' is-active' : '') + '" data-f data-card="life" data-id="' + x.id + '">' +
          '<div class="mh-card__art">' + art(x, MH.icon(x.icon)) + '</div><div class="mh-card__body"><span class="mh-card__name">' + esc(x.name) +
          '</span><span class="mh-card__sub">' + esc(x.wiki || x.id) + '</span></div></div>';
      }).join('') + '</div>';
  }
  function asideLife() {
    var x = C.life.filter(function (a) { return a.id === ui.sel.life; })[0];
    if (!x) return '';
    return '<div class="mh-preview x-preview">' + art(x, MH.icon(x.icon)) + '</div>' +
      '<div><div class="mh-title mh-title--lg">' + esc(x.name) + '</div><div class="mh-sub">' + esc(x.id) + '</div></div>' +
      '<div class="x-kv"><span>Davranış</span><b data-b="lifeMode">—</b></div><div class="x-kv"><span>Adet</span><b data-b="lifeCount">—</b></div>' +
      '<div class="x-aside-btns">' + btn('Oluştur', 'animal.spawn', { id: x.id, label: x.name }, { cls: 'mh-btn--primary mh-btn--block', icon: 'plus' }) + '</div>';
  }

  // ---------- vehicles, models ----------
  function renderVehicles() {
    var cat = ui.tabs.vehicles || 'wagon';
    var items = C.vehicles.filter(function (v) { return v.cat === cat; });
    return tabs('vehicles', [{ id: 'wagon', label: 'Arabalar', icon: 'cart' }, { id: 'boat', label: 'Tekneler', icon: 'boat' }, { id: 'other', label: 'Diğer', icon: 'anchor' }], cat) +
      '<div class="mh-menu__toolbar x-toolbar">' + btn('Bindiğimi tamir et', 'vehicle.repair', null, { icon: 'wrench' }) +
        btn('Bindiğimi sil', 'vehicle.delete', null, { cls: 'mh-btn--tone mh-t-danger', icon: 'x' }) + '<span class="x-gap"></span>' +
        '<button class="mh-chip x-chip" data-f data-local-toggle="enterVehicle"><i class="x-dot"></i>Oluşunca bin</button></div>' +
      '<div class="mh-cards x-cards mh-scroll" style="--cols:4">' + items.map(function (v) {
        return '<div class="mh-card x-card" data-f data-card="vehicle" data-id="' + v.id + '"><div class="mh-card__art">' +
          MH.icon(cat === 'boat' ? 'boat' : cat === 'wagon' ? 'cart' : 'anchor') + '</div><div class="mh-card__body"><span class="mh-card__name">' + esc(v.name) +
          '</span><span class="mh-card__sub">' + esc(v.id) + '</span></div></div>';
      }).join('') + '</div>';
  }
  function renderModels() {
    return '<div class="x-chips"><span class="x-chips__note">Karakter değişince kıyafet rastgele seçilir. Hikâyeye dönmek için Arthur ya da John\'u seç.</span></div>' +
      '<div class="mh-cards x-cards mh-scroll" style="--cols:4">' + C.models.map(function (m) {
        return '<div class="mh-card x-card" data-f data-card="model" data-id="' + m.id + '"><div class="mh-card__art">' + MH.icon(m.icon) +
          '</div><div class="mh-card__body"><span class="mh-card__name">' + esc(m.name) + '</span><span class="mh-card__sub">' + esc(m.id) + '</span></div></div>';
      }).join('') + '</div>';
  }

  // ---------- travel ----------
  function renderTravel() {
    var slots = [0, 1, 2].map(function (i) {
      return '<div class="x-slot-row"><b>Yuva ' + (i + 1) + '</b><span class="mh-sub" data-slot="' + i + '">—</span>' +
        btn('Kaydet', 'tp.save', { slot: i }, { icon: 'pin' }) + btn('Git', 'tp.load', { slot: i }, { cls: 'mh-btn--primary', icon: 'route' }) + '</div>';
    }).join('');
    return '<div class="mh-scroll x-pad">' +
      box('Hızlı', '<div class="x-btns">' + btn('Harita işaretine', 'tp.waypoint', null, { cls: 'mh-btn--primary', icon: 'pin-f' }) +
        btn('10 m ileri', 'tp.forward', { m: 10 }, { icon: 'arrow-up' }) + btn('50 m ileri', 'tp.forward', { m: 50 }, { icon: 'chevs-r' }) +
        btn('50 m yukarı', 'tp.up', { m: 50 }, { icon: 'parachute' }) + '</div><div class="x-kv"><span>Konum</span><b data-b="pos">—</b></div>') +
      box('Kayıtlı konumlar', slots) +
      box('Kasabalar', '<div class="mh-list x-list">' + C.places.map(function (p) {
        return '<div class="mh-row" data-f data-act="tp.go" data-args=\'' + esc(JSON.stringify({ x: p.x, y: p.y, label: p.name })) + '\'>' +
          '<span class="mh-row__icon">' + MH.icon('location') + '</span><div class="mh-row__main"><span class="mh-row__title">' + esc(p.name) +
          '</span><span class="mh-row__sub">' + esc(p.sub) + '</span></div><span class="mh-row__meta mh-num">' + p.x + ', ' + p.y + '</span></div>';
      }).join('') + '</div>') + '</div>';
  }

  // ---------- world ----------
  function renderWorld() {
    var hours = [0, 3, 6, 9, 12, 15, 18, 21].map(function (h) {
      return '<button class="mh-btn mh-btn--outline mh-btn--sm" data-f data-act="world.time" data-args=\'{"hour":' + h + '}\'>' + (h < 10 ? '0' : '') + h + ':00</button>';
    }).join('');
    var weather = C.weather.map(function (w) {
      return '<button class="mh-btn mh-btn--outline mh-btn--sm x-wx" data-f data-wx="' + w.id + '" data-act="world.weather" data-args=\'' +
        esc(JSON.stringify({ id: w.id, label: w.name })) + '\'>' + MH.icon(w.icon) + esc(w.name) + '</button>';
    }).join('');
    var dens = [[0, 'Yok'], [0.25, '%25'], [0.5, '%50'], [1, 'Normal']];
    return '<div class="mh-scroll x-pad">' +
      box('Saat', '<div class="x-btns">' + hours + '</div>', '<b class="x-clock" data-b="clock">--:--</b>') +
      box('Zaman', '<div class="x-rows">' + toggleRow('world.freezeTime', 'Saati dondur', 'Gün ilerlemez.') +
        segRow('world.timeScale', 'Ağır çekim', 'Oyun hızı.', [[1, 'Normal'], [0.5, '½'], [0.25, '¼'], [0.1, '⅒']]) + '</div>') +
      box('Hava', '<div class="x-btns x-btns--wx">' + weather + '</div>') +
      box('Nüfus (her karede uygulanır)', '<div class="x-rows">' +
        segRow('world.density.humans', 'İnsanlar', 'Yaya ve senaryo NPC\'leri.', dens) +
        segRow('world.density.animals', 'Hayvanlar', 'Doğal ve senaryo hayvanları.', dens) +
        segRow('world.density.vehicles', 'Arabalar', 'Trafik ve park etmiş arabalar.', dens) +
        toggleRow('world.noTrains', 'Rastgele tren yok', 'Yeni tren oluşmaz.') + '</div>') + '</div>';
  }

  // ---------- cleanup ----------
  var TARGETS = [
    ['Humans', 'İnsanlar', 'user', 'humans'], ['Law', 'Kanun (şerif, polis, asker)', 'sheriff', 'law'],
    ['Animals', 'Hayvanlar', 'dog', 'animals'], ['Horses', 'Atlar', 'horse', 'horses'],
    ['Peds', 'Tüm canlılar', 'users', 'peds'], ['Vehicles', 'Arabalar ve kayıklar', 'cart', 'vehicles'],
    ['Trains', 'Trenler', 'train', 'trains'], ['Props', 'Objeler', 'box', 'props']
  ];
  function renderCleanup() {
    var rows = TARGETS.map(function (t) {
      var kill = t[0] !== 'Props' && t[0] !== 'Trains';
      return '<div class="mh-row x-trow"><span class="mh-row__icon">' + MH.icon(t[2]) + '</span><div class="mh-row__main"><span class="mh-row__title">' + esc(t[1]) +
        '</span><span class="mh-row__sub" data-count="' + t[3] + '">—</span></div><div class="mh-row__meta">' +
        btn('Sil', 'world.sweep', { target: t[0], mode: 'delete' }, { cls: 'mh-btn--tone mh-t-danger', icon: 'x' }) +
        (kill ? btn(t[0] === 'Vehicles' ? 'Patlat' : 'Öldür', 'world.sweep', { target: t[0], mode: 'kill' }, { cls: 'mh-btn--outline', icon: t[0] === 'Vehicles' ? 'bomb' : 'skull' }) : '') +
        '</div></div>';
    }).join('');
    return '<div class="mh-scroll x-pad">' +
      '<div class="x-sweep mh-hidden" data-sweep><span class="mh-kicker" data-b="sweepLabel">Temizleniyor</span><div class="mh-bar mh-bar--md" data-sweepbar><i class="mh-bar__fill"></i></div><b data-b="sweepText">0 / 0</b></div>' +
      box('Oyun dünyasında yüklü olan her şey', '<div class="mh-list x-list">' + rows + '</div>' +
        '<div class="x-btns x-btns--end">' + btn('HER ŞEYİ SİL', 'world.sweep', { target: 'Everything', mode: 'delete' },
          { cls: 'mh-btn--tone mh-t-danger', icon: 'nuke', confirm: 'Oyuncu, atın ve araban hariç dünyadaki bütün insanlar, hayvanlar, atlar, araçlar, trenler ve objeler silinecek.' }) + '</div>',
        '<span class="mh-sub">Sadece trainer\'ın oluşturdukları değil</span>') +
      box('Ayarlar', '<div class="x-rows">' +
        segRow('world.sweepRadius', 'Alan', 'Oyuncuya uzaklık. Tümü = oyunun yüklediği her şey.', [[0, 'Tümü'], [500, '500 m'], [250, '250 m'], [100, '100 m'], [50, '50 m']]) +
        toggleRow('world.protectMission', 'Görev varlıklarını koru', 'Başka scriptlere (görev, kamp) ait varlıklar atlanır. Kapalı: onlar da silinir.') +
        segRow('world.batch', 'Kare başına', 'Bir karede işlenen varlık sayısı (çökme / takılma testi).', [[10, '10'], [40, '40'], [100, '100'], [250, '250'], [500, '500']]) +
        toggleRow('world.keepClean', 'Sürekli temiz tut', '1,5 saniyede bir seçili türü siler (nüfus ayarıyla birlikte kullan).') +
        segRow('world.keepCleanTarget', 'Sürekli temizlenecek', '', [['Peds', 'Canlılar'], ['Humans', 'İnsanlar'], ['Law', 'Kanun'], ['Animals', 'Hayvanlar'], ['Vehicles', 'Araçlar'], ['Everything', 'Her şey']]) +
      '</div>') +
      box('Stres testi', '<div class="x-btns">' + btn('Kalabalık (25 kişi + 6 araba)', 'world.crowd', { peds: 25, vehicles: 6 }, { icon: 'users' }) +
        btn('Büyük kalabalık (60 + 12)', 'world.crowd', { peds: 60, vehicles: 12 }, { icon: 'group' }) +
        btn('Trainer\'ın oluşturduklarını sil', 'world.cleanupSpawned', null, { icon: 'x' }) + '</div>' +
        '<div class="x-kv"><span>Trainer\'ın oluşturduğu</span><b data-count="spawned">—</b></div>') +
      '</div>';
  }

  // ---------- perf, hud ----------
  function renderPerf() {
    return '<div class="mh-scroll x-pad">' + box('Dünya etiketleri', '<div class="x-rows">' +
      toggleRow('tags.enabled', 'Dünya etiketleri', 'Çevredeki kişi, at, hayvan ve arabaların üstünde MHud etiketi.') +
      segRow('tags.positioning', 'Konumlandırma', 'Atlas: oyun karesiyle senkron. HTML: MHud/RedM yolu (birkaç kare gecikir).', [[0, 'Atlas'], [1, 'HTML']]) +
      toggleRow('tags.refs', 'Native referans noktaları', 'Oyunun çizdiği kırmızı küreler (en yakın 30).') +
      segRow('tags.delay', 'Senkron gecikmesi', 'Etiketler kürelerin önünde gidiyorsa 1 kare.', [[0, '0'], [1, '1'], [2, '2']]) +
      segRow('tags.predict', 'Öngörü', 'Etiketler arkadan geliyorsa aç.', [[0, 'Kapalı'], [1, '1 kare']]) +
      segRow('tags.radius', 'Mesafe', '', [[25, '25 m'], [50, '50 m'], [100, '100 m'], [200, '200 m'], [400, '400 m']]) +
      segRow('tags.max', 'En fazla etiket', '', [[25, '25'], [50, '50'], [100, '100'], [200, '200'], [400, '400']]) +
      segRow('tags.rate', 'Gönderim (HTML)', '', [[0, 'Her kare'], [30, '30 Hz'], [15, '15 Hz']]) +
      segRow('tags.target', 'Hedef', '', [[0, 'Hepsi'], [1, 'Canlılar'], [2, 'Araçlar']]) +
      segRow('tags.distStep', 'Mesafe yazısı adımı', '1 m her harekette yeniden çizer (pahalı).', [[1, '1 m'], [5, '5 m'], [10, '10 m']]) +
      segRow('perf.spin', 'Kamerayı döndür', '', [[0, 'Kapalı'], [45, '45°/sn'], [90, '90°/sn'], [180, '180°/sn']]) +
      toggleRow('perf.panel', 'Performans paneli', 'Sağ ortada FPS, etiket ve gecikme ölçümleri.') + '</div>') + '</div>';
  }
  function renderHud() {
    return '<div class="mh-scroll x-pad">' + box('MHud', '<div class="x-rows">' +
      segRow('hud.theme', 'Tema', '', [['frontier', 'Frontier'], ['oldwest', 'Old West'], ['modern', 'Modern'], ['neon', 'Neon'], ['tactical', 'Tactical'], ['minimal', 'Minimal']]) +
      toggleRow('hud.hideGame', 'RDR2 HUD\'unu gizle', 'Oyunun kendi HUD\'u kapanır; yalnız MHud kalır.') + '</div>' +
      '<div class="x-btns">' + btn('Bildirim vitrini', 'hud.demo', null, { icon: 'sparkles' }) + '</div>') + '</div>';
  }

  /* ======================================================================
     State → DOM
     ====================================================================== */
  function syncControls() {
    if (!root) return;
    root.querySelectorAll('[data-set]').forEach(function (el) {
      var on = !!ui.settings[el.getAttribute('data-set')];
      el.classList.toggle('is-on', on);
      var cb = el.querySelector('input[type=checkbox]');
      if (cb) cb.checked = on;
    });
    root.querySelectorAll('[data-seg]').forEach(function (g) {
      var v = ui.settings[g.getAttribute('data-seg')];
      g.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-active', String(v) === b.getAttribute('data-v') || (+b.getAttribute('data-v') === v)); });
    });
    root.querySelectorAll('[data-local]').forEach(function (g) {
      var v = ui[g.getAttribute('data-local')];
      g.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-active', String(v) === b.getAttribute('data-v')); });
    });
    root.querySelectorAll('[data-local-toggle]').forEach(function (b) { b.classList.toggle('is-on', !!ui[b.getAttribute('data-local-toggle')]); });
    root.querySelectorAll('.x-wx').forEach(function (b) { b.classList.toggle('is-active', ui.s.weather === b.getAttribute('data-wx')); });
  }

  function setText(sel, text) { root.querySelectorAll(sel).forEach(function (el) { if (el.textContent !== text) el.textContent = text; }); }

  function bindState() {
    var s = ui.s;
    if (!root || !s || s.cash == null) return;
    setText('[data-b="cash"]', '$' + fmt(s.cash));
    setText('[data-b="bounty"]', '$' + fmt(s.bounty || 0));
    root.querySelector('.x-bounty').classList.toggle('is-hot', s.bounty > 0 || s.incident);
    var c = s.counts || {};
    setText('[data-b="world"]', fmt((c.humans || 0) + (c.animals || 0) + (c.horses || 0)) + ' · ' + fmt((c.vehicles || 0) + (c.trains || 0)));
    var model = C.models.filter(function (m) { return m.id === s.model; })[0];
    setText('[data-b="model"]', model ? model.name : (s.model || '—'));
    setText('[data-b="where"]', (s.weapon ? s.weapon + ' · ' : '') + (s.mounted ? 'atta' : s.inVehicle ? 'araçta' : 'yaya'));
    setText('[data-b="version"]', ui.version || '');
    var cores = s.cores || {};
    setText('[data-b="health"]', (s.health != null ? s.health : '—') + '% · çekirdek ' + (cores.health != null ? cores.health : '—'));
    setText('[data-b="stamina"]', (s.stamina != null ? s.stamina : '—') + '% · çekirdek ' + (cores.stamina != null ? cores.stamina : '—'));
    setText('[data-b="deadeye"]', 'çekirdek ' + (cores.deadeye != null ? cores.deadeye : '—'));
    setText('[data-b="wanted"]', s.bounty > 0 || s.incident || s.wantedScore > 0
      ? '$' + fmt(s.bounty || 0) + (s.incident ? ' · olay' : '') + (s.wantedScore ? ' · skor ' + s.wantedScore : '') : 'Temiz');
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    setText('[data-b="clock"]', pad(s.hour || 0) + ':' + pad(s.minute || 0));
    if (s.pos) setText('[data-b="pos"]', s.pos.map(function (v) { return Math.round(v); }).join(', '));
    var horse = s.horse, hm = horse && C.horses.filter(function (h) { return horse.model && horse.model.indexOf('a_c_horse_' + h.id + '_') === 0; })[0];
    setText('[data-b="horse"]', horse ? (hm ? hm.name : horse.model) + ' · can ' + horse.health + '% · dayanıklılık ' + horse.stamina + '%' + (horse.mounted ? ' · biniyorsun' : '') : 'Yok');
    setText('[data-b="lifeMode"]', { Calm: 'Sakin', Hostile: 'Saldırgan', Companion: 'Takipçi', Flee: 'Kaçan' }[ui.lifeMode]);
    setText('[data-b="lifeCount"]', String(ui.lifeCount));
    var countText = {
      humans: (c.humans || 0) + ' insan (' + (c.law || 0) + ' kanun adamı dahil)',
      law: (c.law || 0) + ' kanun adamı', animals: (c.animals || 0) + ' hayvan', horses: (c.horses || 0) + ' at',
      peds: ((c.humans || 0) + (c.animals || 0) + (c.horses || 0)) + ' canlı · ' + (c.dead || 0) + ' ölü', vehicles: (c.vehicles || 0) + ' araç',
      trains: (c.trains || 0) + ' tren vagonu', props: (c.props || 0) + ' obje', spawned: String(c.spawned || 0)
    };
    Object.keys(countText).forEach(function (k) { setText('[data-count="' + k + '"]', countText[k]); });
    (s.slots || []).forEach(function (on, i) { setText('[data-slot="' + i + '"]', on ? 'kayıtlı' : 'boş'); });
    var sw = s.sweep || {}, bar = root.querySelector('[data-sweep]');
    if (bar) {
      bar.classList.toggle('mh-hidden', !sw.running);
      if (sw.running) {
        setText('[data-b="sweepLabel"]', sw.label || 'Temizleniyor');
        setText('[data-b="sweepText"]', sw.done + ' / ' + sw.total);
        MH.bar(root.querySelector('[data-sweepbar]'), sw.total ? sw.done / sw.total * 100 : 0);
      }
    }
  }

  function applyInventory(d) {
    if (d.weapons) Object.keys(d.weapons).forEach(function (k) { ui.inv.weapons[k] = d.weapons[k]; });
    if (d.ammo) ui.inv.ammo = d.ammo;
    if (d.current != null) ui.inv.current = d.current;
    if (!root || ui.section !== 'weapons') return;
    C.weapons.forEach(function (w) {
      var t = ownText(w);
      root.querySelectorAll('[data-own="' + w.id + '"]').forEach(function (el) { el.textContent = t; });
      var card = root.querySelector('.x-card[data-card="weapon"][data-id="' + w.id + '"]');
      if (card) card.classList.toggle('is-owned', !!(ui.inv.weapons[w.id] && ui.inv.weapons[w.id].owned));
    });
    C.ammo.forEach(function (a) { setText('[data-ammo="' + a.id + '"]', String(ui.inv.ammo[a.id] || 0)); });
  }

  /* ======================================================================
     Input
     ====================================================================== */
  function onClick(e) {
    var t = e.target;
    var navItem = t.closest('[data-sec]');
    if (navItem) { show(navItem.getAttribute('data-sec')); setFocus(navItem); return; }
    var tab = t.closest('[data-tab]');
    if (tab) { ui.tabs[tab.closest('[data-tabs]').getAttribute('data-tabs')] = tab.getAttribute('data-tab'); show(ui.section, true); focusTab(); return; }
    var set = t.closest('[data-set]');
    if (set) { e.preventDefault(); setting(set.getAttribute('data-set'), !ui.settings[set.getAttribute('data-set')]); return; }
    var lt = t.closest('[data-local-toggle]');
    if (lt) { var k = lt.getAttribute('data-local-toggle'); ui[k] = !ui[k]; syncControls(); return; }
    var segBtn = t.closest('[data-seg] button, [data-local] button');
    if (segBtn) {
      var g = segBtn.parentNode, v = segBtn.getAttribute('data-v'), num = Number(v), val = isNaN(num) ? v : num;
      if (g.hasAttribute('data-seg')) setting(g.getAttribute('data-seg'), val);
      else { ui[g.getAttribute('data-local')] = val; syncControls(); if (ui.section === 'weapons') { var keep = ui.focus && ui.focus.getAttribute('data-v'); show('weapons', true); refocusSeg('ammoAmount', keep); } bindState(); }
      return;
    }
    var coat = t.closest('[data-coat]');
    if (coat) { ui.horseCoat[ui.sel.horses] = coat.getAttribute('data-coat'); renderAside(); var c2 = aside.querySelector('[data-coat="' + coat.getAttribute('data-coat') + '"]'); if (c2) setFocus(c2); return; }
    var act = t.closest('[data-act]');
    if (act) { runAct(act); return; }
    var card = t.closest('[data-card]');
    if (card) { selectCard(card); primary(card); }
  }

  function refocusSeg(key, v) {
    var b = root.querySelector('[data-local="' + key + '"] button[data-v="' + v + '"]');
    if (b) setFocus(b);
  }

  function runAct(el) {
    var op = el.getAttribute('data-act'), args = {};
    try { args = JSON.parse(el.getAttribute('data-args') || '{}'); } catch (e) { args = {}; }
    if ((op === 'weapon.give' && args.amount == null) || (op === 'weapon.giveAll' && args.amount == null) || op === 'ammo.give') {
      if (args.amount == null) args.amount = ui.ammoAmount;
    }
    if (op === 'ammo.give' || op === 'weapon.give') args.ids = C.weapons.map(function (w) { return w.id; });
    if (op === 'animal.spawn') { args.mode = ui.lifeMode; args.count = ui.lifeCount; }
    if (op === 'horse.spawn') args.mine = ui.horseMine;
    var question = el.getAttribute('data-confirm');
    if (question) {
      MH.confirm({ title: el.textContent.trim(), text: question, danger: true, ok: 'Evet' }).then(function (ok) { if (ok) post(op, args); });
      return;
    }
    post(op, args);
  }

  function selectCard(card) {
    var kind = card.getAttribute('data-card'), id = card.getAttribute('data-id');
    var key = kind === 'weapon' || kind === 'ammo' ? 'weapons' : kind === 'horse' ? 'horses' : kind === 'life' ? 'life' : null;
    if (!key || ui.sel[key] === id) return;
    ui.sel[key] = id;
    main.querySelectorAll('.x-card.is-active').forEach(function (c) { c.classList.remove('is-active'); });
    card.classList.add('is-active');
    renderAside();
    bindState();
  }

  function primary(card) {
    var kind = card.getAttribute('data-card'), id = card.getAttribute('data-id');
    if (kind === 'weapon') {
      var w = C.weapons.filter(function (x) { return x.id === id; })[0];
      post('weapon.give', { id: id, label: w ? w.name : id, amount: ui.ammoAmount, ids: [id] });
    } else if (kind === 'ammo') {
      var a = C.ammo.filter(function (x) { return x.id === id; })[0];
      post('ammo.give', { id: id, label: a ? a.name : id, amount: ui.ammoAmount, ids: [] });
    } else if (kind === 'horse') {
      var h = C.horses.filter(function (x) { return x.id === id; })[0];
      var coat = ui.horseCoat[id] || (h && h.coats[0] && h.coats[0].id);
      if (coat) post('horse.spawn', { id: coat, label: h.name, mount: true, mine: ui.horseMine });
    } else if (kind === 'life') {
      var x = C.life.filter(function (l) { return l.id === id; })[0];
      post('animal.spawn', { id: id, label: x ? x.name : id, mode: ui.lifeMode, count: ui.lifeCount });
    } else if (kind === 'vehicle') {
      var v = C.vehicles.filter(function (l) { return l.id === id; })[0];
      post('vehicle.spawn', { id: id, label: v ? v.name : id, enter: ui.enterVehicle });
    } else if (kind === 'model') {
      var m = C.models.filter(function (l) { return l.id === id; })[0];
      post('player.model', { id: id, label: m ? m.name : id });
    }
  }

  function setFocus(el, fromMouse) {
    if (ui.focus) ui.focus.classList.remove('is-focus');
    ui.focus = el;
    if (!el) return;
    el.classList.add('is-focus');
    lastInZone[zoneOf(el)] = el;
    if (!fromMouse) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (el.hasAttribute('data-card')) selectCard(el);
  }
  function focusTab() {
    var t = main.querySelector('.x-tabs [data-f].is-active');
    if (t) setFocus(t);
  }

  function visibleFocusables() {
    return Array.prototype.slice.call(root.querySelectorAll('[data-f]')).filter(function (el) {
      if (el.offsetParent === null) return false;
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  // Spatial navigation inside a zone (navigation, main area, preview aside): the nearest element in the pressed
  // direction (primary axis distance + 2x cross-axis offset). Left / right past the edge of a zone jump to the
  // neighbouring zone (to the element focused there last, or the active navigation item).
  var ZONES = ['nav', 'main', 'aside'], lastInZone = {};
  function zoneOf(el) { return el.closest('.mh-menu__nav') ? 'nav' : el.closest('.x-aside') ? 'aside' : 'main'; }

  function nearest(list, from, dir) {
    var a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    var best = null, bestD = Infinity;
    list.forEach(function (el) {
      if (el === from) return;
      var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      var dx = x - ax, dy = y - ay, primaryD, cross;
      if (dir === 'up') { if (r.bottom > a.top + 2) return; primaryD = -dy; cross = Math.abs(dx); }
      else if (dir === 'down') { if (r.top < a.bottom - 2) return; primaryD = dy; cross = Math.abs(dx); }
      else if (dir === 'left') { if (r.right > a.left + 2) return; primaryD = -dx; cross = Math.abs(dy); }
      else if (dir === 'right') { if (r.left < a.right - 2) return; primaryD = dx; cross = Math.abs(dy); }
      else { primaryD = 0; cross = Math.abs(dy) + Math.abs(dx) * 0.01; }   // 'any': closest by height
      var d = primaryD + cross * 2;
      if (d < bestD) { bestD = d; best = el; }
    });
    return best;
  }

  function move(dir) {
    var list = visibleFocusables();
    if (!ui.focus || list.indexOf(ui.focus) < 0) { setFocus(list[0]); return; }
    var zone = zoneOf(ui.focus);
    var same = list.filter(function (el) { return zoneOf(el) === zone; });
    var best = nearest(same, ui.focus, dir);
    if (!best && (dir === 'left' || dir === 'right')) {
      var zi = ZONES.indexOf(zone) + (dir === 'left' ? -1 : 1);
      while (!best && zi >= 0 && zi < ZONES.length) {
        var z = ZONES[zi];
        var inZone = list.filter(function (el) { return zoneOf(el) === z; });
        if (inZone.length) {
          var remembered = lastInZone[z];
          if (remembered && inZone.indexOf(remembered) >= 0) best = remembered;
          else if (z === 'nav') best = nav.querySelector('.mh-nav__item.is-active') || inZone[0];
          else best = (z === 'main' && main.querySelector('.x-tabs [data-f].is-active')) || nearest(inZone, ui.focus, 'any') || inZone[0];
        }
        zi += dir === 'left' ? -1 : 1;
      }
    }
    if (best) setFocus(best);
  }

  function cycleTab(step) {
    var group = main.querySelector('.x-tabs');
    if (!group) return;
    var btns = Array.prototype.slice.call(group.querySelectorAll('[data-tab]'));
    var i = btns.findIndex(function (b) { return b.classList.contains('is-active'); });
    var next = btns[(i + step + btns.length) % btns.length];
    if (next) next.click();
  }

  function onKey(e) {
    // MHud's modal handles its own keys (and prevents the default of the ones it used)
    if (!ui.open || e.defaultPrevented || (MH.modalOpen && MH.modalOpen())) return;
    var k = e.key;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && k !== 'Escape') return;
    var handled = true;
    if (k === 'ArrowUp') move('up');
    else if (k === 'ArrowDown') move('down');
    else if (k === 'ArrowLeft') move('left');
    else if (k === 'ArrowRight') move('right');
    else if (k === 'Enter' || k === ' ') { if (ui.focus) ui.focus.click(); }
    else if (k === 'Escape') post('menu.close');
    else if (k === 'Backspace') { var n = nav.querySelector('.mh-nav__item.is-active'); if (n) setFocus(n); }
    else if (k === 'q' || k === 'Q') cycleTab(-1);
    else if (k === 'e' || k === 'E') cycleTab(1);
    else if (k === 'PageDown') main.querySelector('.mh-scroll') && (main.querySelector('.mh-scroll').scrollTop += 400);
    else if (k === 'PageUp') main.querySelector('.mh-scroll') && (main.querySelector('.mh-scroll').scrollTop -= 400);
    else handled = false;
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  }

  /* ======================================================================
     Messages
     ====================================================================== */
  function setOpen(open) {
    if (!root) build();
    ui.open = open;
    root.classList.toggle('mh-hidden', !open);
    document.body.classList.toggle('x-tm-open', open);
    if (open) {
      show(ui.section, false);
      if (!ui.focus || !root.contains(ui.focus)) setFocus(nav.querySelector('.mh-nav__item.is-active'));
    } else if (MH.closeModals) {
      MH.closeModals();
    }
  }

  MH.on('trainer:menu', function (d) {
    ui.mouse = !!d.mouse;
    if (d.version) ui.version = 'v' + d.version;
    if (!!d.open !== ui.open || (d.open && root && root.classList.contains('mh-hidden'))) setOpen(!!d.open);
  });
  MH.on('trainer:state', function (d) {
    ui.s = d;
    if (d.settings) {
      ui.settings = d.settings;
      if (ui.open) syncControls();
    }
    if (ui.open) bindState();
  });
  MH.on('trainer:inventory', applyInventory);
  document.addEventListener('keydown', onKey, true);

  // Browser preview (no game bridge): ?menu=1 opens the menu with sample state
  if (!window.streamember && /[?&]menu=1/.test(location.search)) {
    window.addEventListener('load', function () {
      setOpen(true);
      MH.emit('trainer:state', { cash: 1234, bounty: 45, wantedScore: 0, incident: false, health: 92, stamina: 80, cores: { health: 100, stamina: 64, deadeye: 40 },
        model: 'player_zero', weapon: 'RevolverCattleman', mounted: true, hour: 14, minute: 5, weather: 'SUNNY', pos: [-281.2, 793.4, 117.1],
        horse: { model: 'a_c_horse_arabian_white', health: 100, stamina: 90, mounted: true },
        counts: { humans: 42, animals: 18, horses: 9, law: 4, dead: 2, vehicles: 6, trains: 0, props: 830, spawned: 0 },
        sweep: { running: false, done: 0, total: 0, label: '' }, slots: [true, false, false],
        settings: { 'player.god': true, 'player.damage': 1, 'player.moveRate': 1, 'weapon.noCap': true, 'world.sweepRadius': 0, 'world.batch': 40,
          'world.density.humans': 1, 'world.density.animals': 1, 'world.density.vehicles': 1, 'world.timeScale': 1, 'world.keepCleanTarget': 'Peds',
          'tags.radius': 100, 'tags.max': 100, 'tags.distStep': 5, 'hud.theme': 'frontier' } });
      MH.emit('trainer:inventory', { weapons: { RevolverCattleman: { owned: true, ammo: 48 }, ThrownDynamite: { owned: true, ammo: 5 } }, ammo: { Revolver: 48, Dynamite: 5 } });
    });
  }
})();
