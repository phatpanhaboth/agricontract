'use strict';
// Bank-style single page app. All user data goes through textContent (h()), never innerHTML.
const USD_RATE = 4100;
const VARS = ['M23', 'H09', 'M10', 'IM4', 'Other'];
const S = { lang: 'km', me: null, geo: null, varieties: null, home: null };
try { S.lang = localStorage.getItem('lang') || 'km'; } catch (e) {}
const t = k => (T[S.lang][k] !== undefined ? T[S.lang][k] : T.km[k] !== undefined ? T.km[k] : k);
const $app = document.getElementById('app');

// ---------- helpers ----------
function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'src' && String(v).startsWith('/api/photos/')) {
      fetch(v).then(r => { if (!r.ok) throw new Error('photo'); return r.blob(); }).then(blob => {
        const url = URL.createObjectURL(blob); n.onload = () => URL.revokeObjectURL(url); n.src = url;
      }).catch(() => { n.alt = 'Photo unavailable'; });
    }
    else if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') continue;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c !== null && c !== undefined && c !== false) n.append(c instanceof Node ? c : String(c));
  return n;
}
const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  doc: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 0v5h5M9 13h6M9 17h6',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 10a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a5 5 0 0 0-4-5',
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-8 10a8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14',
  bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18',
  print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z',
  pen: 'M4 20l4-1L19 8l-3-3L5 16zM14 6l3 3',
  check: 'M5 12l5 5 9-10',
  leaf: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15zM5 19l7-7',
  chat: 'M4 5h16v11H9l-5 4z',
  camera: 'M4 8h4l2-3h4l2 3h4v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
};
const icon = name => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ICONS[name]); s.append(p); return s;
};
const num = (n, d = 1) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: d });
const riel = n => `៛${num(n, 0)}`;
const usd = n => `≈ $${(Number(n || 0) / USD_RATE).toFixed(2)}`;
const orgName = o => (S.lang === 'en' && o && o.name_en) ? o.name_en : (o ? o.name_kh : '');
const varName = v => (v === 'Other' ? t('other') : v);
// Months: 'YYYY-MM' delivery windows on contracts, 1-12 harvest months on co-ops.
const MONTHS = { km: ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
const monthName = m => MONTHS[S.lang === 'en' ? 'en' : 'km'][Number(m) - 1];
const window2 = (a, b) => { if (!a || !b) return ''; const [ya, ma] = a.split('-'), [yb, mb] = b.split('-');
  return ya === yb ? `${monthName(ma)}–${monthName(mb)} ${yb}` : `${monthName(ma)} ${ya} – ${monthName(mb)} ${yb}`; };
const harvestRange = o => (o && o.harvest_from && o.harvest_to ? `${monthName(o.harvest_from)}–${monthName(o.harvest_to)}` : '');
const monthSelect = (cur, opts, label) => h('select', { class: 'in', 'aria-label': label }, opts.map(([v, txt]) => h('option', { value: v, selected: String(v) === String(cur) }, txt)));
const statusChip = s => h('span', { class: `status ${s}` }, t('st_' + s));
const STEP_OF = { draft: 0, offered: 1, declined: 1, signed: 2 };
const when = iso => iso ? new Date(iso).toLocaleString(S.lang === 'en' ? 'en-GB' : 'km-KH', { dateStyle: 'medium', timeStyle: 'short' }) : '';

async function api(method, path, body) {
  const r = await fetch('/api' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => null);
  if (r.status === 401 && path !== '/login') { S.me = null; go('#/login'); throw new Error('login'); }
  if (!r.ok) { const e = new Error((data && data.error) || r.status); e.status = r.status; e.data = data; throw e; }
  return data;
}
const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };

// ---------- layout ----------
function shell({ title, back, tab, top, body }) {
  const header = h('div', { class: 'top' },
    title ? h('div', { class: 'page-title' }, back ? h('button', { class: 'back-btn', 'aria-label': t('back'), onclick: () => (typeof back === 'string' ? go(back) : history.back()) }, '‹') : null, h('h1', {}, title)) :
      h('div', { class: 'top-row' }, h('img', { src: '/agricontract/logo.svg', alt: '' }),
        h('div', { class: 'who' }, h('b', {}, orgName(S.home && S.home.org)), h('small', {}, t(S.me.role))),
        h('button', { class: 'chip-btn', onclick: toggleLang, 'aria-label': t('language') }, S.lang === 'km' ? 'EN' : 'ខ្មែរ')),
    top || null);
  // Three tabs for each side; contracts open from the Home shortcut.
  const tabs = S.me.role === 'coop' ? [['home', 'home', '#/home'], ['members', 'people', '#/members'], ['me', 'user', '#/me']]
    : [['home', 'home', '#/home'], ['coops', 'people', '#/coops'], ['me', 'user', '#/me']];
  if (tab === 'contracts') tab = 'home';
  const bar = h('nav', { class: 'tabbar' }, tabs.map(([k, ic, href]) => h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => go(href), 'aria-current': tab === k ? 'page' : null }, icon(ic), t(k))));
  $app.replaceChildren(h('div', { class: 'app' }, header, h('main', { class: 'content' }, body), bar));
  window.scrollTo(0, 0);
}
function toggleLang() { S.lang = S.lang === 'km' ? 'en' : 'km'; try { localStorage.setItem('lang', S.lang); } catch (e) {} document.documentElement.lang = S.lang; render(); }

// Only the 2-step check is shown (owner, 15 Nov 2026). The other farmer warnings (flags.py) are still computed
// on the server but not shown; bring back a flag list here to show them again.
function mafBadge(reg, claimed) { return claimed ? h('span', { class: 'badge no' }, t('mafClaim')) : reg ? h('span', { class: 'badge ok' }, icon('check'), t('mafOk')) : h('span', { class: 'badge no' }, t('mafNo')); }
// The 2-step check: 1) in the MAFF list? 2) does the MAFF cashew land fit what CDB records for the whole commune?
function verifyCard(v) {
  if (!v) return null;
  const L = v.land, mark = { ok: '✓', warn: '!', skip: '?' };
  const step = (st, title, line) => h('div', { class: 'vstep ' + st }, h('span', { class: 'vmark', 'aria-hidden': 'true' }, mark[st]), h('div', {}, h('b', {}, title), h('small', {}, line)));
  const landLine = L.status === 'ok' ? t('v2ok')(num(L.maff_ha), num(L.cdb_ha)) : L.status === 'over' ? t('v2over')(num(L.maff_ha), num(L.cdb_ha)) : t('v2_' + L.status);
  return h('div', { class: 'card' }, h('b', {}, t('verifyTitle')),
    step(v.maff && !v.claimed ? 'ok' : 'skip', t('v1'), v.claimed ? t('v1claim') : v.maff ? t('v1yes') : t('v1no')),
    step(L.status === 'ok' ? 'ok' : L.status === 'over' ? 'warn' : 'skip', t('v2'), landLine),
    v.source ? h('small', { class: 'hint' }, `${t('source')}: ${v.source}`) : null);
}
function byVariety(rows) {
  const max = Math.max(1, ...rows.map(r => r.expected_kg));
  return rows.map(r => h('div', { class: 'vrow' }, h('div', { class: 'top-line' }, h('span', {}, varName(r.variety), h('span', { class: 'pill' }, `${r.members} · ${num(r.ha)} ha`)), h('b', {}, `${num(r.expected_kg / 1000)} ${t('tonnes')}`)),
    h('div', { class: 'bar' }, h('span', { style: `width:${Math.round(100 * r.expected_kg / max)}%` }))));
}

