const https = require('https');
const url = "https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDmXzUEWfYyHtHDx1BA7dk_-vySN-e-N2A";

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(res.statusCode); console.log(data); });
}).on('error', (err) => { console.log("Error: " + err.message); });
