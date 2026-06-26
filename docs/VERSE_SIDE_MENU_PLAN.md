# Verse Side Menu — Development Plan

> **Status:** Planning Phase  
> **Last Updated:** 2026-06-26  
> **Spec Source:** `improving-features.md` — Screen 7: Verse Side Menu (11 actions)  
> **Target Location:** `app/src/features/bible/bible.tsx`  
> **Existing Components:** `DrawerMenu.tsx` (settings drawer), `SelectionActionBar.tsx` (multi-verse bar), various modals

---

## 1. Problem Statement

Currently, when a user taps a verse in the Bible reader, two paths exist:
- **Single tap** — selects the verse (triggers `SelectionActionBar` with multi-verse actions)
- **Long press** — opens the highlight picker

There is **no single-verse action menu**. Users cannot easily:
- Open a verse in the Exegesis Lab
- See Strong's words for that specific verse
- Add a note to one verse
- Save a verse to journal
- View cross-references for that verse
- Compare translations
- Read a devotional on that verse
- Answer trivia from that verse
- Search words/phrases from that verse

The spec calls for a **Verse Side Menu** — a slide-out drawer triggered by tapping a verse icon (the verse number or a dedicated menu icon) that shows the verse text and 11 action buttons.

---

## 2. Spec Requirements (from `improving-features.md`)

### Trigger
User taps **verse number** or **verse menu icon** in the Bible reader.

### Wireframe

```
| John 3:16                                             |
| For God so loved the world...                         |
---------------------------------------------------------
| [Study This Verse]                                    |
| [Open Strong's]                                       |
| [Add Note]                                            |
| [Highlight]                                           |
| [Save to Journal]                                     |
| [Cross References]                                    |
| [Compare Translations]                                |
| [Devotional on This Verse]                            |
| [Trivia from This Verse]                              |
| [Search This Word / Phrase]                           |
| [Share Verse]                                         |
---------------------------------------------------------
```

### 11 Actions

| # | Action | Behaviour |
|---|--------|-----------|
| 1 | **Study This Verse** | Navigate to Exegesis Lab with book/chapter/verse params |
| 2 | **Open Strong's** | Open Strong's panel showing all tagged words in that verse |
| 3 | **Add Note** | Open the existing `NoteModal` pre-filled for this verse |
| 4 | **Highlight** | Open the existing `HighlightPickerModal` for this verse |
| 5 | **Save to Journal** | Navigate to `route.journalEntry` with verse params pre-filled |
| 6 | **Cross References** | Open cross-reference drawer (fetch from `verseResourcesApi`) |
| 7 | **Compare Translations** | Open translation comparison (use `getTranslationComparison`) |
| 8 | **Devotional on This Verse** | Open devotional content for this verse if available |
| 9 | **Trivia from This Verse** | Open trivia question based on this verse (future: needs trivia backend) |
| 10 | **Search This Word / Phrase** | Navigate to search screen pre-filled with selected verse text |
| 11 | **Share Verse** | Open native share with verse text and reference |

---

## 3. Current Architecture Audit

### 3.1 What Already Exists (Reusable)

| Component | File | Status | Reusable For |
|-----------|------|--------|-------------|
| `DrawerMenu` | `modals/DrawerMenu.tsx` | ✅ | **NOT** reusable — this is a settings drawer (font, version, theme, library nav). A new component is needed. |
| `SelectionActionBar` | `components/SelectionActionBar.tsx` | ✅ | Multi-verse actions bar. Some actions overlap (Journal, Highlight, Note, Share, Copy). |
| `NoteModal` | `modals/NoteModal.tsx` | ✅ | Can be reused for "Add Note" action |
| `HighlightPickerModal` | `modals/HighlightPickerModal.tsx` | ✅ | Can be reused for "Highlight" action |
| `WordStudyBottomSheet` | `components/WordStudyBottomSheet.tsx` | ✅ | Can be reused for "Open Strong's" action (already triggered via `onWordPress`) |
| `TranslationPickerModal` | `modals/TranslationPickerModal.tsx` | ✅ | Version selector. For "Compare Translations", a **new** comparison modal is needed |
| `getTranslationComparison` | `services/verseResourcesApi.ts` | ✅ | API endpoint exists for comparing translations |
| `getVerseResources` | `services/verseResourcesApi.ts` | ✅ | API returns cross-references, commentaries |
| `getDailyVerseRef` | `useBible` hook | ✅ | Can fetch devotional content for a verse |
| `route.journalEntry` | `routes.ts` | ✅ | Navigation target for "Save to Journal" |
| `route.labFlow` | `routes.ts` | ✅ | Navigation target for "Study This Verse" |
| `route.search` | `routes.ts` | ✅ | Navigation target for "Search This Word / Phrase" |

