# Bible Service Implementation - Online/Offline Switching

## Overview

This implementation provides a seamless Bible data experience that automatically switches between:
- **Backend API** (when online) - Uses the `@exegesis-backend/src/modules/bible-translations/` module
- **Local Data** (when offline) - Uses the existing JSON files in `@exegesis_app/src/assets/bibleVersion/`

## Files Created/Modified

### 1. New Service: `src/services/bibleService.ts`
- Provides asynchronous methods for accessing Bible data
- Automatically detects connectivity using `@react-native-community/netinfo`
- Falls back to local data when backend is unavailable
- Implements all major Bible data operations:
  - Get available translations
  - Get specific translation info
  - Get books for a translation
  - Get chapters for a book
  - Get verses for a chapter
  - Get specific verse by reference
  - Search for verses
  - Get verse ranges
  - Get standard book names

### 2. New Hook: `src/features/bible/hooks/useBible.ts`
- React hook that provides both synchronous and asynchronous interfaces
- Maintains backward compatibility with existing `bibleUtils` functions
- Provides async methods that automatically use backend when online
- Includes connection status tracking (`isOnline`)
- Handles fallback logic automatically

### 3. Updated Components
- `src/features/bible/DailyVerseScreen.tsx` - Updated to use async Bible data fetching
- `src/features/bible/Favorites.tsx` - Updated to use async Bible data fetching
- `src/features/bible/examples/BibleServiceDemo.tsx` - Example/demo component

## How It Works

### Connection Detection
The service uses the existing `checkInternetConnection` utility from `src/utilits/checkInternet.ts` which wraps `@react-native-community/netinfo`.

### Data Flow
1. When a Bible data request is made:
   - Check if we're online (with backend reachability test)
   - If online and backend available: fetch from API
   - If offline or backend unavailable: fall back to local data
   - If online but backend fails: fall back to local data (graceful degradation)

### Backend API Endpoints Used
The service communicates with the backend Bible translations module at `/translations`:
- `GET /translations/books/names` - Get standard book names
- `POST /translations` - Get all translations
- `POST /translations/:id` - Get translation info
- `POST /translations/:id/books` - Get books for translation
- `POST /translations/:id/chapters` - Get chapters for book
- `POST /translations/:id/verses` - Get verses for chapter
- `POST /translations/:id/verse` - Get specific verse
- `POST /translations/:id/search` - Search verses
- `POST /translations/:id/verse-range` - Get verse range

### Local Data Fallback
When using local data, the service leverages the existing `bibleUtils` module:
- Uses the same JSON format: `{"Genesis 1:1": "In the beginning...", ...}`
- Maintains compatibility with version switching via `setActiveVersion()`
- Provides identical data structure to backend responses where possible

## Usage in Components

### Existing Synchronous Usage (Still Works)
```typescript
import { getVerseText } from '../../utilits/bibleUtils';

// Still works exactly as before - uses local data
const verseText = getVerseText('John', 3, 16);
```

### New Asynchronous Usage (Recommended for New Code)
```typescript
import useBible from '../../features/bible/hooks/useBible';

// In your component
const { getVerseTextAsync, isOnline } = useBible();

// Fetch verse with automatic online/offline switching
const verseText = await getVerseTextAsync('John', 3, 16);
// Returns null if verse not found, otherwise the verse text

// Check connection status
if (isOnline === true) {
  // Using backend API
} else if (isOnline === false) {
  // Using local data
} else {
  // Still checking connection
}
```

### Handling Null Returns
The async functions return `null` when a verse is not found, matching the behavior of the synchronous versions. Always check for null:

```typescript
const verseText = await getVerseTextAsync(book, chapter, verse);
if (verseText === null) {
  // Handle verse not found case
} else {
  // Display the verse text
}
```

## Benefits

1. **Seamless User Experience**: App automatically uses the best available data source
2. **Better Performance**: When online, fetches only needed data rather than loading all local JSON
3. **Always Available**: Graceful fallback to local data ensures offline functionality
4. **Backward Compatible**: Existing code continues to work without changes
5. **Centralized Logic**: Connection handling and fallback logic in one place
6. **TypeScript Support**: Full type safety for all Bible data operations

## Testing

To test the online/offline switching:
1. **Online Mode**: Ensure device has internet connection and backend is reachable
2. **Offline Mode**: Disable internet connection or use airplane mode
3. **Backend Simulation**: Backend unreachable but device online (tests fallback)

The implementation includes reachability testing beyond simple connectivity checks to ensure the backend API is actually available.

## Future Enhancements

1. **Caching**: Add caching layer for backend responses to improve performance
2. **Selective Sync**: Allow users to pre-download specific translations for offline use
3. **Version Management**: Sync available versions between local and backend
4. **Analytics**: Track usage patterns to improve prefetching strategies
5. **WebSocket Integration**: Real-time updates when connected

## Files Reference

- `src/services/bibleService.ts` - Core Bible service with connectivity detection
- `src/features/bible/hooks/useBible.ts` - React hook for component usage
- `src/features/bible/DailyVerseScreen.tsx` - Updated to use async Bible data
- `src/features/bible/Favorites.tsx` - Updated to use async Bible data
- `src/features/bible/examples/BibleServiceDemo.tsx` - Example/demo component