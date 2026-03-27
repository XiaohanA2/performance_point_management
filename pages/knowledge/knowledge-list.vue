<template>
  <view class="knowledge-list-page">
    <!-- 页面标题栏 -->
    <view class="page-header">
      <view class="header-left">
        <text class="page-title">知识库</text>
        <text class="page-subtitle">共 {{ filteredList.length }} 条内容</text>
      </view>
      <button
        v-if="canManageKnowledge"
        class="manage-btn"
        @click="gotoManage"
      >
        <uni-icons type="gear" :size="18" color="#fff" />
        管理知识库
      </button>
    </view>

    <!-- 搜索和筛选栏 -->
    <view v-if="isLoggedIn" class="filter-section">
      <!-- 搜索框 -->
      <view class="search-bar">
        <uni-icons type="search" :size="18" color="#999" class="search-icon" />
        <input
          class="search-input"
          placeholder="搜索标题、关键词"
          v-model="searchKeyword"
          @input="onSearchInput"
        />
        <view v-if="searchKeyword" class="clear-btn" @click="clearSearch">
          <uni-icons type="clear" :size="16" color="#999" />
        </view>
      </view>

      <!-- 筛选和排序 -->
      <view class="filter-bar">
        <view class="filter-left">
          <text class="filter-label">分类</text>
          <view class="category-filter-wrap">
            <view class="category-chips" :class="{ expanded: categoryFilterExpanded }">
              <view
                class="category-chip-inline"
                :class="{ active: selectedCategory === '' }"
                @click="selectCategory('')"
              >全部</view>
              <view
                class="category-chip-inline"
                :class="{ active: selectedCategory === category }"
                v-for="category in categories"
                :key="category"
                @click="selectCategory(category)"
              >{{ category }}</view>
            </view>
            <view class="category-filter-toggle" :class="{ rotated: categoryFilterExpanded }" @click="categoryFilterExpanded = !categoryFilterExpanded">
              <uni-icons type="arrowup" :size="14" color="#64748b" />
            </view>
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
    <view v-if="!loading && filteredList.length > 0" class="submission-list">
      <!-- 游客提示卡片 -->
      <view v-if="!isLoggedIn" class="guest-notice-card" @click="gotoLogin">
        <view class="guest-notice-icon">
          <uni-icons type="locked" :size="48" color="#0f766e" />
        </view>
        <view class="guest-notice-content">
          <text class="guest-notice-title">登录后查看完整知识库</text>
          <text class="guest-notice-desc">海量知识内容等你探索</text>
        </view>
        <view class="guest-notice-btn">
          <uni-icons type="forward" :size="20" color="#0f766e" />
        </view>
      </view>

      <!-- 知识库卡片列表（游客不显示） -->
      <view
        v-if="isLoggedIn"
        class="knowledge-card"
        v-for="(item, index) in filteredList"
        :key="item._id"
      >
        <view class="knowledge-card__bar" />
        <view class="knowledge-card__body" @click="toggleExpand(item._id, item.content)">
          <view class="knowledge-card__info">
            <view class="knowledge-card__info-content">
              <view class="title-row">
                <rich-text class="knowledge-card__title" :nodes="highlightText(item.title)"></rich-text>
                <uni-icons
                  v-if="item.content"
                  :type="expandedItems[item._id] ? 'arrowup' : 'arrowdown'"
                  :size="24"
                  color="#999"
                  class="expand-icon"
                />
              </view>
              <view class="knowledge-keywords" v-if="item.keywords && item.keywords.length || item.category">
                <text class="keyword-tag category-tag">{{ item.category }}</text>
                <text
                  class="keyword-tag"
                  v-for="(keyword, kIndex) in item.keywords"
                  :key="kIndex"
                >
                  {{ keyword }}
                </text>
                <text class="knowledge-views-inline">{{ item.views || 0 }}次查看</text>
              </view>
            </view>
          </view>

          <!-- 展开的详情内容 -->
          <view v-if="expandedItems[item._id] && item.content" class="knowledge-detail">
            <view class="detail-content">
              <rich-text :nodes="highlightText(parseMarkdown(item.content))"></rich-text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading" class="empty-state">
      <view class="empty-icon">
        <uni-icons type="info" size="48" color="#cbd5f5" />
      </view>
      <text class="empty-text">{{ allKnowledgeList.length === 0 ? '暂无知识库内容' : '未找到相关内容' }}</text>
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
      searchKeyword: '',
      selectedCategory: '',
      categories: [],
      allKnowledgeList: [],
      loading: false,
      expandedItems: {}, // 记录展开状态
      viewedItems: {}, // 记录已查看的项目（避免重复计数）
      currentUser: null,
      canManageKnowledge: false, // 是否有管理权限
      sortBy: 'name', // 'name', 'date', 'priority'
      sortOrder: 'asc', // 'asc' 或 'desc'
      sortOptions: ['标题排序', '最新发布', '最早发布'],
      currentSortIndex: 0,
      categoryFilterExpanded: false
    };
  },

  computed: {
    isLoggedIn() {
      return this.currentUser && this.currentUser.role !== 'guest';
    },

    filteredList() {
      let filtered = this.allKnowledgeList;

      // 搜索关键词筛选和相关度计算
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();

        // 计算相关度分数
        filtered = filtered.map(item => {
          let score = 0;
          const title = item.title.toLowerCase();
          const content = (item.content || '').toLowerCase();

          // 标题完全匹配：100分
          if (title === keyword) score += 100;
          // 标题包含关键词：50分
          else if (title.includes(keyword)) score += 50;

          // 关键词数组匹配：每个匹配+30分
          if (item.keywords && item.keywords.length) {
            item.keywords.forEach(k => {
              if (k.toLowerCase() === keyword) score += 30;
              else if (k.toLowerCase().includes(keyword)) score += 15;
            });
          }

          // 正文包含关键词：10分
          if (content.includes(keyword)) score += 10;

          return { ...item, _searchScore: score };
        }).filter(item => item._searchScore > 0);

        // 按相关度排序
        filtered.sort((a, b) => b._searchScore - a._searchScore);
      }

      // 分类筛选
      if (this.selectedCategory) {
        filtered = filtered.filter(item => item.category === this.selectedCategory);
      }

      // 如果没有搜索关键词，按用户选择的排序方式排序
      if (!this.searchKeyword) {
        const sorted = [...filtered].sort((a, b) => {
          if (this.sortBy === 'name') {
            // 提取标题中的中文数字进行排序
            const getNumFromTitle = (title) => {
              const match = title.match(/错误([一二三四五六七八九十]+)/);
              if (!match) return -1; // 非错误类排在前面
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
          } else if (this.sortBy === 'date') {
            // 按发布日期排序
            const dateA = a.createdAt || 0;
            const dateB = b.createdAt || 0;
            return this.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          } else {
            // 优先级排序
            const priorityA = a.priority || 0;
            const priorityB = b.priority || 0;
            if (priorityA !== priorityB) {
              return priorityB - priorityA;
            }
            return (b.createdAt || 0) - (a.createdAt || 0);
          }
        });
        return sorted;
      }

      return filtered;
    }
  },

  onLoad() {
    this.currentUser = StoreService.getCurrentUser();
    this.canManageKnowledge = checkOperationPermission('knowledge_manage');
    this.loadKnowledgeList();
  },

  onShow() {
    this.loadKnowledgeList();
  },

  methods: {
    async loadKnowledgeList() {
      this.loading = true;

      try {
        const res = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'searchKnowledge',
            payload: {
              keyword: '',
              category: '',
              limit: 1000
            }
          }
        });

        this.allKnowledgeList = res.result.data || [];
        this.categories = [...new Set(this.allKnowledgeList.map(item => item.category))];
      } catch (error) {
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    onSearchInput() {
      // 搜索时自动触发筛选（已通过computed实现）
    },

    clearSearch() {
      this.searchKeyword = '';
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

    resetFilters() {
      this.searchKeyword = '';
      this.selectedCategory = '';
      this.sortBy = 'name';
      this.sortOrder = 'asc';
      this.currentSortIndex = 0;
    },

    setSort(sortBy, sortOrder) {
      this.sortBy = sortBy;
      this.sortOrder = sortOrder;
    },

    selectCategory(category) {
      this.selectedCategory = category;
    },

    toggleExpand(id, hasContent) {
      // 只有在有内容时才允许展开
      if (!hasContent) return;

      // 游客只能展开第一条
      if (!this.isLoggedIn && this.filteredList.length > 0 && id !== this.filteredList[0]._id) {
        return;
      }

      const isExpanding = !this.expandedItems[id];

      // 切换展开/折叠状态
      this.$set(this.expandedItems, id, isExpanding);

      // 如果是展开操作且之前未查看过，则增加查看次数
      if (isExpanding && !this.viewedItems[id]) {
        this.$set(this.viewedItems, id, true);
        this.incrementViews(id);
      }
    },

    async incrementViews(id) {
      try {
        await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'incrementKnowledgeViews',
            payload: { id }
          }
        });
      } catch (error) {
        console.error('增加查看次数失败:', error);
      }
    },

    gotoEdit(item) {
      uni.navigateTo({
        url: `/pages/knowledge/knowledge-admin?id=${item._id}`
      });
    },

    gotoManage() {
      uni.navigateTo({
        url: '/pages/knowledge/knowledge-admin'
      });
    },

    gotoLogin() {
      uni.navigateTo({
        url: '/pages/login/login'
      });
    },

    // 高亮搜索关键词
    highlightText(text) {
      if (!this.searchKeyword || !text) return text;

      const keyword = this.searchKeyword.trim();
      if (!keyword) return text;

      // 转义特殊字符
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedKeyword})`, 'gi');

      return text.replace(regex, '<span style="color: #0f766e; font-weight: 600; background-color: rgba(15, 118, 110, 0.1); padding: 0 4rpx; border-radius: 2rpx;">$1</span>');
    },

    parseMarkdown
  }
};
</script>

<style scoped>
.knowledge-list-page {
  min-height: 100vh;
  background: #F5F7FA;
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

.header-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
}

.page-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
}

.page-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
}

.manage-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 28rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.35);
  border-radius: 32rpx;
  color: #fff;
  font-size: 26rpx;
  flex-shrink: 0;
}

/* ===== Filter Section ===== */
.filter-section {
  background-color: #fff;
  padding: 20rpx 30rpx 16rpx;
  border-bottom: 1rpx solid #EBEEF5;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: #F5F7FA;
  border-radius: 40rpx;
  padding: 0 24rpx;
  height: 72rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #EBEEF5;
}

.search-icon {
  margin-right: 12rpx;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
  height: 100%;
}

.clear-btn {
  padding: 8rpx;
  margin-left: 8rpx;
  flex-shrink: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.filter-left {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  min-width: 0;
}

.filter-label {
  font-size: 24rpx;
  color: #909399;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 52rpx;
}

.category-filter-wrap {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  min-width: 0;
}

.category-chips {
  flex: 1;
  display: flex;
  flex-wrap: nowrap;
  gap: 10rpx;
  overflow: hidden;
  max-height: 52rpx;
}

.category-chips.expanded {
  flex-wrap: wrap;
  max-height: none;
}

.category-filter-toggle {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 50%;
  transform: rotate(180deg);
  transition: transform 0.2s;
  margin-top: 4rpx;
}

.category-filter-toggle.rotated {
  transform: rotate(0deg);
}

.category-chip-inline {
  display: inline-block;
  padding: 8rpx 22rpx;
  font-size: 24rpx;
  color: #606266;
  background-color: #F5F7FA;
  border-radius: 32rpx;
  white-space: nowrap;
  border: 1rpx solid #EBEEF5;
}

.category-chip-inline.active {
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #0d9488);
  border-color: transparent;
  font-weight: 500;
  box-shadow: 0 2rpx 8rpx rgba(15, 118, 110, 0.3);
}

.sort-dropdown {
  flex-shrink: 0;
}

.sort-picker {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 18rpx;
  background-color: #F5F7FA;
  border-radius: 32rpx;
  border: 1rpx solid #EBEEF5;
  white-space: nowrap;
}

.sort-text {
  font-size: 24rpx;
  color: #606266;
}

/* ===== List ===== */
.submission-list {
  padding: 24rpx 30rpx 30rpx;
}

.knowledge-card {
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
  position: relative;
}

/* 游客提示卡片 */
.guest-notice-card {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(15, 118, 110, 0.15);
  border: 2rpx solid #a7f3d0;
}

.guest-notice-icon {
  flex-shrink: 0;
}

.guest-notice-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.guest-notice-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f766e;
}

.guest-notice-desc {
  font-size: 24rpx;
  color: #0d9488;
}

.guest-notice-btn {
  flex-shrink: 0;
}

.knowledge-card__bar {
  width: 8rpx;
  height: 100%;
  background: linear-gradient(180deg, #0f766e, #0ea5e9);
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 4rpx 0 0 4rpx;
}

.knowledge-card__body {
  padding: 24rpx 24rpx 20rpx 32rpx;
  position: relative;
}

.knowledge-card__info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.knowledge-card__info-content {
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14rpx;
  gap: 12rpx;
}

.knowledge-card__title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
  line-height: 1.5;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.expand-icon {
  flex-shrink: 0;
  margin-top: 4rpx;
}

.knowledge-keywords {
  display: flex;
  flex-wrap: nowrap;
  gap: 8rpx;
  align-items: center;
  overflow: hidden;
}

.keyword-tag {
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  color: #909399;
  background-color: #F5F7FA;
  border-radius: 6rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

.keyword-more {
  color: #0f766e;
  background-color: rgba(15, 118, 110, 0.08);
  border: 1rpx solid rgba(15, 118, 110, 0.2);
  font-weight: 500;
}

.category-tag {
  color: #0f766e;
  background-color: rgba(15, 118, 110, 0.08);
  font-weight: 500;
  border: 1rpx solid rgba(15, 118, 110, 0.2);
}

.knowledge-views-inline {
  font-size: 20rpx;
  color: #C0C4CC;
  margin-left: auto;
}

.knowledge-detail {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F5F7FA;
}

.detail-content {
  font-size: 26rpx;
  line-height: 1.7;
  color: #606266;
}

/* ===== Empty ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 60rpx;
}

.empty-icon {
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #909399;
  text-align: center;
}
</style>
