/**
 * 个金员工任务配置服务
 */
import { StoreService } from './store.js';

/**
 * 获取员工列表
 */
export async function getEmployees(branchId, role) {
  const user = StoreService.getCurrentUser();
  const res = await uniCloud.callFunction({
    name: 'appService',
    data: { action: 'getEmployees', payload: { branchId, role, user } }
  });
  if (res.result.error) throw new Error(res.result.error);
  return res.result.data;
}

/**
 * 保存单个员工任务配置
 */
export async function saveEmployeeTask(employeeId, taskId, target, period) {
  const user = StoreService.getCurrentUser();
  const res = await uniCloud.callFunction({
    name: 'appService',
    data: { action: 'saveEmployeeTask', payload: { employeeId, taskId, target, period, user } }
  });
  if (res.result.error) throw new Error(res.result.error);
  return res.result.data;
}

/**
 * 获取员工任务配置
 */
export async function getEmployeeTasks(period, employeeId, taskId) {
  const user = StoreService.getCurrentUser();
  const res = await uniCloud.callFunction({
    name: 'appService',
    data: { action: 'getEmployeeTasks', payload: { period, employeeId, taskId, user } }
  });
  if (res.result.error) throw new Error(res.result.error);
  return res.result.data;
}

/**
 * 批量保存员工任务配置
 */
export async function batchSaveEmployeeTasks(tasks) {
  const user = StoreService.getCurrentUser();
  const res = await uniCloud.callFunction({
    name: 'appService',
    data: { action: 'batchSaveEmployeeTasks', payload: { tasks, user } }
  });
  if (res.result.error) throw new Error(res.result.error);
  return res.result.data;
}
