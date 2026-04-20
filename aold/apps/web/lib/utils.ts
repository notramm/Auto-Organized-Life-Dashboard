// apps/web/src/lib/utils.ts

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/'))       return '🖼';
  if (mimeType.startsWith('video/'))       return '🎬';
  if (mimeType === 'application/pdf')      return '📄';
  if (mimeType.includes('word'))           return '📝';
  if (mimeType.includes('spreadsheet'))   return '📊';
  return '📁';
}