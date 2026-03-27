<template>
  <view class="questionnaire-list-container">
    <!-- 顶部标题栏 -->
    <view class="header">
      <view class="header-left">
        <view class="header-title">
          <uni-icons type="compose" size="20" color="#3B82F6"></uni-icons>
          <text>问卷调查</text>
        </view>
        <text class="header-subtitle">共 {{ filteredList.length }} 条问卷</text>
      </view>

      <!-- 管理员入口按钮 -->
      <view class="header-right">
        <button
          v-if="showAdminButton"
          class="admin-entry-btn"
          @click="createQuestionnaire"
        >
          <uni-icons type="plusempty" size="16" color="#fff"></uni-icons>
          <text>新增问卷</text>
        </button>
        <button class="query-entry-btn" @click="gotoQueryRecords">
          <uni-icons type="search" size="16" color="#3B82F6"></uni-icons>
          <text>查询记录</text>
        </button>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="tabs" v-if="isAdmin">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'all' }"
        @click="switchTab('all')"
      >
        全部
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'published' }"
        @click="switchTab('published')"
      >
        已发布
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'draft' }"
        @click="switchTab('draft')"
      >
        草稿
      </view>
    </view>

    <!-- 问卷列表 -->
    <view class="questionnaire-list">
      <!-- 空状态 -->
      <view class="empty-state" v-if="!loading && filteredList.length === 0">
        <uni-icons type="folder-add" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">暂无问卷</text>
      </view>

      <!-- 查询记录提示 -->
      <view class="query-tip" v-if="!loading && filteredList.length > 0">
        <uni-icons type="info" size="14" color="#0369A1"></uni-icons>
        <text>点击右上角「查询记录」可查看您的提交内容及管理员回复</text>
      </view>

      <!-- 问卷卡片 -->
      <view
        class="questionnaire-card"
        v-for="item in filteredList"
        :key="item._id"
        @click="viewQuestionnaire(item)"
      >
        <!-- 问卷状态标签（管理员显示草稿/已发布/已关闭；所有人显示进行中/已过期） -->
        <view class="card-header">
          <view class="status-badge" :style="{ backgroundColor: getStatusColor(item.status) }" v-if="isAdmin">
            {{ getStatusText(item.status) }}
          </view>
        </view>

        <!-- 问卷标题行（标题+状态） -->
        <view class="card-title-row">
          <view class="card-title">{{ item.title }}</view>
          <view class="remaining-days" v-if="item.status === 'published'">
            <text :class="isExpired(item) ? 'expired-text' : 'active-text'">{{ getRemainingDaysText(item) }}</text>
          </view>
        </view>

        <!-- 问卷描述 -->
        <view class="card-description">{{ item.description || '暂无描述' }}</view>

        <!-- 问卷信息 -->
        <view class="card-info">
          <view class="info-item">
            <uni-icons type="list" size="14" color="#909399"></uni-icons>
            <text>{{ visibleQuestionCount(item) }} 个问题</text>
          </view>
        </view>

        <!-- 问卷时间 -->
        <view class="card-footer">
          <view class="time-info">
            <text v-if="item.startDate">开始：{{ formatDate(item.startDate) }}</text>
            <text v-if="item.endDate">截止：{{ formatDate(item.endDate) }}</text>
          </view>
        </view>

        <!-- 管理员操作按钮 -->
        <view class="card-actions" v-if="isAdmin" @click.stop>
          <view class="action-row">
            <button class="action-btn icon-only" size="mini" @click="moveQuestionnaire(item, -1)" :disabled="isFirstInList(item)">
              <uni-icons type="up" size="14"></uni-icons>
            </button>
            <button class="action-btn icon-only" size="mini" @click="moveQuestionnaire(item, 1)" :disabled="isLastInList(item)">
              <uni-icons type="down" size="14"></uni-icons>
            </button>
            <button class="action-btn" size="mini" type="default" @click="editQuestionnaire(item)">
              <uni-icons type="compose" size="14"></uni-icons>
              编辑问卷
            </button>
            <button class="action-btn" size="mini" type="default" @click="exportData(item)" :disabled="item.exporting">
              <uni-icons type="download" size="14"></uni-icons>
              {{ item.exporting ? '生成中…' : '导出数据' }}
            </button>
          </view>
          <view class="action-row">
            <button
              class="action-btn"
              :class="canViewResponses(item) ? 'primary' : 'disabled'"
              size="mini"
              @click="viewResponses(item)"
            >
              <uni-icons type="eye" size="14" :color="canViewResponses(item) ? '#fff' : '#C0C4CC'"></uni-icons>
              查看回复 ({{ item.responseCount || 0 }})
            </button>
            <button class="action-btn danger" size="mini" @click="deleteQuestionnaire(item)">
              <uni-icons type="trash" size="14"></uni-icons>
              删除
            </button>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="hasMore && !loading">
        <text @click="loadMore">加载更多</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 编辑时间弹窗 -->
    <uni-popup ref="timePopup" type="dialog">
      <view class="time-popup">
        <view class="popup-title">编辑有效时间</view>
        <view class="time-form">
          <view class="form-item">
            <text class="form-label">开始时间</text>
            <picker
              mode="date"
              :value="editingStartDate"
              @change="onStartDateChange"
            >
              <view class="picker-value">
                {{ editingStartDate || '选择日期' }}
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">截止时间</text>
            <picker
              mode="date"
              :value="editingEndDate"
              @change="onEndDateChange"
            >
              <view class="picker-value">
                {{ editingEndDate || '选择日期' }}
              </view>
            </picker>
          </view>
        </view>
        <view class="popup-actions">
          <button class="btn-cancel" @click="cancelEditTime">取消</button>
          <button class="btn-confirm" @click="confirmEditTime">保存</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { getQuestionnaires, updateQuestionnaire, exportQuestionnaireData } from '../../services/questionnaire-service.js';
