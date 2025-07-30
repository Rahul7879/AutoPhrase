const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  
  firstName:{
    type: String,
    required: [true, "First name is required!"], 
    minLength: [2, "First name must be at least 2 characters long!"],
    maxLength: [50, "First name must be at most 50 characters long!"],
    trim:true, 
  },

  lastName:{
    type: String,
    required: [true, "Last name is required!"],
    minLength: [2, "Last name must be at least 2 characters long!"],
    maxLength: [50, "Last name must be at most 50 characters long!"],
    trim:true,
  },

  email: {
    type: String,
    required: [true, "Email is required!"],
    trim:true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    required: [true, "Password is required"],
    trim:true,
    minlength: 8
  },

  settings: {
    animationEnabled: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }, 
    language: { type: String, default: 'en' }
  },
  otp: String,
  otpExpiry: Date,
  otpVerified: {
    type: Boolean,
    default: false
  },
}, 
{
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);