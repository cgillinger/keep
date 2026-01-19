const fs = require('fs');
const path = require('path');

// Color mapping from Google Keep to our colors
const COLOR_MAP = {
  'DEFAULT': '#ffffff',
  'RED': '#f28b82',
  'ORANGE': '#fbbc04',
  'YELLOW': '#fff475',
  'GREEN': '#ccff90',
  'TEAL': '#a7ffeb',
  'BLUE': '#cbf0f8',
  'DARK_BLUE': '#aecbfa',
  'PURPLE': '#d7aefb',
  'PINK': '#fdcfe8',
  'BROWN': '#e6c9a8',
  'GRAY': '#e8eaed'
};

/**
 * Parse Google Keep export and convert to our format
 */
class KeepImportParser {
  constructor(extractedPath, userId, mediaDir) {
    this.extractedPath = extractedPath;
    this.userId = userId;
    this.mediaDir = mediaDir; // Where to store attachments
    this.keepDir = path.join(extractedPath, 'Takeout', 'Keep');

    this.stats = {
      totalNotes: 0,
      importedNotes: 0,
      skippedNotes: 0,
      checklistNotes: 0,
      attachments: 0,
      missingAttachments: 0,
      errors: []
    };
  }

  /**
   * Main parse method - returns array of notes ready to insert
   */
  async parse() {
    if (!fs.existsSync(this.keepDir)) {
      throw new Error('Invalid Google Keep export structure. Expected Takeout/Keep/ directory.');
    }

    // Find all JSON files
    const files = fs.readdirSync(this.keepDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'Labels.json');

    this.stats.totalNotes = jsonFiles.length;

    const notes = [];

    for (const jsonFile of jsonFiles) {
      try {
        const note = await this.parseNote(jsonFile);
        if (note) {
          notes.push(note);
          this.stats.importedNotes++;
        } else {
          this.stats.skippedNotes++;
        }
      } catch (error) {
        this.stats.errors.push({
          file: jsonFile,
          error: error.message
        });
        this.stats.skippedNotes++;
      }
    }

    return { notes, stats: this.stats };
  }

  /**
   * Parse a single note JSON file
   */
  async parseNote(jsonFile) {
    const jsonPath = path.join(this.keepDir, jsonFile);
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    // Skip trashed notes
    if (data.isTrashed) {
      return null;
    }

    // Convert timestamps from microseconds to ISO string
    const createdAt = this.convertTimestamp(data.createdTimestampUsec);
    const updatedAt = this.convertTimestamp(data.userEditedTimestampUsec);

    // Map color
    const color = COLOR_MAP[data.color] || '#ffffff';

    // Check if this is a checklist
    const isChecklist = !!(data.listContent && data.listContent.length > 0);
    if (isChecklist) {
      this.stats.checklistNotes++;
    }

    // Build note object
    const note = {
      user_id: this.userId,
      title: (data.title || '').trim(),
      content: data.textContent || '',
      color: color,
      is_checklist: isChecklist ? 1 : 0,
      checklist_items: null,
      is_archived: data.isArchived ? 1 : 0,
      is_pinned: data.isPinned || false,
      created_at: createdAt,
      updated_at: updatedAt,
      attachments: [],
      source_file: jsonFile
    };

    // Parse checklist items
    if (isChecklist) {
      note.checklist_items = data.listContent.map(item => ({
        text: item.text || '',
        checked: item.isChecked || false
      }));
    }

    // Handle attachments
    if (data.attachments && data.attachments.length > 0) {
      for (const attachment of data.attachments) {
        const attachmentInfo = await this.handleAttachment(attachment, jsonFile);
        if (attachmentInfo) {
          note.attachments.push(attachmentInfo);
          this.stats.attachments++;
        } else {
          this.stats.missingAttachments++;
        }
      }
    }

    return note;
  }

  /**
   * Handle attachment - copy file to media directory
   */
  async handleAttachment(attachment, sourceNote) {
    const sourcePath = path.join(this.keepDir, attachment.filePath);

    // Check if file exists
    if (!fs.existsSync(sourcePath)) {
      this.stats.errors.push({
        file: sourceNote,
        error: `Missing attachment: ${attachment.filePath}`
      });
      return null;
    }

    // Generate unique filename
    const ext = path.extname(attachment.filePath);
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    const destPath = path.join(this.mediaDir, uniqueName);

    // Ensure media directory exists
    if (!fs.existsSync(this.mediaDir)) {
      fs.mkdirSync(this.mediaDir, { recursive: true });
    }

    // Copy file
    try {
      fs.copyFileSync(sourcePath, destPath);

      return {
        original_filename: attachment.filePath,
        stored_filename: uniqueName,
        mimetype: attachment.mimetype,
        stored_path: destPath
      };
    } catch (error) {
      this.stats.errors.push({
        file: sourceNote,
        error: `Failed to copy attachment: ${error.message}`
      });
      return null;
    }
  }

  /**
   * Convert Google Keep timestamp (microseconds) to ISO string
   */
  convertTimestamp(usec) {
    if (!usec) return new Date().toISOString();

    const milliseconds = Math.floor(usec / 1000);
    return new Date(milliseconds).toISOString();
  }

  /**
   * Get import statistics
   */
  getStats() {
    return this.stats;
  }
}

module.exports = KeepImportParser;
