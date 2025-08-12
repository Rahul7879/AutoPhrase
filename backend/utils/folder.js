const Folder = require('../models/folder');

//create default folder
exports.createDefaultFolder = async (userId) => {
  try {
    const folder = new Folder({ name: 'My Snippets', userId });
    await folder.save();
  } catch (err) {
    console.error('Error creating default folder:', err);
  }
};

//create folder
exports.createFolder = async (req, res) => {
  const { name } = req.body;
  try {
    const folder = new Folder({ name, userId: req.user.id });
    await folder.save();
    res.status(201).json(folder);
  } catch (err) {
    if (err.code === 11000){
      console.log(JSON.stringify(err));
      return res.status(400).json({ message: 'Folder name already exists.' });
    } 
    
    res.status(500).json({ message: 'Server error' });
  }
};

// GET all folders
exports.getUserFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user.id }).sort({ createdAt: 1 });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE folder by id 
exports.deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user.id });

    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    
    // await Snippet.deleteMany({ folderId: folder._id }); // implement later
    await folder.deleteOne();

    res.json({ message: 'Folder and its snippets deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// rename folder name
exports.renameFolder = async (req, res) => {
  const { name } = req.body;

  try {
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name },
      { new: true, runValidators: true }
    );

    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    
    res.json(folder);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Folder name already exists.' });
    
    res.status(500).json({ message: 'Server error' });
  }
};