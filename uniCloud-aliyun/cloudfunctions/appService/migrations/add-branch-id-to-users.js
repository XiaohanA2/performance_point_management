/**
 * 数据迁移：给用户表添加 branchId 字段
 * 执行方式：在云函数中调用 migrateBranchId()
 */

async function migrateBranchId() {
  const db = uniCloud.database();
  const _ = db.command;

  console.log('=== 开始迁移：添加 branchId 到用户表 ===');

  try {
    // 1. 获取所有支行
    const branchesRes = await db.collection('branches').get();
    const branches = branchesRes.data;
    console.log(`找到 ${branches.length} 个支行`);

    // 2. 创建支行名称到ID的映射
    const branchNameToId = {};
    branches.forEach(branch => {
      branchNameToId[branch.name] = branch.id;
    });

    // 3. 获取所有用户
    const usersRes = await db.collection('users').get();
    const users = usersRes.data;
    console.log(`找到 ${users.length} 个用户`);

    // 4. 批量更新用户的 branchId
    let successCount = 0;
    let failCount = 0;
    const failedUsers = [];

    for (const user of users) {
      try {
        const branchId = branchNameToId[user.branch];

        if (!branchId) {
          console.warn(`用户 ${user.name}(${user._id}) 的支行 "${user.branch}" 不存在`);
          failCount++;
          failedUsers.push({ userId: user._id, name: user.name, branch: user.branch });
          continue;
        }

        await db.collection('users').doc(user._id).update({
          branchId: branchId
        });

        successCount++;
        if (successCount % 10 === 0) {
          console.log(`已处理 ${successCount} 个用户...`);
        }
      } catch (error) {
        console.error(`更新用户 ${user.name}(${user._id}) 失败:`, error);
        failCount++;
        failedUsers.push({ userId: user._id, name: user.name, error: error.message });
      }
    }

    console.log('=== 迁移完成 ===');
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);

    if (failedUsers.length > 0) {
      console.log('失败的用户:', JSON.stringify(failedUsers, null, 2));
    }

    return {
      success: true,
      total: users.length,
      successCount,
      failCount,
      failedUsers
    };

  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  }
}

module.exports = { migrateBranchId };
