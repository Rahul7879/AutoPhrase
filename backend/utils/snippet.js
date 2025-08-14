// create snippet
const Snippet = require("../models/snippet");
const Folder = require("../models/folder");

exports.createSnippet = async (req, res) => {
	try {
		const { description, folderId } = req.body;
		let { shortcutKey, content } = req.body;

		shortcutKey = shortcutKey.trim();
		content = content.trim();

		if (!folderId || !folderId.trim()) return res.status(400).json({ message: "Folder ID is required" });
    if (folderId !== folderId.trim()) return res.status(404).json({ message: "Folder not found" });

		const folder = await Folder.findOne({ _id: folderId, userId: req.user.id });
		if (!folder) return res.status(404).json({ message: "Folder not found" });

		if (!shortcutKey) return res.status(400).json({ message: "Shortcut key is required" });
		if (!content) return res.status(400).json({ message: "Content is required" });

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

		if (conflict) {
			return res.status(400).json({message: `Conflicting shortcut with ${conflict.shortcutKey}. Please choose a unique shortcut.`});
		}

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
