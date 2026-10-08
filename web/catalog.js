/* StreamEmber Trainer (RDR2) — catalogs of the big menu.
 *
 * ids are the runtime enum names (eWeapon, eAmmoType, PedHash, VehicleHash): the game side parses them and rejects a
 * name it does not know. Weapon stats come from the tables of https://reddead.fandom.com/wiki/Weapons_in_Redemption_2
 * (Damage, Range, Fire rate, Accuracy, Reload; "base/upgraded" pairs use the upgraded value, qualitative values of
 * the Elephant Rifle are mapped onto the same 0-4 scale). Horse ratings: https://reddead.fandom.com/wiki/Horse
 * (Low/Average/High per horse type). wiki = article title used to fetch the picture from the wiki.
 */
(function () {
  'use strict';

  // [id, wiki title, Turkish note, dmg, rng, fr, acc, rel, clip, price]
  function W(cat, rows, icon) {
    return rows.map(function (r) {
      return { cat: cat, id: r[0], name: r[1], wiki: r[1], note: r[2] || '', icon: icon,
        st: { dmg: r[3], rng: r[4], fr: r[5], acc: r[6], rel: r[7] }, clip: r[8], price: r[9] };
    });
  }

  var WEAPONS = [].concat(
    W('revolver', [
      ['RevolverCattleman', 'Cattleman Revolver', 'Güvenilir, altı atışlık.', 1.7, 2.8, 3.0, 2.8, 2.7, 6, 50],
      ['RevolverCattlemanPig', "Granger's Revolver", 'Benzersiz (Granger domuz çiftliği).', 2.7, 2.0, 3.0, 2.8, 2.7, 6, null],
      ['RevolverCattlemanMexican', "Flaco's Revolver", 'Benzersiz (Flaco Hernández).', 1.7, 2.0, 3.0, 2.8, 2.7, 6, null],
      ['RevolverCattlemanJohn', "John's Cattleman Revolver", 'John Marston\'ın revolveri.', 2.7, 2.8, 3.0, 2.8, 2.7, 6, null],
      ['RevolverDoubleAction', 'Double-Action Revolver', 'Hızlı atış, horozu kendiliğinden kurulur.', 1.5, 2.8, 3.2, 2.0, 3.2, 6, 65],
      ['RevolverDoubleActionExotic', "Algernon's Revolver", 'Benzersiz (Algernon Wasp).', 1.5, 2.0, 3.2, 2.0, 2.8, 6, null],
      ['RevolverDoubleActionMicah', "Micah's Revolver", 'Benzersiz (Micah Bell).', 1.7, 2.0, 3.2, 2.2, 2.8, 6, null],
      ['RevolverDoubleActionGambler', 'High Roller Double-Action Revolver', 'Kumarbaz işlemeli.', 1.5, 2.0, 3.2, 2.8, 2.0, 6, 90],
      ['RevolverSchofield', 'Schofield Revolver', 'Güçlü, kırma namlu.', 1.9, 2.8, 2.8, 3.0, 3.0, 6, 84],
      ['RevolverSchofieldCalloway', "Calloway's Revolver", 'Benzersiz (Flaco/Calloway düellosu).', 1.9, 2.0, 2.8, 3.0, 2.5, 6, null],
      ['RevolverSchofieldGolden', "Otis Miller's Revolver", 'Benzersiz, altın kaplama.', 2.9, 2.0, 2.8, 3.0, 3.0, 6, null],
      ['RevolverLemat', 'LeMat Revolver', '9 revolver + 1 av tüfeği fişeği.', 4.0, 4.0, 4.0, 4.0, 4.0, 9, 172],
      ['RevolverNavy', 'Navy Revolver', 'Yüksek hasar.', 2.1, 2.0, 2.9, 2.9, 2.0, 6, 275],
      ['RevolverNavyCrossover', "Lowry's Revolver", 'GTA Online bağlantılı benzersiz.', 2.1, 2.2, 2.9, 3.2, 2.0, 6, null],
      ['RevolverCattlemanHosea', "Hosea's Cattleman", 'Çete üyesinin silahı (tablo: Cattleman).', 1.7, 2.8, 3.0, 2.8, 2.7, 6, null],
      ['RevolverCattlemanKieran', "Kieran's Cattleman", 'Çete üyesinin silahı (tablo: Cattleman).', 1.7, 2.8, 3.0, 2.8, 2.7, 6, null],
      ['RevolverCattlemanLenny', "Lenny's Cattleman", 'Çete üyesinin silahı (tablo: Cattleman).', 1.7, 2.8, 3.0, 2.8, 2.7, 6, null],
      ['RevolverCattlemanSadie', "Sadie's Cattleman", 'Çete üyesinin silahı (tablo: Cattleman).', 1.7, 2.8, 3.0, 2.8, 2.7, 6, null],
      ['RevolverCattlemanSean', "Sean's Cattleman", 'Çete üyesinin silahı (tablo: Cattleman).', 1.7, 2.8, 3.0, 2.8, 2.7, 6, null],
      ['RevolverSchofieldBill', "Bill's Schofield", 'Çete üyesinin silahı (tablo: Schofield).', 1.9, 2.8, 2.8, 3.0, 3.0, 6, null],
      ['RevolverSchofieldDutch', "Dutch's Schofield", 'Çete üyesinin silahı (tablo: Schofield).', 1.9, 2.8, 2.8, 3.0, 3.0, 6, null],
      ['RevolverSchofieldUncle', "Uncle's Schofield", 'Çete üyesinin silahı (tablo: Schofield).', 1.9, 2.8, 2.8, 3.0, 3.0, 6, null],
      ['RevolverDoubleActionJavier', "Javier's Double-Action", 'Çete üyesinin silahı (tablo: Double-Action).', 1.5, 2.8, 3.2, 2.0, 3.2, 6, null]
    ], 'revolver'),
    W('pistol', [
      ['PistolVolcanic', 'Volcanic Pistol', 'Yüksek hasar, yavaş.', 3.2, 2.8, 2.0, 3.0, 2.2, 8, 150],
      ['PistolSemiauto', 'Semi-Automatic Pistol', 'Hızlı yarı otomatik.', 2.2, 2.8, 3.3, 2.7, 3.6, 8, 210],
      ['PistolMauser', 'Mauser Pistol', 'Hızlı, 10 mermilik.', 1.4, 2.8, 3.1, 2.6, 3.3, 10, 250],
      ['PistolMauserDrunk', "Midnight's Pistol", 'Benzersiz Mauser.', 1.4, 2.8, 3.1, 2.6, 3.4, 10, null],
      ['PistolM1899', 'M1899 Pistol', 'Hikâyenin sonunda açılır.', 1.5, 2.0, 3.1, 3.2, 2.8, 8, 350]
    ], 'pistol'),
    W('repeater', [
      ['RepeaterCarbine', 'Carbine Repeater', 'Hafif, hızlı.', 2.4, 2.7, 2.3, 2.8, 3.4, 7, 90],
      ['RepeaterWinchester', 'Lancaster Repeater', '14 mermi, dengeli.', 2.2, 2.8, 2.3, 2.9, 3.2, 14, 135],
      ['RepeaterHenry', 'Litchfield Repeater', 'Güçlü, 16 mermi.', 2.8, 2.8, 2.2, 2.7, 3.0, 16, 145],
      ['RepeaterEvans', 'Evans Repeater', '26 mermilik şarjör.', 2.0, 2.6, 2.6, 3.0, 2.5, 26, 140],
      ['RepeaterCarbineSadie', "Sadie's Carbine", 'Çete üyesinin silahı (tablo: Carbine).', 2.4, 2.7, 2.3, 2.8, 3.4, 7, null],
      ['RepeaterWinchesterJohn', "John's Lancaster", 'Çete üyesinin silahı (tablo: Lancaster).', 2.2, 2.8, 2.3, 2.9, 3.2, 14, null]
    ], 'repeater'),
    W('rifle', [
      ['RifleVarmint', 'Varmint Rifle', 'Küçük av için (.22).', 1.6, 3.2, 2.8, 2.9, 3.2, 14, 72],
      ['RifleSpringfield', 'Springfield Rifle', 'Tek atış, çok güçlü.', 4.0, 4.0, 1.2, 3.1, 2.1, 1, 120],
      ['RifleBoltAction', 'Bolt Action Rifle', 'Sürgülü, 5 mermi.', 2.9, 4.0, 1.5, 3.2, 2.5, 5, 180],
      ['RifleBoltActionBill', "Bill's Bolt Action", 'Çete üyesinin silahı (tablo: Bolt Action).', 2.9, 4.0, 1.5, 3.2, 2.5, 5, null]
    ], 'rifle'),
    W('sniper', [
      ['SniperRifleRollingblock', 'Rolling Block Rifle', 'Uzun dürbün, tek atış.', 4.0, 4.0, 1.2, 3.4, 1.9, 1, 187],
      ['SniperRifleRollingblockExotic', 'Rare Rolling Block Rifle', 'Benzersiz.', 4.0, 4.0, 1.2, 3.6, 1.9, 1, null],
      ['SniperRifleCarcano', 'Carcano Rifle', 'Hızlı keskin nişancı.', 3.1, 4.0, 1.5, 3.2, 3.2, 6, 190],
      ['RifleElephant', 'Elephant Rifle', 'Çok yüksek hasar, yavaş (wiki: niteliksel).', 4.0, 1.5, 1.0, 1.5, 1.6, 2, 580],
      ['SniperRifleRollingblockLenny', "Lenny's Rolling Block", 'Çete üyesinin silahı (tablo: Rolling Block).', 4.0, 4.0, 1.2, 3.4, 1.9, 1, null]
    ], 'sniper'),
    W('shotgun', [
      ['ShotgunSawedoff', 'Sawed-Off Shotgun', 'Tek elle, yakın mesafe.', 3.6, 1.3, 2.3, 2.0, 2.0, 2, 85],
      ['ShotgunDoubleBarrel', 'Double-Barreled Shotgun', 'Çift namlu.', 2.8, 2.0, 2.5, 1.8, 2.0, 2, 95],
      ['ShotgunDoubleBarrelExotic', 'Rare Shotgun', 'Benzersiz çift namlu.', 2.8, 1.9, 2.5, 1.5, 2.2, 2, null],
      ['ShotgunPump', 'Pump-Action Shotgun', 'Pompalı, 5 fişek.', 2.5, 2.0, 2.0, 2.5, 2.5, 5, 148],
      ['ShotgunSemiauto', 'Semi-Auto Shotgun', 'Hızlı atış.', 2.2, 2.0, 2.5, 2.5, 2.6, 5, 225],
      ['ShotgunRepeating', 'Repeating Shotgun', 'Kollu, 6 fişek.', 3.4, 2.0, 2.0, 2.2, 2.9, 6, 185],
      ['ShotgunSawedoffCharles', "Charles's Sawed-Off", 'Çete üyesinin silahı (tablo: Sawed-Off).', 3.6, 1.3, 2.3, 2.0, 2.0, 2, null],
      ['ShotgunSemiautoHosea', "Hosea's Semi-Auto", 'Çete üyesinin silahı (tablo: Semi-Auto).', 2.2, 2.0, 2.5, 2.5, 2.6, 5, null],
      ['ShotgunDoubleBarrelUncle', "Uncle's Double-Barreled", 'Çete üyesinin silahı (tablo: Double-Barreled).', 2.8, 2.0, 2.5, 1.8, 2.0, 2, null]
    ], 'shotgun'),
    W('bow', [
      ['Bow', 'Bow', 'Sessiz; normal ok (40).', 2.4, 1.6, 1.2, 3.2, 1.6, 1, null],
      ['BowImproved', 'Improved Bow', 'Geliştirilmiş yay.', 3.0, 1.6, 1.2, 3.2, 1.6, 1, null],
      ['BowCharles', "Charles's Bow", 'Çete üyesinin yayı.', 2.4, 1.6, 1.2, 3.2, 1.6, 1, null]
    ], 'bow'),
    // Throwables: dmg, rng, acc only (no fire rate / reload in the wiki table)
    W('throw', [
      ['ThrownDynamite', 'Dynamite', 'Fitilli dinamit (8).', 3.6, 1.0, null, 1.0, null, 8, 1],
      ['ThrownMolotov', 'Fire Bottle', 'Molotof kokteyli (8).', 2.8, 1.0, null, 1.0, null, 8, 0.75],
      ['ThrownThrowingKnives', 'Throwing Knife', 'Fırlatma bıçağı (8).', 2.0, 1.0, null, 1.6, null, 8, 2.5],
      ['ThrownTomahawk', 'Tomahawk', 'Tomahawk (3).', 2.4, 1.0, null, 1.0, null, 3, 4],
      ['ThrownTomahawkAncient', 'Ancient Tomahawk', 'Benzersiz tomahawk.', 2.4, 1.0, null, 1.0, null, 1, null],
      ['ThrownPoisonBottle', 'Toxic Moonshine', 'Zehirli kaçak içki (8).', 3.0, 1.2, null, 1.0, null, 8, 5],
      ['MoonshineJug', 'Flammable Moonshine', 'Yanıcı kaçak içki.', 1.0, 0.8, null, 1.0, null, 1, 20],
      ['ThrownBolas', 'Bolas', 'Ayak bağlayıcı (Online silahı).', 0.6, 1.2, null, 1.6, null, 3, null],
      ['ThrownThrowingKnivesJavier', "Javier's Throwing Knives", 'Çete üyesinin bıçakları.', 2.0, 1.0, null, 1.6, null, 8, null],
      ['Lasso', 'Lasso', 'Kement.', 0.4, 0.9, null, 1.0, null, null, null],
      ['LassoReinforced', 'Reinforced Lasso', 'Güçlendirilmiş kement.', 0.6, 0.9, null, 1.2, null, null, 350]
    ], 'dynamite'),
    W('melee', [
      ['MeleeKnife', 'Hunting Knife', 'Av bıçağı.', 2.0, 0.4, null, null, null, null, null],
      ['MeleeKnifeJohn', "John's Knife", 'Benzersiz bıçak.', 2.0, 0.4, null, null, null, null, null],
      ['MeleeKnifeBear', 'Antler Knife', 'Boynuz saplı bıçak.', 2.0, 0.4, null, null, null, null, null],
      ['MeleeKnifeCivilWar', 'Civil War Knife', 'İç Savaş bıçağı.', 2.0, 0.4, null, null, null, null, null],
      ['MeleeKnifeJawbone', 'Jawbone Knife', 'Çene kemiği bıçak.', 2.0, 0.4, null, null, null, null, null],
      ['MeleeKnifeMiner', 'Wide-Blade Knife', 'Geniş ağızlı bıçak.', 2.0, 0.4, null, null, null, null, null],
      ['MeleeKnifeVampire', 'Ornate Dagger', 'Vampirin hançeri.', 2.2, 0.4, null, null, null, null, null],
      ['MeleeMachete', 'Machete', 'Pala.', 2.2, 0.4, null, null, null, null, 10],
      ['MeleeBrokenSword', 'Broken Pirate Sword', 'Kırık korsan kılıcı.', 2.2, 0.5, null, null, null, null, null],
      ['MeleeCleaver', 'Cleaver', 'Satır (fırlatılabilir).', 2.4, 1.0, null, 1.0, null, null, 8],
      ['MeleeHatchet', 'Hatchet', 'Balta (fırlatılabilir).', 2.4, 1.0, null, 1.0, null, null, 4.25],
      ['MeleeHatchetHewing', 'Hewing Hatchet', 'Benzersiz balta.', 2.4, 1.0, null, 1.0, null, null, null],
      ['MeleeAncientHatchet', 'Stone Hatchet', 'Taş balta.', 2.4, 1.0, null, 1.0, null, null, null],
      ['MeleeHatchetViking', 'Viking Hatchet', 'Viking baltası.', 2.6, 1.0, null, 1.0, null, null, null],
      ['MeleeHatchetHunter', 'Hunter Hatchet', 'Avcı baltası.', 2.4, 1.0, null, 1.0, null, null, null],
      ['MeleeHatchetHunterRusted', 'Rusted Hunter Hatchet', 'Paslı avcı baltası.', 2.2, 1.0, null, 1.0, null, null, null],
      ['MeleeHatchetDoubleBit', 'Double Bit Hatchet', 'Çift ağızlı balta.', 2.6, 1.0, null, 1.0, null, null, null],
      ['MeleeHatchetDoubleBitRusted', 'Rusted Double Bit Hatchet', 'Paslı çift ağızlı balta.', 2.4, 1.0, null, 1.0, null, null, null],
      ['MeleeMacheteCollector', 'Machete (collector)', 'Koleksiyoncu palası.', 2.2, 0.4, null, null, null, null, null],
      ['MeleeHammer', 'Hammer', 'Çekiç.', 1.6, 0.4, null, null, null, null, null],
      ['MeleeTorch', 'Torch', 'Meşale.', 1.2, 0.4, null, null, null, null, null],
      ['MeleeLantern', 'Lantern', 'Fener.', 0.8, 0.4, null, null, null, null, null],
      ['MeleeDavyLantern', 'Davy Lantern', 'Maden feneri.', 0.8, 0.4, null, null, null, null, null]
    ], 'knife'),
    W('kit', [
      ['KitBinoculars', 'Binoculars', 'Dürbün.', null, null, null, null, null, null, null],
      ['KitCamera', 'Camera', 'Fotoğraf makinesi.', null, null, null, null, null, null, null],
      ['FishingRod', 'Fishing Rod', 'Olta.', null, null, null, null, null, null, null],
      ['KitMetalDetector', 'Metal Detector', 'Metal dedektörü (Online).', null, null, null, null, null, null, null]
    ], 'binoculars')
  );

  // Icons of the throwables / melee weapons until the wiki picture arrives
  var ICONS = { ThrownMolotov: 'molotov', ThrownThrowingKnives: 'knife', ThrownThrowingKnivesJavier: 'knife', ThrownTomahawk: 'axe',
    ThrownTomahawkAncient: 'axe', ThrownPoisonBottle: 'poison', MoonshineJug: 'bottle', ThrownBolas: 'lasso', Lasso: 'lasso',
    LassoReinforced: 'lasso', MeleeMachete: 'machete', MeleeMacheteCollector: 'machete', MeleeBrokenSword: 'sword', MeleeHammer: 'hammer',
    MeleeTorch: 'flame', MeleeLantern: 'lantern', MeleeDavyLantern: 'oil-lamp', MeleeCleaver: 'axe', KitCamera: 'camera', FishingRod: 'hook',
    KitMetalDetector: 'radar' };
  WEAPONS.forEach(function (w) {
    if (ICONS[w.id]) w.icon = ICONS[w.id];
    else if (/Hatchet/.test(w.id)) w.icon = 'axe';
  });

  var WEAPON_CATS = [
    { id: 'revolver', label: 'Revolverler', icon: 'revolver', weapon: 'revolver' },
    { id: 'pistol', label: 'Tabancalar', icon: 'pistol', weapon: 'pistol' },
    { id: 'repeater', label: 'Kollu tüfekler', icon: 'rifle', weapon: 'repeater' },
    { id: 'rifle', label: 'Tüfekler', icon: 'rifle', weapon: 'carbine' },
    { id: 'sniper', label: 'Keskin nişancı', icon: 'scope', weapon: 'sniper' },
    { id: 'shotgun', label: 'Av tüfekleri', icon: 'shotgun', weapon: 'shotgun' },
    { id: 'bow', label: 'Yaylar', icon: 'bow' },
    { id: 'throw', label: 'Fırlatılanlar', icon: 'dynamite' },
    { id: 'melee', label: 'Yakın dövüş', icon: 'knife' },
    { id: 'kit', label: 'Ekipman', icon: 'binoculars' },
    { id: 'ammo', label: 'Mermi ve oklar', icon: 'bullets' }
  ];

  // Ammo types (eAmmoType) with the weapon class they belong to and the wiki stats when there are any (arrows)
  var AMMO = [
    ['Revolver', 'Revolver mermisi', 'revolver'], ['RevolverExpress', 'Revolver · Ekspres', 'revolver'],
    ['RevolverHighVelocity', 'Revolver · Yüksek hız', 'revolver'], ['RevolverSplitPoint', 'Revolver · Yarık uçlu', 'revolver'],
    ['RevolverExpressExplosive', 'Revolver · Patlayıcı', 'revolver'],
    ['Pistol', 'Tabanca mermisi', 'pistol'], ['PistolExpress', 'Tabanca · Ekspres', 'pistol'],
    ['PistolHighVelocity', 'Tabanca · Yüksek hız', 'pistol'], ['PistolSplitPoint', 'Tabanca · Yarık uçlu', 'pistol'],
    ['PistolExpressExplosive', 'Tabanca · Patlayıcı', 'pistol'],
    ['Repeater', 'Kollu tüfek mermisi', 'repeater'], ['RepeaterExpress', 'Kollu · Ekspres', 'repeater'],
    ['RepeaterHighVelocity', 'Kollu · Yüksek hız', 'repeater'], ['RepeaterSplitPoint', 'Kollu · Yarık uçlu', 'repeater'],
    ['RepeaterExpressExplosive', 'Kollu · Patlayıcı', 'repeater'],
    ['Rifle', 'Tüfek mermisi', 'rifle'], ['RifleExpress', 'Tüfek · Ekspres', 'rifle'],
    ['RifleHighVelocity', 'Tüfek · Yüksek hız', 'rifle'], ['RifleSplitPoint', 'Tüfek · Yarık uçlu', 'rifle'],
    ['RifleExpressExplosive', 'Tüfek · Patlayıcı', 'rifle'], ['RifleElephant', 'Fil tüfeği mermisi', 'sniper'],
    ['Ammo22', 'Varmint (.22)', 'rifle'], ['Ammo22Tranquilizer', 'Varmint · Uyuşturucu', 'rifle'],
    ['Shotgun', 'Av tüfeği fişeği', 'shotgun'], ['ShotgunBuckshotIncendiary', 'Fişek · Yakıcı saçma', 'shotgun'],
    ['ShotgunSlug', 'Fişek · Tek kurşun', 'shotgun'], ['ShotgunSlugExplosive', 'Fişek · Patlayıcı tek kurşun', 'shotgun'],
    ['Arrow', 'Ok', 'bow', 'Arrows', [2.4, 1.6, 1.2, 3.2, 1.6]],
    ['ArrowImproved', 'Geliştirilmiş ok', 'bow', 'Improved Arrows', [3.0, 1.6, 1.2, 3.2, 1.6]],
    ['ArrowSmallGame', 'Küçük av oku', 'bow', 'Small Game Arrows', [1.6, 1.6, 1.2, 3.2, 1.6]],
    ['ArrowPoison', 'Zehirli ok', 'bow', 'Poison Arrows', [2.6, 1.6, 1.2, 3.2, 1.6]],
    ['ArrowFire', 'Ateşli ok', 'bow', 'Fire Arrows', [3.2, 1.6, 1.2, 3.2, 1.6]],
    ['ArrowDynamite', 'Dinamitli ok', 'bow', 'Dynamite Arrows', [4.0, 1.6, 1.2, 3.2, 1.6]],
    ['Dynamite', 'Dinamit', 'throw', 'Dynamite'], ['DynamiteVolatile', 'Uçucu dinamit', 'throw', 'Volatile Dynamite'],
    ['Molotov', 'Ateş şişesi (molotof)', 'throw', 'Fire Bottle'], ['MolotovVolatile', 'Uçucu ateş şişesi', 'throw', 'Volatile Fire Bottle'],
    ['ThrowingKnives', 'Fırlatma bıçağı', 'throw', 'Throwing Knife'], ['ThrowingKnivesImproved', 'Geliştirilmiş fırlatma bıçağı', 'throw'],
    ['ThrowingKnivesPoison', 'Zehirli fırlatma bıçağı', 'throw'],
    ['Tomahawk', 'Tomahawk', 'throw'], ['TomahawkImproved', 'Geliştirilmiş tomahawk', 'throw'],
    ['TomahawkHoming', 'Güdümlü tomahawk', 'throw'], ['TomahawkAncient', 'Antik tomahawk', 'throw'],
    ['PoisonBottle', 'Zehirli kaçak içki', 'throw'], ['MoonshineJug', 'Yanıcı kaçak içki', 'throw'],
    ['Bolas', 'Bolas', 'throw'], ['Hatchet', 'Balta', 'melee'], ['HatchetCleaver', 'Satır', 'melee']
  ].map(function (a) {
    return { id: a[0], name: a[1], cls: a[2], wiki: a[3] || null,
      st: a[4] ? { dmg: a[4][0], rng: a[4][1], fr: a[4][2], acc: a[4][3], rel: a[4][4] } : null };
  });

  /* ---------------- horses ---------------- */
  // Breed (wiki title), Turkish type, ratings [health, stamina, speed, accel] 1..3 (Low/Average/High), handling 1..4
  var HT = { draft: ['Yük', 'Ağır'], race: ['Yarış', 'Yarış'], riding: ['Binek', 'Standart'], superior: ['Üstün', 'Elit'],
    war: ['Savaş', 'Standart'], work: ['İş', 'Standart'] };
  var HORSE_BREEDS = [
    ['americanpaint', 'American Paint', 'work', [2, 3, 2, 1], 2],
    ['americanstandardbred', 'American Standardbred', 'race', [1, 1, 3, 3], 3],
    ['andalusian', 'Andalusian', 'war', [3, 3, 1, 1], 2],
    ['appaloosa', 'Appaloosa', 'work', [2, 3, 2, 1], 2],
    ['arabian', 'Arabian', 'superior', [3, 3, 3, 3], 4],
    ['ardennes', 'Ardennes', 'war', [3, 3, 1, 1], 2],
    ['belgian', 'Belgian Draft Horse', 'draft', [2, 2, 2, 2], 1],
    ['breton', 'Breton', null, null, null],
    ['criollo', 'Criollo', null, null, null],
    ['dutchwarmblood', 'Dutch Warmblood', 'work', [2, 3, 2, 1], 2],
    ['gypsycob', 'Gypsy Cob', null, null, null],
    ['hungarianhalfbred', 'Hungarian Half-bred', 'war', [3, 3, 1, 1], 2],
    ['kentuckysaddle', 'Kentucky Saddler', 'riding', [1, 1, 1, 1], 2],
    ['kladruber', 'Kladruber', null, null, null],
    ['missourifoxtrotter', 'Missouri Fox Trotter', 'race', [1, 1, 3, 3], 3],
    ['morgan', 'Morgan', 'riding', [1, 1, 1, 1], 2],
    ['mustang', 'Mustang', 'war', [3, 3, 2, 1], 2],
    ['nokota', 'Nokota', 'race', [1, 1, 3, 3], 3],
    ['norfolkroadster', 'Norfolk Roadster', null, null, null],
    ['shire', 'Shire', 'draft', [2, 2, 2, 2], 1],
    ['suffolkpunch', 'Suffolk Punch', 'draft', [2, 2, 2, 2], 1],
    ['tennesseewalker', 'Tennessee Walker', 'riding', [1, 1, 1, 1], 2],
    ['thoroughbred', 'Thoroughbred', 'race', [1, 1, 3, 3], 3],
    ['turkoman', 'Turkoman', 'race', [1, 1, 3, 3], 3]
  ];
  var HORSE_MODELS = ('a_c_horse_americanpaint_greyovero a_c_horse_americanpaint_overo a_c_horse_americanpaint_splashedwhite a_c_horse_americanpaint_tobiano a_c_horse_americanstandardbred_black a_c_horse_americanstandardbred_buckskin a_c_horse_americanstandardbred_lightbuckskin a_c_horse_americanstandardbred_palominodapple a_c_horse_americanstandardbred_silvertailbuckskin a_c_horse_andalusian_darkbay a_c_horse_andalusian_perlino a_c_horse_andalusian_rosegray a_c_horse_appaloosa_blacksnowflake a_c_horse_appaloosa_blanket a_c_horse_appaloosa_brownleopard a_c_horse_appaloosa_fewspotted_pc a_c_horse_appaloosa_leopard a_c_horse_appaloosa_leopardblanket a_c_horse_arabian_black a_c_horse_arabian_grey a_c_horse_arabian_redchestnut a_c_horse_arabian_redchestnut_pc a_c_horse_arabian_rosegreybay a_c_horse_arabian_warpedbrindle_pc a_c_horse_arabian_white a_c_horse_ardennes_bayroan a_c_horse_ardennes_irongreyroan a_c_horse_ardennes_strawberryroan a_c_horse_belgian_blondchestnut a_c_horse_belgian_mealychestnut a_c_horse_breton_grullodun a_c_horse_breton_mealydapplebay a_c_horse_breton_redroan a_c_horse_breton_sealbrown a_c_horse_breton_sorrel a_c_horse_breton_steelgrey a_c_horse_criollo_baybrindle a_c_horse_criollo_bayframeovero a_c_horse_criollo_blueroanovero a_c_horse_criollo_dun a_c_horse_criollo_marblesabino a_c_horse_criollo_sorrelovero a_c_horse_dutchwarmblood_chocolateroan a_c_horse_dutchwarmblood_sealbrown a_c_horse_dutchwarmblood_sootybuckskin a_c_horse_gypsycob_palominoblagdon a_c_horse_gypsycob_piebald a_c_horse_gypsycob_skewbald a_c_horse_gypsycob_splashedbay a_c_horse_gypsycob_splashedpiebald a_c_horse_gypsycob_whiteblagdon a_c_horse_hungarianhalfbred_darkdapplegrey a_c_horse_hungarianhalfbred_flaxenchestnut a_c_horse_hungarianhalfbred_liverchestnut a_c_horse_hungarianhalfbred_piebaldtobiano a_c_horse_kentuckysaddle_black a_c_horse_kentuckysaddle_buttermilkbuckskin_pc a_c_horse_kentuckysaddle_chestnutpinto a_c_horse_kentuckysaddle_grey a_c_horse_kentuckysaddle_silverbay a_c_horse_kladruber_black a_c_horse_kladruber_cremello a_c_horse_kladruber_dapplerosegrey a_c_horse_kladruber_grey a_c_horse_kladruber_silver a_c_horse_kladruber_white a_c_horse_missourifoxtrotter_amberchampagne a_c_horse_missourifoxtrotter_blacktovero a_c_horse_missourifoxtrotter_blueroan a_c_horse_missourifoxtrotter_buckskinbrindle a_c_horse_missourifoxtrotter_dapplegrey a_c_horse_missourifoxtrotter_sablechampagne a_c_horse_missourifoxtrotter_silverdapplepinto a_c_horse_morgan_bay a_c_horse_morgan_bayroan a_c_horse_morgan_flaxenchestnut a_c_horse_morgan_liverchestnut_pc a_c_horse_morgan_palomino a_c_horse_mustang_blackovero a_c_horse_mustang_buckskin a_c_horse_mustang_chestnuttovero a_c_horse_mustang_goldendun a_c_horse_mustang_grullodun a_c_horse_mustang_reddunovero a_c_horse_mustang_tigerstripedbay a_c_horse_mustang_wildbay a_c_horse_nokota_blueroan a_c_horse_nokota_reversedappleroan a_c_horse_nokota_whiteroan a_c_horse_norfolkroadster_black a_c_horse_norfolkroadster_dappledbuckskin a_c_horse_norfolkroadster_piebaldroan a_c_horse_norfolkroadster_rosegrey a_c_horse_norfolkroadster_speckledgrey a_c_horse_norfolkroadster_spottedtricolor a_c_horse_shire_darkbay a_c_horse_shire_lightgrey a_c_horse_shire_ravenblack a_c_horse_suffolkpunch_redchestnut a_c_horse_suffolkpunch_sorrel a_c_horse_tennesseewalker_blackrabicano a_c_horse_tennesseewalker_chestnut a_c_horse_tennesseewalker_dapplebay a_c_horse_tennesseewalker_flaxenroan a_c_horse_tennesseewalker_goldpalomino_pc a_c_horse_tennesseewalker_mahoganybay a_c_horse_tennesseewalker_redroan a_c_horse_thoroughbred_blackchestnut a_c_horse_thoroughbred_bloodbay a_c_horse_thoroughbred_brindle a_c_horse_thoroughbred_dapplegrey a_c_horse_thoroughbred_reversedappleblack a_c_horse_turkoman_black a_c_horse_turkoman_chestnut a_c_horse_turkoman_darkbay a_c_horse_turkoman_gold a_c_horse_turkoman_grey a_c_horse_turkoman_perlino a_c_horse_turkoman_silver').split(' ');

  var COAT_WORDS = ('reversed dappled dapple splashed spotted speckled striped few light dark mealy sooty silvertail silver gold golden rose blond flaxen liver blood red raven iron steel strawberry chocolate buttermilk tiger wild white black grey gray blue brown amber sable mahogany seal perlino cremello palomino buckskin chestnut sorrel bay roan dun grullo overo tovero tobiano sabino frame marble rabicano blagdon piebald skewbald pinto brindle leopard blanket snowflake champagne tricolor warped').split(' ');
  function coatName(s) {
    var out = [], i = 0;
    s = s.replace(/_pc$/, '');
    while (i < s.length) {
      var hit = null;
      for (var k = 0; k < COAT_WORDS.length; k++) {
        var w = COAT_WORDS[k];
        if (s.substr(i, w.length) === w && (!hit || w.length > hit.length)) hit = w;
      }
      if (!hit) { out.push(s.slice(i)); break; }
      out.push(hit); i += hit.length;
    }
    return out.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }

  var HORSES = HORSE_BREEDS.map(function (b) {
    var prefix = 'a_c_horse_' + b[0] + '_';
    var coats = HORSE_MODELS.filter(function (m) { return m.indexOf(prefix) === 0; })
      .map(function (m) { return { id: m, name: coatName(m.slice(prefix.length)) + (/_pc$/.test(m) ? ' ✦' : '') }; });
    var t = b[2] ? HT[b[2]] : null;
    return { id: b[0], name: b[1], wiki: b[1], type: t ? t[0] : null, handling: t ? t[1] : null,
      r: b[3], hand: b[4], coats: coats };
  });
  // Special horses (story / gang)
  HORSES.push({ id: 'gang', name: 'Çete ve hikâye atları', wiki: null, type: null, handling: null, r: null, hand: null,
    coats: [['a_c_horse_gang_dutch', "Dutch'ın atı (The Count)"], ['a_c_horse_gang_john', "John'un atı (Old Boy)"],
      ['a_c_horse_john_endlesssummer', 'John · Rachel'], ['a_c_horse_gang_charles', "Charles'ın atı (Taima)"],
      ['a_c_horse_gang_sadie', "Sadie'nin atı"], ['a_c_horse_gang_micah', "Micah'nın atı (Baylock)"],
      ['a_c_horse_gang_javier', "Javier'in atı (Boaz)"], ['a_c_horse_gang_bill', "Bill'in atı (Bruno)"],
      ['a_c_horse_gang_hosea', "Hosea'nın atı (Silver Dollar)"], ['a_c_horse_gang_lenny', "Lenny'nin atı (Maggie)"],
      ['a_c_horse_gang_kieran', "Kieran'ın atı (Selene)"], ['a_c_horse_gang_sean', "Sean'ın atı (Old Belle)"],
      ['a_c_horse_gang_karen', "Karen'ın atı"], ['a_c_horse_gang_trelawney', "Trelawny'nin atı"],
      ['a_c_horse_gang_uncle', "Uncle'ın atı"], ['a_c_horse_eagleflies', "Eagle Flies'ın atı"],
      ['a_c_horse_buell_warvets', 'Buell (savaş gazisi)'], ['a_c_horse_murfreebrood_mange_01', 'Murfree uyuzlu at'],
      ['a_c_horse_winter02_01', 'Kış atı'], ['a_c_horsemule_01', 'Katır'], ['a_c_horsemulepainted_01', 'Boyalı katır']]
      .map(function (c) { return { id: c[0], name: c[1] }; }) });

  /* ---------------- living things ---------------- */
  var LIFE_CATS = [
    { id: 'predator', label: 'Yırtıcılar', icon: 'hostile' }, { id: 'game', label: 'Av hayvanları', icon: 'target' },
    { id: 'farm', label: 'Çiftlik', icon: 'barn' }, { id: 'dog', label: 'Köpekler', icon: 'dog' },
    { id: 'bird', label: 'Kuşlar', icon: 'bird' }, { id: 'reptile', label: 'Sürüngen ve diğer', icon: 'snake' },
    { id: 'fish', label: 'Balıklar', icon: 'fish' }, { id: 'human', label: 'İnsanlar', icon: 'user' }
  ];
  // [id, Turkish, wiki title, category, icon]
  var LIFE = [
    ['a_c_bear_01', 'Boz ayı', 'Grizzly Bear', 'predator', 'paw'], ['a_c_bearblack_01', 'Kara ayı', 'American Black Bear', 'predator'],
    ['a_c_cougar_01', 'Puma', 'Cougar', 'predator'], ['a_c_panther_01', 'Panter', 'Panther', 'predator'],
    ['a_c_wolf', 'Kurt', 'Gray Wolf', 'predator'], ['a_c_wolf_medium', 'Kurt (orta)', 'Gray Wolf', 'predator'],
    ['a_c_wolf_small', 'Kurt (genç)', 'Gray Wolf', 'predator'], ['a_c_coyote_01', 'Çakal', 'Coyote', 'predator'],
    ['a_c_fox_01', 'Tilki', 'Red Fox', 'predator'], ['a_c_alligator_01', 'Timsah', 'American Alligator', 'predator'],
    ['a_c_alligator_02', 'Timsah (büyük)', 'American Alligator', 'predator'], ['a_c_alligator_03', 'Timsah (küçük)', 'American Alligator', 'predator'],
    ['a_c_lionmangy_01', 'Aslan', 'Lion', 'predator'], ['a_c_sharkhammerhead_01', 'Çekiç başlı köpek balığı', 'Hammerhead Shark', 'predator'],
    ['a_c_sharktiger', 'Kaplan köpek balığı', 'Tiger Shark', 'predator'],
    ['a_c_deer_01', 'Geyik', 'Whitetail Deer', 'game'], ['a_c_buck_01', 'Erkek geyik', 'Whitetail Buck', 'game'],
    ['a_c_elk_01', 'Wapiti', 'Elk', 'game'], ['a_c_moose_01', 'Kanada geyiği', 'Moose', 'game'],
    ['a_c_bighornram_01', 'Koca boynuzlu koç', 'Bighorn Sheep', 'game'], ['a_c_pronghorn_01', 'Çatal boynuz', 'Pronghorn', 'game'],
    ['a_c_buffalo_01', 'Bizon', 'American Bison', 'game'], ['a_c_buffalo_tatanka_01', 'Tatanka bizonu', 'Tatanka Bison', 'game'],
    ['a_c_boar_01', 'Yaban domuzu', 'Wild Boar', 'game'], ['a_c_boarlegendary_01', 'Efsanevi yaban domuzu', 'Legendary Wakpa Boar', 'game'],
    ['a_c_javelina_01', 'Pekari', 'Peccary Pig', 'game'], ['a_c_rabbit_01', 'Tavşan', 'Rabbit', 'game'],
    ['a_c_squirrel_01', 'Sincap', 'Squirrel', 'game'], ['a_c_chipmunk_01', 'Çizgili sincap', 'Chipmunk', 'game'],
    ['a_c_raccoon_01', 'Rakun', 'Raccoon', 'game'], ['a_c_possum_01', 'Opossum', 'Opossum', 'game'],
    ['a_c_skunk_01', 'Kokarca', 'Skunk', 'game'], ['a_c_badger_01', 'Porsuk', 'American Badger', 'game'],
    ['a_c_beaver_01', 'Kunduz', 'Beaver', 'game'], ['a_c_muskrat_01', 'Misk sıçanı', 'Muskrat', 'game'],
    ['a_c_armadillo_01', 'Armadillo', 'Armadillo', 'game'], ['a_c_rat_01', 'Sıçan', 'Rat', 'game'],
    ['a_c_bat_01', 'Yarasa', 'Bat', 'game'],
    ['a_c_cow', 'İnek', 'Cow', 'farm'], ['a_c_bull_01', 'Boğa', 'Bull', 'farm'], ['a_c_ox_01', 'Öküz', 'Ox', 'farm'],
    ['a_c_pig_01', 'Domuz', 'Pig', 'farm'], ['a_c_sheep_01', 'Koyun', 'Sheep', 'farm'], ['a_c_goat_01', 'Keçi', 'Goat', 'farm'],
    ['a_c_chicken_01', 'Tavuk', 'Chicken', 'farm'], ['a_c_rooster_01', 'Horoz', 'Rooster', 'farm'],
    ['a_c_turkey_01', 'Hindi', 'Turkey', 'farm'], ['a_c_donkey_01', 'Eşek', 'Donkey', 'farm'], ['a_c_cat_01', 'Kedi', 'Cat', 'farm'],
    ['a_c_dogamericanfoxhound_01', 'American Foxhound', 'American Foxhound', 'dog'],
    ['a_c_dogaustraliansheperd_01', 'Avustralya çoban köpeği', 'Australian Shepherd', 'dog'],
    ['a_c_dogbluetickcoonhound_01', 'Bluetick Coonhound', 'Bluetick Coonhound', 'dog'],
    ['a_c_dogcatahoulacur_01', 'Catahoula Cur', 'Catahoula Cur', 'dog'],
    ['a_c_dogchesbayretriever_01', 'Chesapeake Bay Retriever', 'Chesapeake Bay Retriever', 'dog'],
    ['a_c_dogcollie_01', 'Collie', 'Collie', 'dog'], ['a_c_doghobo_01', 'Sokak köpeği (serseri)', 'Dog', 'dog'],
    ['a_c_doghound_01', 'Tazı', 'Hound', 'dog'], ['a_c_doghusky_01', 'Husky', 'Husky', 'dog'],
    ['a_c_doglab_01', 'Labrador', 'Labrador Retriever', 'dog'], ['a_c_doglion_01', 'Aslan köpek', 'Dog', 'dog'],
    ['a_c_dogpoodle_01', 'Kaniş', 'Poodle', 'dog'], ['a_c_dogrufus_01', 'Rufus (Arthur\'ın köpeği)', 'Rufus', 'dog'],
    ['a_c_dogstreet_01', 'Sokak köpeği', 'Dog', 'dog'],
    ['a_c_eagle_01', 'Kartal', 'Bald Eagle', 'bird'], ['a_c_hawk_01', 'Şahin', 'Red-tailed Hawk', 'bird'],
    ['a_c_owl_01', 'Baykuş', 'Owl', 'bird'], ['a_c_vulture_01', 'Akbaba', 'Vulture', 'bird'],
    ['a_c_californiacondor_01', 'Kaliforniya kondoru', 'California Condor', 'bird'], ['a_c_crow_01', 'Karga', 'American Crow', 'bird'],
    ['a_c_raven_01', 'Kuzgun', 'Raven', 'bird'], ['a_c_pigeon', 'Güvercin', 'Rock Pigeon', 'bird'],
    ['a_c_seagull_01', 'Martı', 'Seagull', 'bird'], ['a_c_pelican_01', 'Pelikan', 'Pelican', 'bird'],
    ['a_c_heron_01', 'Balıkçıl', 'Heron', 'bird'], ['a_c_egret_01', 'Ak balıkçıl', 'Egret', 'bird'],
    ['a_c_cranewhooping_01', 'Turna', 'Whooping Crane', 'bird'], ['a_c_roseatespoonbill_01', 'Pembe kaşıkçı', 'Roseate Spoonbill', 'bird'],
    ['a_c_cormorant_01', 'Karabatak', 'Cormorant', 'bird'], ['a_c_loon_01', 'Dalgıç kuşu', 'Loon', 'bird'],
    ['a_c_duck_01', 'Ördek', 'Duck', 'bird'], ['a_c_goosecanada_01', 'Kanada kazı', 'Canada Goose', 'bird'],
    ['a_c_pheasant_01', 'Sülün', 'Pheasant', 'bird'], ['a_c_prairiechicken_01', 'Çayır tavuğu', 'Prairie Chicken', 'bird'],
    ['a_c_quail_01', 'Bıldırcın', 'Quail', 'bird'], ['a_c_turkeywild_01', 'Yaban hindisi', 'Wild Turkey', 'bird'],
    ['a_c_parrot_01', 'Papağan', 'Parrot', 'bird'], ['a_c_carolinaparakeet_01', 'Karolina papağanı', 'Carolina Parakeet', 'bird'],
    ['a_c_cardinal_01', 'Kardinal', 'Cardinal', 'bird'], ['a_c_bluejay_01', 'Mavi alakarga', 'Blue Jay', 'bird'],
    ['a_c_robin_01', 'Kızılgerdan', 'Robin', 'bird'], ['a_c_oriole_01', 'Sarıasma', 'Oriole', 'bird'],
    ['a_c_cedarwaxwing_01', 'İpekkuyruk', 'Cedar Waxwing', 'bird'], ['a_c_songbird_01', 'Ötücü kuş', 'Songbird', 'bird'],
    ['a_c_sparrow_01', 'Serçe', 'Sparrow', 'bird'], ['a_c_woodpecker_01', 'Ağaçkakan', 'Woodpecker', 'bird'],
    ['a_c_redfootedbooby_01', 'Kırmızı ayaklı sümsük', 'Red-footed Booby', 'bird'],
    ['a_c_snake_01', 'Çıngıraklı yılan', 'Rattlesnake', 'reptile'], ['a_c_snakeblacktailrattle_01', 'Kara kuyruklu çıngıraklı', 'Black-tailed Rattlesnake', 'reptile'],
    ['a_c_snakeferdelance_01', 'Fer-de-lance', 'Fer-de-Lance Snake', 'reptile'], ['a_c_snakeredboa_01', 'Kırmızı boa', 'Boa', 'reptile'],
    ['a_c_snakeredboa10ft_01', 'Kırmızı boa (3 m)', 'Boa', 'reptile'], ['a_c_snakewater_01', 'Su yılanı', 'Water Snake', 'reptile'],
    ['a_c_iguana_01', 'İguana', 'Iguana', 'reptile'], ['a_c_iguanadesert_01', 'Çöl iguanası', 'Desert Iguana', 'reptile'],
    ['a_c_gilamonster_01', 'Gila canavarı', 'Gila Monster', 'reptile'], ['a_c_turtlesea_01', 'Deniz kaplumbağası', 'Sea Turtle', 'reptile'],
    ['a_c_turtlesnapping_01', 'Kapan kaplumbağa', 'Snapping Turtle', 'reptile'], ['a_c_frogbull_01', 'Boğa kurbağası', 'Bullfrog', 'reptile'],
    ['a_c_toad_01', 'Karakurbağası', 'Toad', 'reptile'], ['a_c_crab_01', 'Yengeç', 'Crab', 'reptile'], ['a_c_crawfish_01', 'Kerevit', 'Crawfish', 'reptile'],
    ['a_c_fishbluegil_01_ms', 'Güneş balığı', 'Bluegill', 'fish'], ['a_c_fishbullheadcat_01_ms', 'Kedi balığı (bullhead)', 'Bullhead Catfish', 'fish'],
    ['a_c_fishchainpickerel_01_ms', 'Zincirli turna', 'Chain Pickerel', 'fish'], ['a_c_fishchannelcatfish_01_lg', 'Kanal kedi balığı', 'Channel Catfish', 'fish'],
    ['a_c_fishlakesturgeon_01_lg', 'Mersin balığı', 'Lake Sturgeon', 'fish'], ['a_c_fishlargemouthbass_01_lg', 'Büyük ağızlı levrek', 'Largemouth Bass', 'fish'],
    ['a_c_fishlongnosegar_01_lg', 'Uzun burunlu gar', 'Longnose Gar', 'fish'], ['a_c_fishmuskie_01_lg', 'Muskie', 'Muskie', 'fish'],
    ['a_c_fishnorthernpike_01_lg', 'Turna balığı', 'Northern Pike', 'fish'], ['a_c_fishperch_01_ms', 'Tatlı su levreği', 'Perch', 'fish'],
    ['a_c_fishrainbowtrout_01_lg', 'Gökkuşağı alabalığı', 'Rainbow Trout', 'fish'], ['a_c_fishrockbass_01_ms', 'Kaya levreği', 'Rock Bass', 'fish'],
    ['a_c_fishsalmonsockeye_01_lg', 'Kırmızı somon', 'Sockeye Salmon', 'fish'], ['a_c_fishsmallmouthbass_01_lg', 'Küçük ağızlı levrek', 'Smallmouth Bass', 'fish'],
    ['s_m_m_valdeputy_01', 'Şerif yardımcısı', null, 'human', 'sheriff'], ['s_m_m_ambientlawrural_01', 'Kırsal kanun adamı', null, 'human', 'sheriff'],
    ['s_m_m_marshallsrural_01', 'Federal şerif', null, 'human', 'sheriff'], ['s_m_m_pinlaw_01', 'Pinkerton ajanı', null, 'human', 'detective'],
    ['s_m_y_army_01', 'Asker', null, 'human', 'soldier'], ['g_m_m_bountyhunters_01', 'Ödül avcısı', null, 'human', 'outlaw'],
    ['a_m_m_valtownfolk_01', 'Kasabalı (Valentine)', null, 'human', 'user'], ['a_f_m_valtownfolk_01', 'Kasabalı kadın', null, 'human', 'user'],
    ['a_m_m_rhdtownfolk_01', 'Kasabalı (Rhodes)', null, 'human', 'user'], ['a_m_m_blwtownfolk_01', 'Kasabalı (Blackwater)', null, 'human', 'user'],
    ['male_skeleton', 'İskelet', null, 'human', 'skull'], ['female_skeleton', 'İskelet (kadın)', null, 'human', 'skull'],
    ['cs_vampire', 'Vampir (Saint Denis)', 'Vampire', 'human', 'ghost']
  ].map(function (a) { return { id: a[0], name: a[1], wiki: a[2], cat: a[3], icon: a[4] || null }; });

  var LIFE_ICONS = { predator: 'hostile', game: 'rabbit', farm: 'barn', dog: 'dog', bird: 'bird', reptile: 'snake', fish: 'fish', human: 'user' };
  LIFE.forEach(function (x) { if (!x.icon || x.icon === 'paw') x.icon = LIFE_ICONS[x.cat]; });

  /* ---------------- vehicles ---------------- */
  var VEHICLES = [
    ['StageCoach001X', 'Posta arabası', 'wagon'], ['StageCoach004X', 'Posta arabası (lüks)', 'wagon'], ['Coach2', 'Fayton', 'wagon'],
    ['Coach3', 'Kapalı fayton', 'wagon'], ['Coach4', 'Fayton (açık)', 'wagon'], ['Coach5', 'Fayton (iş)', 'wagon'], ['Coach6', 'Fayton (yük)', 'wagon'],
    ['Buggy01', 'Hafif fayton (buggy)', 'wagon'], ['Buggy02', 'Buggy (tenteli)', 'wagon'], ['Buggy03', 'Buggy (lüks)', 'wagon'],
    ['Cart01', 'Yük arabası', 'wagon'], ['Cart03', 'Çiftlik arabası', 'wagon'], ['Cart06', 'Saman arabası', 'wagon'],
    ['Wagon02X', 'Yük vagonu', 'wagon'], ['Wagon04X', 'Kapalı vagon', 'wagon'], ['Wagon05X', 'Ağır vagon', 'wagon'], ['Wagon06X', 'Göçmen vagonu', 'wagon'],
    ['WagonTraveller01X', 'Seyyah arabası', 'wagon'], ['WagonDoc01X', 'Doktor arabası', 'wagon'], ['WagonWork01X', 'İş arabası', 'wagon'],
    ['WagonDairy01X', 'Süt arabası', 'wagon'], ['WagonCircus01X', 'Sirk arabası', 'wagon'], ['WagonPrison01X', 'Mahkûm arabası', 'wagon'],
    ['ChuckWagon000X', 'Seyyar mutfak', 'wagon'], ['SupplyWagon', 'Erzak arabası', 'wagon'], ['ArmySupplyWagon', 'Ordu erzak arabası', 'wagon'],
    ['LogWagon', 'Kütük arabası', 'wagon'], ['CoalWagon', 'Kömür arabası', 'wagon'], ['PoliceWagon01X', 'Polis arabası', 'wagon'],
    ['PoliceWagonGatling01X', 'Gatling\'li polis arabası', 'wagon'], ['Gatchuck', 'Gatling\'li seyyar mutfak', 'wagon'], ['Utilliwag', 'Çok amaçlı araba', 'wagon'],
    ['Canoe', 'Kano', 'boat'], ['CanoeTreeTrunk', 'Kütük kano', 'boat'], ['Pirogue', 'Piroge', 'boat'], ['RowBoat', 'Sandal', 'boat'],
    ['RowBoatSwamp', 'Bataklık sandalı', 'boat'], ['Skiff', 'Kayık', 'boat'], ['Keelboat', 'Omurgalı tekne', 'boat'],
    ['BoatSteam02X', 'Buharlı tekne', 'boat'], ['TugBoat2', 'Römorkör', 'boat'], ['HorseBoat', 'At teknesi', 'boat'],
    ['HotAirBalloon01', 'Sıcak hava balonu', 'other'], ['GatlingGun', 'Gatling silahı', 'other'], ['GatlingMaxim02', 'Maxim makineli', 'other'],
    ['HotchkissCannon', 'Hotchkiss topu', 'other'], ['BreachCannon', 'Kuşatma topu', 'other'], ['HandCart', 'El drezini', 'other']
  ].map(function (a) { return { id: a[0], name: a[1], cat: a[2] }; });

  /* ---------------- characters ---------------- */
  var MODELS = [
    ['player_zero', 'Arthur Morgan'], ['player_three', 'John Marston'], ['cs_dutch', 'Dutch van der Linde'], ['cs_micahbell', 'Micah Bell'],
    ['cs_hoseamatthews', 'Hosea Matthews'], ['cs_javierescuella', 'Javier Escuella'], ['cs_charlessmith', 'Charles Smith'],
    ['cs_mrsadler', 'Sadie Adler'], ['cs_billwilliamson', 'Bill Williamson'], ['cs_lenny', 'Lenny Summers'], ['cs_kieran', 'Kieran Duffy'],
    ['cs_sean', 'Sean MacGuire'], ['cs_uncle', 'Uncle'], ['cs_josiahtrelawny', 'Josiah Trelawny'], ['cs_leostrauss', 'Leopold Strauss'],
    ['cs_mrpearson', 'Simon Pearson'], ['cs_abigailroberts', 'Abigail Roberts'], ['cs_jackmarston', 'Jack Marston'], ['cs_tilly', 'Tilly Jackson'],
    ['cs_karen', 'Karen Jones'], ['cs_marybeth', 'Mary-Beth Gaskill'], ['cs_mollyoshea', "Molly O'Shea"], ['cs_susangrimshaw', 'Susan Grimshaw'],
    ['cs_eagleflies', 'Eagle Flies'], ['cs_rainsfall', 'Rains Fall'], ['cs_leviticuscornwall', 'Leviticus Cornwall'], ['cs_angusgeddes', 'Angus Geddes'],
    ['cs_bronte', 'Angelo Bronte'], ['cs_guidomartelli', 'Guido Martelli'], ['cs_sheriffowens', 'Şerif Owens'], ['cs_valsheriff', 'Şerif Malloy'],
    ['cs_princessisabeau', 'Prenses Isabeau'], ['cs_vampire', 'Vampir'], ['s_m_m_valdeputy_01', 'Şerif yardımcısı'],
    ['s_m_y_army_01', 'Asker'], ['a_m_m_valtownfolk_01', 'Kasabalı'], ['male_skeleton', 'İskelet'],
    ['a_c_bear_01', 'Ayı'], ['a_c_wolf', 'Kurt'], ['a_c_cougar_01', 'Puma'], ['a_c_deer_01', 'Geyik'], ['a_c_eagle_01', 'Kartal'], ['a_c_doghusky_01', 'Husky']
  ].map(function (a) { return { id: a[0], name: a[1], icon: a[0].indexOf('a_c_') === 0 ? 'paw' : 'user' }; });
  MODELS.forEach(function (m) { if (m.icon === 'paw') m.icon = 'dog'; });

  /* ---------------- places ---------------- */
  var PLACES = [
    ['Valentine', -281, 793, 'New Hanover · kalabalık kasaba'], ['Saint Denis', 2635, -1225, 'Lemoyne · en büyük şehir'],
    ['Rhodes', 1225, -1300, 'Lemoyne · Scarlett Meadows'], ['Blackwater', -813, -1324, 'West Elizabeth'],
    ['Strawberry', -1791, -386, 'Big Valley · dağ kasabası'], ['Annesburg', 2935, 1300, 'Roanoke Ridge · maden kasabası'],
    ['Van Horn', 2985, 565, 'Roanoke Ridge · liman'], ['Emerald Ranch', 1420, 315, 'Heartlands'],
    ['Armadillo', -3685, -2620, 'New Austin · çöl'], ['Tumbleweed', -5512, -2937, 'New Austin · çöl']
  ].map(function (p) { return { name: p[0], x: p[1], y: p[2], sub: p[3] }; });

  var WEATHER = [
    ['SUNNY', 'Güneşli', 'sun'], ['HIGHPRESSURE', 'Açık', 'sun'], ['CLOUDS', 'Bulutlu', 'cloud'], ['OVERCAST', 'Kapalı', 'cloud'],
    ['OVERCASTDARK', 'Karanlık kapalı', 'cloud'], ['MISTY', 'Puslu', 'fog'], ['FOG', 'Sisli', 'fog'], ['DRIZZLE', 'Çisenti', 'rain'],
    ['SHOWER', 'Sağanak', 'rain'], ['RAIN', 'Yağmurlu', 'rain'], ['THUNDER', 'Gök gürültülü', 'storm'], ['THUNDERSTORM', 'Fırtına', 'storm'],
    ['HURRICANE', 'Kasırga', 'wind'], ['HAIL', 'Dolu', 'snow'], ['SLEET', 'Sulu kar', 'snow'], ['SNOWLIGHT', 'Hafif kar', 'snow'],
    ['SNOW', 'Karlı', 'snow'], ['SNOWCLEARING', 'Kar dinmesi', 'snow'], ['BLIZZARD', 'Tipi', 'snow'], ['GROUNDBLIZZARD', 'Yer tipisi', 'snow'],
    ['WHITEOUT', 'Beyaz karanlık', 'snow'], ['SANDSTORM', 'Kum fırtınası', 'wind']
  ].map(function (w) { return { id: w[0], name: w[1], icon: w[2] }; });

  window.TRAINER_CATALOG = {
    weapons: WEAPONS, weaponCats: WEAPON_CATS, ammo: AMMO, horses: HORSES, life: LIFE, lifeCats: LIFE_CATS,
    vehicles: VEHICLES, models: MODELS, places: PLACES, weather: WEATHER
  };
})();
