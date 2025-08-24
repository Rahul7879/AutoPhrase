const express = require("express");
const router = express.Router();
const auth  = require("../middleware/auth");
const {
  createSnippet,
  getSnippets,
  getSnippetById,
  updateSnippet,
  deleteSnippet,
} = require("../utils/snippet");

router.use(auth);

router.post("/:folderId/snippets", createSnippet);
router.get("/:folderId/snippets", getSnippets);
router.get("/:folderId/snippets/:snippetId", getSnippetById);
router.put("/:folderId/snippet/:snippetId", updateSnippet);
router.delete("/:folderId/snippet/:snippetId", deleteSnippet);

module.exports = router;
