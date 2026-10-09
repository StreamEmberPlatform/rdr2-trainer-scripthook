// Hosting pieces shared by the StreamEmber trainers (same file in gtav-trainer-scripthook and rdr2-trainer-scripthook):
//   TrainerLog     <game>\StreamEmber\Logs\Trainer.log, errors throttled
//   TrainerConfig  <game>\StreamEmber\Config\Trainer.ini (UiUrl, MenuKey)
//   TrainerPage    the trainer page in the overlay (the overlay ships no page; ours is on the CDN) and whether it is
//                  the current page (other mods, e.g. the chaos mod, have their own)
//   Guard          runs one part of a tick; an exception is logged and that part is skipped for this frame only
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;
using StreamEmber.Overlay;

namespace StreamEmber.Trainers
{
    internal static class TrainerPaths
    {
        private static string s_root;

        /// <summary>&lt;game&gt;\StreamEmber</summary>
        public static string Root
        {
            get
            {
                if (s_root == null)
                {
                    string exe = Process.GetCurrentProcess().MainModule.FileName;
                    s_root = Path.Combine(Path.GetDirectoryName(exe), "StreamEmber");
                }
                return s_root;
            }
        }

        public static string ConfigFile => Path.Combine(Path.Combine(Root, "Config"), "Trainer.ini");
        public static string LogFile => Path.Combine(Path.Combine(Root, "Logs"), "Trainer.log");
    }

    internal static class TrainerLog
    {
        private static readonly object Gate = new object();
        private static readonly Dictionary<string, int> ErrorCounts = new Dictionary<string, int>();
        private static bool s_started;

        public static void Info(string message) => Write("INFO", message);
        public static void Warn(string message) => Write("WARN", message);

        /// <summary>Logs an exception of one area: the first 10, then every 1000th (a broken frame repeats 60x a second).</summary>
        public static void Error(string area, Exception ex)
        {
            int n;
            lock (Gate)
            {
                ErrorCounts.TryGetValue(area, out n);
                ErrorCounts[area] = ++n;
            }
            if (n <= 10 || n % 1000 == 0)
            {
                Write("ERROR", area + " failed (#" + n + "): " + ex);
            }
        }

        private static void Write(string level, string message)
        {
            try
            {
                lock (Gate)
                {
                    string path = TrainerPaths.LogFile;
                    Directory.CreateDirectory(Path.GetDirectoryName(path));
                    string line = "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] [" + level + "] " + message + Environment.NewLine;
                    if (!s_started)
                    {
                        s_started = true;
                        // New log per game session; the previous session's log is kept next to it
                        try
                        {
                            if (File.Exists(path))
                            {
                                File.Copy(path, Path.Combine(Path.GetDirectoryName(path),
                                    Path.GetFileNameWithoutExtension(path) + ".previous.log"), true);
                            }
                        }
                        catch
                        {
                        }
                        File.WriteAllText(path, line, new UTF8Encoding(false));
                    }
                    else
                    {
                        File.AppendAllText(path, line, new UTF8Encoding(false));
                    }
                }
            }
            catch
            {
                // Logging must never break the game
            }
        }
    }

    internal sealed class TrainerConfig
    {
        /// <summary>Trainer page. Empty in the file = <see cref="DefaultUiUrl"/>.</summary>
        public string UiUrl;
        public Keys MenuKey = Keys.F5;

        public static TrainerConfig Load(string defaultUiUrl)
        {
            var config = new TrainerConfig { UiUrl = defaultUiUrl };
            try
            {
                string path = TrainerPaths.ConfigFile;
                if (!File.Exists(path)) return config;
                foreach (string raw in File.ReadAllLines(path))
                {
                    string line = raw.Trim();
                    if (line.Length == 0 || line[0] == ';' || line[0] == '#' || line.StartsWith("//")) continue;
                    int eq = line.IndexOf('=');
                    if (eq <= 0) continue;
                    string key = line.Substring(0, eq).Trim();
                    string value = line.Substring(eq + 1).Trim().Trim('"');
                    if (key.Equals("UiUrl", StringComparison.OrdinalIgnoreCase))
                    {
                        if (value.Length > 0) config.UiUrl = value;
                    }
                    else if (key.Equals("MenuKey", StringComparison.OrdinalIgnoreCase))
                    {
                        if (Enum.TryParse(value, true, out Keys k) && k != Keys.None) config.MenuKey = k;
                    }
                }
            }
            catch (Exception ex)
            {
                TrainerLog.Error("Trainer.ini", ex);
            }
            return config;
        }
    }

