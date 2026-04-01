<template>
  <view class="batch-import-page">
    <!-- 步骤指示 -->
    <view class="steps">
      <view class="step" :class="{ active: step >= 1, done: step > 1 }">
        <view class="step-num">1</view>
        <text class="step-text">上传文件</text>
      </view>
      <view class="step-line" :class="{ active: step > 1 }" />
      <view class="step" :class="{ active: step >= 2, done: step > 2 }">
        <view class="step-num">2</view>
        <text class="step-text">AI 批量解析</text>
      </view>
      <view class="step-line" :class="{ active: step > 2 }" />
      <view class="step" :class="{ active: step >= 3 }">
        <view class="step-num">3</view>
        <text class="step-text">确认导入</text>
      </view>
    </view>

    <!-- 步骤1：上传文件 -->
    <view v-if="step === 1" class="step-content">
      <view class="upload-section">
        <view class="section-title">上传 Excel 文件</view>
        <button class="upload-btn" @click="chooseFile">
          <uni-icons type="upload" :size="24" color="#0f766e" />
          <text>选择 Excel 文件</text>
        </button>
        <view v-if="fileName" class="file-info">
          <uni-icons type="paperclip" :size="16" color="#0f766e" />
          <text class="file-name">{{ fileName }}</text>
          <view class="remove-file" @click="removeFile">
            <uni-icons type="close" :size="14" color="#999" />
          </view>
        </view>
        <text class="upload-tip">Excel 格式：每行一条内容，第一列为内容文本</text>
      </view>
      <view class="action-btns">
        <button class="primary-btn" :disabled="!filePath" @click="parseFile">
          下一步：AI 解析
        </button>
      </view>
    </view>

    <!-- 步骤2：解析中 -->
    <view v-if="step === 2" class="step-content loading">
      <view class="loading-icon">
        <uni-icons type="spinner-cycle" :size="60" color="#0f766e" />
      </view>
      <text class="loading-text">AI 正在批量解析...</text>
      <text class="loading-progress">{{ parsedCount }}/{{ totalCount }}</text>
    </view>

    <!-- 步骤3：确认列表 -->
    <view v-if="step === 3" class="step-content">
      <view class="preview-list">
        <view v-for="(item, idx) in previewList" :key="idx" class="preview-item">
          <view class="item-header">
            <text class="item-index">{{ idx + 1 }}</text>
            <input class="item-title" v-model="item.title" placeholder="标题" />
          </view>
          <view class="item-meta">
            <picker mode="selector" :range="categories" :value="categories.indexOf(item.category)" @change="e => onCategoryChange(idx, e)">
              <view class="meta-picker">{{ item.category }}</view>
            </picker>
          </view>
          <view class="item-keywords">
            <text v-for="(kw, i) in item.keywords" :key="i" class="keyword-tag">{{ kw }}</text>
          </view>
        </view>
      </view>
      <view class="action-btns">
        <button class="ghost-btn" @click="step = 1">重新上传</button>
        <button class="primary-btn" @click="batchSave">保存全部</button>
      </view>
    </view>
  </view>
</template>

<script>
import { KNOWLEDGE_CATEGORIES } from '../../constants/permission-constants.js';

