// =====================================================================
//  engine.js — app state + the workout timer. Every workout is a flat list
//  of segments (see core.planFor). Position = (segIdx, seconds remaining).
//  While running, the rest of the plan is laid out in absolute wall-clock
//  time (the timeline), so the display can't drift while iOS freezes the
//  app, and the same timeline drives notifications and the Live Activity.
// =====================================================================

// ----- App state -----
let currentProgram = store.get('program', 'fightclub');
if (!PROGRAMS[currentProgram]) currentProgram = 'fightclub';
let workoutData = PROGRAMS[currentProgram].days;
let currentDay = 1;
let activeWorkout = null;     // today's workout with back-friendly swaps applied

let settings = Object.assign(
    { sound: true, notifications: true, autoAdvance: true, voice: true, weightLb: 180, health: false },
    store.get('settings', {})
);
const saveSettings = () => store.set('settings', settings);

let completedDays = store.get('completedDays', []);
let completedExercises = store.get('completedExercises', {});
// Old builds stored bare day numbers shared by all programs
completedDays = completedDays.map(d => typeof d === 'number' ? `${currentProgram}-${d}` : d);

// ----- Timer state -----
let plan = [];
let segIdx = 0;
let segRemaining = 0;
let status = 'idle';          // 'idle' | 'running' | 'paused'
let sessionOpen = false;
let locked = false;
let timeline = [];            // [{ i, start, end }]
let timelineIndex = 0;
let phaseEndAt = 0;
let timerInterval = null;
let lastShownSecond = null;

const workout = () => activeWorkout || workoutData[currentDay];
const pad2 = n => String(n).padStart(2, '0');
const fmtMMSS = s => `${Math.floor(s / 60)}:${pad2(s % 60)}`;
const fmtClock = s => s < 60 ? String(s) : fmtMMSS(s);
const fmtSpeed = v => Number(v).toFixed(1);
const speedText = s => s.speed ? `${fmtSpeed(s.speed)} mph · ${s.grade}%` : '';
const totalPlanSeconds = () => plan.reduce((a, s) => a + s.dur, 0);

function remainingNow() {
    if (status === 'running') return Math.max(0, Math.ceil((phaseEndAt - Date.now()) / 1000));
    return segRemaining;
}

function elapsedSeconds() {
    let e = 0;
    for (let i = 0; i < segIdx; i++) e += plan[i].dur;
    return e + (plan[segIdx] ? plan[segIdx].dur - remainingNow() : 0);
}

function kcalSoFar() {
    const rem = remainingNow();
    const type = workout().type;
    let k = 0;
    plan.forEach((s, i) => {
        const secs = i < segIdx ? s.dur : (i === segIdx ? s.dur - rem : 0);
        k += segKcalPerMin(s, type, settings.weightLb) * secs / 60;
    });
    return Math.round(k);
}

const kcalTotalPlan = () => Math.round(plan.reduce((a, s) => a + segKcalPerMin(s, workout().type, settings.weightLb) * s.dur / 60, 0));

function nextNonRest(from) {
    for (let i = from; i < plan.length; i++) if (plan[i].kind !== 'rest') return plan[i];
    return null;
}

// ----- Tick -----
function syncTimer() {
    if (status !== 'running' || !timeline.length) return;
    const now = Date.now();
    const idx = timeline.findIndex(s => now < s.end);

    if (idx === -1) {
        const lastI = timeline[timeline.length - 1].i;
        if (lastI >= plan.length - 1) {
            finishSession();
        } else {
            // Manual mode: park at the start of the next block, paused
            clearInterval(timerInterval);
            timeline = [];
            segIdx = lastI + 1;
            segRemaining = plan[segIdx].dur;
            status = 'paused';
            playBeep(700, 120);
            renderSession();
            updateLiveActivity();
            saveState();
        }
        return;
    }

    if (idx !== timelineIndex) {
        const singleStep = idx === timelineIndex + 1;
        const prevSeg = plan[segIdx];
        timelineIndex = idx;
        segIdx = timeline[idx].i;
        phaseEndAt = timeline[idx].end;
        lastShownSecond = null;
        if (singleStep) {
            // Live flip while awake: cue here and cancel just this system
            // notification (never rebuild the chain mid-workout).
            cueEnter(plan[segIdx], prevSeg);
            cancelChainNotification(idx - 1);
        } // Multi-step jump = catching up after the phone was locked: stay silent.
        renderSession();
        updateLiveActivity();
        saveState();
    }

    const rem = remainingNow();
    if (rem !== lastShownSecond) {
        lastShownSecond = rem;
        if (rem <= 3 && rem > 0) playBeep(800, 90);
        tickSession();
        if (rem % 5 === 0) saveState();
    }
}

