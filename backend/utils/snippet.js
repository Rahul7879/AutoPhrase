// create snippet
const Snippet = require("../models/snippet");
const Folder = require("../models/folder");
const mongoose = require("mongoose");

exports.createSnippet = async (req, res) => {
	try {
		const folderId = req.params.folderId? req.params.folderId.trim() : "";
    	if (!folderId || !mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ message: "Valid Folder ID is required" });

		const folder = await Folder.findOne({ _id: folderId, userId: req.user.id });
		if (!folder) return res.status(404).json({ message: "Folder not found" });

		let { shortcutKey, content, description } = req.body;
		description = description.trim();
		shortcutKey = shortcutKey.trim();
		content = content.trim();

		if (!shortcutKey) return res.status(400).json({ message: "Shortcut key is required" });
		if (!content) return res.status(400).json({ message: "Content is required" });
		if(!description) return res.status(400).json({ message: "Description is required" });

    	const newKeyLower = shortcutKey.toLowerCase();

		const existing = await Snippet.find({ userId: req.user.id }).select("shortcutKey");
		let conflict = null;
		for (const s of existing) {
			const kLower = (s.shortcutKey || "").trim().toLowerCase();
			if (!kLower) continue;

			if (kLower === newKeyLower || kLower.startsWith(newKeyLower) || newKeyLower.startsWith(kLower)) {
				conflict = s; 
				break;
			}
		}

		if (conflict)  return res.status(400).json({message: `Conflicting shortcut with ${conflict.shortcutKey}. Please choose a unique shortcut.`});
		

		const snippet = new Snippet({
			folderId,
			shortcutKey,
			description,
			content,
			userId: req.user.id,
		});

		await snippet.save();
		res.status(201).json(snippet);

	} catch (err) {
		if (err.code === 11000) return res.status(400).json({ message: "Shortcut already exists for this user" });

		res.status(500).json({ message: "Server error" });
	}
};

