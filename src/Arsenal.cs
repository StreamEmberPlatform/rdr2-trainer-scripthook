// Weapons and ammo for the big menu.
//
// Why "give all" did not add ammo before: WeaponCollection.Give only selects a weapon the ped already has, and
// GIVE_WEAPON_TO_PED never adds ammo to an existing weapon (throwables such as dynamite or fire bottles are weapons
// whose ammo is the count in hand, so their number did not grow either). Here a weapon is given only when it is
// missing, and the ammo is always added per ammo TYPE (_ADD_AMMO_TO_PED_BY_TYPE): the base type of the weapon and,
// on request, every variant the game accepts for it (express, high velocity, split point, explosive, incendiary,
// slugs, every arrow, volatile dynamite / fire bottles, improved / poison knives ...). The game caps each type at the
// satchel capacity; "no capacity limit" raises that cap for the player first.
using System;
using System.Collections.Generic;
using RDR2;
using RDR2.Native;

namespace StreamEmber.Trainers
{
    internal sealed class Arsenal
    {
        private const uint AddReasonDefault = (uint)eAddItemReason.Default;
        private const uint RemoveReasonDefault = (uint)eRemoveItemReason.Default;
        private const int UncappedAmmo = 9999;

        // Not ammo the player can carry
        private static readonly HashSet<eAmmoType> NotCarried = new HashSet<eAmmoType>
        {
            eAmmoType.Cannon, eAmmoType.Turret, eAmmoType.MoonshineJugMP, eAmmoType.ThrownItem, eAmmoType.Lasso,
        };

        private static eAmmoType[] s_allAmmo;
        private readonly Dictionary<uint, eAmmoType[]> _validAmmo = new Dictionary<uint, eAmmoType[]>();
        private readonly HashSet<uint> _uncapped = new HashSet<uint>();
        private readonly HashSet<uint> _infiniteSet = new HashSet<uint>();
        private int _infinitePed;
        private bool _clipApplied;
        private int _clipPed;

        public bool InfiniteAmmo;
        public bool InfiniteClip;
        public bool NoCapacityLimit = true;

        private static eAmmoType[] AllAmmo
        {
            get
            {
                if (s_allAmmo == null)
                {
                    var list = new List<eAmmoType>();
                    foreach (eAmmoType a in Enum.GetValues(typeof(eAmmoType)))
                    {
                        if (!NotCarried.Contains(a)) list.Add(a);
                    }
                    s_allAmmo = list.ToArray();
                }
                return s_allAmmo;
            }
        }

        // ------------------------------------------------------------------ queries

        public static bool HasWeapon(Ped ped, uint weapon) => WEAPON.HAS_PED_GOT_WEAPON(ped.Handle, weapon, 0, false);

        /// <summary>Base ammo type of a weapon for this ped (0 for melee / lasso).</summary>
        public static uint BaseAmmo(Ped ped, uint weapon)
        {
            uint t = WEAPON.GET_PED_AMMO_TYPE_FROM_WEAPON(ped.Handle, weapon);
            if (t == 0) t = WEAPON._GET_AMMO_TYPE_FOR_WEAPON(weapon);
            return t != 0 && WEAPON._IS_AMMO_VALID(t) ? t : 0;
        }

        /// <summary>Every carried ammo type the game accepts for the weapon (cached per weapon).</summary>
        public eAmmoType[] ValidAmmo(uint weapon)
        {
            if (_validAmmo.TryGetValue(weapon, out eAmmoType[] cached)) return cached;
            var list = new List<eAmmoType>();
            foreach (eAmmoType a in AllAmmo)
            {
                if (WEAPON._IS_AMMO_TYPE_VALID_FOR_WEAPON(weapon, (uint)a)) list.Add(a);
            }
            eAmmoType[] result = list.ToArray();
            _validAmmo[weapon] = result;
            return result;
        }

        public static int AmmoByType(Ped ped, uint ammo) => WEAPON.GET_PED_AMMO_BY_TYPE(ped.Handle, ammo);

        public static uint CurrentWeapon(Ped ped)
        {
            uint hash = 0;
            unsafe
            {
                WEAPON.GET_CURRENT_PED_WEAPON(ped.Handle, &hash, false, 0, false);
            }
            return hash;
        }

        // ------------------------------------------------------------------ actions

        /// <summary>Adds ammo of one type; returns how much the count actually grew.</summary>
        public int AddAmmoType(Player player, Ped ped, uint ammo, int amount)
        {
            if (ammo == 0 || amount <= 0) return 0;
            if (NoCapacityLimit && _uncapped.Add(ammo ^ (uint)ped.Handle))
            {
                PLAYER._SET_PLAYER_MAX_AMMO_OVERRIDE_FOR_AMMO_TYPE(player.Handle, ammo, UncappedAmmo);
            }
            int before = AmmoByType(ped, ammo);
            WEAPON._ADD_AMMO_TO_PED_BY_TYPE(ped.Handle, ammo, amount, AddReasonDefault);
            int after = AmmoByType(ped, ammo);
            if (after <= before && NoCapacityLimit)
            {
                // Some types ignore the add (e.g. the cap override did not take): set the count directly
                WEAPON.SET_PED_AMMO_BY_TYPE(ped.Handle, ammo, Math.Min(UncappedAmmo, before + amount));
                after = AmmoByType(ped, ammo);
            }
            return Math.Max(0, after - before);
        }

