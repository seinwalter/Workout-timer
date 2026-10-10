// =====================================================================
//  fasting.js — eating window (replaces the OMAD card): window presets,
//  daily alerts, protein per meal, and a one-tap "shaky / foggy" log.
// =====================================================================

const EAT_OPEN_ID = 2001;
const EAT_PRE_ID = 2002;

let eat = store.get('eatWindow', null);
if (!eat) {
    // Carry over the old OMAD setting on first run
    const omad = store.get('omad', null);
    eat = {
        enabled: !!(omad && omad.enabled),
        preset: omad && omad.enabled ? 'OMAD' : '16:8',
        opens: omad && omad.time ? omad.time : '12:00',
        proteinTarget: 190,
        intake: [],        // [{ t, g }] protein additions (kept ~2 days)
        symptoms: []       // [{ t, sinceMealMin }]
    };
    store.set('eatWindow', eat);
}

const saveEat = () => store.set('eatWindow', eat);
const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const hhmm = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function timeLabel(opens) {
    const [h, m] = opens.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return hhmm(d.getTime());
}

function todaysIntake() {
    const start = todayStart();
    return eat.intake.filter(x => x.t >= start);
}

// Group additions less than 45 min apart into one meal
function mealsToday() {
    const meals = [];
    todaysIntake().forEach(x => {
        const last = meals[meals.length - 1];
        if (last && x.t - last.lastT < 45 * 60e3) { last.g += x.g; last.lastT = x.t; }
        else meals.push({ t: x.t, lastT: x.t, g: x.g });
    });
    return meals;
}

async function scheduleEatNotifications() {
    if (!LocalNotifications) return;
    try {
        await LocalNotifications.cancel({ notifications: [{ id: EAT_OPEN_ID }, { id: EAT_PRE_ID }] });
        if (!eat.enabled) return;
        const [h, m] = eat.opens.split(':').map(Number);
        const perMeal = Math.round(eat.proteinTarget / plannedMeals(eat.preset));
        let pre;
        let preTitle, preBody;
        if (eat.preset === 'OMAD') {
            pre = new Date(); pre.setHours(h, m - 30, 0, 0);
            preTitle = 'Meal in 30 minutes';
            preBody = 'Start prepping now — never decide what to eat ravenous.';
        } else {
            pre = new Date(); pre.setHours(h + WINDOW_HOURS[eat.preset], m - 30, 0, 0);
            preTitle = 'Eating window closes in 30 min';
            preBody = 'Last meal — make it protein-heavy.';
        }
        await LocalNotifications.schedule({
            notifications: [
                {
                    id: EAT_OPEN_ID,
                    title: eat.preset === 'OMAD' ? '🍽 Meal time' : '🍽 Eating window open',
                    body: `Protein first — about ${perMeal} g this meal.`,
                    schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
                    sound: 'default'
                },
                {
                    id: EAT_PRE_ID,
                    title: preTitle,
                    body: preBody,
                    schedule: { on: { hour: pre.getHours(), minute: pre.getMinutes() }, allowWhileIdle: true },
                    sound: 'default'
                }
            ]
        });
    } catch (e) {
        console.log('Eating window scheduling failed:', e);
    }
}

