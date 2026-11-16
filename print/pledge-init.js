

const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = String(text); if (cls) n.className = cls; return n; };
const add = (parent, tag, text, cls) => { const n = el(tag, text, cls); parent.appendChild(n); return n; };
const num = n => Number(n).toLocaleString('en-US', {maximumFractionDigits: 2});
const MON_KM = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
const MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthOf = (ym, names) => `${names[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
const deliverKm = c => c.deliver_from ? ` ប្រគល់គ្រាប់ពីខែ ${monthOf(c.deliver_from, MON_KM)} ដល់ខែ ${monthOf(c.deliver_to, MON_KM)}។` : '';
const deliverEn = c => c.deliver_from ? ` Delivery from ${monthOf(c.deliver_from, MON_EN)} to ${monthOf(c.deliver_to, MON_EN)}.` : '';
function contractCard(c) {
  const page = el('section', null, 'contract-page');
  add(page, 'h1', 'កិច្ចសន្យាទិញលក់ស្វាយចន្ទី');
  add(page, 'p', `លេខ៖ ${c.ref} · កូដហត្ថលេខា / Signing code៖ ${(c.signatures && c.signatures.code) || '—'}`, 'meta');
  const boxes = [
    ['១. ភាគី', `${c.processor.name} (លេខចុះបញ្ជី ${c.processor.registration_no}) និង ${c.coop.name} (លេខចុះបញ្ជី ${c.coop.registration_no})។`, 'Parties: processor and co-op, as named above.'],
    ['២. អ្វី និងរដូវ', `គ្រាប់ស្វាយចន្ទីស្ងួត ពូជ ${c.varieties.join(' / ')}។ រដូវ៖ ${c.season}។${deliverKm(c)}`, `Dried raw cashew nuts; varieties ${c.varieties.join(' / ')}; season ${c.season}.${deliverEn(c)}`],
    ['៣. បរិមាណ', `សហគមន៍លក់ ${num(c.share_pct)}% នៃផលសមាជិក ឱ្យក្រុមហ៊ុន។ ប្រហែល ${num(c.estimate_t)} តោន។ នេះជាការប៉ាន់ស្មាន មិនមែនការសន្យាបរិមាណទេ។`, `The co-op sells ${num(c.share_pct)}% of members’ harvest, about ${num(c.estimate_t)} tonnes. The tonnage is an estimate, not a promise.`],
    ['៤. គុណភាព', `សំណើម ≤ ${num(c.moisture_max_pct)}%។ សាច់ក្នុង ≥ ${num(c.outturn_min_pct)}%។ វត្ថុផ្សេងៗ ≤ ${num(c.foreign_matter_max_pct)}%។ ភាគីទាំងពីរធ្វើតេស្តជាមួយគ្នាពេលប្រគល់ និងរក្សាទុកគំរូបិទជិត។`, `Moisture ≤ ${num(c.moisture_max_pct)}%; outturn ≥ ${num(c.outturn_min_pct)}%; foreign matter ≤ ${num(c.foreign_matter_max_pct)}%. Both sides test at delivery and keep a sealed sample.`],
    ['៥. តម្លៃ', `ប្រើតម្លៃក្រុមហ៊ុននៅថ្ងៃប្រគល់ ប៉ុន្តែមិនតិចជាង ${num(c.floor_riel_per_kg)} រៀល/គីឡូក្រាម។ បើមិនត្រូវគុណភាព បន្ថយ ${num(c.fail_discount_riel_per_kg)} រៀល/គីឡូក្រាម ឬសហគមន៍យកត្រឡប់វិញ។`, `The processor’s price on delivery day, never below ${num(c.floor_riel_per_kg)} riel/kg. If quality fails, deduct ${num(c.fail_discount_riel_per_kg)} riel/kg or the co-op takes the nuts back.`],
    ['៦. ការបង់ប្រាក់', `បង់ប្រាក់ពេញទៅគណនីសហគមន៍ ក្នុងរយៈពេល ${num(c.payment_days)} ថ្ងៃក្រោយប្រគល់។`, `Pay in full to the co-op account within ${num(c.payment_days)} days of delivery.`],
    ['៧. បើមានបញ្ហា', `ពិភាក្សាក្នុង ៣ ថ្ងៃ។ បើមិនចប់ សុំ ${c.mediator || 'អ្នកសម្រុះសម្រួលដែលភាគីទាំងពីរយល់ព្រម'} ជួយសម្រុះសម្រួលក្នុង ៧ ថ្ងៃ។ បន្ទាប់មក សុំអាជ្ញាកណ្ដាលថ្នាក់ស្រុក ឬតុលាការដោះស្រាយ។ បើភាគីម្ខាងមិនគោរពកិច្ចសន្យា ២ ដង ភាគីម្ខាងទៀតអាចបញ្ចប់កិច្ចសន្យា។`, `Talk within 3 days, then seek mediation by ${c.mediator || 'a mediator both sides agree on'} within 7 days, then district arbitration or court. Either side may leave if the other breaks the contract twice.`]
  ];
  boxes.forEach(([title, km, en]) => { const box = add(page, 'section', null, 'box'); add(box, 'h3', title); add(box, 'p', km); add(box, 'p', en, 'en'); });
  const signatures = add(page, 'div', null, 'signatures');
  const sg = c.signatures || {};
  [[c.processor.name, sg.processor], [c.coop.name, sg.coop]].forEach(([name, x]) => { const side = add(signatures, 'section'); add(side, 'strong', name); add(side, 'p', x && x.at ? `✓ ចុះហត្ថលេខាក្នុងកម្មវិធី / Signed in the app: ${x.by} · ${new Date(x.at).toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', dateStyle: 'medium', timeStyle: 'short' })} (ម៉ោងកម្ពុជា / Cambodia time)` : 'មិនទាន់ចុះហត្ថលេខា / Not signed yet'); });
  return page;
}
async function loadData(kind) {
  const params = new URLSearchParams(location.search);
  let url;
  if (params.get('sample') === '1') url = `sample/${kind}.json`;
  else if (kind === 'pledge') url = '/api/print/pledge';
  else { const id = params.get('id'); if (!id) throw new Error('សូមផ្តល់លេខសម្គាល់។ / Missing contract id.'); url = `/api/print/${kind}/${encodeURIComponent(id)}`; }
  const response = await fetch(url, {credentials: 'same-origin'});
  if (!response.ok) throw new Error(`មិនអាចទាញទិន្នន័យបាន។ / Could not load data (${response.status}).`);
  return response.json();
}
function fail(error) { document.querySelector('main').replaceChildren(el('p', error.message || 'មិនអាចបង្ហាញឯកសារ។ / Could not display document.', 'error')); }

loadData('pledge').then(data => {
 const main = document.querySelector('main'); main.replaceChildren();
 add(main, 'h1', 'បញ្ជីសមាជិក និងការផ្គត់ផ្គង់');
 add(main, 'p', `${data.coop_name} · ${data.season}`, 'meta');
 add(main, 'p', 'សមាជិកចុះហត្ថលេខាលើបញ្ជីផ្ទៃក្នុងរបស់សហគមន៍។');
 const table = add(main, 'table'); const head = add(table, 'thead'); const hr = add(head, 'tr');
 ['ឈ្មោះ / Name', 'ភូមិ / Village', 'ពូជ / Variety', 'ហិកតា / ha', 'ប៉ាន់ស្មាន / kg', 'ហត្ថលេខា / Signature'].forEach(x => add(hr, 'th', x));
 const body = add(table, 'tbody'); data.members.forEach(m => { const row = add(body, 'tr'); [m.name, m.village, m.variety, num(m.ha), num(m.expected_kg), ''].forEach(x => add(row, 'td', x)); });
}).catch(fail);
