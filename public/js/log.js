// =====================================================================
//  log.js — workout sessions and logged sets. One record per workout:
//  { id, date, program, day, title, type, startedAt, endedAt, durationSec,
//    kcal, completed, back, sets: [{ ex, round, load, reps, rir }] }
//  History, charts, PRs and progression all read from this one list.
// =====================================================================

const MAX_SESSIONS = 600;
let draft = null;            // the session being built right now

const loadSessions = () => store.get('sessions', []);

function saveSessions(list) {
    store.set('sessions', list.slice(-MAX_SESSIONS));
}

function localDate(ts = Date.now()) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function newDraft() {
    const w = workout();
    draft = {
        id: `${Date.now().toString(36)}`,
        date: localDate(),
        program: currentProgram,
        day: currentDay,
        title: w.title,
        type: w.type,
        startedAt: Date.now(),
        activeSec: 0,
        back: backRatingToday(),
        sets: []
    };
    store.set('sessionDraft', draft);
    return draft;
}

// Reuse today's unfinished draft for the same workout, otherwise start fresh
function ensureDraft(restart) {
    const saved = store.get('sessionDraft', null);
    if (!restart && saved && saved.program === currentProgram && saved.day === currentDay && saved.date === localDate()) {
        draft = saved;
        return draft;
    }
    if (saved && (restart || saved.program !== currentProgram || saved.day !== currentDay || saved.date !== localDate())) {
        flushDraft(false, saved);
    }
    return newDraft();
}

function persistDraft() {
    if (draft) store.set('sessionDraft', draft);
}

// Move a draft into the session list. Partial sessions are kept only if
// something happened (sets logged or 5+ minutes of work).
function flushDraft(completed, d = draft, extra = {}) {
    if (!d) return null;
    const rec = { ...d, ...extra, completed: !!completed, endedAt: Date.now() };
    rec.durationSec = Math.round(rec.durationSec ?? rec.activeSec ?? 0);
    delete rec.activeSec;
    const worthKeeping = completed || rec.sets.length > 0 || rec.durationSec >= 300;
    if (worthKeeping) {
        const list = loadSessions().filter(s => s.id !== rec.id);
        list.push(rec);
        saveSessions(list);
    }
    if (d === draft) draft = null;
    store.remove('sessionDraft');
    return worthKeeping ? rec : null;
}

function logSet(entry) {
    if (!draft) return;
    draft.sets = draft.sets.filter(s => !(s.ex === entry.ex && s.round === entry.round));
    draft.sets.push(entry);
    persistDraft();
}

// Add or replace a set on an already-saved session (the finish summary)
function addSetToSession(id, entry) {
    const list = loadSessions();
    const rec = list.find(s => s.id === id);
    if (!rec) return;
    rec.sets = (rec.sets || []).filter(s => !(s.ex === entry.ex && s.round === entry.round));
    rec.sets.push(entry);
    saveSessions(list);
}

const loggedSet = (ex, round) => draft && draft.sets.find(s => s.ex === ex && s.round === round);

// Previous sessions containing this exercise, newest first, as arrays of sets
function pastSetsFor(exName, excludeId) {
    return loadSessions()
        .filter(s => s.id !== excludeId && s.sets && s.sets.some(x => x.ex === exName))
        .sort((a, b) => b.startedAt - a.startedAt)
        .map(s => s.sets.filter(x => x.ex === exName).sort((a, b) => a.round - b.round));
}

// Pre-filled values for a set: last session's same round, else its last set,
// else a guess from the program text.
function ghostFor(seg) {
    const past = pastSetsFor(seg.name, draft && draft.id);
    const range = parseRepRange(seg.details);
    if (past.length) {
        const last = past[0];
        const same = last.find(s => s.round === seg.round) || last[last.length - 1];
        return { load: same.load, reps: same.reps, rir: same.rir ?? 2, from: 'last' };
    }
    return { load: guessLoad(seg.name, seg.details), reps: range ? range.lo : 10, rir: 2, from: 'guess' };
}

function nudgeFor(exName, details) {
    const range = parseRepRange(details);
    if (!range) return null;
    return progression(pastSetsFor(exName, draft && draft.id), range);
}

function nudgeText(n) {
    if (!n) return '';
    if (n.type === 'up') return `Topped the range twice at ${n.from} — try ${n.to} for set 1 today`;
    if (n.type === 'reps') return `Maxed out at ${n.from} — add a rep or slow the lowering to 3 s`;
    if (n.type === 'easy') return `Last time felt easy (4+ in the tank) — go heavier or add reps`;
    return '';
}

// Best reps at each load before this session, to spot PRs as they happen
function isPR(entry) {
    const prev = [];
    pastSetsFor(entry.ex, draft && draft.id).forEach(s => prev.push(...s));
    if (!prev.length) return false;
    const best = bestByLoad(prev);
    return best[entry.load] != null ? entry.reps > best[entry.load] : false;
}