function renderEatCard() {
    const toggle = document.getElementById('eatToggle');
    const statusEl = document.getElementById('eatStatus');
    const body = document.getElementById('eatBody');
    if (!toggle) return;
    toggle.classList.toggle('active', eat.enabled);
    body.hidden = !eat.enabled;
    statusEl.textContent = eat.enabled
        ? `${eat.preset === 'OMAD' ? 'OMAD' : eat.preset} · opens ${timeLabel(eat.opens)}`
        : 'Off';
    if (!eat.enabled) return;

    const total = todaysIntake().reduce((a, x) => a + x.g, 0);
    const meals = mealsToday();
    const perMeal = Math.round(eat.proteinTarget / plannedMeals(eat.preset));
    const weekAgo = Date.now() - 7 * 864e5;
    const recentSymptoms = eat.symptoms.filter(s => s.t >= weekAgo);
    let warn = '';
    if (recentSymptoms.length >= 2) {
        warn = `${recentSymptoms.length} shaky/foggy episodes in the last 7 days. Try a wider window` +
            (eat.preset === '14:10' ? ' or an earlier first meal' : ' (14:10)') + ', and bring it up with your doctor.';
    }

    body.innerHTML = `
        <div class="eat-now">
            <span class="eat-state" id="eatState"></span>
            <div class="omad-countdown" id="eatCountdown">--:--:--</div>
            <div class="omad-countdown-label" id="eatCountdownLabel"></div>
        </div>
        <div class="eat-presets" role="group" aria-label="Window length">
            ${['14:10', '16:8', '18:6', 'OMAD'].map(p => `<button class="${eat.preset === p ? 'on' : ''}" onclick="setEatPreset('${p}')">${p}</button>`).join('')}
        </div>
        ${eat.preset === 'OMAD' ? `<div class="eat-note warn">One large meal after a long fast is the pattern most likely to trigger reactive hypoglycemia. 16:8 with 2–3 protein-first meals gets most of the benefit.</div>` : ''}
        <div class="omad-time-row">
            <label class="omad-label" for="eatOpens">${eat.preset === 'OMAD' ? 'Meal time' : 'Window opens'}</label>
            <input type="time" id="eatOpens" class="omad-time-input" value="${eat.opens}" onchange="setEatOpens(this.value)">
        </div>
        <div class="eat-protein">
            <div class="eat-row"><span>Protein today</span><b>${total} / ${eat.proteinTarget} g</b></div>
            <div class="eat-bar"><b style="width:${Math.min(100, total / eat.proteinTarget * 100)}%"></b></div>
            <div class="eat-meals">${meals.length ? meals.map(m => `<span>${hhmm(m.t)} · ${m.g} g</span>`).join('') : '<span>No protein logged yet today</span>'}</div>
            <div class="eat-add">
                <button onclick="logProtein(10)">+10 g</button>
                <button onclick="logProtein(25)">+25 g</button>
                <button onclick="logProtein(40)">+40 g</button>
                <button onclick="undoProtein()" ${todaysIntake().length ? '' : 'disabled'}>Undo</button>
            </div>
            <div class="eat-row small"><span>Aim for ~${perMeal} g per meal × ${plannedMeals(eat.preset)}</span>
                <label>Target <input type="number" inputmode="numeric" id="eatTarget" class="eat-target" value="${eat.proteinTarget}" onchange="setProteinTarget(this.value)"> g</label></div>
        </div>
        <button class="eat-symptom" onclick="logSymptom()">Feeling shaky or foggy</button>
        ${warn ? `<div class="eat-note warn">${warn}</div>` : ''}
        <div class="eat-note">Not medical advice. Fasting length with reactive hypoglycemia is a call to make with your doctor.</div>`;
    eatTick();
}

function eatTick() {
    if (!eat.enabled) return;
    const el = document.getElementById('eatCountdown');
    if (!el) return;
    const st = fastingStatus(new Date(), eat.opens, eat.preset);
    const diff = Math.max(0, st.until.getTime() - Date.now());
    const hh = Math.floor(diff / 3600e3), mm = Math.floor(diff % 3600e3 / 60e3), ss = Math.floor(diff % 60e3 / 1000);
    el.textContent = `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
    const state = document.getElementById('eatState');
    state.textContent = st.state === 'eating' ? 'Eating window' : 'Fasting';
    state.className = `eat-state ${st.state}`;
    document.getElementById('eatCountdownLabel').textContent = st.state === 'eating' ? 'until the window closes' : 'until the window opens';
}

function toggleEatWindow() {
    eat.enabled = !eat.enabled;
    saveEat();
    if (eat.enabled) requestNotificationPermission();
    scheduleEatNotifications();
    renderEatCard();
    playBeep(700, 80);
}

function setEatPreset(p) {
    eat.preset = p;
    saveEat();
    scheduleEatNotifications();
    renderEatCard();
    haptic();
}

function setEatOpens(v) {
    if (!/^\d{2}:\d{2}$/.test(v)) return;
    eat.opens = v;
    saveEat();
    scheduleEatNotifications();
    renderEatCard();
}

function setProteinTarget(v) {
    const n = Math.round(Number(v));
    if (n >= 40 && n <= 400) { eat.proteinTarget = n; saveEat(); scheduleEatNotifications(); }
    renderEatCard();
}

function logProtein(g) {
    eat.intake.push({ t: Date.now(), g });
    eat.intake = eat.intake.filter(x => x.t >= Date.now() - 2 * 864e5);
    saveEat();
    haptic();
    renderEatCard();
}

function undoProtein() {
    const today = todaysIntake();
    if (!today.length) return;
    const last = today[today.length - 1];
    eat.intake = eat.intake.filter(x => x !== last);
    saveEat();
    renderEatCard();
}

function logSymptom() {
    const lastMeal = eat.intake.length ? eat.intake[eat.intake.length - 1].t : null;
    const sinceMealMin = lastMeal ? Math.round((Date.now() - lastMeal) / 60e3) : null;
    eat.symptoms.push({ t: Date.now(), sinceMealMin });
    eat.symptoms = eat.symptoms.slice(-60);
    saveEat();
    haptic(ImpactStyle.Medium);
    renderEatCard();
    showNotification('Logged', sinceMealMin != null
        ? `${Math.floor(sinceMealMin / 60)}h ${sinceMealMin % 60}m since you last logged protein. Eat something protein-first.`
        : 'Eat something protein-first, then log it.', true);
}
