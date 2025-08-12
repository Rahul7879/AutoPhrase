const express = require('express');
const router = express.Router();
const {
  createFolder,
  getUserFolders,
  deleteFolder,
  renameFolder
} = require('../utils/folder');

const auth  = require('../middleware/auth'); 
router.use(auth);

router.post('/', createFolder);           
router.get('/', getUserFolders);          
router.delete('/:id', deleteFolder);      
router.put('/:id', renameFolder);         
module.exports = router;
