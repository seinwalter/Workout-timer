// =====================================================================
//  platform.js — native bridges (Capacitor plugins), audio, voice,
//  storage + backup. Everything that talks to iOS lives here.
// =====================================================================

const Capacitor = window.Capacitor || {};
const Haptics = Capacitor.Plugins?.Haptics;
const LocalNotifications = Capacitor.Plugins?.LocalNotifications;
const LiveActivity = Capacitor.Plugins?.LiveActivity;
const Health = Capacitor.Plugins?.Health;
const Preferences = Capacitor.Plugins?.Preferences;
const CapApp = Capacitor.Plugins?.App;

const ImpactStyle = { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' };

// ----- Storage -----
// localStorage is the working copy. iOS can evict web-view storage when the
// phone runs low on space, so every save is mirrored to native Preferences
// (when the plugin is installed) and restored on launch if it went missing.
const store = {
    get(key, fallback) {
        let v = null;
        try { v = localStorage.getItem(key); } catch (e) { return fallback; }
        if (v == null) return fallback;
        try { return JSON.parse(v); } catch (e) { return v; }   // older builds stored some raw strings
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
        scheduleBackup();
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch (e) {}
        scheduleBackup();
    }
};

const BACKUP_KEY = 'fc_backup_v1';

function snapshotAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k !== 'timerState') data[k] = localStorage.getItem(k);
    }
    return JSON.stringify({ app: 'fight-club', version: 1, savedAt: Date.now(), data });
}

function restoreSnapshot(json) {
    const parsed = JSON.parse(json);
    if (!parsed || parsed.app !== 'fight-club' || typeof parsed.data !== 'object') {
        throw new Error('That text is not a Fight Club backup');
    }
    Object.entries(parsed.data).forEach(([k, v]) => localStorage.setItem(k, v));
    return Object.keys(parsed.data).length;
}

let backupTimer = null;
function scheduleBackup() {
    if (!Preferences) return;
    clearTimeout(backupTimer);
    backupTimer = setTimeout(backupNow, 1500);
}

async function backupNow() {
    if (!Preferences) return;
    try { await Preferences.set({ key: BACKUP_KEY, value: snapshotAll() }); } catch (e) {}
}

// Returns true if storage was empty and a native backup was restored
async function restoreFromNativeIfEvicted() {
    if (!Preferences || localStorage.getItem('startDate')) return false;
    try {
        const { value } = await Preferences.get({ key: BACKUP_KEY });
        if (!value) return false;
        restoreSnapshot(value);
        return true;
    } catch (e) {
        return false;
    }
}

// ----- Off-phone backup file -----
// Everything above lives inside the app and is deleted with it, so once a
// week the app asks to save a copy elsewhere (iCloud Drive via the share
// sheet). Native needs the Filesystem + Share plugins; without them this falls
// back to Web Share, a download, then the clipboard.
const Filesystem = Capacitor.Plugins?.Filesystem;
const Share = Capacitor.Plugins?.Share;
const isNativeApp = !!(Capacitor.isNativePlatform && Capacitor.isNativePlatform());
const EXPORT_KEY = 'lastBackupExport';

function backupFileName() {
    const d = new Date();
    return `FightClub-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
}

function markExported(how) {
    store.set(EXPORT_KEY, Date.now());
    return how;
}

// Resolves 'file' when a backup file was handed off, 'copied' when it fell
// back to the clipboard, or null when the user cancelled or nothing worked.
async function exportBackupFile() {
    const json = snapshotAll();
    const name = backupFileName();

    if (Filesystem && Share) {
        let uri = null;
        try {
            uri = (await Filesystem.writeFile({ path: name, data: json, directory: 'DOCUMENTS', encoding: 'utf8' })).uri;
        } catch (e) {}
        if (uri) {
            try {
                await Share.share({ title: 'Fight Club backup', dialogTitle: 'Save your Fight Club backup', files: [uri] });
                return markExported('file');
            } catch (e) {
                return null;   // share sheet dismissed
            }
        }
    }

    // Phones/tablets: the Web Share sheet has "Save to Files" (and works in a
    // home-screen web app, where downloads don't). Desktops: plain download.
    try {
        const file = new File([json], name, { type: 'application/json' });
        if (navigator.maxTouchPoints > 0 && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Fight Club backup' });
            return markExported('file');
        }
    } catch (e) {
        if (e && e.name === 'AbortError') return null;
    }

    if (!isNativeApp) {
        try {
            const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            return markExported('file');
        } catch (e) {}
    }

    try {
        await navigator.clipboard.writeText(json);
        return markExported('copied');
    } catch (e) {
        return null;
    }
}

function lastExportText() {
    const t = Number(store.get(EXPORT_KEY, 0)) || 0;
    if (!t) return 'never';
    const days = Math.floor((Date.now() - t) / 86400000);
    return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

// ----- Haptics -----
async function haptic(style = ImpactStyle.Light) {
    try { if (Haptics) await Haptics.impact({ style }); } catch (e) {}
}

// ----- Audio + voice -----
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioContext = AudioCtx ? new AudioCtx() : null;

function unlockAudio() {
    try { if (audioContext && audioContext.state === 'suspended') audioContext.resume(); } catch (e) {}
}

function playBeep(frequency = 800, duration = 100) {
    if (frequency >= 900) haptic(ImpactStyle.Heavy);
    else if (frequency >= 700) haptic(ImpactStyle.Medium);
    else haptic(ImpactStyle.Light);

    if (!settings.sound || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = frequency;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.6, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {}
}

function tones(freqs, gap = 140) {
    freqs.forEach((f, k) => setTimeout(() => playBeep(f, 150), k * gap));
}

function say(text) {
    if (!settings.voice || !settings.sound || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
    } catch (e) {}
}

// ----- In-app banner -----
function showNotification(title, message, force) {
    if (!settings.notifications && !force) return;
    if (sessionOpen && !force) return;
    haptic(ImpactStyle.Medium);
    const el = document.createElement('div');
    el.className = 'notification';
    el.innerHTML = `<div class="notification-title">${title}</div><div class="notification-message">${message}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// ----- Local notifications -----
async function requestNotificationPermission() {
    if (!LocalNotifications) return;
    try {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display === 'prompt') await LocalNotifications.requestPermissions();
    } catch (e) {}
}

