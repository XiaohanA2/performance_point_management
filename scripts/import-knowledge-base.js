/**
 * 知识库导入脚本
 *
 * 将"个贷知识库-错题本.md"中的35个错误案例导入到知识库
 */

const fs = require('fs');
const path = require('path');

// 读取并解析错题本文件
function parseErrorCases(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const cases = [];
  let currentCase = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 匹配错误标题（错误一、错误二...问题十八等）
    const match = line.match(/^(错误|问题)(\d+|[一二三四五六七八九十]+)[：:](.*)/);

    if (match) {
      // 保存上一个案例
      if (currentCase) {
        cases.push(currentCase);
      }

      // 创建新案例
      const num = convertChineseNumber(match[2]);
      currentCase = {
        category: '错题本',
        keywords: ['个贷', '错误案例', `错误${num}`],
        content: '',
        error: match[3].trim(),
        requirement: '',
        priority: 5
      };
    } else if (line.startsWith('管理要求：')) {
      if (currentCase) {
        currentCase.requirement = line.replace('管理要求：', '').trim();
      }
    } else if (line && currentCase) {
      // 继续添加内容
      currentCase.content += line + '\n';
    }
  }

  // 保存最后一个案例
  if (currentCase) {
    cases.push(currentCase);
  }

  return cases;
}

// 转换中文数字
function convertChineseNumber(chinese) {
  const map = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
    '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
    '二十一': 21, '二十二': 22, '二十三': 23, '二十四': 24, '二十五': 25,
    '二十六': 26, '二十七': 27, '二十八': 28, '二十九': 29, '三十': 30,
    '三十一': 31, '三十二': 32, '三十三': 33, '三十四': 34, '三十五': 35
  };
  return map[chinese] || parseInt(chinese) || chinese;
}

// 生成更概括的标题
function generateTitle(error, num) {
  // 提取错误描述的关键信息
  let keywords = '';

  // 常见关键词映射
  const keywordMap = {
    '白名单提交授信金额大于系统授信理论值': '白名单授信额度超限',
    '申请实施全额免扣减.*?一事一议申请报告': '免扣减缺少申请报告',
    '存量客户办理续贷申请实施免扣减额度政策.*?贷款额度超过原贷款额度': '续贷免扣减额度超限',
    '借款人为企业.*?股权占比不符合.*?准入条件': '借款人股权占比不符',
    '将农户随意挂靠在非其居住地.*?行政村': '农户挂靠非经营地建档',
    '个体工商户或小微企业存在经营异常情况': '客户经营异常未核实',
    '对FAS系统提示的异常信息未进一步核实说明': '系统异常信息未核实',
    '调查合影不规范': '调查合影不规范',
    'FSA系统中未规范录入商品房信息': '商品房信息录入不规范',
    '佐证材料缺失.*?未按FAS系统档案对应位置上传': '佐证材料缺失或上传不规范',
    '将其他人的资产认定为客户资产': '他人资产认定为客户资产',
    '对于无营业执照.*?未按规定提供相应的佐证': '无营业执照缺少佐证材料',
    '申请表.*?要素不规范或完整': '申请要素不规范',
    '银行流水未按规定提供并上传': '银行流水未按规定提供',
    '未婚.*?离异.*?丧偶.*?不在同一户口薄.*?录入关系人': '关系人录入不规范',
    '未按要求录入受托支付账号': '受托支付账号未录入',
    '营业执照.*?已过期': '营业执照过期未更新',
    '流水测算.*?不符合要求': '流水测算不符合要求'
  };

  // 尝试匹配关键词
  for (const [pattern, title] of Object.entries(keywordMap)) {
    const regex = new RegExp(pattern);
    if (regex.test(error)) {
      keywords = title;
      break;
    }
  }

  // 如果没有匹配到，使用截断的方法
  if (!keywords) {
    // 取错误描述的前15个字
    keywords = error.substring(0, 15);
    // 去掉句号等标点
    keywords = keywords.replace(/[，。、；：,.。;:]$/, '');
    // 如果被截断了，加上省略号
    if (error.length > 15) {
      keywords += '...';
    }
  }

  // 转换中文数字
  const numChinese = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
                      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                      '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十',
                      '三十一', '三十二', '三十三', '三十四', '三十五'][num - 1];

  return `错误${numChinese}：${keywords}`;
}

// 格式化为知识库内容
function formatContent(item) {
  return `
**错误描述：**
${item.error}

**管理要求：**
${item.requirement}

---
本内容来自"个贷知识库-错题本"，请严格按照管理要求执行。
  `.trim();
}

