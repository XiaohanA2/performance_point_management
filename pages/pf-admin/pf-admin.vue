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
          <view class="panel-header">
            <view class="title-with-quarter">
              <text class="panel-title">个金业绩汇总</text>
              <picker :range="pfPeriodOptions" :value="pfPeriodOptions.indexOf(pfSelectedPeriod)" @change="handlePFPeriodChange" class="quarter-picker">
                <view class="picker-value">{{ formatPeriod(pfSelectedPeriod) }}</view>
              </picker>
            </view>
          </view>
          <view style="display: flex; gap: 12rpx; align-items: center; margin-bottom: 20rpx;">
            <input class="search-input" placeholder="搜索姓名/支行" v-model="pfSearchKeyword" />
            <button class="recalc-btn" @tap="showRecalcModal = true">更新积分</button>
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
                <text class="col-score">总分（必选业务）</text>
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
          <text class="panel-tip">提示：停用的业务不会在工作台显示，但历史数据保留；删除会永久移除业务及所有相关数据</text>
          <view class="pf-task-list">
            <view v-for="task in pfRequiredTasks" :key="task.taskId" class="pf-task-card">
              <view class="pf-task-main">
                <view class="pf-task-header">
                  <text class="pf-task-name">{{ task.taskName }}</text>
                  <text v-if="!task.isActive" class="disabled-badge">已停用</text>
                </view>
                <text class="pf-task-meta">
                  单位：{{ task.unit }} · 权重 {{ task.scoreConfig.weightScore }}分 · 封顶 {{ task.scoreConfig.maxScore }}分
                </text>
              </view>
              <view class="pf-task-actions">
                <button class="action-icon-btn" @click="openPFTaskModal(task)">
                  <uni-icons type="compose" :size="18" color="#0f766e" />
                </button>
                <button class="action-icon-btn" @click="togglePFTaskStatus(task)">
                  <uni-icons :type="task.isActive ? 'eye-slash' : 'eye'" :size="18" :color="task.isActive ? '#64748b' : '#0f766e'" />
                </button>
                <button class="action-icon-btn danger" @click="deletePFTask(task)">
                  <uni-icons type="trash" :size="18" color="#ef4444" />
                </button>
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
                  单位：{{ task.unit }}
                </text>
              </view>
              <view class="pf-task-actions">
                <button class="action-icon-btn" @click="openPFTaskModal(task)">
                  <uni-icons type="compose" :size="18" color="#0f766e" />
                </button>
                <button class="action-icon-btn" @click="togglePFTaskStatus(task)">
                  <uni-icons :type="task.isActive ? 'eye-slash' : 'eye'" :size="18" :color="task.isActive ? '#64748b' : '#0f766e'" />
                </button>
                <button class="action-icon-btn danger" @click="deletePFTask(task)">
                  <uni-icons type="trash" :size="18" color="#ef4444" />
                </button>
              </view>
            </view>
            <view v-if="pfBonusTasks.length === 0" class="empty-hint">暂无加分业务</view>
          </view>
        </view>
      </view>

      <!-- 任务分配 -->
      <view v-else-if="activeTab === 'assignment'" class="tab-panel">
        <view class="panel">
          <view class="panel-header">
            <text class="panel-title">任务分配</text>
            <view class="assignment-mode-tabs">
              <view class="mode-tab" :class="{ active: assignmentMode === 'by-business' }" @click="assignmentMode = 'by-business'">按业务</view>
              <view class="mode-tab" :class="{ active: assignmentMode === 'by-employee' }" @click="assignmentMode = 'by-employee'">按员工</view>
            </view>
          </view>

          <view class="assignment-filters">
            <picker :range="pfPeriodOptions" :value="pfPeriodOptions.indexOf(assignmentPeriod)" @change="handleAssignmentPeriodChange">
              <view class="filter-picker">{{ formatPeriod(assignmentPeriod) }}</view>
            </picker>
            <picker :range="branchFilterOptions" :range-key="'name'" :value="branchFilterIndex" @change="handleBranchFilterChange">
              <view class="filter-picker">{{ branchFilterOptions[branchFilterIndex].name }}</view>
            </picker>
            <picker :range="assignmentRoleOptions" :range-key="'label'" :value="assignmentRoleIndex" @change="handleRoleFilterChange">
              <view class="filter-picker">{{ assignmentRoleOptions[assignmentRoleIndex].label }}</view>
            </picker>
          </view>
          <view class="assignment-search">
            <input class="search-input" placeholder="搜索姓名或支行" v-model="assignmentSearchKeyword" />
            <view class="filter-toggle" :class="{ active: showUnassignedOnly }" @click="toggleUnassignedFilter">仅看未分配</view>
          </view>

          <!-- 按业务分配 -->
          <view v-if="assignmentMode === 'by-business'" class="assignment-by-business">
            <view class="business-selector">
              <view
                v-for="task in filteredRequiredTasks"
                :key="task.taskId"
                class="business-chip"
                :class="{ active: selectedTaskId === task.taskId }"
                @click="selectedTaskId = task.taskId"
              >
                {{ task.taskName }}
              </view>
            </view>
            <scroll-view v-if="selectedTaskId" scroll-y class="employee-assignment-list" @scrolltolower="onScrollToLower">
              <view v-for="(emp, index) in filteredEmployees" :key="emp._id" class="assignment-card">
                <text class="assignment-card-index">{{ index + 1 }}</text>
                <view class="assignment-card-info">
                  <text class="assignment-card-name">{{ emp.name }}</text>
                  <text class="assignment-card-meta">{{ emp.branch }} · {{ getRoleDisplay(emp.role) }}</text>
                </view>
                <view class="assignment-card-input">
                  <input class="target-input" type="number" :value="getEmployeeTarget(emp._id, selectedTaskId)" @blur="e => saveTarget(emp._id, selectedTaskId, e.detail.value)" placeholder="0" />
                  <text class="input-unit">{{ pfRequiredTasks.find(t => t.taskId === selectedTaskId)?.unit || '' }}</text>
                </view>
              </view>
              <view v-if="hasMoreEmployees" class="load-more-tip">向下滚动加载更多...</view>
            </scroll-view>
          </view>

          <!-- 按员工分配 -->
          <scroll-view v-else scroll-y class="assignment-by-employee" @scrolltolower="onScrollToLower">
            <view v-for="(emp, index) in filteredEmployees" :key="emp._id" class="employee-card" @click="openEmployeeTaskModal(emp)">
              <view class="emp-card-index">{{ index + 1 }}</view>
              <view class="emp-card-info">
                <text class="emp-card-name">{{ emp.name }}</text>
                <text class="emp-card-meta">{{ emp.branch }} · {{ getRoleDisplay(emp.role) }}</text>
              </view>
              <view class="emp-card-arrow">
                <uni-icons type="right" :size="20" color="#94a3b8" />
              </view>
            </view>
            <view v-if="hasMoreEmployees" class="load-more-tip">向下滚动加载更多...</view>
          </scroll-view>
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
          <text class="panel-tip">共 {{ filteredUsers.length }} 名员工 · 停用的员工将不会进行业务统计</text>
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
          <view v-if="pfTaskForm.category === 'required'" class="score-section">
            <text class="score-section-title">积分配置</text>
            <view class="score-row">
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
            <picker :range="availableRoleDisplayOptions" :value="availableRoleValueOptions.indexOf(userForm.role)" @change="e => userForm.role = availableRoleValueOptions[e.detail.value]">
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
              :maxlength="-1"
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

    <!-- 员工任务配置弹窗 -->
    <view v-if="showEmployeeTaskModal" class="modal-overlay" @tap.self="closeEmployeeTaskModal">
      <view class="sheet-modal" @tap.stop>
        <view class="sheet-header">
          <view class="sheet-header-left">
            <text class="sheet-title">{{ selectedEmployee?.name }} - 任务配置</text>
            <text class="sheet-subtitle">{{ selectedEmployee?.branch }} · {{ getRoleDisplay(selectedEmployee?.role) }}</text>
          </view>
          <view class="sheet-close" @tap="closeEmployeeTaskModal">
            <uni-icons type="closeempty" :size="20" color="#64748b" />
          </view>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view v-for="task in pfRequiredTasks" :key="task.taskId" class="task-config-row">
            <text class="task-config-name">{{ task.taskName }}</text>
            <view class="task-config-input-group">
              <input class="task-config-input" type="number" :value="getEmployeeTarget(selectedEmployee?._id, task.taskId)" @blur="e => saveTarget(selectedEmployee?._id, task.taskId, e.detail.value)" placeholder="0" />
              <text class="task-config-unit">{{ task.unit }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 重算积分模态框 -->
    <view v-if="showRecalcModal" class="modal-overlay" @tap.self="showRecalcModal = false">
      <view class="modal" @tap.stop>
        <view class="modal-header">
          <text>更新积分</text>
          <view class="modal-close" @tap="showRecalcModal = false">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">选择角色</text>
            <picker :range="pfRoleDisplayOptions" :value="recalcRoleIndex" @change="e => recalcRoleIndex = e.detail.value">
              <view class="picker-value">{{ pfRoleDisplayOptions[recalcRoleIndex] }}</view>
            </picker>
          </view>
        </view>
        <view class="modal-footer">
          <button class="ghost-btn" @tap="handleRecalc('role')">重算该角色</button>
          <button class="primary-btn" @tap="handleRecalc('all')">重算全部</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import { invalidateAllCache } from '../../services/pf-service.js';
import * as tabMixins from '../admin/mixins';
import pfAssignmentMixin from '../admin/mixins/pf-assignment-mixin.js';

export default {
  mixins: [
    tabMixins.pfAdminMixin,
    tabMixins.usersTabMixin,
    tabMixins.branchesTabMixin,
    pfAssignmentMixin
  ],
  data() {
    return {
      currentUser: StoreService.getCurrentUser(),
      activeTab: 'overview',
      tabs: [
        { key: 'overview', label: '业绩汇总' },
        { key: 'users', label: '用户管理' },
        { key: 'tasks', label: '业务管理' },
        { key: 'assignment', label: '任务分配' },
        { key: 'rules', label: '规则管理' },
        { key: 'settings', label: '系统设置' }
      ],
      pfRoleDisplayOptions: ['客户经理', '大堂经理', '弹性柜面', '柜面经理'],
      pfRoleValueOptions: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
      showRecalcModal: false,
      recalcRoleIndex: 0
    };
  },
  computed: {
    availableRoleOptions() {
      const role = this.currentUser?.role;
      const allRoles = StoreService.getRoles().map(r => ({ value: r.roleCode, label: r.roleName }));

      if (role === 'super_admin') return allRoles;
      if (role === 'branch_leader') return allRoles.filter(r => r.value !== 'super_admin');
      if (role === 'personal_finance_admin') {
        const pfRoles = ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager', 'personal_finance_admin'];
        return allRoles.filter(r => pfRoles.includes(r.value));
      }
      const businessRoles = ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'];
      return allRoles.filter(r => businessRoles.includes(r.value));
    },
    availableRoleDisplayOptions() {
      return this.availableRoleOptions.map(r => r.label);
    },
    availableRoleValueOptions() {
      return this.availableRoleOptions.map(r => r.value);
    }
  },
  async onShow() {
    await this.refresh();
  },
  methods: {
    toggleUnassignedFilter() {
      if (!this.showUnassignedOnly && this.assignmentEmployees.length > 50) {
        uni.showLoading({ title: '计算中...', mask: true });
        this.$nextTick(() => {
          this.showUnassignedOnly = true;
          uni.hideLoading();
        });
      } else {
        this.showUnassignedOnly = !this.showUnassignedOnly;
      }
    },
    handleTabChange(tabKey) {
      if (tabKey === 'overview') this.loadPFOverview();
      if (tabKey === 'tasks') this.refreshPFTasks();
      if (tabKey === 'settings') this.loadPFSettings();
      if (tabKey === 'rules') this.loadPFRuleContent();
      if (tabKey === 'assignment') this.loadAssignmentData();
    },
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
    },
    async handleRecalc(type) {
      try {
        uni.showLoading({ title: '正在重算积分...', mask: true });
        const period = this.pfSelectedPeriod;
        if (type === 'role') {
          const role = this.pfRoleValueOptions[this.recalcRoleIndex];
          await uniCloud.callFunction({
            name: 'appService',
            data: { action: 'recalcByRole', payload: { role, period, user: this.currentUser } }
          });
        } else {
          await uniCloud.callFunction({
            name: 'appService',
            data: { action: 'recalcAll', payload: { period, user: this.currentUser } }
          });
        }

        // 清除缓存并重新加载数据
        invalidateAllCache();
        StoreService.clearCache();
        await this.loadPFOverview();

        uni.hideLoading();
        uni.showToast({ title: '重算完成', icon: 'success' });
        this.showRecalcModal = false;
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: error.message || '重算失败', icon: 'none' });
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
.panel-title { font-size: 32rpx; font-weight: 700; color: #0f172a; flex: 1; }
.panel-tip { display: block; font-size: 24rpx; color: #94a3b8; margin-bottom: 16rpx; }
.title-with-quarter { display: flex; align-items: center; gap: 16rpx; }
.quarter-picker { flex-shrink: 0; }
.picker-value { font-size: 26rpx; color: #0f766e; background: #ecfdf5; padding: 8rpx 20rpx; border-radius: 20rpx; font-weight: 600; }

.modal-body .picker-value { display: block; width: 100%; height: 88rpx; line-height: 88rpx; padding: 0 24rpx; background: #f8fafc; border: 1.5rpx solid #e2e8f0; border-radius: 16rpx; font-size: 28rpx; color: #0f172a; box-sizing: border-box; font-weight: 400; border-radius: 16rpx; }

/* 搜索框 */
.search-input { display: block; width: 100%; height: 72rpx; line-height: 72rpx; padding: 0 24rpx; background: #f1f5f9; border-radius: 12rpx; font-size: 28rpx; box-sizing: border-box; }
.recalc-btn { flex-shrink: 0; height: 72rpx; padding: 0 24rpx; background: #0f766e; color: #fff; border: none; border-radius: 12rpx; font-size: 26rpx; font-weight: 600; white-space: nowrap; display: flex; align-items: center; justify-content: center; }

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
.table-row { display: flex; align-items: center; padding: 20rpx 16rpx; border-bottom: 1rpx solid #f1f5f9; font-size: 26rpx; color: #475569; }
.overview-row { }
.table-header { font-size: 24rpx; color: #64748b; font-weight: 600; background: #f8fafc; border-radius: 8rpx; border-bottom: none; padding: 16rpx 16rpx; }
/* 列宽定义 */
.col-rank { width: 80rpx; flex-shrink: 0; text-align: center; }
.col-name { width: 150rpx; flex-shrink: 0; font-weight: 600; text-align: center; }
.col-branch { flex: 1; min-width: 140rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;}
.col-score { width: 200rpx; flex-shrink: 0; text-align: center; font-weight: 600; white-space: nowrap; }
.employee-name { color: #0f766e; font-weight: 600; }
.highlight { color: #0f766e; font-weight: 700; font-size: 28rpx; }
.clickable:active { background: #f0fdf4; }
.empty-hint { text-align: center; color: #94a3b8; font-size: 26rpx; padding: 40rpx 0; }

/* 搜索+按钮同行 */
.panel-header--search { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.search-input--inline { flex: 1; margin-bottom: 0; }

/* 任务卡片 */
.pf-task-list { display: flex; flex-direction: column; gap: 16rpx; }
.pf-task-card { background: #fff; border-radius: 16rpx; padding: 24rpx; border: 1rpx solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; gap: 20rpx; }
.pf-task-main { flex: 1; min-width: 0; }
.pf-task-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.pf-task-name { font-size: 28rpx; font-weight: 600; color: #0f172a; }
.pf-task-meta { font-size: 24rpx; color: #64748b; line-height: 1.5; }
.pf-task-actions { display: flex; gap: 8rpx; flex-shrink: 0; }
.action-icon-btn { width: 56rpx; height: 56rpx; border-radius: 12rpx; background: #f8fafc; border: 1rpx solid #e2e8f0; display: flex; align-items: center; justify-content: center; padding: 0; }
.action-icon-btn.danger { background: #fef2f2; border-color: #fecaca; }
.disabled-badge { font-size: 20rpx; padding: 4rpx 12rpx; background: #f1f5f9; color: #64748b; border-radius: 999rpx; }

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
.sheet-header-left { display: flex; flex-direction: column; align-items: flex-start; gap: 6rpx; }
.sheet-title { font-size: 30rpx; font-weight: 700; color: #0f172a; }
.sheet-subtitle { font-size: 24rpx; color: #64748b; }
.sheet-type-tag { font-size: 20rpx; font-weight: 600; padding: 4rpx 14rpx; border-radius: 20rpx; }
.tag-required { background: #ecfdf5; color: #0f766e; }
.tag-bonus { background: #fffbeb; color: #d97706; }
.sheet-close { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 50%; }
.sheet-body { flex: 1; overflow-y: auto; }
.sheet-footer {
  display: flex; gap: 16rpx; padding: 16rpx 28rpx 40rpx;
  background: #fff; border-top: 1rpx solid #f1f5f9;
}
.sheet-btn-cancel { flex: 1; height: 84rpx; background: #f1f5f9; color: #64748b; border: none; border-radius: 16rpx; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }
.sheet-btn-confirm { flex: 2; height: 84rpx; background: #0f766e; color: #fff; border: none; border-radius: 16rpx; font-size: 28rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; }

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
.rule-edit-textarea { display: block; width: 100%; min-height: 120rpx; padding: 20rpx; font-size: 26rpx; color: #475569; line-height: 1.8; box-sizing: border-box; background: #fff; }
.rule-edit-add { display: flex; align-items: center; justify-content: center; gap: 10rpx; margin: 20rpx 24rpx; height: 80rpx; border: 2rpx dashed #0f766e; border-radius: 16rpx; background: #f0fdf4; }
.rule-edit-add-text { font-size: 26rpx; color: #0f766e; font-weight: 600; }

/* 任务分配 */
.assignment-mode-tabs { display: flex; gap: 8rpx; background: rgba(15, 118, 110, 0.1); border-radius: 12rpx; padding: 4rpx; }
.mode-tab { flex: 1; padding: 10rpx 24rpx; text-align: center; font-size: 24rpx; color: #64748b; border-radius: 8rpx; transition: all 0.2s; }
.mode-tab.active { background: #0f766e; color: #fff; font-weight: 600; }

.assignment-filters { display: flex; gap: 16rpx; margin: 24rpx 0; }
.filter-picker { flex: 1; padding: 20rpx; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 2rpx solid #e2e8f0; border-radius: 16rpx; font-size: 26rpx; font-weight: 600; color: #0f172a; text-align: center; box-shadow: 0 2rpx 8rpx rgba(15, 118, 110, 0.08); }
.assignment-search { margin-bottom: 24rpx; display: flex; align-items: center; gap: 16rpx; }
.assignment-search .search-input { flex: 1; height: 80rpx; line-height: 80rpx; padding: 0 24rpx; background: #f8fafc; border: 2rpx solid #e2e8f0; border-radius: 16rpx; font-size: 26rpx; color: #0f172a; box-sizing: border-box; }
.filter-toggle { flex-shrink: 0; height: 80rpx; line-height: 80rpx; padding: 0 24rpx; background: #f8fafc; border: 2rpx solid #e2e8f0; border-radius: 16rpx; font-size: 26rpx; color: #64748b; white-space: nowrap; }
.filter-toggle.active { background: #0f766e; color: #fff; font-weight: 600; }

.business-selector { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx; }
.business-chip { padding: 12rpx 24rpx; background: #f1f5f9; border-radius: 20rpx; font-size: 24rpx; color: #64748b; border: 2rpx solid transparent; }
.business-chip.active { background: #e0f2f1; color: #0f766e; border-color: #0f766e; font-weight: 600; }

.employee-assignment-list { height: 800rpx; display: flex; flex-direction: column; gap: 12rpx; padding-bottom: 20rpx; }
.load-more-tip { text-align: center; padding: 20rpx; font-size: 24rpx; color: #94a3b8; }
.assignment-card { display: flex; align-items: center; gap: 16rpx; background: #f8fafc; border-radius: 12rpx; padding: 20rpx; border: 1rpx solid #e2e8f0; }
.assignment-card-index { width: 48rpx; height: 48rpx; border-radius: 50%; background: #e0f2f1; color: #0f766e; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.assignment-card-info { flex: 1; }
.assignment-card-name { display: block; font-size: 28rpx; font-weight: 600; color: #0f172a; }
.assignment-card-meta { display: block; font-size: 24rpx; color: #64748b; margin-top: 4rpx; }
.assignment-card-input { display: flex; align-items: center; gap: 12rpx; }
.target-input { width: 140rpx; padding: 16rpx; border: 1rpx solid #e2e8f0; border-radius: 8rpx; text-align: center; font-size: 28rpx; background: #fff; }
.input-unit { font-size: 24rpx; color: #64748b; min-width: 40rpx; }

.employee-assignment-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.emp-header { margin-bottom: 16rpx; }
.emp-meta { font-size: 24rpx; color: #64748b; margin-top: 4rpx; }
.task-targets { display: flex; flex-direction: column; gap: 12rpx; }
.task-target-row { display: flex; align-items: center; gap: 12rpx; }
.task-name { flex: 1; font-size: 26rpx; color: #475569; }
.task-unit { font-size: 24rpx; color: #94a3b8; width: 60rpx; }

.assignment-by-employee { height: 800rpx; padding-bottom: 20rpx; }
.employee-card { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; background: #fff; border-radius: 16rpx; margin-bottom: 16rpx; cursor: pointer; }
.employee-card:active { background: #f8fafc; }
.emp-card-index { width: 56rpx; height: 56rpx; border-radius: 50%; background: #e0f2f1; color: #0f766e; font-size: 24rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.emp-card-info { flex: 1; }
.emp-card-name { display: block; font-size: 28rpx; font-weight: 600; color: #0f172a; margin-bottom: 6rpx; }
.emp-card-meta { font-size: 24rpx; color: #64748b; }
.emp-card-arrow { flex-shrink: 0; }

.task-config-row { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: #fff; border-bottom: 1rpx solid #f1f5f9; }
.task-config-row:last-child { border-bottom: none; }
.task-config-name { font-size: 28rpx; font-weight: 500; color: #0f172a; }
.task-config-input-group { display: flex; align-items: center; gap: 12rpx; }
.task-config-input { width: 120rpx; padding: 12rpx; border: 1rpx solid #cbd5e1; border-radius: 8rpx; text-align: center; font-size: 28rpx; font-weight: 600; background: #fff; }
.task-config-unit { font-size: 24rpx; color: #64748b; min-width: 40rpx; }
</style>
