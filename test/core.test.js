// Run with: npm test   (node --test, no dependencies)
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../www/js/core.js');
const { PROGRAMS } = require('../www/js/programs.js');

const UL = PROGRAMS.upperlower.days;
const FC = PROGRAMS.fightclub.days;

test('circuit plan: work + rest per move, no rest after the final move', () => {
    const plan = c.planFor(UL[6]);                     // 8 moves × 4 rounds
    assert.equal(plan.filter(s => s.kind === 'work').length, 32);
    assert.equal(plan.filter(s => s.kind === 'rest').length, 31);
    assert.equal(plan[plan.length - 1].kind, 'work');
    assert.equal(plan[0].name, 'KB Overhead Press');
});

test('HIIT plan: warm-up block, 10 intervals, cool-down block, all within 4 mph', () => {
    const plan = c.planFor(FC[2]);
    assert.equal(plan[0].kind, 'block');
    assert.equal(plan[plan.length - 1].kind, 'block');
    assert.equal(plan.filter(s => s.kind === 'work').length, 10);
    plan.forEach(s => { if (s.speed) assert.ok(s.speed <= 4.0, `${s.name} at ${s.speed} mph`); });
});

test('every treadmill segment in every program stays at or under 4.0 mph', () => {
    Object.values(PROGRAMS).forEach(p => Object.values(p.days).forEach(w => {
        c.planFor(w).forEach(s => { if (s.speed) assert.ok(s.speed <= 4.0, `${w.title}: ${s.name}`); });
    }));
});

test('steady plan: blocks add up to the stated 45 minutes', () => {
    const plan = c.planFor(UL[1]);
    assert.equal(plan.reduce((a, s) => a + s.dur, 0), 45 * 60);
});

test('rest days produce no plan', () => {
    assert.equal(c.planFor(UL[3]).length, 0);
});

test('timeline: absolute times chain end-to-start from the current position', () => {
    const plan = c.planFor(UL[6]);
    const tl = c.buildTimeline(plan, 0, 30, 1000, true);
    assert.equal(tl.length, plan.length);
    assert.equal(tl[0].end, 1000 + 30000);
    assert.equal(tl[1].start, tl[0].end);
    assert.equal(tl[1].end - tl[1].start, plan[1].dur * 1000);
});

test('timeline: manual mode stops before the next work block', () => {
    const plan = c.planFor(UL[6]);
    const tl = c.buildTimeline(plan, 0, 40, 0, false);
    assert.deepEqual(tl.map(t => plan[t.i].kind), ['work', 'rest']);
});

test('advancePosition walks through segments and returns null past the end', () => {
    const plan = c.planFor(UL[7]);                    // 40 s work / 50 s rest
    assert.deepEqual(c.advancePosition(plan, 0, 30, 100), { seg: 2, remaining: 20 });
    assert.equal(c.advancePosition(plan, 0, 30, 999999), null);
});

test('ACSM walking kcal matches hand calculation', () => {
    // 182 lb, 45 min: flat 4.0 mph ≈ 199, 10% ≈ 558 (net)
    assert.equal(Math.round(c.kcalPerMin(4.0, 0, 182) * 45), 199);
    assert.equal(Math.round(c.kcalPerMin(4.0, 10, 182) * 45), 558);
    assert.equal(c.kcalPerMin(0, 10, 182), 0);
});

test('weekly streak counts back through weeks that hit all but one day', () => {
    const h = [{ done: 2, target: 6 }, { done: 5, target: 6 }, { done: 6, target: 6 }];
    assert.equal(c.weekStreak(h, 1, 6), 2);           // this week not there yet
    assert.equal(c.weekStreak(h, 5, 6), 3);           // this week already counts
    assert.equal(c.weekStreak([], 0, 6), 0);
});

