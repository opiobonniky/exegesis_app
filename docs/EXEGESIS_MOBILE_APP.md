# Exegesis — Mobile App Documentation

> **Platform:** iOS & Android (React Native)
> **Developer:** Him First Media

---

## 1. Overview

Exegesis is a Bible study application that provides Scripture reading in 8 translations, verse highlighting, note-taking, journaling, reading plans, text-to-speech audio, daily verses, and full-text search — all in one app.

---

## 2. Architecture

### 2.1 Frontend (React Native)

| Layer | Technology |
|-------|-----------|
| Framework | React Native (TypeScript) |
| Navigation | `@react-navigation/native` (stack/tab) |
| State | React Context (`AppContext`) + hooks |
| HTTP | Axios (`api` / `sendPostRequest`) |
| Animations | `react-native-reanimated` + `Animated` API |
| Storage | AsyncStorage (user preferences, position) |
| TTS | Custom `bibleTTS` utility |
| Icons | `lucide-react-native` |

### 2.2 Backend (Node.js + Express)

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + Google OAuth |
| Bible Data | XML files (`Holy-Bible-XML-Format/`) |
| API Port | 5001 |

---

## 3. App Structure

```
app/src/
  common/          # AppContext, theme helpers
  component/       # Shared UI: BottomTab, navigators, language
  constants/       # Colors, fonts, spacing tokens
  features/
    admin/         # Admin dashboard, users, verses, plans
    auth/          # Login, register, forgot password, welcome
    bible/         # Bible reader, search, verse cards, Strong's
    home/          # Home screen, banners, stats, activity
    journal/       # Journal entries, prompts, templates
    profile/       # User profile, settings, preferences
    reading-plan/  # Reading plans, daily readings, quizzes
  hooks/           # useTranslation, useBible, etc.
  helpers/         # Toast notifications
  reusable/        # ActionHeader, ExpandableText, etc.
  services/        # API clients (bibleApi, strongsService)
  utilits/         # Bible utilities, TTS, formatting
```

---

## 4. Key Features

### 4.1 Bible Reader
- Full Old & New Testament across 8 translations: KJV, BBE, ASV, YLT, Darby, WEB, Webster, BSB
- Book/Chapter selection via `BookSelectorScreen` + `ChapterSelectorScreen`
- Verse-level interactions: highlight (6 colors), notes, bookmarks, share
- Audio (TTS) with speed/pitch/voice controls and persistent playback bar
- Auto-track read history
- Full-text search with results highlighted and jump-to-verse navigation

### 4.2 Search (Full-Text Bible Search)
- **Trigger:** Search icon in `BibleHeader` opens `SearchModal` as a slide-up modal
- **API:** `POST /api/translations/:translationId/search` with `{query, limit}`
- **Backend:** Case-insensitive substring match over XML Bible data (~31K verses)
- **Fallback:** Local `searchVerses()` in `bibleUtils.ts` for offline use
- **UX:** 3-char minimum, debounced, skeleton loading, search suggestions (love, faith, hope, etc.)
- **Navigation:** Tap result scrolls to verse with yellow border pulse animation
- **Guest gate:** Unauthenticated users see a banner instead of the search modal

### 4.3 Home Screen
- **ActionHeader** with brand bar (logo + search + theme toggle) and user profile section (avatar, greeting, username, tagline)
- **Content Banners:** 10 tappable cards in a vertical list (Daily Exegesis, Bible, Journals, Reading Plans, Bible Trivial, Bible Study, LordsBook, Resources, Support, Community Feeds)
- **Quick Actions:** 4x grid of icon shortcuts (Notes, Favorites, Highlights, History)
- **Stats:** Chapters read, highlights, notes, favorites counter
- **Recent Activity:** Timeline of reads, highlights, notes, favorites, plans
- **Faith Reels:** Featured audio/video content card
- **Pull-to-refresh** reloads stats and activity

### 4.4 Reading Plans
- Structured plans (30-day, 90-day, etc.)
- Daily assigned passages with progress tracker (circular)
- Push notification reminders
- Daily quiz questions and reflection prompts

### 4.5 Journal
- Personal journal entries in timeline view
- Admin-created prompts and templates for guided writing

### 4.6 Strong's Concordance
- Tap any word in a verse to see original language (Hebrew/Greek)
- `WordStudyBottomSheet` with Strong's definition, grammar, transliteration
- "Search All Uses" across the Bible
- "Save Word" to favorites

