// World features of the big menu: removing / killing everything the game has loaded (not only what the trainer
// spawned), population density, time, weather, trains, and live entity counts.
//
// Sweeps take a snapshot of the pools (World.GetAll*: read on the main script fiber by the runtime) and then work
// through it in small batches, a few dozen entities per frame, so a full sweep never stalls one frame and the game
// gets frames in between to react (tasks, scripts that owned the entities). Every entity is handled on its own: one
// that vanished or misbehaves only skips itself. The player, the player's horse(s) and wagon (with its draft horses
// and passengers) and everything attached to them are always kept.
using System;
using System.Collections.Generic;
using RDR2;
using RDR2.Math;
using RDR2.Native;

namespace StreamEmber.Trainers
{
    internal sealed class WorldControl
    {
        public enum Target { Humans, Animals, Horses, Law, Peds, Vehicles, Trains, Props, Everything }
        public enum Mode { Delete, Kill }

        private struct Job
        {
            public int Handle;
            public byte Kind;   // 0 ped, 1 vehicle, 2 prop
        }

        private static readonly HashSet<string> Weathers = new HashSet<string>(StringComparer.Ordinal)
        {
            "SUNNY", "CLOUDS", "OVERCAST", "OVERCASTDARK", "HIGHPRESSURE", "MISTY", "FOG", "DRIZZLE", "SHOWER", "RAIN",
            "THUNDER", "THUNDERSTORM", "HURRICANE", "HAIL", "SLEET", "SNOWLIGHT", "SNOW", "SNOWCLEARING", "BLIZZARD",
            "GROUNDBLIZZARD", "WHITEOUT", "SANDSTORM",
        };

        // Settings
        public float HumanDensity = 1f, AnimalDensity = 1f, VehicleDensity = 1f;
        public bool NoTrains;
        public bool FreezeTime;
        public float TimeScale = 1f;
        public float SweepRadius;            // 0 = whole world (everything loaded)
        public bool ProtectMission;          // keep entities that belong to other (mission) scripts
        public int BatchPerFrame = 40;
        public bool KeepClean;
        public string KeepCleanTarget = "Peds";

        // Running sweep
        private readonly Queue<Job> _queue = new Queue<Job>();
        private Mode _mode;
        private string _label;
        private int _total, _done, _skipped, _failed;
        private bool _announce;
        private bool _clockPaused;
        private bool _timeScaleApplied;
        private long _nextKeepClean;
        private readonly System.Diagnostics.Stopwatch _clock = System.Diagnostics.Stopwatch.StartNew();

        // Counts (refreshed on demand)
        public int Humans, Animals, Horses, Law, Vehicles, Trains, Props, Dead;

        public bool SweepRunning => _queue.Count > 0;
        public int SweepTotal => _total;
        public int SweepDone => _done;
        public string SweepLabel => _label;

        public string Weather = "";

        // ------------------------------------------------------------------ sweeps

        public static string TargetLabel(Target t)
        {
            switch (t)
            {
                case Target.Humans: return "İnsanlar";
                case Target.Animals: return "Hayvanlar";
                case Target.Horses: return "Atlar";
                case Target.Law: return "Kanun (şerif, polis, asker)";
                case Target.Peds: return "Tüm canlılar";
                case Target.Vehicles: return "Arabalar ve kayıklar";
                case Target.Trains: return "Trenler ve tramvaylar";
                case Target.Props: return "Objeler";
                default: return "Her şey";
            }
        }

