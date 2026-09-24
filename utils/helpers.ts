import { Platform } from 'react-native';
import { Listing } from '../types/marketplace';
import { MONTHS_SQ, DAYS_SQ } from '../constants/theme';

export const getListingImages = (listing: Listing): string[] => {
  if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) return listing.images;
  if (listing.image_url) return [listing.image_url];
  return [];
};

export const getSafeImageUri = (uri: string | null | undefined): string => {
  if (!uri || typeof uri !== 'string') return 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400';
  const trimmed = uri.trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('blob//')) {
    return 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400';
  }
  if (Platform.OS === 'web' && trimmed.startsWith('file://')) {
    return 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400';
  }
  if (Platform.OS !== 'web' && !trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('file://') && !trimmed.startsWith('content://') && !trimmed.startsWith('data:')) {
    return 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400';
  }
  return trimmed;
};

export const formatDate = (dateString?: string, t?: any): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  if (diffDays === 0) return t?.today || 'Sot';
  if (diffDays === 1) return t?.yesterday || 'Dje';
  const months = t?.months || MONTHS_SQ;
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

export const formatChatTime = (dateString?: string, t?: any): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return t?.yesterday || 'Dje';
  const days = t?.days || DAYS_SQ;
  if (diffDays < 7) return days[date.getDay()];
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear().toString().slice(-2)}`;
};

export const formatPhoneNumber = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = value.replace(/\D/g, '').slice(0, 15);

  if (digits.length === 0) {
    return hasPlus ? '+' : '';
  }

  // Dial with 00383 -> format as +383
  if (digits.startsWith('00383')) {
    const rest = digits.slice(5);
    let formatted = '+383';
    if (rest.length > 0) formatted += ' ' + rest.slice(0, 2);
    if (rest.length > 2) formatted += ' ' + rest.slice(2, 5);
    if (rest.length > 5) formatted += ' ' + rest.slice(5, 8);
    if (rest.length > 8) formatted += ' ' + rest.slice(8);
    return formatted;
  }

  // Case 1: International format (+... or starting with 383)
  if (hasPlus || digits.startsWith('383')) {
    if (digits.startsWith('383')) {
      const rest = digits.slice(3);
      let formatted = '+383';
      if (rest.length > 0) formatted += ' ' + rest.slice(0, 2);
      if (rest.length > 2) formatted += ' ' + rest.slice(2, 5);
      if (rest.length > 5) formatted += ' ' + rest.slice(5, 8);
      if (rest.length > 8) formatted += ' ' + rest.slice(8);
      return formatted;
    } else if (digits.startsWith('355')) {
      // Albania (+355)
      const rest = digits.slice(3);
      let formatted = '+355';
      if (rest.length > 0) formatted += ' ' + rest.slice(0, 2);
      if (rest.length > 2) formatted += ' ' + rest.slice(2, 5);
      if (rest.length > 5) formatted += ' ' + rest.slice(5, 8);
      if (rest.length > 8) formatted += ' ' + rest.slice(8);
      return formatted;
    } else {
      // General international number (+XX or +XXX)
      if (digits.length <= 3) {
        return '+' + digits;
      }
      const cc = digits.slice(0, 3);
      const rest = digits.slice(3);
      let formatted = '+' + cc;
      if (rest.length > 0) formatted += ' ' + rest.slice(0, 2);
      if (rest.length > 2) formatted += ' ' + rest.slice(2, 5);
      if (rest.length > 5) formatted += ' ' + rest.slice(5, 8);
      if (rest.length > 8) formatted += ' ' + rest.slice(8);
      return formatted;
    }
  }

  // Case 2: Local format starting with '0' (e.g. 049 111 111 or 044 123 456)
  if (digits.startsWith('0')) {
    let formatted = digits.slice(0, 3);
    if (digits.length > 3) {
      formatted += ' ' + digits.slice(3, 6);
    }
    if (digits.length > 6) {
      formatted += ' ' + digits.slice(6, 9);
    }
    if (digits.length > 9) {
      formatted += ' ' + digits.slice(9);
    }
    return formatted;
  }

  // Case 3: Local format without leading '0' (e.g. 49 111 111)
  let formatted = digits.slice(0, 2);
  if (digits.length > 2) {
    formatted += ' ' + digits.slice(2, 5);
  }
  if (digits.length > 5) {
    formatted += ' ' + digits.slice(5, 8);
  }
  if (digits.length > 8) {
    formatted += ' ' + digits.slice(8);
  }
  return formatted;
};

export const formatListingPrice = (price: number | string | undefined | null, category?: string, t?: any): string => {
  const numPrice = Number(price);
  if (category === 'services') {
    if (!price || isNaN(numPrice) || numPrice === 0) {
      return '';
    }
    return `${numPrice} €`;
  }
  if (category === 'free') {
    if (!price || isNaN(numPrice) || numPrice === 0) {
      return t?.free || 'Falas';
    }
    return `${numPrice} €`;
  }
  if ((price === undefined || price === null || price === '') && isNaN(numPrice)) {
    return '';
  }
  if (numPrice === 0) {
    return '0 €';
  }
  return `${numPrice} €`;
};
