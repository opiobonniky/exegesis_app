# Search Feature — Build Plan

> **Status:** Existing (partial) | **Priority:** High
> Based on codebase analysis of frontend + backend.

---

## 1. Current State

### What exists
| Layer | What | Notes |
|-------|------|-------|
| **Backend** | `POST /:translationId/search` | Case-insensitive substring match over XML, 50-result limit, no ranking |
| **Frontend** | `SearchModal` in Bible screen | Slide-up modal, debounced input, results list, jump-to-verse |
| **Frontend** | `Search` icon in `BibleHeader` | Opens SearchModal |
| **Frontend** | Home search icon | Just added — navigates to Bible screen |
| **Frontend** | `bibleApi.search()` | Hits backend, falls back to local `searchVerses()` |
| **Frontend** | Search suggestions | Hardcoded: love, faith, hope, peace, joy, grace |

### What's missing / needs improvement

| Gap | Impact |
|-----|--------|
| No dedicated search screen (only modal in Bible) | Can't search from anywhere except Bible |
| No search history/recent searches | User repeats queries |
| No indexed search (O(n) scan of 31K verses) | Slow on large translations |
| No relevance ranking | Results in Bible order, not by match quality |
| No full-text search on notes/journal/highlights | Only Bible verses are searchable |
| No search result filtering (by testament, book) | All-or-nothing |
| No saved searches/bookmarked queries | Can't revisit later |
| No search within chapter/book scope | Always searches entire translation |
| No highlighted match context in results | Only shows verse text, no surrounding context |

---

## 2. Screens to Build

### 2.1 Global Search Screen (`SearchScreen.tsx`)
- **Route:** `route.search` (new entry in `routes.ts`)
- **Access:** All users (no guest gate needed for browsing)
- **Location:** `app/src/features/search/SearchScreen.tsx`