// ---------- step flow (enter → review → confirm → receipt) ----------
function flow({ title, back, steps, initial, reviewView, submit, receipt }) {
  const val = Object.assign({}, initial);
  let i = 0;
  const draw = () => {
    const visible = steps.filter(s => !s.when || s.when(val));
    if (i >= visible.length) return review();
    const s = visible[i];
    const err = h('div', { class: 'err', role: 'alert' });
    let input;
    const body = h('div', { class: 'card' }, h('div', { class: 'question' }, s.label()), s.hint ? h('div', { class: 'hint' }, s.hint(val)) : null);
    if (s.type === 'choice' || s.type === 'multi') {
      const sel = new Set(s.type === 'multi' ? (val[s.key] || []) : [val[s.key]]);
      const box = h('div', { class: 'choices', role: s.type === 'multi' ? 'group' : 'radiogroup' });
      const paint = () => box.replaceChildren(...s.options(val).map(([v, label]) => h('button', { class: 'choice' + (sel.has(v) ? ' on' : ''), 'aria-pressed': sel.has(v) ? 'true' : 'false', onclick: () => {
        if (s.type === 'multi') { sel.has(v) ? sel.delete(v) : sel.add(v); val[s.key] = [...sel]; paint(); }
        else { val[s.key] = v; i++; draw(); }
      } }, label)));
      paint(); body.append(box);
    } else if (s.type === 'custom') {
      input = s.render(val); body.append(input);
    } else {
      input = h('input', { class: 'in', type: s.type === 'number' ? 'text' : (s.type || 'text'), inputmode: s.type === 'number' ? 'decimal' : null, value: val[s.key] ?? '', placeholder: s.placeholder || '', 'aria-label': s.label() });
      body.append(input);
      if (s.suggest) { const sg = s.suggest(val); if (sg) body.append(h('div', { class: 'hint suggest' }, `${t('suggested')}: ${sg.label} `, h('button', { class: 'chip-btn use-btn', onclick: () => { input.value = sg.value; input.dispatchEvent(new Event('input')); } }, t('useThis')))); }
      if (s.live) { const out = h('div', { class: 'hint live', 'aria-live': 'polite' }); const upd = () => { const n = Number(input.value.replace(/[០-៩]/g, d => '០១២៣៤៥៦៧៨៩'.indexOf(d)).replace(/,/g, '')); out.textContent = input.value.trim() && isFinite(n) ? s.live(n) : ''; }; input.addEventListener('input', upd); upd(); body.append(out); }
      input.addEventListener('keydown', e => { if (e.key === 'Enter') nextBtn.click(); });
      setTimeout(() => input.focus(), 30);
    }
    body.append(err);
    const nextBtn = h('button', { class: 'btn primary', onclick: () => {
      if (s.type === 'choice') { if (val[s.key] === undefined) { err.textContent = t('required'); return; } i++; return draw(); }
      if (s.type === 'multi') { if (!(val[s.key] || []).length) { err.textContent = t('required'); return; } i++; return draw(); }
      if (s.type === 'custom') { const r = s.read(input, val); if (r !== true) { err.textContent = r; return; } i++; return draw(); }
      let v = input.value.trim().replace(/[០-៩]/g, d => '០១២៣៤៥៦៧៨៩'.indexOf(d)).replace(/,/g, '');
      if (!v && !s.optional) { err.textContent = t('required'); return; }
      if (s.type === 'number' && v) { const n = Number(v), max = typeof s.max === 'function' ? s.max(val) : s.max; if (!isFinite(n) || n < (s.min ?? 0) || (max !== undefined && n > max)) { err.textContent = t('invalid'); return; } v = n; }
      val[s.key] = v === '' ? null : v; i++; draw();
    } }, t('next'));
    shell({ title: title(), back: false, tab: null, top: h('div', { class: 'stepper' }, `${i + 1} / ${visible.length + 1}`), body: [
      body,
      // Just Back and Next (no Cancel): Back on the first question leaves the form.
      h('div', { class: 'btn-row flow-nav' }, h('button', { class: 'btn ghost', onclick: () => { if (i > 0) { i--; draw(); } else go(back); } }, t('back')), nextBtn),
    ] });
  };
  const review = () => {
    const err = h('div', { class: 'err', role: 'alert' });
    const buttons = submit.map(([label, fn, cls]) => h('button', { class: `btn ${cls || 'primary'}`, onclick: async e => {
      buttons.forEach(b => (b.disabled = true));
      try { const res = await fn(val); receiptView(res, label); } catch (x) { err.textContent = x.message; buttons.forEach(b => (b.disabled = false)); }
    } }, label));
    shell({ title: t('review'), tab: null, body: [reviewView(val), err,
      h('div', { class: 'btn-row flow-nav' }, h('button', { class: 'btn ghost', onclick: () => { i = Math.max(0, steps.filter(s => !s.when || s.when(val)).length - 1); draw(); } }, t('back')), ...buttons)] });
  };
  const receiptView = (res, label) => {
    const r = receipt(res, val);
    shell({ title: t('success'), tab: null, body: [h('div', { class: 'card receipt' }, h('div', { class: 'tick', 'aria-hidden': 'true' }, '✓'), h('h2', {}, t('success')), h('p', {}, label), r.text ? h('p', {}, r.text) : null,
      r.ref ? h('div', { class: 'refno' }, `${t('reference')}: ${r.ref}`) : null), h('button', { class: 'btn primary', onclick: () => go(r.next) }, t('done'))] });
  };
  draw();
}

// ---------- commune picker ----------
function communePicker(val) {
  const g = S.geo, nm = x => (S.lang === 'en' ? x.name_en : x.name_kh);
  const pv = h('select', { class: 'in', 'aria-label': t('province') }), ds = h('select', { class: 'in', 'aria-label': t('district') }), cm = h('select', { class: 'in', 'aria-label': t('commune') });
  const fill = (sel, items, cur) => { sel.replaceChildren(h('option', { value: '' }, '—'), ...items.map(x => h('option', { value: x.code, selected: x.code === cur }, nm(x)))); };
  const sortBy = a => [...a].sort((x, y) => nm(x).localeCompare(nm(y)));
  fill(pv, sortBy(g.provinces), val.pv_code);
  const refreshD = () => { fill(ds, sortBy(g.districts.filter(d => d.parent === pv.value)), val.ds_code); refreshC(); };
  const refreshC = () => fill(cm, sortBy(g.communes.filter(c => c.parent === ds.value)), val.cm_code);
  pv.addEventListener('change', () => { val.ds_code = val.cm_code = ''; refreshD(); });
  ds.addEventListener('change', () => { val.cm_code = ''; refreshC(); });
  refreshD();
  return h('div', {}, h('label', { class: 'f' }, t('province')), pv, h('label', { class: 'f' }, t('district')), ds, h('label', { class: 'f' }, t('commune')), cm);
}
function readCommune(node, val) {
  const [pv, ds, cm] = node.querySelectorAll('select');
  if (!pv.value || !ds.value || !cm.value) return t('required');
  Object.assign(val, { pv_code: pv.value, ds_code: ds.value, cm_code: cm.value }); return true;
}
const communeName = code => { const c = S.geo && S.geo.communes.find(x => x.code === code); return c ? (S.lang === 'en' ? c.name_en : c.name_kh) : '—'; };

