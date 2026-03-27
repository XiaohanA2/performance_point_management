<template>
  <view class="knowledge-detail-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <uni-icons type="loading" size="48" color="#0f766e" />
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 知识库内容 -->
    <view v-else-if="knowledge" class="detail-container">
      <!-- 页面头部 -->
      <view class="page-header">
        <button class="back-btn" @click="goBack">
          <uni-icons type="arrowleft" :size="20" color="#fff" />
        </button>
        <view class="header-right">
          <button v-if="canManage" class="edit-btn" @click="gotoEdit">
            <uni-icons type="compose" :size="18" color="#fff" />
            编辑
          </button>
        </view>
      </view>

      <scroll-view scroll-y class="content-scroll">
        <!-- 知识库内容 -->
        <view class="knowledge-content">
          <!-- 分类标签 -->
          <view class="meta-section">
            <view class="category-tag">{{ knowledge.category }}</view>
            <text class="views-count">{{ knowledge.views || 0 }}次查看</text>
          </view>

          <!-- 标题 -->
          <view class="title">{{ knowledge.title }}</view>

          <!-- 关键词 -->
          <view class="keywords-section" v-if="knowledge.keywords && knowledge.keywords.length">
            <text
              v-for="(keyword, index) in knowledge.keywords"
              :key="index"
              class="keyword-tag"
            >
              {{ keyword }}
            </text>
          </view>

          <!-- 内容 -->
          <view class="content-body">
            <rich-text :nodes="parsedContent"></rich-text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 错误状态 -->
    <view v-else class="error-state">
      <uni-icons type="info" size="80" color="#cbd5f5" />
      <text class="error-text">知识库内容不存在</text>
      <button class="retry-btn" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import { checkOperationPermission } from '../../utils/permission-guard.js';
import { parseMarkdown } from '../../utils/markdown-parser.js';

export default {
  data() {
    return {
      id: '',
      knowledge: null,
      loading: true,
      canManage: false
    };
  },

  computed: {
    parsedContent() {
      if (!this.knowledge || !this.knowledge.content) return '';
      return parseMarkdown(this.knowledge.content);
    }
  },

  onLoad(options) {
    this.id = options.id;
    this.checkPermission();
    this.loadDetail();
  },

  methods: {
    checkPermission() {
      this.canManage = checkOperationPermission('knowledge_manage');
    },

    async loadDetail() {
      this.loading = true;

      try {
        const res = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'getKnowledgeDetail',
            payload: { id: this.id }
          }
        });

        this.knowledge = res.result.data;
      } catch (error) {
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    goBack() {
      // 返回到列表页
      uni.navigateBack({
        fail: () => {
          // 如果无法返回（比如从其他页面直接跳转来的），则跳转到列表页
          uni.redirectTo({
            url: '/pages/knowledge/knowledge-list'
          });
        }
      });
    },

    gotoEdit() {
      uni.navigateTo({
        url: `/pages/knowledge/knowledge-admin?id=${this.id}`
      });
    }
  }
};
</script>

<style scoped>
.knowledge-detail-page {
  height: 100vh;
  background: #F5F7FA;
}

/* ===== States ===== */
.loading-state,
.error-state {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.loading-text,
.error-text {
  font-size: 28rpx;
  color: #909399;
}

.retry-btn {
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #0f766e, #0d9488);
  color: #fff;
  border: none;
  border-radius: 32rpx;
  font-size: 28rpx;
  box-shadow: 0 4rpx 12rpx rgba(15, 118, 110, 0.3);
}

/* ===== Layout ===== */
.detail-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===== Header ===== */
.page-header {
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  padding: 36rpx 30rpx 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(15, 118, 110, 0.25);
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  padding: 0;
}

.header-right {
  display: flex;
  gap: 16rpx;
}

.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 28rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.35);
  border-radius: 32rpx;
  color: #fff;
  font-size: 26rpx;
}

/* ===== Scroll Content ===== */
.content-scroll {
  flex: 1;
  overflow-y: auto;
}

.knowledge-content {
  padding: 24rpx 30rpx 40rpx;
}

/* ===== Meta (category + views) ===== */
.meta-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.category-tag {
  padding: 8rpx 22rpx;
  font-size: 24rpx;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #0d9488);
  border-radius: 8rpx;
  font-weight: 500;
  box-shadow: 0 2rpx 8rpx rgba(15, 118, 110, 0.25);
}

.views-count {
  font-size: 24rpx;
  color: #C0C4CC;
}

/* ===== Title ===== */
.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #303133;
  line-height: 1.5;
  margin-bottom: 20rpx;
}

/* ===== Keywords ===== */
.keywords-section {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 28rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #EBEEF5;
}

.keyword-tag {
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  color: #0f766e;
  background: rgba(15, 118, 110, 0.08);
  border-radius: 8rpx;
  border: 1rpx solid rgba(15, 118, 110, 0.2);
}

/* ===== Content Body ===== */
.content-body {
  font-size: 30rpx;
  line-height: 1.9;
  color: #606266;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.content-body >>> h1 {
  font-size: 40rpx;
  font-weight: 700;
  color: #303133;
  margin: 40rpx 0 24rpx;
}

.content-body >>> h2 {
  font-size: 36rpx;
  font-weight: 600;
  color: #303133;
  margin: 32rpx 0 20rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #0f766e;
}

.content-body >>> h3 {
  font-size: 32rpx;
  font-weight: 600;
  color: #606266;
  margin: 28rpx 0 16rpx;
}

.content-body >>> p {
  margin: 20rpx 0;
  line-height: 1.9;
}

.content-body >>> strong {
  font-weight: 700;
  color: #303133;
}

.content-body >>> code {
  background: #F5F7FA;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  font-size: 26rpx;
  font-family: monospace;
  color: #0f766e;
}

.content-body >>> li {
  margin-left: 40rpx;
  margin-bottom: 12rpx;
  line-height: 1.7;
}

.content-body >>> hr {
  border: none;
  border-top: 1rpx solid #EBEEF5;
  margin: 32rpx 0;
}
</style>
