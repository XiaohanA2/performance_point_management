/**
 * 知识库管理Actions
 */

// 搜索知识库（所有用户）
async function searchKnowledge(payload) {
  const { keyword, category, limit = 1000 } = payload;
  const db = uniCloud.database();
  const _ = db.command;

  let whereCondition = {
    status: 'published'
  };

  // 关键词搜索（标题或关键词）
  if (keyword) {
    whereCondition = _.and([
      whereCondition,
      _.or([
        { title: new RegExp(`${keyword}.*`, 'i') },
        { keywords: new RegExp(`${keyword}.*`, 'i') },
        { content: new RegExp(`${keyword}.*`, 'i') }
      ])
    ]);
  }

  // 分类筛选
  if (category) {
    whereCondition.category = category;
  }

  const { data } = await db.collection('knowledge_base')
    .where(whereCondition)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  // 一次性返回完整数据（包含content字段）
  // 原因：当前知识库约35条，总数据量仅7KB，一次性加载用户体验更好
  // 如未来超过200条或单条包含大量内容，考虑改为懒加载
  return data;
}

// 获取知识库详情
async function getKnowledgeDetail(payload) {
  const { id } = payload;
  const db = uniCloud.database();

  if (!id) {
    throw new Error('缺少知识库ID');
  }

  const { data } = await db.collection('knowledge_base')
    .doc(id)
    .get();

  if (!data.length) {
    throw new Error('知识库不存在');
  }

  const knowledge = data[0];

  // 增加浏览次数
  await db.collection('knowledge_base').doc(id).update({
    views: (knowledge.views || 0) + 1
  });

  return knowledge;
}

