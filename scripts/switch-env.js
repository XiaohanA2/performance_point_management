#!/usr/bin/env node

/**
 * 环境切换工具
 *
 * 用途: 在生产环境和测试环境之间切换
 * 使用方法:
 *   node scripts/switch-env.js test      # 切换到测试环境
 *   node scripts/switch-env.js prod      # 切换到生产环境
 *   node scripts/switch-env.js status    # 查看当前环境
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PROD = 'manifest.json';
const MANIFEST_TEST = 'manifest.test.json';
const BACKUP_SUFFIX = '.backup';

// 生产环境配置
const PROD_CONFIG = {
  spaceId: 'mp-5dcdd8dc-dc18-4559-9b2f-3c5e006c35b1',
  clientSecret: '8xsA/WX+h56zRsZ3dONlfA==',
  envName: 'production'
};

// 读取JSON文件（支持UniApp的注释格式）
function readJSON(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // 移除UniApp manifest.json中的注释（/* ... */）
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');

    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 读取文件失败: ${filePath}`);
    console.error(error.message);
    return null;
  }
}

// 写入JSON文件（保持UniApp格式）
function writeJSON(filePath, data) {
  try {
    // 2空格缩进，使用UniApp的冒号格式
    const content = JSON.stringify(data, null, 2)
      .replace(/": /g, '" : ');  // UniApp使用 ": 而不是":

    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ 写入文件失败: ${filePath}`);
    console.error(error.message);
    return false;
  }
}

// 备份文件
function backupFile(filePath) {
  const backupPath = filePath + BACKUP_SUFFIX;
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ 已备份: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`❌ 备份失败: ${filePath}`);
    return false;
  }
}

// 恢复备份
function restoreBackup(filePath) {
  const backupPath = filePath + BACKUP_SUFFIX;
  if (!fs.existsSync(backupPath)) {
    console.log(`⚠️  备份文件不存在: ${backupPath}`);
    return false;
  }

  try {
    fs.copyFileSync(backupPath, filePath);
    console.log(`✅ 已恢复备份: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ 恢复备份失败: ${filePath}`);
    return false;
  }
}

// 获取当前环境
function getCurrentEnvironment() {
  const manifest = readJSON(MANIFEST_PROD);
  if (!manifest) return null;

  const currentSpaceId = manifest.uniCloud?.spaceId;

  if (currentSpaceId === PROD_CONFIG.spaceId) {
    return 'production';
  } else if (currentSpaceId && currentSpaceId.startsWith('mp-')) {
    return 'test';
  }

  return 'unknown';
}

// 切换到测试环境
function switchToTest() {
  console.log('\n🔄 正在切换到测试环境...\n');

  // 1. 检查当前环境
  const currentEnv = getCurrentEnvironment();
  if (currentEnv === 'test') {
    console.log('✅ 当前已经是测试环境，无需切换');
    return true;
  }

  // 2. 备份当前manifest
  if (!backupFile(MANIFEST_PROD)) {
    return false;
  }

  // 3. 检查测试环境manifest是否存在
  const testManifest = readJSON(MANIFEST_TEST);
  if (!testManifest) {
    console.error('\n❌ 测试环境配置文件不存在: ' + MANIFEST_TEST);
    console.error('请先创建测试环境配置文件:\n');
    console.error('1. 在uniCloud控制台创建测试空间');
    console.error('2. 复制 manifest.json 为 manifest.test.json');
    console.error('3. 修改 manifest.test.json 中的 spaceId 为测试空间ID\n');
    return false;
  }

  // 4. 读取当前manifest
  const currentManifest = readJSON(MANIFEST_PROD);
  if (!currentManifest) return false;

  // 5. 更新uniCloud配置为测试环境
  currentManifest.uniCloud = testManifest.uniCloud;
  currentManifest.mpWeixin = currentManifest.mpWeixin || {};
  currentManifest.mpWeixin.setting = currentManifest.mpWeixin.setting || {};
  currentManifest.mpWeixin.setting.urlCheck = false; // 测试环境关闭域名校验

  // 6. 写入更新后的manifest
  if (!writeJSON(MANIFEST_PROD, currentManifest)) {
    console.error('\n❌ 更新manifest.json失败');
    return false;
  }

  console.log('\n✅ 成功切换到测试环境');
  console.log('\n📋 后续步骤:');
  console.log('   1. 在HBuilderX中重新上传云函数');
  console.log('   2. 运行小程序，验证连接到测试空间');
  console.log('   3. 初始化测试数据（如果需要）\n');

  return true;
}

