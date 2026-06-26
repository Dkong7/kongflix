const { Client } = require('D:\\WEB\\DTools\\DkongMediaConverter\\node_modules\\ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('ls -la /var/www/kongflix/assets', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '209.126.77.41',
  port: 22,
  username: 'root',
  password: 'rtribu8789'
});
