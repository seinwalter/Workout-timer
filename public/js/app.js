// =====================================================================
//  app.js — day page, back check-in, stats + weekly reset, settings,
//  backup, and startup.
// =====================================================================

// ----- Back check-in (per day) -----
function backRatingToday() {
    const r = store.get('backToday', null);
    return r && r.date === localDate() ? r.rating : 0;
}

function setBackRating(v) {
    store.set('backToday', { date: localDate(), rating: v });
    activeWorkout = applyBackSwaps(workoutData[currentDay], v);
    if (draft) { draft.back = v; persistDraft(); }
    haptic();
    loadWorkout();
}

// ----- Day / program selection -----
function stopEverything() {
    if (status !== 'idle') {
        if (draft) { draft.durationSec = elapsedSeconds(); draft.kcal = kcalSoFar(); persistDraft(); }
        halt();
        endLiveActivity();
    }
    if (sessionOpen) closeSession();
}

function selectDay(day) {
    stopEverything();
    currentDay = day;
    updateDayButtons();
    loadWorkout();
}

function selectProgram(id) {
    if (!PROGRAMS[id] || id === currentProgram) return;
    stopEverything();
    currentProgram = id;
    workoutData = PROGRAMS[id].days;
    store.set('program', id);
    updateProgramButtons();
    selectDay(currentDay);
    playBeep(600, 100);
}

function updateProgramButtons() {
    document.querySelectorAll('.program-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.program === currentProgram);
    });
}

const dayKey = (d = currentDay, p = currentProgram) => `${p}-${d}`;

function updateDayButtons() {
    document.querySelectorAll('.day-btn').forEach((btn, index) => {
        btn.classList.remove('active', 'completed');
        if (index + 1 === currentDay) btn.classList.add('active');
        if (completedDays.includes(dayKey(index + 1))) btn.classList.add('completed');
    });
}