// ----- Session control -----
function run() {
    if (status === 'running' || !plan.length) return;
    const fresh = segRemaining === plan[segIdx].dur;
    status = 'running';
    timeline = buildTimeline(plan, segIdx, segRemaining, Date.now(), settings.autoAdvance);
    timelineIndex = 0;
    phaseEndAt = timeline[0].end;
    lastShownSecond = null;
    schedulePhaseEndNotification();
    if (liveActivityRunning) updateLiveActivity(); else startLiveActivity(liveActivityPayload());
    clearInterval(timerInterval);
    timerInterval = setInterval(syncTimer, 250);
    if (fresh) cueEnter(plan[segIdx], segIdx > 0 ? plan[segIdx - 1] : null);
    else playBeep(600, 90);
    renderSession();
    saveState();
}

function pause() {
    if (status !== 'running') return;
    segRemaining = remainingNow();
    status = 'paused';
    clearInterval(timerInterval);
    timeline = [];
    cancelPhaseEndNotification();
    updateLiveActivity();          // lock screen shows "Paused" instead of vanishing
    playBeep(400, 90);
    renderSession();
    saveState();
}

function togglePause() {
    if (locked) return;
    if (status === 'running') pause(); else run();
}

function halt() {
    if (status === 'running') segRemaining = remainingNow();
    clearInterval(timerInterval);
    status = 'idle';
    timeline = [];
    cancelPhaseEndNotification();
}

function openSession() {
    sessionOpen = true;
    document.body.classList.add('session-open');
    keepAwake(true);
}

function closeSession() {
    sessionOpen = false;
    locked = false;
    document.body.classList.remove('session-open');
    const el = document.getElementById('session');
    el.className = 'session';
    el.innerHTML = '';
    keepAwake(false);
}

function startSession(restart) {
    plan = planFor(workout());
    if (!plan.length) return;
    if (restart || segIdx >= plan.length) {
        segIdx = 0;
        segRemaining = plan[0].dur;
    }
    ensureDraft(restart);
    unlockAudio();
    openSession();
    run();
}

// Hold-to-end: stops the session but keeps the position and the draft, so
// the day page offers Resume.
function endSession() {
    if (draft) { draft.durationSec = elapsedSeconds(); draft.kcal = kcalSoFar(); persistDraft(); }
    halt();
    endLiveActivity();
    closeSession();
    saveState();
    loadWorkout();
    playBeep(500, 120);
}

function finishSession() {
    const durationSec = elapsedSeconds();
    const kcal = kcalSoFar();
    const lastSeg = plan[plan.length - 1];
    halt();
    endLiveActivity();
    closeSession();
    const rec = flushDraft(true, draft, { durationSec, kcal });
    segIdx = 0;
    segRemaining = plan[0] ? plan[0].dur : 0;
    completeWorkout(null, true);
    loadWorkout();
    openSummary(rec, lastSeg);
}

function jumpTo(i) {
    if (i < 0 || i >= plan.length) return;
    const wasRunning = status === 'running';
    clearInterval(timerInterval);
    cancelPhaseEndNotification();
    timeline = [];
    segIdx = i;
    segRemaining = plan[i].dur;
    status = 'paused';
    if (wasRunning) run();
    else { renderSession(); updateLiveActivity(); saveState(); }
}

function skipSeg() {
    if (locked) return;
    if (segIdx >= plan.length - 1) { finishSession(); return; }
    jumpTo(segIdx + 1);
}

// Previous / next real block (skips rests)
function prevMove() {
    if (locked) return;
    const s = plan[segIdx];
    const elapsed = s.dur - remainingNow();
    if (s.kind !== 'rest' && elapsed > 3) { jumpTo(segIdx); return; }
    for (let i = segIdx - 1; i >= 0; i--) if (plan[i].kind !== 'rest') { jumpTo(i); return; }
    jumpTo(0);
}

function nextMove() {
    if (locked) return;
    for (let i = segIdx + 1; i < plan.length; i++) if (plan[i].kind !== 'rest') { jumpTo(i); return; }
    finishSession();
}

function adjust(delta) {
    if (locked) return;
    const rem = Math.max(1, remainingNow() + delta);
    if (status === 'running') {
        clearInterval(timerInterval);
        cancelPhaseEndNotification();
        segRemaining = rem;
        status = 'paused';
        run();
    } else {
        segRemaining = rem;
        tickSession();
        updateLiveActivity();
        saveState();
    }
    playBeep(650, 60);
}

function toggleLock() {
    locked = !locked;
    haptic(ImpactStyle.Medium);
    renderSession();
}

// ----- Cues -----
function cueEnter(s, prev) {
    if (!s) return;
    if (s.kind === 'work') {
        if (prev && prev.kind !== 'block' && s.round > prev.round) {
            tones([880, 1100, 1320]);
            say(`Round ${s.round}. ${s.name}`);
        } else {
            tones([880, 1320]);
            say(s.name);
        }
    } else if (s.kind === 'rest') {
        tones([660, 440]);
        const n = nextNonRest(segIdx + 1);
        say(n ? `${s.name}. Next, ${n.name}` : s.name);
    } else {
        tones([700, 900]);
        say(s.speed ? `${s.name}. ${fmtSpeed(s.speed)} miles an hour, ${s.grade} percent` : s.name);
    }
}