// 创建知识库（knowledge_admin及以上）
async function createKnowledge(payload) {
  const { title, category, keywords, content, status = 'draft', priority = 5 } = payload;
  const db = uniCloud.database();

  if (!title || !content) {
    throw new Error('标题和内容不能为空');
  }

  const doc = {
    _id: `knowledge_${Date.now()}`,
    title,
    category: category || '未分类',
    keywords: keywords || [],
    content,
    status,
    priority,
    views: 0,
    attachments: [],
    createdBy: payload.userId || null,
    updatedBy: payload.userId || null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.collection('knowledge_base').add(doc);

  // 清除缓存
  const { clearCache } = require('../index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { success: true, id: doc._id };
}

// 更新知识库
async function updateKnowledge(payload) {
  const { id, title, category, keywords, content, status, priority } = payload;
  const db = uniCloud.database();

  if (!id) {
    throw new Error('缺少知识库ID');
  }

  const { data } = await db.collection('knowledge_base').doc(id).get();
  if (!data.length) {
    throw new Error('知识库不存在');
  }

  const updateData = {
    updatedAt: Date.now(),
    updatedBy: payload.userId || null
  };

  if (title !== undefined) updateData.title = title;
  if (category !== undefined) updateData.category = category;
  if (keywords !== undefined) updateData.keywords = keywords;
  if (content !== undefined) updateData.content = content;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;

  await db.collection('knowledge_base').doc(id).update(updateData);

  // 清除缓存
  const { clearCache } = require('../index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { success: true };
}

// 删除知识库
async function deleteKnowledge(payload) {
  const { id } = payload;
  const db = uniCloud.database();

  if (!id) {
    throw new Error('缺少知识库ID');
  }

  await db.collection('knowledge_base').doc(id).remove();

  // 清除缓存
  const { clearCache } = require('../index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { success: true };
}

// 获取知识库列表（管理员）
async function getKnowledgeList(payload) {
  const { status, category, page = 1, pageSize = 1000 } = payload;
  const db = uniCloud.database();

  let whereCondition = {};

  if (status) {
    whereCondition.status = status;
  }

  if (category) {
    whereCondition.category = category;
  }

  // 查询总数
  const { total } = await db.collection('knowledge_base')
    .where(whereCondition)
    .count();

  // 分页查询
  const { data } = await db.collection('knowledge_base')
    .where(whereCondition)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .orderBy('createdAt', 'desc')
    .get();

  return {
    list: data,
    total,
    page,
    pageSize
  };
}

// 获取所有分类
async function getKnowledgeCategories() {
  const db = uniCloud.database();

  const { data } = await db.collection('knowledge_base')
    .field({ category: true })
    .get();

  const categories = [...new Set(data.map(item => item.category))];

  return categories.sort();
}

// 增加查看次数
async function incrementKnowledgeViews(payload) {
  const { id } = payload;
  const db = uniCloud.database();
  const _ = db.command;

  if (!id) {
    throw new Error('缺少知识库ID');
  }

  await db.collection('knowledge_base').doc(id).update({
    views: _.inc(1)
  });

  return { success: true };
}

// AI 自动提取知识库元数据（使用 DeepSeek API）
async function extractKnowledgeMetadata(payload) {
  const { content } = payload;

  if (!content || content.length < 10) {
    throw new Error('内容过短，无法提取');
  }

  const validCategories = ['错题本', '使用指南', '知识库', '帮助'];

  try {
    const db = uniCloud.database();

    console.log('开始 AI 提取，内容长度:', content.length);

    // 获取现有知识库示例和所有分类
    const { data: existingKnowledge } = await db.collection('knowledge_base')
      .field({ title: true, category: true, keywords: true })
      .limit(3)
      .get();

    const { data: allCategories } = await db.collection('knowledge_base')
      .field({ category: true })
      .get();
    const existingCategories = [...new Set(allCategories.map(item => item.category))];

    console.log('已有分类:', existingCategories);

    // 构建 few-shot 示例
    const examples = existingKnowledge.map(item =>
      `标题: ${item.title}\n分类: ${item.category}\n关键词: ${item.keywords.join(', ')}`
    ).join('\n\n');

    const prompt = `你是一个知识库内容分析助手。请分析以下内容，提取元数据。

已有分类：${existingCategories.join('、')}

已有知识库示例：
${examples || '暂无示例'}

待分析内容：
${content.substring(0, 2000)}

要求：
1. 提取简洁的标题（10-30字）
2. 提取3个关键词（参考已有示例风格）
3. 选择分类：优先从已有分类中选择；如果内容不适合已有分类，可以建议新分类（2-4个字）

返回 JSON 格式：
{"title": "标题", "keywords": ["关键词1", "关键词2", "关键词3"], "category": "分类"}`;

    console.log('准备调用 DeepSeek API...');

    // 使用 uniCloud.httpclient 替代 axios
    const res = await uniCloud.httpclient.request(
      'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        data: {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500
        },
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        dataType: 'json',
        timeout: 30000
      }
    );

    console.log('API 调用成功，状态码:', res.status);

    const result = res.data.choices[0].message.content;
    console.log('AI 返回内容:', result);

    // 解析 JSON 响应
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI 返回格式错误:', result);
      throw new Error('AI 返回格式错误');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    console.log('提取结果:', extracted);

    return {
      title: extracted.title || '未命名',
      keywords: (extracted.keywords || []).slice(0, 3), // 限制3个
      category: extracted.category || '知识库',
      confidence: 0.9
    };
  } catch (error) {
    console.error('AI提取失败:', error.message, error);

    // 降级：使用规则提取
    console.log('使用降级方案...');
    return fallbackExtract(content, validCategories);
  }
}

// 降级方案：规则提取
function fallbackExtract(content, validCategories) {
  let title = content.split('\n')[0].trim().replace(/^#+\s*/, '');
  if (title.length > 50) title = title.substring(0, 50) + '...';
  if (!title) title = content.substring(0, 30) + '...';

  const keywords = content
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && w.length <= 10)
    .slice(0, 5);

  let category = '知识库';
  if (content.includes('错误') || content.includes('问题')) category = '错题本';
  else if (content.includes('如何') || content.includes('步骤')) category = '使用指南';
  else if (content.includes('帮助') || content.includes('FAQ')) category = '帮助';

  return { title, keywords, category, confidence: 0.5 };
}

// 解析文档文件（Word/Excel）
async function parseDocumentFile(payload) {
  const { fileID } = payload;

  if (!fileID) {
    throw new Error('缺少文件ID');
  }

  try {
    // 下载文件
    const downloadResult = await uniCloud.downloadFile({ fileID });
    const fs = require('fs');
    const path = require('path');
    const filePath = downloadResult.tempFilePath;
    const ext = path.extname(filePath).toLowerCase();

    let content = '';

    if (ext === '.xlsx' || ext === '.xls') {
      // Excel 文件解析
      const XLSX = require('xlsx');
      const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });

      // 遍历所有工作表
      const sheets = [];
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // 转换为 Markdown 表格
        if (data.length > 0) {
          sheets.push(`## ${sheetName}\n`);

          // 表头
          const headers = data[0];
          sheets.push('| ' + headers.join(' | ') + ' |');
          sheets.push('| ' + headers.map(() => '---').join(' | ') + ' |');

          // 数据行
          for (let i = 1; i < data.length; i++) {
            sheets.push('| ' + data[i].join(' | ') + ' |');
          }
          sheets.push('\n');
        }
      });

      content = sheets.join('\n');

    } else if (ext === '.docx') {
      // Word 文件解析
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value;

    } else {
      throw new Error('不支持的文件格式，仅支持 .xlsx .xls .docx');
    }

    // 删除临时文件
    try {
      await uniCloud.deleteFile({ fileList: [fileID] });
    } catch (e) {
      console.log('删除临时文件失败:', e);
    }

    return { content: content.trim() };

  } catch (error) {
    console.error('文件解析失败:', error);
    throw new Error(`文件解析失败: ${error.message}`);
  }
}

