// =====================================================================
//  history.js — the History sheet: 8-week calendar, per-lift progress
//  chart, best reps at each bell, recent sessions, body weight.
// =====================================================================

let historyLift = null;

function openHistory() {
    renderHistory();
    document.getElementById('historyModal').classList.add('active');
}

function closeHistory() {
    document.getElementById('historyModal').classList.remove('active');
}

function renderHistory() {
    const sessions = loadSessions();
    const body = document.getElementById('historyBody');

    // --- Calendar: last 8 weeks, Monday first ---
    const byDate = {};
    sessions.forEach(s => { if (s.completed || (s.sets && s.sets.length)) byDate[s.date] = (byDate[s.date] || 0) + 1; });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7 * 7);
    let cal = '<div class="h-cal"><div class="h-cal-head">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<span>${d}</span>`).join('') + '</div>';
    for (let w = 0; w < 8; w++) {
        cal += '<div class="h-cal-row">';
        for (let d = 0; d < 7; d++) {
            const day = new Date(monday); day.setDate(monday.getDate() + w * 7 + d);
            const key = localDate(day.getTime());
            const future = day > today;
            const isToday = day.getTime() === today.getTime();
            cal += `<span class="${byDate[key] ? 'on' : ''} ${future ? 'future' : ''} ${isToday ? 'today' : ''}" title="${key}"></span>`;
        }
        cal += '</div>';
    }
    cal += '</div>';

    // --- Lifts ---
    const setsByEx = {};
    sessions.slice().sort((a, b) => a.startedAt - b.startedAt).forEach(s => (s.sets || []).forEach(x => {
        (setsByEx[x.ex] = setsByEx[x.ex] || []).push({ ...x, date: s.date, sid: s.id });
    }));
    const lifts = Object.keys(setsByEx).sort();
    if (!historyLift || !setsByEx[historyLift]) historyLift = lifts[0] || null;

    let liftHtml;
    if (!lifts.length) {
        liftHtml = '<p class="h-empty">Log sets during rest on strength days and your lifts show up here.</p>';
    } else {
        const sets = setsByEx[historyLift];
        // One point per session: total volume (lb × reps; reps for bodyweight)
        const perSession = [];
        sets.forEach(x => {
            let p = perSession.find(q => q.sid === x.sid);
            if (!p) { p = { sid: x.sid, date: x.date, vol: 0, top: x }; perSession.push(p); }
            p.vol += setVolume(x);
            if ((LOAD_LB[x.load] || 0) * 100 + x.reps > (LOAD_LB[p.top.load] || 0) * 100 + p.top.reps) p.top = x;
        });
        const bw = sets.every(x => x.load === 'BW');
        const best = bestByLoad(sets);
        liftHtml = `
            <select id="historyLift" class="h-select" onchange="historyLift=this.value; renderHistory()">
                ${lifts.map(l => `<option ${l === historyLift ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
            ${lineChart(perSession.map(p => ({ x: p.date, y: p.vol, label: `${p.date.slice(5)} · ${p.top.load} × ${p.top.reps}` })), bw ? 'reps' : 'lb × reps', 'liftChart')}
            <div class="h-prs">${LOADS.filter(l => best[l] != null).map(l => `<div><span>${l}</span><b>${best[l]}</b><small>best reps</small></div>`).join('')}</div>`;
    }

    // --- Weight (from Apple Health) ---
    const weights = store.get('weights', []);
    const weightHtml = weights.length >= 2
        ? lineChart(weights.slice(-90).map(w => ({ x: w.t, y: w.lb, label: `${new Date(w.t).toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${w.lb} lb` })), 'lb', 'weightChart', true)
        : `<p class="h-empty">${settings.health ? 'No weight in Apple Health yet.' : 'Turn on Apple Health in Settings to chart your weight here.'}</p>`;

    // --- Recent sessions ---
    const recent = sessions.slice().sort((a, b) => b.startedAt - a.startedAt).slice(0, 12);
    const list = recent.length ? recent.map(s => `
        <div class="h-sess">
            <div><b>${s.title}</b><span>${new Date(s.startedAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}${s.completed ? '' : ' · partial'}${s.back >= 3 ? ' · back ' + s.back : ''}</span></div>
            <div class="h-sess-r"><b>${fmtMMSS(s.durationSec || 0)}</b><span>${(s.sets || []).length} sets · ${s.kcal || 0} kcal</span></div>
        </div>`).join('') : '<p class="h-empty">No sessions yet.</p>';

    body.innerHTML = `
        <div class="h-label">Last 8 weeks</div>${cal}
        <div class="h-label">Lifts</div>${liftHtml}
        <div class="h-label">Body weight</div>${weightHtml}
        <div class="h-label">Recent sessions</div><div class="h-list">${list}</div>`;
    bindChartTaps();
}

// Single-series line chart: 2px line, 8px dots, faint grid, tap a dot for its value
function lineChart(points, unit, id, timeAxis) {
    if (!points.length) return '';
    if (points.length === 1) {
        return `<div class="h-one">${points[0].label} <span>(one session so far)</span></div>`;
    }
    const W = 320, H = 150, L = 38, R = 10, T = 12, B = 22;
    const ys = points.map(p => p.y);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    const padY = (hi - lo) * 0.15 || Math.max(1, hi * 0.05);
    lo = Math.max(0, lo - padY); hi = hi + padY;
    const xAt = i => {
        if (timeAxis) {
            const t0 = points[0].x, t1 = points[points.length - 1].x;
            return L + (W - L - R) * (t1 === t0 ? 0.5 : (points[i].x - t0) / (t1 - t0));
        }
        return L + (W - L - R) * (i / (points.length - 1));
    };
    const yAt = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    const ticks = [lo, (lo + hi) / 2, hi];
    const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join(' ');
    const last = points[points.length - 1];
    return `
        <div class="h-chart" id="${id}">
            <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${unit} over time">
                ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${yAt(t)}" y2="${yAt(t)}" class="h-grid"></line>
                    <text x="${L - 6}" y="${yAt(t) + 4}" class="h-tick" text-anchor="end">${fmt(t)}</text>`).join('')}
                <path d="${path}" class="h-line"></path>
                ${points.map((p, i) => `${points.length <= 16 || i === points.length - 1 ? `<circle cx="${xAt(i)}" cy="${yAt(p.y)}" r="4" class="h-dot" data-label="${p.label}"></circle>` : ''}
                    <circle cx="${xAt(i)}" cy="${yAt(p.y)}" r="14" class="h-hit" data-label="${p.label}"></circle>`).join('')}
            </svg>
            <div class="h-readout">${last.label} <span>· ${unit}</span></div>
        </div>`;
}

function bindChartTaps() {
    document.querySelectorAll('.h-chart').forEach(chart => {
        chart.querySelectorAll('.h-hit').forEach(hit => {
            hit.addEventListener('click', () => {
                chart.querySelector('.h-readout').firstChild.textContent = hit.dataset.label + ' ';
                chart.querySelectorAll('.h-dot').forEach(d => d.classList.toggle('sel', d.dataset.label === hit.dataset.label));
            });
        });
    });
}
