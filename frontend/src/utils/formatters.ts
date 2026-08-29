import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

export function formatDate(date: string | Date, pattern: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Invalid date';
  return format(d, pattern);
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Invalid time';
  return format(d, 'HH:mm');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Invalid date';
  return format(d, 'MMM d, yyyy HH:mm');
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Invalid date';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}