// 批量解析知识库（Excel 批量 AI 提取）
async function batchParseKnowledge(payload) {
  const { fileID } = payload;

  if (!fileID) {
    throw new Error('缺少文件ID');
  }

  try {
    // 下载并解析 Excel
    const downloadResult = await uniCloud.downloadFile({ fileID });
    const fs = require('fs');
    const XLSX = require('xlsx');
    const workbook = XLSX.read(fs.readFileSync(downloadResult.tempFilePath), { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`批量解析：共 ${data.length} 行`);

    const results = [];

    // 逐条 AI 解析
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const content = row[0]?.toString().trim();

      if (!content || content.length < 10) {
        console.log(`跳过第 ${i + 1} 行：内容过短`);
        continue;
      }

      try {
        const metadata = await extractKnowledgeMetadata({ content });
        results.push({
          title: metadata.title,
          category: metadata.category,
          keywords: metadata.keywords,
          content: content
        });
        console.log(`解析第 ${i + 1} 行成功`);
      } catch (error) {
        console.error(`解析第 ${i + 1} 行失败:`, error.message);
      }
    }

    // 删除临时文件
    try {
      await uniCloud.deleteFile({ fileList: [fileID] });
    } catch (e) {
      console.log('删除临时文件失败:', e);
    }

    return { list: results };
  } catch (error) {
    console.error('批量解析失败:', error);
    throw new Error(`批量解析失败: ${error.message}`);
  }
}

