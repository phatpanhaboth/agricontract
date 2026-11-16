// Public page behind the verify QR on a printed contract. No login: the secret key in the link is the access.
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = String(text); if (cls) n.className = cls; return n; };
const add = (p, tag, text, cls) => p.appendChild(el(tag, text, cls));
const num = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const month = ym => `${MON[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
const when = iso => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', dateStyle: 'medium', timeStyle: 'short' });

const STATUS = {
  valid: ['s-ok', '✓ កិច្ចសន្យាត្រឹមត្រូវ', 'Valid contract', 'ភាគីទាំងពីរបានចុះហត្ថលេខា ហើយលក្ខខណ្ឌមិនត្រូវបានកែប្រែ។ / Signed by both sides; the terms have not changed.'],
  changed: ['s-bad', '✗ លក្ខខណ្ឌត្រូវបានកែប្រែ', 'Terms changed', 'លក្ខខណ្ឌមិនត្រូវនឹងហត្ថលេខាទេ។ កុំប្រើឯកសារនេះ។ / The terms no longer match the signatures. Do not rely on this paper.'],
  cancelled: ['s-bad', '✗ កិច្ចសន្យាត្រូវបានលុបចោល', 'Contract cancelled', 'កុំប្រើឯកសារនេះ។ / Do not rely on this paper.'],
  not_signed: ['s-warn', '! មិនទាន់ចុះហត្ថលេខាពេញ', 'Not fully signed', 'ភាគីទាំងពីរមិនទាន់ចុះហត្ថលេខា។ / Not signed by both sides yet.'],
};

function row(card, km, en, value) {
  const r = add(card, 'div', null, 'row');
  const l = add(r, 'span'); l.append(km, el('br'), el('small', en, 'en'));
  add(r, 'b', value);
}

function show(v) {
  const main = document.querySelector('main'); main.replaceChildren();
  const brand = add(main, 'div', null, 'brand'); const img = el('img'); img.src = '/agricontract/logo.svg'; img.alt = ''; brand.append(img, 'ពិនិត្យកិច្ចសន្យា · Contract check');
  const [cls, km, en, line] = STATUS[v.status] || STATUS.not_signed;
  const s = add(main, 'div', null, `status ${cls}`); add(s, 'b', km); add(s, 'b', en); add(s, 'small', line);

  add(main, 'h2', 'កិច្ចសន្យា / Contract');
  const c = add(main, 'div', null, 'card');
  row(c, 'លេខ', 'Reference', v.ref);
  row(c, 'កូដហត្ថលេខា', 'Signing code', v.signatures.code || '—');
  row(c, 'អ្នកទិញ', 'Buyer (processor)', v.processor);
  row(c, 'អ្នកលក់', 'Seller (co-op)', v.coop);
  row(c, 'រដូវ / ពូជ', 'Season / variety', `${v.season} · ${v.varieties.join(', ')}`);
  row(c, 'បរិមាណប៉ាន់ស្មាន', 'Estimated tonnes', `${num(v.estimate_t)} t`);
  row(c, 'តម្លៃទាបបំផុត', 'Floor price', `${num(v.floor_riel)} ៛/kg`);
  if (v.deliver_from) row(c, 'ពេលប្រគល់', 'Delivery', `${month(v.deliver_from)} – ${month(v.deliver_to)}`);
  row(c, 'បង់ប្រាក់', 'Payment', `${v.pay_days} days after delivery`);

  add(main, 'h2', 'ហត្ថលេខា / Signatures');
  const g = add(main, 'div', null, 'card');
  const sg = v.signatures;
  row(g, 'អ្នកទិញ', 'Processor', sg.processor.at ? `✓ ${when(sg.processor.at)}` : '—');
  row(g, 'អ្នកលក់', 'Co-op', sg.coop.at ? `✓ ${when(sg.coop.at)}` : '—');

  add(main, 'h2', 'ការពិនិត្យ ២ ជំហាន / 2-step check');
  const k = add(main, 'div', null, 'card'), ch = v.check || {}, land = ch.land || {};
  row(k, '① បញ្ជី MAFF', '① In the MAFF co-op list', ch.maff ? '✓ Yes' : '✗ No');
  row(k, '② ដីធៀបនឹង CDB', '② Cashew land vs CDB', !ch.maff ? 'Can’t check' : land.status === 'ok' ? `✓ ${num(land.maff_ha)} ≤ ${num(land.cdb_ha)} ha`
    : land.status === 'over' ? `! ${num(land.maff_ha)} > ${num(land.cdb_ha)} ha` : 'No CDB data');

  add(main, 'p', `ពិនិត្យនៅ / Checked: ${when(v.checked_at)} (Cambodia time). ព័ត៌មាននេះមកពីកម្មវិធីផ្ទាល់ មិនមែនពីក្រដាសទេ។ / This comes live from the app, not from the paper.`, 'foot');
}

function fail() {
  const main = document.querySelector('main'); main.replaceChildren();
  const s = add(main, 'div', null, 'status s-bad');
  add(s, 'b', '✗ រកមិនឃើញកិច្ចសន្យា'); add(s, 'b', 'Contract not found');
  add(s, 'small', 'QR នេះមិនត្រឹមត្រូវ ឬឯកសារអាចជាក្លែងក្លាយ។ / This QR is not valid, or the paper may be fake.');
}

const q = new URLSearchParams(location.search);
fetch(`/api/verify?r=${encodeURIComponent(q.get('r') || '')}&k=${encodeURIComponent(q.get('k') || '')}`)
  .then(r => (r.ok ? r.json() : Promise.reject(r.status))).then(show).catch(fail);
