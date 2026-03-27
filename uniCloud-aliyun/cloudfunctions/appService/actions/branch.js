/**
 * 支行管理相关Actions
 */

// 新增支行
async function addBranch(payload) {
  const { id, name } = payload;
  const db = uniCloud.database();

  if (!id || !name) throw new Error('支行编号和名称不能为空');

  const exists = await db.collection('branches')
    .where(db.command.or([{ id }, { name }]))
    .count();

  if (exists.total > 0) throw new Error('支行编号或名称已存在');

  await db.collection('branches').add({
    id,
    name,
    createdAt: Date.now()
  });

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { id, name };
}

// 更新支行
async function updateBranch(payload) {
  const { id, updates } = payload;
  const db = uniCloud.database();
  const _ = db.command;

  if (!id) throw new Error('缺少支行编号');

  const { data } = await db.collection('branches').where({ id }).get();
  if (!data.length) throw new Error('支行不存在');

  const nextId = updates?.id || id;
  const nextName = updates?.name || data[0].name;

  if (nextId !== id || nextName !== data[0].name) {
    const exists = await db.collection('branches')
      .where(db.command.or([{ id: nextId }, { name: nextName }]))
      .where({ id: _.neq(id) })
      .count();

    if (exists.total > 0) throw new Error('支行编号或名称已存在');
  }

  await db.collection('branches').where({ id }).update({
    id: nextId,
    name: nextName,
    updatedAt: Date.now()
  });

  await db.collection('users').where({ branch: data[0].name }).update({
    branch: nextName
  });

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { id: nextId, name: nextName };
}

// 删除支行
async function deleteBranch({ id }) {
  if (!id) throw new Error('缺少支行编号');

  const db = uniCloud.database();

  const branchRes = await db.collection('branches').where({ id }).get();
  if (!branchRes.data.length) throw new Error('支行不存在');

  const usersRes = await db.collection('users')
    .where({ branch: branchRes.data[0].name })
    .count();

  if (usersRes.total > 0) throw new Error('该支行仍有关联用户，请先调整所属支行');

  await db.collection('branches').where({ id }).remove();

  // 清除缓存
  const clearCache = require('./index.js').clearCache;
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return true;
}

// 导出所有支行管理actions
module.exports = {
  addBranch,
  updateBranch,
  deleteBranch
};
