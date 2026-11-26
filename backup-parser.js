const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { isValidImageName } = require('./image-names');
const { sanitizeInput, validateColor, sanitizeChecklist } = require('./note-validation');

const exists = (p) => fsp.access(p).then(() => true, () => false);

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
    this.imageMap = {}; // Map image names in the backup to the names they got on disk
    this.imageSeq = 0;
  }

  /**
   * Main parse method
   */
  async parse() {
    try {
      // 1. Validate backup structure
      await this.validateBackup();

      // 2. Import images first: notes may only reference files that were
      //    actually restored, under the (new) names they received on disk.
      await this.importImages();

      // 3. Import notes
      await this.importNotes();

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

    if (!await exists(manifestPath)) {
      throw new Error('Invalid backup: manifest.json not found');
    }

    const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));

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

    if (!await exists(notesDir)) {
      console.log('No notes directory found in backup');
      return;
    }

    const noteFiles = (await fsp.readdir(notesDir)).filter(f => f.endsWith('.json'));
    this.stats.totalNotes = noteFiles.length;

    for (const noteFile of noteFiles) {
      try {
        const notePath = path.join(notesDir, noteFile);
        const noteData = JSON.parse(await fsp.readFile(notePath, 'utf8'));

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

      // Same sanitising as POST /api/notes. The backup is user-supplied.
      const isChecklist = !!noteData.is_checklist;
      const checklistData = sanitizeChecklist(isChecklist, noteData.checklist_items);

      // Keep only images that this restore itself copied into note-images,
      // translated to their new on-disk names.
      const images = [];
      if (Array.isArray(noteData.images)) {
        for (const img of noteData.images) {
          if (typeof img !== 'string' || img !== path.basename(img) || !isValidImageName(img)) continue;
          if (Object.prototype.hasOwnProperty.call(this.imageMap, img)) images.push(this.imageMap[img]);
        }
      }

      const values = [
        this.userId,
        sanitizeInput(noteData.title, 500),
        sanitizeInput(noteData.content, 50000),
        validateColor(noteData.color),
        isChecklist ? 1 : 0,
        checklistData,
        noteData.is_archived ? 1 : 0,
        noteData.is_pinned ? 1 : 0,
        images.length ? JSON.stringify([...new Set(images)]) : null,
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
   * Pick a fresh, valid image name for the restoring user that does not exist
   * on disk. Uploads keep the `note_<userId>_<n>.webp` scheme (so the owner can
   * always view them), other images keep their extension.
   */
  async uniqueImageName(originalName, dir) {
    const ext = path.extname(originalName).toLowerCase();
    for (;;) {
      const stamp = `${Date.now()}${String(this.imageSeq++).padStart(4, '0')}`;
      const name = ext === '.webp' && originalName.startsWith('note_')
        ? `note_${this.userId}_${stamp}.webp`
        : `${stamp}_r${Math.random().toString(36).slice(2, 8)}${ext}`;
      if (isValidImageName(name) && !await exists(path.join(dir, name))) return name;
    }
  }

  /**
   * Import images from backup
   */
  async importImages() {
    const imagesDir = path.join(this.extractedPath, 'images');

    if (!await exists(imagesDir)) {
      console.log('No images directory found in backup');
      return;
    }

    const noteImagesDir = path.join(this.dataDir, 'note-images');
    await fsp.mkdir(noteImagesDir, { recursive: true });

    const imageFiles = await fsp.readdir(imagesDir);
    this.stats.totalImages = imageFiles.length;

    for (const imageFile of imageFiles) {
      try {
        // Only accept well-formed image names. The backup is user-supplied, so
        // without this a crafted archive could drop e.g. `evil.html` into the
        // web-served note-images directory (stored XSS / arbitrary file write).
        // Two naming schemes exist (see server.js): uploads and files that
        // came in through a Google Keep import.
        const safeName = path.basename(imageFile);
        if (!isValidImageName(safeName) || safeName !== imageFile) {
          console.warn(`Skipping image with unexpected name during restore: ${imageFile}`);
          this.stats.errors.push({ file: imageFile, error: 'Invalid image filename' });
          continue;
        }

        const sourcePath = path.join(imagesDir, safeName);

        // Never reuse the name from the backup: it could collide with (and
        // overwrite or alias) another user's file, or claim another user's id
        // in the upload scheme. Mint a fresh name owned by the restoring user.
        const newName = await this.uniqueImageName(safeName, noteImagesDir);
        await fsp.copyFile(sourcePath, path.join(noteImagesDir, newName), fs.constants.COPYFILE_EXCL);
        this.imageMap[safeName] = newName;
        this.stats.importedImages++;
      } catch (error) {
        console.error(`Failed to import image ${imageFile}:`, error);
        this.stats.errors.push({
          file: imageFile,
          error: error.message
        });
      }
    }
  }

  /**
   * Import shares from backup
   */
  async importShares() {
    const sharesPath = path.join(this.extractedPath, 'shares.json');

    if (!await exists(sharesPath)) {
      console.log('No shares.json found in backup');
      return;
    }

    const sharesData = JSON.parse(await fsp.readFile(sharesPath, 'utf8'));

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
}

module.exports = BackupParser;
