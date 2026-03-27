<template>
  <view class="knowledge-edit-page">
    <view class="editor-header">
      <view class="header-title">
        <text class="page-title">{{ isEdit ? '编辑知识库' : '新增知识库' }}</text>
      </view>
      <view class="header-actions">
        <button class="ghost-btn" @click="save(true)">
          保存草稿
        </button>
        <button class="primary-btn" @click="save(false)">
          发布
        </button>
      </view>
    </view>

    <scroll-view scroll-y class="editor-body">
      <view class="form-section">
        <view class="form-group">
          <text class="form-label required">标题</text>
          <textarea
            class="form-input"
            v-model="form.title"
            placeholder="请输入知识库标题"
            maxlength="100"
            auto-height
            :show-confirm-bar="false"
          />
        </view>

        <view class="form-group">
          <text class="form-label required">分类</text>
          <picker
            mode="selector"
            :range="categories"
            :value="categories.indexOf(form.category)"
            @change="onCategoryChange"
          >
            <view class="form-picker">
              {{ form.category || '请选择分类' }}
              <uni-icons type="arrowdown" :size="14" color="#999" />
            </view>
          </picker>
        </view>

        <view class="form-group">
          <text class="form-label">关键词</text>
          <textarea
            class="form-input"
            v-model="keywordInput"
            placeholder="多个关键词用逗号分隔，如：个贷,身份证,收入证明"
            auto-height
            :show-confirm-bar="false"
          />
          <text class="form-tip">关键词将用于搜索匹配</text>
        </view>

        <view class="form-group">
          <text class="form-label required">内容</text>
          <view class="markdown-toolbar">
            <view class="toolbar-btn" @click="insertMarkdown('bold')">
              <text class="toolbar-icon">B</text>
            </view>
            <view class="toolbar-btn" @click="insertMarkdown('italic')">
              <text class="toolbar-icon italic">I</text>
            </view>
            <view class="toolbar-btn" @click="insertMarkdown('heading')">
              <text class="toolbar-text">H</text>
            </view>
            <view class="toolbar-btn" @click="insertMarkdown('list')">
              <uni-icons type="list" :size="16" color="#666" />
            </view>
            <view class="toolbar-btn" @click="insertMarkdown('code')">
              <text class="toolbar-text">{{ '<' }}/{{ '>' }}</text>
            </view>
            <view class="toolbar-btn" @click="insertMarkdown('link')">
              <uni-icons type="link" :size="16" color="#666" />
            </view>
          </view>
          <textarea
            id="contentTextarea"
            class="form-textarea"
            v-model="form.content"
            placeholder="支持Markdown格式：**加粗**、*斜体*、### 标题、- 列表等"
            :maxlength="-1"
            @focus="onContentFocus"
            @blur="onContentBlur"
          ></textarea>
          <text class="form-tip">支持Markdown语法格式化内容</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import { KNOWLEDGE_CATEGORIES } from '../../constants/permission-constants.js';

export default {
  data() {
    return {
      isEdit: false,
      editId: '',
      form: {
        title: '',
        category: '',
        keywords: [],
        content: '',
        status: 'draft',
        priority: 5
      },
      keywordInput: '',
      categories: KNOWLEDGE_CATEGORIES,
      cursorPosition: 0,
      contentFocused: false
    };
  },

  onLoad(options) {
    if (options.id) {
      this.isEdit = true;
      this.editId = options.id;
      this.loadItem(options.id);
    } else {
      this.form.category = this.categories[0] || '';
    }
  },

  methods: {
    async loadItem(id) {
      try {
        uni.showLoading({ title: '加载中...' });
        const res = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'getKnowledgeDetail',
            payload: { id }
          }
        });

        const item = res.result.data;
        if (item) {
          this.form = {
            title: item.title,
            category: item.category,
            keywords: item.keywords || [],
            content: item.content,
            status: item.status,
            priority: item.priority || 5
          };
          this.keywordInput = (item.keywords || []).join(',');
        }
        uni.hideLoading();
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: '加载失败', icon: 'none' });
      }
    },

    onCategoryChange(e) {
      const index = e.detail.value;
      this.form.category = this.categories[index];
    },

    async save(isDraft) {
      if (!this.form.title || !this.form.content) {
        uni.showToast({ title: '请填写标题和内容', icon: 'none' });
        return;
      }

      this.form.keywords = this.keywordInput
        .split(',')
        .map(k => k.trim())
        .filter(k => k);
      this.form.status = isDraft ? 'draft' : 'published';

      try {
        uni.showLoading({ title: '保存中...' });
        const user = StoreService.getCurrentUser();

        const res = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: this.isEdit ? 'updateKnowledge' : 'createKnowledge',
            payload: {
              ...this.form,
              id: this.editId,
              userId: user.id
            }
          }
        });

        uni.hideLoading();

        const result = res.result.data || res.result;
        if (result.success || !res.result.error) {
          uni.showToast({ title: '保存成功', icon: 'success' });

          // 刷新知识库缓存
          await StoreService.bootstrap({ force: true });

          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        } else {
          uni.showToast({ title: res.result.error || '保存失败', icon: 'none' });
        }
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    },

    onContentFocus() {
      this.contentFocused = true;
    },

    onContentBlur(e) {
      this.contentFocused = false;
      this.cursorPosition = e.detail.cursor || 0;
    },

    insertMarkdown(type) {
      const textarea = uni.createSelectorQuery().select('#contentTextarea');
      let insertText = '';
      let cursorOffset = 0;

      switch (type) {
        case 'bold':
          insertText = '****';
          cursorOffset = 2;
          break;
        case 'italic':
          insertText = '**';
          cursorOffset = 1;
          break;
        case 'heading':
          insertText = '### ';
          cursorOffset = 4;
          break;
        case 'list':
          insertText = '\n- ';
          cursorOffset = 3;
          break;
        case 'code':
          insertText = '```\n\n```';
          cursorOffset = 4;
          break;
        case 'link':
          insertText = '[](url)';
          cursorOffset = 1;
          break;
      }

      const content = this.form.content || '';
      const pos = this.cursorPosition;
      this.form.content = content.slice(0, pos) + insertText + content.slice(pos);
      this.cursorPosition = pos + cursorOffset;
    }
  }
};
</script>

<style scoped>
.knowledge-edit-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
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

.page-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
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

.primary-btn {
  padding: 12rpx 24rpx;
  background: #fff;
  border: none;
  border-radius: 32rpx;
  color: #0f766e;
  font-size: 26rpx;
  font-weight: 600;
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
  border-radius: 0 0 12rpx 12rpx;
  border-top: none;
  box-sizing: border-box;
  resize: none;
}

.form-tip {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #9ca3af;
}

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
</style>