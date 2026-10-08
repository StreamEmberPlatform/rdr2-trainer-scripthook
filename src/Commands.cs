// Page -> game commands of the big menu ({ cb: "trainer", data: { op, ... } }) and the settings registry whose values
// are sent back with every state message, so the page always shows what the game really has.
using System;
using System.Collections.Generic;
using System.Globalization;

namespace StreamEmber.Trainers
{
    internal static class Args
    {
        public static bool Bool(this IDictionary<string, object> d, string key, bool fallback = false)
        {
            if (d == null || !d.TryGetValue(key, out object v) || v == null) return fallback;
            if (v is bool b) return b;
            if (v is double n) return n != 0;
            return v is string s && (s == "1" || s.Equals("true", StringComparison.OrdinalIgnoreCase));
        }

        public static int Int(this IDictionary<string, object> d, string key, int fallback = 0)
            => d != null && d.TryGetValue(key, out object v) && v is double n ? (int)Math.Round(n) : fallback;

        public static float Float(this IDictionary<string, object> d, string key, float fallback = 0f)
            => d != null && d.TryGetValue(key, out object v) && v is double n ? (float)n : fallback;

        public static List<string> Strings(this IDictionary<string, object> d, string key)
        {
            var result = new List<string>();
            if (d != null && d.TryGetValue(key, out object v) && v is List<object> list)
            {
                foreach (object o in list)
                {
                    if (o is string s && s.Length > 0 && s.Length < 128) result.Add(s);
                }
            }
            return result;
        }

        /// <summary>Enum member by name (case-insensitive). Only defined names: numbers are rejected.</summary>
        public static bool TryEnum<T>(string name, out T value) where T : struct
        {
            value = default(T);
            if (string.IsNullOrEmpty(name) || char.IsDigit(name[0]) || name[0] == '-') return false;
            return Enum.TryParse(name, true, out value) && Enum.IsDefined(typeof(T), value);
        }
    }

    /// <summary>Named values the page can read and change ("player.god": true, "world.density.humans": 0.5 ...).</summary>
    internal sealed class Settings
    {
        private sealed class Entry
        {
            public string Key;
            public Func<object> Get;
            public Action<object> Set;
        }

        private readonly List<Entry> _entries = new List<Entry>();
        private readonly Dictionary<string, Entry> _byKey = new Dictionary<string, Entry>(StringComparer.Ordinal);

        public void Bool(string key, Func<bool> get, Action<bool> set)
            => Add(key, () => get(), v => set(ToBool(v)));

        public void Num(string key, Func<float> get, Action<float> set)
            => Add(key, () => get(), v => set(ToFloat(v)));

        public void Text(string key, Func<string> get, Action<string> set)
            => Add(key, () => get(), v => set(Convert.ToString(v, CultureInfo.InvariantCulture)));

        private void Add(string key, Func<object> get, Action<object> set)
        {
            var e = new Entry { Key = key, Get = get, Set = set };
            _entries.Add(e);
            _byKey[key] = e;
        }

        public bool Apply(string key, object value)
        {
            if (key == null || !_byKey.TryGetValue(key, out Entry e)) return false;
            e.Set(value);
            return true;
        }

        public void Write(JsonWriter w)
        {
            w.Name("settings").BeginObject();
            foreach (Entry e in _entries)
            {
                object v;
                try
                {
                    v = e.Get();
                }
                catch (Exception ex)
                {
                    TrainerLog.Error("Setting " + e.Key, ex);
                    continue;
                }
                w.Name(e.Key);
                if (v is bool b) w.Value(b);
                else if (v is float f) w.Value(f, "0.###");
                else if (v is int i) w.Value(i);
                else w.Value(Convert.ToString(v, CultureInfo.InvariantCulture));
            }
            w.EndObject();
        }

        private static bool ToBool(object v) => v is bool b ? b : v is double n ? n != 0 : v is string s && s == "true";

        private static float ToFloat(object v)
        {
            if (v is double n) return (float)n;
            if (v is bool b) return b ? 1f : 0f;
            return v is string s && float.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out float f) ? f : 0f;
        }
    }

    /// <summary>Dispatches page commands. Every command runs guarded: a failing command only toasts and logs.</summary>
    internal sealed class CommandRouter
    {
        private readonly Dictionary<string, Action<IDictionary<string, object>>> _ops =
            new Dictionary<string, Action<IDictionary<string, object>>>(StringComparer.Ordinal);

        public void On(string op, Action<IDictionary<string, object>> handler) => _ops[op] = handler;

        public void Handle(IDictionary<string, object> data)
        {
            string op = data.Str("op");
            if (op == null || !_ops.TryGetValue(op, out var handler))
            {
                TrainerLog.Warn("Unknown trainer command: " + (op ?? "(none)"));
                return;
            }
            try
            {
                handler(data);
            }
            catch (Exception ex)
            {
                TrainerLog.Error("Command " + op, ex);
                Ui.Toast("danger", "İşlem başarısız", op + ": " + ex.Message);
            }
        }
    }
}
