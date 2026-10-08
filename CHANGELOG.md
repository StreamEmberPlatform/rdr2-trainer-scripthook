# Değişiklik günlüğü

Sürümler `VERSION` (major.minor) + commit sayısı (patch) ile otomatik verilir; her `main` push'u bir sürümdür.
Burada yalnız kayda değer değişiklikler tutulur.

## 1.0
- İlk sürüm: trainer ui-runtime'dan ayrıldı (`StreamEmber.Trainer.RDR2.dll`). Arayüz oyuna kurulmuyor; GitHub Pages'te
  yayınlanıyor, MHud kiti jsDelivr'den (`@streamemberplatform/mhud@1.3.0`). `Trainer.ini`: `UiUrl`, `MenuKey`.
- Tick'in her parçası ayrı korunuyor, her varlık ayrı okunuyor; hatalar `StreamEmber\Logs\Trainer.log`'a.
- Varlıklar `World.GetNearbyPeds/Vehicles` ile: uzun oyunda etiketlerin kaybolması düzeldi; uzun ekran kararması
  trainer'ı durdurmuyor.
