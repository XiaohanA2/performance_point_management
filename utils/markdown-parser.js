/**
 * Markdown 解析工具
 * 使用 marked.js 库进行安全的 Markdown 渲染
 */

// 简化版 Markdown 解析器（用于小程序环境）
// 注意：小程序不支持直接引入 npm 包，需要使用内置解析器
export function parseMarkdown(markdown) {
  if (!markdown) return '';

  let html = markdown;

  // 转义 HTML 特殊字符
  html = html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;');

  // 处理标题 ###
  html = html.replace(/^###\s+(.*)$/gm, '<h3 style="font-size: 28rpx; font-weight: bold; color: #333; margin: 20rpx 0 10rpx;">$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2 style="font-size: 32rpx; font-weight: bold; color: #333; margin: 20rpx 0 10rpx;">$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1 style="font-size: 36rpx; font-weight: bold; color: #333; margin: 20rpx 0 10rpx;">$1</h1>');

  // 处理加粗 **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold; color: #333;">$1</strong>');

  // 处理换行
  html = html.replace(/\n\n/g, '</p><p style="margin: 15rpx 0; line-height: 1.6; color: #666; font-size: 26rpx;">');
  html = html.replace(/\n/g, '<br/>');

  // 处理列表
  html = html.replace(/^- (.*)$/gm, '<li style="margin-left: 30rpx; list-style: disc; font-size: 26rpx;">$1</li>');

  // 处理代码
  html = html.replace(/`([^`]+)`/g, '<code style="background-color: #f5f5f5; padding: 2rpx 6rpx; border-radius: 3rpx; font-size: 24rpx;">$1</code>');

  // 处理分隔线
  html = html.replace(/^---$/gm, '<hr style="border: none; border-top: 1rpx solid #e5e5e5; margin: 20rpx 0;"/>');

  // 包装在段落中
  html = '<p style="margin: 15rpx 0; line-height: 1.6; color: #666; font-size: 26rpx; white-space: pre-wrap;">' + html + '</p>';

  return html;
}

/**
 * 生成内容摘要
 * @param {string} content - 完整内容
 * @param {number} maxLength - 最大长度
 * @returns {string} 摘要文本
 */
export function generateSummary(content, maxLength = 100) {
  if (!content) return '';

  // 移除 Markdown 标记
  let text = content
    .replace(/#{1,6}\s+/g, '') // 移除标题标记
    .replace(/\*\*(.*?)\*\*/g, '$1') // 移除加粗
    .replace(/`([^`]+)`/g, '$1') // 移除代码标记
    .replace(/\n+/g, ' ') // 换行转空格
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}