        public struct GiveResult
        {
            public bool Given;      // newly given
            public bool Valid;
            public int AmmoAdded;
            public int AmmoTotal;   // count of the base ammo type after the call
            public bool HasAmmo;    // the weapon uses ammo at all
        }

        /// <summary>Gives the weapon if missing, then always adds ammo (base type, or all variants).</summary>
        public GiveResult Give(Player player, Ped ped, uint weapon, int amount, bool allVariants, bool equip)
        {
            var r = new GiveResult();
            if (!WEAPON.IS_WEAPON_VALID(weapon)) return r;
            r.Valid = true;
            if (!HasWeapon(ped, weapon))
            {
                WEAPON.GIVE_WEAPON_TO_PED(ped.Handle, weapon, 0, equip, false, 0, false, 0.5f, 1.0f, AddReasonDefault, true, 0f, false);
                r.Given = true;
            }
            else if (equip)
            {
                WEAPON.SET_CURRENT_PED_WEAPON(ped.Handle, weapon, true, 0, false, false);
            }

            uint baseAmmo = BaseAmmo(ped, weapon);
            r.HasAmmo = baseAmmo != 0;
            if (baseAmmo != 0)
            {
                r.AmmoAdded += AddAmmoType(player, ped, baseAmmo, amount);
                if (allVariants)
                {
                    foreach (eAmmoType a in ValidAmmo(weapon))
                    {
                        if ((uint)a != baseAmmo) r.AmmoAdded += AddAmmoType(player, ped, (uint)a, amount);
                    }
                }
                r.AmmoTotal = AmmoByType(ped, baseAmmo);
            }
            return r;
        }

        public void Remove(Ped ped, uint weapon)
        {
            if (HasWeapon(ped, weapon)) WEAPON.REMOVE_WEAPON_FROM_PED(ped.Handle, weapon, false, RemoveReasonDefault);
        }

        public static void RemoveAll(Ped ped) => WEAPON.REMOVE_ALL_PED_WEAPONS(ped.Handle, true, true);

        /// <summary>Cleans the weapon in hand (dirt, rust / degradation).</summary>
        public static bool CleanCurrent(Ped ped)
        {
            int obj = WEAPON.GET_CURRENT_PED_WEAPON_ENTITY_INDEX(ped.Handle, 0);
            if (obj == 0 || !ENTITY.DOES_ENTITY_EXIST(obj)) return false;
            WEAPON._SET_WEAPON_DEGRADATION(obj, 0f);
            WEAPON._SET_WEAPON_DIRT(obj, 0f, true);
            return true;
        }

        /// <summary>Owned flag and ammo of the base type for each weapon (for the cards).</summary>
        public void WriteInventory(JsonWriter w, Ped ped, List<string> ids)
        {
            w.Name("weapons").BeginObject();
            foreach (string id in ids)
            {
                if (!Args.TryEnum(id, out eWeapon weapon)) continue;
                uint hash = (uint)weapon;
                try
                {
                    bool owned = HasWeapon(ped, hash);
                    uint ammo = BaseAmmo(ped, hash);
                    w.Name(id).BeginObject().Prop("owned", owned);
                    if (ammo != 0) w.Prop("ammo", AmmoByType(ped, ammo));
                    w.EndObject();
                }
                catch (Exception ex)
                {
                    TrainerLog.Error("Inventory " + id, ex);
                }
            }
            w.EndObject();
            w.Name("ammo").BeginObject();
            foreach (eAmmoType a in AllAmmo)
            {
                int n = AmmoByType(ped, (uint)a);
                if (n > 0) w.Prop(a.ToString(), n);
            }
            w.EndObject();
            w.Prop("current", Enum.GetName(typeof(eWeapon), CurrentWeapon(ped)) ?? "");
        }

        // ------------------------------------------------------------------ per tick

        public void Tick(Ped ped)
        {
            if (ped.Handle != _infinitePed)
            {
                // New player ped (model change, respawn): flags of the old ped are gone
                _infinitePed = ped.Handle;
                _infiniteSet.Clear();
                _uncapped.Clear();
            }

            if (InfiniteAmmo)
            {
                uint current = CurrentWeapon(ped);
                if (current != 0 && _infiniteSet.Add(current)) WEAPON.SET_PED_INFINITE_AMMO(ped.Handle, true, current);
            }
            else if (_infiniteSet.Count > 0)
            {
                foreach (uint h in _infiniteSet) WEAPON.SET_PED_INFINITE_AMMO(ped.Handle, false, h);
                _infiniteSet.Clear();
            }

            if (InfiniteClip != _clipApplied || (InfiniteClip && ped.Handle != _clipPed))
            {
                _clipApplied = InfiniteClip;
                _clipPed = ped.Handle;
                WEAPON._SET_PED_INFINITE_AMMO_CLIP(ped.Handle, InfiniteClip);
            }
        }

        public void Shutdown(Ped ped)
        {
            if (ped == null || !ped.Exists()) return;
            foreach (uint h in _infiniteSet) WEAPON.SET_PED_INFINITE_AMMO(ped.Handle, false, h);
            _infiniteSet.Clear();
            if (_clipApplied) WEAPON._SET_PED_INFINITE_AMMO_CLIP(ped.Handle, false);
            _clipApplied = false;
        }
    }
}
