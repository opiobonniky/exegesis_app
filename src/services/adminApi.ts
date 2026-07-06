/**
 * Admin API Service
 * ─────────────────────────────────────────────────────────────────────────────
 * API methods for admin functionality
 * Uses existing backend admin endpoints
 */

import { sendPostRequest } from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  adminCount: number;
  memberCount: number;
  newUsersThisMonth: number;
  totalPlans: number;
  activePlans: number;
  totalEnrollments: number;
  completedEnrollments: number;
  activeRate: number;
  verificationRate: number;
  completionRate: number;
}

export interface SystemUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth?: string;
  createdOn: string;
  updatedOn?: string;
  roleId: number;
  roleName: string;
  maritalStatus?: string;
  status: boolean;
  emailVerified: boolean;
  userRole: number;
}

export interface UsersResponse {
  users: SystemUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityRecord {
  id: number;
  userId: string;
  username: string;
  email?: string;
  ip: string;
  browserName: string;
  os: string;
  deviceType: string;
  deviceName: string;
  engine: string;
  locale: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  loggedInAt: string;
  loggedOutAt?: string;
}

export interface ActivityResponse {
  sessions: ActivityRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary?: {
    successCount: number;
    failedCount: number;
    onlineCount: number;
  };
}

export interface DailyVerse {
  id: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  bibleVersion?: string;
  displayDate: string;
  displayTime?: string;
  reflection?: string;
  explanation?: string;
  learnMore?: string;
  createdBy: string;
  createdOn: string;
  updatedBy?: string;
  updatedOn?: string;
  isPublished: boolean;
}

export interface DailyVerseResponse {
  content: DailyVerse[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  isFirst: boolean;
  isLast: boolean;
}

export interface DailyDevotion {
  id: number;
  title: string;
  content: string;
  bookName?: string | null;
  chapter?: number | null;
  verseNumber?: number | null;
  bibleVersion?: string | null;
  displayDate: string;
  displayTime?: string;
  createdBy: string;
  createdOn: string;
  updatedBy?: string;
  updatedOn?: string;
  isPublished: boolean;
}

export interface DailyDevotionResponse {
  content: DailyDevotion[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  isFirst: boolean;
  isLast: boolean;
}

export interface DailyExegesis {
  id: number;
  title: string;
  passageReference: string;
  introduction?: string | null;
  contextSummary?: string | null;
  teachingBody: string;
  application?: string | null;
  prayer?: string | null;
  tags?: string | null;
  displayDate: string;
  displayTime?: string | null;
  createdBy?: string | null;
  createdOn: string;
  updatedBy?: string | null;
  updatedOn?: string;
  isPublished: boolean;
}

export interface DailyExegesisResponse {
  content: DailyExegesis[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  isFirst: boolean;
  isLast: boolean;
}

export interface ReadingPlan {
  id: number;
  planId: string;
  title: string;
  description?: string;
  totalDays: number;
  questionsEnabled: boolean;
  category?: string;
  difficulty?: string;
  isActive: boolean;
  createdBy?: string;
  createdOn?: string;
  updatedBy?: string;
  updatedOn?: string;
}

export interface ReadingPlanResponse {
  plans: ReadingPlan[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminJournalEntry {
  id: number;
  userId: string;
  title?: string | null;
  content: string;
  bookName?: string | null;
  chapter?: number | null;
  verseNumber?: number | null;
  category?: string | null;
  isPublished: boolean;
  source?: string | null;
  tags?: string | null;
  createdOn: string;
  updatedOn?: string;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
  };
}

export interface AdminJournalEntriesResponse {
  entries: AdminJournalEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard API
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminDashboardStats = async (): Promise<DashboardStats> => {
  const response = await sendPostRequest<DashboardStats>(
    'admin',
    'get-admin-dashboard-stats',
    {},
  );
  if (response.returnCode !== 200) {
    throw new Error(
      response.returnMessage || 'Failed to fetch dashboard stats',
    );
  }
  return response.returnData as DashboardStats;
};

// ─────────────────────────────────────────────────────────────────────────────
// Users API
// ─────────────────────────────────────────────────────────────────────────────

export const getUsersByAdmin = async (
  search?: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<UsersResponse> => {
  const response = await sendPostRequest<UsersResponse>(
    'admin',
    'get-users-by-admin',
    {
      search: search || null,
      page,
      pageSize,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch users');
  }
  return response.returnData as UsersResponse;
};

export const updateUserByAdmin = async (
  username: string,
  userData: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    email?: string;
    phoneNumber?: string;
    gender?: string;
    maritalStatus?: string;
    roleName?: string;
    roleId?: number;
    status?: boolean;
  },
): Promise<SystemUser> => {
  const response = await sendPostRequest<SystemUser>('admin', 'update-user', {
    username,
    ...userData,
  });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to update user');
  }
  return response.returnData as SystemUser;
};

export const deleteUserByAdmin = async (username: string): Promise<void> => {
  const response = await sendPostRequest('admin', 'delete-user', { username });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to delete user');
  }
};

export const toggleUserStatusByAdmin = async (
  username: string,
  status: boolean,
): Promise<void> => {
  const response = await sendPostRequest('admin', 'toggle-user-status', {
    username,
    status,
  });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to toggle user status');
  }
};

export const toggleUserVerificationByAdmin = async (
  username: string,
  isVerified: boolean,
): Promise<void> => {
  const response = await sendPostRequest('admin', 'toggle-user-verification', {
    username,
    isVerified,
  });
  if (response.returnCode !== 200) {
    throw new Error(
      response.returnMessage || 'Failed to toggle user verification',
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Activity API
// ─────────────────────────────────────────────────────────────────────────────

export const getAllActivity = async (
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    username?: string;
    success?: boolean;
    deviceType?: string;
    onlineOnly?: boolean;
    endedOnly?: boolean;
  },
): Promise<ActivityResponse> => {
  const response = await sendPostRequest<ActivityResponse>(
    'admin',
    'get-all-activity',
    {
      page,
      pageSize,
      ...filters,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch activity');
  }
  return response.returnData as ActivityResponse;
};

export const getUserActivity = async (
  username: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<ActivityResponse> => {
  const response = await sendPostRequest<ActivityResponse>(
    'admin',
    'get-user-activity',
    {
      username,
      page,
      pageSize,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch user activity');
  }
  return response.returnData as ActivityResponse;
};

export const deleteActivityByAdmin = async (
  activityId: number,
): Promise<void> => {
  const response = await sendPostRequest('admin', 'delete-activity', {
    activityId,
  });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to delete activity');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Daily Verse API
// ─────────────────────────────────────────────────────────────────────────────

export const getAllDailyVerses = async (
  page: number = 0,
  size: number = 12,
  filters?: {
    startDate?: string;
    endDate?: string;
    smartDefault?: boolean;
    futureDays?: number;
    bookName?: string;
    chapter?: number;
    verseNumber?: number;
  },
): Promise<DailyVerseResponse> => {
  const response = await sendPostRequest<DailyVerseResponse>(
    'admin',
    'get-all-daily-verses',
    {
      page,
      size,
      ...filters,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch daily verses');
  }
  return response.returnData as DailyVerseResponse;
};

export const addDailyVerse = async (
  verseData: {
    bookName: string;
    chapter: number;
    verseNumber: number;
    displayDate: string;
    displayTime?: string;
    reflection?: string;
    published?: boolean;
  },
  id?: number,
): Promise<{
  verse: DailyVerse;
  conflict?: { type: string; field: string; existing: any }[];
}> => {
  try {
    const response = await sendPostRequest<DailyVerse>(
      'admin',
      'add-daily-verse',
      {
        id,
        ...verseData,
      },
    );
    if (response.returnCode !== 200) {
      throw new Error(response.returnMessage || 'Failed to add daily verse');
    }
    return { verse: response.returnData as DailyVerse };
  } catch (error: any) {
    if (error.returnCode === 409) {
      return {
        verse: null as any,
        conflict: error.returnData?.conflicts,
      };
    }
    throw error;
  }
};

export const deleteDailyVerse = async (verseId: number): Promise<void> => {
  const response = await sendPostRequest('admin', 'delete-daily-verse', {
    verseId,
  });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to delete daily verse');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Daily Devotions API
// ─────────────────────────────────────────────────────────────────────────────

export const getAllDailyDevotions = async (
  page: number = 0,
  size: number = 12,
  filters?: {
    startDate?: string;
    endDate?: string;
    smartDefault?: boolean;
    futureDays?: number;
  },
): Promise<DailyDevotionResponse> => {
  const response = await sendPostRequest<DailyDevotionResponse>(
    'admin',
    'get-all-daily-devotions',
    {
      page,
      size,
      ...filters,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(
      response.returnMessage || 'Failed to fetch daily devotions',
    );
  }
  return response.returnData as DailyDevotionResponse;
};

export const addDailyDevotion = async (
  devotionData: {
    title: string;
    content: string;
    bookName?: string | null;
    chapter?: number | null;
    verseNumber?: number | null;
    displayDate: string;
    displayTime?: string;
    published?: boolean;
  },
  id?: number,
): Promise<DailyDevotion> => {
  const response = await sendPostRequest<DailyDevotion>(
    'admin',
    'add-daily-devotion',
    {
      id,
      ...devotionData,
    },
  );

  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to add daily devotion');
  }
  return response.returnData as DailyDevotion;
};

export const deleteDailyDevotion = async (
  devotionId: number,
): Promise<void> => {
  const response = await sendPostRequest('admin', 'delete-daily-devotion', {
    id: devotionId,
  });
  if (response.returnCode !== 200) {
    throw new Error(
      response.returnMessage || 'Failed to delete daily devotion',
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Lordsbook Daily Exegesis API
// ─────────────────────────────────────────────────────────────────────────────

export const getAllDailyExegesis = async (
  page: number = 0,
  size: number = 12,
  filters?: {
    startDate?: string;
    endDate?: string;
    smartDefault?: boolean;
    futureDays?: number;
  },
): Promise<DailyExegesisResponse> => {
  const response = await sendPostRequest<DailyExegesisResponse>(
    'admin',
    'get-all-daily-exegesis',
    {
      page,
      size,
      ...filters,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch daily exegesis');
  }
  return response.returnData as DailyExegesisResponse;
};

export const addDailyExegesis = async (
  exegesisData: {
    title: string;
    passageReference: string;
    introduction?: string | null;
    contextSummary?: string | null;
    teachingBody: string;
    application?: string | null;
    prayer?: string | null;
    tags?: string | null;
    displayDate: string;
    displayTime?: string | null;
    published?: boolean;
  },
  id?: number,
): Promise<DailyExegesis> => {
  const response = await sendPostRequest<DailyExegesis>(
    'admin',
    'add-daily-exegesis',
    {
      id,
      ...exegesisData,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to save daily exegesis');
  }
  return response.returnData as DailyExegesis;
};

export const deleteDailyExegesis = async (
  exegesisId: number,
): Promise<void> => {
  const response = await sendPostRequest('admin', 'delete-daily-exegesis', {
    id: exegesisId,
  });
  if (response.returnCode !== 200) {
    throw new Error(
      response.returnMessage || 'Failed to delete daily exegesis',
    );
  }
};

export const getTodaysExegesis = async (): Promise<DailyExegesis> => {
  const response = await sendPostRequest<DailyExegesis>(
    'bible',
    'get-todays-exegesis',
    {},
  );
  if (response.returnCode !== 200) {
    throw new Error(
      response.returnMessage || "Failed to fetch today's exegesis",
    );
  }
  return response.returnData as DailyExegesis;
};

export const getAllDailyExegesisPublic = async (
  page: number = 0,
  size: number = 12,
  filters?: {
    startDate?: string;
    endDate?: string;
    smartDefault?: boolean;
    futureDays?: number;
  },
): Promise<DailyExegesisResponse> => {
  const response = await sendPostRequest<DailyExegesisResponse>(
    'bible',
    'get-all-daily-exegesis',
    {
      page,
      size,
      ...filters,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch daily exegesis');
  }
  return response.returnData as DailyExegesisResponse;
};

// ─────────────────────────────────────────────────────────────────────────────
// User-facing Daily Devotions API
// ─────────────────────────────────────────────────────────────────────────────

export const getTodaysDevotion = async (): Promise<DailyDevotion> => {
  const response = await sendPostRequest<DailyDevotion>(
    'bible',
    'get-todays-devotion',
    {},
  );
  if (response.returnCode !== 200) {
    throw new Error(
      response.returnMessage || "Failed to fetch today's devotion",
    );
  }
  return response.returnData as DailyDevotion;
};

export const getAllDailyDevotionsPublic = async (
  page: number = 0,
  size: number = 12,
  filters?: {
    startDate?: string;
    endDate?: string;
    smartDefault?: boolean;
    futureDays?: number;
  },
): Promise<DailyDevotionResponse> => {
  const response = await sendPostRequest<DailyDevotionResponse>(
    'bible',
    'get-all-daily-devotions',
    {
      page,
      size,
      ...filters,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(
      response.returnMessage || 'Failed to fetch daily devotions',
    );
  }
  return response.returnData as DailyDevotionResponse;
};
// ─────────────────────────────────────────────────────────────────────────────

export const getAllReadingPlansAdmin = async (
  page: number = 1,
  pageSize: number = 10,
  search?: string,
): Promise<ReadingPlanResponse> => {
  const response = await sendPostRequest<ReadingPlanResponse>(
    'reading-plans',
    'get-all',
    {
      page,
      pageSize,
      search: search || null,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch reading plans');
  }
  return response.returnData as ReadingPlanResponse;
};

// ─────────────────────────────────────────────────────────────────────────────
// Journal Moderation API
// ─────────────────────────────────────────────────────────────────────────────

export const getJournalEntriesForAdmin = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}): Promise<AdminJournalEntriesResponse> => {
  const response = await sendPostRequest<AdminJournalEntriesResponse>(
    'journal',
    'admin/get-all',
    {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 50,
      search: params?.search || undefined,
      category: params?.category || undefined,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch journal entries');
  }
  return response.returnData as AdminJournalEntriesResponse;
};

export const setJournalEntryPublicationForAdmin = async (
  id: number,
  isPublished: boolean,
): Promise<AdminJournalEntry> => {
  const response = await sendPostRequest<AdminJournalEntry>(
    'journal',
    'admin/set-publication',
    { id, isPublished },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to update journal entry');
  }
  return response.returnData as AdminJournalEntry;
};

export const createReadingPlan = async (planData: {
  title: string;
  description?: string;
  totalDays: number;
  questionsEnabled?: boolean;
  category?: string;
  difficulty?: string;
  isActive?: boolean;
}): Promise<ReadingPlan> => {
  const response = await sendPostRequest<ReadingPlan>(
    'reading-plans',
    'create',
    planData,
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to create reading plan');
  }
  return response.returnData as ReadingPlan;
};

export const updateReadingPlan = async (
  planId: string,
  planData: {
    title?: string;
    description?: string;
    totalDays?: number;
    questionsEnabled?: boolean;
    category?: string;
    difficulty?: string;
    isActive?: boolean;
  },
): Promise<ReadingPlan> => {
  const response = await sendPostRequest<ReadingPlan>(
    'reading-plans',
    'update',
    {
      planId,
      ...planData,
    },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to update reading plan');
  }
  return response.returnData as ReadingPlan;
};

export const deleteReadingPlan = async (planId: string): Promise<void> => {
  const response = await sendPostRequest('reading-plans', 'delete', { planId });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to delete reading plan');
  }
};

export interface Assignment {
  id: number;
  dayNumber: number;
  title: string;
  chapters: { book: string; chapter: number }[];
  reflectionQuestions: string[];
}

export const getPlanAssignments = async (
  planId: string,
  dayNumber: number,
): Promise<{
  returnCode: number;
  returnData?: Assignment;
  returnMessage?: string;
}> => {
  const response = await sendPostRequest<Assignment>(
    'reading-plans',
    'daily-assignment',
    {
      planId,
      dayNumber,
    },
  );
  return response;
};

export const addAssignment = async (assignmentData: {
  planId: string;
  dayNumber: number;
  title: string;
  chapters: { book: string; chapter: number }[];
  reflectionQuestions?: string[];
  assignmentId?: number;
}): Promise<{
  returnCode: number;
  returnData?: Assignment;
  returnMessage?: string;
}> => {
  const response = await sendPostRequest<Assignment>(
    'reading-plans',
    'add-assignment',
    assignmentData,
  );
  return response;
};

export const getPlanQuizQuestions = async (
  planId: string,
  dayNumber: number,
): Promise<{
  returnCode: number;
  returnData?: any[];
  returnMessage?: string;
}> => {
  const response = await sendPostRequest<any[]>(
    'reading-plans',
    'quiz-questions',
    {
      planId,
      dayNumber,
    },
  );
  return response;
};

export const addQuizQuestions = async (quizData: {
  planId: string;
  dayNumber: number;
  questions: {
    question: string;
    options: [string, string, string, string];
    correctAnswer: number;
    explanation: string;
  }[];
}): Promise<{
  returnCode: number;
  returnData?: any[];
  returnMessage?: string;
}> => {
  const response = await sendPostRequest(
    'reading-plans',
    'add-quiz-questions',
    quizData,
  );
  return response;
};

export const deleteQuizQuestion = async (questionId: number): Promise<void> => {
  const response = await sendPostRequest(
    'reading-plans',
    'delete-quiz-question',
    { questionId },
  );
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to delete quiz question');
  }
};

export interface AdminPlanStats {
  planId: string;
  title: string;
  totalDays: number;
  isActive: boolean;
  totalEnrollments: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  completionRate: number;
  totalQuizAnswers: number;
  totalQuizCorrect: number;
  totalQuizWrong: number;
  globalQuizAccuracy: number;
  description: string;
  difficultQuestions: {
    id: string;
    question: string;
    dayNumber: number;
    totalAnswers: number;
    accuracy: number;
  }[];
  assignmentsCount: number;
  questionsCount: number;
  enrollmentTrend: { date: string; count: number }[];
  completionTrend: { date: string; count: number }[];
  structure: {
    day: number;
    title: string;
    chapters: { book: string; chapter: number }[];
  }[];
  users: {
    userId: string;
    name: string;
    email: string;
    username: string;
    photo: string | null;
    startDate: string;
    lastActivity: string | null;
    isCompleted: boolean;
    completedDate: string | null;
    streak: number;
    completedDaysCount: number;
    completionPercentage: number;
    status: 'completed' | 'inprogress' | 'started';
    quizStats: {
      total: number;
      correct: number;
      wrong: number;
      accuracy: number;
    };
  }[];
}

export const getAdminPlanStats = async (
  planId: string,
): Promise<AdminPlanStats> => {
  const response = await sendPostRequest<AdminPlanStats>(
    'reading-plans',
    'admin-stats',
    { planId },
  );
  if (response.returnCode !== 200) {
    throw new Error(
      response.returnMessage || 'Failed to fetch plan statistics',
    );
  }
  return response.returnData as AdminPlanStats;
};

// ── Site settings ──────────────────────────────────────────────────────────

export interface SiteSettingResponse {
  key: string;
  value: string;
}

export const getSiteSetting = async (key: string): Promise<string | null> => {
  const response = await sendPostRequest<SiteSettingResponse>(
    'admin',
    'get-site-setting',
    { key },
  );
  if (response.returnCode === 200 && response.returnData) {
    return response.returnData.value;
  }
  return null;
};

export const setSiteSetting = async (
  key: string,
  value: string,
): Promise<void> => {
  const response = await sendPostRequest('admin', 'set-site-setting', {
    key,
    value,
  });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to set site setting');
  }
};
