import { setPlanCache, getPlanCache } from '../../services/dbCache';

export async function cacheAllPlans(data: any): Promise<void> {
  await setPlanCache('rp_all_plans', data, undefined, 'plan_list');
}

export async function getCachedAllPlans(): Promise<any | null> {
  return getPlanCache('rp_all_plans');
}

export async function cacheUserPlans(data: any): Promise<void> {
  await setPlanCache('rp_user_plans', data, undefined, 'plan_list');
}

export async function getCachedUserPlans(): Promise<any | null> {
  return getPlanCache('rp_user_plans');
}

export async function cachePlanDetail(planId: string, data: any): Promise<void> {
  await setPlanCache(`rp_detail_${planId}`, data, planId, 'plan_detail');
}

export async function getCachedPlanDetail(planId: string): Promise<any | null> {
  return getPlanCache(`rp_detail_${planId}`);
}

export async function cacheAssignments(planId: string, data: any): Promise<void> {
  await setPlanCache(`rp_assignments_${planId}`, data, planId, 'assignments');
}

export async function getCachedAssignments(planId: string): Promise<any | null> {
  return getPlanCache(`rp_assignments_${planId}`);
}

export async function cacheDailyAssignment(planId: string, day: number, data: any): Promise<void> {
  await setPlanCache(`rp_daily_${planId}_${day}`, data, planId, 'daily_assignment');
}

export async function getCachedDailyAssignment(planId: string, day: number): Promise<any | null> {
  return getPlanCache(`rp_daily_${planId}_${day}`);
}
