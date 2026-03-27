/**
 * 个金业务数据迁移脚本
 * 清空旧的 pf_tasks 数据，插入对齐 Excel 的正确配置
 *
 * 使用方式：在 uniCloud 云函数中调用 action: 'migratePFTasks'
 * 或直接在 HBuilderX 云函数调试中运行
 */

const { DEFAULT_PF_TASKS } = require('./constants/pf-default-tasks.js');

async function migratePFTasks() {
  const db = uniCloud.database();
  const collection = db.collection('pf_tasks');

  // 1. 清空旧数据
  const oldData = await collection.get();
  if (oldData.data && oldData.data.length > 0) {
    await Promise.all(oldData.data.map(item => collection.doc(item._id).remove()));
    console.log(`已删除 ${oldData.data.length} 条旧任务数据`);
  }

  // 2. 插入新数据
  for (const task of DEFAULT_PF_TASKS) {
    await collection.add({
      ...task,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  console.log(`已插入 ${DEFAULT_PF_TASKS.length} 条新任务数据`);
  return {
    deleted: oldData.data ? oldData.data.length : 0,
    inserted: DEFAULT_PF_TASKS.length,
    tasks: DEFAULT_PF_TASKS.map(t => ({ taskId: t.taskId, taskName: t.taskName, category: t.category }))
  };
}

module.exports = { migratePFTasks };
