<template>
  <view class="knowledge-admin-page">
    <!-- 列表视图 -->
    <view v-if="!showEditor" class="list-view">
      <!-- 页面头部 -->
      <view class="page-header">
        <button class="back-btn-only" @click="goBack">
          <uni-icons type="logout-icon" :size="20" color="#fff" />
        </button>
        <view class="header-center">
          <text class="page-title">知识库管理</text>
          <text class="page-subtitle">共 {{ list.length }} 条内容</text>
        </view>
        <view class="header-right">
          <button class="ghost-btn" @click="showImportDialog = true">
            <uni-icons type="upload" :size="18" color="#fff" />
            导入
          </button>
          <button class="primary-btn" @click="createNew">
            新增
          </button>
        </view>
      </view>

      <!-- 状态筛选 -->
      <view class="filter-section">
        <!-- 搜索框 -->
        <view class="search-bar">
          <uni-icons type="search" :size="18" color="#999" class="search-icon" />
          <input
            class="search-input"
            placeholder="搜索标题、关键词"
            v-model="searchKeyword"
          />
          <view v-if="searchKeyword" class="clear-btn" @click="clearSearch">
            <uni-icons type="clear" :size="16" color="#999" />
          </view>
        </view>

        <!-- 筛选和排序 -->
        <view class="filter-bar">
          <view class="filter-tabs">
            <view
              class="filter-tab"
              :class="{ active: statusFilter === '' }"
              @click="filterByStatus('')"
            >
              全部 ({{ list.length }})
            </view>
            <view
              class="filter-tab"
              :class="{ active: statusFilter === 'published' }"
              @click="filterByStatus('published')"
            >
              已发布 ({{ publishedCount }})
            </view>
            <view
              class="filter-tab"
              :class="{ active: statusFilter === 'draft' }"
              @click="filterByStatus('draft')"
            >
              草稿 ({{ draftCount }})
            </view>
          </view>
          <view class="sort-dropdown">
            <picker
              mode="selector"
              :range="sortOptions"
              :value="currentSortIndex"
              @change="onSortChange"
            >
              <view class="sort-picker">
                <uni-icons type="bars" :size="16" color="#666" />
                <text class="sort-text">{{ sortOptions[currentSortIndex] }}</text>
                <uni-icons type="arrowdown" :size="14" color="#999" />
              </view>
            </picker>
          </view>
        </view>
      </view>

      <!-- 知识库列表 -->
      <view class="knowledge-list">
        <view
          v-for="item in filteredList"
          :key="item._id"
          class="knowledge-item"
        >
          <view class="item-bar" :class="item.status" />
          <view class="item-content" @click="edit(item)">
            <view class="item-header">
              <text class="item-title">{{ item.title }}</text>
              <view class="item-status" :class="item.status">
                {{ item.status === 'published' ? '已发布' : '草稿' }}
              </view>
            </view>
            <view class="item-meta">
              <text class="item-category">{{ item.category }}</text>
              <text class="item-views">查看: {{ item.views || 0 }}次</text>
            </view>
            <view class="item-keywords" v-if="item.keywords && item.keywords.length">
              <text
                v-for="(keyword, index) in item.keywords.slice(0, 3)"
                :key="index"
                class="keyword-tag"
              >
                {{ keyword }}
              </text>
              <text v-if="item.keywords.length > 3" class="keyword-more">
                +{{ item.keywords.length - 3 }}
              </text>
            </view>
          </view>
          <view class="item-actions">
            <button class="action-btn edit" @click.stop="edit(item)">
              <uni-icons type="compose" :size="16" color="#0f766e" />
              编辑
            </button>
            <button class="action-btn delete" @click.stop="deleteItem(item)">
              <uni-icons type="trash" :size="16" color="#ef4444" />
              删除
            </button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredList.length === 0" class="empty-state">
        <uni-icons type="folderadd" :size="80" color="#cbd5f5" />
        <text class="empty-text">{{ list.length === 0 ? '暂无知识库内容' : '没有符合筛选的内容' }}</text>
        <button v-if="list.length === 0" class="primary-btn" @click="createNew">
          创建第一条知识库
        </button>
      </view>
    </view>

    <!-- 导入对话框 -->
    <view v-if="showImportDialog" class="import-dialog-mask" @click="closeImportDialog">
      <view class="import-dialog" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">批量导入知识库</text>
          <view class="close-btn" @click="closeImportDialog">
            <uni-icons type="close" :size="20" color="#999" />
          </view>
        </view>
        <view class="dialog-body">
          <view class="import-steps">
            <view class="import-step">
              <view class="step-number">1</view>
              <view class="step-content">
                <text class="step-title">下载模板</text>
                <text class="step-desc">下载Excel模板文件</text>
                <button class="step-btn" @click="downloadTemplate">
                  <uni-icons type="download" :size="16" color="#0f766e" />
                  下载模板
                </button>
              </view>
            </view>
            <view class="import-step">
              <view class="step-number">2</view>
              <view class="step-content">
                <text class="step-title">填写内容</text>
                <text class="step-desc">按模板格式填写知识库内容</text>
              </view>
            </view>
            <view class="import-step">
              <view class="step-number">3</view>
              <view class="step-content">
                <text class="step-title">上传文件</text>
                <text class="step-desc">上传填写好的Excel文件</text>
                <button class="step-btn primary" @click="chooseFile">
                  <uni-icons type="upload-filled" :size="16" color="#fff" />
                  选择文件
                </button>
              </view>
            </view>
          </view>
          <view v-if="importFileName" class="selected-file">
            <uni-icons type="paperclip" :size="16" color="#0f766e" />
            <text class="file-name">{{ importFileName }}</text>
            <view class="remove-file" @click="removeFile">
              <uni-icons type="close" :size="14" color="#999" />
            </view>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="cancel-btn" @click="closeImportDialog">取消</button>
          <button class="confirm-btn" :disabled="!importFilePath" @click="doImport">
            开始导入
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { KNOWLEDGE_CATEGORIES } from '../../constants/permission-constants.js';

