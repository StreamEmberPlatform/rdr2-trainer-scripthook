// RDR2 trainer: the big overlay menu (web/menu/*), its settings and commands, and the per-tick features.
//
// The menu itself lives in the page: catalogs (weapons with the wiki stats and scores, horses, animals, wagons,
// places), layout and navigation. The game side only executes commands ({ cb: "trainer", data: { op, ... } }) and
// reports the real state back (trainer:state, trainer:inventory), so the page never shows a value the game does not have.
// Weapons, horses, animals and wagons are sent by their enum names (eWeapon, eAmmoType, PedHash, VehicleHash): a name
// the runtime does not know is rejected with a toast instead of calling a native with a bad hash.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using RDR2;
using RDR2.Math;
using RDR2.Native;
using StreamEmber.Overlay;

namespace StreamEmber.Trainers
{
    internal sealed class Trainer
    {
        private readonly WorldTags _tags;
        private readonly HudFeed _hud;
        private readonly Arsenal _arsenal = new Arsenal();
        private readonly PlayerFeatures _player = new PlayerFeatures();
        private readonly WorldControl _world = new WorldControl();
        private readonly Spawner _spawner = new Spawner();
        private readonly Settings _settings = new Settings();
        private readonly CommandRouter _commands = new CommandRouter();
        private readonly Stopwatch _clock = Stopwatch.StartNew();
        private long _nextState, _nextCount;
        private bool _switchedInput;

        public float CameraSpinDegreesPerSecond;   // 0 = off
        public bool ShowPerfPanel = true;
        public bool MenuOpen { get; private set; }
        public bool MenuMouse = true;                // open the menu in UI input mode (mouse + keyboard to the page)

        public Trainer(WorldTags tags, HudFeed hud)
        {
            _tags = tags;
            _hud = hud;
            RegisterSettings();
            RegisterCommands();
        }

        // ------------------------------------------------------------------ menu

        public void ToggleMenu()
        {
            if (MenuOpen) CloseMenu(); else OpenMenu();
        }

        public void OpenMenu()
        {
            MenuOpen = true;
            OverlayBridge.Visible = true;
            if (MenuMouse && OverlayBridge.InputMode != OverlayInputMode.Ui)
            {
                OverlayBridge.InputMode = OverlayInputMode.Ui;
                _switchedInput = true;
            }
            SendMenuState();
            _nextState = 0;
            _nextCount = 0;
        }

        public void CloseMenu()
        {
            if (!MenuOpen) return;
            MenuOpen = false;
            if (_switchedInput && OverlayBridge.InputMode == OverlayInputMode.Ui) OverlayBridge.InputMode = OverlayInputMode.Game;
            _switchedInput = false;
            SendMenuState();
        }

        /// <summary>Page loaded (again): tell it whether the menu is open.</summary>
        public void OnPageReady()
        {
            SendMenuState();
            _nextState = 0;
        }

        private void SendMenuState()
        {
            Ui.Begin("trainer:menu").BeginObject()
                .Prop("open", MenuOpen)
                .Prop("mouse", OverlayBridge.InputMode == OverlayInputMode.Ui)
                .Prop("version", TrainerPage.ProductVersion ?? "dev")
                .EndObject();
            Ui.Send();
        }

        public void OnCommand(IDictionary<string, object> data)
        {
            if (data == null) return;
            _commands.Handle(data);
            _nextState = 0;   // show the effect right away
        }

        // ------------------------------------------------------------------ settings