// ---------- screens ----------
// Bank-style login: username + password. The page lists no accounts, so nobody can see who uses the app.
function loginScreen() {
  const user = h('input', { class: 'in', id: 'login-user', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', 'aria-label': t('username') });
  const pw = h('input', { class: 'in', id: 'login-pw', type: 'password', autocomplete: 'current-password', 'aria-label': t('password') });
  const show = h('button', { class: 'chip-btn pw-show', type: 'button', onclick: () => { pw.type = pw.type === 'password' ? 'text' : 'password'; show.textContent = pw.type === 'password' ? t('show') : t('hide'); } }, t('show'));
  const err = h('div', { class: 'err', role: 'alert' });
  const btn = h('button', { class: 'btn primary su-go', type: 'submit' }, t('login'));
  const form = h('form', { class: 'login-form', onsubmit: async e => {
    e.preventDefault();
    if (!user.value.trim() || !pw.value) return (err.textContent = t('required'));
    btn.disabled = true; err.textContent = '';
    try { S.me = await api('POST', '/login', { username: user.value.trim(), password: pw.value }); S.home = null; go('#/home'); }
    catch (x) { err.textContent = x.status === 429 ? t('locked')(x.data && x.data.minutes) : t('wrongLogin'); pw.value = ''; pw.focus(); }
    finally { btn.disabled = false; }
  } },
    h('label', { class: 'f', for: 'login-user' }, t('username')), user,
    h('label', { class: 'f', for: 'login-pw' }, t('password')), h('div', { class: 'pw-row' }, pw, show),
    err, btn);
  $app.replaceChildren(h('div', { class: 'login' },
    h('div', { class: 'brand' }, h('img', { src: '/agricontract/logo.svg', alt: '' }), h('div', {}, h('b', {}, t('app')), h('small', {}, t('appSub')))),
    h('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, h('h2', {}, t('loginTitle')), h('button', { class: 'chip-btn', onclick: () => { toggleLang(); loginScreen(); } }, S.lang === 'km' ? 'EN' : 'ខ្មែរ')),
    form,
    h('p', { class: 'su-line no-acct' }, t('noAccount')),
    h('button', { class: 'acct new', onclick: () => signupScreen('coop') }, h('span', { class: 'av' }, '+'), h('span', {}, t('su_new'), h('small', {}, t('su_newLine')))),
    h('button', { class: 'acct new', onclick: () => signupScreen('processor') }, h('span', { class: 'av' }, '+'), h('span', {}, t('sp_new'), h('small', {}, t('sp_newLine')))),
  ));
  setTimeout(() => user.focus(), 30);
}

// ---------- sign-up. Co-op: find yourself in the MAFF list (or type your name) → who uses it → PIN.
// Processor: company name + province → who uses it → PIN. ----------
async function signupScreen(kind) {
  if (!S.geo) S.geo = await api('GET', '/geo');
  const val = {};
  const page = (title, line, ...body) => $app.replaceChildren(h('div', { class: 'login signup' },
    h('button', { class: 'back-btn', 'aria-label': t('back'), onclick: back }, '‹'),
    h('h2', {}, title), line ? h('p', { class: 'su-line' }, line) : null, ...body));
  let stepNo = 0;
  const steps = kind === 'processor' ? [company, who, account, pinStep] : [find, manual, who, account, pinStep];
  function back() { if (stepNo === 0) return loginScreen(); stepNo = steps[stepNo] === who && val.ac_id ? 0 : stepNo - 1; steps[stepNo](); }
  function next(fn) { stepNo = steps.indexOf(fn); fn(); }

  function company() {
    const name = h('input', { class: 'in', value: val.name_kh || '', placeholder: t('sp_namePh'), 'aria-label': t('sp_name') });
    const nm = x => (S.lang === 'en' ? x.name_en : x.name_kh);
    const pv = h('select', { class: 'in', 'aria-label': t('province') }, h('option', { value: '' }, '—'),
      [...S.geo.provinces].sort((a, b) => nm(a).localeCompare(nm(b))).map(x => h('option', { value: x.code, selected: x.code === val.pv_code }, nm(x))));
    const err = h('div', { class: 'err', role: 'alert' });
    page(t('sp_title'), t('sp_line'), h('label', { class: 'f' }, t('sp_name')), name, h('label', { class: 'f' }, t('sp_where')), pv, err,
      h('button', { class: 'btn primary su-go', onclick: () => {
        if (!name.value.trim() || !pv.value) return (err.textContent = t('required'));
        val.name_kh = name.value.trim(); val.pv_code = pv.value; val.place = pv.selectedOptions[0].textContent; next(who);
      } }, t('next')));
    setTimeout(() => name.focus(), 30);
  }

  function find() {
    val.ac_id = null;
    const q = h('input', { class: 'in', placeholder: t('mafHint'), 'aria-label': t('mafHint'), value: val.q || '' });
    const list = h('div', { class: 'su-list', 'aria-live': 'polite' });
    let timer;
    const search = async () => {
      val.q = q.value.trim();
      const rows = val.q ? await api('GET', `/signup/registry?q=${encodeURIComponent(val.q)}`) : [];
      list.replaceChildren(...(rows.length ? rows.map(r => h('button', { class: 'acct', disabled: r.taken, onclick: () => { Object.assign(val, { ac_id: r.ac_id, name_kh: r.name_kh, place: `${r.commune_kh}, ${r.district_kh}, ${r.province_kh}` }); next(who); } },
        h('span', { class: 'av' }, icon('leaf')), h('span', {}, r.name_kh, h('small', {}, `${r.commune_kh}, ${r.district_kh}, ${r.province_kh}`),
          h('small', {}, r.taken ? t('su_taken') : `${t('members')} ${r.members_total ?? '—'}${r.has_cashew ? ` · ${num(r.cashew_ha)} ha` : ''}`)))) :
        val.q ? [h('p', { class: 'su-line' }, t('su_none'))] : []), rows.length >= 15 ? h('p', { class: 'su-line' }, t('typeMore')) : '');
    };
    q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 300); });
    page(t('su_findTitle'), t('su_findLine'), q, list, h('button', { class: 'btn ghost su-alt', onclick: () => next(manual) }, t('su_notListed')));
    if (val.q) search();
    setTimeout(() => q.focus(), 30);
  }
  function manual() {
    val.ac_id = null;
    const name = h('input', { class: 'in', value: val.name_kh || '', placeholder: t('su_namePh'), 'aria-label': t('su_name') });
    const where = communePicker(val), err = h('div', { class: 'err', role: 'alert' });
    page(t('su_manualTitle'), t('su_manualLine'), h('label', { class: 'f' }, t('su_name')), name, where, err,
      h('button', { class: 'btn primary su-go', onclick: () => {
        const r = readCommune(where, val);
        if (!name.value.trim()) return (err.textContent = t('required'));
        if (r !== true) return (err.textContent = r);
        val.name_kh = name.value.trim(); val.place = communeName(val.cm_code); next(who);
      } }, t('next')));
  }
  function who() {
    const inp = h('input', { class: 'in', value: val.user_name || '', placeholder: t('su_whoPh'), 'aria-label': t('su_who') }), err = h('div', { class: 'err', role: 'alert' });
    const go2 = () => { if (!inp.value.trim()) return (err.textContent = t('required')); val.user_name = inp.value.trim(); next(account); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go2(); });
    if (kind === 'processor') inp.placeholder = t('sp_whoPh');
    page(t('su_who'), kind === 'processor' ? t('sp_whoLine') : t('su_whoLine'),
      h('div', { class: 'su-pick' }, h('b', {}, val.name_kh), h('small', {}, val.place || ''), kind === 'processor' ? h('small', {}, t('processor')) : h('small', {}, val.ac_id ? `✓ ${t('mafOk')}` : t('mafNo'))),
      inp, err, h('button', { class: 'btn primary su-go', onclick: go2 }, t('next')));
    setTimeout(() => inp.focus(), 30);
  }
  function account(msg) {
    const user = h('input', { class: 'in', id: 'su-user', value: val.username || '', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', 'aria-label': t('username') });
    const pw = h('input', { class: 'in', id: 'su-pw', type: 'password', autocomplete: 'new-password', 'aria-label': t('password') });
    const pw2 = h('input', { class: 'in', id: 'su-pw2', type: 'password', autocomplete: 'new-password', 'aria-label': t('su_pw2') });
    const err = h('div', { class: 'err', role: 'alert' }, typeof msg === 'string' ? msg : '');
    const go2 = () => {
      const u = user.value.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(u)) return (err.textContent = t('su_userHint'));
      if (pw.value.length < 6 || pw.value.length > 64) return (err.textContent = t('su_pwHint'));
      if (pw.value !== pw2.value) return (err.textContent = t('su_pwDiff'));
      Object.assign(val, { username: u, password: pw.value }); next(pinStep);
    };
    [user, pw, pw2].forEach(x => x.addEventListener('keydown', e => { if (e.key === 'Enter') go2(); }));
    page(t('su_acct'), t('su_acctLine'),
      h('label', { class: 'f', for: 'su-user' }, t('username')), user, h('small', { class: 'su-hint' }, t('su_userHint')),
      h('label', { class: 'f', for: 'su-pw' }, t('password')), pw, h('small', { class: 'su-hint' }, t('su_pwHint')),
      h('label', { class: 'f', for: 'su-pw2' }, t('su_pw2')), pw2, err,
      h('button', { class: 'btn primary su-go', onclick: go2 }, t('next')));
    setTimeout(() => user.focus(), 30);
  }
  function pinStep() {
    let first = null, pin = '';
    const dots = h('div', { class: 'pin-dots', 'aria-hidden': 'true' }, [0, 1, 2, 3].map(() => h('span')));
    const err = h('div', { class: 'err', role: 'alert' }), title = h('h2', {}, t('su_pin'));
    const paint = () => [...dots.children].forEach((d, k) => d.classList.toggle('on', k < pin.length));
    const shake = msg => { err.textContent = msg; pin = ''; paint(); dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); };
    const press = async k => {
      if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
      paint();
      if (pin.length < 4) return;
      if (first === null) { first = pin; pin = ''; paint(); title.textContent = t('su_pin2'); err.textContent = ''; return; }
      if (pin !== first) { first = null; title.textContent = t('su_pin'); return shake(t('su_pinDiff')); }
      try {
        S.me = await api('POST', '/signup', { type: kind, ac_id: val.ac_id, name_kh: val.name_kh, cm_code: val.cm_code, pv_code: val.pv_code, user_name: val.user_name, username: val.username, password: val.password, pin });
        document.removeEventListener('keydown', onKey); S.home = null; go('#/home');
      } catch (e) {
        document.removeEventListener('keydown', onKey);
        if (e.data && e.data.field === 'username_taken') { stepNo = steps.indexOf(account); return account(t('su_userTaken')); }
        first = null; title.textContent = t('su_pin'); shake(e.status === 409 ? t('su_taken') : e.message);
        document.addEventListener('keydown', onKey);
      }
    };
    const onKey = e => { if (!document.body.contains(dots)) return document.removeEventListener('keydown', onKey); if (/^[0-9]$/.test(e.key)) press(e.key); if (e.key === 'Backspace') press('⌫'); };
    document.addEventListener('keydown', onKey);
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    $app.replaceChildren(h('div', { class: 'login' },
      h('button', { class: 'back-btn', 'aria-label': t('back'), onclick: back }, '‹'),
      title, h('p', { style: 'opacity:.8;margin:0' }, t('su_pinLine')), dots, err,
      h('div', { class: 'keypad' }, keys.map(k => k === '' ? h('span', { class: 'key blank' }) : h('button', { class: 'key', onclick: () => press(k), 'aria-label': k === '⌫' ? 'delete' : k }, k)))));
  }
  steps[0]();
}

