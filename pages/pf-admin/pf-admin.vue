<template>
  <view class="pf-admin-page">
    <view class="pf-admin-header">
      <view class="header-left">
        <text class="admin-title">个金管理</text>
        <view class="header-meta-row">
          <text class="header-meta-item">{{ pfCurrentPeriod }}</text>
          <text class="header-meta-sep">·</text>
          <text class="header-meta-item">{{ pfOverviewData.length }} 人</text>
          <text class="header-meta-sep">·</text>
          <text class="header-meta-item">{{ pfRequiredTasks.length + pfBonusTasks.length }} 项业务</text>
        </view>
      </view>
      <view class="header-right">
        <button class="action-chip" @click="exportPFOverview">导出</button>
        <button class="action-chip primary" @click="navigateToPFSubmissionFlow">提报流</button>
      </view>
    </view>

    <view class="admin-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="admin-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key; handleTabChange(tab.key)"
      >
        {{ tab.label }}
      </view>
    </view>

    <scroll-view scroll-y class="admin-content">
      <!-- 业绩汇总 -->
      <view v-if="activeTab === 'overview'" class="tab-panel">
        <view class="panel">
          <view class="panel-header panel-header--actions">
            <view class="title-with-quarter">
              <text class="panel-title">个金业绩汇总</text>
              <picker :range="pfPeriodOptions" :value="pfPeriodOptions.indexOf(pfSelectedPeriod)" @change="handlePFPeriodChange" class="quarter-picker">
                <view class="picker-value">{{ formatPeriod(pfSelectedPeriod) }}</view>
              </picker>
            </view>
            <input class="search-input" placeholder="搜索姓名/支行" v-model="pfSearchKeyword" />
          </view>
          <!-- 角色筛选 -->
          <view class="role-filter">
            <view
              v-for="opt in pfRoleOptions"
              :key="opt.value"
              class="role-filter-item"
              :class="{ active: pfSelectedRole === opt.value }"
              @click="pfSelectedRole = opt.value"
            >
              {{ opt.label }}
            </view>
          </view>
          <text class="panel-tip">共 {{ filteredPFOverviewData.length }} 名员工 · 点击姓名查看提报详情</text>
          <view class="table-wrapper">
            <view class="table">
              <view class="table-row overview-row table-header">
                <text class="col-rank">排名</text>
                <text class="col-name">姓名</text>
                <text class="col-branch">支行</text>
                <text class="col-score">总分</text>
                <text class="col-score">必选</text>
                <text class="col-score">加分</text>
              </view>
              <view
                v-for="(item, index) in filteredPFOverviewData"
                :key="item.userId"
                class="table-row overview-row clickable"
                @click="gotoPFUserDetails(item)"
              >
                <text class="col-rank">{{ index + 1 }}</text>
                <text class="col-name employee-name">{{ item.userName }}</text>
                <text class="col-branch">{{ item.branch || item.branchName || '-' }}</text>
                <text class="col-score highlight">{{ item.totalScore }}</text>
                <text class="col-score">{{ item.requiredScore }}</text>
                <text class="col-score">{{ item.bonusScore }}</text>
              </view>
              <view v-if="filteredPFOverviewData.length === 0" class="empty-hint">暂无数据</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 任务管理 -->
      <view v-else-if="activeTab === 'tasks'" class="tab-panel">
        <view class="panel">
          <view class="panel-header">
            <text class="panel-title">必选业务</text>
            <button class="primary-btn small" @click="pfTaskCategory = 'required'; openPFTaskModal()">新增</button>
          </view>
          <view class="pf-task-list">
            <view v-for="task in pfRequiredTasks" :key="task.taskId" class="pf-task-card">
              <view class="pf-task-main">
                <text class="pf-task-name">{{ task.taskName }}</text>
                <text v-if="!task.isActive" class="disabled-badge">已停用</text>
                <text class="pf-task-meta">
                  单位：{{ task.unit }} · 权重 {{ task.scoreConfig.weightScore }}分 · 封顶 {{ task.scoreConfig.maxScore }}分
                </text>
                <text class="pf-task-meta" v-if="task.targetByRole">
                  目标：客户经理 {{ task.targetByRole.manager }} / 大堂 {{ task.targetByRole.lobby_manager }} / 弹性 {{ task.targetByRole.elastic_counter }} / 柜面 {{ task.targetByRole.counter_manager }}
                </text>
              </view>
              <view class="pf-task-actions">
                <button class="link-btn" @click="openPFTaskModal(task)">编辑</button>
                <button class="link-btn" @click="togglePFTaskStatus(task)">{{ task.isActive ? '停用' : '启用' }}</button>
                <button class="link-btn danger" @click="deletePFTask(task)">删除</button>
              </view>
            </view>
            <view v-if="pfRequiredTasks.length === 0" class="empty-hint">暂无必选业务</view>
          </view>
        </view>

        <view class="panel">
          <view class="panel-header">
            <text class="panel-title">加分业务</text>
            <button class="primary-btn small" @click="pfTaskCategory = 'bonus'; openPFTaskModal()">新增</button>
          </view>
          <view class="pf-task-list">
            <view v-for="task in pfBonusTasks" :key="task.taskId" class="pf-task-card">
              <view class="pf-task-main">
                <text class="pf-task-name">{{ task.taskName }}</text>
                <text v-if="!task.isActive" class="disabled-badge">已停用</text>
                <text class="pf-task-meta">
                  单位：{{ task.unit }} · {{ task.scoreConfig.unitPrice }}分/{{ task.unit }}
                  <text v-if="task.scoreConfig.maxScore"> · 上限 {{ task.scoreConfig.maxScore }}分</text>
                </text>
              </view>
              <view class="pf-task-actions">
                <button class="link-btn" @click="openPFTaskModal(task)">编辑</button>
                <button class="link-btn" @click="togglePFTaskStatus(task)">{{ task.isActive ? '停用' : '启用' }}</button>
                <button class="link-btn danger" @click="deletePFTask(task)">删除</button>
              </view>
            </view>
            <view v-if="pfBonusTasks.length === 0" class="empty-hint">暂无加分业务</view>
          </view>
        </view>
      </view>

      <!-- 用户管理 -->
      <view v-else-if="activeTab === 'users'" class="tab-panel">
        <view class="panel">
          <view class="panel-header panel-header--search">
            <input class="search-input search-input--inline" placeholder="搜索姓名/手机号/支行" v-model="userSearch" />
            <button class="primary-btn small" @click="openUserModal()">新增用户</button>
          </view>
          <!-- 角色筛选 -->
          <view class="role-filter-wrap">
            <view class="role-filter" :class="{ expanded: roleFilterExpanded }">
              <view
                v-for="opt in roleFilterOptions"
                :key="opt.value"
                class="role-filter-item"
                :class="{ active: roleFilter === opt.value }"
                @click="roleFilter = opt.value"
              >{{ opt.label }}</view>
            </view>
            <view class="role-filter-toggle" :class="{ rotated: roleFilterExpanded }" @click="roleFilterExpanded = !roleFilterExpanded">
              <uni-icons type="arrowup" :size="16" color="#64748b" />
            </view>
          </view>
          <text class="panel-tip">提示：停用的员工将不会进行业务统计</text>
          <view class="user-card" v-for="user in filteredUsers" :key="user.id">
            <view>
              <text class="user-name">{{ user.name }}</text>
              <text class="user-branch">{{ user.branchName || user.branch }} · {{ user.phone }}</text>
              <text class="user-meta">角色：{{ getRoleDisplay(user.role) }}</text>
            </view>
            <view class="user-actions">
              <button class="link-btn" @click="openUserModal(user)">编辑</button>
              <button class="link-btn" @click="handleResetPassword(user)">重置密码</button>
              <button class="link-btn" :class="{ danger: user.status === 'active' }" @click="toggleUserStatus(user)">
                {{ user.status === 'active' ? '停用' : '启用' }}
              </button>
            </view>
          </view>
          <view v-if="filteredUsers.length === 0" class="empty-hint">暂无用户</view>
        </view>
      </view>

      <!-- 系统设置 -->
      <view v-else-if="activeTab === 'settings'" class="tab-panel">
        <view class="panel">
          <view class="panel-header">
            <text class="panel-title">系统设置</text>
          </view>
          <view class="settings-list">
            <view class="settings-item">
              <view class="settings-item__info">
                <text class="settings-item__title">允许员工修改提报</text>
                <text class="settings-item__desc">开启后员工可在24小时内修改自己的提报记录</text>
              </view>
              <switch :checked="pfSettings.allowEditSubmission" @change="e => { pfSettings.allowEditSubmission = e.detail.value; savePFSettings(); }" />
            </view>
            <view class="settings-item">
              <view class="settings-item__info">
                <text class="settings-item__title">允许员工删除提报</text>
                <text class="settings-item__desc">开启后员工可在24小时内删除自己的提报记录</text>
              </view>
              <switch :checked="pfSettings.allowDeleteSubmission" @change="e => { pfSettings.allowDeleteSubmission = e.detail.value; savePFSettings(); }" />
            </view>
          </view>
        </view>
      </view>

      <!-- 规则管理 -->
      <view v-else-if="activeTab === 'rules'" class="tab-panel">
        <view class="panel">
          <view class="panel-header">
            <text class="panel-title">积分规则说明</text>
            <button class="primary-btn small" @click="openPFRuleEditModal">编辑</button>
          </view>
          <view v-if="pfRuleContent.sections.length === 0" class="empty-hint">暂无规则说明，点击编辑添加</view>
          <view v-else class="rule-preview">
            <view v-for="section in pfRuleContent.sections" :key="section.id" class="rule-section">
              <view class="rule-section-header">
                <view class="rule-section-dot" />
                <text class="rule-section-title">{{ section.title }}</text>
              </view>
              <view class="rule-section-items">
                <view v-for="(item, i) in section.items" :key="i" class="rule-item">
                  <text class="rule-item-bullet">·</text>
                  <view class="rule-item-text">{{ item }}</view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 个金任务编辑弹窗 -->
    <view v-if="showPFTaskModal" class="modal-overlay">
      <view class="sheet-modal" @tap.stop>
        <view class="sheet-header">
          <view class="sheet-header-left">
            <text class="sheet-title">{{ editingPFTask ? '编辑业务' : '新增业务' }}</text>
            <view class="sheet-type-tag" :class="pfTaskForm.category === 'required' ? 'tag-required' : 'tag-bonus'">
              {{ pfTaskForm.category === 'required' ? '必选' : '加分' }}
            </view>
          </view>
          <view class="sheet-close" @tap="closePFTaskModal">
            <uni-icons type="closeempty" :size="20" color="#64748b" />
          </view>
        </view>

        <scroll-view scroll-y class="sheet-body">
          <!-- 行1: 名称 + 类型 -->
          <view class="compact-section">
            <view class="compact-row">
              <view class="compact-field compact-field--grow">
                <text class="compact-label">业务名称</text>
                <input class="compact-input" v-model="pfTaskForm.taskName" placeholder="请输入" />
              </view>
              <view class="compact-field compact-field--unit">
                <text class="compact-label">单位</text>
                <picker :range="pfUnitOptions" :value="pfUnitOptions.indexOf(pfTaskForm.unit)" @change="e => pfTaskForm.unit = pfUnitOptions[e.detail.value]">
                  <view class="compact-picker">{{ pfTaskForm.unit }}<uni-icons type="arrowdown" :size="12" color="#94a3b8"/></view>
                </picker>
              </view>
            </view>

            <!-- 类型切换 -->
            <view class="compact-row compact-row--seg">
              <text class="compact-label">业务类型</text>
              <view class="type-segment">
                <view v-for="opt in pfCategoryOptions" :key="opt.value"
                  class="type-seg-item" :class="{ active: pfTaskForm.category === opt.value }"
                  @click="pfTaskForm.category = opt.value">{{ opt.label }}</view>
              </view>
            </view>
          </view>

          <!-- 积分配置 -->
          <view class="score-section">
            <text class="score-section-title">积分配置</text>
            <view v-if="pfTaskForm.category === 'required'" class="score-row">
              <view class="score-field">
                <text class="score-field-label">权重分</text>
                <view class="score-input-wrap">
                  <input class="score-input" type="digit" v-model="pfTaskForm.scoreConfig.weightScore" placeholder="0" />
                  <text class="score-unit">分</text>
                </view>
              </view>
              <view class="score-divider" />
              <view class="score-field">
                <text class="score-field-label">封顶分</text>
                <view class="score-input-wrap">
                  <input class="score-input" type="digit" v-model="pfTaskForm.scoreConfig.maxScore" placeholder="0" />
                  <text class="score-unit">分</text>
                </view>
              </view>
            </view>
            <view v-else class="score-row">
              <view class="score-field">
                <text class="score-field-label">单位分数</text>
                <view class="score-input-wrap">
                  <input class="score-input" type="digit" v-model="pfTaskForm.scoreConfig.unitPrice" placeholder="0" />
                  <text class="score-unit">分/{{ pfTaskForm.unit }}</text>
                </view>
              </view>
              <view class="score-divider" />
              <view class="score-field">
                <text class="score-field-label">上限分</text>
                <view class="score-input-wrap">
                  <input class="score-input" type="digit" v-model="pfTaskForm.scoreConfig.maxScore" placeholder="不限" />
                  <text class="score-unit">分</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 角色月度目标 -->
          <view v-if="pfTaskForm.category === 'required'" class="target-section">
            <text class="score-section-title">各角色月度目标</text>
            <view class="target-grid">
              <view class="target-cell">
                <text class="target-cell-label">客户经理</text>
                <input class="target-cell-input" type="digit" v-model="pfTaskForm.targetByRole.manager" placeholder="0" />
              </view>
              <view class="target-cell">
                <text class="target-cell-label">大堂经理</text>
                <input class="target-cell-input" type="digit" v-model="pfTaskForm.targetByRole.lobby_manager" placeholder="0" />
              </view>
              <view class="target-cell">
                <text class="target-cell-label">弹性柜面</text>
                <input class="target-cell-input" type="digit" v-model="pfTaskForm.targetByRole.elastic_counter" placeholder="0" />
              </view>
              <view class="target-cell">
                <text class="target-cell-label">柜面经理</text>
                <input class="target-cell-input" type="digit" v-model="pfTaskForm.targetByRole.counter_manager" placeholder="0" />
              </view>
            </view>
          </view>

          <!-- 状态 -->
          <view class="compact-section compact-section--last">
            <view class="compact-row">
              <text class="compact-label">启用状态</text>
              <view class="cell-switch-row">
                <text class="cell-switch-text" :style="{ color: pfTaskForm.isActive ? '#0f766e' : '#94a3b8' }">
                  {{ pfTaskForm.isActive ? '启用' : '停用' }}
                </text>
                <switch :checked="pfTaskForm.isActive" @change="e => pfTaskForm.isActive = e.detail.value" color="#0f766e" />
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="sheet-footer">
          <button class="sheet-btn-cancel" @tap="closePFTaskModal">取消</button>
          <button class="sheet-btn-confirm" @tap="submitPFTaskForm">保存</button>
        </view>
      </view>
    </view>

    <!-- 用户编辑弹窗 -->
    <view v-if="showUserModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>{{ editingUser ? '编辑用户' : '新增用户' }}</text>
          <view class="modal-close" @click="closeUserModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view class="form-item">
            <text class="form-label">姓名</text>
            <input class="form-input" v-model="userForm.name" placeholder="请输入姓名" />
          </view>
          <view class="form-item">
            <text class="form-label">手机号</text>
            <input class="form-input" v-model="userForm.phone" placeholder="请输入手机号" type="number" />
          </view>
          <view class="form-item">
            <text class="form-label">支行</text>
            <picker :range="branchNameOptions" :value="branchIndex" @change="handleBranchPicker">
              <view class="picker-value">{{ userForm.branch || '请选择支行' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">角色</text>
            <picker :range="pfRoleDisplayOptions" :value="pfRoleValueOptions.indexOf(userForm.role)" @change="e => userForm.role = pfRoleValueOptions[e.detail.value]">
              <view class="picker-value">{{ getRoleDisplay(userForm.role) || '请选择角色' }}</view>
            </picker>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeUserModal">取消</button>
          <button class="primary-btn" @click="submitUserForm">保存</button>
        </view>
      </view>
    </view>
    <!-- 规则编辑弹窗 -->
    <view v-if="showPFRuleModal" class="modal-overlay" @tap.self="closePFRuleModal">
      <view class="sheet-modal" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">编辑积分规则说明</text>
          <view class="sheet-close" @tap="closePFRuleModal">
            <uni-icons type="closeempty" :size="20" color="#64748b" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body" style="padding: 0 0 16rpx;">
          <view v-for="(section, idx) in pfEditRuleSections" :key="section.id" class="rule-edit-section">
            <view class="rule-edit-section-header">
              <text class="rule-edit-index">{{ idx + 1 }}</text>
              <input class="rule-edit-title-input" v-model="section.title" placeholder="板块标题" />
              <view @tap="removePFRuleSection(idx)" class="rule-edit-del">
                <uni-icons type="trash" :size="18" color="#ef4444" />
              </view>
            </view>
            <textarea
              class="rule-edit-textarea"
              v-model="section.itemsText"
              placeholder="每行一条规则说明，支持直接换行"
              :auto-height="true"
            />
          </view>
          <view class="rule-edit-add" @tap="addPFRuleSection">
            <uni-icons type="plusempty" :size="18" color="#0f766e" />
            <text class="rule-edit-add-text">新增板块</text>
          </view>
        </scroll-view>
        <view class="sheet-footer">
          <button class="sheet-btn-cancel" @tap="closePFRuleModal">取消</button>
          <button class="sheet-btn-confirm" @tap="savePFRuleContent">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import * as tabMixins from '../admin/mixins';

export default {
  mixins: [
    tabMixins.pfAdminMixin,
    tabMixins.usersTabMixin,
    tabMixins.branchesTabMixin
  ],
  data() {
    return {
      currentUser: StoreService.getCurrentUser(),
      activeTab: 'overview',
      tabs: [
        { key: 'overview', label: '业绩汇总' },
        { key: 'tasks', label: '业务管理' },
        { key: 'users', label: '用户管理' },
        { key: 'rules', label: '规则管理' },
        { key: 'settings', label: '系统设置' }
      ],
      pfRoleDisplayOptions: ['客户经理', '大堂经理', '弹性柜面', '柜面经理'],
      pfRoleValueOptions: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager']
    };
  },
  async onShow() {
    await this.refresh();
  },
  methods: {
    async refresh() {
      try {
        await StoreService.ensureReady();
        this.currentUser = StoreService.getCurrentUser();
        if (!this.currentUser || !['personal_finance_admin', 'super_admin', 'branch_leader'].includes(this.currentUser.role)) {
          uni.showToast({ title: '权限不足', icon: 'none' });
          uni.navigateBack();
          return;
        }
        await Promise.all([
          this.refreshPFTasks(),
          this.loadPFOverview(),
          this.refreshUsers()
        ]);
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.pf-admin-page { min-height: 100vh; background: #f8fafc; display: flex; flex-direction: column; }

/* 头部 */
.pf-admin-header {
  background: linear-gradient(135deg, #0d3d38 0%, #0f766e 60%, #065c8a 100%);
  padding: 28rpx 32rpx;
  display: flex; align-items: center; justify-content: space-between;
}
.header-left { flex: 1; min-width: 0; }
.admin-title { display: block; font-size: 36rpx; font-weight: 800; color: #fff; margin-bottom: 8rpx; }
.header-meta-row { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.header-meta-item { font-size: 24rpx; color: rgba(255,255,255,0.7); }
.header-meta-sep { font-size: 22rpx; color: rgba(255,255,255,0.35); }
.header-right { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.action-chip {
  font-size: 26rpx; padding: 14rpx 24rpx;
  background: rgba(255,255,255,0.15); color: #fff;
  border: 1rpx solid rgba(255,255,255,0.3); border-radius: 20rpx; font-weight: 600;
}
.action-chip.primary { background: #fff; color: #0f766e; border-color: transparent; font-weight: 700; }

/* Tab 栏 */
.admin-tabs { display: flex; background: #fff; border-bottom: 2rpx solid #e5e7eb; }
.admin-tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #64748b; position: relative; }
.admin-tab.active { color: #0f766e; font-weight: 600; }
.admin-tab.active::after { content: ''; position: absolute; bottom: 0; left: 20%; right: 20%; height: 4rpx; background: #0f766e; border-radius: 2rpx; }

/* 内容区 */
.admin-content { flex: 1; }
.tab-panel { padding: 24rpx 24rpx; }

/* 面板 */
.panel { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.panel-header--actions { flex-direction: column; align-items: stretch; gap: 16rpx; }
.search-row { margin-bottom: 16rpx; }
.panel-title { font-size: 32rpx; font-weight: 700; color: #0f172a; }
.panel-tip { display: block; font-size: 24rpx; color: #94a3b8; margin-bottom: 16rpx; }
.title-with-quarter { display: flex; align-items: center; gap: 16rpx; }
.quarter-picker { flex-shrink: 0; }
.picker-value { font-size: 26rpx; color: #0f766e; background: #ecfdf5; padding: 8rpx 20rpx; border-radius: 20rpx; font-weight: 600; }

.modal-body .picker-value { display: block; width: 100%; height: 88rpx; line-height: 88rpx; padding: 0 24rpx; background: #f8fafc; border: 1.5rpx solid #e2e8f0; border-radius: 16rpx; font-size: 28rpx; color: #0f172a; box-sizing: border-box; font-weight: 400; border-radius: 16rpx; }

/* 搜索框 */
.search-input { display: block; width: 100%; height: 72rpx; line-height: 72rpx; padding: 0 24rpx; background: #f1f5f9; border-radius: 12rpx; font-size: 28rpx; box-sizing: border-box; }

/* 角色筛选 */
.role-filter-wrap { display: flex; align-items: flex-start; gap: 12rpx; background: #fff; border-radius: 12rpx; padding: 16rpx; margin-bottom: 16rpx; }
.role-filter { display: flex; gap: 12rpx; flex-wrap: wrap; flex: 1; max-height: 56rpx; overflow: hidden; transition: max-height 0.3s; }
.role-filter.expanded { max-height: 1000rpx; }
.role-filter-item { padding: 10rpx 24rpx; border-radius: 20rpx; font-size: 24rpx; color: #64748b; background: #f1f5f9; }
.role-filter-item.active { background: #0f766e; color: #fff; font-weight: 600; }
.role-filter-toggle { flex-shrink: 0; width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 50%; transition: transform 0.3s; transform: rotate(180deg); }
.role-filter-toggle.rotated { transform: rotate(0deg); }

/* 表格 */
.table-wrapper { overflow-x: auto; }
.table { min-width: 500rpx; }
.table-row { display: flex; align-items: center; padding: 16rpx 12rpx; border-bottom: 1rpx solid #f1f5f9; font-size: 26rpx; color: #475569; }
.overview-row { }
.table-header { font-size: 22rpx; color: #94a3b8; font-weight: 600; background: #f8fafc; border-radius: 8rpx; border-bottom: none; padding: 12rpx 12rpx; }
/* 列宽定义 */
.col-rank { width: 60rpx; flex-shrink: 0; text-align: center; }
.col-name { width: 120rpx; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-branch { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 26rpx; padding: 0 4rpx; }
.col-score { width: 72rpx; flex-shrink: 0; text-align: center; font-size: 26rpx; }
.col-score:nth-child(4) { margin-left: -16rpx; }
.col-score:nth-child(5) { margin-left: 8rpx; }
.employee-name { color: #0f766e; font-weight: 600; }
.highlight { color: #0f766e; font-weight: 700; font-size: 28rpx; }
.clickable:active { background: #f0fdf4; }
.empty-hint { text-align: center; color: #94a3b8; font-size: 26rpx; padding: 40rpx 0; }

/* 搜索+按钮同行 */
.panel-header--search { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.search-input--inline { flex: 1; margin-bottom: 0; }

/* 任务卡片 */
.pf-task-list { display: flex; flex-direction: column; gap: 16rpx; }
.pf-task-card { background: #f8fafc; border-radius: 16rpx; padding: 24rpx; border: 1rpx solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; gap: 20rpx; }
.pf-task-main { flex: 1; min-width: 0; }
.pf-task-name { display: block; font-size: 30rpx; font-weight: 700; color: #0f172a; margin-bottom: 10rpx; }
.pf-task-meta { display: block; font-size: 24rpx; color: #64748b; margin-top: 8rpx; line-height: 1.6; }
.pf-task-actions { display: flex; flex-direction: column; gap: 8rpx; flex-shrink: 0; align-items: flex-end; }
.disabled-badge { display: inline-block; font-size: 20rpx; color: #ef4444; background: #fee2e2; padding: 2rpx 10rpx; border-radius: 6rpx; margin-left: 12rpx; vertical-align: middle; }

/* 目标配置网格 */
.target-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 8rpx; }
.target-role-item { display: flex; flex-direction: column; gap: 8rpx; }
.target-role-label { font-size: 24rpx; color: #64748b; }

/* 用户卡片 */
.user-card { background: #f8fafc; border-radius: 12rpx; padding: 20rpx; border: 1rpx solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.user-name { display: block; font-size: 30rpx; font-weight: 600; color: #0f172a; }
.user-branch { display: block; font-size: 24rpx; color: #64748b; margin-top: 4rpx; }
.user-meta { display: block; font-size: 24rpx; color: #94a3b8; margin-top: 4rpx; }
.user-actions { display: flex; gap: 10rpx; flex-shrink: 0; }

/* 系统设置 */
.settings-list { display: flex; flex-direction: column; }
.settings-item { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #f1f5f9; }
.settings-item:last-child { border-bottom: none; }
.settings-item__info { flex: 1; margin-right: 24rpx; }
.settings-item__title { display: block; font-size: 30rpx; color: #0f172a; font-weight: 500; }
.settings-item__desc { display: block; font-size: 24rpx; color: #94a3b8; margin-top: 6rpx; }

/* 弹窗遮罩 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 32rpx; }
.modal { width: 100%; max-width: 640rpx; max-height: 85vh; background: #fff; border-radius: 32rpx; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 40rpx 120rpx rgba(15, 23, 42, 0.2); }
.modal-header { background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); padding: 32rpx 32rpx 28rpx; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.modal-header text { font-size: 32rpx; font-weight: 700; color: #fff; letter-spacing: 1rpx; }
.modal-close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255,255,255,0.15); }
.modal-body { flex: 1; padding: 32rpx; overflow-y: auto; box-sizing: border-box; width: 100%; }
.rule-form-body { overflow-y: scroll; }
.rule-form-content { }
.modal-footer { padding: 20rpx 32rpx 32rpx; display: flex; gap: 16rpx; flex-shrink: 0; border-top: 1rpx solid #f1f5f9; }

/* 表单 */
.form-item { margin-bottom: 28rpx; }
.form-label { display: block; font-size: 24rpx; color: #475569; margin-bottom: 10rpx; font-weight: 600; letter-spacing: 0.5rpx; }
.form-input { display: block; width: 100%; height: 88rpx; line-height: 88rpx; padding: 0 24rpx; background: #f8fafc; border: 1.5rpx solid #e2e8f0; border-radius: 16rpx; font-size: 28rpx; color: #0f172a; box-sizing: border-box; }
.form-textarea { display: block; width: 100%; padding: 20rpx 24rpx; background: #f8fafc; border: 1.5rpx solid #e2e8f0; border-radius: 16rpx; font-size: 28rpx; color: #0f172a; box-sizing: border-box; min-height: 120rpx; }
.segment { display: flex; background: #f1f5f9; border-radius: 10rpx; overflow: hidden; }
.segment-item { flex: 1; text-align: center; padding: 16rpx 0; font-size: 26rpx; color: #64748b; }
.segment-item.active { background: #0f766e; color: #fff; font-weight: 600; }
.switch-row { display: flex; align-items: center; justify-content: space-between; }

/* 按钮 */
.panel-header .primary-btn { margin-left: auto; }
.primary-btn { background: #0f766e; color: #fff; border: none; border-radius: 12rpx; padding: 20rpx 32rpx; font-size: 28rpx; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; }
.primary-btn.small { padding: 12rpx 24rpx; font-size: 24rpx; }
.ghost-btn { background: #f1f5f9; color: #64748b; border: none; border-radius: 12rpx; padding: 20rpx 32rpx; font-size: 28rpx; display: inline-flex; align-items: center; justify-content: center; }
.link-btn { background: none; border: none; color: #0f766e; font-size: 24rpx; padding: 8rpx 12rpx; }
.link-btn.danger { color: #ef4444; }
.modal-footer .primary-btn { flex: 1; border-radius: 16rpx; height: 88rpx; font-size: 28rpx; font-weight: 600; background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); box-shadow: 0 8rpx 24rpx rgba(15, 118, 110, 0.3); display: flex; align-items: center; justify-content: center; }
.modal-footer .ghost-btn { flex: 1; border-radius: 16rpx; height: 88rpx; font-size: 28rpx; background: #f8fafc; border: 1.5rpx solid #e2e8f0; color: #64748b; display: flex; align-items: center; justify-content: center; }

/* Sheet 风格弹窗（任务编辑） */
.sheet-modal {
  width: 100%; max-height: 88vh;
  background: #f1f5f9; border-radius: 24rpx 24rpx 0 0;
  display: flex; flex-direction: column;
}
.sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx 28rpx 20rpx;
  background: #fff; border-radius: 24rpx 24rpx 0 0;
  border-bottom: 1rpx solid #f1f5f9;
}
.sheet-header-left { display: flex; align-items: center; gap: 12rpx; }
.sheet-title { font-size: 30rpx; font-weight: 700; color: #0f172a; }
.sheet-type-tag { font-size: 20rpx; font-weight: 600; padding: 4rpx 14rpx; border-radius: 20rpx; }
.tag-required { background: #ecfdf5; color: #0f766e; }
.tag-bonus { background: #fffbeb; color: #d97706; }
.sheet-close { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 50%; }
.sheet-body { flex: 1; overflow-y: auto; }
.sheet-footer {
  display: flex; gap: 16rpx; padding: 16rpx 28rpx 40rpx;
  background: #fff; border-top: 1rpx solid #f1f5f9;
}
.sheet-btn-cancel { flex: 1; height: 84rpx; background: #f1f5f9; color: #64748b; border: none; border-radius: 16rpx; font-size: 28rpx; }
.sheet-btn-confirm { flex: 2; height: 84rpx; background: #0f766e; color: #fff; border: none; border-radius: 16rpx; font-size: 28rpx; font-weight: 600; }

/* 紧凑区块 */
.compact-section { background: #fff; margin-bottom: 12rpx; padding: 0 28rpx; }
.compact-section--last { margin-bottom: 0; }
.compact-row {
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx 0; border-bottom: 1rpx solid #f8fafc; min-height: 80rpx;
}
.compact-row--seg { gap: 16rpx; }
.compact-row:last-child { border-bottom: none; }
.compact-label { font-size: 26rpx; color: #64748b; flex-shrink: 0; width: 130rpx; }
.compact-field { display: flex; flex-direction: column; gap: 6rpx; flex: 1; }
.compact-field--grow { flex: 2; }
.compact-field--unit { flex: 1; }
.compact-input { font-size: 28rpx; color: #0f172a; background: #f8fafc; border-radius: 8rpx; padding: 10rpx 16rpx; }
.compact-picker { display: flex; align-items: center; justify-content: center; gap: 6rpx; background: #f8fafc; border-radius: 8rpx; padding: 10rpx 16rpx; font-size: 26rpx; color: #0f172a; }

/* 积分配置 */
.score-section { background: #0f766e; margin-bottom: 12rpx; padding: 20rpx 28rpx; }
.score-section-title { display: block; font-size: 22rpx; color: rgba(255,255,255,0.7); font-weight: 600; margin-bottom: 16rpx; letter-spacing: 1px; }
.score-row { display: flex; align-items: center; gap: 0; }
.score-field { flex: 1; display: flex; flex-direction: column; gap: 10rpx; align-items: center; }
.score-divider { width: 1rpx; height: 60rpx; background: rgba(255,255,255,0.2); margin: 0 12rpx; }
.score-field-label { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.score-input-wrap { display: flex; align-items: baseline; gap: 6rpx; }
.score-input { font-size: 44rpx; font-weight: 700; color: #fff; width: 120rpx; text-align: center; background: transparent; }
.score-unit { font-size: 22rpx; color: rgba(255,255,255,0.6); }

/* 角色目标 */
.target-section { background: #fff; margin-bottom: 12rpx; padding: 16rpx 28rpx; }
.target-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-top: 4rpx; }
.target-cell { background: #f8fafc; border-radius: 12rpx; padding: 16rpx 20rpx; border: 1rpx solid #e2e8f0; }
.target-cell-label { display: block; font-size: 22rpx; color: #94a3b8; margin-bottom: 8rpx; }
.target-cell-input { font-size: 32rpx; font-weight: 700; color: #0f172a; background: transparent; width: 100%; }

/* 类型 segment */
.type-segment { display: flex; background: #f1f5f9; border-radius: 10rpx; overflow: hidden; flex: 1; }
.type-seg-item { flex: 1; text-align: center; padding: 12rpx 0; font-size: 24rpx; color: #64748b; }
.type-seg-item.active { background: #0f766e; color: #fff; font-weight: 600; border-radius: 8rpx; }

/* 通用 switch */
.cell-switch-row { display: flex; align-items: center; gap: 12rpx; }
.cell-switch-text { font-size: 26rpx; font-weight: 500; }

/* 规则预览 */
.rule-preview { display: flex; flex-direction: column; gap: 28rpx; }
.rule-section-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 14rpx; }
.rule-section-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: #0f766e; flex-shrink: 0; }
.rule-section-title { font-size: 28rpx; font-weight: 700; color: #0f172a; }
.rule-section-items { display: flex; flex-direction: column; gap: 12rpx; padding-left: 20rpx; }
.rule-item { display: flex; gap: 8rpx; align-items: flex-start; margin-bottom: 6rpx; }
.rule-item-bullet { font-size: 24rpx; color: #0f766e; flex-shrink: 0; line-height: 1.4; }
.rule-item-text { font-size: 24rpx; color: #475569; line-height: 1.4; flex: 1; }

/* 规则编辑弹窗 */
.rule-edit-section { background: #fff; margin: 12rpx 24rpx 0; border-radius: 16rpx; overflow: hidden; border: 1rpx solid #e2e8f0; }
.rule-edit-section-header { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 20rpx; background: #f8fafc; border-bottom: 1rpx solid #e2e8f0; }
.rule-edit-index { width: 40rpx; height: 40rpx; border-radius: 50%; background: #0f766e; color: #fff; font-size: 22rpx; font-weight: 700; text-align: center; line-height: 40rpx; flex-shrink: 0; }
.rule-edit-title-input { flex: 1; font-size: 28rpx; font-weight: 600; color: #0f172a; background: transparent; }
.rule-edit-del { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rule-edit-textarea { display: block; width: 100%; min-height: 160rpx; padding: 20rpx; font-size: 26rpx; color: #475569; line-height: 1.8; box-sizing: border-box; background: #fff; }
.rule-edit-add { display: flex; align-items: center; justify-content: center; gap: 10rpx; margin: 20rpx 24rpx; height: 80rpx; border: 2rpx dashed #0f766e; border-radius: 16rpx; background: #f0fdf4; }
.rule-edit-add-text { font-size: 26rpx; color: #0f766e; font-weight: 600; }
</style>
