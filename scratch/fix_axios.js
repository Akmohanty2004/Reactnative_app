const fs = require('fs');
const path = require('path');

const slicesDir = path.join(__dirname, '../mobile-client/src/redux/slices');
const files = fs.readdirSync(slicesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(slicesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import axios from 'axios'/g, "import api from '../../services/api'");
  content = content.replace(/axios\./g, 'api.');
  fs.writeFileSync(filePath, content);
});

const apiPath = path.join(__dirname, '../mobile-client/src/services/api.js');
let apiContent = fs.readFileSync(apiPath, 'utf8');
apiContent = apiContent.replace(/baseURL: 'https:\/\/online-exam-platform-server-5onvzuva2-try-best.vercel.app\/api'/g, "baseURL: 'https://online-exam-platform-server-5onvzuva2-try-best.vercel.app'");
fs.writeFileSync(apiPath, apiContent);

console.log("Fixed axios imports and baseURL.");
