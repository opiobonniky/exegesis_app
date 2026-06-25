# 📖 Exegesis — App Feature Overview

> **For:** Client Demo
> **Platform:** iOS & Android

---

## 🎯 What is Exegesis?

A Bible study app where users can read Scripture in 8 translations, highlight verses, take notes, journal their thoughts, follow reading plans, listen to audio, and receive a daily verse — all in one place.

---

## ✅ Completed Features

### 📖 Bible Reader
- Full Old & New Testament
- 8 translations: KJV, BBE, ASV, YLT, Darby, WEB, Webster, BSB
- Book/Chapter selector to jump anywhere
- Tap verses to highlight in 6 colors
- Add personal notes on any verse
- Bookmark favorite verses
- Auto-track read history
- Full-text search across all verses
- Scope filters: Bible, Strong's Concordance, Journal, Topics, and Lemma search
- Book-specific filter within Bible scope
- Inline search result actions: Open verse, Study verse, Save verse, Add Note
- Strong's number and word lookup
- Journal entry search
- Bible topic search
- Greek/Hebrew lemma search
- Related words discovery for Strong's entries
- Share verses via WhatsApp, SMS, social media (includes "via Exegesis" branding)

### ☀️ Daily Features
- Verse of the Day on the home screen — fresh every day
- Daily Devotional tied to the verse
- Push notification reminders for the daily verse

### 📅 Reading Plans
- Structured plans (e.g., 30-day, 90-day)
- Tap to read today's assigned passages
- Visual progress tracker (circle)
- Push notification reminders
- Quiz questions for each day's reading
- Reflection prompts for each day

### 📝 Journal
- Write personal journal entries
- Browse all entries in a timeline
- Admin-created prompts to guide writing
- Admin-created templates for structured entries

### 🎧 Audio (Text-to-Speech)
- Listen to any passage read aloud
- Adjust speed, pitch, and voice
- Persistent audio bar stays visible while browsing

### 🌍 Multi-Language
- 20+ languages: English, Arabic, Bengali, German, Greek, Spanish, Filipino, French, Gujarati, Hindi, Italian, Kannada, Malayalam, Marathi, Nepali, Punjabi, Portuguese, Russian, Swahili, Tamil, Telugu, Urdu
- Right-to-left support for Arabic, Urdu

### 👤 Profile & Settings
- Edit name, email, profile photo
- Extended profile (ministry service, spiritual gifts, emergency contact)
- Adjust font size
- Dark mode toggle
- Notification preferences (daily verse time, plan reminders)
- Voice settings (TTS speed, pitch, voice)
- Guest mode banner (reminds guests to create an account)

### 🛠️ Admin Panel
- Dashboard overview
- User management (view/search users)
- Activity log
- Manage daily verses (add, edit, schedule)
- Manage devotionals (add, edit, schedule)
- Manage reading plans (full CRUD)
- Manage journal prompts and templates

### 🔐 Authentication
- Email sign-up and login
- Google Sign-In (one tap)
- Guest mode (no account needed)
- Password reset

---

## 🟡 Not Yet Live

| Feature | Status | Notes |
|---------|--------|-------|
| **iOS App Store** | 🔧 In Progress | Android Play Store test link is active. iOS listing needs to be set up |
| **Lordsbook Login** | 🔧 In Progress | Login button is built. Service integration needs final setup |
| **Future Plan Days** | 📅 Needs Content | Reading plans are built. Daily content for future dates needs to be added by admin |

---

## 🔍 Search Feature — Wireframe Audit vs Current Implementation

Based on `improving-features.md` (Section 24: Screen 19 — Search), the search feature needs the following improvements to match the spec:

### Current: Basic Bible FTS
| Requirement | Status | Notes |
|---|---|---|
| Search input | ✅ | Autofocus, debounced 300ms |
| Bible word/phrase search | ✅ | Full-text search via `searchApi` |
| Result: Open verse | ✅ | Navigates to Bible reader |

### Gaps vs Wireframe

| # | Requirement | Priority | Status | Notes |
|---|---|---|---|---|
| 1 | **"Search In" scope tabs** (Bible / Strong's / Journal / Topics) | High | ✅ Done | Scope filter row + 5 tabs |
| 2 | **Book-specific search** | Medium | ✅ Done | Book name chips in Bible scope |
| 3 | **Strong's number search** | Medium | ✅ Done | Routes to strongsService + backend |
| 4 | **Journal search** | Low | ✅ Done | Routes to journal API |
| 5 | **Topic search** | Low | ✅ Done | BibleTopic model + backend endpoint |
| 6 | **Greek/Hebrew lemma search** | Low | ✅ Done | Searches strongs_dictionary by lemma |
| 7 | **Result: Study verse** | High | ✅ Done | Navigates to verseResources |
| 8 | **Result: Save verse** | Medium | ✅ Done | Bookmark icon navigates to Bible |
| 9 | **Result: Add note** | Medium | ✅ Done | StickyNote icon on results |
| 10 | **Result: Search related words** | Low | ✅ Done | "Related Words" button on Strong's results |

### Development Roadmap

| Phase | Items | Status | Est. Effort |
|---|---|---|---|
| **1 — Scope filter tabs + result actions** | Added "Search In" filter row (Bible/Strong's/Journal), scope-aware search, inline Open/Study/Save buttons, Strong's & Journal result renderers | ✅ Done | 2-3 days |
| **2 — Strong's number search** | Scope tab routes to `strongsService`, renders Strong's entry results | ✅ Done | 1-2 days |
| **3 — Book-specific search** | Add book dropdown filter to Bible scope | ✅ Done | 1 day |
| **4 — Journal search** | Scope tab routes to journal API, renders journal entry results | ✅ Done | 1-2 days |
| **5 — Topics / Lemma search** | Topics tab + backend model, Lemma tab + backend search | ✅ Done | 3 days |
| **6 — Add Note + Related Words** | Inline Note button on Bible results, Related Words on Strong's results | ✅ Done | 1 day |

---

## 🧭 Quick Walkthrough (For Demo)

| Screen | What to Show |
|--------|-------------|
| **Welcome** | 3 onboarding slides explaining the app |
| **Login** | Sign up with email or Google — or tap "Continue as Guest" |
| **Home Tab** | Verse of the Day, quick links to Bible, Devotional, Plans |
| **Bible Tab** | Pick a book → pick a chapter → tap a verse to highlight/note/share/search |
| **Plan Tab** | Choose a plan → see progress → tap today's reading |
| **Profile Tab** | Edit profile → adjust reading/voice/notification settings → change language |
| **Admin** | Dashboard → manage users → manage verses & devotionals → manage plans |

---

## 🔗 Links

| What | Detail |
|------|--------|
| **App Name** | Exegesis |
| **Developer** | Him First Media |
| **Android** | [Google Play (internal test)](https://play.google.com/apps/internaltest/4701501480508116942) |
| **iOS** | App Store — listing pending |

---

*Built with ❤️ for daily Bible engagement*
