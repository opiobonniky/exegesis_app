import { Book } from '../../utilits/bibleUtils';

export interface Highlight {
  id?: number;
  verseKey: string;
  color: string;
  colorId: number;
  note?: string;
}

export interface VerseItem {
  verseNum: string;
  text: string;
}

export interface VerseSearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface ModalState {
  status: boolean;
  title: string;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface BibleHeaderProps {
  book: string;
  chapter: number;
  version: {
    abbreviation: string;
    name: string;
  };
  isDark: boolean;
  onMenuPress: () => void;
  onBookPress: () => void;
  onSearchPress: () => void;
  onVersionPress?: () => void;
}

export interface ChapterNavigationProps {
  currentChapter: number;
  maxChapters: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectChapter: () => void;
  isDark: boolean;
}

export interface SelectionActionBarProps {
  selectedCount: number;
  selectedVerses: number[];
  totalVerses: number;
  onRangeChange: (start: number, end: number) => void;
  onListen: () => void;
  onExplain?: () => void;
  onHighlight: () => void;
  onNote: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onCopy: () => void;
  onClear: () => void;
  onJournal: () => void;
  isDark: boolean;
}

export interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  isDark: boolean;
}

export interface BookSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  books: Book[];
  currentBook: string;
  onSelectBook: (bookName: string) => void;
  isDark: boolean;
}

export interface ChapterSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  maxChapters: number;
  currentChapter: number;
  onSelectChapter: (chapter: number) => void;
  isDark: boolean;
}

export interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: VerseSearchResult[];
  onSelectResult: (book: string, chapter: number, verse: number) => void;
  loading: boolean;
  versionName: string;
  versionAbbreviation: string;
  isDark: boolean;
}

export interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  bibleVersionId: string;
  onVersionChange: (versionId: string) => void;
  showVersionPicker: boolean;
  onToggleVersionPicker: () => void;
  navigation: any;
  isDark: boolean;
  isGuest?: boolean;
  onGuestNavPress?: () => void;
}

export interface NoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (rangeStart?: number, rangeEnd?: number) => void;
  noteText: string;
  onNoteChange: (text: string) => void;
  saving: boolean;
  selectedVerses: number[];
  currentBook: string;
  currentChapter: number;
  isDark: boolean;
}

export interface ExplanationModalProps {
  visible: boolean;
  onClose: () => void;
  verses: Record<number, string>;
  selectedVerses: number[];
  explanation: string;
  currentBook: string;
  currentChapter: number;
  onReadMore: () => void;
  isDark: boolean;
}

export interface HighlightPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectColor: (colorId: number, color: string) => void;
  isDark: boolean;
}
