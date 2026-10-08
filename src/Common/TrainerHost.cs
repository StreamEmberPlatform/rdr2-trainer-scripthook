// Hosting pieces shared by the StreamEmber trainers (same file in gtav-trainer-scripthook and rdr2-trainer-scripthook):
//   TrainerLog     <game>\StreamEmber\Logs\Trainer.log, errors throttled
//   TrainerConfig  <game>\StreamEmber\Config\Trainer.ini (UiUrl, MenuKey)
//   TrainerPage    asks the overlay to open the trainer page (the overlay ships no page; ours is on the CDN)
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
                        File.WriteAllText(path, line, new UTF8Encoding(false));  // new log per game session
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
    internal sealed class TrainerPage
    {
        private readonly string _url;
        private bool _requested;

        public TrainerPage(string url)
        {
            // ?v= keeps the page and the script of one release together in caches
            string version = ProductVersion;
            _url = url.IndexOf('?') < 0 && url.StartsWith("http", StringComparison.OrdinalIgnoreCase) && version != null
                ? url + "?v=" + Uri.EscapeDataString(version)
                : url;
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

        /// <summary>Call every tick while the overlay is ready. Returns true once the page was requested.</summary>
        public void Ensure()
        {
            if (_requested) return;
            _requested = true;
            TrainerLog.Info("Opening " + _url);
            if (!OverlayBridge.LoadUrl(_url))
            {
                // Already open (scripts reloaded while the game kept running): ask the page to announce itself again
                Ui.Begin("trainer:hello").BeginObject().EndObject();
                Ui.Send();
            }
        }

        /// <summary>Overlay went away (should not happen) or the script restarts: request again next time.</summary>
        public void Reset() => _requested = false;
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