### 3.2 What's Missing (Needs Building)

| Item | Priority | Notes |
|------|----------|-------|
| `VerseSideMenu` component | 🔴 Critical | New bottom sheet / slide-up panel. Similar to `WordStudyBottomSheet` but shows 11 action buttons + verse text. |
| `CrossReferenceDrawer` | 🟡 High | New component showing cross-references fetched from `verseResourcesApi`. Could be part of the side menu or a separate panel. |
| `TranslationComparisonPanel` | 🟡 High | Shows the same verse across multiple translations. Uses existing `getTranslationComparison` API. |
| `DevotionalOnVerse` lookup | 🟡 High | Fetch daily devotional for this verse. Backend may need a new endpoint to get devotional by reference. |
| Trivia backend | ❌ Not built | Trivia feature doesn't exist yet. Action should show "Coming Soon" or be hidden. |

### 3.3 Integration Points in `bible.tsx`

Current tap flow in `VerseList`:
```
onVersePress → toggleVerseSelection (selects verse)
onDoubleTap → toggleVerseSelection + addReadHistory
onLongPress → setPendingVerses + showHighlightPicker
```

**New trigger needed:** A dedicated icon (e.g., "⋯" menu icon) shown on each verse that opens the Verse Side Menu. Alternatively, tapping the verse **number** (not the text) could trigger the menu.

The Verse Side Menu should be rendered as a **bottom sheet** (like `WordStudyBottomSheet`) in `bible.tsx`, not as a side drawer.

---

## 4. Implementation Plan

### Phase 1: Core Component (`VerseSideMenu`)

**New file:** `app/src/features/bible/components/VerseSideMenu.tsx`

A bottom sheet/slide-up panel with:
1. **Header:** Verse reference (e.g., "John 3:16") + verse text preview
2. **Action list:** 11 action buttons with icons, grouped logically
3. **RTL support:** Handle `isRtl` for Arabic layout
4. **Guest gating:** Show sign-in prompt for actions that require auth
5. **Animation:** Smooth slide-up with backdrop overlay

**Props interface:**
```typescript
interface VerseSideMenuProps {
  visible: boolean;
  onClose: () => void;
  verseNumber: number;
  verseText: string;
  currentBook: string;
  currentChapter: number;
  isDark: boolean;
  navigation: any;
  /** Strong's word data for this verse (for "Open Strong's" action) */
  verseWords?: StrongsWordData[];
  /** Called to open existing modals */
  onOpenNoteModal: (verseNumber: number) => void;
  onOpenHighlightPicker: (verseNumber: number) => void;
  onOpenWordStudy: (verseNumber: number) => void;
}
```

### Phase 2: Trigger Integration in `bible.tsx`

1. **Add a menu icon** to each `VerseCard` — a small "⋯" or "❖" button visible on hover/tap
2. **Add state** to `bible.tsx`:
   ```typescript
   const [showVerseMenu, setShowVerseMenu] = useState(false);
   const [verseMenuVerse, setVerseMenuVerse] = useState<number | null>(null);
   ```
3. **Pass `onMenuPress`** callback through `VerseList` → `VerseCard`
4. **Render** `VerseSideMenu` in `bible.tsx` at the same level as other modals (e.g., after `WordStudyBottomSheet`)

### Phase 3: Actions Implementation

