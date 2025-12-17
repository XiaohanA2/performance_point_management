<template>
  <view class="admin-page">
    <view class="admin-header">
      <view class="admin-info">
        <text class="admin-title">后台管理</text>
        <text class="admin-subtitle">第 {{ currentQuarter }} 季度 </text>
        <text class="admin-subtitle"> {{ overviewData.length }} 名客户经理</text>
      </view>
      <view class="header-actions">
        <button class="action-chip" @click="handleExport">导出 Excel</button>
        <button class="action-chip" @click="handleImportTemplate">导入业绩</button>
        <button class="action-chip danger" @click="handleReset">清空本季度</button>
        <button class="action-chip primary" @click="navigateToSubmissionFlow">查看提报流</button>
      </view>
    </view>

    <view class="admin-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="admin-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </view>
    </view>

    <scroll-view scroll-y class="admin-content">
      <view v-if="activeTab === 'overview'" class="tab-panel">
        <view class="panel-header panel-header--actions">
          <div class="title-with-quarter">
            <text class="panel-title">业绩汇总</text>
            <picker :range="quarterOptions" :value="quarterOptions.indexOf(selectedQuarter)" @change="handleOverviewQuarterChange" class="quarter-picker">
              <view class="picker-value">{{ selectedQuarter }}</view>
            </picker>
          </div>
          <input
            class="search-input"
            placeholder="搜索姓名/支行"
            v-model="searchKeyword"
          />
        </view>
        <text class="panel-tip">点击姓名可查看具体提报记录</text>
        <view class="table-wrapper">
          <view class="table">
            <view class="table-row table-header">
              <text>排名</text>
              <text>姓名</text>
              <text>支行</text>
              <text>总分</text>
              <text>奖励金额(元)</text>
              <text>个贷</text>
              <text>小微</text>
            </view>
            <view
              v-for="row in filteredOverviewData"
              :key="row.employee.id"
              class="table-row"
              @click="gotoUserDetails(row.employee)"
            >
              <text>{{ getRank(row.employee.id) }}</text>
              <text class="employee-name">{{ row.employee.name }}</text>
              <text class="branch-name">{{ formatBranchName(row.employee.branch) }}</text>
              <text class="highlight">{{ row.stats.totalScore }}</text>
              <text :class="{ 'highlight': row.stats.bonusAmount > 0, 'danger': row.stats.bonusAmount < 0 }">
                {{ row.stats.bonusAmount >= 0 ? '+' : '' }}{{ row.stats.bonusAmount }}
              </text>
              <text>{{ row.stats.personalScore }}</text>
              <text>{{ row.stats.microScore }}</text>
            </view>
          </view>
        </view>
      </view>


      <view v-else-if="activeTab === 'users'" class="tab-panel">
      <view class="panel-header panel-header--user">
        <text class="panel-title">用户管理</text>
        <input
          class="search-input"
          placeholder="搜索姓名/手机号/支行"
          v-model="userSearch"
        />
        <button class="primary-btn small" @click="openUserModal()">新增用户</button>
      </view>
      <text class="panel-tip">提示：停用的客户经理将不会进行业务统计</text>
      <view class="user-card" v-for="user in filteredUsers" :key="user.id">
        <view>
          <text class="user-name">{{ user.name }}</text>
          <text class="user-branch">{{ user.branch }} · {{ user.phone }}</text>
          <text class="user-meta">角色：{{ user.role === 'admin' ? '管理员' : '客户经理' }}</text>
        </view>
        <view class="user-actions">
          <button class="link-btn" @click="openUserModal(user)">编辑</button>
          <button class="link-btn" @click="handleResetPassword(user)">重置密码</button>
          <button class="link-btn danger" @click="toggleUserStatus(user)">
            {{ user.status === 'active' ? '停用' : '启用' }}
          </button>
        </view>
      </view>
      </view>

      <view v-else-if="activeTab === 'rules'" class="tab-panel">
      <view class="panel-header">
        <view class="rule-tabs">
          <view 
            class="rule-tab" 
            :class="{ active: ruleTabType === 'business' }" 
            @click="ruleTabType = 'business'"
          >
            积分规则
          </view>
          <view 
            class="rule-tab" 
            :class="{ active: ruleTabType === 'bonus' }" 
            @click="ruleTabType = 'bonus'"
          >
            奖励规则
          </view>
        </view>
        <view class="panel-actions">
          <button class="ghost-btn small" @click="openRuleDescriptionModal">编辑说明</button>
          <button class="primary-btn small" @click="openRuleModal()">新增业务</button>
        </view>
      </view>
      <view v-if="ruleTabType === 'business'" class="rule-groups">
        <view class="rule-section" v-for="section in ruleSections" :key="section.key">
          <view class="rule-section__header">
            <text class="rule-section__title">{{ section.title }}</text>
            <text class="rule-section__subtitle">{{ section.subtitle }}</text>
          </view>
          <view
            v-for="rule in section.rules"
            :key="rule.id"
            class="rule-card"
            :class="{ 'rule-card--hidden': rule.hidden }"
          >
            <view class="rule-card__main">
              <view class="rule-card__icon" :style="{ backgroundColor: rule.color }">
                <IconHelper :name="rule.icon || 'circle'" :size="22" />
              </view>
              <view>
                <text class="rule-card__title">{{ rule.name }}</text>
                <text v-if="rule.hidden" class="hidden-badge">隐藏</text>
                <text> </text>
                <text class="rule-card__meta">&nbsp;&nbsp;
                  {{ rule.hasStockOption ? '新增 + ' + (rule.stockLabel || '存量') : '新增' }}
                </text>
              </view>
            </view>
            <view class="rule-card__points">
              <text>新增 {{ rule.pointsNew.item }} 分/笔 · 每100万 {{ rule.pointsNew.million }} 分</text>
              <text v-if="rule.hasStockOption">
                {{ rule.stockLabel || '存量' }} {{ rule.pointsStock.item }} 分/笔 · 每100万 {{ rule.pointsStock.million }} 分
              </text>
            </view>
            <view class="rule-card__actions">
              <button class="link-btn" @click="openRuleModal(rule)">编辑</button>
              <button class="link-btn" :class="{ active: !rule.hidden }" @click="toggleRuleHidden(rule)">
                {{ rule.hidden ? '显示' : '隐藏' }}
              </button>
              <button class="link-btn danger" @click="deleteRule(rule)">删除</button>
            </view>
          </view>
          <view v-if="section.rules.length === 0" class="rule-card rule-card--empty">
            <text>暂无规则，点击右上角新增</text>
          </view>
        </view>
      </view>
      
      <view v-else class="panel">
        <text class="panel-title">奖励规则配置</text>
        <view class="panel-body">
          <text class="form-tip">设置积分对应的奖励金额计算规则</text>
          
          <view class="form-item">
            <text class="form-label">选择季度</text>
            <picker :range="quarterOptions" :value="quarterOptions.indexOf(selectedBonusQuarter)" @change="handleBonusQuarterChange">
              <view class="form-input">
                <text>{{ selectedBonusQuarter }}</text>
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <text class="form-label">奖励门槛</text>
            <input 
              class="form-input" 
              type="digit" 
              v-model="currentBonusRules.threshold" 
              placeholder="输入积分门槛，低于此积分无奖励" 
            />
            <text class="form-tip">积分低于此值无奖励，默认30分</text>
          </view>
          
          <view class="form-item">
            <text class="form-label">基础奖励率</text>
            <input 
              class="form-input" 
              type="digit" 
              v-model="currentBonusRules.baseRate" 
              placeholder="输入基础奖励率，单位：元/分" 
            />
            <text class="form-tip">积分在高分阈值以下的奖励率，默认35元/分</text>
          </view>
          
          <view class="form-item">
            <text class="form-label">高分阈值</text>
            <input 
              class="form-input" 
              type="digit" 
              v-model="currentBonusRules.highScoreThreshold" 
              placeholder="输入高分阈值" 
            />
            <text class="form-tip">超过此积分按高分奖励率计算，默认100分</text>
          </view>
          
          <view class="form-item">
            <text class="form-label">高分奖励率</text>
            <input 
              class="form-input" 
              type="digit" 
              v-model="currentBonusRules.highScoreRate" 
              placeholder="输入高分奖励率，单位：元/分" 
            />
            <text class="form-tip">积分超过高分阈值后的奖励率，默认45元/分</text>
          </view>
          
          <view class="form-item">
            <text class="form-label">扣钱方式</text>
            <view class="segment">
              <view
                v-for="option in penaltyTypeOptions"
                :key="option.value"
                class="segment__item"
                :class="{ active: currentBonusRules.penaltyType === option.value }"
                @click="currentBonusRules.penaltyType = option.value"
              >
                {{ option.label }}
              </view>
            </view>
          </view>
          
          <view class="form-item" v-if="currentBonusRules.penaltyType === 'rate'">
            <text class="form-label">扣钱率</text>
            <input 
              class="form-input" 
              type="digit" 
              v-model="currentBonusRules.penaltyRate" 
              placeholder="输入扣钱率，单位：元/分" 
            />
            <text class="form-tip">积分低于门槛时，每分扣钱金额，默认0元/分</text>
          </view>
          
          <view class="form-item" v-else>
            <text class="form-label">固定扣钱金额</text>
            <input 
              class="form-input" 
              type="digit" 
              v-model="currentBonusRules.fixedPenalty" 
              placeholder="输入固定扣钱金额，单位：元" 
            />
            <text class="form-tip">积分低于门槛时，固定扣钱金额，默认2000元</text>
          </view>
          
          <view class="button-row">
            <button class="primary-btn" @click="saveBonusRules">保存奖励规则</button>
          </view>
        </view>
      </view>
      </view>

      <view v-else-if="activeTab === 'branches'" class="tab-panel">
      <view class="panel">
        <view class="panel-header">
          <text class="panel-title">支行管理</text>
          <button class="primary-btn small" @click="openBranchModal()">新增支行</button>
        </view>
        <view class="branch-list">
          <view class="branch-item" v-for="branch in branches" :key="branch.id">
            <text class="branch-name">{{ branch.id }} · {{ branch.name }}</text>
            <view class="branch-actions">
              <button class="link-btn" @click="openBranchModal(branch)">编辑</button>
              <button class="link-btn danger" @click="deleteBranch(branch)">删除</button>
            </view>
          </view>
        </view>
      </view>
      </view>

      <view v-else class="tab-panel">
      <view class="panel-group">
        <view class="panel">
          <text class="panel-title">系统参数</text>
          <view class="panel-body">
            <view class="switch-row">
              <view>
                <text class="switch-label">允许用户修改/删除提报</text>
                <text class="switch-tip">非管理员用户超过24小时不可修改</text>
              </view>
              <switch :checked="settings.allowEditSubmission" @change="updateSetting('allowEditSubmission', $event.detail.value)" />
            </view>
          </view>
        </view>
      </view>
      </view>
    </scroll-view>

    <view v-if="!isAdmin" class="unauth">
      <text>{{ (!currentUser || (currentUser && currentUser.role === 'guest')) ? '请先登录' : '仅管理员可访问此页面' }}</text>
      <button class="light-btn" @click="gotoLogin">{{ (!currentUser || (currentUser && currentUser.role === 'guest')) ? '立即登录' : '切换账号' }}</button>
    </view>

    <view v-if="showUserModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>{{ editingUser ? '编辑用户' : '新增用户' }}</text>
          <view class="modal-close" @click="closeUserModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">姓名</text>
            <input class="form-input" v-model="userForm.name" placeholder="请输入姓名" />
          </view>
          <view class="form-item">
            <text class="form-label">手机号</text>
            <input class="form-input" type="number" v-model="userForm.phone" placeholder="11位手机号" />
          </view>
          <view class="form-item">
            <text class="form-label">所属支行</text>
            <picker :range="branchNameOptions" :value="branchIndex" @change="handleBranchPicker">
              <view class="picker-value">{{ branchNameOptions[branchIndex] || '请选择支行' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">角色</text>
            <picker :range="roleOptions" :value="roleIndex" @change="handleRolePicker">
              <view class="picker-value">
                {{ roleOptions[roleIndex] }}
              </view>
            </picker>
          </view>
        </view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeUserModal">取消</button>
          <button class="primary-btn" @click="submitUserForm">保存</button>
        </view>
      </view>
    </view>

    <view v-if="showRuleModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>{{ editingRule ? '编辑规则' : '新增规则' }}</text>
          <view class="modal-close" @click="closeRuleModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <scroll-view scroll-y class="modal-body rule-form-body">
          <view class="rule-form-content">
          <view class="form-item">
            <text class="form-label">业务名称</text>
            <input class="form-input" v-model="ruleForm.name" placeholder="请输入业务名称" />
          </view>
          <view class="form-item">
            <text class="form-label">业务分类</text>
            <view class="segment">
              <view
                v-for="option in ruleCategoryOptions"
                :key="option.value"
                class="segment__item"
                :class="{ active: ruleForm.category === option.value }"
                @click="selectRuleCategory(option.value)"
              >
                {{ option.label }}
              </view>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">业务类型</text>
            <view class="chip-list">
              <view
                v-for="option in currentRuleGroups"
                :key="option.value"
                class="chip"
                :class="{ active: ruleForm.group === option.value }"
                @click="selectRuleGroup(option.value)"
              >
                {{ option.label }}
              </view>
            </view>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">图标标识</text>
              <view class="icon-picker">
                <view
                  v-for="icon in iconOptions"
                  :key="icon"
                  class="icon-picker__item"
                  :class="{ active: ruleForm.icon === icon }"
                  @click="selectRuleIcon(icon)"
                >
                  <view class="icon-picker__preview">
                    <IconHelper :name="icon" :size="32" color="#0f172a" />
                  </view>
                </view>
              </view>
            </view>
            <view class="form-item half">
              <text class="form-label">主题色</text>
              <view class="color-picker">
                <view
                  v-for="color in colorOptions"
                  :key="color"
                  class="color-picker__item"
                  :class="{ active: ruleForm.color === color }"
                  :style="{ backgroundColor: color }"
                  @click="selectRuleColor(color)"
                />
              </view>
              <input class="form-input" v-model="ruleForm.color" placeholder="或输入 HEX 颜色（如 #0f766e）" />
            </view>
          </view>
          <view class="form-item">
              <text class="form-label">新增积分设置</text>
              <view class="dual-inputs">
                <view class="input-with-suffix">
                  <input
                    class="form-input"
                    type="digit"
                    v-model="ruleForm.pointsNewItem"
                    placeholder="输入数值"
                  />
                  <text class="input-unit">分/笔</text>
                </view>
                <view class="input-with-suffix">
                  <input
                    class="form-input"
                    type="digit"
                    v-model="ruleForm.pointsNewMillion"
                    placeholder="输入数值"
                  />
                  <text class="input-unit">分/100万</text>
                </view>
              </view>
          </view>
          <view class="form-item switch-row">
            <view>
              <text class="form-label">包含存量 / 转贷</text>
              <text class="form-tip">开启后可单独配置积分</text>
            </view>
            <switch :checked="ruleForm.hasStockOption" @change="ruleForm.hasStockOption = $event.detail.value" />
          </view>
          <view v-if="ruleForm.hasStockOption" class="form-item">
            <text class="form-label">存量积分设置</text>
            <input class="form-input" v-model="ruleForm.stockLabel" placeholder="存量标签，例如 转贷" />
            <view class="dual-inputs">
              <view class="input-with-suffix">
                <input
                  class="form-input"
                  type="digit"
                  v-model="ruleForm.pointsStockItem"
                  placeholder="输入数值"
                />
                <text class="input-unit">分/笔</text>
              </view>
              <view class="input-with-suffix">
                <input
                  class="form-input"
                  type="digit"
                  v-model="ruleForm.pointsStockMillion"
                  placeholder="输入数值"
                />
                <text class="input-unit">分/100万</text>
              </view>
            </view>
          </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeRuleModal">取消</button>
          <button class="primary-btn" @click="submitRuleForm">保存</button>
        </view>
      </view>
    </view>

    <view v-if="showRuleDescriptionModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>规则说明配置</text>
          <view class="modal-close" @click="closeRuleDescriptionModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <scroll-view scroll-y class="modal-body rule-desc-body">
          <view
            class="rule-desc-section"
            v-for="(section, index) in ruleDescriptionForm"
            :key="section.uid"
          >
            <view class="form-item">
              <text class="form-label">说明分组标题</text>
              <input
                class="form-input"
                v-model="section.title"
                placeholder="如 个贷条线"
              />
            </view>
            <view class="form-item">
              <text class="form-label">说明内容</text>
              <textarea
                class="form-textarea"
                v-model="section.itemsText"
                placeholder="每行一条说明，例如：抵押类：新增3分/笔"
              />
              <text class="form-tip">换行代表新的说明条目</text>
            </view>
            <view class="rule-desc-actions">
              <button
                v-if="ruleDescriptionForm.length > 1"
                class="link-btn danger"
                @click="removeRuleDescriptionSection(index)"
              >
                删除该分组
              </button>
            </view>
          </view>
          <button class="ghost-btn full-width" @click="addRuleDescriptionSection">
            + 新增说明分组
          </button>
        </scroll-view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeRuleDescriptionModal">取消</button>
          <button class="primary-btn" @click="submitRuleDescriptionForm">保存</button>
        </view>
      </view>
    </view>

    <view v-if="showBranchModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>{{ editingBranch ? '编辑支行' : '新增支行' }}</text>
          <view class="modal-close" @click="closeBranchModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <view class="modal-body">
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">支行编号</text>
              <input
                class="form-input"
                placeholder="输入支行编号"
                v-model="branchForm.id"
              />
            </view>
            <view class="form-item half">
              <text class="form-label">支行名称</text>
              <input
                class="form-input"
                placeholder="输入支行名称"
                v-model="branchForm.name"
              />
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeBranchModal">取消</button>
          <button class="primary-btn" @click="saveBranch">保存</button>
        </view>
      </view>
    </view>

    <!-- 导入业绩弹窗 -->
    <view v-if="showImportModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>导入业绩</text>
          <view class="modal-close" @click="closeImportModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">步骤1：下载模板</text>
            <button class="primary-btn" @click="downloadImportTemplate">下载Excel模板</button>
            <text class="form-tip">根据当前用户和业务类型生成的模板，请勿修改表头格式</text>
          </view>
          <view class="form-item">
            <text class="form-label">步骤2：选择文件</text>
            <button class="ghost-btn" @click="selectImportFile">选择Excel文件</button>
            <text v-if="selectedFileName" class="file-name">{{ selectedFileName }}</text>
            <text class="form-tip">支持.xlsx和.csv格式，文件大小不超过10MB</text>
          </view>
          <view class="form-item">
            <text class="form-label">步骤3：导入数据</text>
            <button class="primary-btn" @click="handleImportData" :disabled="!selectedFileName">开始导入</button>
            <text class="form-tip">导入前请确保数据格式正确，导入后将添加对应季度数据</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeImportModal">取消</button>
        </view>
      </view>
    </view>

    <!-- 导出选择弹窗 -->
    <view v-if="showExportModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>导出数据</text>
          <view class="modal-close" @click="closeExportModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <view class="modal-body">
          <view class="export-option">
            <text class="export-option__title">1. 导出收单通报表</text>
            <view class="form-item">
              <text class="form-label">选择季度</text>
              <picker :range="quarterOptions" :value="quarterOptions.indexOf(exportSelectedQuarter)" @change="handleExportQuarterChange">
                <view class="date-picker-btn">{{ exportSelectedQuarter }}</view>
              </picker>
            </view>
            <button class="primary-btn" @click="exportQuarterReport">立即导出</button>
            <text class="form-tip">包含选定季度所有客户经理的业绩汇总数据</text>
          </view>
          <view class="export-divider"></view>
          <view class="export-option">
            <text class="export-option__title">2. 导出指定日期范围的提报记录</text>
            <view class="date-range-picker">
              <picker mode="date" start="2024-01-01" end="2030-12-31" @change="handleExportStartDateChange" :value="exportStartDate">
                <view class="date-picker-btn">{{ exportStartDate || '开始日期' }}</view>
              </picker>
              <text class="date-separator">至</text>
              <picker mode="date" start="2024-01-01" end="2030-12-31" @change="handleExportEndDateChange" :value="exportEndDate">
                <view class="date-picker-btn">{{ exportEndDate || '结束日期' }}</view>
              </picker>
            </view>
            <button class="primary-btn" @click="exportDateRangeSubmissions" :disabled="!exportStartDate || !exportEndDate">导出提报记录</button>
            <text class="form-tip">导出指定日期范围内的所有提报记录，包含详细业务信息</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeExportModal">取消</button>
        </view>
      </view>
    </view>
  </view>
  </template>

<style scoped>
  /* 季度选择样式 */
  .title-with-quarter {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .quarter-picker {
    margin-right: 10px;
  }
  .picker-value {
    padding: 8px 16px;
    background-color: #ecfdf5;
    border: 2px solid rgba(15, 118, 110, 0.2);
    border-radius: 20rpx;
    font-size: 28rpx;
    color: #0f766e;
    font-weight: 500;
    box-shadow: 0 2rpx 8rpx rgba(15, 118, 110, 0.1);
    transition: all 0.3s ease;
  }
  .picker-value:active {
    background-color: #d1fae5;
    transform: scale(0.98);
  }
  /* 奖励规则季度选择器样式 */
  .form-item picker .form-input {
    height: auto;
    padding: 16rpx 20rpx;
    line-height: 1.5;
  }
  /* 绿色按钮样式 */
  .action-chip.primary {
    background-color: #0f766e;
    color: white;
  }
  /* 隐藏业务卡片样式 */
  .rule-card--hidden {
    opacity: 0.7;
    border-left: 4px solid #94a3b8;
  }
  /* 隐藏徽章样式 */
  .hidden-badge {
    display: inline-block;
    background-color: #94a3b8;
    color: white;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
  }
</style>

<script>
import { StoreService } from '../../services/store.js';
import IconHelper from '../../components/IconHelper.vue';

const RULE_SECTIONS = [
  { key: 'personal-mortgage', title: '个贷 · 抵押类', subtitle: '农户 / 经营抵押', category: 'personal', group: 'mortgage' },
  { key: 'personal-credit', title: '个贷 · 信用类', subtitle: '商户e贷 / 消费贷 / 快农贷', category: 'personal', group: 'credit' },
  { key: 'micro-mortgage', title: '小微 · 抵押类', subtitle: '转贷 / 新增', category: 'micro', group: 'mortgage' },
  { key: 'micro-credit', title: '小微 · 信用类', subtitle: '微捷贷 / 闽e贷 / 转贷', category: 'micro', group: 'credit' },
  { key: 'micro-offline', title: '小微 · 线下特色', subtitle: '科技贷 / 智动贷', category: 'micro', group: 'offline' }
];

const ruleFormDefaults = () => ({
  name: '',
  category: 'personal',
  group: 'mortgage',
  icon: 'home',
  color: '#0f766e',
  hasStockOption: false,
  stockLabel: '存量',
  pointsNewItem: 0,
  pointsNewMillion: 0,
  pointsStockItem: 0,
  pointsStockMillion: 0,
  hidden: false
});

export default {
  components: { IconHelper },
  data() {
    return {
      currentUser: StoreService.getCurrentUser(),
      activeTab: 'overview',
      tabs: [
        { key: 'overview', label: '业绩汇总' },
        { key: 'users', label: '用户管理' },
        { key: 'rules', label: '业务规则' },
        { key: 'branches', label: '支行管理' },
        { key: 'settings', label: '系统设置' }
      ],
      searchKeyword: '',
      overviewData: [],
      leaderboard: [],
      users: [],
      branches: StoreService.getBranches(),
      rules: StoreService.getRules(),
      ruleDescriptionSections: StoreService.getRuleDescriptionSections(),
      currentQuarter: StoreService.getCurrentQuarter(),
      selectedQuarter: StoreService.getCurrentQuarter(),
      exportSelectedQuarter: StoreService.getCurrentQuarter(),
      quarterOptions: ['2025Q4', '2026Q1', '2026Q2', '2026Q3', '2026Q4', '2027Q1', '2027Q2', '2027Q3', '2027Q4', '2028Q1', '2028Q2', '2028Q3', '2028Q4'],
      settings: StoreService.getSettings(),
      showUserModal: false,
      showRuleModal: false,
      showRuleDescriptionModal: false,
      editingUser: null,
      editingRule: null,
      userForm: {
        name: '',
        phone: '',
        branch: '',
        role: 'manager'
      },
      roleOptions: ['客户经理', '管理员'],
      branchIndex: 0,
      roleIndex: 0,
      userSearch: '',
      branchForm: { id: '', name: '' },
      editingBranch: null,
      showBranchModal: false,
      ruleForm: ruleFormDefaults(),
      ruleDescriptionForm: [],
      iconOptions: ['home', 'cart', 'wallet', 'shop', 'flag', 'redo', 'gear', 'compose', 'star'],
      colorOptions: ['#0f766e', '#2563eb', '#db2777', '#f97316', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f43f5e'],
      ruleCategoryOptions: [
        { value: 'personal', label: '个贷业务' },
        { value: 'micro', label: '小微业务' }
      ],
      ruleGroupOptions: {
        personal: [
          { value: 'mortgage', label: '抵押类' },
          { value: 'credit', label: '信用类' }
        ],
        micro: [
          { value: 'mortgage', label: '抵押类' },
          { value: 'credit', label: '信用类' },
          { value: 'offline', label: '线下特色' }
        ]
      },
      // 导入业绩相关
      showImportModal: false,
      selectedFileName: '',
      selectedFile: null,
      // 提报记录相关
      submissionSearch: '',
      startDate: '',
      endDate: '',
      allSubmissions: [],
      // 导出弹框相关
      showExportModal: false,
      exportStartDate: '',
      exportEndDate: '',
      // 奖励规则配置
      bonusRules: {},
      // 当前选择的奖励规则季度
      selectedBonusQuarter: StoreService.getCurrentQuarter(),
      // 当前季度的奖励规则
      currentBonusRules: {
        threshold: 30,
        baseRate: 35,
        highScoreThreshold: 100,
        highScoreRate: 45,
        penaltyType: 'rate',
        penaltyRate: 0,
        fixedPenalty: 2000
      },
      // 规则标签类型：business - 业务规则，bonus - 奖励规则
      ruleTabType: 'business',
      // 扣钱方式选项
      penaltyTypeOptions: [
        { value: 'rate', label: '按扣钱率' },
        { value: 'fixed', label: '按固定金额' }
      ]
    };
  },
  computed: {
    isAdmin() {
      return this.currentUser && this.currentUser.role === 'admin';
    },
    filteredUsers() {
      const keyword = this.userSearch.trim().toLowerCase();
      let filtered = this.users;
      
      // 搜索过滤
      if (keyword) {
        filtered = filtered.filter(
          user =>
            user.name.toLowerCase().includes(keyword) ||
            user.phone.includes(keyword) ||
            user.branch.toLowerCase().includes(keyword)
        );
      }
      
      return filtered;
    },
    filteredOverviewData() {
      const keyword = this.searchKeyword.trim().toLowerCase();
      let filtered = this.overviewData.filter(
        item =>
          (!keyword || item.employee.name.toLowerCase().includes(keyword) ||
          item.employee.branch.toLowerCase().includes(keyword))
      );
      
      // 按排名升序排列
      return filtered.sort((a, b) => {
        const rankA = this.getRank(a.employee.id);
        const rankB = this.getRank(b.employee.id);
        if (rankA === '-' && rankB === '-') return 0;
        if (rankA === '-') return 1;
        if (rankB === '-') return -1;
        return rankA - rankB;
      });
    },
    ruleSections() {
      return RULE_SECTIONS.map(section => ({
        ...section,
        rules: this.rules.filter(rule => rule.category === section.category && rule.group === section.group)
      }));
    },
    currentRuleGroups() {
      return this.ruleGroupOptions[this.ruleForm.category] || [];
    },
    branchNameOptions() {
      return this.branches.map(branch => branch.name);
    },
    branchMapByName() {
      return this.branches.reduce((acc, branch) => {
        acc[branch.name] = branch;
        return acc;
      }, {});
    },
    filteredSubmissions() {
      let filtered = this.allSubmissions;
      
      // 只导出客户经理的提报记录
      filtered = filtered.filter(sub => {
        const employee = this.users.find(u => u.id === sub.employeeId);
        return employee && employee.role === 'manager';
      });
      
      // 搜索过滤
      const keyword = this.submissionSearch.trim().toLowerCase();
      if (keyword) {
        filtered = filtered.filter(sub => {
          const employee = this.users.find(u => u.id === sub.employeeId);
          const rule = this.rules.find(r => r.id === sub.ruleId);
          return (
            (employee && employee.name.toLowerCase().includes(keyword)) ||
            (employee && employee.branch.toLowerCase().includes(keyword)) ||
            (rule && rule.name.toLowerCase().includes(keyword))
          );
        });
      }
      
      // 日期范围过滤
      if (this.startDate) {
        const start = new Date(this.startDate).getTime();
        filtered = filtered.filter(sub => sub.timestamp >= start);
      }
      if (this.endDate) {
        const end = new Date(this.endDate).getTime() + 24 * 60 * 60 * 1000; // 包含当天结束
        filtered = filtered.filter(sub => sub.timestamp < end);
      }
      
      return filtered;
    },
    groupedSubmissions() {
      const groups = {};
      
      // 先按日期分组
      this.filteredSubmissions.forEach(sub => {
        const dateKey = this.formatDate(sub.timestamp, 'date');
        if (!groups[dateKey]) {
          groups[dateKey] = {};
        }
        if (!groups[dateKey][sub.employeeId]) {
          groups[dateKey][sub.employeeId] = [];
        }
        groups[dateKey][sub.employeeId].push(sub);
      });
      
      return groups;
    }
  },
 
  async onShow() {
    await this.refresh();
  },
  methods: {
    async refresh() {
      try {
        await StoreService.ensureReady();
        this.currentUser = StoreService.getCurrentUser();
        if (!this.isAdmin) return;
        this.currentQuarter = StoreService.getCurrentQuarter();
        // 只在第一次加载或没有选择季度时才设置为当前季度
        if (!this.selectedQuarter) {
          this.selectedQuarter = this.currentQuarter;
        }
        // 更新奖励规则季度选择为当前季度
        this.selectedBonusQuarter = this.currentQuarter;
        // 传递选中的季度到getOverviewTable方法
        this.overviewData = StoreService.getOverviewTable(this.selectedQuarter);
        this.leaderboard = StoreService.getLeaderboard();
        this.users = StoreService.getUsers();
        this.refreshBranches();
        this.refreshRules();
        this.settings = StoreService.getSettings();
        this.ruleDescriptionSections = StoreService.getRuleDescriptionSections();
        this.allSubmissions = StoreService.getSubmissions();
        // 初始化奖励规则配置，支持多季度
        this.bonusRules = this.settings.bonusRules || {};
        // 加载当前季度的奖励规则
        this.loadCurrentBonusRules();
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      }
    },
    // 保存奖励规则
    // 加载当前季度的奖励规则
    loadCurrentBonusRules() {
      // 从settings中获取所有季度的奖励规则
      const allBonusRules = this.settings.bonusRules || {};
      // 获取当前选择季度的奖励规则，如果没有则使用默认值
      const rawRules = allBonusRules[this.selectedBonusQuarter] || {
        threshold: 30,
        baseRate: 35,
        highScoreThreshold: 100,
        highScoreRate: 45,
        penaltyRate: 0
      };
      // 确保规则中包含penaltyType和fixedPenalty字段
      this.currentBonusRules = {
        ...rawRules,
        penaltyType: rawRules.penaltyType || 'rate',
        fixedPenalty: rawRules.fixedPenalty || 2000
      };
    },
    
    // 处理奖励规则季度选择变化
    handleBonusQuarterChange(e) {
      const index = e.detail.value;
      this.selectedBonusQuarter = this.quarterOptions[index];
      // 加载选中季度的奖励规则
      this.loadCurrentBonusRules();
    },
    // 处理业绩汇总季度选择变化
    handleOverviewQuarterChange(e) {
      this.selectedQuarter = this.quarterOptions[e.detail.value];
      // 重新加载数据以反映选定季度
      this.refresh();
    },
    
    async saveBonusRules() {
      try {
        // 验证输入
        if (this.currentBonusRules.threshold < 0 || this.currentBonusRules.baseRate < 0 || 
            this.currentBonusRules.highScoreThreshold < 0 || this.currentBonusRules.highScoreRate < 0 || 
            this.currentBonusRules.penaltyRate < 0 || this.currentBonusRules.fixedPenalty < 0) {
          uni.showToast({ title: '奖励规则参数不能为负数', icon: 'none' });
          return;
        }
        
        if (this.currentBonusRules.threshold >= this.currentBonusRules.highScoreThreshold) {
          uni.showToast({ title: '奖励门槛必须小于高分阈值', icon: 'none' });
          return;
        }
        
        // 获取所有季度的奖励规则
        const allBonusRules = this.settings.bonusRules || {};
        // 更新当前季度的奖励规则
        const updatedRules = {
          ...allBonusRules,
          [this.selectedBonusQuarter]: this.currentBonusRules
        };
        
        // 保存到settings
        await StoreService.updateSettings({ bonusRules: updatedRules });
        // 重新获取设置
        this.settings = StoreService.getSettings();
        uni.showToast({ title: '保存成功', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    },
    handleStartDateChange(e) {
      this.startDate = e.detail.value;
    },
    handleEndDateChange(e) {
      this.endDate = e.detail.value;
    },
    getEmployeeName(employeeId) {
      const user = this.users.find(u => u.id === employeeId);
      return user ? user.name : '未知用户';
    },
    getEmployeeBranch(employeeId) {
      const user = this.users.find(u => u.id === employeeId);
      return user ? user.branch : '未知支行';
    },
    getRuleName(ruleId) {
      const rule = this.rules.find(r => r.id === ruleId);
      return rule ? rule.name : '未知业务';
    },
    calculateSubmissionScore(submission) {
      const rule = this.rules.find(r => r.id === submission.ruleId);
      if (!rule) return 0;
      
      const config = submission.type === 'stock' ? rule.pointsStock : rule.pointsNew;
      const itemPoints = (config?.item || 0) * submission.count;
      const amountPoints = (config?.million || 0) * (submission.amount / 100);
      
      return Math.round((itemPoints + amountPoints) * 100) / 100;
    },
    handleExportSubmissions() {
      if (!this.filteredSubmissions.length) {
        uni.showToast({ title: '暂无数据', icon: 'none' });
        return;
      }
      
      // 构建CSV内容
      const headers = ['客户经理', '支行', '业务名称', '业务类型', '提报日期', '笔数', '金额(万)', '积分'];
      const rows = this.filteredSubmissions.map(sub => {
        const employee = this.users.find(u => u.id === sub.employeeId);
        const rule = this.rules.find(r => r.id === sub.ruleId);
        return [
          employee?.name || '未知用户',
          employee?.branch || '未知支行',
          rule?.name || '未知业务',
          sub.type === 'new' ? '新增' : '存量',
          this.formatDate(sub.timestamp),
          sub.count,
          sub.amount,
          this.calculateSubmissionScore(sub)
        ];
      });
      
      // 构建完整CSV内容
      const bom = '\ufeff'; // UTF-8 BOM
      const csvContent = bom + [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // 生成文件名
      const filename = `提报记录_${new Date().toISOString().slice(0, 10)}_${Date.now()}.csv`;
      
      // 使用现有导出功能保存文件
      this.saveAndShareExcel(csvContent, filename, 'csv');
    },
    refreshBranches() {
      this.branches = StoreService.getBranches();
      if (this.userForm.branch) {
        const idx = Math.max(
          this.branchNameOptions.findIndex(name => name === this.userForm.branch),
          0
        );
        this.branchIndex = idx;
        this.userForm.branch = this.branchNameOptions[idx] || '';
      }
    },
    refreshRules() {
      this.rules = StoreService.getRules();
    },
    getRank(employeeId) {
      return this.leaderboard.find(entry => entry.employeeId === employeeId)?.rank || '-';
    },
    // 显示导出弹框
    handleExport() {
      this.showExportModal = true;
    },
    // 关闭导出弹框
    closeExportModal() {
      this.showExportModal = false;
      this.exportStartDate = '';
      this.exportEndDate = '';
    },
    // 处理导出季度选择变化
    handleExportQuarterChange(e) {
      this.exportSelectedQuarter = this.quarterOptions[e.detail.value];
    },
    // 导出选定季度收单通报表
    exportQuarterReport() {
      if (!this.isAdmin) return;
      
      // 根据选择的导出季度重新计算数据
      const exportData = StoreService.getOverviewTable(this.exportSelectedQuarter);
      if (!exportData.length) {
        uni.showToast({ title: '该季度暂无数据', icon: 'none' });
        return;
      }
      
      // 临时保存当前overviewData
      const originalOverviewData = this.overviewData;
      // 使用导出季度的数据
      this.overviewData = exportData;
      
      const isWeChat = typeof wx !== 'undefined' && !!wx.getFileSystemManager;
      if (isWeChat) {
        // 微信环境使用CSV格式，更可靠
        const csv = this.buildExportCsv();
        const filename = `收单通报_${this.exportSelectedQuarter}_${Date.now()}.csv`;
        this.saveAndShareExcel(csv, filename, 'csv');
      } else {
        // Web环境保持原有XML格式
        const columnTree = this.getExportColumnTree();
        const leafColumns = this.collectLeafColumns(columnTree);
        const headerRows = this.buildHeaderRows(columnTree);
        const { start, end } = this.getQuarterDateRange(this.exportSelectedQuarter);
        const dateRangeText = `${start} - ${end}`;
        const title = `${this.exportSelectedQuarter}个人贷款收单通报`;
        const html = this.buildExportHtml({
          title,
          dateRangeText,
          headerRows,
          leafColumns
        });
        const filename = `收单通报_${this.exportSelectedQuarter}_${Date.now()}.xlsx`;
        this.saveAndShareExcel(html, filename);
      }
      
      // 恢复原始overviewData
      this.overviewData = originalOverviewData;
      this.closeExportModal();
    },
    // 导出指定日期范围的提报记录
    exportDateRangeSubmissions() {
      if (!this.isAdmin) return;
      if (!this.exportStartDate || !this.exportEndDate) {
        uni.showToast({ title: '请选择日期范围', icon: 'none' });
        return;
      }
      
      // 过滤日期范围内的提报记录
      const start = new Date(this.exportStartDate).getTime();
      const end = new Date(this.exportEndDate).getTime() + 24 * 60 * 60 * 1000; // 包含当天结束
      const filtered = this.allSubmissions.filter(sub => {
        const subTime = new Date(sub.timestamp).getTime();
        // 只导出活跃客户经理的提报记录
        const employee = this.users.find(u => u.id === sub.employeeId);
        return subTime >= start && subTime < end && employee && employee.role === 'manager' && employee.status === 'active';
      });
      
      if (!filtered.length) {
        uni.showToast({ title: '该日期范围内暂无数据', icon: 'none' });
        return;
      }
      
      // 构建CSV内容
      const headers = ['日期', '客户经理', '支行', '业务分类','业务名称', '业务类型', '笔数', '金额(万)', '积分', '提报时间']; // 根据实际需求调整表头
      const rows = filtered.map(sub => {
        const employee = this.users.find(u => u.id === sub.employeeId);
        const rule = this.rules.find(r => r.id === sub.ruleId);
        return [
          this.formatDate(sub.timestamp, 'date'),
          employee?.name || '未知用户',
          employee?.branch || '未知支行',
          rule?.category === 'personal' ? '个贷' : '小微',
          rule?.name || '未知业务',
          sub.type === 'new' ? '新增' : '存量',
          sub.count,
          sub.amount,
          this.calculateSubmissionScore(sub),
          this.formatDate(sub.timestamp, 'time')
        ];
      });
      
      // 构建完整CSV内容
      const bom = '\ufeff'; // UTF-8 BOM
      const csvContent = bom + [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // 生成文件名
      const filename = `提报记录_${this.exportStartDate}_至_${this.exportEndDate}_${Date.now()}.csv`;
      
      // 导出文件
      this.saveAndShareExcel(csvContent, filename, 'csv');
      this.closeExportModal();
    },
    // 处理导出开始日期变化
    handleExportStartDateChange(e) {
      this.exportStartDate = e.detail.value;
    },
    // 处理导出结束日期变化
    handleExportEndDateChange(e) {
      this.exportEndDate = e.detail.value;
    },
    getExportColumnTree() {
      const sumRuleMetrics = (row, ruleIds, type) => {
        const bucketKey = type === 'stock' ? 'stock' : 'new';
        return (ruleIds || []).reduce(
          (acc, ruleId) => {
            const detail = row.breakdown?.[ruleId];
            if (!detail) return acc;
            const source = detail[bucketKey] || { count: 0, amount: 0 };
            acc.count += Number(source.count) || 0;
            acc.amount += Number(source.amount) || 0;
            return acc;
          },
          { count: 0, amount: 0 }
        );
      };

      const createRuleMetric = (label, ruleIds, type, metric) => ({
        label,
        getter: row => {
          const data = sumRuleMetrics(row, ruleIds, type);
          return metric === 'count'
            ? data.count
            : Number(data.amount.toFixed ? data.amount.toFixed(2) : data.amount);
        }
      });

      const createRuleSegment = (label, ruleIds, type, footerKey) => ({
        label,
        footerKey,
        children: [
          createRuleMetric('笔数', ruleIds, type, 'count'),
          createRuleMetric('授信金额', ruleIds, type, 'amount')
        ]
      });

      // 获取未隐藏的活跃规则
      const activeRules = this.rules.filter(rule => !rule.hidden);
      
      // 按分类和分组组织规则
      const ruleMap = {
        personal: {
          mortgage: activeRules.filter(r => r.category === 'personal' && r.group === 'mortgage'),
          credit: activeRules.filter(r => r.category === 'personal' && r.group === 'credit')
        },
        micro: {
          mortgage: activeRules.filter(r => r.category === 'micro' && r.group === 'mortgage'),
          credit: activeRules.filter(r => r.category === 'micro' && r.group === 'credit'),
          offline: activeRules.filter(r => r.category === 'micro' && r.group === 'offline')
        }
      };

      return [
        {
          label: '基础信息',
          children: [
            { label: '网点编号', getter: row => this.getBranchIdByName(row.employee.branch) },
            { label: '网点', getter: row => row.employee.branch },
            { label: '客户经理', getter: row => row.employee.name },
            { label: '排名', getter: row => this.getRank(row.employee.id) },
            { label: '总分', getter: row => row.stats.totalScore },
            { label: '奖励金额', getter: row => row.stats.bonusAmount }
          ]
        },
        {
          label: '积分',
          children: [
            { label: '个贷积分', getter: row => row.stats.personalScore },
            { label: '小微积分', getter: row => row.stats.microScore }
          ]
        },
        {
          label: '个贷',
          children: [
            // 抵押类
            ...(ruleMap.personal.mortgage.length > 0 ? [{
              label: '抵押类完成数',
              children: [
                createRuleSegment('新增', ruleMap.personal.mortgage.map(r => r.id), 'new', 'personal'),
                createRuleSegment('存量', ruleMap.personal.mortgage.map(r => r.id), 'stock', 'personal')
              ]
            }] : []),
            // 信用类
            ...ruleMap.personal.credit.map(rule => ({
              label: rule.name,
              children: [
                createRuleMetric('笔数', [rule.id], 'new', 'count'),
                createRuleMetric('授信金额', [rule.id], 'new', 'amount')
              ]
            }))
          ]
        },
        {
          label: '小微',
          children: [
            // 抵押类
            ...(ruleMap.micro.mortgage.length > 0 ? [{
              label: '抵押类完成数',
              children: [
                createRuleSegment('新增', ruleMap.micro.mortgage.map(r => r.id), 'new', 'micro'),
                createRuleSegment('转贷', ruleMap.micro.mortgage.map(r => r.id), 'stock', 'micro')
              ]
            }] : []),
            // 信用类
            ...ruleMap.micro.credit.map(rule => ({
              label: rule.name,
              children: [
                createRuleMetric('笔数', [rule.id], 'new', 'count'),
                createRuleMetric('授信金额', [rule.id], 'new', 'amount')
              ]
            })),
            // 线下特色
            ...ruleMap.micro.offline.map(rule => ({
              label: rule.name,
              children: [
                createRuleMetric('笔数', [rule.id], 'new', 'count'),
                createRuleMetric('授信金额', [rule.id], 'new', 'amount')
              ]
            }))
          ]
        }
      ];
    },
    collectLeafColumns(tree) {
      const leaves = [];
      const totals = {
        personal: {},
        micro: {}
      };
      const traverse = node => {
        if (!node.children || !node.children.length) {
          if (node.footerKey && node.label) {
            totals[node.footerKey][node.label] = node.getter;
          }
          leaves.push(node);
          return;
        }
        node.children.forEach(traverse);
      };
      tree.forEach(traverse);
      Object.entries(totals).forEach(([key, metrics]) => {
        const labels = Object.keys(metrics);
        if (!labels.length) return;
        leaves.push({
          label: key === 'personal' ? '个贷类总笔数' : '小微类总笔数',
          getter: row =>
            labels
              .filter(label => label.includes('笔数'))
              .reduce((sum, label) => sum + (metrics[label]?.(row) || 0), 0)
        });
        leaves.push({
          label: key === 'personal' ? '个贷类总授信金额' : '小微类总授信金额',
          getter: row =>
            labels
              .filter(label => label.includes('授信金额'))
              .reduce((sum, label) => sum + (metrics[label]?.(row) || 0), 0)
        });
      });
      return leaves;
    },
    buildHeaderRows(tree) {
      const depthOf = node => {
        if (!node.children || !node.children.length) return 1;
        return 1 + Math.max(...node.children.map(depthOf));
      };
      const maxDepth = Math.max(...tree.map(depthOf));
      const rows = [];
      const traverse = (node, level) => {
        const hasChildren = node.children && node.children.length;
        let colspan = 0;
        if (hasChildren) {
          node.children.forEach(child => {
            colspan += traverse(child, level + 1);
          });
        } else {
          colspan = 1;
        }
        const rowspan = hasChildren ? 1 : maxDepth - level;
        if (!rows[level]) rows[level] = [];
        rows[level].push({
          label: node.label,
          colspan,
          rowspan
        });
        return colspan;
      };
      tree.forEach(node => traverse(node, 0));
      return rows;
    },
    buildExportHtml({ title, dateRangeText, headerRows, leafColumns }) {
      const columnCount = leafColumns.length;
      const headerRowsXml = headerRows
        .map(
          row =>
            `<Row ss:AutoFitHeight="1">${row
              .map(
                cell =>
                  `<Cell ss:MergeAcross="${cell.colspan - 1}" ss:MergeDown="${
                    cell.rowspan - 1
                  }"><Data ss:Type="String">${this.escapeExcel(cell.label)}</Data></Cell>`
              )
              .join('')}</Row>`
        )
        .join('');
      const bodyRowsXml = this.overviewData
        .map(row => {
          const cells = leafColumns
            .map(col => {
              const value = col.getter ? col.getter(row) : '';
              const isNumber = typeof value === 'number';
              return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${this.escapeExcel(
                this.formatCellValue(value)
              )}</Data></Cell>`;
            })
            .join('');
          return `<Row>${cells}</Row>`;
        })
        .join('');
      return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="title">
      <Font ss:Bold="1" ss:Size="14" />
      <Alignment ss:Horizontal="Center" />
    </Style>
    <Style ss:ID="meta">
      <Alignment ss:Horizontal="Center" />
    </Style>
    <Style ss:ID="header">
      <Font ss:Bold="1" />
      <Alignment ss:Horizontal="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
    <Style ss:ID="cell">
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="Sheet1">
    <Table>
      <Row ss:AutoFitHeight="1" ss:StyleID="title">
        <Cell ss:MergeAcross="${columnCount - 1}"><Data ss:Type="String">${this.escapeExcel(
          title
        )}</Data></Cell>
      </Row>
      <Row ss:AutoFitHeight="1" ss:StyleID="meta">
        <Cell ss:MergeAcross="${columnCount - 1}"><Data ss:Type="String">${this.escapeExcel(
          `数据区间：${dateRangeText}`
        )}</Data></Cell>
      </Row>
      ${headerRowsXml}
      ${bodyRowsXml}
    </Table>
  </Worksheet>
</Workbook>`;
    },
    
    buildExportCsv() {
            // 动态从规则生成CSV导出
      const { start, end } = this.getQuarterDateRange(this.exportSelectedQuarter);
      const title = `${this.exportSelectedQuarter}个人贷款收单通报`;
      const dateRangeText = `数据区间：${start} - ${end}`;
      
      // 构建动态表头
      const headers = ['网点编号', '网点', '客户经理', '排名', '总分', '奖励金额(元)', '个贷积分', '小微积分'];
      
      // 遍历所有规则分组，按分类和分组组织表头
      this.ruleSections.forEach(section => {
        // 遍历该分组下的所有规则
        section.rules.forEach(rule => {
          // 根据规则类型构建完整的列名
          const baseName = `${rule.name}`;
          
          // 新增业务列
          headers.push(`${baseName}-新增笔数`);
          headers.push(`${baseName}-新增授信金额`);
          
          // 如果有存量/转贷选项，添加相应列
          if (rule.hasStockOption) {
            headers.push(`${baseName}-${rule.stockLabel || '存量'}笔数`);
            headers.push(`${baseName}-${rule.stockLabel || '存量'}授信金额`);
          }
        });
      });
      
      // 添加总计字段
      headers.push('个贷类总笔数', '小微类总笔数');
      
      // 构建数据行
      const dataRows = this.overviewData.map(row => {
        // 获取员工信息
        const employee = row.employee;
        const stats = row.stats;
        const breakdown = row.breakdown;
        
        // 构建数据数组，与表头对应
        const rowData = [
          // 基础信息
          this.getBranchIdByName(employee.branch),
          employee.branch,
          employee.name,
          this.getRank(employee.id),
          
          // 总分和奖励金额
          stats.totalScore,
          stats.bonusAmount >= 0 ? `+${stats.bonusAmount}` : stats.bonusAmount,
          
          // 积分信息
          stats.personalScore,
          stats.microScore
        ];
        
        // 遍历所有规则分组，按分类和分组组织数据
        this.ruleSections.forEach(section => {
          // 遍历该分组下的所有规则
          section.rules.forEach(rule => {
            const breakdownData = breakdown?.[rule.id] || {};
            
            // 新增业务数据
            rowData.push(
              breakdownData.new?.count || 0,
              breakdownData.new?.amount || 0
            );
            
            // 如果有存量/转贷选项，添加相应数据
            if (rule.hasStockOption) {
              rowData.push(
                breakdownData.stock?.count || 0,
                breakdownData.stock?.amount || 0
              );
            }
          });
        });
        
        // 计算个贷类总笔数和小微类总笔数
        let personalTotalCount = 0;
        let microTotalCount = 0;
        
        // 遍历所有规则，计算总计
        this.rules.forEach(rule => {
          const breakdownData = breakdown?.[rule.id] || {};
          const ruleTotal = (breakdownData.new?.count || 0) + (breakdownData.stock?.count || 0);
          
          if (rule.category === 'personal') {
            personalTotalCount += ruleTotal;
          } else if (rule.category === 'micro') {
            microTotalCount += ruleTotal;
          }
        });
        
        // 添加总计数据
        rowData.push(personalTotalCount, microTotalCount);
        
        return rowData;
      });
      
      // 构建完整CSV内容
      let csv = `${title}\n`;
      csv += `${dateRangeText}\n\n`;
      csv += `${headers.join(',')}\n`;
      
      // 添加数据行
      dataRows.forEach(row => {
        // 处理CSV转义
        const escapedRow = row.map(cell => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csv += `${escapedRow.join(',')}\n`;
      });
      
      return csv;
    },
     
    saveAndShareExcel(html, filename, fileType = 'xlsx') {
      const isWeChat = typeof wx !== 'undefined' && !!wx.getFileSystemManager;
      if (isWeChat) {
        try {
          const fs = wx.getFileSystemManager();
          const filePath = `${wx.env.USER_DATA_PATH}/${filename}`;
          
          // 清理旧文件
          this.cleanupWeChatExports(fs);
          
          if (fileType === 'csv') {
            // CSV格式直接写入，使用同步方式确保可靠性
            fs.writeFileSync(filePath, html, 'utf-8');
          } else {
            // XML格式处理
            const buffer = this.stringToUint8Array(html);
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            fs.writeFileSync(filePath, arrayBuffer);
          }
          
          // 微信小程序分享文件
          if (wx.shareFileMessage) {
            // 使用微信原生分享文件API
            wx.shareFileMessage({
              filePath: filePath,
              fileName: filename,
              success: () => {
                uni.showToast({ title: '分享成功', icon: 'success' });
              },
              fail: (error) => {
                console.error('分享失败', error);
                // 分享失败后尝试打开文件
                this.tryOpenDocument(filePath, fileType);
              }
            });
          } else {
            // 兼容旧版本微信，直接打开文件
            this.tryOpenDocument(filePath, fileType);
          }
        } catch (error) {
          console.error('导出失败', error);
          uni.showToast({ title: '导出失败，请重试', icon: 'none' });
        }
        return;
      }
      if (typeof window !== 'undefined') {
        // Web环境处理
        try {
          let mimeType = 'application/vnd.ms-excel;charset=utf-8;';
          if (fileType === 'csv') {
            mimeType = 'text/csv;charset=utf-8;';
          }
          
          // 使用Blob URL下载
          const blob = new Blob([html], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
          document.body.removeChild(link);
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
          uni.showToast({ title: '已导出', icon: 'success' });
        } catch (error) {
          console.error('Web下载失败', error);
          this.downloadFileBackup(html, filename);
        }
      } else {
        uni.showToast({ title: '当前环境不支持导出', icon: 'none' });
      }
    },
    downloadFileBackup(html, filename) {
      // 使用uni.downloadFile的备用方案
      try {
        // 将html转换为base64
        const base64 = uni.arrayBufferToBase64(this.stringToUint8Array(html).buffer);
        const dataUrl = `data:application/vnd.ms-excel;base64,${base64}`;
        
        // 使用a标签下载
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        uni.showToast({ title: '已导出', icon: 'success' });
      } catch (error) {
        console.error('备用下载方案失败', error);
        uni.showToast({ title: '导出失败，请重试', icon: 'none' });
      }
    },
    getQuarterDateRange(code) {
      const match = /^(\d{4})Q([1-4])$/.exec(code || '');
      if (!match) {
        const today = this.formatDate(new Date());
        return { start: today, end: today };
      }
      const year = Number(match[1]);
      const quarter = Number(match[2]);
      const map = {
        1: ['01-01', '03-31'],
        2: ['04-01', '06-30'],
        3: ['07-01', '09-30'],
        4: ['10-01', '12-31']
      };
      const [startMd, endMd] = map[quarter];
      const start = `${year}${startMd.replace('-', '')}`;
      const quarterEnd = new Date(`${year}-${endMd}T23:59:59`);
      const now = new Date();
      const endDate = now > quarterEnd ? quarterEnd : now;
      const end = this.formatDate(endDate);
      return { start, end };
    },
    formatDate(date, format = 'number') {
      const d = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date;
      const year = d.getFullYear();
      const month = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      const hours = `${d.getHours()}`.padStart(2, '0');
      const minutes = `${d.getMinutes()}`.padStart(2, '0');
      
      if (format === 'date') {
        return `${year}-${month}-${day}`;
      } else if (format === 'datetime') {
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      } else {
        return `${year}${month}${day}`;
      }
    },
    stringToUint8Array(str) {
      if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(str);
      }
      const encoded = unescape(encodeURIComponent(str));
      const result = new Uint8Array(encoded.length);
      for (let i = 0; i < encoded.length; i++) {
        result[i] = encoded.charCodeAt(i);
      }
      return result;
    },
    formatCellValue(value) {
      if (value === null || value === undefined || Number.isNaN(value)) return '';
      if (typeof value === 'number') {
        return Number.isInteger(value) ? value : value.toFixed(2);
      }
      return value;
    },
    escapeExcel(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },
    getBranchIdByName(name) {
      return this.branchMapByName[name]?.id || '';
    },
    formatBranchName(name) {
      // 每两个字换行
      return name.replace(/(.{2})/g, '$1\n');
    },
    cleanupWeChatExports(fs) {
      try {
        const files = fs.readdirSync(wx.env.USER_DATA_PATH) || [];
        files
          .filter(name => /\.(xls[x]?|csv)$/.test(name))
          .forEach(name => {
            try {
              fs.unlinkSync(`${wx.env.USER_DATA_PATH}/${name}`);
            } catch (error) {
              console.warn('删除旧导出失败', error);
            }
          });
      } catch (error) {
        console.warn('读取导出目录失败', error);
      }
    },
    
    tryOpenDocument(filePath, fileType) {
      // 尝试打开文档
      uni.openDocument({
        filePath,
        fileType: fileType,
        showMenu: true,
        success: () => {
          uni.showToast({ title: '文件已打开，可手动分享', icon: 'success' });
        },
        fail: (error) => {
          console.error('打开文件失败', error);
          // 显示简单的成功提示，避免用户困惑
          uni.showModal({
            title: '导出成功',
            content: '文件已生成，可通过"微信-我-设置-通用-文件管理"查看',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      });
    },
    handleReset() {
      if (!this.isAdmin) return;
      uni.showModal({
        title: '清空数据',
        content: '确认清空本季度所有提报记录？该操作不可恢复。',
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.clearQuarterData({ archiveOnly: false });
            await this.refresh();
            uni.showToast({ title: '已清空', icon: 'success' });
          } catch (error) {
            uni.showToast({ title: error.message || '清空失败', icon: 'none' });
          }
        }
      });
    },
    async updateSetting(key, value) {
      try {
        await StoreService.updateSettings({ [key]: value });
        this.settings = StoreService.getSettings();
        uni.showToast({ title: '设置已更新', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '更新失败', icon: 'none' });
      }
    },
    openUserModal(user) {
      this.editingUser = user || null;
      if (user) {
        this.userForm = { ...user };
      } else {
        this.userForm = {
          name: '',
          phone: '',
          branch: this.branchNameOptions[0] || '',
          role: 'manager'
        };
      }
      const idx = Math.max(
        this.branchNameOptions.findIndex(name => name === this.userForm.branch),
        0
      );
      this.branchIndex = idx;
      this.userForm.branch = this.branchNameOptions[idx] || '';
      this.roleIndex = this.userForm.role === 'admin' ? 1 : 0;
      this.showUserModal = true;
    },
    closeUserModal() {
      this.showUserModal = false;
    },
    handleBranchPicker(event) {
      this.branchIndex = Number(event.detail.value);
      this.userForm.branch = this.branchNameOptions[this.branchIndex] || '';
    },
    handleRolePicker(event) {
      this.roleIndex = Number(event.detail.value);
      this.userForm.role = this.roleIndex === 1 ? 'admin' : 'manager';
    },
    async submitUserForm() {
      if (!this.userForm.name || !this.userForm.phone) {
        uni.showToast({ title: '请完整填写信息', icon: 'none' });
        return;
      }
      try {
        if (this.editingUser) {
          await StoreService.updateUser(this.editingUser.id, this.userForm);
          uni.showToast({ title: '已更新', icon: 'success' });
        } else {
          await StoreService.addUser(this.userForm);
          uni.showToast({ title: '已新增', icon: 'success' });
        }
        this.closeUserModal();
        await this.refresh();
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    },
    async toggleUserStatus(user) {
      try {
        await StoreService.toggleUserStatus(user.id);
        await this.refresh();
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    },
    handleResetPassword(user) {
      if (!user) return;
      uni.showModal({
        title: '确认重置',
        content: `确认将【${user.name}】的密码重置为123456？`,
        cancelText: '再想想',
        confirmText: '确认重置',
        confirmColor: '#0f766e',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.resetPassword(user.id);
            uni.showToast({
              title: '密码已重置',
              icon: 'success'
            });
          } catch (error) {
            uni.showToast({ title: error.message || '重置失败', icon: 'none' });
          }
        }
      });
    },
    // 导入业绩相关方法
    handleImportTemplate() {
      this.showImportModal = true;
    },
    closeImportModal() {
      this.showImportModal = false;
      this.selectedFileName = '';
      this.selectedFile = null;
    },
    downloadImportTemplate() {
      // 构建导入模板数据
      const headers = ['客户经理姓名', '网点', '季度'];
      
      // 根据业务规则添加动态列
      this.ruleSections.forEach(section => {
        section.rules.forEach(rule => {
          const baseName = `${rule.name}`;
          headers.push(`${baseName}-新增笔数`);
          headers.push(`${baseName}-新增授信金额`);
          if (rule.hasStockOption) {
            headers.push(`${baseName}-${rule.stockLabel || '存量'}笔数`);
            headers.push(`${baseName}-${rule.stockLabel || '存量'}授信金额`);
          }
        });
      });
      
      // 添加所有用户的数据行作为示例
      const sampleData = [];
      this.users.forEach(user => {
        const row = [
          user.name,
          user.branch,
          this.currentQuarter
        ];
        
        // 为每个业务规则添加示例数据
        this.ruleSections.forEach(section => {
          section.rules.forEach(rule => {
            // 新增业务示例
            row.push(0); // 新增笔数
            row.push(0); // 新增授信金额
            
            // 存量/转贷示例
            if (rule.hasStockOption) {
              row.push(0); // 存量笔数
              row.push(0); // 存量授信金额
            }
          });
        });
        
        sampleData.push(row);
      });
      
      // 构建CSV内容，确保使用UTF-8编码
      // 添加BOM头，确保Excel等软件能正确识别UTF-8编码
      const bom = '\ufeff';
      const csvContent = bom + [
        headers.join(','),
        ...sampleData.map(row => row.join(','))
      ].join('\n');
      
      // 生成文件名
      const filename = `业绩导入模板_${this.currentQuarter}_${Date.now()}.csv`;
      
      // 使用现有导出功能保存文件
      this.saveAndShareExcel(csvContent, filename, 'csv');
    },
    selectImportFile() {
      // 使用uni.chooseMessageFile，这是微信小程序兼容更好的文件选择API
      uni.chooseMessageFile({
        count: 1,
        type: 'file',
        // 只允许选择文档类型，提高成功率
        extension: ['csv', 'xlsx'],
        success: res => {
          console.log('文件选择成功，返回结果：', res);
          const file = res.tempFiles[0];
          console.log('选中的文件：', file);
          
          // 验证文件类型
          const fileName = file.name.toLowerCase();
          if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
            uni.showToast({ title: '请选择.csv或.xlsx格式的文件', icon: 'none' });
            return;
          }
          
          this.selectedFileName = file.name;
          this.selectedFile = file;
        },
        fail: error => {
          console.error('选择文件失败', error);
          uni.showToast({ title: '选择文件失败：' + error.errMsg, icon: 'none' });
        }
      });
    },
    async handleImportData() {
      if (!this.selectedFile) {
        uni.showToast({ title: '请先选择文件', icon: 'none' });
        return;
      }
      
      // 确认是否清空当前季度数据
      uni.showModal({
        title: '导入确认',
        content: '导入数据将覆盖当前季度的所有提报记录，是否继续？',
        confirmText: '继续导入',
        confirmColor: '#ef4444',
        cancelText: '取消',
        success: async (res) => {
          if (!res.confirm) return;
          
          uni.showLoading({ title: '正在导入...' });
          
          try {
            console.log('开始导入，文件信息：', this.selectedFile);
            
            // 1. 读取文件内容
            const fileContent = await this.readFileContent(this.selectedFile);
            console.log('文件内容读取成功，长度：', fileContent?.length);
            console.log('文件内容前100字符：', fileContent?.substring(0, 100));
            
            // 2. 解析文件（根据文件类型选择不同的解析方式）
            let data;
            if (this.selectedFile.name.endsWith('.csv')) {
              data = this.parseCsv(fileContent);
              console.log('CSV解析成功，表头：', data.headers, '数据行数：', data.rows.length);
            } else {
              // 对于xlsx文件，需要引入专门的解析库，这里简化处理
              throw new Error('暂不支持.xlsx格式，请使用.csv格式');
            }
            
            // 3. 动态解析表头和数据
            const { headers, rows } = data;
            
            // 4. 动态匹配业务规则和数据列
            const importResults = await this.processImportData(headers, rows);
            
            // 5. 保存导入结果
            await this.saveImportedData(importResults);
            
            uni.showModal({
              title: '导入成功',
              content: `成功导入 ${importResults.successCount} 条数据，跳过 ${importResults.skipCount} 条数据`,
              showCancel: false,
              success: async () => {
                await this.refresh();
                this.closeImportModal();
              }
            });
          } catch (error) {
            console.error('导入失败详细信息：', error);
            console.error('错误堆栈：', error.stack);
            uni.showToast({ title: '导入失败：' + error.message, icon: 'none', duration: 3000 });
          } finally {
            uni.hideLoading();
          }
        }
      });
    },
    // 读取文件内容
    readFileContent(file) {
      return new Promise((resolve, reject) => {
        try {
          console.log('文件信息：', file);
          
          // 微信小程序中，chooseMessageFile返回的文件是临时文件
          // 需要先将临时文件保存到本地，然后再读取
          const tempFilePath = file.path;
          if (!tempFilePath) {
            reject(new Error('文件路径无效'));
            return;
          }
          
          console.log('临时文件路径：', tempFilePath);
          
          if (typeof wx !== 'undefined' && wx.getFileSystemManager) {
            const fs = wx.getFileSystemManager();
            
            // 生成一个本地临时文件路径
            const localFilePath = wx.env.USER_DATA_PATH + '/' + file.name;
            console.log('本地临时文件路径：', localFilePath);
            
            // 首先将临时文件复制到本地
            fs.copyFile({
              srcPath: tempFilePath,
              destPath: localFilePath,
              success: () => {
                console.log('文件复制成功，开始读取本地文件');
                
                // 然后读取本地文件
                fs.readFile({
                  filePath: localFilePath,
                  encoding: 'utf8',
                  success: res => {
                    console.log('读取本地文件成功，返回结果：', res);
                    console.log('文件数据类型：', typeof res.data);
                    console.log('文件数据长度：', res.data?.length);
                    
                    if (res.data && res.data.length > 0) {
                      console.log('文件内容前100字符：', res.data.substring(0, 100));
                      resolve(res.data);
                    } else {
                      // 如果UTF-8读取失败，尝试使用binary编码
                      console.log('UTF-8读取为空，尝试使用binary编码');
                      fs.readFile({
                        filePath: localFilePath,
                        encoding: 'binary',
                        success: binaryRes => {
                          console.log('binary读取成功，返回结果：', binaryRes);
                          console.log('binary数据长度：', binaryRes.data?.length);
                          
                          if (binaryRes.data && binaryRes.data.length > 0) {
                            // 修复编码转换问题，使用更可靠的方式处理
                            try {
                              // 微信小程序中，使用另一种方式处理编码
                              // 直接返回binary数据，后续解析时处理
                              resolve(binaryRes.data);
                            } catch (encodeError) {
                              console.error('编码转换失败：', encodeError);
                              // 直接返回binary数据
                              resolve(binaryRes.data);
                            }
                          } else {
                            reject(new Error('文件内容为空'));
                          }
                        },
                        fail: binaryErr => {
                          console.error('binary读取失败：', binaryErr);
                          reject(new Error('文件读取失败：' + binaryErr.errMsg));
                        }
                      });
                    }
                  },
                  fail: readErr => {
                    console.error('读取本地文件失败：', readErr);
                    reject(new Error('文件读取失败：' + readErr.errMsg));
                  }
                });
              },
              fail: copyErr => {
                console.error('文件复制失败：', copyErr);
                reject(new Error('文件复制失败：' + copyErr.errMsg));
              }
            });
          } else {
            reject(new Error('当前环境不支持文件操作'));
          }
        } catch (innerError) {
          console.error('readFileContent内部错误：', innerError);
          reject(new Error('文件读取过程中发生错误：' + innerError.message));
        }
      });
    },
    // 解析CSV文件
    parseCsv(content) {
      console.log('开始解析CSV，内容类型：', typeof content, '内容长度：', content?.length);
      
      // 增强的内容检查
      if (content === null || content === undefined) {
        throw new Error('文件内容为空值');
      }
      if (typeof content !== 'string') {
        throw new Error('文件内容不是字符串，而是：' + typeof content);
      }
      if (content.trim() === '') {
        throw new Error('文件内容为空字符串');
      }
      
      // 处理可能的BOM头（Byte Order Mark）
      // 修复：处理多种可能的BOM头格式
      let cleanContent = content;
      // 移除UTF-8 BOM头
      if (cleanContent.startsWith('\ufeff')) {
        cleanContent = cleanContent.substring(1);
      }
      // 移除其他可能的BOM头
      cleanContent = cleanContent.replace(/^\uFEFF|^\u00BB\u00BF/g, '');
      
      // 修复：正确处理换行符，支持\r\n和\n
      const lines = cleanContent.split(/\r?\n/).filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('文件内容为空或仅包含空行');
      }
      
      // 解析表头
      const headers = lines[0].split(',').map(header => header.trim());
      if (headers.length === 0) {
        throw new Error('表头解析失败，可能是文件格式错误');
      }
      
      // 解析数据行
      const rows = lines.slice(1).map(line => {
        // 修复：正确处理带有引号的字段
        const cells = this.parseCsvLine(line);
        return cells.map(cell => cell.trim());
      });
      
      console.log('CSV解析完成，表头：', headers, '数据行数：', rows.length);
      return { headers, rows };
    },
    // 解析CSV行，处理带有引号的字段
    parseCsvLine(line) {
      const cells = [];
      let currentCell = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // 转义引号："" 表示单个引号
            currentCell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // 分隔符，结束当前单元格
          cells.push(currentCell);
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      
      // 添加最后一个单元格
      cells.push(currentCell);
      return cells;
    },
    // 动态处理导入数据
    async processImportData(headers, rows) {
      let successCount = 0;
      let skipCount = 0;
      
      // 检查必要参数
      if (!headers || !Array.isArray(headers) || headers.length === 0) {
        throw new Error('表头解析失败');
      }
      if (!rows || !Array.isArray(rows)) {
        throw new Error('数据行解析失败');
      }
      
      // 修复：处理编码问题，不严格检查表头名称，而是通过列索引来获取数据
      // 假设前3列分别是：客户经理姓名、网点、季度
      const nameIndex = 0;
      const branchIndex = 1;
      const quarterIndex = 2;
      
      // 验证必要的表头
      // 确保使用我们导出的UTF-8模板，这样表头名称能正确匹配
      const requiredHeaders = ['客户经理姓名', '网点', '季度'];
      let hasRequiredHeaders = true;
      for (const header of requiredHeaders) {
        if (headers.indexOf(header) === -1) {
          console.warn(`缺少必要的表头：${header}`);
          hasRequiredHeaders = false;
        }
      }
      
      if (!hasRequiredHeaders) {
        console.warn('使用系统导出的UTF-8模板可以获得更好的导入效果');
      }
      
      // 构建业务规则列名映射
      const ruleColumnMap = {};
      
      // 修复：由于编码问题，不直接匹配表头名称
      // 而是通过列索引来匹配业务规则
      // 从第3列开始，每2或4列对应一个业务规则
      // 格式：[新增笔数, 新增金额] 或 [新增笔数, 新增金额, 存量笔数, 存量金额]
      
      // 确保ruleSections存在
      if (this.ruleSections && Array.isArray(this.ruleSections)) {
        let currentColumnIndex = 3; // 从第4列开始（索引为3）
        
        this.ruleSections.forEach(section => {
          if (section.rules && Array.isArray(section.rules)) {
            section.rules.forEach(rule => {
              // 新增业务列
              const newCountIndex = currentColumnIndex;
              const newAmountIndex = currentColumnIndex + 1;
              
              if (newCountIndex < headers.length && newAmountIndex < headers.length) {
                ruleColumnMap[rule.id] = ruleColumnMap[rule.id] || {};
                ruleColumnMap[rule.id].new = { count: newCountIndex, amount: newAmountIndex };
              }
              
              // 存量/转贷业务列（如果有）
              if (rule.hasStockOption) {
                const stockCountIndex = currentColumnIndex + 2;
                const stockAmountIndex = currentColumnIndex + 3;
                
                if (stockCountIndex < headers.length && stockAmountIndex < headers.length) {
                  ruleColumnMap[rule.id] = ruleColumnMap[rule.id] || {};
                  ruleColumnMap[rule.id].stock = { count: stockCountIndex, amount: stockAmountIndex };
                }
                
                // 移动4列
                currentColumnIndex += 4;
              } else {
                // 移动2列
                currentColumnIndex += 2;
              }
            });
          }
        });
      }
      
      // 处理每一行数据
      for (const row of rows) {
        try {
          // 获取用户信息，使用固定索引
          const userName = row[nameIndex];
          const branchName = row[branchIndex];
          const quarter = row[quarterIndex] || this.currentQuarter;
          
          // 验证用户信息
          if (!userName || !branchName) {
            skipCount++;
            continue;
          }
          
          // 查找用户
          console.log('处理行数据，用户名：', userName, '网点：', branchName, '季度：', quarter);
          
          // 修复：使用更宽松的用户匹配条件，确保所有用户都能被正确导入
          const normalizedUserName = userName.trim().toLowerCase();
          const normalizedBranchName = branchName.trim().toLowerCase();
          
          // 尝试1：精确匹配（用户名+网点）
          let user = this.users.find(u => 
            u.name.trim().toLowerCase() === normalizedUserName && 
            u.branch.trim().toLowerCase() === normalizedBranchName
          );
          
          // 尝试2：只匹配用户名
          if (!user) {
            user = this.users.find(u => u.name.trim().toLowerCase() === normalizedUserName);
          }
          
          // 尝试3：模糊匹配用户名
          if (!user) {
            user = this.users.find(u => u.name.trim().toLowerCase().includes(normalizedUserName));
          }
          
          if (user) {
            console.log('找到匹配的用户：', user.name, 'ID:', user.id);
          } else {
            // 如果找不到匹配的用户，记录详细日志
            console.warn('未找到匹配的用户，跳过该行数据：', userName, branchName);
            console.warn('可用用户列表：', this.users.map(u => `${u.name}(${u.branch})`));
            skipCount++;
            continue;
          }
          
          // 收集所有需要导入的提报记录
              const submissionsToImport = [];
              
              for (const [ruleId, columns] of Object.entries(ruleColumnMap)) {
                // 处理新增业务
                if (columns.new) {
                  const count = Number(row[columns.new.count]) || 0;
                  const amount = Number(row[columns.new.amount]) || 0;
                  if (count > 0 || amount > 0) {
                    submissionsToImport.push({ employeeId: user.id, ruleId, type: 'new', count, amount, quarter });
                  }
                }
                
                // 处理存量/转贷业务
                if (columns.stock) {
                  const count = Number(row[columns.stock.count]) || 0;
                  const amount = Number(row[columns.stock.amount]) || 0;
                  if (count > 0 || amount > 0) {
                    submissionsToImport.push({ employeeId: user.id, ruleId, type: 'stock', count, amount, quarter });
                  }
                }
              }
              
              // 批量处理提报记录，限制并发
              for (const submission of submissionsToImport) {
                await this.createSubmission(submission.employeeId, submission.ruleId, submission.type, submission.count, submission.amount, submission.quarter);
                successCount++;
                
                // 每处理10条记录，添加短暂延迟，避免云函数调用频率限制
                if (successCount % 10 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
        } catch (error) {
          console.error('处理行数据失败', error);
          skipCount++;
        }
      }
      
      return { successCount, skipCount };
    },
    // 创建提报记录
    async createSubmission(employeeId, ruleId, type, count, amount, quarter) {
      await StoreService.addSubmission({
        employeeId,
        ruleId,
        type,
        count,
        amount,
        quarter
      });
    },
    // 保存导入的数据
    
    async saveImportedData(results) {
      // 这里可以添加额外的保存逻辑，比如记录导入日志等
      console.log('导入结果', results);
    },
    handleLogout() {
      StoreService.logout();
      this.currentUser = null;
      uni.reLaunch({ url: '/pages/login/login' });
    },
    gotoLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    gotoUserDetails(employee) {
      uni.navigateTo({
        url: `/pages/admin/user-details/user-details?employeeId=${employee.id}&name=${encodeURIComponent(employee.name)}&branch=${encodeURIComponent(employee.branch)}`
      });
    },
    navigateToSubmissionFlow() {
      uni.navigateTo({
        url: `/pages/admin/submission-flow/submission-flow`
      });
    },
    openBranchModal(branch = null) {
      this.editingBranch = branch;
      this.branchForm = branch ? { ...branch } : { id: '', name: '' };
      this.showBranchModal = true;
    },
    closeBranchModal() {
      this.showBranchModal = false;
      this.editingBranch = null;
      this.branchForm = { id: '', name: '' };
    },
    async saveBranch() {
      const id = (this.branchForm.id || '').trim();
      const name = (this.branchForm.name || '').trim();
      if (!id || !name) {
        uni.showToast({ title: '请输入支行编号和名称', icon: 'none' });
        return;
      }
      try {
        if (this.editingBranch) {
          await StoreService.updateBranch(this.editingBranch.id, { id, name });
          uni.showToast({ title: '已更新支行', icon: 'success' });
        } else {
          await StoreService.addBranch({ id, name });
          uni.showToast({ title: '已新增支行', icon: 'success' });
        }
        this.closeBranchModal();
        this.refreshBranches();
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    },
    deleteBranch(branch) {
      uni.showModal({
        title: '删除支行',
        content: `确认删除【${branch.name}】？如有关联用户请先调整所属支行。`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.deleteBranch(branch.id);
            uni.showToast({ title: '已删除', icon: 'success' });
            this.refreshBranches();
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      });
    },
    openRuleModal(rule = null) {
      if (rule) {
        this.editingRule = rule;
        this.ruleForm = {
          name: rule.name,
          category: rule.category,
          group: rule.group,
          icon: rule.icon,
          color: rule.color,
          hasStockOption: !!rule.hasStockOption,
          stockLabel: rule.stockLabel || '存量',
          pointsNewItem: rule.pointsNew?.item ?? 0,
          pointsNewMillion: rule.pointsNew?.million ?? 0,
          pointsStockItem: rule.pointsStock?.item ?? 0,
          pointsStockMillion: rule.pointsStock?.million ?? 0,
          hidden: !!rule.hidden
        };
      } else {
        this.editingRule = null;
        this.ruleForm = ruleFormDefaults();
      }
      this.selectRuleCategory(this.ruleForm.category);
      this.showRuleModal = true;
    },
    closeRuleModal() {
      this.showRuleModal = false;
      this.editingRule = null;
    },
    selectRuleCategory(value) {
      this.ruleForm.category = value;
      const groups = this.ruleGroupOptions[value] || [];
      if (!groups.some(item => item.value === this.ruleForm.group)) {
        this.ruleForm.group = groups[0]?.value || '';
      }
    },
    selectRuleGroup(value) {
      this.ruleForm.group = value;
    },
    selectRuleIcon(icon) {
      this.ruleForm.icon = icon;
    },
    selectRuleColor(color) {
      this.ruleForm.color = color;
    },
    async submitRuleForm() {
      const name = this.ruleForm.name.trim();
      if (!name) {
        uni.showToast({ title: '请输入业务名称', icon: 'none' });
        return;
      }
      const payload = {
        name,
        category: this.ruleForm.category,
        group: this.ruleForm.group,
        icon: this.ruleForm.icon || 'circle',
        color: this.ruleForm.color || '#0f766e',
        hasStockOption: !!this.ruleForm.hasStockOption,
        stockLabel: this.ruleForm.stockLabel || '存量',
        pointsNew: {
          item: Number(this.ruleForm.pointsNewItem) || 0,
          million: Number(this.ruleForm.pointsNewMillion) || 0
        },
        pointsStock: {
          item: this.ruleForm.hasStockOption ? Number(this.ruleForm.pointsStockItem) || 0 : 0,
          million: this.ruleForm.hasStockOption ? Number(this.ruleForm.pointsStockMillion) || 0 : 0
        },
        hidden: this.ruleForm.hidden
      };
      try {
        if (this.editingRule) {
          await StoreService.updateRule(this.editingRule.id, payload);
          uni.showToast({ title: '规则已更新', icon: 'success' });
        } else {
          await StoreService.addRule(payload);
          uni.showToast({ title: '规则已新增', icon: 'success' });
        }
        this.closeRuleModal();
        this.refreshRules();
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    },
    async toggleRuleHidden(rule) {
      try {
        // 切换隐藏状态
        const newHiddenState = !rule.hidden;
        await StoreService.updateRule(rule.id, { hidden: newHiddenState });
        // 刷新规则列表
        uni.showToast({ 
          title: newHiddenState ? '已隐藏' : '已显示', 
          icon: 'success' 
        });
        // 立即更新本地规则对象，触发界面刷新
        const index = this.rules.findIndex(r => r.id === rule.id);
        if (index !== -1) {
          this.rules.splice(index, 1, { ...this.rules[index], hidden: newHiddenState });
        } else {
          // 如果找不到，重新获取所有规则
          this.refreshRules();
        }
      } catch (error) {
        uni.showToast({ 
          title: error.message || '操作失败', 
          icon: 'none' 
        });
      }
    },
    deleteRule(rule) {
      uni.showModal({
        title: '删除规则',
        content: `确定删除业务【${rule.name}】？`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.deleteRule(rule.id);
            uni.showToast({ title: '已删除', icon: 'success' });
            this.refreshRules();
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      });
    },
    openRuleDescriptionModal() {
      const source = this.ruleDescriptionSections.length
        ? this.ruleDescriptionSections
        : StoreService.getRuleDescriptionSections();
      this.ruleDescriptionForm = source.map(section => this.createRuleDescriptionSection(section));
      if (!this.ruleDescriptionForm.length) {
        this.ruleDescriptionForm = [this.createRuleDescriptionSection()];
      }
      this.showRuleDescriptionModal = true;
    },
    closeRuleDescriptionModal() {
      this.showRuleDescriptionModal = false;
    },
    createRuleDescriptionSection(section = null) {
      const uid = `rule_desc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      if (!section) {
        return { id: '', uid, title: '', itemsText: '' };
      }
      return {
        id: section.id || '',
        uid,
        title: section.title || '',
        itemsText: Array.isArray(section.items) ? section.items.join('\n') : ''
      };
    },
    addRuleDescriptionSection() {
      this.ruleDescriptionForm.push(this.createRuleDescriptionSection());
    },
    removeRuleDescriptionSection(index) {
      if (this.ruleDescriptionForm.length <= 1) return;
      this.ruleDescriptionForm.splice(index, 1);
    },
    async submitRuleDescriptionForm() {
      const payload = this.ruleDescriptionForm
        .map(section => {
          const items = section.itemsText
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean);
          return {
            id: section.id || section.uid,
            title: section.title.trim(),
            items
          };
        })
        .filter(section => section.title || section.items.length);
      try {
        this.ruleDescriptionSections = await StoreService.updateRuleDescriptionSections(payload);
        uni.showToast({ title: '说明已更新', icon: 'success' });
        this.closeRuleDescriptionModal();
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.admin-page {
  height: 100vh;
  background: #f5f7fb;
  padding: 32rpx;
  padding-bottom: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.admin-info {
  flex: 1;
}

.admin-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}

.admin-subtitle {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 8rpx;
}

.header-actions {
  min-width: 280rpx;
  max-width: 360rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: flex-end;
}

.action-chip {
  flex: 1 1 45%;
  min-width: 120rpx;
  border-radius: 999rpx;
  padding: 16rpx 0;
  border: 2rpx solid rgba(15, 118, 110, 0.15);
  background: #fff;
  color: #0f766e;
  font-size: 24rpx;
}

.action-chip.danger {
  border-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.admin-tabs {
  display: flex;
  background: #ffffff;
  border-radius: 999rpx;
  padding: 4rpx;
  gap: 4rpx;
  margin-bottom: 24rpx;
}

.admin-tab {
  flex: 1;
  text-align: center;
  border-radius: 999rpx;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #94a3b8;
}

.admin-tab.active {
  background: #0f766e;
  color: #fff;
  font-weight: 600;
}

.admin-content {
  height: calc(100vh - 320rpx);
  width: 100%;
  overflow-y: auto;
  padding-bottom: 60rpx;
}

.tab-panel {
  width: 100%;
}

.admin-content::-webkit-scrollbar,
.tab-panel::-webkit-scrollbar {
  display: none;
}

.table-wrapper {
  background: #fff;
  border-radius: 24rpx;
  padding: 16rpx;
  overflow-x: auto;
}

.table {
  min-width: 110%;
}

.table-row {
	display: grid;
	grid-template-columns: 50rpx 100rpx 110rpx 120rpx 160rpx repeat(2, 120rpx);
	align-items: center;
	padding: 16rpx 12rpx;
	border-bottom: 1px solid #f1f5f9;
	font-size: 26rpx;
	color: #475569;
}

.table-row text {
  text-align: center;
}

.table-row text:nth-child(3) {
  text-align: center;
  white-space: pre-wrap;
  line-height: 1.4;
}

.branch-name {
  text-align: center;
  white-space: pre-wrap;
  line-height: 1.4;
}

.table-header {
  font-size: 24rpx;
  font-weight: 600;
  color: #94a3b8;
}

.highlight {
  color: #0f766e;
  font-weight: 700;
}

.danger {
  color: #ef4444;
  font-weight: 700;
}

.employee-name {
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  gap: 16rpx;
}

.panel-actions {
  display: flex;
  gap: 12rpx;
}

.panel-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  flex: 1;
}

.panel-tip {
  font-size: 22rpx;
  color: #94a3b8;
  margin: 12rpx 0;
  display: block;
}

.panel-header--user {
  flex-wrap: wrap;
}

.panel-header--actions {
  flex-wrap: nowrap;
}

.panel-header--actions .search-input {
  flex: 1;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  min-width: 200rpx;
  background: #f1f5f9;
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  color: #0f172a;
  border: none;
}

.panel-header .primary-btn {
  margin-left: auto;
}

.header-actions-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.header-actions-row .search-input {
  flex: 1;
}

.panel-actions .primary-btn,
.panel-actions .ghost-btn {
  margin-left: 0;
}


.user-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
  display: block;
  margin-bottom: 10rpx;
}

.user-branch,
.user-meta {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 8rpx;
  line-height: 1.4;
}

.user-meta {
  margin-bottom: 0;
}

.user-actions {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
  margin-left: 24rpx;
  align-items: flex-start;
}

.user-actions .link-btn {
  padding: 12rpx 20rpx;
  font-size: 22rpx;
  border-radius: 12rpx;
  white-space: nowrap;
}

.branch-form {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.branch-form__actions {
  display: flex;
  gap: 12rpx;
}

.branch-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.branch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border-radius: 20rpx;
  background: #f8fafc;
  font-size: 26rpx;
  color: #0f172a;
}

.branch-name {
  font-size: 26rpx;
  font-weight: 600;
}

.branch-actions {
  display: flex;
  gap: 12rpx;
}

.panel-group {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.panel {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
}

.rule-groups {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.rule-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
}

.rule-section__header {
  margin-bottom: 16rpx;
}

.rule-section__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.rule-section__subtitle {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.rule-card {
  border: 1px solid #eef2ff;
  border-radius: 20rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  background-color: #f8fafc;
}

.rule-card--empty {
  border-style: dashed;
  color: #94a3b8;
  text-align: center;
}

.rule-card__main {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.rule-card__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.rule-card__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.rule-card__meta {
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.rule-card__points {
  font-size: 24rpx;
  color: #475569;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.rule-card__actions {
  display: flex;
  gap: 12rpx;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.switch-label {
  font-size: 26rpx;
  color: #0f172a;
}

.switch-tip {
  font-size: 22rpx;
  color: #94a3b8;
  display: block;
  margin-top: 4rpx;
}

.form-item {
  margin-bottom: 16rpx;
}

.form-row {
  display: flex;
  gap: 16rpx;
}

.form-item.half {
  flex: 1;
}

.form-label {
  font-size: 24rpx;
  color: #94a3b8;
}

.form-input,
.picker-value {
  margin-top: 8rpx;
  background: #f8fafc;
  border-radius: 18rpx;
  font-size: 28rpx;
  color: #0f172a;
  width: 100%;
  box-sizing: border-box;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
  border: none;
}

.form-textarea {
  margin-top: 8rpx;
  width: 100%;
  min-height: 220rpx;
  background: #f8fafc;
  padding: 20rpx 24rpx;
  border-radius: 18rpx;
  font-size: 26rpx;
  color: #0f172a;
  line-height: 1.5;
  border: none;
  box-sizing: border-box;
  resize: vertical;
}

.form-tip {
  font-size: 22rpx;
  color: #94a3b8;
}

.dual-inputs {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.dual-inputs .form-input {
  flex: 1;
}

.input-with-suffix {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.input-with-suffix .form-input {
  flex: 1;
  width: auto;
}

.input-unit {
  font-size: 24rpx;
  color: #94a3b8;
  white-space: nowrap;
}

.segment {
  display: flex;
  background: #f1f5f9;
  border-radius: 18rpx;
  overflow: hidden;
  margin-top: 12rpx;
}

.segment__item {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  font-size: 24rpx;
  color: #64748b;
}

.segment__item.active {
  background: #0f766e;
  color: #fff;
  font-weight: 600;
}

.chip-list {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-top: 12rpx;
}

.chip {
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  font-size: 24rpx;
  color: #64748b;
}

.chip.active {
  background: #ecfdf5;
  color: #0f766e;
  font-weight: 600;
}

.icon-picker,
.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
  margin-bottom: 12rpx;
}

.icon-picker__item {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  border: 2rpx solid transparent;
  box-shadow: 0 6rpx 16rpx rgba(15, 23, 42, 0.08);
}

.icon-picker__preview {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-picker__item.active {
  border-color: #0f766e;
  background: #ecfdf5;
  color: #0f766e;
}

.color-picker__item {
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  border: 2rpx solid transparent;
}

.color-picker__item.active {
  border-color: #0f172a;
  box-shadow: 0 6rpx 16rpx rgba(15, 23, 42, 0.2);
}

.button-row {
  display: flex;
  gap: 16rpx;
  margin-top: 12rpx;
}

.ghost-btn,
.danger-btn,
.primary-btn,
.light-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  border: none;
  flex-direction: row;
}

.ghost-btn {
  background: #fff;
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  color: #0f766e;
}

.danger-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.primary-btn {
  background: #0f766e;
  color: #fff;
}

.primary-btn.small {
  padding: 12rpx 20rpx;
  font-size: 24rpx;
}

.ghost-btn.small {
  padding: 12rpx 20rpx;
  font-size: 24rpx;
}

.ghost-btn.full-width,
.primary-btn.full-width {
  width: 92%;
}

.link-btn {
  border: none;
  background: transparent;
  font-size: 24rpx;
  color: #0f766e;
}

.link-btn.danger {
  color: #ef4444;
}

.tab-panel::-webkit-scrollbar {
  display: none;
}

.unauth {
  text-align: center;
  color: #94a3b8;
  margin-top: 80rpx;
}

.modal-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 32rpx;
}

.modal {
  width: 100%;
  max-width: 640rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  padding: 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 30rpx;
  font-weight: 600;
}

.modal-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.modal-body {
  padding: 24rpx;
}

.rule-form-body {
  padding: 0 0 24rpx;
}

.rule-form-content {
  margin: 0 24rpx;
}

.rule-desc-body {
  max-height: 60vh;
  padding: 0 0 24rpx;
}

.rule-desc-section {
  border-radius: 24rpx;
  padding: 28rpx;
  margin: 0 24rpx 16rpx;
  background: #ffffff;
  box-shadow: 0 20rpx 60rpx rgba(15, 118, 110, 0.08);
}

.rule-desc-body .ghost-btn.full-width {
  margin: 0 24rpx 24rpx;
}

.rule-desc-actions {
  display: flex;
  justify-content: flex-end;
}

.modal-footer {
  padding: 24rpx;
  display: flex;
  gap: 16rpx;
}
/* 导出弹框样式 */
.export-option {
  margin-bottom: 24rpx;
}

.export-option__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
  display: block;
}

.export-divider {
  height: 2rpx;
  background: linear-gradient(to right, transparent, #cbd5e1, transparent);
  margin: 24rpx 0;
}

.date-range-picker {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.date-picker-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  background: #f8fafc;
  border-radius: 18rpx;
  font-size: 26rpx;
  color: #0f172a;
  text-align: center;
  min-width: 150rpx;
  box-sizing: border-box;
}

.date-separator {
  font-size: 26rpx;
  color: #94a3b8;
  margin: 0 8rpx;
}

/* 规则标签样式 */
.rule-tabs {
  display: flex;
  background: rgba(15, 118, 110, 0.1);
  border-radius: 16rpx;
  padding: 8rpx;
  max-width: 300rpx;
  margin-left: 0;
  flex: 1;
}

.rule-tab {
  flex: 1;
  padding: 12rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #0f766e;
  border-radius: 12rpx;
  transition: all 0.2s ease;
  font-weight: 500;
  min-width: 120rpx;
}

.rule-tab.active {
  background: #0f766e;
  color: #fff;
  font-weight: 600;
}

/* 奖励规则配置表单样式 */
.panel-body .form-tip {
  font-size: 26rpx !important;
  color: #64748b !important;
  margin-bottom: 20rpx;
}

.panel-body .form-label {
  font-size: 26rpx !important;
  font-weight: 600 !important;
  color: #0f172a !important;
  margin-bottom: 12rpx !important;
}

.panel-body .form-input {
  font-size: 26rpx !important;
  padding: 16rpx !important;
  margin-bottom: 16rpx !important;
  height: auto !important;
  min-height: 80rpx !important;
}

.panel-body .button-row {
  margin-top: 24rpx !important;
}
</style>

