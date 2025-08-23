const express = require("express");
const router = express.Router();
const auth  = require("../middleware/auth");
const {
  createSnippet,
  getSnippets,
  updateSnippet,
  // deleteSnippet,
} = require("../utils/snippet");

router.use(auth);

router.post("/:folderId/snippets", createSnippet);
router.get("/:folderId/snippets", getSnippets);
router.put("/:folderId/snippet/:snippetId", updateSnippet);
// router.delete("/:id", deleteSnippet);

module.exports = router;
