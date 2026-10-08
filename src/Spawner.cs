// Spawning for the big menu: horses (ride or lead), animals (calm, hostile or companion), wagons / boats, and the
// stress-test crowd. Everything spawned is tracked so "remove what the trainer spawned" can clean up.
using System;
using System.Collections.Generic;
using RDR2;
using RDR2.Math;
using RDR2.Native;

namespace StreamEmber.Trainers
{
    internal sealed class Spawner
    {
        private readonly Random _random = new Random();
        private readonly List<Vehicle> _vehicles = new List<Vehicle>();
        private readonly List<Ped> _peds = new List<Ped>();

        private static readonly PedHash[] Townsfolk =
        {
            PedHash.a_m_m_valtownfolk_01, PedHash.a_m_m_valtownfolk_02, PedHash.a_f_m_valtownfolk_01,
            PedHash.a_m_m_rhdtownfolk_01, PedHash.a_m_m_rhdtownfolk_02, PedHash.a_f_m_rhdtownfolk_01,
            PedHash.a_m_m_blwtownfolk_01, PedHash.a_f_m_blwtownfolk_01, PedHash.a_m_m_middlesdtownfolk_01,
            PedHash.a_f_m_middlesdtownfolk_01,
        };

        public int SpawnedCount
        {
            get
            {
                _peds.RemoveAll(p => p == null || !p.Exists());
                _vehicles.RemoveAll(v => v == null || !v.Exists());
                return _peds.Count + _vehicles.Count;
            }
        }

        public static bool LoadModel(Model model, string name)
        {
            if (!model.IsInCdImage || !model.IsValid)
            {
                Ui.Toast("danger", "Model bulunamadı", name);
                return false;
            }
            if (!model.Request(4000))
            {
                Ui.Toast("danger", "Model yüklenemedi", name);
                return false;
            }
            return true;
        }

        private static void Release(Model model) => STREAMING.SET_MODEL_AS_NO_LONGER_NEEDED((uint)model.Hash);

        private Vector3 Around(Vector3 center, float minDist, float maxDist)
        {
            double angle = _random.NextDouble() * Math.PI * 2;
            float dist = minDist + (float)_random.NextDouble() * (maxDist - minDist);
            return center + new Vector3((float)Math.Cos(angle) * dist, (float)Math.Sin(angle) * dist, 0f);
        }

        private static Vector3 OnGround(Vector3 p, float probeAbove = 20f)
        {
            return Native.GroundZ(p.X, p.Y, p.Z + probeAbove, out float gz) ? new Vector3(p.X, p.Y, gz + 0.3f) : p;
        }

        private static void Track<T>(List<T> list, T entity, int max) where T : Entity
        {
            list.Add(entity);
            while (list.Count > max)
            {
                list[0]?.MarkAsNoLongerNeeded();
                list.RemoveAt(0);
            }
        }

        // ------------------------------------------------------------------ horses

        public Ped SpawnHorse(PedHash hash, string label, bool mount, bool makeMine)
        {
            Player player = Game.Player;
            Ped p = player.Character;
            if (mount && p.IsInVehicle)
            {
                Ui.Toast("warn", "Arabadasın", "Ata binmek için önce in.");
                return null;
            }
            var model = new Model(hash);
            if (!LoadModel(model, label)) return null;
            if (!PED._IS_THIS_MODEL_A_HORSE((uint)hash))
            {
                Ui.Toast("danger", "Bu model at değil", label);
                return null;
            }
            Vector3 pos = OnGround(p.Position + p.RightVector * 2.5f, 3f);
            Ped horse = World.CreatePed(hash, pos, p.Heading);
            Release(model);
            if (horse == null || !horse.Exists())
            {
                Ui.Toast("danger", "At oluşturulamadı", label);
                return null;
            }
            Native.RandomOutfit(horse);
            if (makeMine)
            {
                PLAYER.SET_PED_AS_TEMP_PLAYER_HORSE(player.Handle, horse.Handle);
                PLAYER._SET_PLAYER_OWNS_MOUNT(player.Handle, horse.Handle);
                PED._SET_MOUNT_BONDING_LEVEL(horse.Handle, 4);
            }
            if (mount) Native.Mount(p, horse);
            Track(_peds, horse, 12);
            Ui.Toast("success", mount ? "At hazır, bindin" : "At yanında", label, "horse");
            return horse;
        }

        // ------------------------------------------------------------------ animals / people

        public enum Behaviour { Calm, Hostile, Companion, Flee }

        public int SpawnAnimals(PedHash hash, string label, int count, Behaviour behaviour)
        {
            Ped p = Game.Player.Character;
            var model = new Model(hash);
            if (!LoadModel(model, label)) return 0;
            count = Math.Max(1, Math.Min(25, count));
            int made = 0;
            for (int i = 0; i < count; i++)
            {
                Vector3 pos = count == 1 ? p.Position + p.ForwardVector * 5f : Around(p.Position, 5f, 14f);
                pos = OnGround(pos);
                Ped a = World.CreatePed(hash, pos, (float)_random.NextDouble() * 360f);
                if (a == null || !a.Exists()) continue;
                Native.RandomOutfit(a);
                ApplyBehaviour(a, p, behaviour);
                Track(_peds, a, 400);
                made++;
            }
            Release(model);
            if (made == 0) Ui.Toast("danger", "Oluşturulamadı", label);
            else Ui.Toast("success", label, made + " adet · " + BehaviourLabel(behaviour), "pin-f");
            return made;
        }