        private void RegisterSettings()
        {
            Settings s = _settings;
            s.Bool("player.god", () => _player.God, v => _player.SetGod(v));
            s.Bool("player.infStamina", () => _player.InfiniteStamina, v => _player.InfiniteStamina = v);
            s.Bool("player.infDeadEye", () => _player.InfiniteDeadEye, v => _player.InfiniteDeadEye = v);
            s.Bool("player.neverWanted", () => _player.NeverWanted, v => _player.NeverWanted = v);
            s.Bool("player.ignored", () => _player.Ignored, v => _player.Ignored = v);
            s.Bool("player.invisible", () => _player.Invisible, v => _player.Invisible = v);
            s.Bool("player.noRagdoll", () => _player.NoRagdoll, v => _player.NoRagdoll = v);
            s.Bool("player.superJump", () => _player.SuperJump, v => _player.SuperJump = v);
            s.Bool("player.silent", () => _player.Silent, v => _player.Silent = v);
            s.Num("player.damage", () => _player.DamageMultiplier, v => _player.DamageMultiplier = Clamp(v, 0.1f, 100f));
            s.Num("player.moveRate", () => _player.MoveRate, v => _player.MoveRate = Clamp(v, 1f, 3f));
            s.Bool("horse.god", () => _player.HorseGod, v => _player.HorseGod = v);
            s.Bool("horse.infStamina", () => _player.HorseInfiniteStamina, v => _player.HorseInfiniteStamina = v);

            s.Bool("weapon.infAmmo", () => _arsenal.InfiniteAmmo, v => _arsenal.InfiniteAmmo = v);
            s.Bool("weapon.infClip", () => _arsenal.InfiniteClip, v => _arsenal.InfiniteClip = v);
            s.Bool("weapon.noCap", () => _arsenal.NoCapacityLimit, v => _arsenal.NoCapacityLimit = v);

            s.Num("world.density.humans", () => _world.HumanDensity, v => _world.HumanDensity = Clamp(v, 0f, 1f));
            s.Num("world.density.animals", () => _world.AnimalDensity, v => _world.AnimalDensity = Clamp(v, 0f, 1f));
            s.Num("world.density.vehicles", () => _world.VehicleDensity, v => _world.VehicleDensity = Clamp(v, 0f, 1f));
            s.Bool("world.noTrains", () => _world.NoTrains, v => _world.NoTrains = v);
            s.Bool("world.freezeTime", () => _world.FreezeTime, v => _world.FreezeTime = v);
            s.Num("world.timeScale", () => _world.TimeScale, v => _world.TimeScale = Clamp(v, 0.05f, 1f));
            s.Num("world.sweepRadius", () => _world.SweepRadius, v => _world.SweepRadius = Clamp(v, 0f, 5000f));
            s.Bool("world.protectMission", () => _world.ProtectMission, v => _world.ProtectMission = v);
            s.Num("world.batch", () => _world.BatchPerFrame, v => _world.BatchPerFrame = (int)Clamp(v, 1f, 500f));
            s.Bool("world.keepClean", () => _world.KeepClean, v => _world.KeepClean = v);
            s.Text("world.keepCleanTarget", () => _world.KeepCleanTarget, v =>
            {
                if (Enum.TryParse(v, out WorldControl.Target _)) _world.KeepCleanTarget = v;
            });

            s.Bool("tags.enabled", () => _tags.Enabled, v =>
            {
                _tags.Enabled = v;
                if (!v) _tags.Clear();
            });
            s.Num("tags.positioning", () => (int)_tags.Positioning, v => _tags.Positioning = v >= 1 ? WorldTags.Mode.Html : WorldTags.Mode.Atlas);
            s.Bool("tags.refs", () => _tags.NativeReferences, v => _tags.NativeReferences = v);
            s.Num("tags.delay", () => OverlayBridge.SpriteDelay, v => OverlayBridge.SpriteDelay = (int)Clamp(v, 0, 2));
            s.Num("tags.predict", () => _tags.PredictFrames, v => _tags.PredictFrames = (int)Clamp(v, 0, 1));
            s.Num("tags.radius", () => _tags.Radius, v => _tags.Radius = Clamp(v, 10f, 400f));
            s.Num("tags.max", () => _tags.MaxCount, v => _tags.MaxCount = (int)Clamp(v, 10, 400));
            s.Num("tags.rate", () => _tags.RateHz, v => _tags.RateHz = (int)Clamp(v, 0, 60));
            s.Num("tags.target", () => (int)_tags.Target, v => _tags.Target = (WorldTags.Filter)(int)Clamp(v, 0, 2));
            s.Num("tags.distStep", () => _tags.DistanceStep, v => _tags.DistanceStep = (int)Clamp(v, 1, 10));
            s.Num("perf.spin", () => CameraSpinDegreesPerSecond, v => CameraSpinDegreesPerSecond = Clamp(v, 0, 360));
            s.Bool("perf.panel", () => ShowPerfPanel, v => ShowPerfPanel = v);

            s.Text("hud.theme", () => _hud.Theme, v =>
            {
                if (Array.IndexOf(new[] { "frontier", "oldwest", "modern", "neon", "tactical", "minimal" }, v) < 0) return;
                _hud.Theme = v;
                _hud.PushConfig();
            });
            s.Bool("hud.hideGame", () => _hud.HideGameHud, v => _hud.HideGameHud = v);
        }

        private static float Clamp(float v, float min, float max) => v < min ? min : v > max ? max : v;

