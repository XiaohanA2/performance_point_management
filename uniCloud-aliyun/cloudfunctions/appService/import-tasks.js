/**
 * 批量导入员工任务配置
 */

async function importEmployeeTasks({ startIndex = 0, batchSize = 50 } = {}) {
  const db = uniCloud.database();
  const period = '2026-03';

  // 直接require JSON文件
  const allTasksData = require('./tasks_import.json');
  const tasksData = allTasksData.slice(startIndex, startIndex + batchSize);

  // 第一批时先清空旧数据
  if (startIndex === 0) {
    const collection = db.collection('pf_employee_tasks');
    let cleared = 0;
    while (true) {
      const res = await collection.where({ period }).limit(100).get();
      if (!res.data || res.data.length === 0) break;
      for (const doc of res.data) {
        await collection.doc(doc._id).remove();
      }
      cleared += res.data.length;
    }
    console.log(`已清除旧数据 ${cleared} 条`);
  }

  console.log(`开始导入第${startIndex}~${startIndex + tasksData.length - 1}条（共${allTasksData.length}条）...`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < tasksData.length; i++) {
    const item = tasksData[i];
    try {
      // 根据姓名和支行查找用户
      const userRes = await db.collection('users')
        .where({
          name: item.name,
          branch: item.branch,
          role: item.role,
          status: 'active'
        })
        .limit(1)
        .get();

      if (!userRes.data || userRes.data.length === 0) {
        errors.push(`未找到用户: ${item.name} (${item.branch}, ${item.role})`);
        errorCount++;
        continue;
      }

      const userId = userRes.data[0]._id;

      // 检查是否已存在
      const existing = await db.collection('pf_employee_tasks')
        .where({ employeeId: userId, taskId: item.taskId, period })
        .get();

      if (existing.data && existing.data.length > 0) {
        await db.collection('pf_employee_tasks')
          .doc(existing.data[0]._id)
          .update({ target: item.target, updatedAt: Date.now() });
      } else {
        await db.collection('pf_employee_tasks').add({
          employeeId: userId,
          taskId: item.taskId,
          target: item.target,
          period,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      successCount++;

      // 每处理50条输出一次进度
      if ((i + 1) % 50 === 0) {
        console.log(`已处理 ${i + 1}/${tasksData.length} 条`);
      }
    } catch (error) {
      const errMsg = `${item.name} - ${item.taskId}: ${error.message}`;
      console.log(`错误: ${errMsg}`);
      errors.push(errMsg);
      errorCount++;
    }
  }

  console.log(`导入完成: 成功 ${successCount} 条, 失败 ${errorCount} 条`);
  if (errors.length > 0) {
    console.log('错误详情:', errors.slice(0, 10));
  }

  return {
    success: successCount,
    error: errorCount,
    errors: errors.slice(0, 10),
    startIndex,
    endIndex: startIndex + tasksData.length,
    total: allTasksData.length,
    hasMore: startIndex + tasksData.length < allTasksData.length
  };
}

module.exports = { importEmployeeTasks };