        private static string BehaviourLabel(Behaviour b)
        {
            switch (b)
            {
                case Behaviour.Hostile: return "saldırgan";
                case Behaviour.Companion: return "seni izliyor";
                case Behaviour.Flee: return "kaçıyor";
                default: return "sakin";
            }
        }

        private static void ApplyBehaviour(Ped a, Ped player, Behaviour b)
        {
            switch (b)
            {
                case Behaviour.Hostile:
                    PED.SET_PED_KEEP_TASK(a.Handle, true);
                    TASK.TASK_COMBAT_PED(a.Handle, player.Handle, 0, 16);
                    break;
                case Behaviour.Companion:
                    PED.SET_BLOCKING_OF_NON_TEMPORARY_EVENTS(a.Handle, true);
                    PED.SET_PED_KEEP_TASK(a.Handle, true);
                    TASK.TASK_FOLLOW_TO_OFFSET_OF_ENTITY(a.Handle, player.Handle, 1.5f, -1.5f, 0f, 2f, -1, 2f, true, false, false, false, false, false);
                    break;
                case Behaviour.Flee:
                    TASK.TASK_SMART_FLEE_PED(a.Handle, player.Handle, 200f, -1, 0, 3f, 0);
                    break;
                default:
                    TASK.TASK_WANDER_STANDARD(a.Handle, 10f, 10);
                    break;
            }
        }

        public Ped SpawnPerson(PedHash hash, string label, Behaviour behaviour)
        {
            Ped p = Game.Player.Character;
            var model = new Model(hash);
            if (!LoadModel(model, label)) return null;
            Ped ped = World.CreatePed(hash, OnGround(p.Position + p.ForwardVector * 4f), p.Heading + 180f);
            Release(model);
            if (ped == null || !ped.Exists()) return null;
            ApplyBehaviour(ped, p, behaviour);
            Track(_peds, ped, 400);
            return ped;
        }

        // ------------------------------------------------------------------ vehicles

        public Vehicle SpawnVehicle(VehicleHash hash, string label, bool enter)
        {
            Ped p = Game.Player.Character;
            var model = new Model((uint)hash);
            if (!LoadModel(model, label)) return null;
            Vector3 pos = p.Position + p.ForwardVector * 7f;
            Vehicle v = World.CreateVehicle(hash, pos, p.Heading + 90f);
            Release(model);
            if (v == null || !v.Exists())
            {
                Ui.Toast("danger", "Araç oluşturulamadı", label);
                return null;
            }
            v.PlaceOnGround();
            if (enter) p.SetIntoVehicle(v, eVehicleSeat.Driver);
            Track(_vehicles, v, 12);
            Ui.Toast("success", "Hazır", label, "cart");
            return v;
        }

        // ------------------------------------------------------------------ stress test

        public void Crowd(int pedCount, int vehicleCount)
        {
            Ped player = Game.Player.Character;
            Vector3 center = player.Position;
            int peds = 0, vehicles = 0;

            for (int i = 0; i < pedCount; i++)
            {
                Vector3 pos = OnGround(Around(center, 6f, 25f));
                Ped ped = World.CreatePed(Townsfolk[_random.Next(Townsfolk.Length)], pos, (float)_random.NextDouble() * 360f);
                if (ped == null) continue;
                ped.Task.WanderAround();
                Track(_peds, ped, 400);
                peds++;
            }

            for (int i = 0; i < vehicleCount; i++)
            {
                Vector3 pos = World.GetNextPositionOnStreet(Around(center, 20f, 60f));
                VehicleHash hash = _random.Next(2) == 0 ? VehicleHash.StageCoach001X : VehicleHash.Cart01;
                Vehicle v = World.CreateVehicle(hash, pos, (float)_random.NextDouble() * 360f);
                if (v == null) continue;
                Ped driver = v.CreatePedOnSeat(eVehicleSeat.Driver, new Model(Townsfolk[_random.Next(Townsfolk.Length)]));
                driver?.Task.DriveWander(v, 6f, eDrivingFlags.DF_StopForCars | eDrivingFlags.DF_StopForPeds | eDrivingFlags.DF_SteerAroundPeds);
                Track(_vehicles, v, 400);
                if (driver != null) Track(_peds, driver, 400);
                vehicles++;
            }
            Ui.Toast("info", "Kalabalık oluşturuldu", peds + " kişi, " + vehicles + " araba", "users");
        }

        /// <summary>Deletes what the trainer spawned (except what the player rides / drives).</summary>
        public int Cleanup()
        {
            int n = 0;
            Ped me = Game.Player.Character;
            int myMount = PED.GET_MOUNT(me.Handle);
            Vehicle myVehicle = me.IsInVehicle ? me.CurrentVehicle : null;
            foreach (Ped p in _peds)
            {
                try
                {
                    if (p == null || !p.Exists() || p.Handle == myMount) continue;
                    p.Delete();
                    n++;
                }
                catch (Exception ex)
                {
                    TrainerLog.Error("Cleanup.Ped", ex);
                }
            }
            foreach (Vehicle v in _vehicles)
            {
                try
                {
                    if (v == null || !v.Exists() || (myVehicle != null && v.Handle == myVehicle.Handle)) continue;
                    v.Delete();
                    n++;
                }
                catch (Exception ex)
                {
                    TrainerLog.Error("Cleanup.Vehicle", ex);
                }
            }
            _peds.RemoveAll(p => p == null || !p.Exists());
            _vehicles.RemoveAll(v => v == null || !v.Exists());
            return n;
        }
    }
}
