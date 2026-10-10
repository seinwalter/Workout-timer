// =====================================================================
//  session-ui.js — the full-screen workout view (work / rest / cardio),
//  the set-logging card shown during rest, and the finish summary.
// =====================================================================

function segTicks(s) {
    const w = workout();
    const exs = (w.exercises || []).length;
    if (s.kind === 'block' || !exs) return '';
    let html = '<div class="s-seg">';
    if (exs > 1) {
        for (let i = 0; i < exs; i++) {
            const done = s.kind === 'rest' ? i <= s.ex : i < s.ex;
            const cur = s.kind === 'work' && i === s.ex;
            html += `<i class="${cur ? 'c' : done ? 'd' : ''}"></i>`;
        }
    } else {
        for (let r = 1; r <= (w.rounds || 1); r++) {
            const done = s.kind === 'rest' ? r <= s.round : r < s.round;
            const cur = s.kind === 'work' && r === s.round;
            html += `<i class="${cur ? 'c' : done ? 'd' : ''}"></i>`;
        }
    }
    return html + '</div>';
}

function metaText(s) {
    const w = workout();
    const exs = (w.exercises || []).length;
    if (s.kind === 'block') {
        return w.type === 'steady' ? `${w.title} · Block ${s.blockIdx + 1} of ${s.blockTotal}` : s.name;
    }
    const rounds = `Round ${s.round} / ${w.rounds || 1}`;
    if (s.kind === 'rest') return `${s.name} · ${rounds}`;
    return exs > 1 ? `${rounds} · Move ${s.ex + 1} of ${exs}` : rounds;
}

function nextText() {
    const n = plan[segIdx + 1];
    if (!n) return 'Last one — finish strong';
    if (n.kind === 'rest') {
        const after = plan[segIdx + 2];
        return `${n.name} ${n.dur}s → ${after ? after.name : 'Finish'}`;
    }
    if (n.kind === 'block') return `${n.name}${n.speed ? ' · ' + speedText(n) : ''}`;
    return n.name;
}

function controlsHtml(s) {
    const paused = status === 'paused';
    let row;
    if (paused) {
        row = `<button class="s-btn" onclick="prevMove()">⏮ Prev</button>
               <button class="s-btn" onclick="adjust(${s.kind === 'block' ? 60 : 15})">+${s.kind === 'block' ? '1m' : '15s'}</button>
               <button class="s-btn" onclick="nextMove()">Next ⏭</button>`;
    } else if (s.kind === 'rest') {
        row = `<button class="s-btn" onclick="adjust(15)">+15s</button>
               <button class="s-btn wide" onclick="skipSeg()">Skip rest →</button>`;
    } else if (s.kind === 'block') {
        row = `<button class="s-btn" onclick="adjust(-60)">−1m</button>
               <button class="s-btn" onclick="skipSeg()">Skip</button>
               <button class="s-btn" onclick="adjust(60)">+1m</button>`;
    } else {
        row = `<button class="s-btn" onclick="adjust(-15)">−15s</button>
               <button class="s-btn" onclick="skipSeg()">Skip</button>
               <button class="s-btn" onclick="adjust(15)">+15s</button>`;
    }
    const mainLabel = paused ? '▶ Resume' : '❚❚ Pause';
    return `<div class="s-ctrl">${row}
                <button class="s-btn main" id="sMain" aria-label="${paused ? 'Resume' : 'Pause'}. Hold to end workout"><span class="hold-fill"></span><span>${mainLabel}</span></button>
            </div>
            <div class="s-hint">${locked ? 'Locked · tap 🔒 to unlock' : (paused ? 'Hold Resume 1 s to end the workout' : 'Tap the clock to pause · hold Pause 1 s to end')}</div>`;
}

function workView(s) {
    const n = isLoggable(s) ? nudgeFor(s.name, s.details) : null;
    const g = isLoggable(s) ? ghostFor(s) : null;
    const hint = n && n.type === 'up' && s.round === 1
        ? `↑ Try ${n.to} today`
        : (g && g.from === 'last' ? `Last time: ${g.load} × ${g.reps}` : '');
    return `${segTicks(s)}
        <div class="s-name">${s.name}</div>
        ${s.details ? `<div class="s-details">${s.details}</div>` : ''}
        ${hint ? `<div class="s-ghost">${hint}</div>` : ''}
        <div class="s-clock" onclick="togglePause()">
            <div class="s-digits" id="sDigits"></div>
            <div class="s-unit" id="sUnit"></div>
            <div class="s-paused-tag">Paused</div>
        </div>
        <div class="s-next"><small>NEXT</small>${nextText()}</div>
        ${controlsHtml(s)}`;
}