    /// <summary>Opens the trainer page in the overlay once the overlay runs.</summary>
    /// <summary>
    /// The overlay has one page and one message queue for every script, and other StreamEmber mods (the chaos mod)
    /// have pages of their own: a script reads messages and sends only while its own page is the current one
    /// (<see cref="IsCurrent"/>). At startup the page is opened only if the overlay shows nothing yet; the menu key
    /// takes the overlay back (<see cref="Claim"/>).
    /// </summary>
    internal sealed class TrainerPage
    {
        private readonly string _url;
        private readonly string _key;
        private bool _requested;

        public TrainerPage(string url)
        {
            // ?v= keeps the page and the script of one release together in caches
            string version = ProductVersion;
            _url = url.IndexOf('?') < 0 && url.StartsWith("http", StringComparison.OrdinalIgnoreCase) && version != null
                ? url + "?v=" + Uri.EscapeDataString(version)
                : url;
            _key = Key(_url);
        }

        public string Url => _url;

        public static string ProductVersion
        {
            get
            {
                var attribute = (AssemblyInformationalVersionAttribute)Attribute.GetCustomAttribute(
                    typeof(TrainerPage).Assembly, typeof(AssemblyInformationalVersionAttribute));
                return attribute?.InformationalVersion;
            }
        }

        /// <summary>True while the overlay shows the trainer page (any version of it).</summary>
        public bool IsCurrent => Key(OverlayBridge.Url) == _key;

        /// <summary>Call every tick once the player is in the world. Opens the page if the overlay is still blank;
        /// another mod's page is left alone (the menu key calls <see cref="Claim"/>).</summary>
        public void Ensure()
        {
            if (_requested) return;
            _requested = true;
            string current = OverlayBridge.Url;
            if (string.IsNullOrEmpty(current) || current.Equals("about:blank", StringComparison.OrdinalIgnoreCase))
            {
                TrainerLog.Info("Opening " + _url);
                OverlayBridge.LoadUrl(_url);
            }
            else if (Key(current) == _key)
            {
                // Already open (scripts reloaded while the game kept running): ask the page to announce itself again
                Hello();
            }
            else
            {
                TrainerLog.Info("The overlay shows " + current + "; the trainer page opens with the menu key");
            }
        }

        /// <summary>Opens the trainer page now (menu key while another page is shown).</summary>
        public void Claim()
        {
            _requested = true;
            TrainerLog.Info("Opening " + _url + " (overlay showed " + (OverlayBridge.Url ?? "nothing") + ")");
            if (!OverlayBridge.LoadUrl(_url)) Hello();
        }

        /// <summary>Overlay went away (should not happen) or the script restarts: request again next time.</summary>
        public void Reset() => _requested = false;

        private static void Hello()
        {
            Ui.Begin("trainer:hello").BeginObject().EndObject();
            Ui.Send();
        }

        /// <summary>URL without query, fragment and trailing slash, lower case: ?v= and in-page anchors do not matter.</summary>
        public static string Key(string url)
        {
            if (string.IsNullOrEmpty(url)) return string.Empty;
            string key = url.Trim();
            int cut = key.IndexOfAny(new[] { '?', '#' });
            if (cut >= 0) key = key.Substring(0, cut);
            key = key.TrimEnd('/');
            if (key.EndsWith("/index.html", StringComparison.OrdinalIgnoreCase)) key = key.Substring(0, key.Length - 11);
            return key.ToLowerInvariant();
        }
    }

    internal static class Guard
    {
        /// <summary>Runs one part of a tick. Returns false (after logging) when it threw.</summary>
        public static bool Run(string area, Action action)
        {
            try
            {
                action();
                return true;
            }
            catch (Exception ex)
            {
                TrainerLog.Error(area, ex);
                return false;
            }
        }
    }
}