| Phase | Action | Implementation |
|-------|--------|----------------|
| 3a | **Study This Verse** | `navigation.navigate(route.labFlow, { bookName, chapter, verseStart: v, verseEnd: v })` |
| 3b | **Open Strong's** | Parse `verseWordMap[verseNumber]` and open `WordStudyBottomSheet` pre-filled |
| 3c | **Add Note** | Call `onOpenNoteModal(verseNumber)` → opens existing `NoteModal` |
| 3d | **Highlight** | Call `onOpenHighlightPicker(verseNumber)` → opens existing `HighlightPickerModal` |
| 3e | **Save to Journal** | `navigation.navigate(route.journalEntry, { bookName, chapter, verseStart: v, verseEnd: v })` |
| 3f | **Cross References** | Fetch from `getVerseResources(bookName, chapter, verseNumber)` → display in-line or in a sub-panel |
| 3g | **Compare Translations** | Fetch from `getTranslationComparison(bookName, chapter, verseNumber)` → show comparison list |
| 3h | **Devotional** | Look up daily verse for this ref, navigate to daily devotional screen |
| 3i | **Trivia** | Show "Coming Soon" toast (backend not built yet) |
| 3j | **Search** | Pre-fill search with verse text: `navigation.navigate(route.search, { query: verseText })` |
| 3k | **Share Verse** | Use `Share.share({ message: verseText, title: ref })` |

### Phase 4: Cross-Reference Panel

**New file:** `app/src/features/bible/components/CrossReferencePanel.tsx`

A sub-panel within `VerseSideMenu` (or a separate bottom sheet) that:
1. Fetches cross-references from `getVerseResources` API
2. Displays them as tappable items
3. Tapping a cross-ref navigates to that book/chapter in the Bible reader

### Phase 5: Translation Comparison Panel

**New file:** `app/src/features/bible/components/TranslationComparisonPanel.tsx`

A sub-panel that:
1. Fetches translations from `getTranslationComparison` API
2. Shows each translation with version name + text
3. Shows translation year/source

### Phase 6: Integration & Polish

1. **Guest gating:** Wrap auth-required actions with the existing `guard()` pattern
2. **RTL support:** Mirror layout for Arabic/Hebrew
3. **Animations:** Smooth slide-up + backdrop overlay (follow pattern from `DrawerMenu` or `WordStudyBottomSheet`)
4. **Accessibility:** Labels on all buttons
5. **Haptic feedback:** On menu open (follow existing pattern)

---

## 5. File Changes Summary

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `app/src/features/bible/components/VerseSideMenu.tsx` | Main side menu bottom sheet with 11 actions |
| 2 | `app/src/features/bible/components/CrossReferencePanel.tsx` | Cross-reference display panel |
| 3 | `app/src/features/bible/components/TranslationComparisonPanel.tsx` | Translation comparison panel |

### Modified Files

| # | File | Changes |
|---|------|---------|
| 1 | `app/src/features/bible/bible.tsx` | Add `showVerseMenu` state, `verseMenuVerse` state, `handleVerseMenuPress` callback, render `VerseSideMenu` component |
| 2 | `app/src/features/bible/components/VerseList.tsx` | Pass `onMenuPress` prop through to `VerseCard` |
| 3 | `app/src/features/bible/components/VerseCard.tsx` | Add menu icon button, call `onMenuPress(verseNumber)` on tap |
| 4 | `app/src/features/bible/components/index.ts` | Export new components |
| 5 | `app/src/features/bible/modals/DrawerMenu.tsx` | No changes needed (settings drawer stays separate) |

---

## 6. Dependencies & Prerequisites

| Dep | Status | Notes |
|-----|--------|-------|
| `getTranslationComparison` API | ✅ Exists | Uses existing `verseResourcesApi.ts` |
| `getVerseResources` API | ✅ Exists | Returns cross-references, commentaries |
| Exegesis Lab navigation | ✅ Exists | `route.labFlow` with verse params |
| JournalEntry navigation | ✅ Exists | `route.journalEntry` with verse params |
| Search screen | ✅ Exists | `route.search` with query param |
| Strong's word data per verse | ✅ Exists | `verseWordMap` in `useBible` |
| NoteModal | ✅ Exists | Can be opened for a single verse |
| HighlightPickerModal | ✅ Exists | Can be opened for a single verse |
| Trivia backend | ❌ Missing | Hide/disable this action until trivia is built |
| Devotional by verse ref endpoint | [~] Partial | May need a new backend endpoint |

---

## 7. Recommended Build Order

