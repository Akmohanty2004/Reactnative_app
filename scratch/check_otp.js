const mongoose = require('mongoose');

const uri = "mongodb://ashiskumarmohanty739:ashiskumarmohanty739@ac-vjuwcwk-shard-00-00.ipngrhp.mongodb.net:27017,ac-vjuwcwk-shard-00-01.ipngrhp.mongodb.net:27017,ac-vjuwcwk-shard-00-02.ipngrhp.mongodb.net:27017/?authSource=admin&replicaSet=atlas-rojlp0-shard-0&appName=ExamPlatform&tls=true";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('test'); // The DB might be 'test' by default in Atlas if not specified, wait, the URI has no DB specified, so it uses 'test'.
  
  // Actually, the server `.env` had:
  // MONGODB_URI=...
  // Let's list all collections to find the right DB
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log("Databases:", dbs.databases.map(d => d.name));
  
  const targetDb = mongoose.connection.useDb('test'); // Will change this if it's different.
  const otps = await targetDb.collection('otps').find({}).toArray();
  console.log("OTPs:", otps);
  
  mongoose.disconnect();
}
run();