// 切换到生产环境
function switchToProd() {
  console.log('\n🔄 正在切换到生产环境...\n');

  // 1. 检查当前环境
  const currentEnv = getCurrentEnvironment();
  if (currentEnv === 'production') {
    console.log('✅ 当前已经是生产环境，无需切换');
    return true;
  }

  // 2. 警告提示
  console.log('⚠️  警告: 即将切换到生产环境！');
  console.log('   请确保:');
  console.log('   - 所有测试已完成');
  console.log('   - 代码已审核通过');
  console.log('   - 已准备好上线\n');

  // 3. 检查备份是否存在
  const backupPath = MANIFEST_PROD + BACKUP_SUFFIX;
  if (!fs.existsSync(backupPath)) {
    console.error('❌ 生产环境备份文件不存在，无法切换');
    console.error('   备份文件路径: ' + backupPath);
    return false;
  }

  // 4. 恢复生产环境配置
  if (!restoreBackup(MANIFEST_PROD)) {
    return false;
  }

  console.log('\n✅ 成功切换到生产环境');
  console.log('\n📋 后续步骤:');
  console.log('   1. 在HBuilderX中重新上传云函数到生产空间');
  console.log('   2. 运行小程序，验证连接到生产空间');
  console.log('   3. 进行冒烟测试');
  console.log('   4. 提交审核\n');

  return true;
}

// 显示当前环境状态
function showStatus() {
  console.log('\n📊 当前环境状态\n');

  const currentEnv = getCurrentEnvironment();
  const manifest = readJSON(MANIFEST_PROD);

  if (!manifest) {
    console.error('❌ 无法读取 manifest.json');
    return false;
  }

  const spaceId = manifest.uniCloud?.spaceId || '未配置';
  const appid = manifest.mpWeixin?.appid || '未配置';

  console.log('环境类型:', currentEnv === 'production' ? '🔴 生产环境' :
               currentEnv === 'test' ? '🟢 测试环境' : '⚪ 未知环境');
  console.log('空间ID:', spaceId);
  console.log('小程序AppID:', appid);
  console.log('');

  // 检查备份
  const backupPath = MANIFEST_PROD + BACKUP_SUFFIX;
  if (fs.existsSync(backupPath)) {
    console.log('✅ 配置备份存在:', backupPath);
  } else {
    console.log('⚠️  配置备份不存在');
  }

  // 检查测试环境配置
  if (fs.existsSync(MANIFEST_TEST)) {
    console.log('✅ 测试环境配置存在:', MANIFEST_TEST);
    const testManifest = readJSON(MANIFEST_TEST);
    if (testManifest) {
      console.log('   测试空间ID:', testManifest.uniCloud?.spaceId || '未配置');
    }
  } else {
    console.log('⚠️  测试环境配置不存在:', MANIFEST_TEST);
  }

  console.log('');
  return true;
}

// 主函数
function main() {
  const command = process.argv[2];

  switch (command) {
    case 'test':
      switchToTest();
      break;

    case 'prod':
    case 'production':
      switchToProd();
      break;

    case 'status':
      showStatus();
      break;

    default:
      console.log('\n环境切换工具\n');
      console.log('使用方法:');
      console.log('  node scripts/switch-env.js test      # 切换到测试环境');
      console.log('  node scripts/switch-env.js prod      # 切换到生产环境');
      console.log('  node scripts/switch-env.js status    # 查看当前环境\n');
      console.log('示例:');
      console.log('  node scripts/switch-env.js status    # 先查看当前状态');
      console.log('  node scripts/switch-env.js test      # 切换到测试环境开发\n');
      break;
  }
}

// 运行
main();