### 4.7 Multi-Language
- 20+ languages: English, Arabic, Bengali, German, Greek, Spanish, Filipino, French, Gujarati, Hindi, Italian, Kannada, Malayalam, Marathi, Nepali, Punjabi, Portuguese, Russian, Swahili, Tamil, Telugu, Urdu
- RTL support for Arabic and Urdu

### 4.8 Authentication
- Email/password sign-up and login
- Google Sign-In (one tap)
- Guest mode (no account required for read-only)
- Password reset flow

---

## 5. Navigation Routes

| Route | Screen | Access |
|-------|--------|--------|
| `Home` | Home screen | All users |
| `Bible` | Bible reader | All users |
| `Journal` | Journal list | Authenticated |
| `ReadingPlan` | Reading plans | Authenticated |
| `Profile` | User profile | Authenticated |
| `DailyDevotional` | Daily devotional | All users |
| `DailyVerse` | Full daily verse page | All users |
| `Notes` | Verse notes | Authenticated |
| `Favorites` | Saved verses | Authenticated |
| `Highlights` | Highlighted verses | Authenticated |
| `ReadHistory` | Reading history | Authenticated |
| `WordStudy` | Strong's word study | All users |
| `AdminDashboard` | Admin panel | Admin only |

---

## 6. API Endpoints

### Bible
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/bible/translations` | List available translations |
| `POST` | `/bible/verses` | Get verses for book/chapter |
| `POST` | `/bible/highlights` | Get/save highlights |
| `POST` | `/bible/notes` | Get/save notes |
| `POST` | `/bible/bookmarks` | Toggle bookmark |
| `POST` | `/translations/:id/search` | Full-text search |
| `POST` | `/bible/get-home-stats` | User reading stats |
| `POST` | `/bible/get-recent-activity` | Recent activity timeline |

### Strong's Concordance
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/strongs/:strongsNumber` | Get Strong's entry |
| `GET` | `/strongs/:strongsNumber/verses` | All verses using a word |
| `POST` | `/strongs/verse-words` | Get Strong's data for a verse |

### Reading Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/reading-plans/list` | List available plans |
| `POST` | `/reading-plans/progress` | Get user progress |
| `POST` | `/reading-plans/update-progress` | Mark day as read |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/dashboard` | Dashboard stats |
| `POST` | `/admin/users` | User management |
| `POST` | `/admin/daily-verse` | Manage daily verses |
| `POST` | `/admin/daily-devotion` | Manage devotionals |
| `POST` | `/admin/reading-plans` | Manage plans |
| `POST` | `/admin/journal-prompts` | Manage prompts |
| `POST` | `/admin/journal-templates` | Manage templates |

---

## 7. Theme & Styling

- Dark/Light mode via `AppContext.isDark`
- Colors defined in `constants/theme.ts` with `getColors(isDark)` returning light/dark palettes
- Primary: `#396284` | Primary Dark: `#294670` | Primary Light: `#EAFFFF`
- Spacing tokens: `SPACING.xs` (4), `sm` (8), `md` (16), `lg` (24), `xl` (32)
- Font sizes: `FONT_SIZES.xs` (11), `sm` (13), `md` (15), `lg` (17), `xl` (20), `xxl` (24)

---

## 8. Build & Run

```bash
# Frontend
cd app
npm install
npx react-native run-ios    # iOS
npx react-native run-android # Android

# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
node src/index.js
```

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `app/src/features/bible/hooks/useBible.ts` | Core Bible state, search, navigation logic |
| `app/src/features/bible/modals/SearchModal.tsx` | Full-text search modal UI |
| `app/src/reusable/ActionHeader.tsx` | Shared header (home/standard modes) |
| `app/src/features/home/Home.tsx` | Home screen with banners, stats, activity |
| `app/src/features/bible/bible.tsx` | Bible reader screen |
| `app/src/features/reading-plan/ReadingPlan.tsx` | Reading plans list and detail |
| `app/src/services/bibleApi.ts` | Bible API client |
| `app/src/services/strongsService.ts` | Strong's concordance API client |
| `backend/src/modules/bible-translations/route.js` | Bible and search API routes |
| `backend/src/modules/bible-translations/service.js` | Bible data service (XML parsing, search) |
| `backend/prisma/schema.prisma` | Database schema |

---

## 10. Not Yet Live

| Feature | Status |
|---------|--------|
| iOS App Store listing | In progress |
| Lordsbook login integration | In progress |
| Future reading plan day content | Needs admin content |
