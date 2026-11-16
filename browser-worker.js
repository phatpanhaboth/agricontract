'use strict';
let runtime;
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'init') {
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
      runtime = await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});
      await runtime.loadPackage(['sqlite3', 'pycryptodome']);
      const response = await fetch(new URL('browser-package.json', self.location.href));
      if (!response.ok) throw new Error('Could not download demo data');
      const pack = await response.json();
      for (const [path, content] of Object.entries(pack.files)) {
        runtime.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')));
        runtime.FS.writeFile(path, content);
      }
      runtime.globals.set('initial_database', pack.database);
      await runtime.runPythonAsync("import sys\nsys.path.insert(0, '/app/AgriContract')\nfrom browser_bridge import browser_request\n");
      // A module needs its own copy of the seed variable.
      runtime.runPython('import browser_bridge\nbrowser_bridge.initial_database = initial_database');
      self.postMessage({id:data.id, ready:true});
    } else {
      runtime.globals.set('_request_json', JSON.stringify(data.payload));
      const result = runtime.runPython('browser_request(_request_json)');
      self.postMessage({id:data.id, result:JSON.parse(result)});
    }
  } catch (error) {
    self.postMessage({id:data.id, error:String(error.stack || error)});
  }
};
