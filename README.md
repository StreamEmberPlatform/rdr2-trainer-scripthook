# StreamEmber Trainer (RDR2)

RDR2 için StreamEmber trainer'ı: StreamEmber Runtime üzerinde çalışan bir script (`StreamEmber.Trainer.RDR2.dll`) ve
StreamEmber Overlay'de açılan MHud arayüzü. Arayüz oyuna kurulmaz: bu reponun `web/` klasörü GitHub Pages'te yayınlanır
(**https://streamemberplatform.github.io/rdr2-trainer-scripthook/**), MHud kiti jsDelivr CDN'inden gelir
(`@streamemberplatform/mhud@1.3.0`). Trainer açılınca overlay'e bu sayfayı yükletir; CEF önbelleği sayesinde her oyunda
yeniden indirilmez.

```text
RDR2.exe
 ├─ StreamEmber.Runtime.RDR2.asi ─► StreamEmber\Scripts\StreamEmber.Trainer.RDR2.dll   (bu repo, src/)
 │                                     │ OverlayBridge.LoadUrl(sayfa) · Send/TryReceive (MHud mesajları)
 └─ StreamEmber.Overlay.RDR2.asi  ─► StreamEmber\Overlay\ (CEF) ─► https://streamemberplatform.github.io/rdr2-trainer-scripthook/
                                                                 └─ kit: cdn.jsdelivr.net/npm/@streamemberplatform/mhud
```

## Oyun klasöründeki düzen

| Dosya | Görev |
|---|---|
| `StreamEmber\Scripts\StreamEmber.Trainer.RDR2.dll` | Trainer scripti |
| `StreamEmber\Config\Trainer.ini` | `UiUrl` (boş = yayınlanan sayfa), `MenuKey` (F5). Güncellemede korunur |
| `StreamEmber\Logs\Trainer.log` | Trainer logu (her oyun oturumunda yeniden başlar, öncekisi `Trainer.previous.log`; hatalar sınırlı sayıda yazılır) |
| `StreamEmber\Manifests\StreamEmber.Trainer.RDR2.json` | Paket manifest'i: sürüm, commit, bağımlılıklar (`builtAgainst`), dosyalar ve SHA-256 değerleri |

Gereken: RDR2 **DirectX 12** modunda + ScriptHookRDR2 (`dinput8.dll`) + [StreamEmber Runtime (RDR2)](https://github.com/StreamEmberPlatform/rdr2-runtime-scripthook) +
[StreamEmber Overlay](https://github.com/StreamEmberPlatform/ui-runtime) (`StreamEmber.Overlay.RDR2`). Paket bunları içermez.

## Çökmeye karşı

- Tick'in her parçası (mesajlar, trainer, HUD, etiketler, panel) ayrı korunur: bir parça hata verirse yalnız o kare
  atlanır, `Trainer.log`'a yazılır; script durmaz, oyun etkilenmez.
- Dünya etiketlerinde her varlık ayrı okunur: silinmiş ya da garip bir varlık yalnız kendisini düşürür. Etiket içeriği
  ayrı bir JSON yazıcısında hazırlanır; yarım kalan bir varlık sayfaya bozuk mesaj göndermez.
- Overlay yoksa ya da API sürümü uymuyorsa trainer bir kez uyarır ve bekler.

## Arayüz (web/)

`web/index.html`, `app.js`, `app.css`: MHud 1.3.0'ın FiveM/RedM sayfası, **değiştirilmeden** (yalnız kit adresleri CDN'e
çevrildi ve `trainer.css`/`trainer.js` eklendi). `trainer.js` bir adaptördür: `window.streamember` mesajları → FiveM'deki
gibi `window` `message` olayı; `MH.post(ad, veri)` → `streamember.post({ cb, data })`. C# scripti MHud'un Lua tarafıyla
**aynı mesajları** gönderir (`mhud:config`, `mhud:vitals`, `mhud:vehicle`, `mhud:location`, `mhud:heading`, `mhud:wanted`,
`mhud:money`, `mhud:nametags`, `mhud:menu`, `mhud` RPC).

- Arayüz geliştirme: `web/` klasörünü yerelde yayınla (`npx serve web` → http://127.0.0.1:3000/) ve oyunda
  `Trainer.ini` → `UiUrl=http://127.0.0.1:3000/`. Normal bir tarayıcıda da açılır (köprü yoksa önizleme kipi).
- MHud'u güncellemek: yeni sürümün `integration/mhud/html` dosyalarını kopyala, `index.html`'in başındaki dört
  değişikliği koru, CDN adresindeki sürümü değiştir.

## Kullanım

| Tuş | İş |
|---|---|
| F5 | Trainer menüsü (↑ ↓ ← → Enter Backspace ya da numpad 8 2 4 6 5 0). Oyun odağı gerekmez. |
| F7 | Overlay göster/gizle (backend) |
| F8 | Fare+klavye arayüze (backend). Menüye fareyle tıklanabilir. |

Menüler: Işınlanma (11 nokta + harita işareti), Araçlar (ver, hızı koruyarak değiştir, tamir, renk, tam performans,
sil), Oyuncu modeli (11 karakter), Oyuncu (can/zırh, ölümsüzlük, aranma, silah, para), Dünya (saat, hava, kalabalık),
Performans testi, HUD (tema, bildirim vitrini).

**Performans testi:** çevredeki tüm yaya ve araçlara MHud isim etiketi (`mhud:nametags`) her karede gönderilir.

- *Native referans noktaları*: oyun, her etiketin çapasına **aynı karede** kırmızı nokta çizer. Etiketin alt ucu noktada
  durmalı; kamera dönerken aradaki kayma overlay'in gecikmesidir.
- *Kamerayı döndür*: kamerayı 45/90/180°/sn sabit döndürür (elle uğraşmadan senkron testi).
- *Gidiş-dönüş gecikme*: her etiket mesajında `seq` var; sayfa saniyede ~2 örneği hemen onaylar (`ack`), C# ms ve kare
  olarak ölçer. Ayarlar: mesafe 25-400 m, en fazla 25-400 etiket, her kare / 30 Hz / 15 Hz, hedef türü,
  *mesafe yazısı adımı*.
- Panel (sağ orta): oyun FPS, sayfa FPS, etiket sayısı, mesaj/sn, DOM süresi, C# süresi, KB/sn, gecikme.


### RDR2'ye özgü

- Varlıklar `World.GetAllPeds/GetAllVehicles` + mesafe süzgeci ile alınır. Runtime 1.0.9+ havuzları ana script
  fiber'ında okur; uzun oyunda/çok NPC öldükten sonra etiketlerin kaybolması havuzların başka iş parçacığından
  okunmasından kaynaklanıyordu (runtime'da düzeltildi). `World.GetNearby*` (itemset sorgusu) kullanılmaz: 1.0.1'de
  kullanıldı ve oyun açılırken oyun penceresi görüntüsüz kaldı.
- Ölüm, yeniden doğma, yükleme ve ekran kararması sırasında trainer bekler (oyun sahne değiştirirken araya girmez).
  Trainer sayfası da ilk kez ancak oyuncu dünyadayken açılır.
- Atlar/arabalar/kayıklar, kasabalar, karakter modelleri; HUD'da çekirdekler (can/dayanıklılık/dead eye) ve para;
  native referans olarak oyunun 3B çizdiği küreler (RDR2'de `SET_DRAW_ORIGIN` yok).

## Dünyaya bağlı etiketler: atlas

Etiketler HTML ile konumlandırılmaz (tarayıcı 3-6 kare geç kalır): sayfa her etiketi overlay'in atlasındaki sabit bir
slota bir kez çizer, oyun her karede slotların ekrandaki yerini verir (`OverlayBridge.SubmitSprites`), backend aynı
karede çizer. Ayrıntı: [ui-runtime README](https://github.com/StreamEmberPlatform/ui-runtime#dünyaya-bağlı-arayüzde-kare-senkronu-sprite-atlası).

**Kalibrasyon** (trainer → Performans testi): *Native referans noktaları*'nı aç (oyun, en yakın 30 varlığın çapasına
`SET_DRAW_ORIGIN` ile kendisi çizer = gerçek konum), *Kamerayı döndür* 90°/sn. Etiketin alt ucu noktada durmalı.
Etiketler noktaların önünde gidiyorsa *Senkron gecikmesi* = 1 kare; arkasından geliyorsa *Öngörü* = 1 kare.
*Konumlandırma*'yı HTML'e alarak eski yolla farkı görebilirsin.

**Bulgu (headless Chromium, 150 etiket):** yalnız konum değişince güncelleme **~1 ms**; mesafe yazısı her mesajda
değişince **~22 ms** (60 Hz'de karşılanamaz). Sebep: MHud `app.js` etiket imzasına (`sig`) mesafeyi koyuyor, imza
değişince `MH.Nametags` etiketin HTML'ini baştan yazıyor. Trainer mesafeyi varsayılan 5 m adımla yuvarlar
(menüden 1 m seçilerek fark ölçülebilir). Kalıcı çözüm MHud'da: mesafe metnini imzadan çıkarıp yalnız o metni güncellemek.


## Sürümler ve yayın

- Sürüm: `VERSION` dosyası `major.minor`, patch = o dosyanın son değiştiği commit'ten bu yana commit sayısı.
  `main`'e her push yeni bir sürümdür: `v1.0.0`, `v1.0.1`, …
- GitHub Actions (`.github/workflows/build.yml`): her push ve PR'da derleme; `main`'de ayrıca etiket, GitHub Release
  (`StreamEmber.Trainer.RDR2-<sürüm>.zip` + `.sha256`, zip'in kökü = oyun klasörü) ve `web/`'in GitHub Pages'e yayını.
  Bir kez: Settings > Pages > Source = **GitHub Actions**.
- Derleme başvuruları (pakete girmez) kendi repolarımızın son release'inden gelir: `StreamEmber.Scripting.RDR2.dll`
  (rdr2-runtime-scripthook), `StreamEmber.Overlay.Bridge.dll` (ui-runtime). Manifest'teki `builtAgainst` hangi
  sürümlere karşı derlendiğini yazar.

## Derleme

.NET SDK. Yerelde kardeş klasörler kullanılır (ya da `-ReferenceDir`):

```text
StreamEmberPlatform\
  rdr2-trainer-scripthook\      bu repo
  rdr2-runtime-scripthook\      bin\Release\StreamEmber.Scripting.RDR2.dll
  ui-runtime\                  build\managed\StreamEmber.Overlay.Bridge.dll
```

```powershell
.\build.ps1                                        # derle + dist\RDR2\ + artifacts\*.zip + dist\site\ (sayfa önizleme)
.\build.ps1 -Deploy -GamePath "D:\SteamLibrary\steamapps\common\Red Dead Redemption 2"   # + oyuna kur (ya da RDR2_GAME_PATH)
```

`src/Common/` iki trainer reposunda aynıdır (JSON, MHud mesajları, menü, dünya etiketi motoru, korumalı çalışma);
birinde değişen diğerine de kopyalanır.
