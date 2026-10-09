// StreamEmber Trainer (RDR2) — StreamEmber Runtime (RDR2) script driving an MHud UI through the StreamEmber overlay.
//
//   F5            open / close the big trainer menu (Trainer.ini MenuKey). It opens in UI input mode: mouse and keyboard
//                 go to the page (Trainer.ini MenuMouse=0: the game keeps the mouse, the menu keys are forwarded:
//                 ↑ ↓ ← → Enter Backspace Esc Q E, or numpad 8 2 4 6 5 0)
//   F7 / F8       overlay show/hide, mouse+keyboard to the UI (backend hotkeys, see StreamEmber\Config\Overlay.ini)
//
// The page is not installed with the game: the trainer opens its published page (GitHub Pages, MHud kit from the
// jsDelivr CDN) in the overlay. Trainer.ini UiUrl points somewhere else (e.g. a local dev server).
// Every part of a tick runs guarded (Guard.Run): an exception is logged to StreamEmber\Logs\Trainer.log and only
// that part is skipped for that frame; the script itself never dies and never takes the game down.
//
// Message flow: C# -> page uses MHud's NUI protocol ({ action, data }, see MHud/integration/mhud/client/main.lua) plus
// trainer:menu / trainer:state / trainer:inventory for the big menu (web/menu.js); page -> C# uses MHud callbacks
// ({ cb, data }: ready, ack, atlasReady) and { cb: "trainer", data: { op, ... } } for the menu commands (Trainer.cs).
// The menu key is read with GetAsyncKeyState every tick: in UI input mode the overlay keeps the key messages from
// the game window, so a KeyDown event alone would not see F5 to close the menu.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using RDR2;
using StreamEmber.Overlay;

namespace StreamEmber.Trainers
{
    public sealed class TrainerScript : Script
    {
        // Game controls the menu keys would otherwise trigger: frontend navigation, wheels, journal, satchel
        private static readonly eInputType[] MenuBlockedControls =
        {
            eInputType.FrontendUp, eInputType.FrontendDown, eInputType.FrontendLeft, eInputType.FrontendRight,
            eInputType.FrontendAccept, eInputType.FrontendCancel, eInputType.OpenWheelMenu, eInputType.SelectItemWheel,
            eInputType.OpenJournal, eInputType.OpenSatchelMenu, eInputType.QuickUseItem, eInputType.Whistle,
        };

        private readonly WorldTags _tags = new WorldTags(new RdrTagWorld());
        private readonly HudFeed _hud = new HudFeed();
        private readonly Trainer _trainer;
        private readonly Stopwatch _clock = Stopwatch.StartNew();
        private readonly Stopwatch _tickTimer = new Stopwatch();
        private long _nextPerf;
        private long _lastPerf;
        private long _bytesAtLastPerf;
        private long _messagesAtLastPerf;
        private double _gameFps;
        private double _avgTickMs;
        private bool _announcedNotInstalled;
        private bool _paused;   // death / respawn / loading / fade: trainer work suspended
        private readonly TrainerConfig _config;
        private readonly TrainerPage _page;
        private bool _menuKeyDown;
        private IntPtr _gameWindow;

        public const string DefaultUiUrl = "https://streamemberplatform.github.io/rdr2-trainer-scripthook/";

        public TrainerScript()
        {
            _config = TrainerConfig.Load(DefaultUiUrl);
            _page = new TrainerPage(_config.UiUrl);
            TrainerLog.Info("StreamEmber Trainer (RDR2) " + TrainerPage.ProductVersion + ", page " + _page.Url);
            _trainer = new Trainer(_tags, _hud) { MenuMouse = ReadMenuMouse() };
            Tick += OnTick;
            KeyDown += OnKeyDown;
            Aborted += (s, e) => Guard.Run("Shutdown", _trainer.Shutdown);
        }

        private void OnTick(object sender, EventArgs e)
        {
            try
            {
                TickGuarded();
            }
            catch (Exception ex)
            {
                // Never let an exception out of Tick: the runtime would stop the script
                TrainerLog.Error("Tick", ex);
            }
        }

