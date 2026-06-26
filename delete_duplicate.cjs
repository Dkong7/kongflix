const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://kongflix-app.duckdns.org');
pb.admins.authWithPassword('dkong@kongflix.com', 'rtribu234')
  .then(() => pb.collection('lms_records').getFullList({filter: 'course_Name~"Taller de Emprendimiento" && academy="Platzi"'}))
  .then(records => Promise.all(records.map(r => pb.collection('lms_records').delete(r.id))))
  .then(() => console.log('Deleted Platzi duplicate'))
  .catch(console.error);
