// Player, horse and travel features of the big menu: per-tick toggles (god mode, infinite cores, never wanted, ...)
// and one-shot actions (fill cores, clear wanted, money, model, teleport).
//
// Clearing the wanted state: in RDR2, CLEAR_PLAYER_WANTED_LEVEL alone does nothing visible (that was the bug): the
// law runs on a bounty + wanted score + active incident/pursuit. ClearWanted clears all of them and makes the law
// peds that are fighting the player stand down.
using System;
using System.Collections.Generic;
using RDR2;
using RDR2.Math;
using RDR2.Native;

namespace StreamEmber.Trainers
{
    internal sealed class PlayerFeatures
    {
        // Toggles (applied every tick while on)
        public bool God, InfiniteStamina, InfiniteDeadEye, NeverWanted, Ignored, Invisible, NoRagdoll, SuperJump, Silent;
        public float DamageMultiplier = 1f;
        public float MoveRate = 1f;
        public bool HorseGod, HorseInfiniteStamina;

        private int _appliedPed;
        private bool _invisibleApplied, _noRagdollApplied, _silentApplied, _neverWantedApplied;
        private float _damageApplied = 1f;
        private int _horseGodHandle;
        private long _nextSlow;
        private readonly System.Diagnostics.Stopwatch _clock = System.Diagnostics.Stopwatch.StartNew();
        private readonly Vector3?[] _saved = new Vector3?[3];

        // ------------------------------------------------------------------ per tick

        public void Tick(Player player, Ped ped)
        {
            bool newPed = ped.Handle != _appliedPed;
            if (newPed)
            {
                // Respawn / model change: per-ped flags of the old ped are gone
                _appliedPed = ped.Handle;
                _invisibleApplied = _noRagdollApplied = false;
            }

            if (God)
            {
                player.Invincible = true;
                ENTITY.SET_ENTITY_INVINCIBLE(ped.Handle, true);
            }
            if (InfiniteStamina)
            {
                Native.SetCore(ped, 1, 100);
                if (Native.StaminaPercent(ped) < 95) Native.RestoreStamina(ped);
            }
            if (InfiniteDeadEye)
            {
                Native.SetCore(ped, 2, 100);
                PLAYER._SPECIAL_ABILITY_RESTORE_OUTER_RING(player.Handle, 100f);
            }
            if (Ignored) PLAYER.SET_EVERYONE_IGNORE_PLAYER(player.Handle, true);
            if (SuperJump) MISC.SET_SUPER_JUMP_THIS_FRAME(player.Handle);
            if (MoveRate > 1.01f) PED.SET_PED_MOVE_RATE_OVERRIDE(ped.Handle, MoveRate);

            if (Invisible != _invisibleApplied)
            {
                _invisibleApplied = Invisible;
                ENTITY.SET_ENTITY_VISIBLE(ped.Handle, !Invisible);
            }
            if (NoRagdoll != _noRagdollApplied)
            {
                _noRagdollApplied = NoRagdoll;
                PED.SET_PED_CAN_RAGDOLL(ped.Handle, !NoRagdoll);
            }
            if (Silent != _silentApplied)
            {
                _silentApplied = Silent;
                PLAYER.SET_PLAYER_NOISE_MULTIPLIER(player.Handle, Silent ? 0f : 1f);
                PLAYER.SET_PLAYER_SNEAKING_NOISE_MULTIPLIER(player.Handle, Silent ? 0f : 1f);
            }
            if (NeverWanted != _neverWantedApplied)
            {
                _neverWantedApplied = NeverWanted;
                ApplyLawDisabled(player, NeverWanted);
            }

            long now = _clock.ElapsedMilliseconds;
            if (now >= _nextSlow)
            {
                _nextSlow = now + 250;
                if (NeverWanted && IsWanted(player)) ClearWanted(player, false);
                if (Math.Abs(DamageMultiplier - _damageApplied) > 0.001f || newPed)
                {
                    _damageApplied = DamageMultiplier;
                    PLAYER.SET_PLAYER_WEAPON_DAMAGE_MODIFIER(player.Handle, DamageMultiplier);
                    PLAYER.SET_PLAYER_MELEE_WEAPON_DAMAGE_MODIFIER(player.Handle, DamageMultiplier);
                }
            }

            Ped horse = ped.IsOnMount ? ped.CurrentMount : null;
            if (horse != null && horse.Exists())
            {
                if (HorseGod)
                {
                    ENTITY.SET_ENTITY_INVINCIBLE(horse.Handle, true);
                    _horseGodHandle = horse.Handle;
                }
                if (HorseInfiniteStamina)
                {
                    Native.SetCore(horse, 1, 100);
                    if (Native.StaminaPercent(horse) < 95) Native.RestoreStamina(horse);
                }
            }
            if (!HorseGod && _horseGodHandle != 0)
            {
                if (ENTITY.DOES_ENTITY_EXIST(_horseGodHandle)) ENTITY.SET_ENTITY_INVINCIBLE(_horseGodHandle, false);
                _horseGodHandle = 0;
            }
        }