async function homeScreen() {
  const d = S.home = await api('GET', '/home');
  const a = d.active;
  let card;
  if (a) {
    const step = STEP_OF[a.status];
    card = h('div', { class: 'card balance', role: 'button', tabindex: '0', onclick: () => go(`#/contract/${a.id}`), onkeydown: e => { if (e.key === 'Enter') go(`#/contract/${a.id}`); } },
      h('div', { class: 'row' }, h('span', { class: 'ref' }, `${a.ref} · ${orgName(a.other)}`), statusChip(a.status)),
      h('div', { class: 'lbl', style: 'margin-top:10px' }, t('committed')),
      h('div', { class: 'big' }, `${num(a.estimate_t)} ${t('tonnes')}`),
      h('div', { class: 'row' }, h('span', {}, `${t('floor')} ${riel(a.floor_riel)}${t('perKg')}`), h('span', {}, `${t('payIn')} ${t('days')(a.pay_days)}`)),
      a.deliver_from ? h('div', { class: 'row' }, h('span', {}, t('c_deliver')(window2(a.deliver_from, a.deliver_to)))) : null,
      h('div', { class: 'progress', 'aria-hidden': 'true' }, [0, 1, 2].map(k => h('span', { class: k <= step ? 'on' : '' }))),
      h('div', { class: 'progress-lbl' }, t('steps').map(s => h('span', {}, s))));
  } else {
    card = h('div', { class: 'card balance' }, h('div', { class: 'lbl' }, t('noContract')), h('div', { class: 'big' }, '—'));
  }
  const more = d.counts.waiting - (a && a.status === 'offered' ? 1 : 0);
  const waiting = S.me.role === 'coop' && more > 0
    ? h('button', { class: 'item waiting', onclick: () => go('#/contracts') }, h('span', { class: 'ic' }, icon('doc')), h('span', { class: 'mid' }, h('b', {}, t('moreWaiting')(more))), h('span', { class: 'end' }, '›'))
    : null;
  const acts = S.me.role === 'coop'
    ? [['plus', 'addMember', '#/member/new'], ['chat', 'msg_title', '#/messages'], ['doc', 'contracts', '#/contracts'], ['bank', 'bankPack', '#/bankpack']]
    : [['pen', 'makeContract', '#/contract/new'], ['chat', 'msg_title', '#/messages'], ['doc', 'contracts', '#/contracts'], ['print', 'print', '#/print']];
  const unread = d.counts.unread || 0;
  const newMsgs = unread ? h('button', { class: 'item waiting', onclick: () => go('#/messages') }, h('span', { class: 'ic' }, icon('chat')), h('span', { class: 'mid' }, h('b', {}, t('msg_new')(unread))), h('span', { class: 'end' }, '›')) : null;
  const actLabel = { create: 'ev_create', edit: 'ev_edit', offer: 'ev_offer', sign: 'ev_sign', signup: 'ev_signup', decline: 'ev_decline', add: 'ev_add', update: 'ev_update', delete: 'ev_delete' };
  const act = d.activity.length ? d.activity.map(e => {
    const detail = JSON.parse(e.detail || '{}');
    return h('div', { class: 'item' }, h('span', { class: 'ic' }, icon(e.entity === 'contract' ? 'doc' : e.entity === 'member' ? 'people' : 'user')),
      h('span', { class: 'mid' }, h('b', {}, t(actLabel[e.action] || e.action)),
        h('small', {}, [e.ref, e.other_kh && orgName({ name_kh: e.other_kh, name_en: e.other_en }), detail.name, e.user_name].filter(Boolean).join(' · '))),
      h('span', { class: 'end' }, h('small', {}, new Date(e.ts).toLocaleDateString(S.lang === 'km' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'short' }))));
  }) : h('div', { class: 'empty' }, t('noActivity'));
  shell({ tab: 'home', body: [card, waiting, newMsgs,
    h('div', { class: 'actions' }, acts.map(([ic, k, href]) => h('button', { class: 'action', onclick: () => go(href) }, h('span', { class: 'ic' }, icon(ic), k === 'msg_title' && unread ? h('span', { class: 'dot-count' }, unread) : null), t(k)))),
    h('div', { class: 'section-h' }, h('span', {}, t('recent'))), h('div', { class: 'list' }, act)] });
}

function contractItem(c) {
  const other = S.me.role === 'coop' ? c.processor : c.coop;
  return h('button', { class: 'item', onclick: () => go(`#/contract/${c.id}`) }, h('span', { class: 'ic' }, icon('doc')),
    h('span', { class: 'mid' }, h('b', {}, orgName(other)), h('small', {}, `${c.ref} · ${c.varieties.map(varName).join(', ')}`)),
    h('span', { class: 'end' }, `${num(c.estimate_t)} ${t('tonnes')}`, h('small', {}, statusChip(c.status))));
}
async function contractsScreen() {
  const cs = await api('GET', '/contracts');
  shell({ title: t('contracts'), back: '#/home', tab: 'contracts', body: [
    S.me.role === 'processor' ? h('button', { class: 'btn primary', style: 'margin:0 0 14px', onclick: () => go('#/contract/new') }, '+ ', t('makeContract')) : null,
    h('div', { class: 'list' }, cs.length ? cs.map(contractItem) : h('div', { class: 'empty' }, t('noContract')))] });
}

