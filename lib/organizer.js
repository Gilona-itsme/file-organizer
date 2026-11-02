import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { LARGE_FILE_THRESHOLD } from './utils.js';

export const categories = {
  Documents: ['.pdf', '.docx', '.doc', '.txt', '.md', '.xlsx', '.pptx'],
  Images: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'],
  Archives: ['.zip', '.rar', '.tar', '.gz', '.7z'],
  Code: ['.js', '.py', '.java', '.cpp', '.html', '.css', '.json'],
  Videos: ['.mp4', '.avi', '.mkv', '.mov', '.webm'],
  Other: [],
};

export function getCategory(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) return category;
  }
  return 'Other';
}

async function exists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function getUniquePath(directory, fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);

  let candidate = path.join(directory, fileName);
  let counter = 0;
  while (await exists(candidate)) {
    counter++;
    candidate = path.join(directory, `${base}(${counter})${ext}`);
  }
  return candidate;
}

async function copyOne(source, target, size) {
  if (size >= LARGE_FILE_THRESHOLD) {
    try {
      await pipeline(
        fs.createReadStream(source),
        fs.createWriteStream(target, { flags: 'wx' })
      );
    } catch (error) {
      if (error.code !== 'EEXIST') {
        await fsp.unlink(target).catch(() => {});
      }
      throw error;
    }
  } else {
    await fsp.copyFile(source, target, fs.constants.COPYFILE_EXCL);
  }
}

export class Organizer extends EventEmitter {
  async organize(sourceDir, outputDir) {
    const source = path.resolve(sourceDir);
    const output = path.resolve(outputDir);

    if (source === output) {
      const error = new Error('Source and output directories must be different');
      error.code = 'EINVAL';
      throw error;
    }

    const sourceStats = await fsp.stat(source);
    if (!sourceStats.isDirectory()) {
      const error = new Error(`Not a directory: ${source}`);
      error.code = 'ENOTDIR';
      throw error;
    }

    this.emit('organize-start', { source, output });

    for (const category of Object.keys(categories)) {
      const categoryPath = path.join(output, category);
      await fsp.mkdir(categoryPath, { recursive: true });
      this.emit('folder-created', { category, path: categoryPath });
    }

    const entries = await fsp.readdir(source, { recursive: true });

    const found = [];
    for (const entry of entries) {
      const filePath = path.join(source, entry);
      if (filePath.startsWith(output + path.sep)) continue;
      try {
        const stats = await fsp.stat(filePath);
        if (stats.isFile()) found.push({ filePath, size: stats.size });
      } catch (error) {
        this.emit('copy-error', { source: filePath, error, processed: 0, total: 0 });
      }
    }

    const total = found.length;
    this.emit('files-listed', { total });

    const summary = {};
    for (const category of Object.keys(categories)) summary[category] = 0;

    let processed = 0;
    let totalSize = 0;
    let errors = 0;

    for (const { filePath, size } of found) {
      const category = getCategory(filePath);
      try {
        this.emit('copy-start', { source: filePath, category, size, index: processed + 1, total });

        const target = await getUniquePath(path.join(output, category), path.basename(filePath));
        await copyOne(filePath, target, size);

        processed++;
        summary[category]++;
        totalSize += size;
        this.emit('copy-complete', { source: filePath, target, category, size, processed, total });
      } catch (error) {
        processed++;
        errors++;
        this.emit('copy-error', { source: filePath, error, processed, total });
      }
    }

    const totalCopied = Object.values(summary).reduce((a, b) => a + b, 0);
    const result = { summary, totalCopied, totalSize, errors, output };
    this.emit('organize-complete', result);
    return result;
  }
}
