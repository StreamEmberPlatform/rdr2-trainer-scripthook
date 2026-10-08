/* MHud resource — NUI bağlama katmanı. Lua'dan gelen mesajları kit bileşenlerine bağlar. */
(function () {
  'use strict';
  var $ = MH.$;
  var S = { weapon: null, inVehicle: false, maxClip: 0 };

  /* Lua'nın gönderdiği silah adı → ekranda görünen etiket + silüet */
  var WEAPONS = {
    WEAPON_PISTOL: ['Tabanca', 'pistol'], WEAPON_COMBATPISTOL: ['Savaş tabancası', 'pistol'], WEAPON_PISTOL50: ['Tabanca .50', 'pistol'],
    WEAPON_HEAVYPISTOL: ['Ağır tabanca', 'pistol'], WEAPON_REVOLVER: ['Ağır revolver', 'revolver'],
    WEAPON_MICROSMG: ['Mikro SMG', 'smg'], WEAPON_SMG: ['SMG', 'smg'], WEAPON_ASSAULTSMG: ['Taarruz SMG', 'smg'], WEAPON_COMBATPDW: ['Savaş PDW', 'smg'],
    WEAPON_ASSAULTRIFLE: ['Taarruz tüfeği', 'carbine'], WEAPON_CARBINERIFLE: ['Karabina tüfeği', 'carbine'], WEAPON_ADVANCEDRIFLE: ['Gelişmiş tüfek', 'carbine'],
    WEAPON_SPECIALCARBINE: ['Özel karabina', 'carbine'], WEAPON_BULLPUPRIFLE: ['Bullpup tüfek', 'carbine'],
    WEAPON_PUMPSHOTGUN: ['Pompalı tüfek', 'shotgun'], WEAPON_SAWNOFFSHOTGUN: ['Kısa namlu pompalı', 'shotgun'], WEAPON_ASSAULTSHOTGUN: ['Taarruz pompalısı', 'shotgun'],
    WEAPON_HEAVYSHOTGUN: ['Ağır pompalı', 'shotgun'], WEAPON_SNIPERRIFLE: ['Keskin nişancı tüfeği', 'sniper'], WEAPON_HEAVYSNIPER: ['Ağır keskin nişancı', 'sniper'],
    WEAPON_MARKSMANRIFLE: ['Nişancı tüfeği', 'sniper'], WEAPON_MUSKET: ['Misket', 'repeater'], UNKNOWN: ['Silah', 'carbine']
  };

  var tags = MH.Nametags('#world');
  var markers = MH.Markers('#markers');
  var scaler = MH.autoScale({ base: 1080 });

  /* ---------------- Yapılandırma ---------------- */
  MH.on('mhud:config', function (c) {
    MH.theme(c.theme || 'modern');
    MH.accent(c.accent || '');
    scaler.set(c.scale || 1);
    $('#top-center').classList.toggle('mh-hidden', c.compass === false);
    $('#location').classList.toggle('mh-hidden', !c.location);
    $('#unit').textContent = c.unit === 'mph' ? 'MPH' : 'KM/S';
    $('#armor-row').classList.toggle('mh-hidden', c.game === 'redm');
    if (c.game === 'redm') MH.cardinals({ 0: 'K', 45: 'KD', 90: 'D', 135: 'GD', 180: 'G', 225: 'GB', 270: 'B', 315: 'KB' });
    MH.crop(c.crop && c.crop !== 'none' ? c.crop : 'wide', { target: '#screen', platform: c.platform || 'none' });
  });
  MH.on('mhud:visible', function (d) { document.body.classList.toggle('is-hidden', !d.show); });

  /* ---------------- Yaşam ---------------- */
  MH.on('mhud:vitals', function (v) {
    MH.bar('#hp', v.health, { critical: 25 });
    if (v.armor != null) MH.bar('#ar', v.armor);
    MH.bar('#st', v.stamina);
    var ox = $('#ox-row');
    ox.classList.toggle('mh-hidden', v.oxygen == null);
    if (v.oxygen != null) MH.bar('#ox', v.oxygen, { critical: 25 });
    var c = v.cores || { health: 100, stamina: 100, deadeye: 100 };
    MH.core('#core-hp', { value: v.health, core: c.health });
    MH.core('#core-st', { value: v.stamina, core: c.stamina, low: 10 });
    MH.core('#core-de', { value: c.deadeye, core: c.deadeye, low: 0 });
    MH.vignette('#vignette', v.health);
  });
  MH.on('mhud:wanted', function (w) {
    var stars = document.querySelectorAll('#wanted .mh-i');
    stars.forEach(function (s, i) { s.classList.toggle('on', i < w.level); });
    $('#wanted').classList.toggle('mh-hidden', !w.level);
    $('#wanted').classList.toggle('is-flashing', w.level > 0);
  });
  MH.on('mhud:money', function (m) {
    if (m.cash != null) MH.money('#cash', m.cash);
    if (m.bank != null) MH.count('#bank', m.bank);
  });

  /* ---------------- Silah ---------------- */
  function paintWeapon() {
    var w = S.weapon, box = $('#weapon');
    box.classList.toggle('mh-hidden', !w || S.inVehicle);
    if (!w) return;
    var meta = WEAPONS[w.name] || WEAPONS.UNKNOWN;
    if (box.__name !== w.name) {
      box.__name = w.name;
      $('#w-name').textContent = meta[0];
      $('#w-art').innerHTML = MH.weapon(meta[1], 'mh-weapon__art');
    }
    $('#clip').textContent = w.clip;
    $('#reserve').textContent = w.reserve;
    var max = Math.min(w.clipMax || 30, 40);
    MH.pips('#pips', Math.min(w.clip, max), max);
    box.classList.toggle('is-low', w.clipMax > 0 && w.clip <= Math.ceil(w.clipMax * .2));
    box.classList.toggle('is-reloading', !!w.reloading);
    $('#reload').classList.toggle('mh-hidden', !w.reloading);
  }
  MH.on('mhud:weapon', function (w) { S.weapon = w || null; paintWeapon(); });

  /* ---------------- Araç ---------------- */
  MH.on('mhud:vehicle', function (v) {
    S.inVehicle = !!v;
    $('#vehicle').classList.toggle('mh-hidden', !v);
    paintWeapon();
    if (!v) return;
    MH.speedo('#speedo', { max: 280, speed: v.speed, rpm: v.rpm, gear: v.speed < 1 && v.gear <= 1 ? 'N' : (v.gear === 0 ? 'R' : v.gear) });
    MH.bar('#fuel', v.fuel, { critical: 15 });
    MH.bar('#engine', v.engine, { critical: 25 });
    $('#v-name').textContent = v.name || '';
    $('#v-plate').textContent = (v.plate || '').trim();
    $('#l-lights').classList.toggle('on', !!v.lights);
    $('#l-lock').classList.toggle('on', !!v.locked);
    $('#l-engine').classList.toggle('is-warn', v.engine < 30);
  });

  /* ---------------- Konum & yön ---------------- */
  MH.on('mhud:location', function (l) {
    if (l.street != null) $('#street').textContent = l.street + (l.cross ? ' / ' + l.cross : '');
    if (l.zone != null) $('#zone').textContent = l.zone;
  });
  var DIRS = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  MH.on('mhud:heading', function (h) {
    MH.compass('#compass', h);
    $('#dir').textContent = DIRS[Math.round(h / 45) % 8];
  });

  /* ---------------- Dünya ---------------- */
  MH.on('mhud:nametags', function (list) {
    tags.update(list.map(function (p) {
      p.sub = p.dist + ' M';
      p.tone = p.tone || 'team1';
      p.sig = [p.name, p.health, p.armor, p.talking, p.dead, p.dist].join('|');
      return p;
    }));
  });
  MH.on('mhud:markers', function (list) { markers.update(list || []); });

  /* ---------------- Görev ---------------- */
  MH.on('mhud:objective', function (o) {
    var host = $('#objective-host');
    if (!o) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="mh-panel mh-objective"><div class="mh-objective__head"><div><span class="mh-kicker mh-kicker--accent">' + MH.esc(o.kicker || 'Görev') + '</span>' +
      '<div class="mh-title" style="margin-top:4px">' + MH.esc(o.title || '') + '</div></div>' + (o.timer ? '<span class="mh-badge mh-t-accent mh-num">' + MH.esc(o.timer) + '</span>' : '') + '</div>' +
      '<div class="mh-objective__steps">' + (o.steps || []).map(function (s) {
        return '<div class="mh-step' + (s.done ? ' is-done' : s.active ? ' is-active' : s.failed ? ' is-failed' : '') + '"><span class="mh-step__box">' + MH.icon(s.failed ? 'x' : 'check') + '</span><span>' + MH.esc(s.text) + (s.count ? ' <b>' + MH.esc(s.count) + '</b>' : '') + '</span></div>';
      }).join('') + '</div>' +
      (o.progress != null ? '<div class="mh-objective__foot"><div class="mh-bar mh-bar--sm"><i class="mh-bar__fill" style="transform:scaleX(' + (o.progress / 100) + ')"></i></div></div>' : '') + '</div>';
  });

  /* ---------------- İstek / yanıt ---------------- */
  var progress = {};
  MH.on('mhud:progress', function (o) {
    var p = MH.progress({ label: o.label, icon: o.icon, duration: o.duration, cancelKey: o.cancelKey || false });
    progress[o.id] = p;
    p.then(function (ok) { delete progress[o.id]; MH.post('progressDone', { id: o.id, ok: ok }); });
  });
  MH.on('mhud:progressCancel', function (o) { if (progress[o.id]) progress[o.id].cancel(); });
  MH.on('mhud:confirm', function (o) {
    MH.confirm(o).then(function (ok) { MH.post('confirmResult', { id: o.id, ok: ok }); });
  });

  /* ---------------- Klasik menü ---------------- */
  var DEMO_MENU = {
    title: 'Etkileşim', subtitle: 'Ana menü',
    items: [
      { id: 'inventory', label: 'Envanter', desc: 'Envanterdeki sarf malzemelerini kullan.', chevron: true },
      { id: 'passive', label: 'Pasif mod', desc: 'Pasif modda hasar vermez ve almazsın.', check: false },
      { id: 'mood', label: 'Ruh hali', desc: 'Animasyonları ve yürüyüş stilini değiştir.', options: ['Normal', 'Mutlu', 'Sinirli', 'Yorgun'] },
      { id: 'vehicle', label: 'Aracı çağır', desc: 'Kişisel aracını yakınına çağır.', right: '$250' },
      { id: 'ceo', label: 'CEO yetkileri', desc: 'Seviye 50 gerekir.', disabled: true },
      { id: 'leave', label: 'Oturumdan ayrıl', desc: 'Ana menüye dön.' }
    ]
  };
  var nav = null;
  function closeMenuUI() { var h = $('#menu-host'); h.classList.add('mh-hidden'); h.innerHTML = ''; document.body.classList.remove('x-menu-open'); if (nav) { nav.destroy(); nav = null; } }
  MH.on('mhud:menu', function (d) {
    closeMenuUI();
    if (!d.open) return;
    var m = d.menu && d.menu.demo ? DEMO_MENU : d.menu;
    var host = $('#menu-host');
    host.innerHTML = '<div class="mh-classic"><div class="mh-classic__banner"><b>' + MH.esc(m.title || 'Menü') + '</b></div>' +
      '<div class="mh-classic__sub"><span>' + MH.esc(m.subtitle || '') + '</span><span class="x-count"></span></div><div class="mh-classic__list">' +
      m.items.map(function (it, i) {
        var right = it.options ? '<div class="mh-stepper" data-mh-stepper="' + MH.esc(it.options.join('|')) + '" data-index="' + (it.index || 0) + '"></div>'
          : it.check != null ? '<label class="mh-check"><input type="checkbox"' + (it.check ? ' checked' : '') + '><span class="mh-check__box"></span></label>'
          : it.right ? MH.esc(it.right) : it.chevron ? MH.icon('chev-r') : it.disabled ? MH.icon('lock') : '';
        return '<div class="mh-classic__item' + (it.disabled ? ' is-disabled' : '') + '" data-i="' + i + '"><span>' + MH.esc(it.label) + '</span><em>' + right + '</em></div>';
      }).join('') + '</div><div class="mh-classic__desc">' + MH.icon('info') + '<span class="x-desc"></span></div></div>';
    host.classList.remove('mh-hidden');
    document.body.classList.add('x-menu-open');
    MH.mount(host);
    var items = host.querySelectorAll('.mh-classic__item');
    nav = MH.listNav(host.querySelector('.mh-classic'), {
      onChange: function (el) {
        var it = m.items[+el.getAttribute('data-i')];
        host.querySelector('.x-desc').textContent = it.desc || '';
        host.querySelector('.x-count').textContent = (Array.prototype.indexOf.call(items, el) + 1) + ' / ' + items.length;
      },
      onSelect: function (el) {
        var it = m.items[+el.getAttribute('data-i')], value = null;
        var chk = el.querySelector('input[type=checkbox]');
        if (chk) { chk.checked = !chk.checked; value = chk.checked; }
        var st = el.querySelector('.mh-stepper__value'); if (st) value = st.textContent;
        MH.post('menuSelect', { id: it.id, value: value });
      },
      onBack: function () { MH.post('menuClose', {}); }
    });
  });

  /* ---------------- Vitrin (/mhud_demo) ---------------- */
  MH.on('mhud:demo', function () {
    var q = [
      function () { MH.toast({ tone: 'success', title: 'MHud yüklendi', text: 'Tema: ' + (document.body.getAttribute('data-mh-theme') || 'modern') }); },
      function () { MH.money('#cash', 12480); MH.count('#bank', 1204900); },
      function () { MH.gift({ from: 'NabeMedia', name: 'Aslan', art: '🦁', tier: 'legendary', coins: 29999, effect: 'Boss dalgası çağrıldı', effectIcon: 'skull' }); },
      function () { MH.kill({ actor: 'NabeMedia', victim: 'Bandit #42', weapon: 'sniper', headshot: true }); },
      function () { MH.announce({ kicker: 'Yeni dalga', title: 'Dalga 8', sub: 'Zırhlı düşmanlar yaklaşıyor' }); },
      function () { MH.pickup({ icon: 'bullets', name: 'Tüfek mermisi', amount: 30 }); },
      function () { MH.banner({ title: 'Görev tamamlandı', sub: 'Konvoy baskını', rewards: [{ value: '+$25.000', label: 'Ödeme', tone: 'success' }, { value: '+1.250', label: 'RP' }] }); }
    ];
    q.forEach(function (fn, i) { setTimeout(fn, i * 900); });
  });

  MH.post('ready', {});
})();