// Quality preset: the numbers most cashew buyers use. Anything else shows as "agreed quality".
const STD_Q = { moisture_max: 10, outturn_min: 28, foreign_max: 1, fail_discount_riel: 300 };
const isStdQ = c => Object.entries(STD_Q).every(([k, v]) => Number(c[k]) === v);
// The contract as 7 picture cards: one picture, one big line, one short sentence (comic-contract idea).
function sevenBoxes(c, coop, proc) {
  const v = (c.varieties || []).map(varName).join(' / ');
  const box = (pic, k, big, line, fine) => h('div', { class: 'box pic' }, h('span', { class: 'bx-ic', 'aria-hidden': 'true' }, pic),
    h('div', {}, h('h3', {}, t(k)), h('div', { class: 'bx-big' }, big), line ? h('p', {}, line) : null, fine ? h('small', { class: 'bx-fine' }, fine) : null));
  return h('div', { class: 'boxes' },
    box('🤝', 'box1', `${orgName(proc)} ⇄ ${orgName(coop)}`),
    box('🌰', 'box2', `${t('c_what')} · ${v}`, [t('c_season')(c.season), c.deliver_from ? t('c_deliver')(window2(c.deliver_from, c.deliver_to)) : ''].filter(Boolean).join(' · ')),
    box('⚖️', 'box3', t('c_about')(num(c.estimate_t)), t('c_estimate')),
    box('✅', 'box4', isStdQ(c) ? t('c_std') : t('c_custom'), t('c_qline'), t('c_qfine')(num(c.moisture_max), num(c.outturn_min), num(c.foreign_max))),
    box('💰', 'box5', `${t('c_atleast')(riel(c.floor_riel))}${t('perKg')}`, t('c_priceLine')(riel(c.fail_discount_riel)), usd(c.floor_riel)),
    box('📅', 'box6', t('c_within')(c.pay_days), t('c_payLine')),
    box('🗣️', 'box7', t('c_talk'), t('c_talkLine')(c.mediator)));
}
// Signing = typing the PIN again, like confirming a bank transfer. onPin throws on a wrong PIN; the sheet stays open.
function pinSheet({ title, line, onPin }) {
  return new Promise(resolve => {
    let pin = '', busy = false;
    const dots = h('div', { class: 'pin-dots', 'aria-hidden': 'true' }, [0, 1, 2, 3].map(() => h('span')));
    const err = h('div', { class: 'err', role: 'alert' });
    const paint = () => [...dots.children].forEach((d, k) => d.classList.toggle('on', k < pin.length));
    const close = v => { bg.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const press = async k => {
      if (busy) return;
      if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
      paint();
      if (pin.length < 4) return;
      busy = true;
      try { close(await onPin(pin)); }
      catch (e) { err.textContent = e.data && e.data.field === 'pin' ? t('wrongPin') : e.status === 409 ? t('changedTerms') : e.message; pin = ''; paint(); dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); }
      busy = false;
    };
    const onKey = e => { if (/^[0-9]$/.test(e.key)) press(e.key); if (e.key === 'Backspace') press('⌫'); if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    const bg = h('div', { class: 'sheet-bg', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'sheet' }, h('button', { class: 'back-btn', 'aria-label': t('cancel'), onclick: () => close(null) }, '×'),
        h('h2', {}, title), h('p', {}, line), dots, err,
        h('div', { class: 'keypad' }, keys.map(k => k === '' ? h('span', { class: 'key blank' }) : h('button', { class: 'key', onclick: () => press(k), 'aria-label': k === '⌫' ? 'delete' : k }, k)))));
    document.body.append(bg);
  });
}
function signCard(c) {
  const s = c.signatures;
  if (!s || !s.processor.at) return null;
  const row = (org, sig) => h('div', { class: 'vstep ' + (sig.at ? 'ok' : 'skip') }, h('span', { class: 'vmark', 'aria-hidden': 'true' }, sig.at ? '✓' : '…'),
    h('div', {}, h('b', {}, orgName(org)), h('small', {}, sig.at ? t('signedBy')(sig.by, when(sig.at)) : t('notSigned'))));
  return h('div', { class: 'card' }, h('b', {}, t('signTitle')), row(c.processor, s.processor), row(c.coop, s.coop),
    h('small', { class: 'hint' }, `${t('signCode')}: ${s.code}`));
}
async function contractScreen(id) {
  const c = await api('GET', `/contracts/${id}`);
  const me = S.me.role, err = h('div', { class: 'err', role: 'alert' });
  const doit = (action, body) => async e => { e.target.disabled = true; try { await api('POST', `/contracts/${id}/${action}`, body || {}); render(); } catch (x) { err.textContent = x.status === 409 ? t('st_' + ((x.data && x.data.status) || c.status)) : x.message; e.target.disabled = false; } };
  const sign = (action, title) => async () => { if (await pinSheet({ title, line: t('signLine'), onPin: pin => api('POST', `/contracts/${id}/${action}`, { pin }) })) render(); };
  const acts = [];
  if (me === 'processor' && c.status === 'draft') acts.push(h('button', { class: 'btn primary', onclick: sign('offer', t('signSend')) }, t('signSend')));
  if (me === 'processor' && ['draft', 'offered'].includes(c.status)) acts.push(h('button', { class: 'btn ghost', onclick: () => contractFlow(c) }, t('edit')), c.status === 'offered' ? h('div', { class: 'hint' }, t('editVoids')) : null);
  if (me === 'coop' && c.status === 'offered') {
    // Signing asks for the PIN; declining is final too, so it sits apart and asks once more.
    const box = h('div', { class: 'decline-box' });
    const closed = () => box.replaceChildren(h('button', { class: 'btn ghost decline-open', onclick: ask }, t('decline')));
    const ask = () => {
      const why = h('input', { class: 'in', placeholder: t('declineWhy'), 'aria-label': t('declineWhy') });
      box.replaceChildren(h('div', { class: 'card decline-card' }, h('b', {}, t('declineAsk')), h('p', { class: 'hint' }, t('declineFinal')), why,
        h('div', { class: 'btn-row' }, h('button', { class: 'btn ghost', onclick: closed }, t('cancel')), h('button', { class: 'btn danger', onclick: e => doit('decline', { reason: why.value })(e) }, t('declineYes')))));
      why.focus();
    };
    closed();
    acts.push(h('button', { class: 'btn primary', onclick: sign('sign', t('signAgree')) }, t('signAgree')), box);
  }
  acts.push(h('button', { class: 'btn ghost msg-btn', onclick: () => go(`#/chat/${me === 'coop' ? c.processor.id : c.coop.id}`) }, icon('chat'), t('msg_other')));
  // the printed contract comes in two separate versions, one Khmer and one English
  if (c.status === 'signed') acts.push(h('div', { class: 'btn-row' }, ['km', 'en'].map(l => h('a', { class: 'btn ghost', href: `/agricontract/print/contract.html?id=${c.id}&lang=${l}`, target: '_blank', rel: 'noopener', style: 'text-align:center;text-decoration:none' }, t(l === 'km' ? 'printKm' : 'printEn')))));
  if (c.status === 'signed' && me === 'coop') acts.push(h('a', { class: 'btn ghost', href: `/agricontract/print/bankpack.html?id=${c.id}&lang=${S.lang}`, target: '_blank', rel: 'noopener', style: 'text-align:center;text-decoration:none' }, t('printBank')));
  shell({ title: c.ref, back: '#/contracts', tab: 'contracts', body: [
    h('div', { class: 'card' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:8px' }, h('b', {}, me === 'coop' ? `${t('from')} ${orgName(c.processor)}` : `${t('sentTo')} ${orgName(c.coop)}`), statusChip(c.status)),
      sevenBoxes(c, c.coop, c.processor), h('div', { class: 'note' }, t('digitalNote'))),
    signCard(c),
    acts, err] });
}

function contractFlow(existing) {
  // Like a bank transfer: who → what → how much → price → when paid → quality (standard unless changed).
  const edit = !!existing;
  const init = existing
    ? { ...existing, tonnes: existing.estimate_t, quality: isStdQ(existing) ? 'std' : 'custom' }
    : { varieties: ['M23'], ...STD_Q, pay_days: 3, mediator: '', floor_riel: 6000, quality: 'std', season: S.home.season };   // the next harvest, from the server
  let coops = [];
  const preset = !edit && Number(new URLSearchParams(location.hash.split('?')[1] || '').get('coop')) || null;
  const back = edit ? `#/contract/${existing.id}` : preset ? `#/coop/${preset}` : '#/contracts';
  const coopOf = v => coops.find(x => x.org.id === (v.coop_id || (existing && existing.coop_id)));
  const supplyT = v => { const k = coopOf(v); return k ? k.totals.expected_kg / 1000 : 0; };
  const custom = v => v.quality === 'custom';
  const go2 = () => flow({
    title: () => t('makeContract'), back,
    initial: init,
    steps: [
      { key: 'coop_id', type: 'choice', label: () => t('pickCoop'), when: () => !edit && !preset,
        options: () => coops.filter(k => k.totals.expected_kg > 0).map(k => [k.org.id, `${orgName(k.org)} · ${num(k.totals.expected_kg / 1000)} ${t('tonnes')}`]) },
      { key: 'varieties', type: 'multi', label: () => t('pickVarieties'), options: () => VARS.map(v => [v, varName(v)]) },
      { key: 'tonnes', type: 'number', min: 0.1, max: v => Math.round(supplyT(v) * 10) / 10, label: () => t('askTonnes'), hint: v => t('tonnesHint')(num(supplyT(v))),
        suggest: v => (supplyT(v) ? { value: Math.round(supplyT(v) * 7) / 10, label: `${num(supplyT(v) * 0.7)} ${t('tonnes')} (70%)` } : null) },
      { key: 'floor_riel', type: 'number', min: 1000, max: 50000, label: () => t('askFloor'), live: n => usd(n) },
      { key: 'pay_days', type: 'choice', label: () => t('payDays'), options: () => [1, 3, 7, 14].map(d => [d, t('days')(d)]) },
      { key: 'deliver', type: 'custom', label: () => t('askDeliver'),
        hint: v => { const k = coopOf(v), r = k && harvestRange(k.org); return r ? t('dl_hint')(r) : t('dl_hintNone'); },
        render: v => {
          const y = Number(String(v.season).slice(0, 4));
          if (!v.deliver_from) { const k = coopOf(v), a = k && k.org.harvest_from, b = k && k.org.harvest_to;
            Object.assign(v, a && b ? { deliver_from: `${a > b ? y - 1 : y}-${String(a).padStart(2, '0')}`, deliver_to: `${y}-${String(b).padStart(2, '0')}` } : { deliver_from: `${y}-03`, deliver_to: `${y}-05` }); }
          const opts = [[`${y - 1}-11`, `${monthName(11)} ${y - 1}`], [`${y - 1}-12`, `${monthName(12)} ${y - 1}`], ...Array.from({ length: 9 }, (_, i) => [`${y}-${String(i + 1).padStart(2, '0')}`, `${monthName(i + 1)} ${y}`])];
          return h('div', { class: 'dl-pick' }, h('label', { class: 'f' }, t('dl_from')), monthSelect(v.deliver_from, opts, t('dl_from')), h('label', { class: 'f' }, t('dl_to')), monthSelect(v.deliver_to, opts, t('dl_to')));
        },
        read: (node, v) => { const [a, b] = [...node.querySelectorAll('select')].map(s => s.value); if (a > b) return t('dl_bad');
          const span = (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5)) - Number(a.slice(5)); if (span > 5) return t('dl_long');
          Object.assign(v, { deliver_from: a, deliver_to: b }); return true; } },
      { key: 'quality', type: 'choice', label: () => t('askQuality'), hint: () => t('c_qfine')(STD_Q.moisture_max, STD_Q.outturn_min, STD_Q.foreign_max),
        options: () => [['std', t('qStd')], ['custom', t('qCustom')]] },
      { key: 'moisture_max', type: 'number', min: 5, max: 20, label: () => t('moisture'), when: custom },
      { key: 'outturn_min', type: 'number', min: 15, max: 40, label: () => t('outturn'), when: custom, hint: () => 'M23 28–33% · H09 28–32% · M10 29–34% · IM4 27–32%' },
      { key: 'foreign_max', type: 'number', min: 0, max: 10, label: () => t('foreign'), when: custom },
      { key: 'fail_discount_riel', type: 'number', min: 0, max: 10000, label: () => t('discount'), when: custom },
      { key: 'mediator', type: 'text', optional: true, label: () => t('mediator'), when: custom },
    ],
    reviewView: v => {
      const k = coopOf(v);
      const preview = { ...pick(v), varieties: v.varieties, estimate_t: Number(v.tonnes) };
      return h('div', { class: 'card' }, sevenBoxes(preview, k ? k.org : existing.coop, S.home.org), h('div', { class: 'note' }, t('digitalNote')));
    },
    submit: edit
      ? [[t('save'), v => api('PUT', `/contracts/${existing.id}`, pick(v))]]
      : [[t('signSend'), async v => { const c = await api('POST', '/contracts', pick(v)); return (await pinSheet({ title: t('signSend'), line: t('signLine'), onPin: pin => api('POST', `/contracts/${c.id}/offer`, { pin }) })) || c; }]],
    receipt: c => ({ ref: c.ref, text: `${orgName(c.coop)} · ${num(c.estimate_t)} ${t('tonnes')} · ${t('st_' + c.status)}`, next: `#/contract/${c.id}` }),
  });
  const pick = v => ({ coop_id: v.coop_id, varieties: v.varieties, tonnes: v.tonnes, floor_riel: v.floor_riel, pay_days: v.pay_days, season: v.season, deliver_from: v.deliver_from, deliver_to: v.deliver_to,
    ...(custom(v) ? { moisture_max: v.moisture_max, outturn_min: v.outturn_min, foreign_max: v.foreign_max, fail_discount_riel: v.fail_discount_riel, mediator: v.mediator } : { ...STD_Q, mediator: '' }) });
  api('GET', '/coops').then(list => {
    coops = list;
    if (preset && coops.some(k => k.org.id === preset && k.totals.expected_kg > 0)) init.coop_id = preset;
    else if (preset) return go(`#/coop/${preset}`);   // nothing to buy yet: back to the co-op page, which says so
    go2();
  });
}

