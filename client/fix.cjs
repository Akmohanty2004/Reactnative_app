const fs = require('fs');
const file = 'c:/Users/ashis/OneDrive/Desktop/project/project/online-exam-platform/client/src/pages/admin/Users.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("replace(/^\\\\//, '')", "replace(/^\\//, '')");
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Users.jsx');