import { hasAnyRole, ROLES } from '../../services/permission-service.js';

export default {
  name: 'QuestionnaireList',
  data() {
    return {
      loading: false,
      questionnaires: [],
      activeTab: 'all',
      hasMore: false,
      isAdmin: false,
      showAdminButton: false,
      currentUser: null,
      currentPage: 1,
      pageSize: 20,
      isSuperAdmin: false,
      editingQuestionnaire: null,
      editingStartDate: '',
      editingEndDate: '',
      initialized: false
    };
  },

  onLoad() {
    this.checkPermission();
  },

  onShow() {
    if (!this.initialized) {
      this.initialized = true;
      this.loadQuestionnaires();
    } else {
      this.loadQuestionnaires(true);
    }
  },

  onPullDownRefresh() {
    this.refresh();
  },

  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.loadMore();
    }
  },

  methods: {
    /**
     * 检查用户权限
     */
    checkPermission() {
      // store.js 用 JSON.stringify 存储，需要 JSON.parse 读取
      const parseStorage = (key) => {
        try {
          const raw = uni.getStorageSync(key);
          if (!raw) return null;
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
          return null;
        }
      };

      let user = parseStorage('perf_current_user') || parseStorage('currentUser');

      // 即使未登录也允许访问问卷列表
      this.currentUser = user || null;

      // 只有登录用户才检查管理权限
      if (user) {
        // 兼容 role 字符串和 roles 数组
        if (user.role && !user.roles) {
          this.currentUser.roles = [user.role];
        }

        // 检查是否显示管理按钮（只有超管和问卷管理员）
        this.showAdminButton = hasAnyRole(this.currentUser, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN]);
        this.isAdmin = this.showAdminButton;

        // 检查是否是超级管理员
        this.isSuperAdmin = hasAnyRole(this.currentUser, [ROLES.SUPER_ADMIN]);
      } else {
        // 未登录用户
        this.showAdminButton = false;
        this.isAdmin = false;
        this.isSuperAdmin = false;
      }
    },

    /**
     * 加载问卷列表
     */
    async loadQuestionnaires(refresh = false) {
      if (this.loading) return;

      this.loading = true;

      try {
        if (refresh) {
          this.currentPage = 1;
          this.questionnaires = [];
        }

        // 管理员始终拉取全部，前端按 activeTab 过滤；普通用户不传 status（云函数会限制为 published）
        const data = await getQuestionnaires({});

        if (refresh) {
          this.questionnaires = data;
        } else {
          this.questionnaires = [...this.questionnaires, ...data];
        }

        this.hasMore = data.length >= this.pageSize;
      } catch (error) {
        uni.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
        if (refresh) {
          uni.stopPullDownRefresh();
        }
      }
    },

    /**
     * 刷新列表
     */
    refresh() {
      this.loadQuestionnaires(true);
    },

    /**
     * 加载更多
     */
    loadMore() {
      this.currentPage++;
      this.loadQuestionnaires();
    },

    /**
     * 切换Tab
     */
    switchTab(tab) {
      if (this.activeTab === tab) return;
      this.activeTab = tab;
      this.loadQuestionnaires(true);
    },

    /**
     * 查看问卷详情
     */
    viewQuestionnaire(item) {
      // 过期问卷：提示后不跳转
      if (this.isExpired(item)) {
        uni.showToast({ title: '该问卷已截止，无法填写', icon: 'none', duration: 2000 });
        return;
      }

      // 所有人（包括管理员）点击问卷都进入填写模式
      uni.navigateTo({
        url: `/pages/questionnaire/questionnaire-detail?id=${item._id}&mode=fill`
      });
    },

    isExpired(item) {
      return item.endDate && Date.now() > item.endDate;
    },

    /**
     * 创建问卷（管理员）
     */
    createQuestionnaire() {
      uni.navigateTo({
        url: '/pages/questionnaire/questionnaire-admin?mode=create'
      });
    },

    /**
     * 编辑问卷（管理员）
     */
    editQuestionnaire(item) {
      uni.navigateTo({
        url: `/pages/questionnaire/questionnaire-admin?id=${item._id}&mode=edit`
      });
    },

    /**
     * 查看回复（管理员）
     */
    viewResponses(item) {
      if (!this.canViewResponses(item)) return;
      uni.navigateTo({
        url: `/pages/questionnaire/questionnaire-responses?questionnaireId=${item._id}`
      });
    },

    /**
     * 检查当前用户是否有权限查看该问卷的回复
     */
    visibleQuestionCount(item) {
      if (!item.questions) return 0;
      if (this.isGuest) return item.questions.length;
      const autoFillTypes = ['name', 'branch', 'employeeId', 'idCard', 'idCardLast4', 'phone'];
      return item.questions.filter(q => !q.isPrivate && !autoFillTypes.includes(q.fieldType)).length;
    },

    canViewResponses(item) {
      if (!item.permissions || !item.permissions.viewRoles) return true;
      const role = this.currentUser && this.currentUser.role;
      return role && item.permissions.viewRoles.includes(role);
    },

    /**
     * 跳转到管理页面
     */
    gotoAdminPage() {
      uni.navigateTo({
        url: '/pages/questionnaire/questionnaire-admin'
      });
    },

    /**
     * 跳转到查询记录页面
     */
    gotoQueryRecords() {
      uni.navigateTo({
        url: '/pages/questionnaire/my-submissions'
      });
    },

    gotoLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },

    /**
     * 编辑问卷时间
     */
    editTime(item) {
      this.editingQuestionnaire = item;
      this.editingStartDate = item.startDate ? this.formatDateForPicker(item.startDate) : '';
      this.editingEndDate = item.endDate ? this.formatDateForPicker(item.endDate) : '';
      this.$refs.timePopup.open();
    },

    onStartDateChange(e) {
      this.editingStartDate = e.detail.value;
    },

    onEndDateChange(e) {
      this.editingEndDate = e.detail.value;
    },

    cancelEditTime() {
      this.$refs.timePopup.close();
      this.editingQuestionnaire = null;
      this.editingStartDate = '';
      this.editingEndDate = '';
    },

    async confirmEditTime() {
      if (!this.editingStartDate || !this.editingEndDate) {
        uni.showToast({
          title: '请选择开始和截止时间',
          icon: 'none'
        });
        return;
      }

      const startDate = new Date(this.editingStartDate).getTime();
      const endDate = new Date(this.editingEndDate).getTime();

      if (endDate <= startDate) {
        uni.showToast({
          title: '截止时间必须晚于开始时间',
          icon: 'none'
        });
        return;
      }

      try {
        await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'updateQuestionnaire',
            payload: {
              id: this.editingQuestionnaire._id,
              startDate,
              endDate
            }
          }
        });

        uni.showToast({
          title: '修改成功',
          icon: 'success'
        });

        this.$refs.timePopup.close();
        this.loadQuestionnaires(true);
      } catch (error) {
        uni.showToast({
          title: error.message || '修改失败',
          icon: 'none'
        });
      }
    },

    /**
     * 删除问卷
     */
    deleteQuestionnaire(item) {
      const hasResponses = item.responseCount > 0;
      const content = hasResponses
        ? `确定要删除问卷"${item.title}"吗？该问卷已有 ${item.responseCount} 条提交记录，删除后将一并清除，此操作不可恢复。`
        : `确定要删除问卷"${item.title}"吗？此操作不可恢复。`;

      uni.showModal({
        title: '确认删除',
        content,
        confirmColor: '#F56C6C',
        success: async (res) => {
          if (res.confirm) {
            try {
              await uniCloud.callFunction({
                name: 'appService',
                data: {
                  action: 'deleteQuestionnaire',
                  payload: { id: item._id }
                }
              });

              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });

              this.loadQuestionnaires(true);
            } catch (error) {
              uni.showToast({
                title: error.message || '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },

    formatDateForPicker(timestamp) {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    /**
     * 获取筛选后的问卷列表（根据权限）
     */
    getFilteredList() {
      let list = [];
      // 管理员：按 activeTab 筛选
      if (this.showAdminButton) {
        if (this.activeTab === 'all') list = this.questionnaires;
        else list = this.questionnaires.filter(q => q.status === this.activeTab);
      } else {
        // 普通用户：只看已发布的问卷（包括过期的，让用户看到但点击时提示）
        list = this.questionnaires.filter(q => q.status === 'published');
      }

      // 按 sortOrder 排序（升序），没有 sortOrder 的排最后
      return list.sort((a, b) => {
        const orderA = a.sortOrder ?? 999999;
        const orderB = b.sortOrder ?? 999999;
        return orderA - orderB;
      });
    },

    isFirstInList(item) {
      const list = this.filteredList;
      return list.indexOf(item) === 0;
    },

    isLastInList(item) {
      const list = this.filteredList;
      return list.indexOf(item) === list.length - 1;
    },

    async moveQuestionnaire(item, direction) {
      const list = this.filteredList;
      const currentIndex = list.indexOf(item);
      const targetIndex = currentIndex + direction;

      if (targetIndex < 0 || targetIndex >= list.length) return;

      const targetItem = list[targetIndex];

      // 交换 sortOrder
      const tempOrder = item.sortOrder ?? currentIndex;
      const newOrder = targetItem.sortOrder ?? targetIndex;

      try {
        await updateQuestionnaire(item._id, { sortOrder: newOrder });
        await updateQuestionnaire(targetItem._id, { sortOrder: tempOrder });

        // 更新本地数据
        this.$set(item, 'sortOrder', newOrder);
        this.$set(targetItem, 'sortOrder', tempOrder);

        uni.showToast({ title: '调整成功', icon: 'success' });
      } catch (e) {
        uni.showToast({ title: e.message || '调整失败', icon: 'none' });
      }
    },

    /**
     * 获取状态文本
     */
    getStatusText(status) {
      const map = {
        draft: '草稿',
        published: '已发布',
        closed: '已关闭'
      };
      return map[status] || status;
    },

    /**
     * 获取状态颜色
     */
    getStatusColor(status) {
      const map = {
        draft: '#909399',
        published: '#67C23A',
        closed: '#F56C6C'
      };
      return map[status] || '#909399';
    },

    /**
     * 获取剩余天数文本
     */
    getRemainingDaysText(item) {
      if (!item.endDate) return '进行中';

      const now = Date.now();
      const remaining = item.endDate - now;
      const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));

      if (remaining <= 0 || days < 0) {
        return '已截止';
      } else if (days === 0) {
        return '今天截止';
      } else if (days === 1) {
        return '明天截止';
      } else if (days <= 7) {
        return `${days}天后截止`;
      } else {
        return '进行中';
      }
    },

    /**
     * 格式化日期
     */
    formatDate(timestamp) {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    /**
     * 获取目标角色文本
     */
    getTargetRolesText(roles) {
      const roleNames = {
        [ROLES.MANAGER]: '客户经理',
        [ROLES.LOBBY_MANAGER]: '大堂经理',
        [ROLES.ELASTIC_COUNTER]: '弹性柜面',
        [ROLES.COUNTER_MANAGER]: '柜面经理'
      };

      return roles.map(role => roleNames[role] || role).join('、');
    },

    /**
     * 获取权限文本（管理员可见）
     */
    getPermissionText(permissions) {
      if (!permissions || !permissions.viewRoles) return '';

      const viewRoles = permissions.viewRoles;
      if (viewRoles.includes(ROLES.SUPER_ADMIN) && viewRoles.includes(ROLES.QUESTIONNAIRE_ADMIN)) {
        return '问卷管理员+超管可见';
      } else if (viewRoles.includes(ROLES.SUPER_ADMIN)) {
        return '仅超级管理员可见';
      } else if (viewRoles.includes(ROLES.QUESTIONNAIRE_ADMIN)) {
        return '仅问卷管理员可见';
      }
      return '部分管理员可见';
    },

    /**
     * 初始化问卷系统（仅超级管理员）
     */
    async initSystem() {},

    /**
     * 导出问卷数据为 CSV 并打开分享
     */
    async exportData(item) {
      if (item.exporting) return;
      this.$set(item, 'exporting', true);
      try {
        const result = await exportQuestionnaireData(item._id);
        if (!result || !result.data || result.data.length === 0) {
          uni.showToast({ title: '暂无提交数据', icon: 'none' });
          return;
        }

        // 生成 CSV（UTF-8 BOM，Excel 直接识别中文）
        const headers = Object.keys(result.data[0]);
        const rows = [
          headers.join(','),
          ...result.data.map(row =>
            headers.map(h => {
              const val = String(row[h] == null ? '' : row[h]).replace(/"/g, '""');
              return `"${val}"`;
            }).join(',')
          )
        ];
        const csvContent = '\uFEFF' + rows.join('\r\n');

        // 写入本地临时文件
        const title = (item.title || '问卷').replace(/[/\\:*?"<>|]/g, '_');
        const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '');
        const fileName = `${title}_${date}.csv`;
        const fs = uni.getFileSystemManager();
        const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        fs.writeFileSync(filePath, csvContent, 'utf8');

        // 分享文件给微信好友
        wx.shareFileMessage({
          filePath,
          fileName,
          fail(e) {
            uni.showToast({ title: '分享失败：' + (e.errMsg || ''), icon: 'none' });
          }
        });
      } catch (e) {
        uni.showToast({ title: e.message || '导出失败', icon: 'none' });
      } finally {
        this.$set(item, 'exporting', false);
      }
    }
  },

  computed: {
    isGuest() {
      return !this.currentUser || this.currentUser.role === 'guest';
    },
    filteredList() {
      return this.getFilteredList();
    }
  }
};
</script>

<style lang="scss" scoped>
.questionnaire-list-container {
  min-height: 100vh;
  background-color: #F5F7FA;
  padding-bottom: 20rpx;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #EBEEF5;

  .header-title {
    display: flex;
    align-items: center;
    gap: 10rpx;
    font-size: 36rpx;
    font-weight: bold;
    color: #303133;
  }

  .btn-create {
    display: flex;
    align-items: center;
    gap: 6rpx;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex-shrink: 0;
  }

  .admin-entry-btn {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 12rpx 20rpx;
    background: linear-gradient(135deg, #3B82F6, #2563EB);
    border-radius: 12rpx;
    font-size: 26rpx;
    color: #fff;
    border: none;
  }

  .query-entry-btn {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 12rpx 20rpx;
    background-color: #EBF5FF;
    color: #3B82F6;
    border: 2rpx solid #3B82F6;
    border-radius: 12rpx;
    font-size: 26rpx;
    line-height: 1;
  }
}

.guest-banner {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 20rpx 30rpx 0;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border-radius: 16rpx;
  border: 1rpx solid #bbf7d0;
}

.guest-banner-icon {
  width: 60rpx;
  height: 60rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.guest-banner-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.guest-banner-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #166534;
  line-height: 1.4;
}

.guest-banner-desc {
  font-size: 22rpx;
  color: #16a34a;
  line-height: 1.4;
}

.guest-banner-btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  background: #16a34a;
  color: #fff;
  border-radius: 12rpx;
  font-size: 26rpx;
  border: none;
  line-height: 1;
}

.tabs {
  display: flex;
  background-color: #fff;
  padding: 0 30rpx;
  border-bottom: 1rpx solid #EBEEF5;

  .tab-item {
    padding: 24rpx 30rpx;
    font-size: 28rpx;
    color: #606266;
    position: relative;

    &.active {
      color: #3B82F6;
      font-weight: bold;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 30rpx;
        right: 30rpx;
        height: 4rpx;
        background-color: #3B82F6;
        border-radius: 2rpx;
      }
    }
  }
}

.questionnaire-list {
  padding: 20rpx 30rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;

  .empty-text {
    margin-top: 20rpx;
    font-size: 28rpx;
    color: #909399;
  }
}

.questionnaire-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);

  .card-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 12rpx;

    .status-badge {
      padding: 6rpx 16rpx;
      border-radius: 8rpx;
      font-size: 22rpx;
      color: #fff;
      font-weight: bold;
    }
  }

  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12rpx;
    margin-bottom: 12rpx;
  }

  .card-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #303133;
    line-height: 1.4;
    flex: 1;
  }

  .remaining-days {
    display: flex;
    align-items: center;
    font-size: 22rpx;
    flex-shrink: 0;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    background-color: #F5F7FA;

    .active-text {
      color: #67C23A;
      font-weight: bold;
    }

    .expired-text {
      color: #F56C6C;
      font-weight: bold;
    }
  }

  .card-description {
    font-size: 26rpx;
    color: #606266;
    line-height: 1.5;
    margin-bottom: 20rpx;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-info {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    margin-bottom: 16rpx;

    .info-item {
      display: flex;
      align-items: center;
      gap: 6rpx;
      font-size: 24rpx;
      color: #909399;
    }
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 16rpx;

    .time-info {
      display: flex;
      flex-direction: column;
      gap: 6rpx;
      font-size: 22rpx;
      color: #909399;
    }

    .query-btn {
      padding: 8rpx 20rpx;
      background-color: #EBF5FF;
      color: #3B82F6;
      border: 1rpx solid #3B82F6;
      border-radius: 8rpx;
      font-size: 24rpx;
      line-height: 1;
    }
  }

  .card-actions {
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid #EBEEF5;

    .action-row {
      display: flex;
      gap: 16rpx;
      margin-bottom: 12rpx;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .action-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6rpx;
      font-size: 24rpx;

      &.icon-only {
        flex: 0 0 60rpx;
        padding: 0;
      }

      &.primary {
        background: linear-gradient(135deg, #3B82F6, #2563EB);
        color: #fff;
        border: none;
      }

      &.disabled {
        background-color: #F5F7FA;
        color: #C0C4CC;
        border: 1rpx solid #DCDFE6;
      }

      &.danger {
        background-color: #FEF0F0;
        color: #F56C6C;
        border: 1rpx solid #F56C6C;
      }
    }
  }
}

.load-more {
  text-align: center;
  padding: 30rpx 0;
  font-size: 28rpx;
  color: #3B82F6;
}

.query-tip {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin: 0 0 30rpx;
  padding: 20rpx 24rpx;
  background-color: #F0F9FF;
  border-radius: 12rpx;
  border: 1rpx solid #BAE6FD;

  text {
    flex: 1;
    font-size: 24rpx;
    color: #606266;
    line-height: 1.6;
  }
}

.loading-container {
  padding: 60rpx 0;
}

.time-popup {
  width: 600rpx;
  padding: 40rpx;
  background-color: #fff;
  border-radius: 16rpx;

  .popup-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #303133;
    margin-bottom: 30rpx;
    text-align: center;
  }

  .time-form {
    .form-item {
      margin-bottom: 24rpx;

      .form-label {
        display: block;
        font-size: 26rpx;
        color: #606266;
        margin-bottom: 12rpx;
      }

      .picker-value {
        padding: 20rpx;
        background-color: #F5F7FA;
        border-radius: 8rpx;
        font-size: 28rpx;
        color: #303133;
      }
    }
  }

  .popup-actions {
    display: flex;
    gap: 20rpx;
    margin-top: 30rpx;

    button {
      flex: 1;
      height: 80rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      border: none;
    }

    .btn-cancel {
      background-color: #F5F7FA;
      color: #606266;
    }

    .btn-confirm {
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: #fff;
    }
  }
}
</style>