const PHASE_NOTIFICATION_BASE_ID = 1001;
const MAX_SCHEDULED_NOTIFICATIONS = 60; // iOS caps pending at 64 (4 left for the eating window)

async function schedulePhaseEndNotification() {
    if (!LocalNotifications || !settings.notifications) return;
    try {
        await cancelPhaseEndNotification();
        const chain = buildPhaseNotificationChain();
        if (!chain.length) return;
        await LocalNotifications.schedule({
            notifications: chain.map((n, i) => ({
                id: PHASE_NOTIFICATION_BASE_ID + i,
                title: n.title,
                body: n.body,
                // 1s after the flip so foreground JS can cancel first
                schedule: { at: new Date(n.at + 1000), allowWhileIdle: true },
                sound: 'default'
            }))
        });
    } catch (e) {
        console.log('Failed to schedule notifications:', e);
    }
}

async function cancelPhaseEndNotification() {
    if (!LocalNotifications) return;
    try {
        await LocalNotifications.cancel({
            notifications: Array.from({ length: MAX_SCHEDULED_NOTIFICATIONS }, (_, i) => ({ id: PHASE_NOTIFICATION_BASE_ID + i }))
        });
    } catch (e) {}
}

async function cancelChainNotification(chainIndex) {
    if (!LocalNotifications || chainIndex < 0 || chainIndex >= MAX_SCHEDULED_NOTIFICATIONS) return;
    try { await LocalNotifications.cancel({ notifications: [{ id: PHASE_NOTIFICATION_BASE_ID + chainIndex }] }); } catch (e) {}
}

// ----- Live Activity -----
let liveActivityRunning = false;

async function startLiveActivity(payload) {
    if (!LiveActivity) return;
    try {
        await LiveActivity.start(payload);
        liveActivityRunning = true;
    } catch (e) {
        console.log('Live Activity unavailable:', e);
    }
}

async function updateLiveActivityWith(payload) {
    if (!LiveActivity || !liveActivityRunning) return;
    try { await LiveActivity.update(payload); } catch (e) {}
}

async function endLiveActivity() {
    if (!LiveActivity || !liveActivityRunning) return;
    liveActivityRunning = false;
    try { await LiveActivity.end(); } catch (e) {}
}

// ----- Keep the screen on while a workout is open -----
let webWakeLock = null;
async function keepAwake(on) {
    try { if (LiveActivity && LiveActivity.setKeepAwake) await LiveActivity.setKeepAwake({ enabled: on }); } catch (e) {}
    try {
        if (on && navigator.wakeLock && !webWakeLock) webWakeLock = await navigator.wakeLock.request('screen');
        if (!on && webWakeLock) { await webWakeLock.release(); webWakeLock = null; }
    } catch (e) { webWakeLock = null; }
}

// ----- Apple Health -----
const healthAvailable = () => !!(Health && Health.saveWorkout);

async function healthConnect() {
    if (!healthAvailable()) throw new Error('Apple Health needs the updated native build');
    const { available } = await Health.isAvailable();
    if (!available) throw new Error('Health data is not available on this device');
    await Health.requestAuthorization();
    return true;
}

async function healthSaveWorkout(w) {
    if (!settings.health || !healthAvailable()) return { saved: false, reason: 'off' };
    try {
        await Health.saveWorkout(w);
        return { saved: true };
    } catch (e) {
        return { saved: false, reason: String(e && e.message || e) };
    }
}

// Pulls body-weight samples (last 120 days) into storage and updates the
// weight used for calorie estimates.
async function healthSyncWeight() {
    if (!settings.health || !healthAvailable()) return null;
    try {
        const { samples } = await Health.readBodyMass({ days: 120 });
        if (!samples || !samples.length) return null;
        const sorted = samples.map(s => ({ t: s.t, lb: Math.round(s.lb * 10) / 10 })).sort((a, b) => a.t - b.t);
        store.set('weights', sorted);
        const latest = sorted[sorted.length - 1];
        settings.weightLb = Math.round(latest.lb);
        saveSettings();
        return latest;
    } catch (e) {
        return null;
    }
}