// 生成导入数据
function generateImportData(sourceFilePath) {
  const cases = parseErrorCases(sourceFilePath);

  return cases.map((item, index) => {
    // 生成关键词并合并
    const extraKeywords = generateKeywordsFromContent(item.error);
    const allKeywords = [...item.keywords, ...extraKeywords];

    return {
      _id: `knowledge_${Date.now()}_${index}`,
      title: generateTitle(item.error, index + 1),
      category: item.category,
      keywords: allKeywords,
      content: formatContent(item),
      priority: item.priority,
      status: 'published',
      views: 0,
      attachments: [],
      createdBy: 'system',
      updatedBy: 'system',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });
}

// 从内容中提取关键词
function generateKeywordsFromContent(text) {
  const keywords = [];

  // 提取关键词
  if (text.includes('白名单')) keywords.push('白名单');
  if (text.includes('授信')) keywords.push('授信');
  if (text.includes('免扣减')) keywords.push('免扣减');
  if (text.includes('FAS系统') || text.includes('FSA系统')) keywords.push('FAS系统');
  if (text.includes('营业执照')) keywords.push('营业执照');
  if (text.includes('流水')) keywords.push('银行流水');
  if (text.includes('房产')) keywords.push('房产');
  if (text.includes('婚姻')) keywords.push('婚姻状况');
  if (text.includes('农户贷款')) keywords.push('农户贷款');
  if (text.includes('专业大户贷')) keywords.push('专业大户贷');

  return keywords;
}

// 导出为JSON文件
function exportToJSON(outputPath, data) {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ 已导出 ${data.length} 条知识库数据到: ${outputPath}`);
}

// 生成uniCloud云函数调用格式
function exportToCloudFunctionFormat(outputPath, data) {
  const cloudFunctionData = data.map(item => ({
    action: 'createKnowledge',
    payload: {
      ...item,
      // 确保keywords是扁平数组
      keywords: Array.isArray(item.keywords) ? item.keywords.flat() : item.keywords
    }
  }));

  fs.writeFileSync(outputPath, JSON.stringify(cloudFunctionData, null, 2), 'utf8');
  console.log(`✅ 已导出云函数格式到: ${outputPath}`);
}

// 导出为uniCloud导入格式（每行一个JSON对象）
function exportToUniCloudImportFormat(outputPath, data) {
  // 每行一个独立的JSON对象，不是数组
  const lines = data.map(item => JSON.stringify(item));
  const content = lines.join('\n');

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`✅ 已导出uniCloud导入格式到: ${outputPath}`);
  console.log(`   格式：每行一个JSON对象（共${data.length}条）`);
}

// 主函数
function main() {
  const sourceFile = path.resolve(__dirname, '../个贷知识库-错题本.md');
  const outputFile = path.resolve(__dirname, '../docs/knowledge-base-import-data.json');
  const cloudFunctionFile = path.resolve(__dirname, '../docs/knowledge-base-cloud-function.json');
  const uniCloudImportFile = path.resolve(__dirname, '../docs/knowledge-base-unicloud-import.json');

  console.log('🔄 开始解析知识库数据...\n');

  // 检查源文件是否存在
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ 源文件不存在: ${sourceFile}`);
    return;
  }

  // 生成导入数据
  const importData = generateImportData(sourceFile);

  console.log(`📋 解析完成，共 ${importData.length} 条案例\n`);

  // 显示前3条预览
  console.log('📄 数据预览（前3条）:');
  importData.slice(0, 3).forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.title}`);
    console.log(`   分类: ${item.category}`);
    console.log(`   关键词: ${item.keywords.join(', ')}`);
    if (item.error) {
      console.log(`   错误: ${item.error.substring(0, 50)}...`);
    }
  });

  // 导出文件
  exportToJSON(outputFile, importData);
  exportToCloudFunctionFormat(cloudFunctionFile, importData);
  exportToUniCloudImportFormat(uniCloudImportFile, importData);

  console.log('\n📝 使用说明:');
  console.log('1. ✨ uniCloud导入格式: docs/knowledge-base-unicloud-import.json');
  console.log('   → 直接在uniCloud控制台导入此文件');
  console.log('2. 标准JSON格式: docs/knowledge-base-import-data.json');
  console.log('3. 云函数格式: docs/knowledge-base-cloud-function.json');

  console.log('\n✅ 完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  parseErrorCases,
  generateImportData,
  exportToJSON,
  exportToCloudFunctionFormat
};