test('rep ranges parse from program text, ignoring speeds and inclines', () => {
    assert.deepEqual(c.parseRepRange('Double 25s or single 35 • 8-10 reps'), { lo: 8, hi: 10 });
    assert.deepEqual(c.parseRepRange('35 • 10-12 each leg'), { lo: 10, hi: 12 });
    assert.equal(c.parseRepRange('AMRAP — chest to floor'), null);
    assert.equal(c.parseRepRange('4.0 mph · 10-12% incline'), null);
});

test('load guesses from program text', () => {
    assert.equal(c.guessLoad('KB Overhead Press', 'Double 25s or single 35'), '2×25');
    assert.equal(c.guessLoad('KB Bent-Over Row', '50 lb • 10-12'), '50');
    assert.equal(c.guessLoad('Pull-Ups', 'Dead hang start'), 'BW');
});

test('load ladder: singles then doubles, nothing past 35+50', () => {
    assert.equal(c.nextLoad('25'), '35');
    assert.equal(c.nextLoad('50'), '2×25');
    assert.equal(c.nextLoad('2×35'), '25+50');
    assert.equal(c.nextLoad('35+50'), null);
    assert.equal(c.nextLoad('BW'), null);
});

test('double progression: two sessions at the top of the range → move up', () => {
    const range = { lo: 8, hi: 10 };
    const top = [{ load: '2×25', reps: 10, rir: 2 }, { load: '2×25', reps: 10, rir: 1 }];
    const short = [{ load: '2×25', reps: 9, rir: 1 }];
    assert.deepEqual(c.progression([top, top], range), { type: 'up', from: '2×25', to: '25+35' });
    assert.equal(c.progression([top, short], range), null);
    assert.equal(c.progression([top], range), null);
    assert.deepEqual(c.progression([[{ load: '35', reps: 8, rir: 4 }]], range), { type: 'easy', from: '35' });
});

test('best reps per load and set volume', () => {
    const sets = [{ load: '35', reps: 10 }, { load: '35', reps: 12 }, { load: '50', reps: 6 }];
    assert.deepEqual(c.bestByLoad(sets), { '35': 12, '50': 6 });
    assert.equal(c.setVolume({ load: '2×35', reps: 10 }), 700);
    assert.equal(c.setVolume({ load: 'BW', reps: 8 }), 8);
});

test('spine-load tags', () => {
    assert.equal(c.spineLoad('KB Swing'), 'ballistic');
    assert.equal(c.spineLoad('Single-Leg RDL'), 'moderate');
    assert.equal(c.spineLoad('KB Goblet Squat'), 'low');
});

test('back swaps kick in at 3+ and get stricter at 5+', () => {
    const lower = UL[7];
    assert.equal(c.applyBackSwaps(lower, 1), lower);
    const three = c.applyBackSwaps(lower, 3).exercises.map(e => e.name);
    assert.ok(three.includes('Glute Bridge') && !three.includes('KB Swing'));
    assert.ok(three.includes('Kickstand RDL'));
    const five = c.applyBackSwaps(lower, 5).exercises.map(e => e.name);
    assert.ok(five.includes('Bird Dog'));
    assert.ok(c.needsBackCheck(lower));
    assert.equal(c.needsBackCheck(UL[1]), false);
});

test('eating window status, including a window that crosses midnight', () => {
    const at = (h, m) => new Date(2026, 8, 27, h, m);
    assert.equal(c.fastingStatus(at(13, 0), '12:00', '16:8').state, 'eating');
    assert.equal(c.fastingStatus(at(21, 0), '12:00', '16:8').state, 'fasting');
    const s = c.fastingStatus(at(21, 0), '12:00', '16:8');
    assert.equal(s.until.getDate(), 28);
    assert.equal(c.fastingStatus(at(1, 0), '20:00', '16:8').state, 'eating');   // 8 pm–4 am
    assert.equal(c.fastingStatus(at(18, 30), '18:00', 'OMAD').state, 'eating');
    assert.equal(c.plannedMeals('OMAD'), 1);
    assert.equal(c.plannedMeals('16:8'), 3);
});
