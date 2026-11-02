import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DAY_MS } from './utils.js';

export class Cleanup extends EventEmitter {
  async findOldFiles(directory, days) {
    this.emit('scan-start', { directory, days });
    const entries = await fs.readdir(directory, { recursive: true });

    const now = Date.now();
    const oldFiles = [];

    for (const entry of entries) {
      const filePath = path.join(directory, entry);
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;
        const daysOld = (now - stats.mtime.getTime()) / DAY_MS;
        if (daysOld > days) {
          const file = {
            path: filePath,
            size: stats.size,
            mtime: stats.mtime,
            daysOld: Math.floor(daysOld),
          };
          oldFiles.push(file);
          this.emit('file-found', file);
        }
      } catch (error) {
        this.emit('file-error', { path: filePath, error, processed: 0, total: 0 });
      }
    }

    oldFiles.sort((a, b) => b.daysOld - a.daysOld);
    return oldFiles;
  }

  async deleteFiles(files) {
    const total = files.length;
    let processed = 0;
    let deleted = 0;
    let freedSize = 0;
    let errors = 0;

    for (const file of files) {
      try {
        await fs.unlink(file.path);
        deleted++;
        freedSize += file.size;
        processed++;
        this.emit('file-deleted', { path: file.path, size: file.size, processed, total });
      } catch (error) {
        errors++;
        processed++;
        this.emit('file-error', { path: file.path, error, processed, total });
      }
    }

    const result = { deleted, freedSize, errors };
    this.emit('cleanup-complete', result);
    return result;
  }
}