        /// <summary>Snapshot of the matching entities; the work is done in batches by <see cref="Tick"/>.</summary>
        public int StartSweep(Target target, Mode mode, bool announce = true)
        {
            Player player = Game.Player;
            Ped me = player.Character;
            if (me == null || !me.Exists()) return 0;
            if (target == Target.Trains && mode == Mode.Delete && SweepRadius <= 0f)
            {
                VEHICLE.DELETE_ALL_TRAINS();
                if (announce) Ui.Toast("info", "Trenler silindi", "DELETE_ALL_TRAINS", "train");
                return 1;
            }

            var keep = Protected(player, me);
            Vector3 center = me.Position;
            float r2 = SweepRadius > 0 ? SweepRadius * SweepRadius : float.MaxValue;
            _queue.Clear();
            _mode = mode;
            _label = TargetLabel(target);
            _done = _skipped = _failed = 0;
            _announce = announce;

            bool peds = target == Target.Humans || target == Target.Animals || target == Target.Horses ||
                        target == Target.Law || target == Target.Peds || target == Target.Everything;
            if (peds)
            {
                foreach (Ped p in World.GetAllPeds())
                {
                    try
                    {
                        if (p == null || keep.Contains(p.Handle) || !p.Exists()) continue;
                        if (PED.IS_PED_A_PLAYER(p.Handle)) continue;
                        if (mode == Mode.Kill && p.IsDead) continue;
                        if (p.Position.DistanceToSquared(center) > r2) continue;
                        if (!MatchesPed(p, target)) continue;
                        if (ProtectMission && IsForeignMissionEntity(p.Handle)) { _skipped++; continue; }
                        _queue.Enqueue(new Job { Handle = p.Handle, Kind = 0 });
                    }
                    catch (Exception ex)
                    {
                        TrainerLog.Error("Sweep.Ped", ex);
                    }
                }
            }
            bool vehicles = target == Target.Vehicles || target == Target.Trains || target == Target.Everything;
            if (vehicles)
            {
                foreach (Vehicle v in World.GetAllVehicles())
                {
                    try
                    {
                        if (v == null || keep.Contains(v.Handle) || !v.Exists()) continue;
                        if (v.Position.DistanceToSquared(center) > r2) continue;
                        bool train = EntityKinds.IsTrain(v);
                        // Train cars are removed as whole trains (deleting single carriages of a moving train is unsafe)
                        if (train) continue;
                        if (target == Target.Trains) continue;
                        if (ProtectMission && IsForeignMissionEntity(v.Handle)) { _skipped++; continue; }
                        _queue.Enqueue(new Job { Handle = v.Handle, Kind = 1 });
                    }
                    catch (Exception ex)
                    {
                        TrainerLog.Error("Sweep.Vehicle", ex);
                    }
                }
                if ((target == Target.Trains || target == Target.Everything) && mode == Mode.Delete) VEHICLE.DELETE_ALL_TRAINS();
            }
            if (target == Target.Props || target == Target.Everything)
            {
                foreach (Prop o in World.GetAllObjects())
                {
                    try
                    {
                        if (o == null || keep.Contains(o.Handle) || !o.Exists()) continue;
                        // Attached objects (weapons in hand, hats, lanterns, the player's things) stay with their owner
                        if (ENTITY.IS_ENTITY_ATTACHED(o.Handle)) continue;
                        if (o.Position.DistanceToSquared(center) > r2) continue;
                        if (ProtectMission && IsForeignMissionEntity(o.Handle)) { _skipped++; continue; }
                        _queue.Enqueue(new Job { Handle = o.Handle, Kind = 2 });
                    }
                    catch (Exception ex)
                    {
                        TrainerLog.Error("Sweep.Prop", ex);
                    }
                }
            }

            _total = _queue.Count;
            TrainerLog.Info("Sweep " + target + " " + mode + ": " + _total + " entities (radius " +
                            (SweepRadius > 0 ? SweepRadius + " m" : "all") + ", protect mission " + ProtectMission + ")");
            if (_total == 0 && announce)
            {
                Ui.Toast("info", _label, _skipped > 0 ? "Yalnız korunan görev varlıkları var (" + _skipped + ")." : "Bulunacak bir şey yok.");
            }
            return _total;
        }

        private static bool MatchesPed(Ped p, Target target)
        {
            switch (target)
            {
                case Target.Humans: return p.IsHuman;
                case Target.Animals: return !p.IsHuman && !EntityKinds.IsHorse(p);
                case Target.Horses: return EntityKinds.IsHorse(p);
                case Target.Law: return p.IsHuman && EntityKinds.IsLaw(p);
                default: return true;
            }
        }

