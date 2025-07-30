const mongoose = require('mongoose');
require('dotenv').config();

const connectDB= async()=>{
    await mongoose.connect(process.env.MongoURL);
}

module.exports = connectDB;