        // ------------------------------------------------------------------ commands

        private void RegisterCommands()
        {
            CommandRouter c = _commands;

            c.On("set", d =>
            {
                object value = null;
                d.TryGetValue("value", out value);
                if (!_settings.Apply(d.Str("key"), value)) TrainerLog.Warn("Unknown setting: " + d.Str("key"));
            });
            c.On("menu.close", _ => CloseMenu());
            c.On("state", _ => _nextState = 0);

            // Player
            c.On("player.fill", _ =>
            {
                PlayerFeatures.FillCores(Me);
                Ui.Toast("success", "Dolduruldu", "Can, dayanıklılık, dead eye", "heart-f");
            });
            c.On("player.gold", _ =>
            {
                PlayerFeatures.GoldCores(Me);
                Ui.Toast("success", "Altın çekirdekler", "Can, dayanıklılık ve dead eye güçlendirildi.", "crown-f");
            });
            c.On("player.clean", _ =>
            {
                PlayerFeatures.Clean(Me);
                Ui.Toast("info", "Temizlendi", "Kan, çamur ve ıslaklık silindi.", "droplet-f");
            });
            c.On("player.clearWanted", _ =>
            {
                Player player = Game.Player;
                int bounty = LAW.GET_BOUNTY(player.Handle);
                int calmed = PlayerFeatures.ClearWanted(player, true);
                bool still = PlayerFeatures.IsWanted(player);
                Ui.Toast(still ? "warn" : "success", "Arananlık temizlendi",
                    "Ödül $" + (bounty / 100) + " → $0" + (calmed > 0 ? " · " + calmed + " kanun adamı geri çekildi" : "") +
                    (still ? " · olay hâlâ aktif, tekrar dene" : ""), "sheriff");
            });
            c.On("player.money", d =>
            {
                int dollars = d.Int("amount");
                if (dollars == 0 || Math.Abs(dollars) > 1000000) return;
                Player player = Game.Player;
                int cents = Math.Max(0, player.Money + dollars * 100);
                player.Money = cents;
                Ui.Toast("success", (dollars > 0 ? "+$" : "-$") + Math.Abs(dollars), "Nakit: $" + (cents / 100), "cash");
            });
            c.On("player.kill", _ => ENTITY.SET_ENTITY_HEALTH(Me.Handle, 0, 0));
            c.On("player.outfit", _ => Native.RandomOutfit(Me));
            c.On("player.model", d =>
            {
                string id = d.Str("id");
                string label = d.Str("label", id);
                if (!Args.TryEnum(id, out PedHash hash)) { Ui.Toast("danger", "Bilinmeyen model", id); return; }
                var model = new Model(hash);
                if (!Spawner.LoadModel(model, label)) return;
                if (!Game.Player.ChangeModel(model)) { Ui.Toast("danger", "Model değiştirilemedi", label); return; }
                Script.Wait(0);
                Native.RandomOutfit(Game.Player.Character);  // without an outfit the new model is invisible
                STREAMING.SET_MODEL_AS_NO_LONGER_NEEDED((uint)hash);
                Ui.Toast("success", "Yeni karakter", label, "user");
            });

            // Weapons
            c.On("weapon.give", d => GiveWeapon(d.Str("id"), d.Str("label"), d.Int("amount", 999), d.Bool("variants"), d.Bool("equip", true), true));
            c.On("weapon.remove", d =>
            {
                if (!Args.TryEnum(d.Str("id"), out eWeapon w)) return;
                _arsenal.Remove(Me, (uint)w);
                Ui.Toast("info", "Silah alındı", d.Str("label", d.Str("id")));
            });
            c.On("weapon.giveAll", d =>
            {
                int given = 0, ammo = 0, invalid = 0;
                foreach (string id in d.Strings("ids"))
                {
                    if (!Args.TryEnum(id, out eWeapon w)) { invalid++; continue; }
                    Arsenal.GiveResult r = _arsenal.Give(Game.Player, Me, (uint)w, d.Int("amount", 999), d.Bool("variants"), false);
                    if (!r.Valid) { invalid++; continue; }
                    if (r.Given) given++;
                    ammo += r.AmmoAdded;
                }
                Ui.Toast("success", "Silahlar", given + " yeni silah · +" + ammo + " mermi" + (invalid > 0 ? " · " + invalid + " geçersiz" : ""), "rifle");
                SendInventory(d.Strings("ids"));
            });
            c.On("weapon.removeAll", _ =>
            {
                Arsenal.RemoveAll(Me);
                Ui.Toast("warn", "Tüm silahlar alındı", null, "x");
            });
            c.On("weapon.clean", _ =>
            {
                bool ok = Arsenal.CleanCurrent(Me);
                Ui.Toast(ok ? "success" : "warn", ok ? "Silah temizlendi" : "Elinde silah yok", ok ? "Kir ve pas sıfırlandı." : null, "tool");
            });
            c.On("weapon.inventory", d => SendInventory(d.Strings("ids")));
            c.On("ammo.give", d =>
            {
                string id = d.Str("id");
                string label = d.Str("label", id);
                if (!Args.TryEnum(id, out eAmmoType a)) { Ui.Toast("danger", "Bilinmeyen mermi", id); return; }
                int added = _arsenal.AddAmmoType(Game.Player, Me, (uint)a, d.Int("amount", 100));
                int total = Arsenal.AmmoByType(Me, (uint)a);
                Ui.Toast(added > 0 ? "success" : "warn", label, added > 0 ? "+" + added + " · toplam " + total : "Kapasite dolu · " + total, "bullets");
                SendInventory(d.Strings("ids"));
            });

            // Horse
            c.On("horse.spawn", d =>
            {
                string id = d.Str("id");
                if (!Args.TryEnum(id, out PedHash h)) { Ui.Toast("danger", "Bilinmeyen at", id); return; }
                _spawner.SpawnHorse(h, d.Str("label", id), d.Bool("mount", true), d.Bool("mine", true));
            });
            c.On("horse.fill", _ => WithHorse(h => { PlayerFeatures.FillHorse(h); Ui.Toast("success", "At dolduruldu", null, "horse"); }));
            c.On("horse.clean", _ => WithHorse(h => { PlayerFeatures.Clean(h); Ui.Toast("info", "At temizlendi", null, "horse"); }));
            c.On("horse.bond", _ => WithHorse(h => { PED._SET_MOUNT_BONDING_LEVEL(h.Handle, 4); Ui.Toast("success", "Bağ seviyesi 4", null, "heart-f"); }));
            c.On("horse.delete", _ => WithHorse(h =>
            {
                if (Me.IsOnMount) TASK.TASK_DISMOUNT_ANIMAL(Me.Handle, 0, 0, 0, 0, 0);
                Script.Wait(0);
                h.Delete();
                Ui.Toast("info", "At silindi");
            }));

            // Animals, people, vehicles
            c.On("animal.spawn", d =>
            {
                string id = d.Str("id");
                if (!Args.TryEnum(id, out PedHash h)) { Ui.Toast("danger", "Bilinmeyen hayvan", id); return; }
                Enum.TryParse(d.Str("mode", "Calm"), true, out Spawner.Behaviour b);
                _spawner.SpawnAnimals(h, d.Str("label", id), d.Int("count", 1), b);
            });
            c.On("vehicle.spawn", d =>
            {
                string id = d.Str("id");
                if (!Args.TryEnum(id, out VehicleHash h)) { Ui.Toast("danger", "Bilinmeyen araç", id); return; }
                _spawner.SpawnVehicle(h, d.Str("label", id), d.Bool("enter", true));
            });
            c.On("vehicle.repair", _ => WithVehicle(v => { v.Repair(); Ui.Toast("success", "Araç tamir edildi"); }));
            c.On("vehicle.delete", _ => WithVehicle(v => { v.Delete(); Ui.Toast("info", "Araç silindi"); }));

            // Travel
            c.On("tp.go", d =>
            {
                float x = d.Float("x"), y = d.Float("y");
                if (Math.Abs(x) > 8000 || Math.Abs(y) > 8000) return;
                bool found = PlayerFeatures.ProbeAndPlace(x, y);
                string label = d.Str("label", "Konum");
                Ui.Toast(found ? "info" : "warn", "Işınlandın", found ? label : label + ": zemin bulunamadı, havadasın.", "pin-f");
            });
            c.On("tp.waypoint", _ =>
            {
                if (!World.IsWaypointActive) { Ui.Toast("warn", "Harita işareti yok", "Önce haritada bir nokta işaretle."); return; }
                Vector3 wp = World.WaypointPosition;
                bool found = PlayerFeatures.ProbeAndPlace(wp.X, wp.Y);
                Ui.Toast(found ? "info" : "warn", "Işınlandın", found ? "Harita işareti" : "Zemin bulunamadı, havadasın.", "pin-f");
            });
            c.On("tp.forward", d =>
            {
                Entity e = PlayerFeatures.MovingEntity(Me);
                e.Position = e.Position + Me.ForwardVector * Clamp(d.Float("m", 10f), 1f, 200f);
            });
            c.On("tp.up", d =>
            {
                Entity e = PlayerFeatures.MovingEntity(Me);
                e.Position = e.Position + new Vector3(0, 0, Clamp(d.Float("m", 50f), 1f, 1000f));
            });
            c.On("tp.save", d =>
            {
                _player.Save(d.Int("slot"), PlayerFeatures.MovingEntity(Me).Position);
                Ui.Toast("info", "Konum kaydedildi", "Yuva " + (d.Int("slot") + 1), "pin-f");
            });
            c.On("tp.load", d =>
            {
                if (!_player.Load(d.Int("slot"))) Ui.Toast("warn", "Boş yuva", "Önce bu yuvaya konum kaydet.");
            });

            // World
            c.On("world.time", d => WorldControl.SetTime(d.Int("hour"), d.Int("minute")));
            c.On("world.weather", d =>
            {
                if (_world.SetWeather(d.Str("id"))) Ui.Toast("info", "Hava", d.Str("label", d.Str("id")), "cloud");
            });
            c.On("world.sweep", d =>
            {
                if (!Enum.TryParse(d.Str("target"), out WorldControl.Target t)) return;
                var mode = d.Str("mode") == "kill" ? WorldControl.Mode.Kill : WorldControl.Mode.Delete;
                _world.StartSweep(t, mode);
            });
            c.On("world.crowd", d => _spawner.Crowd((int)Clamp(d.Int("peds", 25), 0, 120), (int)Clamp(d.Int("vehicles", 6), 0, 30)));
            c.On("world.cleanupSpawned", _ => Ui.Toast("info", "Temizlendi", _spawner.Cleanup() + " varlık silindi."));

            // HUD
            c.On("hud.demo", _ =>
            {
                Ui.Begin("mhud:demo").BeginObject().Prop("game", "redm").EndObject();
                Ui.Send();
            });
        }

