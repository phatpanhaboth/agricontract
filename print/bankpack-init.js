
loadData('bankpack').then(data => {
 const main = document.querySelector('main'); main.replaceChildren(); const c = data.contract;
 add(main, 'h1', L('ឯកសារសហគមន៍សម្រាប់ធនាគារ', 'Co-op Bank Pack'));
 add(main, 'p', `${orgName(c.coop)} · ${c.season} · ${c.ref}`, 'meta');
 add(main, 'p', L(`អ្នកទិញ៖ ${orgName(c.processor)} · បរិមាណប៉ាន់ស្មាន៖ ${num(c.estimate_t)} តោន`, `Buyer: ${orgName(c.processor)} · Estimated volume: ${num(c.estimate_t)} tonnes`));
 add(main, 'p', L(`ចុះហត្ថលេខាក្នុងកម្មវិធី · ${(c.signatures && c.signatures.code) || '—'}`, `Signed in the app · ${(c.signatures && c.signatures.code) || '—'}`));
 add(main, 'p', L('នេះមិនមែនជាពាក្យស្នើសុំកម្ចីទេ។', 'This is not a loan application.'), 'muted');
 add(main, 'h2', L('បញ្ជីក្រសួងកសិកម្ម (MAFF)', 'MAFF registry'));
 const r = data.registry;
 add(main, 'p', r && r.registered ? L('✓ បានចុះបញ្ជីជាមួយ MAFF', '✓ Registered with MAFF') : L('មិនឃើញក្នុងបញ្ជី MAFF', 'Not found in the MAFF list'), 'badge');
 if (r && r.registered) add(main, 'p', L(`សមាជិក៖ ${r.members_total ?? '—'} · ស្វាយចន្ទី៖ ${r.cashew_ha ?? '—'} ហិកតា · ${r.cashew_t ?? '—'} តោន`, `Members: ${r.members_total ?? '—'} · Cashew: ${r.cashew_ha ?? '—'} ha · ${r.cashew_t ?? '—'} t`));
 if (r && r.source) add(main, 'p', `${L('ប្រភព', 'Source')}: ${r.source}`, 'source');
 const card = contractCard(c); card.classList.add('bank-contract'); main.appendChild(card);
 add(main, 'h2', L('សមាជិកតាមពូជ', 'Members by variety'));
 data.members_by_variety.forEach(group => { add(main, 'h3', group.variety); const table = add(main, 'table'); const hr = add(add(table, 'thead'), 'tr'); [L('ឈ្មោះ', 'Name'), L('ភូមិ', 'Village'), L('ហិកតា', 'ha'), L('ប៉ាន់ស្មាន (គ.ក)', 'Expected kg')].forEach(x => add(hr, 'th', x)); const body = add(table, 'tbody'); group.members.forEach(m => { const row = add(body, 'tr'); [m.name, m.village, num(m.ha), num(m.expected_kg)].forEach(x => add(row, 'td', x)); }); });
 // The 2-step check: 1) in the MAFF list? 2) does the co-op's MAFF cashew land fit CDB for its whole commune?
 add(main, 'h2', L('ការពិនិត្យ ២ ជំហាន', '2-step check'));
 const v = data.check || {}, land = v.land || {};
 add(main, 'p', v.maff ? L('✓ ① មាននៅក្នុងបញ្ជីសហគមន៍ MAFF', '✓ ① In the MAFF co-op list') : L('① មិនមាននៅក្នុងបញ្ជី MAFF', '① Not in the MAFF list'));
 const ha = x => (x == null ? '—' : num(x));
 add(main, 'p', !v.maff ? L('② មិនអាចពិនិត្យ ព្រោះមិនមាននៅ MAFF', '② Can’t check: not in the MAFF list')
   : land.status === 'ok' ? L(`✓ ② ដីស្វាយចន្ទីតាម MAFF ត្រូវនឹង CDB៖ ${ha(land.maff_ha)} ហិកតា ធៀបនឹង ${ha(land.cdb_ha)} ហិកតា សម្រាប់ឃុំទាំងមូល`, `✓ ② MAFF cashew land fits CDB: ${ha(land.maff_ha)} ha vs ${ha(land.cdb_ha)} ha for the whole commune`)
   : land.status === 'over' ? L(`! ② ដីតាម MAFF លើសដីស្វាយចន្ទីរបស់ឃុំទាំងមូលក្នុង CDB សូមពិនិត្យ៖ ${ha(land.maff_ha)} ហិកតា ធៀបនឹង ${ha(land.cdb_ha)} ហិកតា`, `! ② MAFF cashew land is above CDB for the whole commune, please check: ${ha(land.maff_ha)} ha vs ${ha(land.cdb_ha)} ha`)
   : L('② មិនអាចពិនិត្យដី (គ្មានទិន្នន័យ CDB ដែលទុកចិត្តបាន)', '② Can’t check the land (no reliable CDB data)'), land.status === 'over' ? 'flag' : '');
 add(main, 'p', `${L('ប្រភព', 'Source')}: MAFF cooperative registry / CDB 2025`, 'source');
}).catch(fail);
