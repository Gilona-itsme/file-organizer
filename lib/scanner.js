import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DAY_MS } from './utils.js';


export class Scanner extends EventEmitter {
  async scan(directory) {
    this.emit('scan-start', { directory });

    const entries = await fs.readdir(directory, { recursive: true });

    const found = [];
    for (const entry of entries) {
      const filePath = path.join(directory, entry);
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) found.push({ filePath, stats });
      } catch (error) {
        this.emit('scan-warning', { path: filePath, error });
      }
    }


    const total = found.length;
    this.emit('files-listed', { total });

    const now = Date.now();
    const byType = new Map(); 
    const age = { last7: 0, last30: 0, older90: 0 };
    const files = [];
    let totalSize = 0;
    let processed = 0;

    for (const { filePath, stats } of found) {
      processed++;
      const ext = path.extname(filePath).toLowerCase() || '(other)';
      const fileData = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        mtime: stats.mtime,
      };

      files.push(fileData);
      totalSize += stats.size;

      const entry = byType.get(ext) ?? { count: 0, totalSize: 0 };
      entry.count++;
      entry.totalSize += stats.size;
      byType.set(ext, entry);

      const daysOld = (now - stats.mtime.getTime()) / DAY_MS;
      if (daysOld <= 7) age.last7++;
      if (daysOld <= 30) age.last30++;
      if (daysOld > 90) age.older90++;

      this.emit('file-found', { ...fileData, processed, total });
    }

    const largest = [...files].sort((a, b) => b.size - a.size).slice(0, 3);

    let oldest = null;
    for (const file of files) {
      if (!oldest || file.mtime < oldest.mtime) oldest = file;
    }

    const statistics = {
      directory,
      totalFiles: files.length,
      totalSize,
      byType,
      age,
      largest,
      oldest: oldest
        ? { ...oldest, daysOld: Math.floor((now - oldest.mtime.getTime()) / DAY_MS) }
        : null,
    };

    this.emit('scan-complete', statistics);
    return statistics;
  }
}