        public void SetGod(bool on)
        {
            God = on;
            if (on) return;
            Player player = Game.Player;
            player.Invincible = false;
            Ped ped = player.Character;
            if (ped != null && ped.Exists()) ENTITY.SET_ENTITY_INVINCIBLE(ped.Handle, false);
        }

        public void Shutdown()
        {
            Player player = Game.Player;
            Ped ped = player.Character;
            if (God) SetGod(false);
            if (_neverWantedApplied) ApplyLawDisabled(player, false);
            if (ped != null && ped.Exists())
            {
                if (_invisibleApplied) ENTITY.SET_ENTITY_VISIBLE(ped.Handle, true);
                if (_noRagdollApplied) PED.SET_PED_CAN_RAGDOLL(ped.Handle, true);
            }
            if (_silentApplied)
            {
                PLAYER.SET_PLAYER_NOISE_MULTIPLIER(player.Handle, 1f);
                PLAYER.SET_PLAYER_SNEAKING_NOISE_MULTIPLIER(player.Handle, 1f);
            }
            PLAYER.SET_PLAYER_WEAPON_DAMAGE_MODIFIER(player.Handle, 1f);
            PLAYER.SET_PLAYER_MELEE_WEAPON_DAMAGE_MODIFIER(player.Handle, 1f);
            if (_horseGodHandle != 0 && ENTITY.DOES_ENTITY_EXIST(_horseGodHandle)) ENTITY.SET_ENTITY_INVINCIBLE(_horseGodHandle, false);
        }

        // ------------------------------------------------------------------ law

        public static bool IsWanted(Player player)
        {
            int p = player.Handle;
            return LAW.GET_BOUNTY(p) > 0 || LAW.GET_WANTED_SCORE(p) > 0 || PLAYER.GET_PLAYER_WANTED_LEVEL(p) > 0 ||
                   LAW.IS_LAW_INCIDENT_ACTIVE(p);
        }

