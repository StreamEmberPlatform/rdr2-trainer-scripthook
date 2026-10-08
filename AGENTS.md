# rdr2-trainer-scripthook (StreamEmber Trainer, RDR2) — ajan notları

Önce `README.md` okunur.

- Trainer bir StreamEmber Runtime scriptidir; overlay'e yalnız `StreamEmber.Overlay.Bridge` üzerinden konuşur. Sayfa
  `web/` içindedir ve GitHub Pages'te yayınlanır; oyuna kurulan pakete HTML/JS konmaz.
- `src/Common/` gtav-trainer-scripthook ve rdr2-trainer-scripthook'ta **aynı** tutulur. `web/trainer.js`/`trainer.css`
  de iki repoda aynıdır (aynı sayfa ve protokol).
- Tick'te çalışan her yeni parça `Guard.Run` ile sarılır; Tick'ten exception dışarı çıkmaz. Varlık başına okuma
  try/catch içindedir; bir varlık yalnız kendisini düşürür.
- Native'ler yalnız scriptin Tick/KeyDown thread'inden çağrılır (Task.Run/timer yok). Varlık handle'ları kareler
  arasında yalnız kimlik olarak tutulur; her kare yeniden sorgulanır.
- RDR2'de varlıklar `World.GetNearbyPeds/Vehicles` ile alınır; `World.GetAll*` her kare çağrılmaz.
- Kullanıcıya görünen metinler Türkçe; kod, tanımlayıcılar ve kod yorumları İngilizce.
- Paket: `StreamEmber\Scripts\StreamEmber.Trainer.<OYUN>.dll`, `StreamEmber\Config\Trainer.ini`, manifest. Başvuru
  DLL'leri (Scripting, Bridge) pakete girmez (CI kontrol eder). `tools/StreamEmber.Build.psm1` tüm StreamEmber
  repolarında aynı dosyadır.