        private static Ped Me => Game.Player.Character;

        private void GiveWeapon(string id, string label, int amount, bool variants, bool equip, bool toast)
        {
            label = label ?? id;
            if (!Args.TryEnum(id, out eWeapon w))
            {
                Ui.Toast("danger", "Bilinmeyen silah", id);
                return;
            }
            Arsenal.GiveResult r = _arsenal.Give(Game.Player, Me, (uint)w, amount, variants, equip);
            if (!toast) return;
            if (!r.Valid) Ui.Toast("danger", "Geçersiz silah", label);
            else if (amount <= 0) Ui.Toast("info", r.Given ? "Silah verildi" : "Kuşanıldı", label, "hand");
            else if (!r.HasAmmo) Ui.Toast("success", r.Given ? "Silah verildi" : "Zaten sende", label, "revolver");
            else if (r.AmmoAdded > 0) Ui.Toast("success", r.Given ? "Silah verildi" : "Mermi eklendi", label + " · +" + r.AmmoAdded + " (toplam " + r.AmmoTotal + ")", "bullets");
            else Ui.Toast("warn", r.Given ? "Silah verildi" : "Kapasite dolu", label + " · " + r.AmmoTotal + " · sınırı kaldırmak için 'Kapasite sınırı yok'", "bullets");
            SendInventory(new List<string> { id });
        }