#### Layout
```
┌─────────────────────────────────┐
│  ← Back     Search           [X]│  <- Header with back + clear
├─────────────────────────────────┤
│  🔍 [________________________] │  <- Search input (auto-focused)
├─────────────────────────────────┤
│  Recent Searches                │
│  ┌─────────────────────────┐   │
│  │ 🕐 "faith"          [X] │   │  <- Tappable + deletable
│  │ 🕐 "love"           [X] │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  Search Suggestions             │
│  [love] [faith] [hope] [peace]  │  <- Quick chips
│  [joy] [grace] [mercy] [truth]  │
├─────────────────────────────────┤
│  Results (when query > 2 chars) │
│  ┌─────────────────────────┐   │
│  │ 📖 John 3:16          →│   │  <- Tap to jump to Bible
│  │ For God so loved...    │   │
│  ├─────────────────────────┤   │
│  │ 📖 1 John 4:9         →│   │
│  │ In this the love...    │   │
│  ├─────────────────────────┤   │
│  │ ...more results        │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

#### States
| State | UI |
|-------|-----|
| **Empty** (no query) | Recent searches + suggestions |
| **Typing** (< 3 chars) | "Type at least 3 characters" hint |
| **Loading** (debounce) | Skeleton shimmer (3 rows) |
| **Results** | List with verse ref + preview text |
| **No results** | "No verses found for '{query}'" + suggestion chips |
| **Error** | Toast + retry button |

#### Functionality
- Auto-focus input on mount
- Debounce search (300ms)
- Min 3 characters before API call
- Recent searches stored in AsyncStorage (max 10)
- Tap result → navigate to Bible at that verse
- Filter by testament (All / Old / New) — dropdown or segmented control
- Filter by book — second dropdown (book list filtered by testament)

### 2.2 Advanced Search Filter Sheet
- **Bottom sheet** overlaid on SearchScreen
- Filters: Translation, Testament, Book, Chapter range
- Apply / Reset buttons

### 2.3 Search History Panel
- Inline in SearchScreen when query is empty
- Shows last 10 searches with timestamps
- Swipe to delete individual items
- "Clear All" button

---

## 3. Frontend Implementation

### 3.1 New Files

| File | Purpose |
|------|---------|
| `app/src/features/search/SearchScreen.tsx` | Main search screen |
| `app/src/features/search/searchStyle.ts` | Styles (extracted) |
| `app/src/features/search/hooks/useSearch.ts` | Search state + API logic |
| `app/src/features/search/components/SearchFilterSheet.tsx` | Advanced filters |
| `app/src/features/search/components/SearchResultItem.tsx` | Result row component |
| `app/src/features/search/components/SearchSuggestionChips.tsx` | Suggestion chips |
| `app/src/features/search/components/RecentSearchItem.tsx` | History row |
| `app/src/services/searchApi.ts` | Search API client |

### 3.2 Updated Files

| File | Change |
|------|--------|
| `app/src/component/navigations/routes.ts` | Add `search: 'Search'` route |
| `app/src/reusable/ActionHeader.tsx` | Search icon already added |
| `app/src/features/home/Home.tsx` | `onSearchPress` already wired |
| `app/src/features/bible/BibleHeader.tsx` | Keep existing search icon (opens SearchModal for backward compat) |

### 3.3 Search State (`useSearch.ts`)

```typescript
interface SearchState {
  query: string;
  results: VerseSearchResult[];
  loading: boolean;
  error: string | null;
  recentSearches: string[];
  activeTranslation: string;
  filterTestament: 'all' | 'old' | 'new';
  filterBook: string | null;
  totalResults: number;
}
```

### 3.4 Navigation Flow

```
Home [🔍] ──> SearchScreen ──> Bible (at verse)
Bible [🔍] ──> SearchModal   (existing, kept for backward compat)
Any screen   ──> SearchScreen (via global tab/button)
```

### 3.5 Search API Client (`searchApi.ts`)

```typescript
export const searchApi = {
  search: async (
    translationId: string,
    query: string,
    options?: { limit?: number; testament?: string; book?: string }
  ): Promise<VerseSearchResult[]> => {
    const response = await api.post(
      `/translations/${translationId}/search`,
      { query, limit: options?.limit ?? 50, testament: options?.testament, book: options?.book }
    );
    return response.data?.data ?? [];
  }
};
```

---

## 4. Backend Improvements

### 4.1 Current Algorithm (O(n) scan)
```javascript
// service.js ~389
export const searchVerses = async (id, query, limit = 50) => {
  const parsed = await getParsedBible(id);
  // ... nested loops over testament → book → chapter → verse
  // text.toLowerCase().includes(searchLower)
  // No ranking, no indexing
};
```

### 4.2 Performance Bottlenecks

| Issue | Detail |
|-------|--------|
| XML parsed on first request per translation | ~300ms per parse, cached (max 5) |
| No index | Every search scans all ~31K verses |
| No relevance | Results are in Bible order, not by match quality |
| Single-translation only | Can't search across translations |
| No result count estimate | User doesn't know if query is too broad |

### 4.3 Required Backend Changes

#### 4.3.1 Add Search Index (PostgreSQL FTS)

**New Prisma model:**
```prisma
model SearchIndex {
  id            BigInt   @id @default(autoincrement())
  translation   String
  bookNumber    Int
  bookName      String
  chapter       Int
  verse         Int
  verseText     String
  searchVector  Unsupported("tsvector")?  // PostgreSQL full-text search vector

  @@index([translation, searchVector])    // GIN index for FTS
  @@index([translation, bookNumber])
  @@map("search_index")
}
```

**Migration script** (`backend/prisma/seed-search-index.js`):
```javascript
// Iterate all XML translations
// For each verse, insert into SearchIndex table
// Generate tsvector using to_tsvector('english', verseText)
```

#### 4.3.2 Enhance Search Endpoint

**New route:** `POST /api/search/verses`

**New controller** handles:
- FTS with `ts_query` + `ts_rank` for relevance ranking
- Optional filters: `testament`, `book`, `chapter`
- Pagination with `offset`/`limit` (cursor-based for deep pages)
- Optional cross-translation search
- Result highlighting with `ts_headline()`

**Response:**
```json
{
  "success": true,
  "query": "love",
  "total": 847,
  "page": 1,
  "limit": 50,
  "data": [
    {
      "bookNumber": 43,
      "bookName": "John",
      "chapter": 3,
      "verse": 16,
      "translation": "Berean",
      "text": "For God so loved the world...",
      "headline": "For God so <mark>loved</mark> the world...",
      "rank": 0.85
    }
  ]
}
```

#### 4.3.3 Keep XML Fallback

Maintain existing `searchVerses()` as fallback when:
- PostgreSQL is unavailable
- Translation not yet indexed
- Development/testing

#### 4.3.4 Optional: Add Search to Other Models

| Feature | Model | Priority |
|---------|-------|----------|
| Notes search | `Note` (verse notes) | Medium |
| Journal search | `JournalEntry` | Medium |
| Highlights search | `Highlight` | Low |
| Reading plan search | `ReadingPlan` | Low |

---

## 5. Implementation Order

### Phase 1: Foundation (Days 1-2)
1. Add `SearchIndex` model to Prisma schema
2. Create seed script to populate search index from XML
3. Run migration and seed
4. Create new backend endpoint with PostgreSQL FTS

### Phase 2: Global Search Screen (Days 3-5)
1. Create `SearchScreen.tsx` with input + results list
2. Create `searchStyle.ts` with all styles
3. Create `useSearch.ts` hook (debounce, API, history)
4. Create result row, suggestion chips, recent search components
5. Add `route.search` to navigator
6. Wire Home search icon to navigate to SearchScreen
7. Wire result tap to navigate to Bible verse

### Phase 3: Advanced Features (Days 6-7)
1. Add testament/book filters
2. Create filter bottom sheet
3. Add search history persistence (AsyncStorage)
4. Add search suggestions from popular queries

### Phase 4: Polish (Day 8)
1. Skeleton loading states
2. Error handling + empty states
3. Performance optimization
4. Accessibility (focus management, screen reader labels)

---

## 6. Frontend-Backend Contract

### `POST /api/search/verses`

**Request:**
```json
{
  "query": "love",
  "translation": "Berean",
  "limit": 50,
  "offset": 0,
  "testament": "all",
  "book": null
}
```

**Response (200):**
```json
{
  "success": true,
  "total": 847,
  "page": 1,
  "limit": 50,
  "data": [
    {
      "bookNumber": 43,
      "bookName": "John",
      "chapter": 3,
      "verse": 16,
      "translation": "Berean",
      "text": "For God so loved the world...",
      "headline": "For God so <mark>loved</mark> the world..."
    }
  ]
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "Search query is required"
}
```

---

## 7. File Reference

| Path | Purpose |
|------|---------|
| `backend/src/modules/bible-translations/route.js` | Add new search FTS route |
| `backend/src/modules/bible-translations/controller.js` | Add `searchFTS` controller |
| `backend/src/modules/bible-translations/service.js` | Keep existing `searchVerses` as fallback |
| `backend/prisma/schema.prisma` | Add `SearchIndex` model |
| `backend/prisma/seed-search-index.js` | Seed script (NEW) |
| `app/src/features/search/SearchScreen.tsx` | Search screen (NEW) |
| `app/src/features/search/searchStyle.ts` | Styles (NEW) |
| `app/src/features/search/hooks/useSearch.ts` | Hook (NEW) |
| `app/src/services/searchApi.ts` | API client (NEW) |
| `app/src/component/navigations/routes.ts` | Add `search` route |
