require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 5000;

const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));


// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser()); 

connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));

app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
