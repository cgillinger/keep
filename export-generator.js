const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { isValidImageName } = require('./image-names');

// archiver 8 is ESM-only; a dynamic import() works from CommonJS on every
// supported Node version (require(esm) only arrived in 20.19 / 22.12).
let archiverModule = null;
const loadArchiver = async () => archiverModule || (archiverModule = await import('archiver'));

/**
 * Generate a complete backup of user's notes
 * Includes: notes, images, shares, metadata
 * Output: ZIP file. JSON is deflated; images (already compressed WebP/JPEG)
 * are streamed straight from note-images into the archive, stored as-is.
 *
 * Archive layout (restore depends on it):
 *   manifest.json, notes/note_<id>_<title>.json, shares.json, images/<name>
 */
class BackupGenerator {
  constructor(userId, db, dataDir, outputPath) {
    this.userId = userId;
    this.db = db;
    this.dataDir = dataDir;
    this.outputPath = outputPath;

    this.stats = {
      totalNotes: 0,
      totalImages: 0,
      totalShares: 0,
      backupSize: 0
    };
  }

  /**
   * Main export method
   */
  async generate() {
    try {
      const files = []; // { name, data } entries held in memory (small JSON)

      files.push(await this.buildManifest());
      files.push(...await this.buildNotes());
      files.push(await this.buildShares());
      const images = await this.collectImages();

      await this.createZip(files, images);

      return {
        success: true,
        stats: this.stats,
        outputPath: this.outputPath
      };
    } catch (error) {
      // Don't leave a half-written archive behind.
      await fsp.unlink(this.outputPath).catch(() => {});
      throw error;
    }
  }

  /**
   * Manifest with backup metadata
   */
  async buildManifest() {
    const user = await this.db.getAsync('SELECT username FROM users WHERE id = ?', [this.userId]);
    const manifest = {
      version: '1.0.0',
      type: 'kreep-backup',
      created_at: new Date().toISOString(),
      user_id: this.userId,
      username: user ? user.username : 'unknown',
      description: 'Complete backup of Kreep data'
    };
    return { name: 'manifest.json', data: JSON.stringify(manifest, null, 2) };
  }

  /**
   * All of the user's notes (including archived), one JSON file each
   */
  async buildNotes() {
    const notes = await this.db.allAsync(
      `SELECT
         id, title, content, color,
         is_checklist, checklist_items,
         is_archived, is_pinned,
         images,
         created_at, updated_at
       FROM notes
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [this.userId]
    );

    return notes.map((note) => {
      // Parse JSON fields. Guard each parse so one corrupt row doesn't abort
      // the entire backup export.
      if (note.checklist_items && typeof note.checklist_items === 'string') {
        try { note.checklist_items = JSON.parse(note.checklist_items); }
        catch (e) { note.checklist_items = []; }
      }
      if (note.images && typeof note.images === 'string') {
        try { note.images = JSON.parse(note.images); }
        catch (e) { note.images = []; }
      }
      if (Array.isArray(note.images)) {
        note.images = note.images.filter(img => typeof img === 'string' && img === path.basename(img) && isValidImageName(img));
      }

      // Convert boolean fields
      note.is_checklist = Boolean(note.is_checklist);
      note.is_archived = Boolean(note.is_archived);
      note.is_pinned = Boolean(note.is_pinned);

      this.stats.totalNotes++;
      return {
        name: `notes/note_${note.id}_${this.sanitizeFilename(note.title || 'untitled')}.json`,
        data: JSON.stringify(note, null, 2)
      };
    });
  }

  /**
   * Shares (both owned and shared with the user)
   */
  async buildShares() {
    const ownedShares = await this.db.allAsync(
      `SELECT
         s.id, s.note_id, s.shared_with_user_id, s.permission, s.created_at,
         u.username as shared_with_username
       FROM shares s
       JOIN users u ON s.shared_with_user_id = u.id
       WHERE s.shared_by_user_id = ?`,
      [this.userId]
    );
    const receivedShares = await this.db.allAsync(
      `SELECT
         s.id, s.note_id, s.shared_by_user_id, s.permission, s.created_at,
         u.username as shared_by_username
       FROM shares s
       JOIN users u ON s.shared_by_user_id = u.id
       WHERE s.shared_with_user_id = ?`,
      [this.userId]
    );

    this.stats.totalShares = ownedShares.length + receivedShares.length;
    return {
      name: 'shares.json',
      data: JSON.stringify({ owned: ownedShares, received: receivedShares }, null, 2)
    };
  }

  /**
   * Source paths of every referenced image that exists on disk. Nothing is
   * copied: createZip() reads them straight from note-images.
   */
  async collectImages() {
    const notes = await this.db.allAsync(
      'SELECT images FROM notes WHERE user_id = ? AND images IS NOT NULL AND deleted_at IS NULL',
      [this.userId]
    );

    const noteImagesDir = path.join(this.dataDir, 'note-images');
    const allImages = new Set();

    notes.forEach(note => {
      let images = note.images;
      if (typeof images === 'string') {
        try { images = JSON.parse(images); } catch (e) { images = []; }
      }
      if (!Array.isArray(images)) return;
      // Defence in depth: never let a stored name escape note-images.
      images.forEach(img => {
        if (typeof img === 'string' && img === path.basename(img) && isValidImageName(img)) {
          allImages.add(img);
        }
      });
    });

    const found = [];
    for (const name of allImages) {
      const source = path.join(noteImagesDir, name);
      try {
        if ((await fsp.stat(source)).isFile()) found.push({ name, source });
      } catch (error) {
        if (error.code !== 'ENOENT') console.error(`Failed to read image ${name}:`, error);
      }
    }
    this.stats.totalImages = found.length;
    return found;
  }

  /**
   * Stream everything into the ZIP file
   */
  async createZip(files, images) {
    const { ZipArchive } = await loadArchiver();

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(this.outputPath);
      const archive = new ZipArchive({
        zlib: { level: 6 } // JSON only; images below are stored, not recompressed
      });

      output.on('close', () => {
        this.stats.backupSize = archive.pointer();
        resolve();
      });
      output.on('error', reject);
      archive.on('error', reject);
      archive.on('warning', (err) => console.error('Backup archive warning:', err));

      archive.pipe(output);

      for (const file of files) {
        archive.append(file.data, { name: file.name });
      }
      for (const image of images) {
        archive.file(image.source, { name: `images/${image.name}`, store: true });
      }

      archive.finalize().catch(reject);
    });
  }

  /**
   * Sanitize filename for safe filesystem usage
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }
}

module.exports = BackupGenerator;