// 解析 Excel 获取内容列表（不做 AI 提取）
async function parseExcelForBatch(payload) {
  const { fileID } = payload;

  if (!fileID) {
    throw new Error('缺少文件ID');
  }

  try {
    const downloadResult = await uniCloud.downloadFile({ fileID });
    const fs = require('fs');
    const XLSX = require('xlsx');
    const workbook = XLSX.read(fs.readFileSync(downloadResult.tempFilePath), { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const list = [];
    for (let i = 0; i < data.length; i++) {
      const content = data[i][0]?.toString().trim();
      if (content && content.length >= 10) {
        list.push({ content });
      }
    }

    // 删除临时文件
    try {
      await uniCloud.deleteFile({ fileList: [fileID] });
    } catch (e) {
      console.log('删除临时文件失败:', e);
    }

    return { list };
  } catch (error) {
    console.error('解析 Excel 失败:', error);
    throw new Error(`解析失败: ${error.message}`);
  }
}

// 智能导入单条知识库（文本 + AI 提取）
async function smartImportKnowledge(payload) {
  console.log('smartImportKnowledge 开始执行，payload:', JSON.stringify(payload).substring(0, 200));

  const { content, useAI = true } = payload;

  if (!content || content.trim().length < 10) {
    console.log('内容验证失败');
    throw new Error('内容不能为空且至少10个字符');
  }

  console.log('内容验证通过，useAI:', useAI);

  try {
    // AI 提取元数据
    let metadata;
    if (useAI) {
      console.log('准备调用 extractKnowledgeMetadata...');
      metadata = await extractKnowledgeMetadata({ content });
      console.log('extractKnowledgeMetadata 返回:', metadata);
    } else {
      console.log('使用 fallbackExtract...');
      metadata = fallbackExtract(content, ['错题本', '使用指南', '知识库', '帮助']);
    }

    // 确保返回完整数据
    const result = {
      title: metadata.title || '未命名',
      category: metadata.category || '知识库',
      keywords: metadata.keywords || [],
      content: content,
      confidence: metadata.confidence || 0.5
    };

    console.log('smartImportKnowledge 返回结果:', result);
    return result;
  } catch (error) {
    console.error('smartImportKnowledge 异常:', error.message, error.stack);

    // 最终降级方案
    const fallback = fallbackExtract(content, ['错题本', '使用指南', '知识库', '帮助']);
    return {
      title: fallback.title || '未命名',
      category: fallback.category || '知识库',
      keywords: fallback.keywords || [],
      content: content,
      confidence: 0.3
    };
  }
}

// 批量导入知识库（Excel）
async function importKnowledge(payload) {
  const { fileID } = payload;
  const db = uniCloud.database();

  if (!fileID) {
    throw new Error('缺少文件ID');
  }

  try {
    // 下载文件
    const downloadResult = await uniCloud.downloadFile({
      fileID: fileID
    });

    // 读取文件内容
    const fs = require('fs');
    const fileContent = fs.readFileSync(downloadResult.tempFilePath);

    // 使用 xlsx 库解析 Excel
    const XLSX = require('xlsx');
    const workbook = XLSX.read(fileContent, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData || jsonData.length === 0) {
      throw new Error('Excel文件为空或格式不正确');
    }

    // 获取已有标题列表（用于去重检查）
    const existingTitles = await db.collection('knowledge_base')
      .field({ title: true })
      .get()
      .then(res => new Set(res.data.map(item => item.title)));

    // 验证和转换数据
    const knowledgeList = [];
    const errors = [];
    const duplicates = [];
    const validCategories = ['错题本', '使用指南', '知识库', '帮助'];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2; // Excel行号（从2开始，因为第1行是表头）

      // 验证必填字段
      if (!row['标题*']) {
        errors.push(`第${rowNum}行：缺少标题`);
        continue;
      }
      if (!row['分类*']) {
        errors.push(`第${rowNum}行：缺少分类`);
        continue;
      }
      if (!row['内容*']) {
        errors.push(`第${rowNum}行：缺少内容`);
        continue;
      }

      const title = row['标题*'].toString().trim();
      const category = row['分类*'].toString().trim();

      // 标题去重检查
      if (existingTitles.has(title)) {
        duplicates.push(`第${rowNum}行：标题"${title}"已存在`);
        continue;
      }

      // 分类验证
      if (!validCategories.includes(category)) {
        errors.push(`第${rowNum}行：分类"${category}"无效，必须是：${validCategories.join('、')}`);
        continue;
      }

      // 处理关键词（逗号分隔）
      let keywords = [];
      if (row['关键词']) {
        keywords = row['关键词'].toString().split(/[,，]/).map(k => k.trim()).filter(k => k);
      }

      // 处理状态
      let status = 'draft';
      if (row['状态']) {
        const statusStr = row['状态'].toString().toLowerCase();
        if (statusStr === 'published' || statusStr === '已发布') {
          status = 'published';
        }
      }

      knowledgeList.push({
        _id: `knowledge_${Date.now()}_${i}`,
        title: title,
        category: category,
        keywords: keywords,
        content: row['内容*'].toString().trim(),
        status: status,
        priority: 5,
        views: 0,
        attachments: [],
        createdBy: payload.userId || null,
        updatedBy: payload.userId || null,
        createdAt: Date.now() + i,
        updatedAt: Date.now() + i
      });

      // 添加到已存在标题集合，避免同批次内重复
      existingTitles.add(title);
    }

    // 批量插入数据库（部分成功策略）
    let successCount = 0;
    const insertErrors = [];

    if (knowledgeList.length > 0) {
      for (let i = 0; i < knowledgeList.length; i++) {
        try {
          await db.collection('knowledge_base').add(knowledgeList[i]);
          successCount++;
        } catch (err) {
          insertErrors.push(`插入"${knowledgeList[i].title}"失败: ${err.message}`);
        }
      }
    }

    // 清除缓存
    const { clearCache } = require('./index.js');
    if (typeof clearCache === 'function') {
      clearCache();
    }

    // 删除临时文件
    try {
      await uniCloud.deleteFile({
        fileList: [fileID]
      });
    } catch (e) {
      console.log('删除临时文件失败:', e);
    }

    // 返回详细结果
    const allErrors = [...errors, ...duplicates, ...insertErrors];

    return {
      success: successCount > 0,
      successCount: successCount,
      totalRows: jsonData.length,
      errorCount: allErrors.length,
      errors: allErrors.slice(0, 20), // 最多返回20条错误
      hasMoreErrors: allErrors.length > 20,
      message: successCount > 0
        ? `成功导入${successCount}条，失败${allErrors.length}条`
        : '导入失败，请检查数据格式'
    };
  } catch (error) {
    console.error('导入失败:', error);
    throw new Error(`导入失败: ${error.message}`);
  }
}

module.exports = {
  searchKnowledge,
  getKnowledgeDetail,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getKnowledgeList,
  getKnowledgeCategories,
  incrementKnowledgeViews,
  importKnowledge,
  extractKnowledgeMetadata,
  smartImportKnowledge,
  parseDocumentFile,
  batchParseKnowledge,
  parseExcelForBatch
};
