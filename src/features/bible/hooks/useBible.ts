import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, LayoutAnimation, UIManager, Animated, ScrollView, FlatList, PanResponder, PermissionsAndroid, Alert, Clipboard } from 'react-native';
import { checkInternetConnection } from '../../../utilits/checkInternet';
import { bibleApi, checkOnlineStatus, getOnlineStatus } from '../../../services/bibleApi';
import { getVerseText, getVersesForChapter, getBibleBooks, getActiveVersionId } from '../../../utilits/bibleUtils';
import { AppContext } from '../../../common/AppContext';
import { getColors, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import { route } from '../../../component/navigations/routes';
import { sendPostRequest, GenericResponse } from '../../../services/api';
import { showToast } from '../../../helpers/Toash.helper';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface Book {
  name: string;
  chapters: number;
  verses: number;
  testament: 'Old' | 'New';
}

export interface VerseSearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

type RootStackParamList = {
  [route.bible]: { bookName: string; chapter: number; verseNumber: number };
  [route.journalEntry]: any;
  [route.fullVerseExplanation]: any;
};

export const useBible = () => {
  const app = React.useContext(AppContext);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const isDark = app?.isDark ?? false;
  const COLORS = getColors(isDark);
  
  // Use version from app context, not local state
  const activeVersionId = app?.bibleVersionId || 'BSB';

  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const [currentBook, setCurrentBook] = useState<string>('Genesis');
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [maxChapters, setMaxChapters] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [verses, setVerses] = useState<Record<number, string>>({});
  const [versesArray, setVersesArray] = useState<Array<{ num: number; text: string }>>([]);

  const [highlights, setHighlights] = useState<Record<number, { colorId: number; color: string }>>({});
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

  const [showBookSelector, setShowBookSelector] = useState<boolean>(false);
  const [showChapterSelector, setShowChapterSelector] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [showVersionPicker, setShowVersionPicker] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState<boolean>(false);
  const [showTranslationPicker, setShowTranslationPicker] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<VerseSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  const [verseExplanationMap, setVerseExplanationMap] = useState<Record<number, string>>({});

  const [noteText, setNoteText] = useState<string>('');
  const [noteSaving, setNoteSaving] = useState<boolean>(false);

  const [fontSize, setFontSize] = useState<number>(18);

  const [activeAudioVerse, setActiveAudioVerse] = useState<number | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState<boolean>(false);
  const [audioPlaylist, setAudioPlaylist] = useState<Array<{ num: number; text: string }>>([]);
  const [audioVerseIndex, setAudioVerseIndex] = useState<number>(0);
  const [audioScope, setAudioScope] = useState<'chapter' | 'selection'>('chapter');
  const [afterPlayBehaviour, setAfterPlayBehaviour] = useState<'stop' | 'repeat_one' | 'repeat' | 'continue'>('continue');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number>(0);

  const [modal, setModal] = useState<{ status: boolean; title: string; message: string; severity: string }>({
    status: false,
    title: '',
    message: '',
    severity: 'info',
  });

  const [verseJournalPrompts, setVerseJournalPrompts] = useState<Array<{ id: number; prompt: string }>>([]);
  const [chapterJournalPrompts, setChapterJournalPrompts] = useState<Array<{ id: number; prompt: string }>>([]);

  const [books, setBooks] = useState<Book[]>([]);
  const [versionMeta, setVersionMeta] = useState<{ name: string; abbreviation: string }>({ name: '', abbreviation: activeVersionId });

  const flatListRef = useRef<FlatList>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(0);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeVersion = useMemo(() => ({
    id: activeVersionId,
    name: versionMeta.name || getVersionName(activeVersionId),
    abbreviation: versionMeta.abbreviation || activeVersionId,
  }), [activeVersionId, versionMeta]);

  const bibleVersionId = activeVersionId;

  const activeVerseWordMap = useRef<Record<number, string>>({}).current;

  const pendingVersesRef = useRef<number[]>([]);

  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkOnlineStatus();
      setIsOnline(connected);
    };
    checkConnection();
    const interval = setInterval(() => {
      checkConnection().catch(console.warn);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadBooks();
    loadCurrentChapter();
  }, [activeVersionId]);

  useEffect(() => {
    const loadVersionMeta = async () => {
      try {
        const translations = await bibleApi.getAvailableTranslationsWithMapping();
        const match = translations.find(t => t.frontendId === activeVersionId);
        if (match) {
          setVersionMeta({ name: match.name, abbreviation: match.shortName || match.frontendId });
        } else {
          setVersionMeta({ name: getVersionName(activeVersionId), abbreviation: activeVersionId });
        }
      } catch {
        setVersionMeta({ name: getVersionName(activeVersionId), abbreviation: activeVersionId });
      }
    };
    loadVersionMeta();
  }, [activeVersionId]);

  useEffect(() => {
    if (currentBook) {
      loadCurrentChapter();
    }
  }, [currentBook, currentChapter]);

  const loadBooks = useCallback(async () => {
    try {
      let booksData: Book[];
      
      const backendBooks = await bibleApi.getBooksWithMaxChapters(activeVersionId);
      if (backendBooks && backendBooks.length > 0) {
        booksData = backendBooks.map(book => ({
          name: book.bookName,
          chapters: book.maxChapter,
          verses: book.totalVerses,
          testament: book.testament.toLowerCase() === 'new' ? 'New' : 'Old',
        }));
      } else {
        booksData = getBibleBooks();
      }
      
      setBooks(booksData);
      
      const bookData = booksData.find(b => b.name === currentBook);
      if (bookData) {
        setMaxChapters(bookData.chapters);
      }
    } catch (error) {
      console.warn('Failed to load books, using local:', error);
      const localBooks = getBibleBooks();
      setBooks(localBooks);
      const bookData = localBooks.find(b => b.name === currentBook);
      if (bookData) {
        setMaxChapters(bookData.chapters);
      }
    }
  }, [activeVersionId, currentBook]);

  const loadCurrentChapter = useCallback(async () => {
    setLoading(true);
    try {
      let chapterVerses: Record<number, string>;
      
      const result = await bibleApi.getVerses(activeVersionId, currentBook, currentChapter);
      if (result && result.verses && result.verses.length > 0) {
        chapterVerses = {};
        result.verses.forEach(v => {
          chapterVerses[v.verseNumber] = v.text;
        });
      } else {
        chapterVerses = getVersesForChapter(currentBook, currentChapter);
      }
      
      setVerses(chapterVerses);
      setVersesArray(
        Object.entries(chapterVerses).map(([num, text]) => ({
          num: parseInt(num),
          text,
        })).sort((a, b) => a.num - b.num)
      );

      const bookData = books.find(b => b.name === currentBook);
      if (bookData) {
        setMaxChapters(bookData.chapters);
      }
    } catch (error) {
      console.warn('Failed to load chapter, using local:', error);
      const localVerses = getVersesForChapter(currentBook, currentChapter);
      setVerses(localVerses);
      setVersesArray(
        Object.entries(localVerses).map(([num, text]) => ({
          num: parseInt(num),
          text,
        })).sort((a, b) => a.num - b.num)
      );
    } finally {
      setLoading(false);
    }
  }, [activeVersionId, currentBook, currentChapter, books]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCurrentChapter();
    setRefreshing(false);
  }, [loadCurrentChapter]);

  const goToChapter = useCallback((direction: 'prev' | 'next' | 'first' | 'last') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (direction === 'first') {
      setCurrentChapter(1);
    } else if (direction === 'last') {
      setCurrentChapter(maxChapters);
    } else if (direction === 'prev') {
      if (currentChapter > 1) {
        setCurrentChapter(currentChapter - 1);
      }
    } else if (direction === 'next') {
      if (currentChapter < maxChapters) {
        setCurrentChapter(currentChapter + 1);
      }
    }
  }, [currentChapter, maxChapters]);

  const selectBookFromModal = useCallback((bookName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentBook(bookName);
    setCurrentChapter(1);
    setShowBookSelector(false);
  }, []);

  const selectChapterFromModal = useCallback((chapter: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentChapter(chapter);
    setShowChapterSelector(false);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const backendResults = await bibleApi.search(activeVersionId, query, 50);
      const results = backendResults.map(r => ({
        book: r.bookName,
        chapter: r.chapter,
        verse: r.verse,
        text: r.text,
      }));
      setSearchResults(results);
    } catch (error) {
      console.warn('Search failed:', error);
      try {
        const { searchVerses } = require('../../../utilits/bibleUtils');
        setSearchResults(searchVerses(query, 50));
      } catch {
        setSearchResults([]);
      }
    } finally {
      setSearchLoading(false);
    }
  }, [activeVersionId]);

  const goToVerse = useCallback((result: VerseSearchResult) => {
    setCurrentBook(result.book);
    setCurrentChapter(result.chapter);
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: Math.max(0, result.verse - 1), animated: true });
    }, 300);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const toggleVerseSelection = useCallback((verseNumber: number) => {
    setSelectedVerses(prev => {
      if (prev.includes(verseNumber)) {
        return prev.filter(v => v !== verseNumber);
      }
      return [...prev, verseNumber].sort((a, b) => a - b);
    });
  }, []);

  const setVerseRangeSelection = useCallback((start: number, end: number) => {
    const range = [];
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    setSelectedVerses(range);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedVerses([]);
  }, []);

  const setPendingVerses = useCallback((verses: number[]) => {
    pendingVersesRef.current = verses;
  }, []);

  const addReadHistory = useCallback(async (verseNumber: number) => {
    // Store read history locally
    try {
      const key = 'read_history';
      const existing = await AsyncStorage.getItem(key);
      const history = existing ? JSON.parse(existing) : [];
      
      const entry = {
        bookName: currentBook,
        chapter: currentChapter,
        verseNumber,
        timestamp: new Date().toISOString(),
      };
      
      const updatedHistory = [entry, ...history].slice(0, 100);
      await AsyncStorage.setItem(key, JSON.stringify(updatedHistory));
    } catch (error) {
      console.warn('Failed to save read history:', error);
    }
  }, [currentBook, currentChapter]);

  const addFavorite = useCallback(async (verses: number[]) => {
    try {
      const startV = Math.min(...verses);
      const endV = Math.max(...verses);
      
      const response = await sendPostRequest<any>('bible', 'add-favorite', {
        bookName: currentBook,
        chapter: currentChapter,
        verseStart: startV,
        verseEnd: verses.length > 1 ? endV : startV,
      });
      
      if (response.returnCode === 200) {
        setFavorites(prev => new Set([...prev, ...verses]));
        showToast('success', 'Added to favorites');
      }
    } catch (error) {
      showToast('error', 'Failed to add favorite');
    }
  }, [currentBook, currentChapter]);

  const startReadingSelectedVerses = useCallback((selectedVerseNumbers: number[]) => {
    if (selectedVerseNumbers.length === 0) return;
    
    const playlist = selectedVerseNumbers.map(v => ({
      num: v,
      text: verses[v] || getVerseText(currentBook, currentChapter, v) || '',
    })).filter(v => v.text);
    
    setAudioPlaylist(playlist);
    setAudioVerseIndex(0);
    setShowAudioPlayer(true);
    setIsAudioPaused(false);
  }, [currentBook, currentChapter, verses]);

  const startReadingChapter = useCallback(() => {
    const playlist = versesArray.map(v => ({ num: v.num, text: v.text }));
    setAudioPlaylist(playlist);
    setAudioVerseIndex(0);
    setShowAudioPlayer(true);
    setIsAudioPaused(false);
  }, [versesArray]);

  const handleAudioStop = useCallback(() => {
    setShowAudioPlayer(false);
    setActiveAudioVerse(null);
    setAudioPlaylist([]);
    setAudioVerseIndex(0);
  }, []);

  const goToNextSelectedVerse = useCallback(() => {
    if (audioVerseIndex < audioPlaylist.length - 1) {
      setAudioVerseIndex(prev => prev + 1);
      setActiveAudioVerse(audioPlaylist[audioVerseIndex + 1].num);
    }
  }, [audioVerseIndex, audioPlaylist]);

  const goToPreviousSelectedVerse = useCallback(() => {
    if (audioVerseIndex > 0) {
      setAudioVerseIndex(prev => prev - 1);
      setActiveAudioVerse(audioPlaylist[audioVerseIndex - 1].num);
    }
  }, [audioVerseIndex, audioPlaylist]);

  const handleAudioTogglePlayPause = useCallback(() => {
    setIsAudioPaused(prev => !prev);
  }, []);

  const onSpeedToggle = useCallback(() => {
    setSpeechRate(prev => {
      const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const currentIdx = rates.indexOf(prev);
      return rates[(currentIdx + 1) % rates.length];
    });
  }, []);

  const onSleepTimerToggle = useCallback(() => {
    if (sleepTimerRemaining > 0) {
      setSleepTimerRemaining(0);
      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current);
      }
    } else {
      setSleepTimerRemaining(15);
      sleepTimerRef.current = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev <= 1) {
            handleAudioStop();
            return 0;
          }
          return prev - 1;
        });
      }, 60000);
    }
  }, [sleepTimerRemaining, handleAudioStop]);

  const handleAudioScopeChange = useCallback((scope: 'chapter' | 'selection') => {
    setAudioScope(scope);
    if (scope === 'chapter') {
      startReadingChapter();
    }
  }, [startReadingChapter]);

  const handleAfterPlayChange = useCallback((behaviour: 'stop' | 'repeat_one' | 'repeat' | 'continue') => {
    setAfterPlayBehaviour(behaviour);
  }, []);

  const highlightVerses = useCallback(async (colorId: number, color: string, rangeStart?: number, rangeEnd?: number) => {
    const versesToHighlight = pendingVersesRef.current.length > 0 
      ? pendingVersesRef.current 
      : (rangeStart !== undefined && rangeEnd !== undefined 
          ? Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i)
          : selectedVerses);
    
    try {
      for (const v of versesToHighlight) {
        await sendPostRequest('bible', 'highlight', {
          bookName: currentBook,
          chapter: currentChapter,
          verseNumber: v,
          colorId,
          color,
        });
      }
      
      const newHighlights = { ...highlights };
      versesToHighlight.forEach(v => {
        newHighlights[v] = { colorId, color };
      });
      setHighlights(newHighlights);
      showToast('success', 'Highlighted');
    } catch (error) {
      showToast('error', 'Failed to highlight');
    }
  }, [currentBook, currentChapter, highlights, selectedVerses]);

  const removeHighlight = useCallback(async (verseNumber: number) => {
    try {
      await sendPostRequest('bible', 'remove-highlight', {
        bookName: currentBook,
        chapter: currentChapter,
        verseNumber,
      });
      
      const newHighlights = { ...highlights };
      delete newHighlights[verseNumber];
      setHighlights(newHighlights);
    } catch (error) {
      console.warn('Failed to remove highlight:', error);
    }
  }, [currentBook, currentChapter, highlights]);

  const shareVerses = useCallback((verses: number[]) => {
    const text = verses.map(v => `${v}. ${verses[v] || getVerseText(currentBook, currentChapter, v)}`).join('\n');
    const ref = `${currentBook} ${currentChapter}:${verses.join(',')}`;
    
    Clipboard.setString(`${ref}\n\n${text}`);
    showToast('success', 'Copied to clipboard');
  }, [currentBook, currentChapter]);

  const copyVerses = useCallback((verses: number[]) => {
    const text = verses.map(v => `${v}. ${verses[v] || getVerseText(currentBook, currentChapter, v)}`).join('\n');
    Clipboard.setString(text);
    showToast('success', 'Copied to clipboard');
  }, [currentBook, currentChapter]);

  const handleVersionChange = useCallback(async (versionId: string) => {
    if (app?.setBibleVersion) {
      app.setBibleVersion(versionId);
    }
    setCurrentChapter(1);
    setShowDrawer(false);
    setShowVersionPicker(false);
    setShowTranslationPicker(false);
    
    try {
      await AsyncStorage.setItem('bible_version', versionId);
    } catch (error) {
      console.warn('Failed to save version preference:', error);
    }
  }, []);

  const getverseExplanation = useCallback(async (verseNumbers: number[], bookName: string, chapter: number) => {
    try {
      const response = await sendPostRequest<any>('bible', 'explain', {
        bookName,
        chapter,
        verseNumbers,
      });
      
      if (response.returnCode === 200 && response.returnData) {
        const explanations: Record<number, string> = {};
        response.returnData.forEach((item: any) => {
          explanations[item.verseNumber] = item.explanation;
        });
        setVerseExplanationMap(explanations);
        setShowExplanation(true);
      }
    } catch (error) {
      console.warn('Failed to get explanation:', error);
    }
  }, []);

  const clearVerseExplanationForVerse = useCallback((verseNumber: number) => {
    setVerseExplanationMap(prev => {
      const newMap = { ...prev };
      delete newMap[verseNumber];
      return newMap;
    });
  }, []);

  const openNoteModal = useCallback(() => {
    setShowNoteModal(true);
  }, []);

  const closeNoteModal = useCallback(() => {
    setShowNoteModal(false);
    setNoteText('');
  }, []);

  const saveNote = useCallback(async (rangeStart?: number, rangeEnd?: number) => {
    setNoteSaving(true);
    try {
      const versesToSave = pendingVersesRef.current.length > 0 
        ? pendingVersesRef.current 
        : (rangeStart !== undefined && rangeEnd !== undefined 
            ? Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i)
            : selectedVerses);
      
      const startV = Math.min(...versesToSave);
      const endV = Math.max(...versesToSave);
      
      await sendPostRequest('bible', 'note', {
        bookName: currentBook,
        chapter: currentChapter,
        verseStart: startV,
        verseEnd: versesToSave.length > 1 ? endV : startV,
        note: noteText,
      });
      
      showToast('success', 'Note saved');
      closeNoteModal();
    } catch (error) {
      showToast('error', 'Failed to save note');
    } finally {
      setNoteSaving(false);
    }
  }, [currentBook, currentChapter, noteText, selectedVerses, closeNoteModal]);

  const loadChapterPrompts = useCallback(async () => {
    try {
      const response = await sendPostRequest<any>('bible', 'journal-prompts', {
        bookName: currentBook,
        chapter: currentChapter,
      });
      
      if (response.returnCode === 200 && response.returnData) {
        setChapterJournalPrompts(response.returnData);
      }
    } catch (error) {
      setChapterJournalPrompts([]);
    }
  }, [currentBook, currentChapter]);

  const dismissModal = useCallback(() => {
    setModal({ status: false, title: '', message: '', severity: 'info' });
  }, []);

  return {
    isDark,
    navigation,
    books,
    maxChapters,
    verses,
    versesArray,
    highlights,
    favorites,
    selectedVerses,
    setPendingVerses,
    activeVersion,
    bibleVersionId,
    currentBook,
    currentChapter,
    fontSize,
    setFontSize,
    loading,
    searchLoading,
    showBookSelector,
    setShowBookSelector,
    showChapterSelector,
    setShowChapterSelector,
    showSearchModal,
    setShowSearchModal,
    showHighlightPicker,
    setShowHighlightPicker,
    showDrawer,
    setShowDrawer,
    showVersionPicker,
    setShowVersionPicker,
    showExplanation,
    setShowExplanation,
    showNoteModal,
    showAudioPlayer,
    showTranslationPicker,
    setShowTranslationPicker,
    searchQuery,
    searchResults,
    handleSearch,
    goToVerse,
    closeSearch,
    verseExplanationMap,
    noteText,
    setNoteText,
    noteSaving,
    openNoteModal,
    closeNoteModal,
    saveNote,
    highlightedVerse,
    highlightAnim,
    fadeAnim,
    flatListRef,
    toggleVerseSelection,
    setVerseRangeSelection,
    clearSelection,
    addReadHistory,
    addFavorite,
    startReadingSelectedVerses,
    highlightVerses,
    removeHighlight,
    shareVerses,
    copyVerses,
    goToChapter,
    handleVersionChange,
    getverseExplanation,
    clearVerseExplanationForVerse,
    activeVerseWordMap,
    modal,
    dismissModal,
    selectChapterFromModal,
    selectBookFromModal,
    startReadingChapter,
    handleAudioStop,
    refreshing,
    onRefresh,
    activeAudioVerse,
    audioPlaylist,
    audioScope,
    afterPlayBehaviour,
    audioVerseIndex,
    isAudioPaused,
    speechRate,
    sleepTimerRemaining,
    onSpeedToggle,
    onSleepTimerToggle,
    handleAudioScopeChange,
    handleAfterPlayChange,
    goToNextSelectedVerse,
    goToPreviousSelectedVerse,
    handleAudioTogglePlayPause,
    verseJournalPrompts,
    chapterJournalPrompts,
    loadChapterPrompts,
    isOnline,
  };
};

function getVersionName(id: string): string {
  const names: Record<string, string> = {
    'KJV': 'King James Version',
    'ASV': 'American Standard Version',
    'BBE': 'Bible in Basic English',
    'DARBY': 'Darby Translation',
    'WEB': 'World English Bible',
    'WEBSTER': 'Webster Bible',
    'YLT': 'Young\'s Literal Translation',
    'BSB': 'Berean Standard Bible',
  };
  return names[id] || id;
}

export default useBible;