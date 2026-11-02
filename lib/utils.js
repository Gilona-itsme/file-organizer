export const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; 

export const DAY_MS = 24 * 60 * 60 * 1000;

export function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function drawProgressBar(current, total, width = 20) {
  const percentage = total > 0 ? current / total : 1;
  const filled = Math.round(percentage * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `${bar} ${current}/${total}`;
}

export function describeError(error, target = '') {
  const where = target ? `: ${target}` : '';

  switch (error.code) {
    case 'ENOENT':
      return `Not found${where}`;
    case 'EACCES':
    case 'EPERM':
      return `Permission denied${where}`;
    case 'ENOTDIR':
      return `Not a directory${where}`;
    case 'EISDIR':
      return `Expected a file but found a directory${where}`;
    case 'EEXIST':
      return `Already exists${where}`;
    case 'ENOSPC':
      return `No space left on device${where}`;
    case 'EMFILE':
    case 'ENFILE':
      return `Too many open files${where}`;
    case 'EBUSY':
      return `Resource is busy or locked${where}`;
    case 'EINVAL':
      return `${error.message}`;
    default:
      return `Unexpected error${where} (${error.code ?? 'no code'}): ${error.message}`;
  }
}
