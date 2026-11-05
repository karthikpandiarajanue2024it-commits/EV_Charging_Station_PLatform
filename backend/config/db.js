const mongoose = require('mongoose');

const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB connection error: ${error.message}`);
      retries -= 1;
      console.log(`Retries left: ${retries}`);
      if (retries === 0) {
        console.error('MongoDB connection failed after multiple attempts');
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};

module.exports = connectDB;
