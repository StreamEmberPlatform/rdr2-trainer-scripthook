# Değişiklik günlüğü

Sürümler `VERSION` (major.minor) + commit sayısı (patch) ile otomatik verilir; her `main` push'u bir sürümdür.
Burada yalnız kayda değer değişiklikler tutulur.

## 1.1
- **Büyük overlay menüsü** (F5): MHud menü kabuğu; fare ve klavyeyle (ok tuşlarıyla bölge içi gezinme, Q/E sekme).
  Sol üstteki klasik liste RDR2 trainer'ında kullanılmıyor. `Trainer.ini` → `MenuMouse`.
- Silahlar: wiki tablosundaki bütün silahlar, fırlatılanlar, yakın dövüş, ekipman ve her mermi/ok türü; tablo değerlerinden
  puan (S-D), önizlemede istatistikler, wiki görselleri (yedek: MHud ikonları).
- **Düzeltme:** silah zaten varken "ver" mermi eklemiyordu; dinamit/molotof sayısı artmıyordu. Mermi artık türüne göre
  ekleniyor, kapasite sınırı kaldırılabiliyor; sınırsız mermi, şarjör bitmesin.
- **Düzeltme:** arananlık temizleme çalışmıyordu (yalnız `CLEAR_PLAYER_WANTED_LEVEL`). Ödül, skor, olay, geçmiş suçlar
  ve takip temizleniyor; çatışan kanun adamları geri çekiliyor. Yeni: asla aranma.
- Oyuncu: altın çekirdekler, sınırsız dayanıklılık / Dead Eye, herkes görmezden gelsin, görünmezlik, ragdoll kapalı,
  süper zıplama, sessiz, hasar çarpanı, hareket hızı, temizlen, rastgele kıyafet.
- Atlar: 24 cins ve bütün renkleri + çete atları, wiki tür değerlerinden puan, atı doldur/temizle/bağ/sil, ölümsüz at.
- Canlılar (hayvanlar, köpekler, kuşlar, balıklar, insanlar; davranış ve adet), araçlar, karakterler, kayıtlı konumlar.
- **Dünya temizliği:** oyunun yüklediği bütün insanları, kanun adamlarını, hayvanları, atları, araçları, trenleri ve
  objeleri silme ya da öldürme (yalnız trainer'ın oluşturdukları değil); kareler arası parti, alan, görev varlıklarını
  koruma, sürekli temiz tutma, canlı sayaçlar. Nüfus yoğunluğu, saat/hava, saati dondurma, ağır çekim.

## 1.0
- Oyun açılırken pencerenin görüntüsüz (saydam) kalması: 1.0.1'deki iki davranış geri alındı. Varlıklar yeniden
  `World.GetAllPeds/GetAllVehicles` + mesafe ile (itemset sorgusu yok); ekran karardığında trainer süre sınırı
  olmadan bekler. Sayfa ilk kez oyuncu dünyadayken açılır. Önceki oturumun logu `Trainer.previous.log`.
- İlk sürüm: trainer ui-runtime'dan ayrıldı (`StreamEmber.Trainer.RDR2.dll`). Arayüz oyuna kurulmuyor; GitHub Pages'te
  yayınlanıyor, MHud kiti jsDelivr'den (`@streamemberplatform/mhud@1.3.0`). `Trainer.ini`: `UiUrl`, `MenuKey`.
- Tick'in her parçası ayrı korunuyor, her varlık ayrı okunuyor; hatalar `StreamEmber\Logs\Trainer.log`'a.
