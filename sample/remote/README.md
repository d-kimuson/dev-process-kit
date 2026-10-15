# Shared drafts (Firestore emulator)

`firestore-draft-storage.js` answers the kit's `dpk-storage-request` event with a
`DraftStorage` kept in Cloud Firestore, so every reader of a sample sees the
others' changes as they make them. It is a sample, not part of the package: a
host (an internal sharing app, for example) answers the same event with its own
store and its own idea of who the reader is.

```sh
# in this directory: the Firestore emulator on 127.0.0.1:8085 (needs Java)
npx firebase-tools@15 emulators:start --only firestore --project demo-dpk

# in the repository root
pnpm dev
```

Open the same sample in two windows with the same room and different names:

- `https://sample.dev-process-kit.localhost/whiteboard.html?shared=demo&as=alice`
- `https://sample.dev-process-kit.localhost/whiteboard.html?shared=demo&as=bob`

Without `?shared=` the sample keeps its draft in LocalStorage as before.