function restView(s) {
    const n = nextNonRest(segIdx + 1);
    const roundChange = n && n.kind === 'work' && n.round > s.round;
    const justDone = plan[segIdx - 1];
    const logging = justDone && isLoggable(justDone);
    if (logging) initLogUI(justDone, 'draft');
    return `${segTicks(s)}
        <div class="s-clock" onclick="togglePause()">
            <div class="s-ring ${logging ? 'small' : ''}">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#123A4A" stroke-width="7"></circle>
                    <circle id="sRing" cx="50" cy="50" r="44" fill="none" stroke="#36C5F0" stroke-width="7"
                        stroke-linecap="round" stroke-dasharray="276.46" stroke-dashoffset="0"></circle>
                </svg>
                <div class="s-ring-num"><div class="s-digits" id="sDigits"></div><div class="s-unit" id="sUnit"></div></div>
            </div>
            <div class="s-paused-tag">Paused</div>
        </div>
        ${s.details && !logging ? `<div class="s-details" style="text-align:center;color:#BFE6F3">${s.details}</div>` : ''}
        ${n ? `<div class="s-upnext ${logging ? 'compact' : ''}">
            <small>UP NEXT${roundChange ? ' · ROUND ' + n.round : ''}</small>
            <div class="s-name">${n.name}</div>
            ${n.details ? `<div class="s-details">${n.details}</div>` : ''}
        </div>` : ''}
        ${logging ? '<div class="s-log" id="sLog"></div>' : ''}
        ${controlsHtml(s)}`;
}

function blockView(s) {
    const w = workout();
    const steadyPlan = w.type === 'steady';
    let planHtml = '';
    if (steadyPlan) {
        let t = 0;
        planHtml = '<div class="s-plan">' + plan.map((b, i) => {
            const from = t / 60, to = (t + b.dur) / 60;
            t += b.dur;
            const cls = i === segIdx ? 'now' : (i < segIdx ? 'past' : '');
            return `<div class="${cls}"><span>${from}–${to} min · ${b.name}</span><span>${speedText(b) || '—'}</span></div>`;
        }).join('') + '</div>';
    }
    return `<div class="s-clock" onclick="togglePause()">
            <div class="s-elapsed" id="sElapsed"></div>
            <div class="s-of" id="sOf"></div>
            <div class="s-paused-tag">Paused</div>
        </div>
        <div class="s-bar"><b id="sBar"></b></div>
        <div class="s-details">${s.name}${s.details ? ' — ' + s.details : ''}</div>
        <div class="s-tiles">
            <div class="s-tile"><div class="v">${s.speed ? fmtSpeed(s.speed) : '—'}<small>${s.speed ? 'mph' : ''}</small></div><div class="t">Speed target</div></div>
            <div class="s-tile"><div class="v">${s.speed ? s.grade : '—'}<small>${s.speed ? '%' : ''}</small></div><div class="t">Incline now</div></div>
            <div class="s-tile"><div class="v" id="sKcal">0<small>kcal</small></div><div class="t">Net, estimated</div></div>
            <div class="s-tile"><div class="v" id="sLeft">0:00</div><div class="t" id="sLeftLabel">Left in block</div></div>
        </div>
        ${steadyPlan ? planHtml : `<div class="s-next" style="background:#17191C"><small>NEXT</small>${nextText()}</div>`}
        ${controlsHtml(s)}`;
}