const supplyNote = tot => tot.source === 'maff' ? h('div', { class: 'note' }, t('maffSource'))
  : tot.source === 'mixed' ? h('div', { class: 'note' }, t('mixedSource')(tot.entered, num(tot.rest_kg / 1000))) : null;
function coopCardView(k, forProcessor) {
  return [
    h('div', { class: 'card' },
      h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap' }, h('b', { style: 'font-size:18px' }, orgName(k.org)), mafBadge(k.registry, k.verify && k.verify.claimed)),
      h('div', { class: 'hint' }, [k.place.commune, k.place.district, k.place.province].filter(Boolean).join(', ') || '—'),
      harvestRange(k.org) ? h('div', { class: 'harvest-line' }, '🌱 ', t('hv_usual')(harvestRange(k.org))) : null,
      k.registry && k.totals.source !== 'maff' ? h('div', { class: 'hint' }, `${t('mafMembers')}: ${k.registry.members_total ?? '—'} · ${t('mafCashew')}: ${k.registry.cashew_ha ?? 0} ha / ${k.registry.cashew_t ?? 0} t`) : null,
      k.org.facebook_url ? h('a', { class: 'btn ghost', href: k.org.facebook_url, target: '_blank', rel: 'noopener noreferrer', style: 'text-align:center;text-decoration:none' }, t('facebookSee')) : null,
      h('div', { class: 'stats' }, h('div', {}, h('b', {}, k.totals.members), h('small', {}, t('members'))), h('div', {}, h('b', {}, num(k.totals.ha)), h('small', {}, 'ha')),
        h('div', {}, h('b', {}, num(k.totals.expected_kg / 1000)), h('small', {}, t('tonnes')))),
      supplyNote(k.totals)),
    verifyCard(k.verify),
    forProcessor ? photoGallery(k.photos || []) : null,
    k.by_variety.length ? h('div', { class: 'card' }, h('b', {}, t('byVariety')), byVariety(k.by_variety)) : null,
    forProcessor ? h('div', { class: 'card' }, h('b', {}, t('processorRecord')), h('div', { class: 'hint' }, t('noDeliveries'))) : null,
  ];
}
// Find co-ops: the processor's search. Filters stay while you open a co-op and come back.
const FIND = { pv: '', variety: '', min_t: 0, checked: false, new: false };
// The 2-step check and the warning count, as badges on each row of the processor's co-op list.
const STEP1 = { yes: ['b-ok', 'st1_yes'], claimed: ['b-skip', 'st1_claimed'], no: ['b-skip', 'st1_no'] };
const STEP2 = { ok: ['b-ok', 'st2_ok'], over: ['b-warn', 'st2_over'], na: ['b-skip', 'st2_na'] };
function checkBadges(r) {
  const s = r.steps || { step1: 'no', step2: 'na' };
  const badge = ([cls, key]) => h('span', { class: 'badge ' + cls }, { 'b-ok': '✓ ', 'b-warn': '! ', 'b-skip': '' }[cls], t(key));
  return h('span', { class: 'badges' }, badge(STEP1[s.step1]), badge(STEP2[s.step2]),
    r.photos ? h('span', { class: 'badge b-photo' }, t('ph_count')(r.photos)) : null);
}
async function coopsScreen() {
  const qs = new URLSearchParams();
  if (FIND.pv) qs.set('pv', FIND.pv);
  if (FIND.variety) qs.set('variety', FIND.variety);
  if (FIND.min_t) qs.set('min_t', FIND.min_t);
  if (FIND.checked) qs.set('checked', '1');
  if (FIND.new) qs.set('new', '1');
  const d = await api('GET', '/find?' + qs);
  const redo = patch => { Object.assign(FIND, patch); coopsScreen(); };
  const nm = x => (S.lang === 'en' ? x.name_en : x.name_kh);
  const chips = (key, opts) => h('div', { class: 'fchips', role: 'radiogroup' }, opts.map(([v, label]) =>
    h('button', { class: 'fchip' + (FIND[key] === v ? ' on' : ''), 'aria-pressed': FIND[key] === v ? 'true' : 'false', onclick: () => redo({ [key]: v }) }, label)));
  const toggle = (key, label) => h('button', { class: 'fchip' + (FIND[key] ? ' on' : ''), 'aria-pressed': FIND[key] ? 'true' : 'false', onclick: () => redo({ [key]: !FIND[key] }) }, FIND[key] ? '✓ ' : '', label);
  const pv = h('select', { class: 'in', 'aria-label': t('province'), onchange: e => redo({ pv: e.target.value }) }, h('option', { value: '' }, t('allProvinces')),
    [...S.geo.provinces].sort((a, b) => nm(a).localeCompare(nm(b))).map(x => h('option', { value: x.code, selected: x.code === FIND.pv }, nm(x))));
  const filters = h('div', { class: 'card filters' },
    pv,
    h('div', { class: 'flabel' }, t('variety')), chips('variety', [['', t('all')], ...VARS.filter(v => v !== 'Other').map(v => [v, v])]),
    h('div', { class: 'flabel' }, t('atLeast')), chips('min_t', [[0, t('any')], [10, '10+ ' + t('tonnes')], [50, '50+ ' + t('tonnes')], [100, '100+ ' + t('tonnes')]]),
    h('div', { class: 'fchips' }, toggle('checked', t('onlyChecked')), toggle('new', t('onlyNew'))));
  const row = r => {
    const where = (S.lang === 'en' ? [r.place.district_en, r.place.province_en] : [r.place.district, r.place.province]).filter(Boolean).join(', ');
    return h('button', { class: 'item', onclick: () => go(`#/coop/${r.org.id}`) },
      h('span', { class: 'ic' }, icon('leaf')),
      h('span', { class: 'mid' }, h('b', {}, orgName(r.org)),
        h('small', {}, where || '—', r.varieties.length ? ` · ${r.varieties.map(varName).join(', ')}` : ` · ${t('noVarieties')}`),
        harvestRange(r.org) ? h('small', {}, '🌱 ', t('hv_usual')(harvestRange(r.org))) : null,
        checkBadges(r)),
      h('span', { class: 'end' }, h('b', {}, `${num(r.tonnes)} ${t('tonnes')}`),
        r.new ? h('span', { class: 'new-pill' }, t('newToYou')) : h('small', {}, t('workedWith'))));
  };
  const pvName = FIND.pv && S.geo.provinces.find(x => x.code === FIND.pv);
  shell({ title: t('findCoops'), tab: 'coops', body: [filters,
    h('div', { class: 'check-legend' }, h('b', {}, t('legendTitle')), h('span', {}, t('legendLine'))),
    h('div', { class: 'section-h' }, h('span', {}, t('found')(d.results.length)), FIND.variety ? h('small', {}, t('tonnesOf')(FIND.variety)) : null),
    h('div', { class: 'list find-list' }, d.results.length ? d.results.map(row) : h('div', { class: 'empty' }, t('noMatch'))),
    d.unlisted ? h('div', { class: 'note' }, t('unlistedNote')(d.unlisted)) : null,
    d.not_on_app ? h('div', { class: 'note' }, t('notOnApp')(d.not_on_app, pvName ? nm(pvName) : '')) : null] });
}
async function coopScreen(id) {
  const k = await api('GET', `/coops/${id}`);
  shell({ title: orgName(k.org), back: '#/coops', tab: 'coops', body: [...coopCardView(k, true),
    k.contracts.length ? h('div', { class: 'list' }, k.contracts.map(c => contractItem({ ...c, varieties: c.varieties.split(','), coop: k.org }))) : null,
    k.totals.expected_kg > 0 ? h('button', { class: 'btn primary', onclick: () => go(`#/contract/new?coop=${k.org.id}`) }, t('makeContract')) : h('div', { class: 'note' }, t('noMembers')),
    h('button', { class: 'btn ghost msg-btn', onclick: () => go(`#/chat/${k.org.id}`) }, icon('chat'), t('msg_coop'))] });
}

async function membersScreen() {
  const d = await api('GET', '/members');
  shell({ title: t('members'), tab: 'members', body: [
    h('button', { class: 'btn primary', style: 'margin:0 0 14px', onclick: () => go('#/member/new') }, '+ ', t('addMember')),
    h('div', { class: 'card' }, h('div', { class: 'stats', style: 'margin-top:0' }, h('div', {}, h('b', {}, d.totals.members), h('small', {}, t('members'))), h('div', {}, h('b', {}, num(d.totals.ha)), h('small', {}, 'ha')),
      h('div', {}, h('b', {}, num(d.totals.expected_kg / 1000)), h('small', {}, t('tonnes')))), d.by_variety.length ? byVariety(d.by_variety) : null,
      supplyNote(d.totals)),
    h('div', { class: 'list' }, d.members.length ? d.members.map(m => h('button', { class: 'item', onclick: () => go(`#/member/${m.id}`) },
      h('span', { class: 'ic' }, m.name.slice(0, 1)), h('span', { class: 'mid' }, h('b', {}, m.name), h('small', {}, `${varName(m.variety)} · ${communeName(m.cm_code)}${m.owes_at_harvest ? ' · ⚠' : ''}`)),
      h('span', { class: 'end' }, `${num(m.expected_kg || 0, 0)} kg`, h('small', {}, `${num(m.ha)} ha`)))) : h('div', { class: 'empty' }, t('noMembers')))] });
}

