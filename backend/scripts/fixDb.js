require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // Mark ALL stuck pending funding transactions as failed
  const result = await db.collection('transactions').updateMany(
    { 
      status: 'pending',
      description: 'Manual wallet funding initiated'
    },
    { $set: { status: 'failed' } }
  );

  console.log('Stuck transactions fixed:', result.modifiedCount, 'document(s) updated');

  await mongoose.disconnect();
  console.log('Done.');
});