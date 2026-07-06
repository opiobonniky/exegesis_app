import { useEffect, useState } from 'react';
import { bibleApi } from '../../../services/bibleApi';
import { BookItem } from '../types';

export function useLabBooks(translationId: string) {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      setBooksLoading(true);
      try {
        const data = await bibleApi.getBooksWithMaxChapters(translationId);
        setBooks(
          data.map(b => ({
            name: b.bookName,
            chapters: b.chaptersCount,
            verses: b.totalVerses,
            testament: b.testament as 'Old' | 'New',
          })),
        );
      } catch (e) {
        console.error('Failed to fetch books:', e);
      } finally {
        setBooksLoading(false);
      }
    };

    fetchBooks();
  }, [translationId]);

  return { books, booksLoading };
}