export default {
  data() {
    return {
      step: 1,
      filePath: '',
      fileName: '',
      previewList: [],
      categories: KNOWLEDGE_CATEGORIES,
      parsedCount: 0,
      totalCount: 0
    };
  },

  methods: {
    chooseFile() {
      uni.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['.xlsx', '.xls'],
        success: (res) => {
          const file = res.tempFiles[0];
          this.filePath = file.path;
          this.fileName = file.name;
        },
        fail: () => {
          uni.showToast({ title: '选择文件失败', icon: 'none' });
        }
      });
    },

    removeFile() {
      this.filePath = '';
      this.fileName = '';
    },

    async parseFile() {
      this.step = 2;
      this.parsedCount = 0;
      this.previewList = [];

      try {
        // 上传文件
        const uploadResult = await uniCloud.uploadFile({
          filePath: this.filePath,
          cloudPath: `temp/${Date.now()}_${this.fileName}`
        });

        // 解析 Excel 获取内容列表
        const parseRes = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'parseExcelForBatch',
            payload: { fileID: uploadResult.fileID }
          }
        });

        const contentList = parseRes.result.data.list || [];
        this.totalCount = contentList.length;

        // 并发处理：每 5 个一批
        const batchSize = 5;
        for (let i = 0; i < contentList.length; i += batchSize) {
          const batch = contentList.slice(i, i + batchSize);

          // 并发调用 AI 提取
          const promises = batch.map(item =>
            uniCloud.callFunction({
              name: 'appService',
              data: {
                action: 'smartImportKnowledge',
                payload: { content: item.content, useAI: true }
              }
            }).then(res => res.result.data).catch(err => ({
              title: '提取失败',
              category: '其他',
              keywords: [],
              content: item.content,
              error: err.message
            }))
          );

          const results = await Promise.all(promises);
          this.previewList.push(...results);
          this.parsedCount = this.previewList.length;
        }

        this.step = 3;
      } catch (error) {
        uni.showModal({
          title: '解析失败',
          content: error.message || '请检查文件格式',
          showCancel: false
        });
        this.step = 1;
      }
    },

    onCategoryChange(idx, e) {
      this.previewList[idx].category = this.categories[e.detail.value];
    },

    async batchSave() {
      try {
        uni.showLoading({ title: '保存中...' });

        for (const item of this.previewList) {
          await uniCloud.callFunction({
            name: 'appService',
            data: {
              action: 'createKnowledge',
              payload: {
                title: item.title,
                category: item.category,
                keywords: item.keywords,
                content: item.content,
                status: 'published'
              }
            }
          });
        }

        uni.hideLoading();
        uni.showToast({ title: `成功导入${this.previewList.length}条`, icon: 'success' });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: '保存失败', icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.batch-import-page {
  min-height: 100vh;
  background: #f8fafc;
  padding-top: 20rpx;
}

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx 32rpx;
  background: #fff;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.step-num {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #e5e7eb;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
}

.step.active .step-num {
  background: #0f766e;
  color: #fff;
}

.step-text {
  font-size: 24rpx;
  color: #9ca3af;
}

.step.active .step-text {
  color: #0f766e;
  font-weight: 600;
}

.step-line {
  width: 80rpx;
  height: 4rpx;
  background: #e5e7eb;
  margin: 0 16rpx;
}

.step-line.active {
  background: #10b981;
}

.step-content {
  padding: 32rpx;
}

.upload-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.upload-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 48rpx 24rpx;
  background: #f9fafb;
  border: 2rpx dashed #d1d5db;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #0f766e;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background: #f0fdf4;
  border: 1rpx solid #86efac;
  border-radius: 8rpx;
  margin-top: 16rpx;
}

.file-name {
  flex: 1;
  font-size: 24rpx;
  color: #166534;
}

.remove-file {
  padding: 8rpx;
}

.upload-tip {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #9ca3af;
  text-align: center;
}

.step-content.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400rpx;
  gap: 24rpx;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #6b7280;
}

.loading-progress {
  font-size: 24rpx;
  color: #9ca3af;
}

.preview-list {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  max-height: 600rpx;
  overflow-y: auto;
}

.preview-item {
  padding: 20rpx;
  border: 1rpx solid #e5e7eb;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.item-index {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #0f766e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  flex-shrink: 0;
}

.item-title {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 600;
}

.item-meta {
  margin-bottom: 12rpx;
}

.meta-picker {
  padding: 8rpx 16rpx;
  background: #f3f4f6;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #374151;
  display: inline-block;
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

.action-btns {
  display: flex;
  gap: 16rpx;
}

.primary-btn, .ghost-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.primary-btn {
  background: #0f766e;
  color: #fff;
}

.primary-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
}

.ghost-btn {
  background: #fff;
  color: #0f766e;
  border: 2rpx solid #0f766e;
}
</style>