        private static bool IsForeignMissionEntity(int handle)
            => ENTITY.IS_ENTITY_A_MISSION_ENTITY(handle) && !ENTITY.DOES_ENTITY_BELONG_TO_THIS_SCRIPT(handle, true);

        /// <summary>Player, mounts, current wagon with its draft horses and passengers.</summary>
        private static HashSet<int> Protected(Player player, Ped me)
        {
            var keep = new HashSet<int> { me.Handle };
            int mount = PED.GET_MOUNT(me.Handle);
            if (mount != 0) keep.Add(mount);
            int saddle = PLAYER._GET_SADDLE_HORSE_FOR_PLAYER(player.Handle);
            if (saddle != 0) keep.Add(saddle);
            int active = PLAYER._GET_ACTIVE_HORSE_FOR_PLAYER(player.Handle);
            if (active != 0) keep.Add(active);
            int temp = PLAYER._GET_TEMP_PLAYER_HORSE(player.Handle);
            if (temp != 0) keep.Add(temp);
            Vehicle myVehicle = me.IsInVehicle ? me.CurrentVehicle : null;
            if (myVehicle != null && myVehicle.Exists())
            {
                keep.Add(myVehicle.Handle);
                foreach (Ped p in World.GetAllPeds())
                {
                    try
                    {
                        if (p == null || !p.Exists()) continue;
                        if (PED.IS_PED_SITTING_IN_VEHICLE(p.Handle, myVehicle.Handle) ||
                            PED._GET_VEHICLE_DRAFT_HORSE_IS_ATTACHED_TO(p.Handle) == myVehicle.Handle)
                        {
                            keep.Add(p.Handle);
                        }
                    }
                    catch
                    {
                        // keep going
                    }
                }
            }
            return keep;
        }

        private void ProcessBatch()
        {
            int n = 0;
            while (_queue.Count > 0 && n < BatchPerFrame)
            {
                Job job = _queue.Dequeue();
                n++;
                try
                {
                    if (!ENTITY.DOES_ENTITY_EXIST(job.Handle)) { _skipped++; continue; }
                    if (_mode == Mode.Kill && job.Kind != 2)
                    {
                        if (job.Kind == 0)
                        {
                            ENTITY.SET_ENTITY_INVINCIBLE(job.Handle, false);
                            ENTITY.SET_ENTITY_HEALTH(job.Handle, 0, 0);
                        }
                        else
                        {
                            VEHICLE.EXPLODE_VEHICLE(job.Handle, true, false, 0, 0);
                        }
                    }
                    else
                    {
                        Entity e = Entity.FromHandle(job.Handle);
                        if (e == null) { _skipped++; continue; }
                        e.Delete();
                    }
                    _done++;
                }
                catch (Exception ex)
                {
                    _failed++;
                    TrainerLog.Error("Sweep.Entity", ex);
                }
            }

            if (_queue.Count == 0)
            {
                string verb = _mode == Mode.Kill ? "öldürüldü / patlatıldı" : "silindi";
                string text = _done + " / " + _total + " " + verb;
                if (_skipped > 0) text += " · " + _skipped + " atlandı";
                if (_failed > 0) text += " · " + _failed + " hata (log)";
                TrainerLog.Info("Sweep done: " + _label + " " + text);
                if (_announce) Ui.Toast(_failed > 0 ? "warn" : "success", _label, text, _mode == Mode.Kill ? "skull" : "x");
            }
        }

        // ------------------------------------------------------------------ counts

