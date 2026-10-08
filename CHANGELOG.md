# Değişiklik günlüğü

Sürümler `VERSION` (major.minor) + commit sayısı (patch) ile otomatik verilir; her `main` push'u bir sürümdür.
Burada yalnız kayda değer değişiklikler tutulur.

## 1.0
- Oyun açılırken pencerenin görüntüsüz (saydam) kalması: 1.0.1'deki iki davranış geri alındı. Varlıklar yeniden
  `World.GetAllPeds/GetAllVehicles` + mesafe ile (itemset sorgusu yok); ekran karardığında trainer süre sınırı
  olmadan bekler. Sayfa ilk kez oyuncu dünyadayken açılır. Önceki oturumun logu `Trainer.previous.log`.
- İlk sürüm: trainer ui-runtime'dan ayrıldı (`StreamEmber.Trainer.RDR2.dll`). Arayüz oyuna kurulmuyor; GitHub Pages'te
  yayınlanıyor, MHud kiti jsDelivr'den (`@streamemberplatform/mhud@1.3.0`). `Trainer.ini`: `UiUrl`, `MenuKey`.
- Tick'in her parçası ayrı korunuyor, her varlık ayrı okunuyor; hatalar `StreamEmber\Logs\Trainer.log`'a.
