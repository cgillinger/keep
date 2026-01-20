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

    // Filename mapping to handle filesystem sanitization differences
    this.fileMap = {};
  }

  /**
   * Main parse method - returns array of notes ready to insert
   */
  async parse() {
    if (!fs.existsSync(this.keepDir)) {
      throw new Error('Invalid Google Keep export structure. Expected Takeout/Keep/ directory.');
    }

    // Find all files and build a mapping to handle filesystem sanitization
    const files = fs.readdirSync(this.keepDir);

    // Build file map - map various sanitized versions to actual filenames
    for (const file of files) {
      // Map the actual filename to itself
      this.fileMap[file] = file;

      // Also map the sanitized version (in case JSON references use original format)
      const sanitized = this.sanitizeFilename(file);
      this.fileMap[sanitized] = file;

      // Map a version with colons replaced (common in timestamps)
      // This handles cases like "2023-11-28T21:51:27.284+01:00.json" → "2023-11-28T21_51_27.284+01_00.json"
      const colonReplaced = file.replace(/:/g, '_');
      this.fileMap[colonReplaced] = file;
    }

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
   * Sanitize filename to prevent path traversal
   */
  sanitizeFilename(filename) {
    // Remove any path separators and only keep the basename
    const basename = path.basename(filename);

    // Remove any remaining dangerous characters
    const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

    return sanitized;
  }

  /**
   * Find actual filename from various possible formats
   * Handles filesystem sanitization differences (colons → underscores, etc.)
   */
  findActualFilename(requestedFilename) {
    const basename = path.basename(requestedFilename);

    // Try exact match first
    if (this.fileMap[basename]) {
      return this.fileMap[basename];
    }

    // Try sanitized version
    const sanitized = this.sanitizeFilename(basename);
    if (this.fileMap[sanitized]) {
      return this.fileMap[sanitized];
    }

    // Try with colons replaced
    const colonReplaced = basename.replace(/:/g, '_');
    if (this.fileMap[colonReplaced]) {
      return this.fileMap[colonReplaced];
    }

    // Try with both colons and plus signs replaced
    const fullyReplaced = basename.replace(/[:\+]/g, '_');
    if (this.fileMap[fullyReplaced]) {
      return this.fileMap[fullyReplaced];
    }

    // Not found - return null
    return null;
  }

  /**
   * Validate that a path is within the expected directory
   */
  isPathSafe(filePath, allowedDir) {
    const resolvedPath = path.resolve(filePath);
    const resolvedAllowedDir = path.resolve(allowedDir);

    return resolvedPath.startsWith(resolvedAllowedDir);
  }

  /**
   * Parse a single note JSON file
   */
  async parseNote(jsonFile) {
    // Find the actual filename on disk (handles filesystem sanitization)
    const actualFilename = this.findActualFilename(jsonFile);
    if (!actualFilename) {
      throw new Error(`File not found: ${jsonFile}`);
    }

    const jsonPath = path.join(this.keepDir, actualFilename);

    // Validate that the path is within keepDir
    if (!this.isPathSafe(jsonPath, this.keepDir)) {
      throw new Error(`Invalid file path: ${jsonFile}`);
    }

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
    // Find the actual filename on disk (handles filesystem sanitization)
    const actualFilename = this.findActualFilename(attachment.filePath);
    if (!actualFilename) {
      this.stats.errors.push({
        file: sourceNote,
        error: `Attachment file not found: ${attachment.filePath}`
      });
      return null;
    }

    const sourcePath = path.join(this.keepDir, actualFilename);

    // Validate that source path is within keepDir
    if (!this.isPathSafe(sourcePath, this.keepDir)) {
      this.stats.errors.push({
        file: sourceNote,
        error: `Invalid attachment path: ${attachment.filePath}`
      });
      return null;
    }

    // Double-check file exists (should exist since we found it in fileMap)
    if (!fs.existsSync(sourcePath)) {
      this.stats.errors.push({
        file: sourceNote,
        error: `Missing attachment: ${attachment.filePath} (mapped to ${actualFilename})`
      });
      return null;
    }

    // Generate unique filename with safe extension
    const ext = path.extname(actualFilename).substring(0, 10); // Limit extension length
    const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, ''); // Only alphanumeric + dot
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}${safeExt}`;
    const destPath = path.join(this.mediaDir, uniqueName);

    // Validate that destination path is within mediaDir
    if (!this.isPathSafe(destPath, this.mediaDir)) {
      this.stats.errors.push({
        file: sourceNote,
        error: `Invalid destination path for attachment`
      });
      return null;
    }

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