export default {
  data() {
    return {
      list: [],
      statusFilter: '',
      categories: KNOWLEDGE_CATEGORIES,
      sortBy: 'name',
      sortOrder: 'asc',
      sortOptions: ['标题排序', '最新发布', '最早发布'],
      currentSortIndex: 0,
      searchKeyword: '',
      showImportDialog: false,
      importFilePath: '',
      importFileName: ''
    };
  },

  computed: {
    filteredList() {
      let filtered = this.list;

      // 搜索筛选
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        filtered = filtered.filter(item =>
          item.title.toLowerCase().includes(keyword) ||
          (item.keywords && item.keywords.some(k => k.toLowerCase().includes(keyword)))
        );
      }

      // 状态筛选
      if (this.statusFilter) {
        filtered = filtered.filter(item => item.status === this.statusFilter);
      }

      // 排序
      const sorted = [...filtered].sort((a, b) => {
        if (this.sortBy === 'name') {
          const getNumFromTitle = (title) => {
            const match = title.match(/错误([一二三四五六七八九十]+)/);
            if (!match) return -1;
            const cn = match[1];
            const map = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
            if (cn === '十') return 10;
            if (cn.startsWith('十')) return 10 + (map[cn[1]] || 0);
            if (cn.includes('十')) return (map[cn[0]] || 0) * 10 + (map[cn[2]] || 0);
            return map[cn] || 0;
          };
          const numA = getNumFromTitle(a.title);
          const numB = getNumFromTitle(b.title);
          if (numA !== numB) return this.sortOrder === 'asc' ? numA - numB : numB - numA;
          return a.title.localeCompare(b.title, 'zh-CN');
        } else {
          // 按发布日期排序
          const dateA = a.createdAt || 0;
          const dateB = b.createdAt || 0;
          return this.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
      });

      return sorted;
    },
    publishedCount() {
      return this.list.filter(item => item.status === 'published').length;
    },
    draftCount() {
      return this.list.filter(item => item.status === 'draft').length;
    }
  },

  onLoad() {
    this.loadList();
  },

  onShow() {
    this.loadList();
  },

  methods: {
    goBack() {
      uni.navigateBack();
    },

    async loadList() {
      try {
        uni.showLoading({ title: '加载中...' });
        const res = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'getKnowledgeList',
            payload: {}
          }
        });
        this.list = res.result.data.list || [];
        uni.hideLoading();
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: '加载失败', icon: 'none' });
      }
    },

    filterByStatus(status) {
      this.statusFilter = status;
    },

    onSortChange(e) {
      const index = e.detail.value;
      this.currentSortIndex = index;

      switch (index) {
        case 0: // 标题排序
          this.sortBy = 'name';
          this.sortOrder = 'asc';
          break;
        case 1: // 最新发布
          this.sortBy = 'date';
          this.sortOrder = 'desc';
          break;
        case 2: // 最早发布
          this.sortBy = 'date';
          this.sortOrder = 'asc';
          break;
      }
    },

    clearSearch() {
      this.searchKeyword = '';
    },

    closeImportDialog() {
      this.showImportDialog = false;
      this.importFilePath = '';
      this.importFileName = '';
    },

    downloadTemplate() {
      // 创建模板数据
      const template = [
        ['标题*', '分类*', '关键词', '内容*', '状态'],
        ['示例：个人贷款申请流程', '个贷业务', '个贷,申请,流程', '## 申请流程\n\n1. 准备材料\n2. 提交申请\n3. 审核通过', 'published'],
        ['', '', '多个关键词用逗号分隔', '支持Markdown格式', 'published或draft']
      ];

      // 下载提示
      uni.showModal({
        title: '模板说明',
        content: '模板包含：标题、分类、关键词、内容、状态。\n\n标题、分类、内容为必填项。\n状态可选：published(已发布)或draft(草稿)。',
        confirmText: '知道了'
      });
    },

    chooseFile() {
      // 小程序环境选择文件
      uni.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['.xlsx', '.xls'],
        success: (res) => {
          const file = res.tempFiles[0];
          this.importFilePath = file.path;
          this.importFileName = file.name;
        },
        fail: () => {
          uni.showToast({ title: '选择文件失败', icon: 'none' });
        }
      });
    },

    removeFile() {
      this.importFilePath = '';
      this.importFileName = '';
    },

    async doImport() {
      if (!this.importFilePath) {
        uni.showToast({ title: '请先选择文件', icon: 'none' });
        return;
      }

      try {
        uni.showLoading({ title: '导入中...' });

        // 上传文件到云存储
        const uploadResult = await uniCloud.uploadFile({
          filePath: this.importFilePath,
          cloudPath: `knowledge_import/${Date.now()}_${this.importFileName}`
        });

        // 调用云函数解析并导入
        const res = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'importKnowledge',
            payload: {
              fileID: uploadResult.fileID
            }
          }
        });

        uni.hideLoading();

        const result = res.result.data;

        if (result.success) {
          // 显示详细结果
          let content = `成功导入 ${result.successCount} 条`;
          if (result.errorCount > 0) {
            content += `\n失败 ${result.errorCount} 条`;
            if (result.errors && result.errors.length > 0) {
              content += '\n\n错误详情：\n' + result.errors.slice(0, 5).join('\n');
              if (result.hasMoreErrors) {
                content += `\n...还有 ${result.errorCount - 5} 条错误`;
              }
            }
          }

          uni.showModal({
            title: '导入完成',
            content: content,
            showCancel: false,
            confirmText: '确定'
          });

          this.closeImportDialog();
          this.loadList();
        } else {
          // 完全失败
          let content = result.message || '导入失败';
          if (result.errors && result.errors.length > 0) {
            content += '\n\n错误详情：\n' + result.errors.slice(0, 5).join('\n');
            if (result.hasMoreErrors) {
              content += '\n...查看更多';
            }
          }

          uni.showModal({
            title: '导入失败',
            content: content,
            showCancel: false
          });
        }
      } catch (error) {
        uni.hideLoading();
        uni.showModal({
          title: '导入失败',
          content: error.message || '请检查文件格式和网络连接',
          showCancel: false
        });
      }
    },

    createNew() {
      uni.navigateTo({
        url: '/pages/knowledge/knowledge-edit'
      });
    },

    edit(item) {
      uni.navigateTo({
        url: `/pages/knowledge/knowledge-edit?id=${item._id}`
      });
    },

    async deleteItem(item) {
      uni.showModal({
        title: '确认删除',
        content: `确认删除知识库《${item.title}》？删除后无法恢复！`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;

          try {
            await uniCloud.callFunction({
              name: 'appService',
              data: {
                action: 'deleteKnowledge',
                payload: { id: item._id }
              }
            });

            uni.showToast({ title: '删除成功', icon: 'success' });
            this.loadList();
          } catch (error) {
            uni.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.knowledge-admin-page {
  height: 100vh;
  background: #f8fafc;
}

/* 列表视图 */
.list-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  padding: 32rpx 32rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.back-btn-only {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border: none;
  padding: 0;
  flex-shrink: 0;
}

.header-center {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.header-right {
  display: flex;
  gap: 16rpx;
  align-items: center;
  flex-shrink: 0;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.page-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: #fff;
  color: #0f766e;
  border: none;
  border-radius: 32rpx;
  font-size: 26rpx;
  font-weight: 600;
  min-width: 120rpx;
}

.filter-section {
  background: #fff;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #e5e7eb;
}

/* 搜索框 */
.search-bar {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 32rpx;
  padding: 0 24rpx;
  height: 68rpx;
  margin-bottom: 20rpx;
}

.search-icon {
  margin-right: 12rpx;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  height: 100%;
}

.clear-btn {
  padding: 8rpx;
  margin-left: 8rpx;
  flex-shrink: 0;
}

/* 筛选和排序栏 */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.filter-tabs {
  display: flex;
  gap: 24rpx;
  margin-bottom: 20rpx;
}

.sort-selector {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f3f4f6;
}

.sort-label {
  font-size: 26rpx;
  color: #6b7280;
}

.sort-dropdown {
  flex-shrink: 0;
}

.sort-picker {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background-color: #f5f5f5;
  border-radius: 32rpx;
  white-space: nowrap;
}

.sort-text {
  font-size: 24rpx;
  color: #666;
}

.filter-tab {
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  color: #6b7280;
  background: #f3f4f6;
  border-radius: 32rpx;
  transition: all 0.3s;
  white-space: nowrap;
}

.filter-tab.active {
  color: #fff;
  background: #0f766e;
  font-weight: 600;
}

.knowledge-list {
  flex: 1;
  padding: 24rpx 32rpx;
  overflow-y: auto;
}

.knowledge-item {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  display: flex;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.item-bar {
  width: 6rpx;
  flex-shrink: 0;
}

.item-bar.published {
  background: #10b981;
}

.item-bar.draft {
  background: #f59e0b;
}

.item-content {
  flex: 1;
  padding: 24rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.item-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
}

.item-status {
  padding: 4rpx 16rpx;
  font-size: 22rpx;
  border-radius: 4rpx;
  font-weight: 500;
}

.item-status.published {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.item-status.draft {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.item-meta {
  display: flex;
  gap: 24rpx;
  margin-bottom: 12rpx;
}

.item-category,
.item-priority,
.item-views {
  font-size: 24rpx;
  color: #6b7280;
}

.item-keywords {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.keyword-tag {
  padding: 4rpx 12rpx;
  font-size: 22rpx;
  color: #0f766e;
  background: rgba(15, 118, 110, 0.1);
  border-radius: 4rpx;
}

.keyword-more {
  padding: 4rpx 8rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 24rpx 16rpx;
  border-left: 1rpx solid #e5e7eb;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  font-size: 24rpx;
  border-radius: 8rpx;
  border: none;
  white-space: nowrap;
}

.action-btn.edit {
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
}

.action-btn.delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 120rpx 60rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #9ca3af;
}

/* 编辑器视图 */
.editor-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  padding: 32rpx 32rpx 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.ghost-btn {
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 32rpx;
  color: #fff;
  font-size: 26rpx;
  backdrop-filter: blur(10rpx);
}

.editor-body {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 40rpx;
}

.form-section {
  padding: 24rpx 32rpx 80rpx;
}

.form-group {
  margin-bottom: 32rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12rpx;
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-input {
  width: 100%;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  color: #374151;
}

.form-textarea {
  width: 100%;
  min-height: 400rpx;
  height: auto;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  line-height: 1.6;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  box-sizing: border-box;
  resize: none;
}

.form-tip {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #9ca3af;
}

/* 导入对话框 */
.import-dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.import-dialog {
  width: 640rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #e5e7eb;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  padding: 8rpx;
}

.dialog-body {
  padding: 32rpx;
}

.import-steps {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.import-step {
  display: flex;
  gap: 16rpx;
}

.step-number {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #0f766e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.step-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.step-desc {
  font-size: 24rpx;
  color: #6b7280;
}

.step-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  border: 1rpx solid #0f766e;
  border-radius: 8rpx;
  font-size: 24rpx;
  margin-top: 8rpx;
  align-self: flex-start;
}

.step-btn.primary {
  background: #0f766e;
  color: #fff;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background: #f3f4f6;
  border-radius: 8rpx;
  margin-top: 24rpx;
}

.file-name {
  flex: 1;
  font-size: 24rpx;
  color: #374151;
}

.remove-file {
  padding: 8rpx;
}

.dialog-footer {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid #e5e7eb;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
}

.cancel-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.confirm-btn {
  background: #0f766e;
  color: #fff;
}

.confirm-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
}

/* Markdown工具栏 */
.markdown-toolbar {
  display: flex;
  gap: 8rpx;
  padding: 12rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-bottom: none;
  border-radius: 12rpx 12rpx 0 0;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  background: #fff;
  border: 1rpx solid #e5e7eb;
  border-radius: 8rpx;
  transition: all 0.3s;
}

.toolbar-btn:active {
  background: #f3f4f6;
}

.toolbar-icon {
  font-size: 28rpx;
  font-weight: 700;
  color: #374151;
}

.toolbar-icon.italic {
  font-style: italic;
}

.toolbar-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #374151;
}

.form-textarea {
  border-radius: 0 0 12rpx 12rpx !important;
  border-top: none !important;
}

</style>
