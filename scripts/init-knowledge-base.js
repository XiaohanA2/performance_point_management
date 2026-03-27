/**
 * 知识库集合初始化和导入脚本
 *
 * 用途：在uniCloud云函数中运行，自动创建knowledge_base集合并导入35条数据
 *
 * 使用步骤：
 * 1. 在uniCloud Web控制台的云函数中打开appService
 * 2. 在exports.main函数的switch语句之前添加以下临时代码：
 * 3. 上传并运行云函数
 */

// ========== 临时导入代码开始 ==========

// 在appService/index.js的exports.main之前添加此函数
async function initKnowledgeBase() {
  const db = uniCloud.database();

  console.log('🔄 开始初始化知识库...');

  // 1. 创建测试数据（可选，用于测试）
  const testData = {
    _id: 'knowledge_test_001',
    title: '如何使用知识库',
    category: '使用指南',
    keywords: ['知识库', '使用', '帮助'],
    content: `
**欢迎使用知识库！**

本知识库包含35个常见业务错误案例，帮助您快速查询和解决问题。

**使用方法：**
1. 点击"工作台"页面右上角的"知识库"按钮
2. 在搜索框输入关键词（如：白名单、授信、流水等）
3. 或点击分类标签筛选
4. 点击任意条目查看详细内容

**数据来源：**
个贷知识库-错题本.md
    `.trim(),
    priority: 10,
    status: 'published',
    views: 0,
    attachments: [],
    createdBy: 'system',
    updatedBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // 2. 插入测试数据
  try {
    await db.collection('knowledge_base').add(testData);
    console.log('✅ 测试数据插入成功');
  } catch (error) {
    if (error.message.includes('duplicate')) {
      console.log('⚠️  测试数据已存在，跳过');
    } else {
      console.error('❌ 插入测试数据失败:', error.message);
    }
  }

  // 3. 批量导入35个错误案例
  const importData = require('../../../../docs/knowledge-base-import-data.json');

  let successCount = 0;
  let skipCount = 0;

  for (const item of importData) {
    try {
      // 检查是否已存在
      const { total } = await db.collection('knowledge_base')
        .where({ title: item.title })
        .count();

      if (total > 0) {
        skipCount++;
        continue;
      }

      // 插入数据
      await db.collection('knowledge_base').add(item);
      successCount++;

      if (successCount % 5 === 0) {
        console.log(`进度: ${successCount}/${importData.length}`);
      }

    } catch (error) {
      if (error.message.includes('duplicate')) {
        skipCount++;
      } else {
        console.error(`❌ 导入失败: ${item.title}`, error.message);
      }
    }
  }

  console.log('\n✅ 知识库初始化完成！');
  console.log(`   成功导入: ${successCount}条`);
  console.log(`   跳过: ${skipCount}条`);
  console.log(`   总计: ${importData.length + 1}条（含测试数据）`);

  return {
    success: true,
    total: importData.length + 1,
    successCount,
    skipCount
  };
}

// ========== 临时导入代码结束 ==========

// 在exports.main的switch语句中添加：
case 'initKnowledgeBase':
  data = await initKnowledgeBase();
  break;

// 然后在HBuilderX控制台或前端调用：
// uniCloud.callFunction({
//   name: 'appService',
//   data: { action: 'initKnowledgeBase' }
// });

module.exports = { initKnowledgeBase };