function renderSession() {
    if (!sessionOpen) return;
    const el = document.getElementById('session');
    const s = plan[segIdx];
    if (!s) return;
    el.className = `session open ${s.kind}${status === 'paused' ? ' paused' : ''}${locked ? ' locked' : ''}`;
    let html = `<div class="s-lockveil"></div>
        <div class="s-top">
            <div class="s-meta">${metaText(s)}</div>
            <button class="s-lock ${locked ? 'on' : ''}" onclick="toggleLock()" aria-label="${locked ? 'Unlock' : 'Lock'} controls">${locked ? '🔒' : '🔓'}</button>
        </div>`;
    html += s.kind === 'work' ? workView(s) : s.kind === 'rest' ? restView(s) : blockView(s);
    el.innerHTML = html;
    bindHold(document.getElementById('sMain'));
    if (document.getElementById('sLog')) renderLogCard('sLog');
    tickSession();
}

function tickSession() {
    if (!sessionOpen) return;
    const s = plan[segIdx];
    if (!s) return;
    const rem = remainingNow();

    const d = document.getElementById('sDigits');
    if (d) {
        const txt = fmtClock(rem);
        d.textContent = txt;
        d.classList.toggle('mid', txt.length === 4);
        d.classList.toggle('long', txt.length >= 5);
    }
    const u = document.getElementById('sUnit');
    if (u) {
        const unit = rem < 60 ? 'sec' : 'min';
        u.textContent = s.kind === 'work' ? `${unit} · work` : `${unit} · ${s.name}`;
    }
    const ring = document.getElementById('sRing');
    if (ring) ring.style.strokeDashoffset = 276.46 * (1 - rem / s.dur);

    const el = document.getElementById('sElapsed');
    if (el) {
        const total = totalPlanSeconds();
        const elapsed = elapsedSeconds();
        el.textContent = fmtMMSS(elapsed);
        document.getElementById('sOf').textContent = `OF ${fmtMMSS(total)}`;
        document.getElementById('sBar').style.width = `${Math.min(100, elapsed / total * 100)}%`;
        document.getElementById('sKcal').innerHTML = `${kcalSoFar()}<small>kcal</small>`;
        document.getElementById('sLeft').textContent = fmtMMSS(rem);
        const n = plan[segIdx + 1];
        document.getElementById('sLeftLabel').textContent = n ? `Until ${n.name}` : 'Left in workout';
    }
}

function bindHold(btn) {
    if (!btn) return;
    let timer = null;
    let fired = false;
    const cancel = () => { clearTimeout(timer); btn.classList.remove('holding'); };
    btn.addEventListener('pointerdown', () => {
        if (locked) return;
        fired = false;
        btn.classList.add('holding');
        timer = setTimeout(() => {
            fired = true;
            btn.classList.remove('holding');
            haptic(ImpactStyle.Heavy);
            endSession();
        }, 1100);
    });
    btn.addEventListener('pointerup', () => {
        cancel();
        if (!fired && !locked) togglePause();
    });
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('pointercancel', cancel);
    btn.addEventListener('contextmenu', e => e.preventDefault());
}

// ----- Set logging card -----
// target: 'draft' (during a workout) or a saved session id (summary screen)
let logUI = null;

function initLogUI(seg, target) {
    const key = `${seg.name}|${seg.round}|${target}`;
    if (logUI && logUI.key === key) return;
    const existing = target === 'draft' ? loggedSet(seg.name, seg.round) : null;
    const g = ghostFor(seg);
    logUI = {
        key, target, ex: seg.name, round: seg.round, details: seg.details,
        load: existing ? existing.load : g.load,
        reps: existing ? existing.reps : g.reps,
        rir: existing ? existing.rir : g.rir,
        from: g.from,
        saved: !!existing,
        pr: false,
        nudge: seg.round === 1 ? nudgeFor(seg.name, seg.details) : null
    };
}

function renderLogCard(containerId) {
    const el = document.getElementById(containerId);
    if (!el || !logUI) return;
    const L = logUI;
    const status = L.saved ? (L.pr ? '🏆 PR — logged' : '✓ Logged') : (L.from === 'last' ? 'from last time' : 'first log');
    el.innerHTML = `
        <div class="s-log-h"><span>Log · ${L.ex} · set ${L.round}</span><span>${status}</span></div>
        <div class="s-log-row">
            <button class="s-step" onclick="logStep(-1)" aria-label="One fewer rep">−</button>
            <div class="s-reps"><b>${L.reps}</b><small>reps</small></div>
            <button class="s-step" onclick="logStep(1)" aria-label="One more rep">+</button>
            <div class="s-rir" role="group" aria-label="Reps left in the tank">
                ${[0, 1, 2, 3, 4].map(r => `<button class="${L.rir === r ? 'on' : ''}" onclick="logRir(${r})">${r === 4 ? '4+' : r}</button>`).join('')}
            </div>
        </div>
        <div class="s-rir-label">Reps left in the tank</div>
        <div class="s-chips">${LOADS.map(l => `<button class="${l === L.load ? 'on' : ''}" onclick="logLoad('${l}')">${l}</button>`).join('')}</div>
        ${L.nudge && !L.saved ? `<div class="s-nudge">${nudgeText(L.nudge)}</div>` : ''}
        <button class="s-logbtn ${L.saved ? 'saved' : ''}" onclick="logSave('${containerId}')">${L.saved ? '✓ Logged · tap to update' : '✓ Log set'}</button>`;
}

