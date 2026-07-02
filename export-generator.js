const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Generate a complete backup of user's notes
 * Includes: notes, images, shares, metadata
 * Output: ZIP file with maximal compression
 */
class BackupGenerator {
  constructor(userId, db, dataDir, outputPath) {
    this.userId = userId;
    this.db = db;
    this.dataDir = dataDir;
    this.outputPath = outputPath;
    this.tempDir = path.join(dataDir, 'temp', `backup_${userId}_${Date.now()}`);

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
      // Create temp directory for building backup
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      // 1. Export manifest (metadata about backup)
      await this.exportManifest();

      // 2. Export all notes
      await this.exportNotes();

      // 3. Export shares (both owned and shared with user)
      await this.exportShares();

      // 4. Export images
      await this.exportImages();

      // 5. Create ZIP with maximal compression
      await this.createZip();

      // 6. Cleanup temp directory
      this.cleanup();

      return {
        success: true,
        stats: this.stats,
        outputPath: this.outputPath
      };
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Export manifest with backup metadata
   */
  async exportManifest() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT username FROM users WHERE id = ?', [this.userId], (err, user) => {
        if (err) return reject(err);

        const manifest = {
          version: '1.0.0',
          type: 'kreep-backup',
          created_at: new Date().toISOString(),
          user_id: this.userId,
          username: user ? user.username : 'unknown',
          description: 'Complete backup of Kreep data'
        };

        fs.writeFileSync(
          path.join(this.tempDir, 'manifest.json'),
          JSON.stringify(manifest, null, 2)
        );

        resolve();
      });
    });
  }

  /**
   * Export all notes (including archived)
   */
  async exportNotes() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          id, title, content, color,
          is_checklist, checklist_items,
          is_archived, is_pinned,
          images,
          created_at, updated_at
        FROM notes
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;

      this.db.all(query, [this.userId], (err, notes) => {
        if (err) return reject(err);

        const notesDir = path.join(this.tempDir, 'notes');
        if (!fs.existsSync(notesDir)) {
          fs.mkdirSync(notesDir, { recursive: true });
        }

        // Save each note as separate JSON file
        notes.forEach((note, index) => {
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

          // Convert boolean fields
          note.is_checklist = Boolean(note.is_checklist);
          note.is_archived = Boolean(note.is_archived);
          note.is_pinned = Boolean(note.is_pinned);

          const filename = `note_${note.id}_${this.sanitizeFilename(note.title || 'untitled')}.json`;
          fs.writeFileSync(
            path.join(notesDir, filename),
            JSON.stringify(note, null, 2)
          );

          this.stats.totalNotes++;
        });

        resolve();
      });
    });
  }

  /**
   * Export shares (both owned and shared with user)
   */
  async exportShares() {
    return new Promise((resolve, reject) => {
      // Get shares where user is owner
      const query1 = `
        SELECT
          s.id, s.note_id, s.shared_with_user_id, s.permission, s.created_at,
          u.username as shared_with_username
        FROM shares s
        JOIN users u ON s.shared_with_user_id = u.id
        WHERE s.shared_by_user_id = ?
      `;

      // Get shares where user has access
      const query2 = `
        SELECT
          s.id, s.note_id, s.shared_by_user_id, s.permission, s.created_at,
          u.username as shared_by_username
        FROM shares s
        JOIN users u ON s.shared_by_user_id = u.id
        WHERE s.shared_with_user_id = ?
      `;

      this.db.all(query1, [this.userId], (err, ownedShares) => {
        if (err) return reject(err);

        this.db.all(query2, [this.userId], (err, receivedShares) => {
          if (err) return reject(err);

          const shares = {
            owned: ownedShares,
            received: receivedShares
          };

          fs.writeFileSync(
            path.join(this.tempDir, 'shares.json'),
            JSON.stringify(shares, null, 2)
          );

          this.stats.totalShares = ownedShares.length + receivedShares.length;
          resolve();
        });
      });
    });
  }

  /**
   * Export images (copy all referenced images)
   */
  async exportImages() {
    return new Promise((resolve, reject) => {
      // Get all image filenames from notes
      const query = `SELECT images FROM notes WHERE user_id = ? AND images IS NOT NULL`;

      this.db.all(query, [this.userId], (err, notes) => {
        if (err) return reject(err);

        const imagesDir = path.join(this.tempDir, 'images');
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }

        const noteImagesDir = path.join(this.dataDir, 'note-images');
        const allImages = new Set();

        // Collect all unique image filenames
        notes.forEach(note => {
          if (note.images) {
            const images = typeof note.images === 'string'
              ? JSON.parse(note.images)
              : note.images;

            if (Array.isArray(images)) {
              images.forEach(img => allImages.add(img));
            }
          }
        });

        // Copy each image
        allImages.forEach(imageFilename => {
          const sourcePath = path.join(noteImagesDir, imageFilename);
          const destPath = path.join(imagesDir, imageFilename);

          if (fs.existsSync(sourcePath)) {
            try {
              fs.copyFileSync(sourcePath, destPath);
              this.stats.totalImages++;
            } catch (error) {
              console.error(`Failed to copy image ${imageFilename}:`, error);
            }
          }
        });

        resolve();
      });
    });
  }

  /**
   * Create ZIP file with maximal compression
   */
  async createZip() {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(this.outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        this.stats.backupSize = archive.pointer();
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add all files from temp directory
      archive.directory(this.tempDir, false);

      archive.finalize();
    });
  }

  /**
   * Cleanup temp directory
   */
  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
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

  /**
   * Get export statistics
   */
  getStats() {
    return this.stats;
  }
}

module.exports = BackupGenerator;
