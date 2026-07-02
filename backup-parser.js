const fs = require('fs');
const path = require('path');

/**
 * Import a Kreep backup
 * Restores: notes, images, shares, metadata
 * Supports both 'kreep-backup' and legacy 'keep-clone-backup' formats
 */
class BackupParser {
  constructor(extractedPath, userId, db, dataDir) {
    this.extractedPath = extractedPath;
    this.userId = userId;
    this.db = db;
    this.dataDir = dataDir;

    this.stats = {
      totalNotes: 0,
      importedNotes: 0,
      skippedNotes: 0,
      totalImages: 0,
      importedImages: 0,
      totalShares: 0,
      importedShares: 0,
      errors: []
    };

    this.noteIdMap = {}; // Map old note IDs to new note IDs
    this.userMap = {}; // Map usernames to user IDs for shares
  }

  /**
   * Main parse method
   */
  async parse() {
    try {
      // 1. Validate backup structure
      await this.validateBackup();

      // 2. Import notes
      await this.importNotes();

      // 3. Import images
      await this.importImages();

      // 4. Import shares (requires note ID mapping)
      await this.importShares();

      return {
        success: true,
        stats: this.stats,
        noteIdMap: this.noteIdMap
      };
    } catch (error) {
      console.error('Backup import error:', error);
      throw error;
    }
  }

  /**
   * Validate backup structure and manifest
   */
  async validateBackup() {
    const manifestPath = path.join(this.extractedPath, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new Error('Invalid backup: manifest.json not found');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Support both new 'kreep-backup' and legacy 'keep-clone-backup' formats
    if (manifest.type !== 'kreep-backup' && manifest.type !== 'keep-clone-backup') {
      throw new Error('Invalid backup type');
    }

    if (!manifest.version) {
      throw new Error('Invalid backup: missing version');
    }

    console.log(`Importing backup created at ${manifest.created_at} for user ${manifest.username}`);

    return manifest;
  }

  /**
   * Import notes from backup
   */
  async importNotes() {
    const notesDir = path.join(this.extractedPath, 'notes');

    if (!fs.existsSync(notesDir)) {
      console.log('No notes directory found in backup');
      return;
    }

    const noteFiles = fs.readdirSync(notesDir).filter(f => f.endsWith('.json'));
    this.stats.totalNotes = noteFiles.length;

    for (const noteFile of noteFiles) {
      try {
        const notePath = path.join(notesDir, noteFile);
        const noteData = JSON.parse(fs.readFileSync(notePath, 'utf8'));

        const oldNoteId = noteData.id;

        // Insert note and get new ID
        const newNoteId = await this.insertNote(noteData);

        // Map old ID to new ID for share restoration
        this.noteIdMap[oldNoteId] = newNoteId;

        this.stats.importedNotes++;
      } catch (error) {
        console.error(`Failed to import note ${noteFile}:`, error);
        this.stats.errors.push({
          file: noteFile,
          error: error.message
        });
        this.stats.skippedNotes++;
      }
    }
  }

  /**
   * Insert a single note into database
   */
  async insertNote(noteData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO notes (
          user_id, title, content, color,
          is_checklist, checklist_items,
          is_archived, is_pinned,
          images,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        this.userId,
        noteData.title || '',
        noteData.content || '',
        noteData.color || '#ffffff',
        noteData.is_checklist ? 1 : 0,
        noteData.checklist_items ? JSON.stringify(noteData.checklist_items) : null,
        noteData.is_archived ? 1 : 0,
        noteData.is_pinned ? 1 : 0,
        noteData.images ? JSON.stringify(noteData.images) : null,
        noteData.created_at || new Date().toISOString(),
        noteData.updated_at || new Date().toISOString()
      ];

      this.db.run(query, values, function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });
  }

