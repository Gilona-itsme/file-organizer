import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

export function calculateHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export class DuplicateFinder extends EventEmitter {
  async find(directory) {
    this.emit('scan-start', { directory });

    const entries = await fsp.readdir(directory, { recursive: true });

    const bySize = new Map();
    let totalFiles = 0;
    for (const entry of entries) {
      const filePath = path.join(directory, entry);
      try {
        const stats = await fsp.stat(filePath);
        if (!stats.isFile()) continue;
        totalFiles++;
        if (!bySize.has(stats.size)) bySize.set(stats.size, []);
        bySize.get(stats.size).push(filePath);
      } catch (error) {
        this.emit('file-error', { path: filePath, error });
      }
    }

    const candidates = [];
    for (const [size, group] of bySize) {
      if (group.length > 1) {
        for (const filePath of group) candidates.push({ path: filePath, size });
      }
    }

    const total = candidates.length;
    this.emit('hashing-start', { total, totalFiles });

    const byHash = new Map();
    let processed = 0;

    for (const { path: filePath, size } of candidates) {
      try {
        const hash = await calculateHash(filePath);
        if (!byHash.has(hash)) byHash.set(hash, { size, paths: [] });
        byHash.get(hash).paths.push(filePath);
        processed++;
        this.emit('file-processed', { path: filePath, hash, processed, total });
      } catch (error) {
        processed++;
        this.emit('file-error', { path: filePath, error });
      }
    }


    const groups = [];
    let totalWasted = 0;
    for (const [hash, { size, paths: groupPaths }] of byHash) {
      if (groupPaths.length > 1) {
        const wasted = size * (groupPaths.length - 1);
        totalWasted += wasted;
        groups.push({ hash, size, paths: groupPaths, wasted });
      }
    }
    groups.sort((a, b) => b.wasted - a.wasted);

    const result = { groups, totalWasted, totalFiles };
    this.emit('duplicates-found', result);
    return result;
  }
}
