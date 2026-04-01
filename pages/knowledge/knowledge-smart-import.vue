<template>
  <view class="smart-import-page">
    <!-- 步骤指示 -->
    <view class="steps">
      <view class="step" :class="{ active: step >= 1, done: step > 1 }">
        <view class="step-num">1</view>
        <text class="step-text">粘贴内容</text>
      </view>
      <view class="step-line" :class="{ active: step > 1 }" />
      <view class="step" :class="{ active: step >= 2, done: step > 2 }">
        <view class="step-num">2</view>
        <text class="step-text">AI 提取</text>
      </view>
      <view class="step-line" :class="{ active: step > 2 }" />
      <view class="step" :class="{ active: step >= 3 }">
        <view class="step-num">3</view>
        <text class="step-text">确认保存</text>
      </view>
    </view>

    <!-- 步骤1：输入内容 -->
    <view v-if="step === 1" class="step-content">
      <view class="input-section">
        <view class="section-title">粘贴或输入知识库内容</view>
        <textarea
          class="content-input"
          v-model="inputContent"
          placeholder="支持 Markdown 格式，可直接粘贴文档内容..."
          :maxlength="10000"
        />
        <view class="char-count">{{ inputContent.length }}/10000</view>
      </view>

      <view class="divider">
        <view class="divider-line" />
        <text class="divider-text">或</text>
        <view class="divider-line" />
      </view>

      <view class="upload-section">
        <view class="section-title">上传文件</view>
        <button class="upload-btn" @click="chooseFile">
          <uni-icons type="upload" :size="24" color="#0f766e" />
          <text>选择 Word/Excel 文件</text>
        </button>
        <view v-if="fileName" class="file-info">
          <uni-icons type="paperclip" :size="16" color="#0f766e" />
          <text class="file-name">{{ fileName }}</text>
          <view class="remove-file" @click="removeFile">
            <uni-icons type="close" :size="14" color="#999" />
          </view>
        </view>
        <text class="upload-tip">支持 .docx .xlsx .xls 格式</text>
      </view>

      <view class="action-btns">
        <button class="primary-btn" :disabled="!canProceed" @click="extractMetadata">
          下一步：AI 提取
        </button>
      </view>
    </view>

    <!-- 步骤2：AI 提取中 -->
    <view v-if="step === 2" class="step-content loading">
      <view class="loading-icon">
        <uni-icons type="spinner-cycle" :size="60" color="#0f766e" />
      </view>
      <text class="loading-text">AI 正在分析内容...</text>
    </view>

    <!-- 步骤3：确认信息 -->
    <view v-if="step === 3" class="step-content">
      <view class="preview-section">
        <view class="form-group">
          <text class="form-label required">标题</text>
          <input class="form-input" v-model="preview.title" placeholder="请输入标题" />
        </view>
        <view class="form-group">
          <text class="form-label required">分类</text>
          <picker mode="selector" :range="categories" :value="categoryIndex" @change="onCategoryChange">
            <view class="form-picker">{{ preview.category }}</view>
          </picker>
        </view>
        <view class="form-group">
          <text class="form-label">关键词</text>
          <view class="keywords-input">
            <view v-for="(kw, idx) in preview.keywords" :key="idx" class="keyword-tag">
              {{ kw }}
              <view class="remove-kw" @click="removeKeyword(idx)">
                <uni-icons type="close" :size="12" color="#666" />
              </view>
            </view>
            <input
              class="add-kw-input"
              v-model="newKeyword"
              placeholder="添加关键词"
              @confirm="addKeyword"
            />
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">状态</text>
          <picker mode="selector" :range="['草稿', '已发布']" :value="statusIndex" @change="onStatusChange">
            <view class="form-picker">{{ statusIndex === 0 ? '草稿' : '已发布' }}</view>
          </picker>
        </view>
        <view class="form-group">
          <text class="form-label">内容预览</text>
          <view class="content-preview">{{ preview.content.substring(0, 200) }}...</view>
        </view>
      </view>
      <view class="action-btns">
        <button class="ghost-btn" @click="step = 1">重新输入</button>
        <button class="primary-btn" @click="saveKnowledge">保存</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      step: 1,
      inputContent: '',
      filePath: '',
      fileName: '',
      preview: {
        title: '',
        category: '知识库',
        keywords: [],
        content: '',
        confidence: 0
      },
      categories: ['错题本', '使用指南', '知识库', '帮助'],
      categoryIndex: 2,
      statusIndex: 0,
      newKeyword: ''
    };
  },

  computed: {
    canProceed() {
      return this.inputContent.length >= 10 || this.filePath;
    }
  },

  methods: {
    chooseFile() {
      uni.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['.docx', '.xlsx', '.xls'],
        success: (res) => {
          const file = res.tempFiles[0];
          this.filePath = file.path;
          this.fileName = file.name;
          this.inputContent = ''; // 清空文本输入
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

    async extractMetadata() {
      if (!this.canProceed) {
        uni.showToast({ title: '请输入内容或上传文件', icon: 'none' });
        return;
      }

      this.step = 2;

      try {
        let content = this.inputContent;

        // 如果上传了文件，先解析文件内容
        if (this.filePath) {
          content = await this.parseFile();
        }

        const res = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'smartImportKnowledge',
            payload: {
              content: content,
              useAI: true
            }
          }
        });

        const result = res.result.data;
        if (!result || !result.category) {
          throw new Error('AI 返回数据格式错误');
        }

        this.preview = result;
        this.categoryIndex = this.categories.indexOf(result.category);
        if (this.categoryIndex === -1) {
          // 新分类，添加到列表
          this.categories.push(result.category);
          this.categoryIndex = this.categories.length - 1;
        }
        this.step = 3;
      } catch (error) {
        uni.showModal({
          title: '提取失败',
          content: error.message || '请检查网络或手动填写',
          showCancel: false
        });
        this.step = 1;
      }
    },

    async parseFile() {
      try {
        // 上传文件到云存储
        const uploadResult = await uniCloud.uploadFile({
          filePath: this.filePath,
          cloudPath: `temp/${Date.now()}_${this.fileName}`
        });

        // 调用云函数解析文件
        const res = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'parseDocumentFile',
            payload: { fileID: uploadResult.fileID }
          }
        });

        return res.result.data.content || res.result.data || '';
      } catch (error) {
        throw new Error('文件解析失败: ' + error.message);
      }
    },

    onCategoryChange(e) {
      this.categoryIndex = e.detail.value;
      this.preview.category = this.categories[this.categoryIndex];
    },

    onStatusChange(e) {
      this.statusIndex = e.detail.value;
    },

    addKeyword() {
      if (this.newKeyword.trim() && !this.preview.keywords.includes(this.newKeyword.trim())) {
        this.preview.keywords.push(this.newKeyword.trim());
        this.newKeyword = '';
      }
    },

    removeKeyword(idx) {
      this.preview.keywords.splice(idx, 1);
    },

    async saveKnowledge() {
      if (!this.preview.title.trim()) {
        uni.showToast({ title: '请输入标题', icon: 'none' });
        return;
      }

      try {
        uni.showLoading({ title: '保存中...' });
        await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'createKnowledge',
            payload: {
              title: this.preview.title,
              category: this.preview.category,
              keywords: this.preview.keywords,
              content: this.preview.content,
              status: this.statusIndex === 0 ? 'draft' : 'published'
            }
          }
        });

        uni.hideLoading();
        uni.showToast({ title: '保存成功', icon: 'success' });
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
.smart-import-page {
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
  transition: all 0.3s;
}

.step.active .step-num {
  background: #0f766e;
  color: #fff;
}

.step.done .step-num {
  background: #10b981;
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
  transition: all 0.3s;
}

.step-line.active {
  background: #10b981;
}

.step-content {
  padding: 32rpx;
}

.input-section {
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

.content-input {
  width: 100%;
  min-height: 500rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.6;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.char-count {
  text-align: right;
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 8rpx;
}

.divider {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 32rpx 0;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: #e5e7eb;
}

.divider-text {
  font-size: 24rpx;
  color: #9ca3af;
}

.upload-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
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

.preview-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.form-group {
  margin-bottom: 24rpx;
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

.form-input, .form-picker {
  width: 100%;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.keywords-input {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 16rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.keyword-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: #0f766e;
  color: #fff;
  border-radius: 32rpx;
  font-size: 24rpx;
}

.remove-kw {
  padding: 4rpx;
}

.add-kw-input {
  flex: 1;
  min-width: 120rpx;
  font-size: 28rpx;
  background: transparent;
  border: none;
}

.content-preview {
  padding: 20rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #6b7280;
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
