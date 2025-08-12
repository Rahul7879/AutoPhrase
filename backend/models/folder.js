const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
   name: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },           
  createdAt: Date,
  updatedAt: Date
});
// Prevent same folder name for same user
folderSchema.index({ name: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Folder", folderSchema);