        /// <summary>Bounty, wanted score, active incident and pursuit; law peds fighting the player stand down.</summary>
        public static int ClearWanted(Player player, bool calmLaw)
        {
            int p = player.Handle;
            LAW.CLEAR_BOUNTY(p);
            LAW.SET_BOUNTY(p, 0);
            LAW.CLEAR_WANTED_SCORE(p);
            LAW.SET_WANTED_SCORE(p, 0);
            PLAYER.CLEAR_PLAYER_WANTED_LEVEL(p);
            PLAYER.SET_PLAYER_WANTED_LEVEL(p, 0, false);
            LAW.RESET_WANTED_FOR_NEW_INCIDENT(p);
            LAW.CLEAR_PLAYER_PAST_CRIMES(p);
            LAW._SET_BOUNTY_HUNTER_PURSUIT_CLEARED();
            PLAYER.RESET_WANTED_LEVEL_DIFFICULTY(p);
            if (!calmLaw) return 0;

            int calmed = 0;
            Ped me = player.Character;
            foreach (Ped ped in World.GetAllPeds())
            {
                try
                {
                    if (ped == null || ped.Handle == me.Handle || !ped.Exists() || ped.IsDead) continue;
                    if (!EntityKinds.IsLaw(ped)) continue;
                    if (!PED.IS_PED_IN_COMBAT(ped.Handle, me.Handle)) continue;
                    TASK.CLEAR_PED_TASKS(ped.Handle, true, true);
                    TASK.TASK_WANDER_STANDARD(ped.Handle, 10f, 10);
                    calmed++;
                }
                catch (Exception ex)
                {
                    TrainerLog.Error("ClearWanted.Ped", ex);
                }
            }
            return calmed;
        }

        private static void ApplyLawDisabled(Player player, bool disabled)
        {
            PLAYER._SET_DISABLE_PLAYER_WANTED_LEVEL(player.Handle, disabled);
            PLAYER.SET_WANTED_LEVEL_MULTIPLIER(disabled ? 0f : 1f);
            LAW._SET_LAW_DISABLED(disabled);
            LAW._ENABLE_DISPATCH_LAW(!disabled);
            if (disabled) ClearWanted(player, true);
        }

        // ------------------------------------------------------------------ actions

        public static void FillCores(Ped ped)
        {
            ped.Health = ped.MaxHealth;
            for (int i = 0; i < 3; i++) Native.SetCore(ped, i, 100);
            Native.RestoreStamina(ped);
            PLAYER._SPECIAL_ABILITY_RESTORE_OUTER_RING(Game.Player.Handle, 100f);
        }

        /// <summary>Gold (overpowered) cores and attribute rings for a long time.</summary>
        public static void GoldCores(Ped ped)
        {
            for (int i = 0; i < 3; i++)
            {
                ATTRIBUTE._ENABLE_ATTRIBUTE_CORE_OVERPOWER(ped.Handle, i, 3600f, true);
                ATTRIBUTE.ENABLE_ATTRIBUTE_OVERPOWER(ped.Handle, i, 3600f, true);
            }
            FillCores(ped);
        }

        public static void Clean(Ped ped)
        {
            PED.CLEAR_PED_BLOOD_DAMAGE(ped.Handle);
            PED.CLEAR_PED_WETNESS(ped.Handle);
            PED.CLEAR_PED_ENV_DIRT(ped.Handle);
            PED._SET_PED_DIRT_CLEANED(ped.Handle, 0f, -1, true, true);
        }

        public static Ped PlayerHorse(Player player, Ped ped)
        {
            if (ped.IsOnMount)
            {
                Ped mount = ped.CurrentMount;
                if (mount != null && mount.Exists()) return mount;
            }
            int h = PLAYER._GET_SADDLE_HORSE_FOR_PLAYER(player.Handle);
            if (h == 0) h = PLAYER._GET_ACTIVE_HORSE_FOR_PLAYER(player.Handle);
            if (h != 0 && ENTITY.DOES_ENTITY_EXIST(h)) return (Ped)Entity.FromHandle(h);
            return null;
        }

        public static void FillHorse(Ped horse)
        {
            horse.Health = horse.MaxHealth;
            for (int i = 0; i < 2; i++) Native.SetCore(horse, i, 100);
            Native.RestoreStamina(horse);
        }

        // ------------------------------------------------------------------ travel

        /// <summary>The entity that moves with the player: wagon, horse, or the player itself.</summary>
        public static Entity MovingEntity(Ped p)
        {
            if (p.IsInVehicle) return p.CurrentVehicle;
            if (p.IsOnMount && p.CurrentMount != null) return p.CurrentMount;
            return p;
        }