function logRefresh() {
    renderLogCard(document.getElementById('sumLog') ? 'sumLog' : 'sLog');
}
function logStep(d) { if (locked) return; logUI.reps = Math.max(0, Math.min(99, logUI.reps + d)); logUI.saved = false; haptic(); logRefresh(); }
function logRir(r) { if (locked) return; logUI.rir = r; logUI.saved = false; haptic(); logRefresh(); }
function logLoad(l) { if (locked) return; logUI.load = l; logUI.saved = false; haptic(); logRefresh(); }

function logSave(containerId) {
    if (locked || !logUI) return;
    const entry = { ex: logUI.ex, round: logUI.round, load: logUI.load, reps: logUI.reps, rir: logUI.rir };
    logUI.pr = isPR(entry);
    if (logUI.target === 'draft') logSet(entry);
    else addSetToSession(logUI.target, entry);
    logUI.saved = true;
    if (logUI.pr) tones([880, 1320, 1760], 110); else playBeep(1000, 80);
    renderLogCard(containerId);
}

// ----- Finish summary -----
function workoutActivity(w) {
    if (w.type === 'steady') return 'walking';
    if ((w.exercises || []).some(e => e.speed)) return 'hiit';
    return 'strength';
}

function openSummary(rec, lastSeg) {
    const modal = document.getElementById('summaryModal');
    const body = document.getElementById('summaryBody');
    if (!rec) return;
    const sets = rec.sets || [];
    const needLast = lastSeg && isLoggable(lastSeg) && !sets.some(s => s.ex === lastSeg.name && s.round === lastSeg.round);
    if (needLast) { logUI = null; initLogUI(lastSeg, rec.id); }

    const names = [...new Set(sets.map(s => s.ex))];
    const nudges = names.map(n => {
        const seg = plan.find(p => p.name === n);
        const g = seg ? nudgeFor(n, seg.details) : null;
        return g && g.type === 'up' ? `<li><b>${n}</b> — move to ${g.to} next time</li>` : '';
    }).join('');

    body.innerHTML = `
        <div class="sum-tiles">
            <div><b>${fmtMMSS(rec.durationSec || 0)}</b><span>Time</span></div>
            <div><b>${rec.kcal || 0}</b><span>kcal (net est.)</span></div>
            <div><b>${sets.length}</b><span>Sets logged</span></div>
        </div>
        ${needLast ? `<div class="sum-label">Log your last set</div><div class="s-log sum-log" id="sumLog"></div>` : ''}
        ${nudges ? `<div class="sum-label">Ready to move up</div><ul class="sum-list">${nudges}</ul>` : ''}
        <div class="sum-health" id="sumHealth">${settings.health ? 'Saving to Apple Health…' : 'Apple Health is off · turn it on in Settings'}</div>
        <button class="start-btn" onclick="closeSummary()">Done</button>`;
    modal.classList.add('active');
    if (needLast) renderLogCard('sumLog');

    if (settings.health) {
        const w = workout();
        healthSaveWorkout({
            start: rec.startedAt, end: rec.endedAt, activity: workoutActivity(w), kcal: rec.kcal || 0
        }).then(r => {
            const el = document.getElementById('sumHealth');
            if (el) el.textContent = r.saved ? '✓ Saved to Apple Health' : `Apple Health: ${r.reason}`;
        });
    }
}

function closeSummary() {
    document.getElementById('summaryModal').classList.remove('active');
    logUI = null;
    updateStats();
}
