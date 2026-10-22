// Where the Solver page lives, and moving what a player saved from one address of the site to another. A page's
// storage belongs to its address: when the site moved (GitHub Pages → Cloudflare Pages), the app copies it over
// once, so the Shelley level, the sharing choice, the install number, unsent boards and named cards come along.

/** The page an address shows, under the site's folder ('solver' for /…/solver.html and /…/solver alike: Cloudflare
 *  Pages drops the .html), or null when it isn't the site's. */
function pageOf(url, site) {
  try {
    const u = new URL(url);
    const s = new URL(site);
    if (u.origin !== s.origin || !u.pathname.startsWith(s.pathname)) return null;
    return u.pathname.slice(s.pathname.length).replace(/\.html$/, '');
  } catch {
    return null;
  }
}

// The two below run inside a page of each address (main.js passes them to executeJavaScript as text), so they
// use nothing from outside themselves. The IndexedDB database is the reader's named cards (src/solver/scan/localRefs.ts).

/** Everything the site saved at this address: its localStorage, and the named cards. */
async function dumpStorage(idb = globalThis.indexedDB) {
  const local = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k !== null) local[k] = localStorage.getItem(k);
  }
  const refs = {};
  if (idb) {
    await new Promise((resolve) => {
      const req = idb.open('vorax-solver', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('refs');
      req.onerror = () => resolve();
      req.onsuccess = () => {
        const cur = req.result.transaction('refs').objectStore('refs').openCursor();
        cur.onerror = () => resolve();
        cur.onsuccess = () => {
          const c = cur.result;
          if (!c) return resolve();
          refs[String(c.key)] = c.value;
          c.continue();
        };
      };
    });
  }
  return { local, refs };
}

/** Writes a dump here, never over what this address already saved; returns how many entries it added. */
async function restoreStorage(dump, idb = globalThis.indexedDB) {
  let added = 0;
  for (const [k, v] of Object.entries((dump && dump.local) || {})) {
    if (localStorage.getItem(k) === null && typeof v === 'string') {
      localStorage.setItem(k, v);
      added++;
    }
  }
  const refs = Object.entries((dump && dump.refs) || {});
  if (idb && refs.length) {
    added += await new Promise((resolve) => {
      const req = idb.open('vorax-solver', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('refs');
      req.onerror = () => resolve(0);
      req.onsuccess = () => {
        const store = req.result.transaction('refs', 'readwrite').objectStore('refs');
        let n = 0, left = refs.length;
        const done = () => --left === 0 && resolve(n);
        for (const [k, v] of refs) {
          const have = store.get(k);
          have.onerror = done;
          have.onsuccess = () => {
            if (have.result !== undefined) return done();
            const put = store.put(v, k);
            put.onsuccess = () => (n++, done());
            put.onerror = done;
          };
        }
      };
    });
  }
  return added;
}

module.exports = { pageOf, dumpStorage, restoreStorage };