        private void SendInventory(List<string> ids)
        {
            Ped me = Me;
            if (me == null || !me.Exists()) return;
            JsonWriter w = Ui.Begin("trainer:inventory").BeginObject();
            _arsenal.WriteInventory(w, me, ids);
            w.EndObject();
            Ui.Send();
        }

        private static void WithHorse(Action<Ped> action)
        {
            Ped horse = PlayerFeatures.PlayerHorse(Game.Player, Me);
            if (horse == null || !horse.Exists()) { Ui.Toast("warn", "At yok", "Ata bin ya da bir at çağır."); return; }
            action(horse);
        }

        private static void WithVehicle(Action<Vehicle> action)
        {
            Vehicle v = Me.CurrentVehicle;
            if (v == null || !v.Exists()) { Ui.Toast("warn", "Araçta değilsin"); return; }
            action(v);
        }

        // ------------------------------------------------------------------ state

        private void PushState(Player player, Ped ped)
        {
            long now = _clock.ElapsedMilliseconds;
            if (now >= _nextCount)
            {
                _nextCount = now + 1000;
                Guard.Run("World.Count", () => _world.Count(ped));
            }

            int p = player.Handle;
            JsonWriter w = Ui.Begin("trainer:state").BeginObject();
            w.Prop("cash", player.Money / 100)
             .Prop("bounty", LAW.GET_BOUNTY(p) / 100)
             .Prop("wantedScore", LAW.GET_WANTED_SCORE(p))
             .Prop("incident", LAW.IS_LAW_INCIDENT_ACTIVE(p))
             .Prop("health", RdrTagWorld.HealthPercent(ped))
             .Prop("stamina", Native.StaminaPercent(ped))
             .Name("cores").BeginObject()
                .Prop("health", Native.Clamp(Native.Core(ped, 0), 0, 100))
                .Prop("stamina", Native.Clamp(Native.Core(ped, 1), 0, 100))
                .Prop("deadeye", Native.Clamp(Native.Core(ped, 2), 0, 100))
             .EndObject()
             .Prop("model", Enum.GetName(typeof(PedHash), (uint)ped.Model.Hash) ?? "")
             .Prop("mounted", ped.IsOnMount)
             .Prop("inVehicle", ped.IsInVehicle)
             .Prop("hour", Native.ClockHours()).Prop("minute", Native.ClockMinutes())
             .Prop("weather", _world.Weather)
             .Prop("waypoint", World.IsWaypointActive)
             .Prop("weapon", Enum.GetName(typeof(eWeapon), Arsenal.CurrentWeapon(ped)) ?? "");

            Vector3 pos = ped.Position;
            w.Name("pos").BeginArray().Value(pos.X, "0.0").Value(pos.Y, "0.0").Value(pos.Z, "0.0").EndArray();

            Ped horse = PlayerFeatures.PlayerHorse(player, ped);
            if (horse != null && horse.Exists())
            {
                w.Name("horse").BeginObject()
                    .Prop("model", Enum.GetName(typeof(PedHash), (uint)horse.Model.Hash) ?? "")
                    .Prop("health", RdrTagWorld.HealthPercent(horse))
                    .Prop("stamina", Native.StaminaPercent(horse))
                    .Prop("mounted", ped.IsOnMount)
                    .EndObject();
            }

            w.Name("counts").BeginObject()
                .Prop("humans", _world.Humans).Prop("animals", _world.Animals).Prop("horses", _world.Horses)
                .Prop("law", _world.Law).Prop("dead", _world.Dead).Prop("vehicles", _world.Vehicles)
                .Prop("trains", _world.Trains).Prop("props", _world.Props).Prop("spawned", _spawner.SpawnedCount)
                .EndObject();
            w.Name("sweep").BeginObject()
                .Prop("running", _world.SweepRunning).Prop("done", _world.SweepDone).Prop("total", _world.SweepTotal)
                .Prop("label", _world.SweepLabel ?? "")
                .EndObject();
            w.Name("slots").BeginArray();
            for (int i = 0; i < 3; i++) w.Value(_player.HasSaved(i));
            w.EndArray();
            _settings.Write(w);
            w.EndObject();
            Ui.Send();
        }

