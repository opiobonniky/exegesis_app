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
  displayDate: string;
  displayTime?: string;
  reflection?: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard API
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminDashboardStats = async (): Promise<DashboardStats> => {
  const response = await sendPostRequest<DashboardStats>('admin', 'get-admin-dashboard-stats', {});
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch dashboard stats');
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
  const response = await sendPostRequest<UsersResponse>('admin', 'get-users-by-admin', {
    search: search || null,
    page,
    pageSize,
  });
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
    throw new Error(response.returnMessage || 'Failed to toggle user verification');
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
  const response = await sendPostRequest<ActivityResponse>('admin', 'get-all-activity', {
    page,
    pageSize,
    ...filters,
  });
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
  const response = await sendPostRequest<ActivityResponse>('admin', 'get-user-activity', {
    username,
    page,
    pageSize,
  });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to fetch user activity');
  }
  return response.returnData as ActivityResponse;
};

export const deleteActivityByAdmin = async (activityId: number): Promise<void> => {
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
): Promise<DailyVerse> => {
  const response = await sendPostRequest<DailyVerse>('admin', 'add-daily-verse', {
    id,
    ...verseData,
  });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to add daily verse');
  }
  return response.returnData as DailyVerse;
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
// Reading Plans API
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

export const createReadingPlan = async (
  planData: {
    title: string;
    description?: string;
    totalDays: number;
    questionsEnabled?: boolean;
    category?: string;
    difficulty?: string;
    isActive?: boolean;
  },
): Promise<ReadingPlan> => {
  const response = await sendPostRequest<ReadingPlan>('reading-plans', 'create', planData);
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
  const response = await sendPostRequest<ReadingPlan>('reading-plans', 'update', {
    planId,
    ...planData,
  });
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
): Promise<{ returnCode: number; returnData?: Assignment; returnMessage?: string }> => {
  const response = await sendPostRequest<Assignment>('reading-plans', 'daily-assignment', {
    planId,
    dayNumber,
  });
  return response;
};

export const addAssignment = async (
  assignmentData: {
    planId: string;
    dayNumber: number;
    title: string;
    chapters: { book: string; chapter: number }[];
    reflectionQuestions?: string[];
    assignmentId?: number;
  },
): Promise<{ returnCode: number; returnData?: Assignment; returnMessage?: string }> => {
  const response = await sendPostRequest<Assignment>('reading-plans', 'add-assignment', assignmentData);
  return response;
};

export const getPlanQuizQuestions = async (
  planId: string,
  dayNumber: number,
): Promise<{ returnCode: number; returnData?: any[]; returnMessage?: string }> => {
  const response = await sendPostRequest<any[]>('reading-plans', 'quiz-questions', {
    planId,
    dayNumber,
  });
  return response;
};

export const addQuizQuestions = async (
  quizData: {
    planId: string;
    dayNumber: number;
    questions: {
      question: string;
      options: [string, string, string, string];
      correctAnswer: number;
      explanation: string;
    }[];
  },
): Promise<{ returnCode: number; returnData?: any[]; returnMessage?: string }> => {
  const response = await sendPostRequest('reading-plans', 'add-quiz-questions', quizData);
  return response;
};

export const deleteQuizQuestion = async (questionId: number): Promise<void> => {
  const response = await sendPostRequest('reading-plans', 'delete-quiz-question', { questionId });
  if (response.returnCode !== 200) {
    throw new Error(response.returnMessage || 'Failed to delete quiz question');
  }
};