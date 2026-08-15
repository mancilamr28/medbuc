import { createContext, useContext } from 'react';
import type { Question } from '../data/questions';
import type { GrilaCuStare } from '../lib/continut';

export interface ContentValue {
  grile: GrilaCuStare[];
  questions: Question[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const ContentContext = createContext<ContentValue | null>(null);

export function useContentOptional(): ContentValue | null {
  return useContext(ContentContext);
}

export function useContent(): ContentValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent trebuie folosit în interiorul <ContentProvider>');
  return ctx;
}