        public void Count(Ped me)
        {
            int humans = 0, animals = 0, horses = 0, law = 0, dead = 0, vehicles = 0, trains = 0;
            foreach (Ped p in World.GetAllPeds())
            {
                try
                {
                    if (p == null || p.Handle == me.Handle || !p.Exists()) continue;
                    if (p.IsDead) dead++;
                    if (p.IsHuman)
                    {
                        humans++;
                        if (EntityKinds.IsLaw(p)) law++;
                    }
                    else if (EntityKinds.IsHorse(p)) horses++;
                    else animals++;
                }
                catch
                {
                    // one entity only
                }
            }
            foreach (Vehicle v in World.GetAllVehicles())
            {
                try
                {
                    if (v == null || !v.Exists()) continue;
                    if (EntityKinds.IsTrain(v)) trains++; else vehicles++;
                }
                catch
                {
                    // one entity only
                }
            }
            Humans = humans; Animals = animals; Horses = horses; Law = law; Dead = dead;
            Vehicles = vehicles; Trains = trains;
            Props = World.GetAllObjects().Length;
        }

        // ------------------------------------------------------------------ environment

        public bool SetWeather(string id)
        {
            if (id == null || !Weathers.Contains(id)) return false;
            Native.SetWeather(id);
            Weather = id;
            return true;
        }

        public static void SetTime(int hour, int minute)
        {
            CLOCK.SET_CLOCK_TIME(Math.Max(0, Math.Min(23, hour)), Math.Max(0, Math.Min(59, minute)), 0);
        }

        // ------------------------------------------------------------------ per tick

        public void Tick()
        {
            if (_queue.Count > 0) ProcessBatch();

            if (KeepClean && _queue.Count == 0)
            {
                long now = _clock.ElapsedMilliseconds;
                if (now >= _nextKeepClean)
                {
                    _nextKeepClean = now + 1500;
                    if (Enum.TryParse(KeepCleanTarget, out Target t)) StartSweep(t, Mode.Delete, false);
                }
            }

            if (HumanDensity < 0.999f)
            {
                PED._SET_AMBIENT_HUMAN_DENSITY_MULTIPLIER_THIS_FRAME(HumanDensity);
                PED._SET_SCENARIO_HUMAN_DENSITY_MULTIPLIER_THIS_FRAME(HumanDensity);
            }
            if (AnimalDensity < 0.999f)
            {
                PED._SET_AMBIENT_ANIMAL_DENSITY_MULTIPLIER_THIS_FRAME(AnimalDensity);
                PED._SET_SCENARIO_ANIMAL_DENSITY_MULTIPLIER_THIS_FRAME(AnimalDensity);
            }
            if (VehicleDensity < 0.999f)
            {
                VEHICLE.SET_VEHICLE_DENSITY_MULTIPLIER_THIS_FRAME(VehicleDensity);
                VEHICLE.SET_RANDOM_VEHICLE_DENSITY_MULTIPLIER_THIS_FRAME(VehicleDensity);
                VEHICLE.SET_PARKED_VEHICLE_DENSITY_MULTIPLIER_THIS_FRAME(VehicleDensity);
            }
            if (NoTrains) VEHICLE.SET_DISABLE_RANDOM_TRAINS_THIS_FRAME(true);

            if (FreezeTime != _clockPaused)
            {
                _clockPaused = FreezeTime;
                CLOCK.PAUSE_CLOCK(FreezeTime, 0);
            }
            if (Math.Abs(TimeScale - 1f) > 0.001f)
            {
                MISC.SET_TIME_SCALE(TimeScale);
                _timeScaleApplied = true;
            }
            else if (_timeScaleApplied)
            {
                MISC.SET_TIME_SCALE(1f);
                _timeScaleApplied = false;
            }
        }

        /// <summary>Death / loading: stop a running sweep (the world is being rebuilt).</summary>
        public void Suspend()
        {
            if (_queue.Count == 0) return;
            TrainerLog.Info("Sweep stopped (screen fade / death): " + _queue.Count + " left");
            _queue.Clear();
        }

        public void Shutdown()
        {
            _queue.Clear();
            if (_clockPaused) CLOCK.PAUSE_CLOCK(false, 0);
            if (_timeScaleApplied) MISC.SET_TIME_SCALE(1f);
        }
    }
}