        private void TickGuarded()
        {
            OverlayState state = OverlayBridge.State;
            if (state != OverlayState.Ready)
            {
                if (state == OverlayState.NotInstalled && !_announcedNotInstalled)
                {
                    _announcedNotInstalled = true;
                    TrainerLog.Warn("StreamEmber Overlay not installed or not compatible (needs overlay API " + OverlayBridge.ApiVersion + ").");
                    Guard.Run("Notify", () => Native.Notify("StreamEmber Trainer: StreamEmber Overlay kurulu değil ya da sürümü uyumsuz."));
                }
                return;
            }

            _tickTimer.Restart();
            if (_page.IsCurrent)
            {
                Guard.Run("Messages", ReadMessages);
            }
            else if (Ui.Ready || _trainer.MenuOpen)
            {
                // Another mod (the chaos mod) loaded its page: stop sending until the menu key brings ours back
                TrainerLog.Info("The overlay switched to " + OverlayBridge.Url + "; trainer page detached");
                Ui.Ready = false;
                _trainer.DetachMenu();
                Guard.Run("Tags.Clear", _tags.Clear);
            }

            Player player = Game.Player;
            Ped ped = player.Character;
            float dt = Game.FrameTime;
            if (dt > 0) _gameFps = _gameFps <= 0 ? 1.0 / dt : _gameFps * 0.95 + (1.0 / dt) * 0.05;

            // Input: UI mode (F8) owns mouse+keyboard; menu mode only blocks the menu keys
            bool uiInput = OverlayBridge.Visible && OverlayBridge.InputMode == OverlayInputMode.Ui;
            if (uiInput)
            {
                Game.DisableAllControlsThisFrame();
            }
            else if (_trainer.MenuOpen)
            {
                foreach (eInputType c in MenuBlockedControls) Native.DisableControl(c);
            }

            // Death, respawn, loading screens and fades: the game is streaming the world and runs its own scripted
            // sequence. World tags read every nearby ped/vehicle with several natives each, so stay out of the way
            // until the screen is back (no time limit: trainer 1.0.1 kept working through long fades and the game
            // window went blank when the game started).
            bool busy = ped == null || !ped.Exists() || ped.IsDead || Game.IsLoading ||
                        Game.IsScreenFadedOut || Game.IsScreenFadingOut || Game.IsScreenFadingIn;
            if (busy != _paused)
            {
                _paused = busy;
                if (busy)
                {
                    Guard.Run("Tags.Clear", _tags.Clear);
                    _trainer.Suspend();
                }
            }

            Guard.Run("MenuKey", PollMenuKey);

            // The page is opened only once the player is in the world: while the game is still loading and setting up
            // its swap chain the overlay draws nothing heavier than about:blank.
            if (!busy) _page.Ensure();

            if (!busy) Guard.Run("Trainer", () => _trainer.Tick(player, ped, dt));

            if (Ui.Ready && !busy)
            {
                Guard.Run("Hud", () => _hud.Tick(player, ped));
                if (!Guard.Run("Tags", () => _tags.Tick(Game.FrameCount)))
                {
                    Guard.Run("Tags.Clear", _tags.Clear);  // start clean next frame
                }
                Guard.Run("Perf", PublishPerf);
            }

            _tickTimer.Stop();
            _avgTickMs = _avgTickMs * 0.95 + _tickTimer.Elapsed.TotalMilliseconds * 0.05;
        }

        private void ReadMessages()
        {
            while (OverlayBridge.TryReceive(out string json))
            {
                if (!(MiniJson.Parse(json) is IDictionary<string, object> msg)) continue;
                IDictionary<string, object> data = msg.Obj("data");
                switch (msg.Str("cb"))
                {
                    case "ready":
                        // app.js loaded (first time or after a page reload); a late "ready" of another mod's page
                        // (it names its app) does not count
                        string app = data?.Str("app");
                        if (app != null && app != "trainer") break;
                        Ui.Ready = true;
                        _tags.OnPageReady();
                        _hud.PushConfig();
                        _trainer.OnPageReady();
                        break;
                    case "trainer":
                        _trainer.OnCommand(data);
                        break;
                    case "ack":
                        _tags.OnAck((int)data.Num("seq"), Game.FrameCount);
                        break;
                    case "atlasReady":
                        if (data != null && data.TryGetValue("s", out object pairs)) _tags.OnAtlasReady(pairs as List<object>);
                        break;
                }
            }
        }

