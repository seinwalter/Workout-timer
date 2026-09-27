// =====================================================================
//  core.js — pure logic, no DOM, no storage. Loaded by the app as a plain
//  script (functions become globals) and by `node --test` as a module.
// =====================================================================
(function () {
    'use strict';

    // ----- Loads you own (pairs of 25 and 35, one 50) -----
    const LOADS = ['BW', '25', '35', '50', '2×25', '25+35', '2×35', '25+50', '35+50'];
    const LOAD_LB = { BW: 0, '25': 25, '35': 35, '50': 50, '2×25': 50, '25+35': 60, '2×35': 70, '25+50': 75, '35+50': 85 };
    const SINGLE_LADDER = ['25', '35', '50'];
    const DOUBLE_LADDER = ['2×25', '25+35', '2×35', '25+50', '35+50'];

    // ----- Plan: every workout becomes a flat list of segments -----
    function blockSeg(b, idx, total) {
        return {
            kind: 'block', dur: Math.round(b.min * 60), name: b.name, details: b.details || '',
            speed: b.speed, grade: b.grade, blockIdx: idx, blockTotal: total, ex: -1, round: 0
        };
    }

    function planFor(w) {
        const segs = [];
        if (!w || w.type === 'rest') return segs;
        if (w.type === 'steady') {
            (w.blocks || []).forEach((b, i, a) => segs.push(blockSeg(b, i, a.length)));
            return segs;
        }
        const before = w.blocksBefore || [];
        const after = w.blocksAfter || [];
        const nBlocks = before.length + after.length;
        before.forEach((b, i) => segs.push(blockSeg(b, i, nBlocks)));
        const exs = w.exercises || [];
        const rounds = w.rounds || 1;
        for (let r = 1; r <= rounds; r++) {
            exs.forEach((ex, i) => {
                segs.push({
                    kind: 'work', dur: w.workTime, name: ex.name, details: ex.details || '',
                    speed: ex.speed, grade: ex.grade, ex: i, round: r, swapped: !!ex.swapped
                });
                const last = r === rounds && i === exs.length - 1;
                if (w.restTime > 0 && !last) {
                    segs.push({
                        kind: 'rest', dur: w.restTime, name: w.restName || 'Rest', details: w.restDetails || '',
                        speed: w.restSpeed, grade: w.restGrade, ex: i, round: r
                    });
                }
            });
        }
        after.forEach((b, i) => segs.push(blockSeg(b, before.length + i, nBlocks)));
        return segs;
    }

    // Absolute wall-clock layout of the rest of the plan. Manual mode stops
    // before each new work segment.
    function buildTimeline(plan, segIdx, segRemaining, now, autoAdvance) {
        const segs = [];
        let t = now;
        for (let i = segIdx; i < plan.length; i++) {
            if (i > segIdx && !autoAdvance && plan[i].kind === 'work') break;
            const dur = i === segIdx ? segRemaining : plan[i].dur;
            segs.push({ i, start: t, end: t + dur * 1000 });
            t += dur * 1000;
        }
        return segs;
    }

    // Walk a saved position forward by `gone` seconds (app killed while running)
    function advancePosition(plan, seg, remaining, gone) {
        while (gone > 0 && seg < plan.length) {
            if (gone < remaining) { remaining -= gone; gone = 0; }
            else { gone -= remaining; seg++; remaining = seg < plan.length ? plan[seg].dur : 0; }
        }
        if (seg >= plan.length) return null;
        return { seg, remaining: Math.max(1, remaining) };
    }

    // ----- Energy (net of resting, so the deficit math isn't double-counted) -----
    // ACSM walking equation
    function kcalPerMin(speed, grade, weightLb) {
        if (!speed) return 0;
        const S = speed * 26.82;
        const G = (grade || 0) / 100;
        const vo2 = 0.1 * S + 1.8 * S * G;
        return vo2 * (weightLb / 2.2046) / 1000 * 5;
    }

    // Kettlebell circuit ≈ 6 METs gross → 5 METs net
    function strengthKcalPerMin(weightLb) {
        return 5 * 3.5 * (weightLb / 2.2046) / 200;
    }

    function segKcalPerMin(seg, workoutType, weightLb) {
        if (seg.speed) return kcalPerMin(seg.speed, seg.grade, weightLb);
        if (workoutType === 'circuit' && (seg.kind === 'work' || seg.kind === 'rest')) return strengthKcalPerMin(weightLb);
        return 0;
    }

    // ----- Weekly streak -----
    const weekGoal = target => Math.max(1, target - 1);

    function weekStreak(history, doneThisWeek, targetThisWeek) {
        let streak = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].done >= weekGoal(history[i].target)) streak++;
            else break;
        }
        if (doneThisWeek >= weekGoal(targetThisWeek)) streak++;
        return streak;
    }

    // ----- Exercise parsing -----
    function parseRepRange(details) {
        if (!details) return null;
        const m = String(details).match(/(\d{1,2})\s*[-–]\s*(\d{1,2})(?!\s*(?:mph|%|sec|s\b|min))/);
        if (!m) return null;
        const lo = Number(m[1]), hi = Number(m[2]);
        if (!(lo > 0 && hi >= lo && hi <= 30)) return null;
        return { lo, hi };
    }

    const TIMED = /plank|wall sit|hold|mountain climber|dead hang|jumping jack|march|stretch|mobility|bird dog|dead bug|side plank|pulse/i;
    const BODYWEIGHT = /push-?ups?|pull-?ups?|dips|lunges? \(bw\)|bodyweight|burpee/i;

    function isLoggable(seg) {
        return seg && seg.kind === 'work' && !seg.speed && !TIMED.test(seg.name);
    }

    function guessLoad(name, details) {
        if (BODYWEIGHT.test(name)) return 'BW';
        const d = String(details || '');
        const dbl = d.match(/double\s*(25|35)s?/i);
        if (dbl) return `2×${dbl[1]}`;
        const single = d.match(/\b(25|35|50)\b/);
        if (single) return single[1];
        return '35';
    }

    function nextLoad(load) {
        if (load === 'BW') return null;
        let i = SINGLE_LADDER.indexOf(load);
        if (i >= 0) return i < SINGLE_LADDER.length - 1 ? SINGLE_LADDER[i + 1] : '2×25';
        i = DOUBLE_LADDER.indexOf(load);
        if (i >= 0 && i < DOUBLE_LADDER.length - 1) return DOUBLE_LADDER[i + 1];
        return null;
    }

    // Double progression. `sessions` = newest first, each an array of sets
    // [{load, reps, rir}] for ONE exercise. Returns {type:'up', from, to} |
    // {type:'easy'} | null.
    function progression(sessions, range) {
        if (!range || !sessions.length) return null;
        const last = sessions[0];
        if (!last.length) return null;
        const load = last[last.length - 1].load;
        const topped = s => s.length > 0 &&
            s.every(set => set.load === load && set.reps >= range.hi && (set.rir == null || set.rir <= 2));
        if (sessions.length >= 2 && topped(sessions[0]) && topped(sessions[1])) {
            const to = nextLoad(load);
            if (to) return { type: 'up', from: load, to };
            return { type: 'reps', from: load };     // top of what you own: add reps/tempo
        }
        const rirs = last.map(s => s.rir).filter(r => r != null);
        if (rirs.length && rirs.reduce((a, b) => a + b, 0) / rirs.length >= 4) return { type: 'easy', from: load };
        return null;
    }

    // Best reps at each load for one exercise, across all logged sets
    function bestByLoad(sets) {
        const best = {};
        sets.forEach(s => {
            if (s.reps == null) return;
            if (!best[s.load] || s.reps > best[s.load]) best[s.load] = s.reps;
        });
        return best;
    }

    function setVolume(set) {
        const lb = LOAD_LB[set.load] || 0;
        return lb > 0 ? lb * set.reps : set.reps;
    }

    // ----- Back safety -----
    function spineLoad(name) {
        const n = String(name).toLowerCase();
        if (/swing|snatch|clean|high pull|jump/.test(n)) return 'ballistic';
        if (/rdl|deadlift|bent-over row|gorilla row|windmill|good morning|figure-8|russian twist|sit-up/.test(n)) return 'moderate';
        return 'low';
    }

    const SWAP = 'back-friendly swap';
    function backSwap(ex, rating) {
        if (!rating || rating < 3) return ex;
        const n = ex.name.toLowerCase();
        const sw = (name, details) => ({ ...ex, name, details: `${details} · ${SWAP}`, swapped: ex.name });
        if (/swing/.test(n)) return sw('Glute Bridge', 'Slow reps, 2 s squeeze at the top · 12-15');
        if (/single-leg (rdl|deadlift)/.test(n)) {
            return rating >= 5 ? sw('Bird Dog', 'Slow, alternate sides, 5 s holds')
                               : sw('Kickstand RDL', 'Light bell, hand on the bench · 10-12 each side');
        }
        if (/clean & press/.test(n)) return sw('Half-Kneeling Press', 'Single bell, ribs down · 8-10 each side');
        if (/clean & squat/.test(n)) return sw('Goblet Squat', 'Chest up, full depth · 10-12');
        if (/high pull/.test(n)) return sw('Chest-Supported Row', 'Bench on incline, 35 lb · 10-12');
        if (/windmill|russian twist|sit-up/.test(n)) return sw('Side Plank', '30 s each side');
        if (/figure-8/.test(n)) return sw('Dead Bug', 'Slow, low back flat');
        if (rating >= 5 && /bent-over row|gorilla row/.test(n)) return sw('Chest-Supported Row', 'Bench on incline · 10-12');
        return ex;
    }

    function applyBackSwaps(workout, rating) {
        if (!workout || !workout.exercises || !rating || rating < 3) return workout;
        return { ...workout, exercises: workout.exercises.map(ex => backSwap(ex, rating)) };
    }

    const needsBackCheck = w => !!(w && w.exercises && w.exercises.some(ex => spineLoad(ex.name) !== 'low'));

    // ----- Eating window -----
    const WINDOW_HOURS = { '14:10': 10, '16:8': 8, '18:6': 6, 'OMAD': 1 };

    // Returns { state: 'eating'|'fasting', until: Date } for the given now.
    function fastingStatus(now, opens, preset) {
        const hours = WINDOW_HOURS[preset] || 8;
        const [h, m] = opens.split(':').map(Number);
        const openToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
        const candidates = [-1, 0, 1].map(d => {
            const o = new Date(openToday.getTime());
            o.setDate(o.getDate() + d);
            return { open: o, close: new Date(o.getTime() + hours * 3600e3) };
        });
        const current = candidates.find(c => now >= c.open && now < c.close);
        if (current) return { state: 'eating', until: current.close, hours };
        const next = candidates.find(c => c.open > now);
        return { state: 'fasting', until: next.open, hours };
    }

    const plannedMeals = preset => preset === 'OMAD' ? 1 : (WINDOW_HOURS[preset] || 8) <= 6 ? 2 : 3;

    const api = {
        LOADS, LOAD_LB, planFor, buildTimeline, advancePosition, kcalPerMin, strengthKcalPerMin,
        segKcalPerMin, weekGoal, weekStreak, parseRepRange, isLoggable, guessLoad, nextLoad,
        progression, bestByLoad, setVolume, spineLoad, backSwap, applyBackSwaps, needsBackCheck,
        WINDOW_HOURS, fastingStatus, plannedMeals
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else Object.assign(window, api);
})();