async function memberFlow(id) {
  const d = await api('GET', '/members');
  const existing = id ? d.members.find(m => String(m.id) === String(id)) : null;
  if (id && !existing) return go('#/members');
  const org = d.org;
  const init = existing ? { ...existing, owes_at_harvest: existing.owes_at_harvest ? 1 : 0 } : { pv_code: org.pv_code, ds_code: org.ds_code, cm_code: org.cm_code, owes_at_harvest: undefined };
  const bench = v => S.varieties[v.variety] ? S.varieties[v.variety].yield_t_ha : null;
  flow({
    title: () => (existing ? t('edit') : t('addMember')), back: '#/members', initial: init,
    steps: [
      { key: 'name', type: 'text', label: () => t('name') },
      { key: 'village', type: 'text', label: () => t('village'), optional: true },
      { key: 'loc', type: 'custom', label: () => t('location'), render: communePicker, read: readCommune },
      { key: 'variety', type: 'choice', label: () => t('variety'), options: () => VARS.map(v => [v, varName(v)]) },
      { key: 'ha', type: 'number', min: 0, max: 1000, label: () => t('ha') },
      { key: 'tree_age', type: 'number', min: 0, max: 80, label: () => t('treeAge'), optional: true },
      { key: 'expected_kg', type: 'number', min: 0, max: 10000000, label: () => t('expectedKg'), optional: true,
        suggest: v => (bench(v) && v.ha ? { value: Math.round(v.ha * bench(v) * 1000), label: `${num(v.ha * bench(v) * 1000, 0)} kg (${v.variety} ${bench(v)} t/ha)` } : null) },
      { key: 'owes_at_harvest', type: 'choice', label: () => t('owes'), options: () => [[1, t('yes')], [0, t('no')]] },
    ],
    reviewView: v => h('div', { class: 'card review' }, h('dl', {},
      [[t('name'), v.name], [t('village'), v.village || '—'], [t('commune'), communeName(v.cm_code)], [t('variety'), varName(v.variety)], [t('ha'), num(v.ha)],
       [t('treeAge'), v.tree_age ?? '—'], [t('expectedKg'), v.expected_kg != null ? `${num(v.expected_kg, 0)} kg` : '—'], [t('owes'), v.owes_at_harvest ? t('yes') : t('no')]]
        .map(([a, b]) => [h('dt', {}, a), h('dd', {}, b)]))),
    submit: [[t('confirm'), v => {
      const body = { name: v.name, village: v.village, pv_code: v.pv_code, ds_code: v.ds_code, cm_code: v.cm_code, variety: v.variety, ha: v.ha, tree_age: v.tree_age, expected_kg: v.expected_kg, owes_at_harvest: v.owes_at_harvest };
      return existing ? api('PUT', `/members/${existing.id}`, body) : api('POST', '/members', body);
    }]],
    receipt: m => ({ ref: `M-${String(m.id).padStart(4, '0')}`, text: `${m.name} · ${varName(m.variety)} · ${num(m.ha)} ha`, next: '#/members' }),
  });
  if (existing) {
    // offer removal from the first step
    const del = h('button', { class: 'btn danger', onclick: async () => { if (del.dataset.sure) { await api('DELETE', `/members/${existing.id}`); go('#/members'); } else { del.dataset.sure = '1'; del.textContent = t('removeConfirm'); } } }, t('remove'));
    document.querySelector('.content').append(del);
  }
}

async function bankScreen() {
  const cs = await api('GET', '/contracts');
  const signed = cs.filter(c => c.status === 'signed');
  shell({ title: t('bankPack'), back: '#/home', tab: 'home', body: [
    h('div', { class: 'card' }, h('p', { style: 'margin-top:0' }, t('bankNote')),
      h('a', { class: 'btn ghost', href: '/agricontract/print/pledge.html', target: '_blank', rel: 'noopener', style: 'text-align:center;text-decoration:none' }, t('printPledge'))),
    signed.length ? h('div', { class: 'list' }, signed.map(c => h('a', { class: 'item', href: `/agricontract/print/bankpack.html?id=${c.id}&lang=${S.lang}`, target: '_blank', rel: 'noopener', style: 'text-decoration:none;color:inherit' },
      h('span', { class: 'ic' }, icon('bank')), h('span', { class: 'mid' }, h('b', {}, orgName(c.processor)), h('small', {}, c.ref)), h('span', { class: 'end' }, t('print')))))
      : h('div', { class: 'card' }, h('div', { class: 'hint' }, t('bankNeedsSigned')))] });
}

async function printScreen() {
  const signed = (await api('GET', '/contracts')).filter(c => c.status === 'signed');
  shell({ title: t('print'), back: '#/home', tab: 'home', body: [
    signed.length ? h('div', { class: 'list' }, signed.map(c => h('a', { class: 'item', href: `/agricontract/print/contract.html?id=${c.id}&lang=${S.lang}`, target: '_blank', rel: 'noopener', style: 'text-decoration:none;color:inherit' },
      h('span', { class: 'ic' }, icon('print')), h('span', { class: 'mid' }, h('b', {}, orgName(c.coop)), h('small', {}, `${c.ref} · ${num(c.estimate_t)} ${t('tonnes')}`)), h('span', { class: 'end' }, t('printContract')))))
      : h('div', { class: 'card' }, h('div', { class: 'hint' }, t('printNeedsSigned')))] });
}

async function meScreen() {
  const err = h('div', { class: 'err', role: 'alert' });
  const parts = [];
  if (S.me.role === 'coop') {
    const k = await api('GET', '/coop/profile');
    const results = h('div', { class: 'list', style: 'margin-top:10px' });
    const q = h('input', { class: 'in', placeholder: t('mafHint'), 'aria-label': t('mafPick') });
    let timer;
    q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(async () => {
      const rows = q.value.trim() ? await api('GET', `/registry?q=${encodeURIComponent(q.value)}`) : [];
      results.replaceChildren(...rows.slice(0, 8).map(r => h('button', { class: 'item', onclick: async () => {
        try { await api('PUT', '/coop/profile', { ac_id: r.ac_id }); render(); } catch (x) { err.textContent = x.message; }
      } }, h('span', { class: 'ic' }, r.has_cashew ? icon('leaf') : '·'), h('span', { class: 'mid' }, h('b', {}, r.name_kh), h('small', {}, `${r.commune_kh}, ${r.district_kh}, ${r.province_kh}`)),
        h('span', { class: 'end' }, r.has_cashew ? `${r.cashew_ha ?? 0} ha` : ''))));
    }, 250); });
    const fb = h('input', { class: 'in', type: 'url', value: k.org.facebook_url || '', placeholder: t('facebookHint'), 'aria-label': t('facebook') });
    parts.push(...coopCardView(k, false).slice(0, 1));
    const hvOpts = [['', '—'], ...Array.from({ length: 12 }, (_, i) => [i + 1, monthName(i + 1)])];
    const hvA = monthSelect(k.org.harvest_from || '', hvOpts, t('dl_from')), hvB = monthSelect(k.org.harvest_to || '', hvOpts, t('dl_to'));
    const hvMsg = h('div', { class: 'hint', 'aria-live': 'polite' });
    parts.push(h('div', { class: 'card' }, h('b', {}, t('hv_title')), h('div', { class: 'hint' }, t('hv_line')),
      h('div', { class: 'hv-row' }, h('div', {}, h('label', { class: 'f' }, t('dl_from')), hvA), h('div', {}, h('label', { class: 'f' }, t('dl_to')), hvB)),
      h('button', { class: 'btn primary', onclick: async () => {
        if (!hvA.value !== !hvB.value) return (hvMsg.textContent = t('required'));
        try { await api('PUT', '/coop/profile', { harvest_from: hvA.value, harvest_to: hvB.value }); hvMsg.textContent = t('saved'); } catch (x) { hvMsg.textContent = t('invalid'); }
      } }, t('save')), hvMsg));
    parts.push(photoManager(k.photos || []));
    if (k.verify && k.verify.maff) parts.push(h('div', {}, verifyCard(k.verify), h('div', { class: 'hint', style: 'margin:-6px 4px 14px' }, t('verifyMine'))));
    if (!k.org.anon) parts.push(
      h('div', { class: 'card' }, h('b', {}, t('mafPick')), k.registry ? h('div', { style: 'margin-top:8px' }, mafBadge(k.registry), ' ', h('span', {}, k.registry.name_kh),
        h('button', { class: 'btn ghost', onclick: async () => { await api('PUT', '/coop/profile', { ac_id: '' }); render(); } }, t('mafUnlink'))) : [q, results]),
      h('div', { class: 'card' }, h('label', { class: 'f', style: 'margin-top:0' }, t('facebook')), fb,
        h('button', { class: 'btn primary', onclick: async () => { try { await api('PUT', '/coop/profile', { facebook_url: fb.value.trim() }); render(); } catch (x) { err.textContent = t('invalid'); } } }, t('save'))));
  } else {
    parts.push(h('div', { class: 'card' }, h('b', { style: 'font-size:18px' }, orgName(S.home.org)), h('div', { class: 'hint' }, `${t('processor')} · ${S.me.name}`)));
  }
  shell({ title: t('me'), tab: 'me', body: [...parts, err,
    h('div', { class: 'card' }, h('label', { class: 'f', style: 'margin-top:0' }, t('language')), h('div', { class: 'lang-row' },
      h('button', { class: 'choice' + (S.lang === 'km' ? ' on' : ''), onclick: () => S.lang !== 'km' && toggleLang() }, 'ខ្មែរ'), h('button', { class: 'choice' + (S.lang === 'en' ? ' on' : ''), onclick: () => S.lang !== 'en' && toggleLang() }, 'English'))),
    h('button', { class: 'btn danger', onclick: async () => { await api('POST', '/logout', {}); S.me = null; go('#/login'); } }, t('logout'))] });
}