// ----- Day page -----
function loadWorkout() {
    const base = workoutData[currentDay];
    activeWorkout = applyBackSwaps(base, backRatingToday());
    const w = workout();
    const container = document.getElementById('workoutContainer');
    plan = planFor(w);

    if (w.type === 'rest') {
        container.innerHTML = `
            <div class="rest-day">
                <h2>🌙 Rest Day</h2>
                <p style="color: #999; margin-bottom: 25px; line-height: 1.6;">${w.message}</p>
                <div class="warmup-list" style="text-align: left;">
                    ${w.activities.map(a => `<p>${a}</p>`).join('')}
                </div>
                <button class="timer-btn full primary" onclick="markDayComplete()" style="margin-top: 25px;">
                    <span>${completedDays.includes(dayKey()) ? '✓ Done' : '✓ Mark Complete'}</span>
                </button>
            </div>`;
        updateStats();
        return;
    }

    const saved = readSavedPosition();
    if (saved) { segIdx = saved.seg; segRemaining = saved.remaining; }
    else { segIdx = 0; segRemaining = plan[0].dur; }
    const inProgress = !!saved && !(segIdx === 0 && segRemaining === plan[0].dur);

    const exs = w.exercises || [];
    const minutes = Math.round(totalPlanSeconds() / 60);
    const kcal = kcalTotalPlan();
    const meta = w.type === 'steady'
        ? `${minutes} min • ${plan.length} blocks${kcal ? ` • ~${kcal} kcal net` : ''}`
        : `${minutes} min • ${w.rounds} rounds${exs.length > 1 ? ` × ${exs.length} moves` : ''}${kcal ? ` • ~${kcal} kcal` : ''}`;

    let html = `<div class="workout-title">${w.title}</div><div class="workout-meta">${meta}</div>`;

    const s = plan[segIdx];
    const first = plan.find(p => p.kind !== 'rest');
    let label, headline, sub;
    if (inProgress) {
        label = 'Paused here';
        headline = s.kind === 'rest' ? `${s.name} → ${(nextNonRest(segIdx + 1) || s).name}` : s.name;
        sub = s.kind === 'block'
            ? `${fmtMMSS(segRemaining)} left in this block${s.speed ? ' · ' + speedText(s) : ''}`
            : `Round ${s.round} of ${w.rounds} · ${fmtClock(segRemaining)}${segRemaining < 60 ? 's' : ''} left`;
    } else if (w.type === 'steady') {
        label = 'First up';
        headline = first.name;
        sub = first.speed ? `${speedText(first)} · ${Math.round(first.dur / 60)} min` : first.details;
    } else {
        label = 'First up';
        headline = first.name;
        sub = first.kind === 'block'
            ? `${speedText(first)} · ${Math.round(first.dur / 60)} min, then ${w.rounds} × ${w.workTime}s on / ${w.restTime}s off`
            : `${first.details}${first.details ? ' · ' : ''}${w.workTime}s on / ${w.restTime}s off`;
    }

    // Back check-in for days with swings, cleans, hinges
    const rating = backRatingToday();
    const backRow = needsBackCheck(base) ? `
        <div class="sc-label">Back today?</div>
        <div class="back-chips" role="group" aria-label="Back pain today, 0 to 10">
            ${[[0, '0'], [1, '1–2'], [3, '3–4'], [5, '5+']].map(([v, l]) => `<button class="${rating === v ? 'on' : ''}" onclick="setBackRating(${v})">${l}</button>`).join('')}
        </div>
        ${rating >= 3 ? `<div class="sc-swap">Swapped for your back: ${exs.filter(e => e.swapped).map(e => `${e.swapped} → ${e.name}`).join(' · ') || 'nothing needed'}</div>` : ''}` : '';

    // Progression nudges from logged history
    const nudges = exs.map(e => ({ e, n: nudgeFor(e.name, e.details) })).filter(x => x.n && x.n.type !== 'easy');
    const nudgeRow = nudges.length ? `<div class="sc-nudges">${nudges.slice(0, 3).map(x =>
        `<div>↑ <b>${x.e.name}</b> ${x.n.type === 'up' ? `ready for ${x.n.to}` : 'maxed out — add reps or slow the lowering'}</div>`).join('')}</div>` : '';

    html += `
        <div class="start-card">
            <div class="sc-label">${label}</div>
            <div class="sc-first">${headline}</div>
            <div class="sc-sub">${sub}</div>
            ${inProgress ? '' : backRow}
            ${nudgeRow}
            ${inProgress
                ? `<div class="start-row">
                       <button class="start-btn" onclick="startSession(false)">▶ Resume</button>
                       <button class="ghost-btn" onclick="startSession(true)">Start over</button>
                   </div>`
                : `<button class="start-btn" onclick="startSession(true)">▶ Start</button>`}
        </div>`;

    html += `<div class="collapsible-section">`;

    if (w.type === 'steady') {
        let t = 0;
        html += `<div class="plan-list">` + plan.map(b => {
            const from = t / 60, to = (t + b.dur) / 60;
            t += b.dur;
            return `<div><b>${from}–${to} min · ${b.name}</b><span>${speedText(b) || b.details}</span></div>`;
        }).join('') + `</div>`;
    }

    if (w.warmup) {
        html += `
            <button class="collapse-btn" onclick="toggleCollapse(this)">
                <span>🔥 Warm-up (5 min)</span><span>▼</span>
            </button>
            <div class="collapse-content">
                <div class="warmup-list" style="margin-top: 10px;">${w.warmup.map(item => `<p>${item}</p>`).join('')}</div>
            </div>`;
    }

    if (exs.length) {
        html += `
            <button class="collapse-btn" onclick="toggleCollapse(this)" style="margin-top: ${w.warmup ? '10px' : '0'};">
                <span>💪 All Exercises (${exs.length})</span><span>▼</span>
            </button>
            <div class="collapse-content">
                <div class="exercise-list" style="margin-top: 10px;">`;
        exs.forEach((exercise, index) => {
            const isCompleted = completedExercises[`${currentProgram}-${currentDay}-${index}`] || false;
            const load = spineLoad(exercise.name);
            html += `
                <div class="exercise-item ${isCompleted ? 'completed' : ''}" id="exercise-${index}">
                    <div class="exercise-header">
                        <div>
                            <div class="exercise-name">${exercise.name}${load !== 'low' ? ` <span class="spine ${load}">${load === 'ballistic' ? 'ballistic' : 'hinge'}</span>` : ''}</div>
                            <div class="exercise-details">${exercise.swapped ? `↳ instead of ${exercise.swapped} · ` : ''}${exercise.details}</div>
                        </div>
                        <input type="checkbox" class="exercise-checkbox" ${isCompleted ? 'checked' : ''} onchange="toggleExercise(${index})" aria-label="Done: ${exercise.name}">
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    }

    html += `</div>`;

    if (w.finisher) {
        html += `<div class="section-title">🔥 Finisher</div>
                 <div class="warmup-list">${w.finisher.map(item => `<p>${item}</p>`).join('')}</div>`;
    }
    if (w.cooldown) {
        html += `<div class="section-title">🧊 Cool-down</div>
                 <div class="warmup-list">${w.cooldown.map(item => `<p>${item}</p>`).join('')}</div>`;
    }

    const done = completedDays.includes(dayKey());
    html += `<button class="timer-btn full complete-btn" onclick="completeFromPage()" style="margin-top: 25px;">
                <span>${done ? '✓ Completed' : '✓ Mark Workout Complete'}</span>
             </button>`;

    container.innerHTML = html;
    updateStats();
}

function toggleCollapse(button) {
    const content = button.nextElementSibling;
    const arrow = button.querySelector('span:last-child');
    const open = content.classList.toggle('expanded');
    arrow.textContent = open ? '▲' : '▼';
}

function toggleExercise(index) {
    const key = `${currentProgram}-${currentDay}-${index}`;
    completedExercises[key] = !completedExercises[key];
    store.set('completedExercises', completedExercises);
    const el = document.getElementById(`exercise-${index}`);
    if (el) el.classList.toggle('completed', completedExercises[key]);
    playBeep(700, 80);
}

// ----- Completion + stats -----
function completeWorkout(message, quiet) {
    cancelPhaseEndNotification();
    endLiveActivity();
    const key = dayKey();
    if (!completedDays.includes(key)) {
        completedDays.push(key);
        store.set('completedDays', completedDays);
        tones([900, 1100]);
        if (!quiet) showNotification('Workout Complete!', message || 'Excellent work! 💪🔥');
    }
    updateDayButtons();
    updateStats();
    store.remove('timerState');
}

function completeFromPage() {
    stopEverything();
    const saved = store.get('sessionDraft', null);
    if (saved && saved.program === currentProgram && saved.day === currentDay) {
        flushDraft(true, saved);
    } else if (!completedDays.includes(dayKey())) {
        const w = workout();
        const list = loadSessions();
        list.push({
            id: Date.now().toString(36), date: localDate(), program: currentProgram, day: currentDay,
            title: w.title, type: w.type, startedAt: Date.now(), endedAt: Date.now(),
            durationSec: 0, kcal: 0, completed: true, manual: true, back: backRatingToday(), sets: []
        });
        saveSessions(list);
    }
    completeWorkout();
    segIdx = 0;
    segRemaining = plan[0] ? plan[0].dur : 0;
    loadWorkout();
}

function markDayComplete() {
    completeWorkout();
    loadWorkout();
}

const trainingDayCount = (p = currentProgram) => Object.values(PROGRAMS[p].days).filter(w => w.type !== 'rest').length;

// Unique weekdays this week with a completed training (non-rest) session, any program
function trainingDoneThisWeek() {
    const days = new Set();
    completedDays.forEach(k => {
        const [p, d] = String(k).split('-');
        const w = PROGRAMS[p] && PROGRAMS[p].days[d];
        if (w && w.type !== 'rest') days.add(Number(d));
    });
    return days.size;
}

function updateStats() {
    const lifetime = Number(store.get('lifetimeWorkouts', 0)) || 0;
    const done = trainingDoneThisWeek();
    const target = trainingDayCount();
    document.getElementById('totalWorkouts').textContent = lifetime + done;
    document.getElementById('weekProgress').innerHTML = `${done}<span class="stat-of">/${target}</span>`;
    document.getElementById('currentStreak').textContent = weekStreak(store.get('weekHistory', []), done, target);
    document.getElementById('progressFill').style.width = `${Math.min(100, done / target * 100)}%`;
}

// ----- Weekly reset (Mondays) -----
function getWeekKey(d = new Date()) {
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
    return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
}

function weekKeyToDate(key) {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(y, m - 1, d);
}

function checkWeeklyReset() {
    const key = getWeekKey();
    const stored = store.get('weekKey', null);
    if (stored === key) return false;
    if (stored) {
        const done = trainingDoneThisWeek();
        store.set('lifetimeWorkouts', (Number(store.get('lifetimeWorkouts', 0)) || 0) + done);
        const history = store.get('weekHistory', []);
        history.push({ week: stored, done, target: trainingDayCount() });
        const gapWeeks = Math.round((weekKeyToDate(key) - weekKeyToDate(stored)) / (7 * 864e5)) - 1;
        for (let g = 0; g < Math.min(Math.max(gapWeeks, 0), 52); g++) history.push({ week: 'gap', done: 0, target: trainingDayCount() });
        store.set('weekHistory', history.slice(-104));
        completedDays = [];
        completedExercises = {};
        store.set('completedDays', []);
        store.set('completedExercises', {});
    }
    store.set('weekKey', key);
    return stored !== null;
}

// ----- Settings -----
function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
    updateSettingsUI();
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

function updateSettingsUI() {
    document.getElementById('soundToggle').classList.toggle('active', settings.sound);
    document.getElementById('voiceToggle').classList.toggle('active', settings.voice);
    document.getElementById('notificationToggle').classList.toggle('active', settings.notifications);
    document.getElementById('autoAdvanceToggle').classList.toggle('active', settings.autoAdvance);
    document.getElementById('healthToggle').classList.toggle('active', settings.health);
    document.getElementById('weightInput').value = settings.weightLb;
    updateBackupStatus();
}

function setSettingsNote(text) {
    const el = document.getElementById('settingsNote');
    el.textContent = text;
    el.hidden = !text;
}

function toggleSound() { settings.sound = !settings.sound; saveSettings(); updateSettingsUI(); if (settings.sound) playBeep(800, 100); }
function toggleVoice() { settings.voice = !settings.voice; saveSettings(); updateSettingsUI(); if (settings.voice) say('Voice cues on'); }

function toggleNotifications() {
    settings.notifications = !settings.notifications;
    saveSettings();
    updateSettingsUI();
    if (settings.notifications) requestNotificationPermission();
    else cancelPhaseEndNotification();
}

function toggleAutoAdvance() { settings.autoAdvance = !settings.autoAdvance; saveSettings(); updateSettingsUI(); playBeep(700, 80); }

async function toggleHealth() {
    if (settings.health) {
        settings.health = false;
        saveSettings();
        updateSettingsUI();
        setSettingsNote('Apple Health off. Workouts already saved stay in Health.');
        return;
    }
    try {
        await healthConnect();
        settings.health = true;
        saveSettings();
        updateSettingsUI();
        const latest = await healthSyncWeight();
        updateSettingsUI();
        setSettingsNote(latest ? `Connected. Latest weight ${latest.lb} lb — used for calorie estimates.` : 'Connected. Workouts will be saved to Apple Health.');
        loadWorkout();
    } catch (e) {
        setSettingsNote(`Couldn't connect to Apple Health: ${e.message || e}. If this says "entitlement", add the HealthKit capability in Xcode.`);
    }
}

function setWeight(value) {
    const n = Math.round(Number(value));
    if (n >= 80 && n <= 400) {
        settings.weightLb = n;
        saveSettings();
        if (!sessionOpen) loadWorkout();
    } else {
        updateSettingsUI();
    }
}

// ----- Backup -----
async function saveBackupFile() {
    const how = await exportBackupFile();
    if (how === 'file') setSettingsNote('Backup saved.');
    else if (how === 'copied') setSettingsNote('Backup copied. Paste it into Notes or email it to yourself.');
    updateBackupStatus();
}

function updateBackupStatus() {
    document.getElementById('backupStatus').textContent = `Last saved off this ${isNativeApp ? 'phone' : 'device'}: ${lastExportText()}`;
}

async function copyBackup() {
    const json = snapshotAll();
    const box = document.getElementById('backupText');
    try {
        await navigator.clipboard.writeText(json);
        markExported('copied');
        updateBackupStatus();
        setSettingsNote('Backup copied. Paste it into Notes or email it to yourself.');
    } catch (e) {
        box.hidden = false;
        box.value = json;
        box.select();
        setSettingsNote('Select all in the box and copy it.');
    }
}

function showRestore() {
    const box = document.getElementById('backupText');
    box.hidden = false;
    box.value = '';
    box.placeholder = 'Paste a backup here, then tap Restore';
    document.getElementById('restoreBtn').hidden = false;
    box.focus();
}

function restoreBackup() {
    applyRestore(document.getElementById('backupText').value.trim());
}

function pickRestoreFile() {
    document.getElementById('restoreFile').click();
}

function restoreFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyRestore(String(reader.result || '').trim());
    reader.onerror = () => setSettingsNote('Could not read that file.');
    reader.readAsText(file);
}

function applyRestore(json) {
    try {
        const n = restoreSnapshot(json);
        backupNow();
        setSettingsNote(`Restored ${n} items. Reloading…`);
        setTimeout(() => location.reload(), 800);
    } catch (e) {
        setSettingsNote(e.message || 'That backup could not be read.');
    }
}

// ----- Weekly off-phone backup reminder -----
// Shown at most once a day, never mid-workout or over another sheet.
function hasProgress() {
    return (Number(store.get('lifetimeWorkouts', 0)) || 0) > 0 || loadSessions().length > 0;
}

function maybePromptBackup() {
    if (sessionOpen || !hasProgress() || document.querySelector('.modal.active')) return;
    const now = Date.now();
    if (now - (Number(store.get(EXPORT_KEY, 0)) || 0) < 7 * 86400000) return;
    if (now < (Number(store.get('backupPromptSnooze', 0)) || 0)) return;
    store.set('backupPromptSnooze', now + 86400000);
    document.getElementById('backupLastText').textContent = lastExportText();
    document.getElementById('backupHint').hidden = !(isNativeApp || navigator.maxTouchPoints > 0);
    document.getElementById('backupModal').classList.add('active');
}

async function backupNowFromPrompt() {
    const how = await exportBackupFile();
    if (!how) return;   // cancelled: leave the reminder up
    closeBackupPrompt();
    showNotification('Backup saved', how === 'copied' ? 'Copied. Paste it into Notes or email it to yourself.' : 'Your history is safe off the app.', true);
}

function closeBackupPrompt() {
    document.getElementById('backupModal').classList.remove('active');
}

function resetAllProgress() {
    if (confirm('Reset all progress, history and logged sets? This cannot be undone.')) {
        stopEverything();
        localStorage.clear();
        backupNow();
        location.reload();
    }
}

// ----- Keyboard (desktop browser) -----
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === ' ' && sessionOpen) { e.preventDefault(); togglePause(); }
});

