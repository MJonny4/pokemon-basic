// Runtime HTML can reference old hashed scripts/styles. Drop those documents
// when a new worker activates so an offline visit cannot mix build revisions.
// This derived cache contains no player saves; localStorage/IndexedDB are untouched.
self.addEventListener('activate', (event) => {
    event.waitUntil(caches.delete('pokebasic-pages-v1'))
})
