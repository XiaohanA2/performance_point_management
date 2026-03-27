/**
 * 用户管理相关Actions
 */

// 新增用户
async function addUser(payload) {
  const { phone } = payload;
  const db = uniCloud.database();
  const _ = db.command;

  const exists = await db.collection('users').where({ phone }).count();
  if (exists.total > 0) throw new Error('手机号已存在');

  const doc = {
    _id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: payload.name,
    branch: payload.branch,
    phone: payload.phone,
    password: payload.password || '123456',
    role: payload.role || 'manager',
    status: payload.status || 'active',
    createdAt: Date.now()
  };

  await db.collection('users').add(doc);

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return doc;
}

// 更新用户
async function updateUser(payload) {
  const { id, updates } = payload;
  const db = uniCloud.database();
  const _ = db.command;

  if (!id) throw new Error('缺少用户ID');

  if (updates?.phone) {
    const exists = await db.collection('users')
      .where({ phone: updates.phone, _id: _.neq(id) })
      .count();
    if (exists.total > 0) throw new Error('手机号已存在');
  }

  await db.collection('users').doc(id).update({
    ...updates,
    updatedAt: Date.now()
  });

  const { data } = await db.collection('users').doc(id).get();

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return data[0];
}

// 切换用户状态
async function toggleUserStatus({ id }) {
  if (!id) throw new Error('缺少用户ID');

  const db = uniCloud.database();
  const { data } = await db.collection('users').doc(id).get();
  if (!data.length) throw new Error('用户不存在');

  const nextStatus = data[0].status === 'active' ? 'disabled' : 'active';

  await db.collection('users').doc(id).update({
    status: nextStatus,
    updatedAt: Date.now()
  });

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { ...data[0], status: nextStatus };
}

// 重置密码
async function resetPassword({ id, password = '123456' }) {
  if (!id) throw new Error('缺少用户ID');

  const db = uniCloud.database();

  await db.collection('users').doc(id).update({
    password,
    updatedAt: Date.now()
  });

  return true;
}

// 修改密码
async function changePassword({ id, oldPassword, newPassword }) {
  if (!id || !newPassword) throw new Error('信息不完整');

  const db = uniCloud.database();
  const { data } = await db.collection('users').doc(id).get();
  if (!data.length) throw new Error('用户不存在');

  if (data[0].password !== oldPassword) throw new Error('原密码错误');

  await db.collection('users').doc(id).update({
    password: newPassword,
    updatedAt: Date.now()
  });

  return true;
}

// 密码登录
async function loginWithPassword(payload) {
  const { phone, password } = payload;
  const db = uniCloud.database();
  const userRes = await db.collection('users').where({ phone, password, status: 'active' }).get();

  if (!userRes.data.length) throw new Error('账号或密码错误');

  // 移除密码字段
  const { password: _, ...user } = userRes.data[0];

  return {
    user,
    isDefaultPassword: password === '123456'
  };
}

// 验证码登录
async function loginWithCode(payload) {
  const { phone, code } = payload;
  const db = uniCloud.database();

  // 验证短信验证码
  const { result } = await uniCloud.callFunction({
    name: 'appService',
    data: {
      action: 'verifySmsCode',
      payload: { phone, code }
    }
  });

  if (result.error) throw new Error(result.error);

  const userRes = await db.collection('users').where({ phone, status: 'active' }).get();
  if (!userRes.data.length) throw new Error('用户不存在或已停用');

  // 移除密码字段
  const { password: _, ...user } = userRes.data[0];

  return user;
}

// 生成短信验证码
async function generateSmsCode(payload) {
  const { phone } = payload;
  if (!phone) throw new Error('手机号不能为空');

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const db = uniCloud.database();

  await db.collection('sms_codes').doc(phone).set({
    code,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  return { code };
}

// 检查是否使用默认密码
async function checkDefaultPassword(payload) {
  const { userId } = payload;
  if (!userId) throw new Error('缺少用户ID');

  const db = uniCloud.database();
  const { data } = await db.collection('users').doc(userId).get();
  if (!data.length) throw new Error('用户不存在');

  return { isDefaultPassword: data[0].password === '123456' };
}

// 导出所有用户管理actions
module.exports = {
  addUser,
  updateUser,
  toggleUserStatus,
  resetPassword,
  changePassword,
  loginWithPassword,
  loginWithCode,
  generateSmsCode,
  checkDefaultPassword
};