['settingsModal', 'historyModal', 'backupModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
        if (e.target.id === id) document.getElementById(id).classList.remove('active');
    });
});

// ----- Startup -----
async function init() {
    if (await restoreFromNativeIfEvicted()) { location.reload(); return; }
    if (!localStorage.getItem('startDate')) store.set('startDate', Date.now());
    store.set('completedDays', completedDays);

    checkWeeklyReset();
    requestNotificationPermission();
    updateProgramButtons();

    renderEatCard();
    scheduleEatNotifications();
    setInterval(eatTick, 1000);

    selectDay(new Date().getDay() || 7);

    if (settings.health) healthSyncWeight().then(latest => { if (latest && !sessionOpen) loadWorkout(); });
    setTimeout(maybePromptBackup, 1500);
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', saveState);

// Re-sync to the wall clock whenever the app comes back from lock/background
function onAppResume() {
    if (checkWeeklyReset() && !sessionOpen) {
        updateDayButtons();
        loadWorkout();
    }
    syncTimer();
    if (sessionOpen) tickSession();
    renderEatCard();
    maybePromptBackup();
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) onAppResume();
    else { saveState(); backupNow(); }
});

if (CapApp) {
    CapApp.addListener('appStateChange', state => {
        if (state.isActive) onAppResume(); else { saveState(); backupNow(); }
    });
    CapApp.addListener('resume', () => onAppResume());
}

document.addEventListener('click', unlockAudio, { once: true });
