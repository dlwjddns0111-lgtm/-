const localtunnel = require('localtunnel');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 3001, subdomain: 'payroll-resilient-v100' });
    console.log('your url is:', tunnel.url);

    tunnel.on('close', () => {
      console.log('tunnel closed');
      process.exit(1);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