// ---------- cashew nut photos ----------
const photoDate = iso => new Date(iso).toLocaleDateString(S.lang === 'km' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
function lightbox(p) {
  const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const box = h('div', { class: 'lightbox', role: 'dialog', 'aria-label': p.caption || t('ph_title'), onclick: close },
    h('img', { src: `/api/photos/${p.id}`, alt: p.caption || t('ph_title') }),
    h('div', { class: 'lb-cap' }, [p.caption, t('ph_added')(photoDate(p.created_at))].filter(Boolean).join(' · ')),
    h('button', { class: 'lb-close', 'aria-label': t('close') }, '✕'));
  document.addEventListener('keydown', onKey);
  document.body.append(box);
}
const thumb = (p, extra) => h('div', { class: 'ph' }, h('button', { class: 'ph-img', onclick: () => lightbox(p), 'aria-label': p.caption || t('ph_title') }, h('img', { src: `/api/photos/${p.id}`, alt: p.caption || t('ph_title'), loading: 'lazy' })),
  h('small', {}, p.caption || '', p.caption ? h('br') : null, t('ph_added')(photoDate(p.created_at))), extra || null);
// What a processor sees on a co-op's page.
function photoGallery(list) {
  return h('div', { class: 'card' }, h('b', {}, t('ph_title')), h('div', { class: 'hint' }, t('ph_by')),
    list.length ? h('div', { class: 'ph-grid' }, list.map(p => thumb(p))) : h('div', { class: 'hint' }, t('ph_none')));
}
// Make a phone photo smaller before upload (max 1600 px, JPEG); re-drawing it also drops the camera's hidden data.
const shrink = file => new Promise((ok, bad) => {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    c.toBlob(b => (b ? ok(b) : bad(new Error('photo'))), 'image/jpeg', 0.85);
  };
  img.onerror = () => { URL.revokeObjectURL(url); bad(new Error('photo')); };
  img.src = url;
});
// The co-op's own photos, on Me: add (camera or gallery) and remove.
function photoManager(list) {
  const err = h('div', { class: 'err', role: 'alert' }), status = h('div', { class: 'hint', 'aria-live': 'polite' });
  const cap = h('input', { class: 'in', id: 'ph-cap', maxlength: '80', placeholder: t('ph_capPh'), 'aria-label': t('ph_cap') });
  const file = h('input', { type: 'file', accept: 'image/*', class: 'ph-file', 'aria-label': t('ph_add') });
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    err.textContent = ''; status.textContent = t('ph_uploading');
    try {
      const blob = await shrink(f);
      const r = await fetch(`/api/coop/photos?caption=${encodeURIComponent(cap.value.trim())}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.field === 'too_many' ? t('ph_tooMany') : t('ph_bad')); }
      render();
    } catch (x) { status.textContent = ''; err.textContent = x.message === 'photo' ? t('ph_bad') : x.message; file.value = ''; }
  });
  const remove = p => h('button', { class: 'ph-del', 'aria-label': t('ph_remove'), onclick: async () => { await api('DELETE', `/coop/photos/${p.id}`); render(); } }, '✕');
  const full = list.length >= 12;
  return h('div', { class: 'card' }, h('b', {}, t('ph_title')), h('div', { class: 'hint' }, t('ph_line')),
    list.length ? h('div', { class: 'ph-grid' }, list.map(p => thumb(p, remove(p)))) : null,
    full ? h('div', { class: 'hint' }, t('ph_tooMany')) : [h('label', { class: 'f', for: 'ph-cap' }, t('ph_cap')), cap,
      h('label', { class: 'btn primary ph-pick' }, icon('camera'), t('ph_add'), file)],
    status, err);
}

// ---------- messages: talk and negotiate in the app, no phone numbers needed ----------
async function inboxScreen() {
  const rows = await api('GET', '/messages');
  shell({ title: t('msg_title'), back: '#/home', tab: 'home', body: [
    h('div', { class: 'hint', style: 'margin:0 4px 12px' }, S.me.role === 'coop' ? t('msg_coopLine') : t('msg_procLine')),
    h('div', { class: 'list' }, rows.length ? rows.map(r => h('button', { class: 'item' + (r.unread ? ' unread' : ''), onclick: () => go(`#/chat/${r.other_id}`) },
      h('span', { class: 'ic' }, icon('chat')),
      h('span', { class: 'mid' }, h('b', {}, orgName(r.other)), h('small', { class: 'msg-last' }, (r.mine ? t('msg_you') + ': ' : '') + r.last)),
      h('span', { class: 'end' }, h('small', {}, photoDate(r.at)), r.unread ? h('span', { class: 'dot-count' }, r.unread) : null))) : h('div', { class: 'empty' }, t('msg_none')))] });
}
async function chatScreen(otherId) {
  const here = location.hash;
  const d = await api('GET', `/messages/${otherId}`);
  const list = h('div', { class: 'chat', 'aria-live': 'polite' });
  const paint = msgs => {
    list.replaceChildren(...(msgs.length ? msgs.map(m => h('div', { class: 'bubble' + (m.mine ? ' mine' : '') }, h('div', {}, m.body),
      h('small', {}, `${m.mine ? t('msg_you') : m.user_name || ''} · ${when(m.created_at)}`))) : [h('div', { class: 'empty' }, t('msg_start'))]));
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 0);
  };
  const box = h('textarea', { class: 'in chat-in', rows: '2', maxlength: '1000', placeholder: t('msg_ph'), 'aria-label': t('msg_ph') });
  const err = h('div', { class: 'err', role: 'alert' });
  const sendIt = async () => {
    const body = box.value.trim(); if (!body) return;
    btn.disabled = true;
    try { await api('POST', `/messages/${otherId}`, { body }); box.value = ''; paint((await api('GET', `/messages/${otherId}`)).messages); }
    catch (x) { err.textContent = t('invalid'); }
    finally { btn.disabled = false; box.focus(); }
  };
  const btn = h('button', { class: 'btn primary chat-send', onclick: sendIt }, t('msg_send'));
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendIt(); } });
  shell({ title: orgName(d.other), back: '#/messages', tab: 'home', body: [
    h('div', { class: 'hint', style: 'margin:0 4px 10px' }, t('msg_safe')), list,
    d.can_write ? h('div', { class: 'chat-bar' }, box, btn) : h('div', { class: 'note' }, t('msg_coopWait')), err] });
  paint(d.messages);
  // check for replies every 5 seconds while this chat is open
  const timer = setInterval(async () => {
    if (location.hash !== here || !document.body.contains(list)) return clearInterval(timer);
    try { const n = await api('GET', `/messages/${otherId}`); if (n.messages.length !== list.querySelectorAll('.bubble').length) paint(n.messages); } catch (e) { clearInterval(timer); }
  }, 5000);
}

// ---------- router ----------
async function render() {
  document.documentElement.lang = S.lang;
  const [path] = (location.hash.slice(1) || '/home').split('?');
  const p = path.split('/').filter(Boolean);
  try {
    if (p[0] === 'login') return loginScreen();
    if (!S.me) { try { S.me = await api('GET', '/me'); } catch (e) { return; } }
    if (!S.geo) [S.geo, S.varieties] = await Promise.all([api('GET', '/geo'), api('GET', '/varieties')]);
    if (!S.home || p[0] === 'home') S.home = await api('GET', '/home');
    const coop = S.me.role === 'coop';
    if (p[0] === 'contracts') return contractsScreen();
    if (p[0] === 'messages') return inboxScreen();
    if (p[0] === 'chat' && p[1]) return chatScreen(p[1]);
    if (p[0] === 'contract' && p[1] === 'new' && !coop) return contractFlow(null);
    if (p[0] === 'contract' && p[1]) return contractScreen(p[1]);
    if (p[0] === 'coops' && !coop) return coopsScreen();
    if (p[0] === 'coop' && p[1] && !coop) return coopScreen(p[1]);
    if (p[0] === 'members' && coop) return membersScreen();
    if (p[0] === 'member' && coop) return memberFlow(p[1] === 'new' ? null : p[1]);
    if (p[0] === 'bankpack' && coop) return bankScreen();
    if (p[0] === 'print' && !coop) return printScreen();
    if (p[0] === 'me') return meScreen();
    return homeScreen();
  } catch (e) {
    if (e.message === 'login') return;
    $app.replaceChildren(h('div', { class: 'app' }, h('div', { class: 'card', style: 'margin:16px' }, h('b', {}, 'Error'), h('p', {}, String(e.message)), h('button', { class: 'btn primary', onclick: () => go('#/home') }, t('home')))));
  }
}
window.addEventListener('hashchange', render);
render();
