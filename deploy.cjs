const { Client } = require('D:\\WEB\\DTools\\DkongMediaConverter\\node_modules\\ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP :: ready');
    const localPath = 'D:\\WEB\\Kongflix\\kongflix\\dist.tar.gz';
    const remotePath = '/root/dist.tar.gz';
    
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) throw err;
      console.log('SFTP :: fastPut :: done');
      
      // Now extract it into /var/www/kongflix
      conn.exec('rm -rf /var/www/kongflix/* && tar -xzf /root/dist.tar.gz -C /var/www/kongflix && rm /root/dist.tar.gz', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.log('STDERR: ' + data);
        });
      });
    });
  });
}).connect({
  host: '209.126.77.41',
  port: 22,
  username: 'root',
  password: 'rtribu8789'
});