// ----- Live Activity payload -----
function laLabel(s) {
    if (s.kind === 'rest') return `${s.name} ${s.dur}s`;
    if (s.kind === 'block') return s.speed ? `${s.name} · ${fmtSpeed(s.speed)} mph ${s.grade}%` : s.name;
    return s.name;
}

function liveActivityPayload() {
    const w = workout();
    const s = plan[segIdx];
    const rem = remainingNow();
    const running = status === 'running' && timeline.length;
    const upcoming = [];
    if (running) {
        for (let k = timelineIndex + 1; k < timeline.length && upcoming.length < 4; k++) {
            upcoming.push({ label: laLabel(plan[timeline[k].i]), at: timeline[k].start });
        }
    }
    let restOfPlan = rem;
    for (let i = segIdx + 1; i < plan.length; i++) restOfPlan += plan[i].dur;
    const isBlock = s.kind === 'block';
    const n = plan[segIdx + 1];
    const nn = nextNonRest(segIdx + 1);
    return {
        workoutTitle: w.title,
        exercise: s.name,
        details: s.kind === 'rest' ? (nn ? `Next: ${nn.name}` : '') : (isBlock ? speedText(s) : s.details),
        nextExercise: n ? laLabel(n) : '',
        phase: s.kind === 'work' ? 'WORK' : s.kind === 'rest' ? 'REST' : 'BLOCK',
        round: isBlock ? s.blockIdx + 1 : s.round,
        totalRounds: isBlock ? s.blockTotal : (w.rounds || 1),
        endTime: running ? phaseEndAt : Date.now() + rem * 1000,
        exerciseIndex: isBlock ? s.blockIdx + 1 : s.ex + 1,
        totalExercises: isBlock ? s.blockTotal : (w.exercises || []).length,
        upcoming,
        paused: status !== 'running',
        pausedRemaining: rem,
        workoutEnd: Date.now() + restOfPlan * 1000
    };
}

function updateLiveActivity() {
    if (!plan[segIdx]) return;
    updateLiveActivityWith(liveActivityPayload());
}

// ----- Notification chain: entry k fires at the end of timeline[k] -----
function notifText(n, prev, i) {
    if (n.kind === 'work') {
        if (prev && prev.kind !== 'block' && n.round > prev.round) {
            return { title: `Round ${n.round} · ${n.name}`, body: n.details || 'Go' };
        }
        return { title: `▶ ${n.name}`, body: n.details || 'Go' };
    }
    if (n.kind === 'rest') {
        const after = nextNonRest(i + 1);
        return { title: `${n.name} ${n.dur}s`, body: after ? `Next: ${after.name}${after.details ? ' · ' + after.details : ''}` : 'Last stretch' };
    }
    const mins = Math.round(n.dur / 60);
    return { title: n.name, body: n.speed ? `${fmtSpeed(n.speed)} mph · ${n.grade}% · ${mins} min` : `${n.details || ''} · ${mins} min` };
}

function buildPhaseNotificationChain() {
    const chain = [];
    for (let k = 0; k < timeline.length && chain.length < MAX_SCHEDULED_NOTIFICATIONS; k++) {
        const at = timeline[k].end;
        const nextT = timeline[k + 1];
        if (nextT) {
            chain.push({ at, ...notifText(plan[nextT.i], plan[timeline[k].i], nextT.i) });
        } else if (timeline[k].i >= plan.length - 1) {
            chain.push({ at, title: 'Workout complete 💪', body: `${workout().title} — done.` });
        } else {
            chain.push({ at, title: 'Ready for the next one', body: `Next: ${plan[timeline[k].i + 1].name}` });
        }
    }
    return chain;
}

// ----- Saved position (leaving the day, or the app being killed) -----
function saveState() {
    try {
        localStorage.setItem('timerState', JSON.stringify({
            program: currentProgram, day: currentDay, seg: segIdx,
            remaining: remainingNow(), running: status === 'running', savedAt: Date.now()
        }));
    } catch (e) {}
}

function readSavedPosition() {
    const s = store.get('timerState', null);
    if (!s || s.program !== currentProgram || s.day !== currentDay || typeof s.seg !== 'number') return null;
    if (s.seg >= plan.length) return null;
    if (Date.now() - s.savedAt > 12 * 3600 * 1000) return null;
    const remaining = Math.min(s.remaining, plan[s.seg].dur);
    if (!s.running) return { seg: s.seg, remaining: Math.max(1, remaining) };
    return advancePosition(plan, s.seg, remaining, Math.floor((Date.now() - s.savedAt) / 1000));
}