```
Phase 1: VerseSideMenu component (bottom sheet shell + 11 action buttons)
    ↓
Phase 2: Trigger integration (bible.tsx + VerseList + VerseCard)
    ↓
Phase 3a-3e: Simple actions (Study, Strong's, Note, Highlight, Journal, Share, Search)
    ↓
Phase 3f-3g: Data-fetching actions (Cross References, Compare Translations)
    ↓
Phase 3h-3i: Dependent actions (Devotional, Trivia — partially blocked)
    ↓
Phase 4: Cross-Reference sub-panel
    ↓
Phase 5: Translation Comparison sub-panel
    ↓
Phase 6: Polish (RTL, guest gating, animations, accessibility)
```

---

## 8. Open Questions / Decisions Needed

1. **Trigger mechanism:** Menu icon per verse OR tap verse number? The spec says "verse number or verse menu icon". Recommend: **add a small menu icon** (⋮) that appears on the right side of the verse card, since tapping verse text currently has other functions (selection, double-tap for read history).

2. **Bottom sheet vs slide-out drawer:** The spec says "side menu" but the wireframe shows a vertical list of actions. Recommend: **bottom sheet** (like WordStudyBottomSheet) — it's more natural on mobile and is the existing pattern in this app.

3. **Cross-references inline vs sub-panel:** Once fetched, should cross-refs appear:
   - (a) Inline within the side menu after tapping "Cross References" — replacing action list with ref list
   - (b) In a separate bottom sheet stacked on top
   
   Recommend: **(a)** — swap the side menu content to show refs, with a back button. Fewer modal layers.

4. **Trivia action:** Since trivia doesn't exist yet:
   - Show the button but disable it with "Coming Soon" toast
   - Hide it entirely until trivia is built
   
   Recommend: **show it disabled** with a "Coming Soon" label and toast, so users know it's planned.

5. **Devotional:** How to find devotional content for a specific verse? The existing `getDailyVerseRef` looks up daily verses by reference. This can be reused. For free-form devotionals, a new backend lookup may be needed.

---

## 9. UX Wireframe (Proposed)

```
┌─────────────────────────────────────────────┐
│  ✕                                           │
│  John 3:16                                   │
│  "For God so loved the world that He gave..."│
│  ─────────────────────────────────────────── │
│                                               │
│  📖 Study This Verse        → Exegesis Lab    │
│  🔤 Open Strong's           → Word Study      │
│  📝 Add Note                → Note Modal      │
│  🖍️ Highlight               → Color Picker    │
│  📓 Save to Journal         → New Entry       │
│  🔗 Cross References        → Show Refs       │
│  🔄 Compare Translations    → Show Versions   │
│  🙏 Devotional on This Verse → Daily Content  │
│  ❓ Trivia from This Verse  → Coming Soon     │
│  🔍 Search This Text        → Search Screen   │
│  📤 Share Verse             → Native Share    │
│                                               │
└─────────────────────────────────────────────┘
```

---

## 10. Estimation

| Phase | Estimated Files | Estimated Effort |
|-------|----------------|-----------------|
| Phase 1: Component shell | 1 new file | 1-2 hours |
| Phase 2: Trigger integration | 3 modified files | 1 hour |
| Phase 3a-3e: Simple actions | 1 modified file | 1-2 hours |
| Phase 3f-3g: Data-fetching actions | 1 modified + 2 new files | 2-3 hours |
| Phase 3h-3i: Dependent actions | 1 modified file | 1 hour |
| Phase 4: Cross-Reference Panel | 1 new file | 1-2 hours |
| Phase 5: Translation Comparison | 1 new file | 1-2 hours |
| Phase 6: Polish | 2-3 files | 1 hour |
| **Total** | **~14 files touched** | **~10-14 hours** |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Modal stacking conflicts (multiple bottom sheets open at once) | Medium | Close VerseSideMenu before opening sub-sheets. Use a single `activePanel` state to manage which view is shown. |
| Performance with large chapter (150 verses × menu icons) | Low | Menu icon is a small static element. No re-render overhead beyond the tap callback. |
| Guest gating complexity | Low | Reuse existing `guard()` pattern from bible.tsx |
| Cross-reference loading UX | Medium | Show spinner while fetching, with clear error state |
