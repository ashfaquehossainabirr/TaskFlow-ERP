const express = require('express');
const Note = require('../models/Note');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.use(protect);
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = {
      owner: req.user._id,
    };
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        {
          title: regex,
        },
        {
          content: regex,
        },
      ];
    }
    const notes = await Note.find(query).sort({
      pinned: -1,
      updatedAt: -1,
    });
    res.json(notes);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch notes',
      error: err.message,
    });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!note)
      return res.status(404).json({
        message: 'Note not found',
      });
    res.json(note);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch note',
      error: err.message,
    });
  }
});
router.post('/', async (req, res) => {
  try {
    const { title, content, color, pinned } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Title is required',
      });
    }
    const note = await Note.create({
      title: title.trim(),
      content: content || '',
      color: Note.COLOR_VALUES.includes(color) ? color : 'default',
      pinned: Boolean(pinned),
      owner: req.user._id,
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to create note',
      error: err.message,
    });
  }
});
router.put('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!note)
      return res.status(404).json({
        message: 'Note not found',
      });
    const { title, content, color, pinned } = req.body;
    if (title !== undefined) {
      if (!title.trim())
        return res.status(400).json({
          message: 'Title is required',
        });
      note.title = title.trim();
    }
    if (content !== undefined) note.content = content;
    if (color !== undefined && Note.COLOR_VALUES.includes(color)) note.color = color;
    if (pinned !== undefined) note.pinned = Boolean(pinned);
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to update note',
      error: err.message,
    });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!note)
      return res.status(404).json({
        message: 'Note not found',
      });
    await note.deleteOne();
    res.json({
      message: 'Note deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete note',
      error: err.message,
    });
  }
});
module.exports = router;