// get all Snippets by folder id
exports.getSnippets = async (req, res) => {
  try {
	const folderId = req.params.folderId? req.params.folderId.trim() : "";
    if (!folderId || !mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ message: "Valid Folder Id is required" });

    const folder = await Folder.findOne({ _id: folderId, userId: req.user.id });
    if (!folder) return res.status(404).json({ message: "Folder not found" });

    const fields = req.query['fields'] || "";
	const limit = parseInt(req.query['limit']) || 10;
	const skip = parseInt(req.query['skip']) || 0;
	const sortBy = req.query['sortBy'] || 'shortcutKey';
	const orderBy = req.query['orderBy'] ? req.query['orderBy'].trim() : '';

    const snippets = await Snippet.find({folderId})
		.limit(limit)
		.skip(skip)
      .sort({ [sortBy]: orderBy })
      .select(fields);

    res.status(200).json(snippets);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// get Snippets by id
exports.getSnippetById = async (req, res) => {
  try {
	const folderId = req.params.folderId? req.params.folderId.trim() : "";
    if (!folderId || !mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ message: "Valid Folder Id is required" });

    const folder = await Folder.findOne({ _id: folderId, userId: req.user.id });
    if (!folder) return res.status(404).json({ message: "Folder not found" });

	const snippetId = req.params.snippetId? req.params.snippetId.trim() : "";
	if (!snippetId || !mongoose.Types.ObjectId.isValid(snippetId)) return res.status(400).json({ message: "Valid Snippet Id is required" });

    const snippet = await Snippet.findOne({ _id: snippetId, folderId, userId: req.user.id });
    if (!snippet) return res.status(404).json({ message: "Snippet not found" });

    res.status(200).json(snippet);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// update snippet
exports.updateSnippet = async (req, res) => {
  try {
    const folderId = req.params.folderId? req.params.folderId.trim() : "";
    if (!folderId || !mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ message: "Valid Folder Id is required" });
    const folder = await Folder.findOne({ _id: folderId, userId: req.user.id });
    if (!folder) return res.status(404).json({ message: "Folder not found" });

    const snippetId = req.params.snippetId? req.params.snippetId.trim() : "";
	if (!snippetId || !mongoose.Types.ObjectId.isValid(snippetId)) return res.status(400).json({ message: "Valid Snippet Id is required" });

    let { shortcutKey, content, description , targetFolderId} = req.body;

    shortcutKey = shortcutKey?.trim();
    content = content?.trim();
    description = description?.trim();
	targetFolderId = targetFolderId?.trim();

	const snippet = await Snippet.findOne({ _id: snippetId, folderId, userId: req.user.id });
    if (!snippet) return res.status(404).json({ message: "Snippet not found" });
	
	const updateFields = {};

    if (shortcutKey !== undefined) {
      if (!shortcutKey) return res.status(400).json({ message: "Shortcut key cannot be empty" });
      
	const newKeyLower = shortcutKey.toLowerCase();

	  const existing = await Snippet.find({
        userId: req.user.id,
        _id: { $ne: snippetId },
      }).select("shortcutKey");

		let conflict = null;
		for (const s of existing) {
			const kLower = (s.shortcutKey || "").trim().toLowerCase();
			if (!kLower) continue;

			if (kLower === newKeyLower || kLower.startsWith(newKeyLower) || newKeyLower.startsWith(kLower)) {
				conflict = s; 
				break;
			}
		}

		if (conflict)  return res.status(400).json({message: `Conflicting shortcut with ${conflict.shortcutKey}. Please choose a unique shortcut.`});

		 if (shortcutKey !== snippet.shortcutKey) updateFields.shortcutKey = shortcutKey; 
	}

	if (content !== undefined) {
		if (!content) return res.status(400).json({ message: "Content cannot be empty" });
		updateFields.content = content;
    }

	if (description !== undefined) {
      if (!description) return res.status(400).json({ message: "Description cannot be empty" });
      updateFields.description = description;
    }


	  if (targetFolderId !== undefined) {
      if (!targetFolderId || !mongoose.Types.ObjectId.isValid(targetFolderId)) return res.status(400).json({ message: "Valid Target Folder Id is required" });

      const targetFolder = await Folder.findOne({ _id: targetFolderId, userId: req.user.id });
      if (!targetFolder) return res.status(404).json({ message: "Target folder not found" });

      updateFields.folderId = targetFolderId; 
    }

	if (Object.keys(updateFields).length === 0) return res.status(400).json({ message: "No valid fields provided for update" });
    

    const updatedSnippet = await Snippet.findOneAndUpdate(
      { _id: snippetId, userId: req.user.id },
      { $set:  updateFields  },
      { new: true, runValidators: true}
    );
	
    res.json({ message: "Snippet updated successfully", snippet: updatedSnippet });
  } catch (err) {
    console.error("Error updating snippet:", err);
    res.status(500).json({ message: "Server errorr" });
  }
};

// delete snippet 
exports.deleteSnippet = async (req,res) => {
	try {
		const folderId = req.params.folderId? req.params.folderId.trim() : "";
		if (!folderId || !mongoose.Types.ObjectId.isValid(folderId)) return res.status(400).json({ message: "Valid Folder Id is required" });
		const folder = await Folder.findOne({ _id: folderId, userId: req.user.id });
		if (!folder) return res.status(404).json({ message: "Folder not found" });

		const snippetId = req.params.snippetId? req.params.snippetId.trim() : "";
		if (!snippetId || !mongoose.Types.ObjectId.isValid(snippetId)) return res.status(400).json({ message: "Valid Snippet Id is required" });

		const snippet = await Snippet.findOne({ _id: snippetId, folderId, userId: req.user.id });
    	if (!snippet) return res.status(404).json({ message: "Snippet not found" });
		await snippet.deleteOne();
		res.json({message:"Snippet deleted successfully"});

	} catch (error) {
		console.error("Error deleting snippet:", err);
    	res.status(500).json({ message: "Server errorr" });
	}
}

