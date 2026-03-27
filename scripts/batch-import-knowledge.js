/**
 * 批量导入知识库数据到云数据库
 *
 * 使用方法：
 * 1. 确保已登录uniCloud控制台
 * 2. 在云函数中临时添加此代码
 * 3. 运行云函数触发导入
 */

const importKnowledgeBase = async () => {
  const db = uniCloud.database();

  // 读取已生成的数据
  const importData = require('./docs/knowledge-base-import-data.json');

  console.log('开始导入', importData.length, '条知识库数据...\n');

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < importData.length; i++) {
    const item = importData[i];

    try {
      // 检查是否已存在
      const { data: existing } = await db.collection('knowledge_base')
        .where({ title: item.title })
        .count();

      if (existing.total > 0) {
        console.log(`${i + 1}. 跳过: ${item.title} (已存在)`);
        skipCount++;
        continue;
      }

      // 插入数据
      await db.collection('knowledge_base').add(item);
      console.log(`${i + 1}. 成功: ${item.title}`);
      successCount++;

    } catch (error) {
      console.error(`${i + 1}. 失败: ${item.title}`, error.message);
    }
  }

  console.log(`\n导入完成！`);
  console.log(`成功: ${successCount}条`);
  console.log(`跳过: ${skipCount}条`);
  console.log(`失败: ${importData.length - successCount - skipCount}条`);

  return {
    success: true,
    total: importData.length,
    successCount,
    skipCount
  };
};

// 导出供云函数使用
module.exports = { importKnowledgeBase };