  /**
   * Import images from backup
   */
  async importImages() {
    const imagesDir = path.join(this.extractedPath, 'images');

    if (!fs.existsSync(imagesDir)) {
      console.log('No images directory found in backup');
      return;
    }

    const noteImagesDir = path.join(this.dataDir, 'note-images');
    if (!fs.existsSync(noteImagesDir)) {
      fs.mkdirSync(noteImagesDir, { recursive: true });
    }

    const imageFiles = fs.readdirSync(imagesDir);
    this.stats.totalImages = imageFiles.length;

    imageFiles.forEach(imageFile => {
      try {
        // Only accept well-formed image names. The backup is user-supplied, so
        // without this a crafted archive could drop e.g. `evil.html` into the
        // web-served note-images directory (stored XSS / arbitrary file write).
        const safeName = path.basename(imageFile);
        if (!/^note_\d+_\d+\.webp$/.test(safeName)) {
          console.warn(`Skipping image with unexpected name during restore: ${imageFile}`);
          this.stats.errors.push({ file: imageFile, error: 'Invalid image filename' });
          return;
        }

        const sourcePath = path.join(imagesDir, safeName);
        const destPath = path.join(noteImagesDir, safeName);

        // Skip if file already exists (avoid overwriting)
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(sourcePath, destPath);
          this.stats.importedImages++;
        } else {
          console.log(`Image ${imageFile} already exists, skipping`);
          this.stats.importedImages++; // Count as imported
        }
      } catch (error) {
        console.error(`Failed to import image ${imageFile}:`, error);
        this.stats.errors.push({
          file: imageFile,
          error: error.message
        });
      }
    });
  }

  /**
   * Import shares from backup
   */
  async importShares() {
    const sharesPath = path.join(this.extractedPath, 'shares.json');

    if (!fs.existsSync(sharesPath)) {
      console.log('No shares.json found in backup');
      return;
    }

    const sharesData = JSON.parse(fs.readFileSync(sharesPath, 'utf8'));

    // Build user map (username -> user_id)
    await this.buildUserMap();

    // Import owned shares (shares user created)
    if (sharesData.owned && Array.isArray(sharesData.owned)) {
      for (const share of sharesData.owned) {
        try {
          await this.importShare(share, 'owned');
          this.stats.importedShares++;
        } catch (error) {
          console.error(`Failed to import owned share:`, error);
          this.stats.errors.push({
            type: 'share',
            error: error.message
          });
        }
      }
    }

    // Note: We skip importing "received" shares as those need to be re-shared
    // by the original owner. This prevents duplicate/orphaned shares.

    this.stats.totalShares = sharesData.owned ? sharesData.owned.length : 0;
  }

  /**
   * Build map of usernames to user IDs
   */
  async buildUserMap() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT id, username FROM users', [], (err, users) => {
        if (err) return reject(err);

        users.forEach(user => {
          this.userMap[user.username] = user.id;
        });

        resolve();
      });
    });
  }

  /**
   * Import a single share
   */
  async importShare(shareData, type) {
    return new Promise((resolve, reject) => {
      // Map old note ID to new note ID
      const oldNoteId = shareData.note_id;
      const newNoteId = this.noteIdMap[oldNoteId];

      if (!newNoteId) {
        return reject(new Error(`Note ID ${oldNoteId} not found in map`));
      }

      if (type === 'owned') {
        // Share owned by current user
        const sharedWithUsername = shareData.shared_with_username;
        const sharedWithUserId = this.userMap[sharedWithUsername];

        if (!sharedWithUserId) {
          console.log(`User ${sharedWithUsername} not found, skipping share`);
          return resolve(); // Skip but don't fail
        }

        // Check if share already exists
        const checkQuery = `
          SELECT id FROM shares
          WHERE note_id = ? AND shared_by_user_id = ? AND shared_with_user_id = ?
        `;

        this.db.get(checkQuery, [newNoteId, this.userId, sharedWithUserId], (err, existing) => {
          if (err) return reject(err);

          if (existing) {
            console.log(`Share already exists for note ${newNoteId}, skipping`);
            return resolve();
          }

          // Insert share
          const insertQuery = `
            INSERT INTO shares (note_id, shared_by_user_id, shared_with_user_id, permission, created_at)
            VALUES (?, ?, ?, ?, ?)
          `;

          this.db.run(
            insertQuery,
            [newNoteId, this.userId, sharedWithUserId, shareData.permission, shareData.created_at],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      } else {
        // Received shares are skipped (need to be re-shared by owner)
        resolve();
      }
    });
  }

  /**
   * Get import statistics
   */
  getStats() {
    return this.stats;
  }
}

module.exports = BackupParser;