        // Collision streams in around the new position; probe the ground for up to ~2.5 s
        public static bool ProbeAndPlace(float x, float y)
        {
            Entity e = MovingEntity(Game.Player.Character);
            float z = 1000f;
            bool found = false;
            for (int i = 0; i < 50 && !found; i++)
            {
                e.Position = new Vector3(x, y, z);
                Native.RequestCollisionAt(e.Position);
                Script.Wait(50);
                found = Native.GroundZ(x, y, 1000f, out float ground);
                if (found) z = ground + 1f;
            }
            e.Position = new Vector3(x, y, found ? z : 300f);
            return found;
        }

        public void Save(int slot, Vector3 position)
        {
            if (slot >= 0 && slot < _saved.Length) _saved[slot] = position;
        }

        public bool Load(int slot)
        {
            if (slot < 0 || slot >= _saved.Length || !_saved[slot].HasValue) return false;
            Vector3 p = _saved[slot].Value;
            Entity e = MovingEntity(Game.Player.Character);
            Native.RequestCollisionAt(p);
            e.Position = p;
            return true;
        }

        public bool HasSaved(int slot) => slot >= 0 && slot < _saved.Length && _saved[slot].HasValue;
    }

    /// <summary>What kind of ped / vehicle an entity is (for counting and the world sweeps).</summary>
    internal static class EntityKinds
    {
        private static readonly uint RelCop = 0x2A318608;   // REL_COP
        private static HashSet<uint> s_lawModels;
        private static HashSet<uint> s_trainModels;

        private static HashSet<uint> LawModels
        {
            get
            {
                if (s_lawModels == null)
                {
                    s_lawModels = new HashSet<uint>();
                    var rx = new System.Text.RegularExpressions.Regex(
                        "(deputy_|deputy$|valdeputy|strdeputy|rhodeputy|asbdeputy|backupdeputy|sheriff|marshal|lawman|pinlaw|pinkerton|" +
                        "_army_|armytrn|lawrural|dispatchlaw|leadofficer|bountyhunter|hostagemarshal|horde_law)");
                    foreach (PedHash h in Enum.GetValues(typeof(PedHash)))
                    {
                        string name = h.ToString();
                        if (name.Contains("resident")) continue;   // town residents named after the deputies
                        if (rx.IsMatch(name)) s_lawModels.Add((uint)h);
                    }
                }
                return s_lawModels;
            }
        }

        private static HashSet<uint> TrainModels
        {
            get
            {
                if (s_trainModels == null)
                {
                    s_trainModels = new HashSet<uint>();
                    var rx = new System.Text.RegularExpressions.Regex(
                        "(Steamer|Passenger|Boxcar|BoxCar|CoalCar|Caboose|FlatCar|Dining|Rooms|Observation|Baggage|Sleeper|" +
                        "OilWagon0|Trolley|HandCart|MineCart|CoalHopper|Refrigerator|PrivateArmoured|ArmoredCar|GhostTrain)");
                    foreach (VehicleHash h in Enum.GetValues(typeof(VehicleHash)))
                    {
                        if (rx.IsMatch(h.ToString())) s_trainModels.Add((uint)h);
                    }
                }
                return s_trainModels;
            }
        }

        public static bool IsLaw(Ped ped)
        {
            uint model = (uint)ped.Model.Hash;
            return LawModels.Contains(model) || PED.GET_PED_RELATIONSHIP_GROUP_HASH(ped.Handle) == RelCop;
        }

        public static bool IsHorse(Ped ped) => PED._IS_THIS_MODEL_A_HORSE((uint)ped.Model.Hash);

        public static bool IsTrain(Vehicle v)
        {
            uint model = (uint)v.Model.Hash;
            return TrainModels.Contains(model) || VEHICLE.IS_THIS_MODEL_A_TRAIN(model);
        }
    }
}
