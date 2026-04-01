/**
 * 个金业务系统 - 服务层
 * 封装个金业务相关的API调用
 */

import { StoreService } from './store.js';

function getCurrentUser() {
  const user = StoreService.getCurrentUser();
  if (!user || user.role === 'guest') throw new Error('未登录');
  return user;
}

// 内存缓存
const cache = {
  tasks: null,           // 任务列表（长期，手动失效）
  rankings: {},          // { period: { data, ts } }
  submissions: {},       // { `${userId}_${period}`: { data, ts } }
  monthlyStats: {},      // { `${userId}_${period}`: { data, ts } }
};
const RANKINGS_TTL = 60 * 1000;      // 1分钟
const SUBMISSIONS_TTL = 30 * 1000;   // 30秒
const STATS_TTL = 30 * 1000;

function invalidateWriteCache(userId, period) {
  // 失效该用户所有 submissions 和 monthlyStats 缓存
  const userIdStr = String(userId);
  Object.keys(cache.submissions).forEach(k => { if (k.startsWith(userIdStr)) delete cache.submissions[k]; });
  Object.keys(cache.monthlyStats).forEach(k => { if (k.startsWith(userIdStr)) delete cache.monthlyStats[k]; });
  // 失效对应 period 的排名缓存
  if (period) delete cache.rankings[period];
  else Object.keys(cache.rankings).forEach(k => delete cache.rankings[k]);
}

/**
 * 清除所有缓存
 */
export function invalidateAllCache() {
  cache.tasks = null;
  cache.rankings = {};
  cache.submissions = {};
  cache.monthlyStats = {};
}

/**
 * 清除任务缓存（业务配置变更时调用）
 */
export function invalidateTasksCache() {
  cache.tasks = null;
}

async function callApi(action, payload = {}) {
  const result = await uniCloud.callFunction({ name: 'appService', data: { action, payload } });
  if (result.result.error) throw new Error(result.result.error);
  return result.result.data;
}

/**
 * 获取业务配置列表
 * @param {Object} params - 查询参数
 * @param {String} params.category - 业务类型: required/bonus
 * @param {Boolean} params.isActive - 是否启用
 * @returns {Promise<Array>}
 */
export async function getPFTasks(params = {}) {
  // 管理后台获取所有业务时不走缓存
  if (params.isActive === undefined) {
    return callApi('getPFTasks', params);
  }
  // 工作台获取启用业务时走缓存
  if (cache.tasks) return cache.tasks;
  const data = await callApi('getPFTasks', params);
  cache.tasks = data;
  return data;
}

export async function getPFMonthlyStats(userId, period) {
  const key = `${userId}_${period}`;
  const hit = cache.monthlyStats[key];
  if (hit && Date.now() - hit.ts < STATS_TTL) return hit.data;
  const data = await callApi('getPFMonthlyStats', { userId, period });
  cache.monthlyStats[key] = { data, ts: Date.now() };
  return data;
}

export async function submitPFRecord(data) {
  const user = getCurrentUser();
  const result = await callApi('submitPFRecord', { ...data, user });
  invalidateWriteCache(user.id || user._id, data.period || data.date?.substring(0, 7));
  return result;
}

export async function getPFSubmissions(params = {}) {
  const key = `${params.userId}_${params.period || ''}`;
  const hit = cache.submissions[key];
  if (hit && Date.now() - hit.ts < SUBMISSIONS_TTL) return hit.data;
  const data = await callApi('getPFSubmissions', params);
  cache.submissions[key] = { data, ts: Date.now() };
  return data;
}

export async function updatePFSubmission(submissionId, value) {
  const user = getCurrentUser();
  const result = await callApi('updatePFSubmission', { submissionId, value, userId: user.id });
  // 清除当前用户和被修改用户的缓存
  invalidateWriteCache(user.id || user._id);
  if (result.affectedUserId) {
    invalidateWriteCache(result.affectedUserId);
  }
  return result;
}

export async function deletePFSubmission(submissionId) {
  const user = getCurrentUser();
  const result = await callApi('deletePFSubmission', { submissionId, user });
  // 清除当前用户和被删除记录用户的缓存
  invalidateWriteCache(user.id || user._id);
  if (result.affectedUserId) {
    invalidateWriteCache(result.affectedUserId);
  }
  return result;
}

export async function getPFRankings(period, limit = 100) {
  const hit = cache.rankings[period];
  if (hit && Date.now() - hit.ts < RANKINGS_TTL) return hit.data;
  const data = await callApi('getPFRankings', { period, limit });
  cache.rankings[period] = { data, ts: Date.now() };
  return data;
}

export async function getPFSettings() {
  return callApi('getPFSettings', {});
}

export async function updatePFSettings(settings) {
  const user = getCurrentUser();
  return callApi('updatePFSettings', { settings, user });
}

export async function getAllPFSubmissions(period) {
  return callApi('getAllPFSubmissions', { period });
}

export async function getEmployeeTasks(employeeId, period) {
  return callApi('getEmployeeTasks', { employeeId, period });
}

/**
 * 获取当前月度周期
 * @returns {String} 格式: "2026-03"
 */
export function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 格式化月度周期显示
 * @param {String} period - 月度周期，如"2026-03"
 * @returns {String} 格式: "2026年3月"
 */
export function formatPeriod(period) {
  if (!period) return '';
  const [year, month] = period.split('-');
  return `${year}年${parseInt(month)}月`;
}
