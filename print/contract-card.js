// Shared by contract.html and bankpack.html. Each printout is ONE language: ?lang=km (default) or ?lang=en.
const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'km';
document.documentElement.lang = LANG;
const L = (km, en) => (LANG === 'en' ? en : km);

const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = String(text); if (cls) n.className = cls; return n; };
const add = (parent, tag, text, cls) => { const n = el(tag, text, cls); parent.appendChild(n); return n; };
const num = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const MON_KM = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
const MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthOf = ym => `${L(MON_KM, MON_EN)[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
const orgName = o => (LANG === 'en' && o.name_en) || o.name;
const when = iso => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', dateStyle: 'medium', timeStyle: 'short' });

// Toolbar: print, plus a switch to the same document in the other language. Hidden when printing.
function toolbar() {
  const bar = document.querySelector('.toolbar');
  const other = new URLSearchParams(location.search); other.set('lang', LANG === 'en' ? 'km' : 'en');
  const print = el('button', L('បោះពុម្ព', 'Print')); print.type = 'button'; print.onclick = () => window.print();
  const sw = el('a', LANG === 'en' ? 'ខ្មែរ' : 'English', 'lang-switch'); sw.href = `?${other}`;
  bar.replaceChildren(print, sw);
  document.querySelector('main p').textContent = L('កំពុងទាញទិន្នន័យ…', 'Loading…');
}

function contractCard(c) {
  const page = el('section', null, 'contract-page');
  const P = orgName(c.processor), C = orgName(c.coop), mediator = c.mediator || L('អ្នកសម្រុះសម្រួលដែលភាគីទាំងពីរយល់ព្រម', 'a mediator both sides agree on');
  const code = (c.signatures && c.signatures.code) || '—';
  add(page, 'h1', L('កិច្ចសន្យាទិញលក់ស្វាយចន្ទី', 'Cashew Purchase Contract'));
  add(page, 'p', L(`លេខ៖ ${c.ref} · កូដហត្ថលេខា៖ ${code}`, `No. ${c.ref} · Signing code: ${code}`), 'meta');
  const deliver = c.deliver_from ? L(` ប្រគល់គ្រាប់ពីខែ ${monthOf(c.deliver_from)} ដល់ខែ ${monthOf(c.deliver_to)}។`, ` Delivery from ${monthOf(c.deliver_from)} to ${monthOf(c.deliver_to)}.`) : '';
  const boxes = LANG === 'en' ? [
    ['1. Parties', `${P} (registration no. ${c.processor.registration_no}) and ${C} (registration no. ${c.coop.registration_no}).`],
    ['2. What and season', `Dried raw cashew nuts, variety ${c.varieties.join(' / ')}. Season: ${c.season}.${deliver}`],
    ['3. Quantity', `The co-op sells ${num(c.share_pct)}% of its members’ harvest to the processor, about ${num(c.estimate_t)} tonnes. This is an estimate, not a promise of quantity.`],
    ['4. Quality', `Moisture ≤ ${num(c.moisture_max_pct)}%. Kernel outturn ≥ ${num(c.outturn_min_pct)}%. Foreign matter ≤ ${num(c.foreign_matter_max_pct)}%. Both sides test together at delivery and keep a sealed sample.`],
    ['5. Price', `The processor’s price on delivery day, but never below ${num(c.floor_riel_per_kg)} riel/kg. If the quality fails, deduct ${num(c.fail_discount_riel_per_kg)} riel/kg, or the co-op takes the nuts back.`],
    ['6. Payment', `Pay in full to the co-op’s account within ${num(c.payment_days)} days of delivery.`],
    ['7. If there is a problem', `Talk within 3 days. If it is not settled, ask ${mediator} to mediate within 7 days. After that, ask district arbitration or a court to decide. If one side breaks the contract twice, the other side may end it.`],
  ] : [
    ['១. ភាគី', `${P} (លេខចុះបញ្ជី ${c.processor.registration_no}) និង ${C} (លេខចុះបញ្ជី ${c.coop.registration_no})។`],
    ['២. អ្វី និងរដូវ', `គ្រាប់ស្វាយចន្ទីស្ងួត ពូជ ${c.varieties.join(' / ')}។ រដូវ៖ ${c.season}។${deliver}`],
    ['៣. បរិមាណ', `សហគមន៍លក់ ${num(c.share_pct)}% នៃផលសមាជិក ឱ្យក្រុមហ៊ុន។ ប្រហែល ${num(c.estimate_t)} តោន។ នេះជាការប៉ាន់ស្មាន មិនមែនការសន្យាបរិមាណទេ។`],
    ['៤. គុណភាព', `សំណើម ≤ ${num(c.moisture_max_pct)}%។ សាច់ក្នុង ≥ ${num(c.outturn_min_pct)}%។ វត្ថុផ្សេងៗ ≤ ${num(c.foreign_matter_max_pct)}%។ ភាគីទាំងពីរធ្វើតេស្តជាមួយគ្នាពេលប្រគល់ និងរក្សាទុកគំរូបិទជិត។`],
    ['៥. តម្លៃ', `ប្រើតម្លៃក្រុមហ៊ុននៅថ្ងៃប្រគល់ ប៉ុន្តែមិនតិចជាង ${num(c.floor_riel_per_kg)} រៀល/គីឡូក្រាម។ បើមិនត្រូវគុណភាព បន្ថយ ${num(c.fail_discount_riel_per_kg)} រៀល/គីឡូក្រាម ឬសហគមន៍យកត្រឡប់វិញ។`],
    ['៦. ការបង់ប្រាក់', `បង់ប្រាក់ពេញទៅគណនីសហគមន៍ ក្នុងរយៈពេល ${num(c.payment_days)} ថ្ងៃក្រោយប្រគល់។`],
    ['៧. បើមានបញ្ហា', `ពិភាក្សាក្នុង ៣ ថ្ងៃ។ បើមិនចប់ សុំ ${mediator} ជួយសម្រុះសម្រួលក្នុង ៧ ថ្ងៃ។ បន្ទាប់មក សុំអាជ្ញាកណ្ដាលថ្នាក់ស្រុក ឬតុលាការដោះស្រាយ។ បើភាគីម្ខាងមិនគោរពកិច្ចសន្យា ២ ដង ភាគីម្ខាងទៀតអាចបញ្ចប់កិច្ចសន្យា។`],
  ];
  boxes.forEach(([title, text]) => { const box = add(page, 'section', null, 'box'); add(box, 'h3', title); add(box, 'p', text); });
  const signatures = add(page, 'div', null, 'signatures');
  const sg = c.signatures || {};
  [[P, sg.processor], [C, sg.coop]].forEach(([name, x]) => {
    const side = add(signatures, 'section'); add(side, 'strong', name);
    add(side, 'p', x && x.at ? L(`✓ ចុះហត្ថលេខាក្នុងកម្មវិធី៖ ${x.by} · ${when(x.at)} (ម៉ោងកម្ពុជា)`, `✓ Signed in the app: ${x.by} · ${when(x.at)} (Cambodia time)`) : L('មិនទាន់ចុះហត្ថលេខា', 'Not signed yet'));
  });
  const qr = verifyQr(c); if (qr) page.appendChild(qr);
  return page;
}

// Verify QR: a bank scans it with any phone camera and sees whether this contract is real and still valid.
function verifyQr(c) {
  if (!c.verify || typeof qrcode !== 'function') return null;
  const url = `${location.origin}/agricontract/verify.html?r=${encodeURIComponent(c.verify.ref)}&k=${encodeURIComponent(c.verify.key)}`;
  const q = qrcode(0, 'M'); q.addData(url); q.make();
  const n = q.getModuleCount(), ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `-2 -2 ${n + 4} ${n + 4}`); svg.setAttribute('class', 'qr'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', L('QR ពិនិត្យកិច្ចសន្យា', 'Verify QR code'));
  const bg = document.createElementNS(ns, 'rect'); bg.setAttribute('x', -2); bg.setAttribute('y', -2); bg.setAttribute('width', n + 4); bg.setAttribute('height', n + 4); bg.setAttribute('fill', '#fff'); svg.appendChild(bg);
  let d = '';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) d += `M${col} ${r}h1v1h-1z`;
  const path = document.createElementNS(ns, 'path'); path.setAttribute('d', d); path.setAttribute('fill', '#000'); svg.appendChild(path);
  const box = el('div', null, 'verify-box'); box.appendChild(svg);
  const txt = add(box, 'div');
  add(txt, 'strong', L('ស្កេនដើម្បីពិនិត្យកិច្ចសន្យា', 'Scan to verify this contract'));
  add(txt, 'p', L('ធនាគារ ឬអ្នកណាក៏ដោយ អាចស្កេនដោយកាមេរ៉ាទូរសព្ទ ដើម្បីមើលថាកិច្ចសន្យានេះពិតប្រាកដ ភាគីទាំងពីរបានចុះហត្ថលេខា និងមិនត្រូវបានកែប្រែ ឬលុបចោល។',
    'Any bank can scan this with a phone camera to see that the contract is real, signed by both sides, and not changed or cancelled.'));
  add(txt, 'p', `${c.ref} · ${c.signatures && c.signatures.code || ''}`, 'source');
  return box;
}

async function loadData(kind) {
  const params = new URLSearchParams(location.search);
  let url;
  if (params.get('sample') === '1') url = `sample/${kind}.json`;
  else { const id = params.get('id'); if (!id) throw new Error(L('សូមផ្តល់លេខសម្គាល់។', 'Missing contract id.')); url = `/api/print/${kind}/${encodeURIComponent(id)}`; }
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(L(`មិនអាចទាញទិន្នន័យបាន (${response.status})។`, `Could not load data (${response.status}).`));
  return response.json();
}
function fail(error) { document.querySelector('main').replaceChildren(el('p', error.message || L('មិនអាចបង្ហាញឯកសារ។', 'Could not display document.'), 'error')); }
toolbar();