        private void PublishPerf()
        {
            long now = _clock.ElapsedMilliseconds;
            if (now < _nextPerf) return;
            long elapsed = now - _lastPerf;
            _lastPerf = now;
            _nextPerf = now + 500;

            long bytes = Ui.BytesSent - _bytesAtLastPerf;
            long messages = Ui.MessagesSent - _messagesAtLastPerf;
            _bytesAtLastPerf = Ui.BytesSent;
            _messagesAtLastPerf = Ui.MessagesSent;
            double seconds = Math.Max(0.001, elapsed / 1000.0);

            Ui.Begin("trainer:perf").BeginObject()
                .Prop("show", _trainer.ShowPerfPanel)
                .Prop("gameFps", (float)_gameFps, "0.0")
                .Prop("tags", _tags.LastCount)
                .Prop("collectMs", (float)_tags.AvgCollectMs, "0.00")
                .Prop("tickMs", (float)_avgTickMs, "0.00")
                .Prop("tagMsgs", _tags.TagMessagesPerSecond)
                .Prop("msgs", (float)(messages / seconds), "0")
                .Prop("kbps", (float)(bytes / seconds / 1024.0), "0.0")
                .Prop("rttMs", (float)_tags.RttMs, "0.0")
                .Prop("rttFrames", (float)_tags.RttFrames, "0.0")
                .Prop("radius", (int)_tags.Radius)
                .Prop("max", _tags.MaxCount)
                .Prop("rate", _tags.RateHz)
                .Prop("mode", _tags.Positioning == WorldTags.Mode.Atlas ? "atlas" : "html")
                .Prop("delay", OverlayBridge.SpriteDelay)
                .Prop("predict", _tags.PredictFrames)
                .Prop("slots", _tags.AtlasSlots)
                .Prop("contentUpdates", _tags.ContentUpdatesPerSecond)
                .Prop("distStep", _tags.DistanceStep)
                .Prop("refs", _tags.NativeReferences)
                .Prop("spin", (int)_trainer.CameraSpinDegreesPerSecond)
                .EndObject();
            Ui.Send();
        }

        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            Guard.Run("KeyDown", () => HandleKey(e));
        }

        private void HandleKey(KeyEventArgs e)
        {
            // The menu key itself is polled in PollMenuKey. While the UI has the keyboard (UI input mode) the page
            // receives the keys directly; otherwise the menu keys are forwarded.
            if (!_trainer.MenuOpen || OverlayBridge.InputMode == OverlayInputMode.Ui) return;

            string key = null;
            switch (e.KeyCode)
            {
                case Keys.Up: case Keys.NumPad8: key = "ArrowUp"; break;
                case Keys.Down: case Keys.NumPad2: key = "ArrowDown"; break;
                case Keys.Left: case Keys.NumPad4: key = "ArrowLeft"; break;
                case Keys.Right: case Keys.NumPad6: key = "ArrowRight"; break;
                case Keys.Enter: case Keys.NumPad5: key = "Enter"; break;
                case Keys.Back: case Keys.NumPad0: key = "Backspace"; break;
                case Keys.Escape: key = "Escape"; break;
                case Keys.Q: key = "q"; break;
                case Keys.E: key = "e"; break;
                case Keys.PageUp: key = "PageUp"; break;
                case Keys.PageDown: key = "PageDown"; break;
            }
            if (key == null) return;
            Ui.Begin("trainer:key").BeginObject().Prop("key", key).EndObject();
            Ui.Send();
        }

        /// <summary>Menu key edge, read from the keyboard state (works in both input modes), only while the game
        /// window has the focus.</summary>
        private void PollMenuKey()
        {
            bool down = (GetAsyncKeyState((int)_config.MenuKey) & 0x8000) != 0;
            if (down && !_menuKeyDown && IsGameFocused())
            {
                if (!_trainer.MenuOpen && !_page.IsCurrent)
                {
                    // Another mod's page is shown: bring ours back. Messages wait in the overlay until it has loaded;
                    // "ready" then sends the menu state again.
                    _page.Claim();
                }
                _trainer.ToggleMenu();
            }
            _menuKeyDown = down;
        }

        private bool IsGameFocused()
        {
            if (_gameWindow == IntPtr.Zero) _gameWindow = Process.GetCurrentProcess().MainWindowHandle;
            IntPtr foreground = GetForegroundWindow();
            if (foreground == _gameWindow) return true;
            // The main window handle can change once (splash -> game window): accept our own process' window
            GetWindowThreadProcessId(foreground, out uint pid);
            if (pid != (uint)Process.GetCurrentProcess().Id) return false;
            _gameWindow = foreground;
            return true;
        }

        /// <summary>Trainer.ini MenuMouse (RDR2 trainer only): 1 (default) = the menu opens in UI input mode.</summary>
        private static bool ReadMenuMouse()
        {
            try
            {
                string path = TrainerPaths.ConfigFile;
                if (!File.Exists(path)) return true;
                foreach (string raw in File.ReadAllLines(path))
                {
                    string line = raw.Trim();
                    if (!line.StartsWith("MenuMouse", StringComparison.OrdinalIgnoreCase)) continue;
                    int eq = line.IndexOf('=');
                    if (eq < 0) continue;
                    string v = line.Substring(eq + 1).Trim();
                    return !(v == "0" || v.Equals("false", StringComparison.OrdinalIgnoreCase));
                }
            }
            catch (Exception ex)
            {
                TrainerLog.Error("Trainer.ini MenuMouse", ex);
            }
            return true;
        }

        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int key);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    }
}
