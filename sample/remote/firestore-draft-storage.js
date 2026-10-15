/**
 * Shares a sample's draft through Cloud Firestore, so several readers see each
 * other's changes as they make them. A sample opts in with `?shared=<room>`
 * (and `?as=<name>` to sign the actions); without it the page keeps its draft
 * in LocalStorage as usual. The samples' own helper, not part of the package:
 * the kit only knows the `dpk-storage-request` event and the `DraftStorage`
 * shape, and a page answers it with whatever store it has.
 *
 * Load it as a classic script before the kit, so the listener is in place when
 * the template element asks. The Firebase SDK is imported lazily: the store
 * starts empty and the first snapshot fills it.
 *
 * Talks to the Firestore emulator (`sample/remote/README.md`), never to a real
 * project.
 */
(() => {
  const params = new URLSearchParams(location.search);
  const room = params.get('shared');
  if (room === null || room === '') return;
  const author = params.get('as') ?? undefined;

  const FIREBASE = 'https://www.gstatic.com/firebasejs/13.0.0';
  const EMULATOR = { host: '127.0.0.1', port: 8085 };
  const PROJECT_ID = 'demo-dpk';

  let firestore = null;
  const sdk = () => {
    firestore ??= Promise.all([
      import(`${FIREBASE}/firebase-app.js`),
      import(`${FIREBASE}/firebase-firestore.js`),
    ]).then(([app, fs]) => {
      const db = fs.getFirestore(app.initializeApp({ projectId: PROJECT_ID }));
      fs.connectFirestoreEmulator(db, EMULATOR.host, EMULATOR.port);
      return { fs, db };
    });
    return firestore;
  };

  /** A Firestore document id may not contain `/`. */
  const docId = (value) => encodeURIComponent(value).replaceAll('.', '%2E');

  /** One document per action, so two readers adding at once never overwrite each other. */
  const createStorage = (storageKey, template) => {
    const path = ['dpk-rooms', docId(room), 'drafts', docId(storageKey), 'actions'];
    /** The actions the store holds as far as this reader knows, by id → JSON. */
    let known = new Map();

    const write = async (actions) => {
      const { fs, db } = await sdk();
      const next = new Map(actions.map((action) => [action.id, JSON.stringify(action)]));
      const batch = fs.writeBatch(db);
      let changed = false;
      for (const [id, json] of next) {
        if (known.get(id) === json) continue;
        const action = JSON.parse(json);
        batch.set(fs.doc(db, ...path, docId(id)), { template, json, createdAt: action.createdAt, id });
        changed = true;
      }
      // Only what this reader saw can be deleted: an action another reader added
      // a moment ago is not in `known` yet and survives.
      for (const id of known.keys()) {
        if (next.has(id)) continue;
        batch.delete(fs.doc(db, ...path, docId(id)));
        changed = true;
      }
      known = next;
      if (changed) await batch.commit();
    };

    return {
      load: () => [],
      save: (_key, _template, actions) => {
        write(actions).catch((error) => console.error('[shared draft] save failed', error));
      },
      clear: () => {
        write([]).catch((error) => console.error('[shared draft] clear failed', error));
      },
      subscribe: (_key, _template, onChange) => {
        let unsubscribe = () => {};
        let stopped = false;
        sdk().then(({ fs, db }) => {
          if (stopped) return;
          const query = fs.query(fs.collection(db, ...path), fs.orderBy('createdAt'), fs.orderBy('id'));
          unsubscribe = fs.onSnapshot(query, (snapshot) => {
            const docs = snapshot.docs.map((doc) => doc.data()).filter((data) => data.template === template);
            known = new Map(docs.map((data) => [data.id, data.json]));
            onChange(docs.map((data) => JSON.parse(data.json)));
          });
        });
        return () => {
          stopped = true;
          unsubscribe();
        };
      },
    };
  };

  document.addEventListener('dpk-storage-request', (event) => {
    const { storageKey, template, provide } = event.detail;
    provide(createStorage(storageKey, template), author === undefined ? {} : { author });
  });
})();