        // ------------------------------------------------------------------ per tick

        public void Tick(Player player, Ped ped, float frameSeconds)
        {
            Guard.Run("Player", () => _player.Tick(player, ped));
            Guard.Run("Arsenal", () => _arsenal.Tick(ped));
            Guard.Run("World", _world.Tick);

            if (CameraSpinDegreesPerSecond > 0)
            {
                float h = Native.GameplayCamRelativeHeading() + CameraSpinDegreesPerSecond * frameSeconds;
                if (h > 180f) h -= 360f;
                Native.SetGameplayCamRelativeHeading(h);
            }

            if (MenuOpen && Ui.Ready)
            {
                long now = _clock.ElapsedMilliseconds;
                if (now >= _nextState)
                {
                    _nextState = now + 250;
                    Guard.Run("State", () => PushState(player, ped));
                }
            }
        }

        /// <summary>Death, loading, fades: long jobs stop.</summary>
        public void Suspend() => Guard.Run("World.Suspend", _world.Suspend);

        public void Shutdown()
        {
            Guard.Run("Player.Shutdown", _player.Shutdown);
            Guard.Run("Arsenal.Shutdown", () => _arsenal.Shutdown(Game.Player.Character));
            Guard.Run("World.Shutdown", _world.Shutdown);
            if (MenuOpen) Guard.Run("Menu.Close", CloseMenu);
            _hud.Shutdown();
        }
    }
}
