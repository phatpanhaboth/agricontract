
loadData('contract').then(c => document.querySelector('main').replaceChildren(contractCard(c))).catch(fail);
