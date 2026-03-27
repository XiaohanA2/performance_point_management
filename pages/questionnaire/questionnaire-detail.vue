<template>
  <view class="questionnaire-detail-page">

    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <template v-else-if="questionnaire">
      <!-- 顶部信息区 -->
      <view class="header-card">
        <view class="header-body">
          <view class="header-title-row">
            <text class="header-title">{{ questionnaire.title }}</text>
            <view class="header-badge">{{ getStatusText(questionnaire.status) }}</view>
          </view>
          <view class="header-meta">
            <view class="meta-item">
              <uni-icons type="list" size="13" color="#909399"></uni-icons>
              <text>{{ visibleQuestions.length }} 个问题</text>
            </view>
            <view class="meta-item">
              <uni-icons type="calendar" size="13" color="#909399"></uni-icons>
              <text>截止：{{ formatDate(questionnaire.endDate) }}</text>
            </view>
          </view>
          <text class="header-desc" v-if="questionnaire.description">{{ questionnaire.description }}</text>
        </view>
      </view>

      <!-- 账号信息提示卡（fill 模式） -->
      <view class="user-info-card" v-if="mode === 'fill' && !isGuest && currentUser">
        <uni-icons type="person" size="15" color="#0369a1"></uni-icons>
        <text class="user-info-text">姓名：{{ currentUser.name }} · 电话：{{ currentUser.phone }} · 网点：{{ currentUser.branch || '未设置' }} &nbsp;将随提交自动记录</text>
      </view>

      <!-- 填写模式：瀑布式 -->
      <view class="waterfall-container" v-if="mode === 'fill'">
        <view
          class="question-block"
          v-for="(question, index) in visibleQuestions"
          :key="question.id"
        >
          <!-- 题号 + 标题 -->
          <view class="question-header">
            <view class="question-index">{{ index + 1 }}</view>
            <view class="question-title-wrap">
              <text class="question-title">{{ question.title }}<text class="required-mark" v-if="question.required"> *</text></text>
            </view>
          </view>

          <!-- 单选题 -->
          <view class="options-list" v-if="question.type === 'single'">
            <view
              class="option-item"
              :class="{ selected: answers[question.id] === option }"
              v-for="(option, oi) in question.options"
              :key="oi"
              @click="$set(answers, question.id, option)"
            >
              <view class="option-indicator radio" :class="{ active: answers[question.id] === option }">
                <view class="radio-dot" v-if="answers[question.id] === option"></view>
              </view>
              <text class="option-text">{{ option }}</text>
            </view>
          </view>

          <!-- 多选题 -->
          <view class="options-list" v-else-if="question.type === 'multiple'">
            <view
              class="option-item"
              :class="{ selected: isMultiSelected(question.id, option) }"
              v-for="(option, oi) in question.options"
              :key="oi"
              @click="toggleMulti(question.id, option)"
            >
              <view class="option-indicator checkbox" :class="{ active: isMultiSelected(question.id, option) }">
                <uni-icons
                  v-if="isMultiSelected(question.id, option)"
                  type="checkmarkempty"
                  size="14"
                  color="#fff"
                ></uni-icons>
              </view>
              <text class="option-text">{{ option }}</text>
            </view>
          </view>

          <!-- 文本题 -->
          <view class="text-wrap" v-else-if="question.type === 'text'">
            <textarea
              class="text-input"
              :placeholder="question.placeholder || '请输入内容'"
              :value="answers[question.id] || ''"
              :maxlength="question.maxLength || 500"
              auto-height
              @input="e => $set(answers, question.id, e.detail.value)"
            ></textarea>
            <text class="char-count">{{ (answers[question.id] || '').length }} / {{ question.maxLength || 500 }}</text>
          </view>

          <!-- 短文本题 -->
          <view class="text-wrap" v-else-if="question.type === 'short_text'">
            <input
              class="short-input"
              :placeholder="question.placeholder || '请输入'"
              :value="answers[question.id] || ''"
              @input="e => $set(answers, question.id, e.detail.value)"
            />
          </view>
        </view>

        <!-- 底部占位，防止被按钮遮挡 -->
        <view style="height: 140rpx;"></view>
      </view>

      <!-- 查看模式 -->
      <view class="waterfall-container" v-else-if="mode === 'view' && myResponse">
        <view class="question-block" v-for="(answer, index) in myResponse.answers" :key="answer.questionId">
          <view class="question-header">
            <view class="question-index">{{ index + 1 }}</view>
            <text class="question-title">{{ getQuestionTitle(answer.questionId) }}</text>
          </view>
          <view class="answer-value">
            <text v-if="Array.isArray(answer.value)">{{ answer.value.join('、') }}</text>
            <text v-else>{{ answer.value || '未填写' }}</text>
          </view>
        </view>

        <!-- 管理员回复 -->
        <view class="admin-reply-block" v-if="myResponse.adminReply">
          <view class="reply-header">
            <uni-icons type="chatbubble-filled" size="15" color="#E6A23C"></uni-icons>
            <text>管理员回复</text>
          </view>
          <text class="reply-content">{{ myResponse.adminReply }}</text>
          <text class="reply-time">{{ formatTime(myResponse.repliedAt) }}</text>
        </view>

        <view style="height: 40rpx;"></view>
      </view>

      <!-- 空状态（view模式无回答） -->
      <view class="empty-state" v-else-if="mode === 'view'">
        <uni-icons type="info" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">您还没有填写该问卷</text>
      </view>

      <!-- 底部提交按钮（fill模式） -->
      <view class="bottom-bar" v-if="mode === 'fill'">
        <button class="btn-submit" @click="submitQuestionnaire" :disabled="!canSubmit">
          <uni-icons type="checkmarkempty" size="18" color="#fff"></uni-icons>
          <text>提交问卷</text>
        </button>
      </view>
    </template>

    <!-- 加载失败 -->
    <view class="empty-state" v-else>
      <uni-icons type="info" size="60" color="#DCDFE6"></uni-icons>
      <text class="empty-text">问卷加载失败</text>
    </view>

  </view>
</template>

<script>
import { getQuestionnaireDetail, submitQuestionnaireResponse, getUserResponses } from '../../services/questionnaire-service.js';
import { canFillQuestionnaire, validateQuestionnaireAnswers } from '../../services/questionnaire-service.js';
import { isUserField, getUserFieldValue } from '../../constants/user-field-mapping.js';

export default {
  name: 'QuestionnaireDetail',
  data() {
    return {
      loading: true,
      questionnaireId: '',
      mode: 'fill',
      questionnaire: null,
      answers: {},
      myResponse: null,
      currentUser: null
    };
  },

  computed: {
    isGuest() {
      return !this.currentUser || this.currentUser.role === 'guest';
    },
    visibleQuestions() {
      if (!this.questionnaire) return [];
      if (this.isGuest) return this.questionnaire.questions;
      // 登录用户：隐藏 isPrivate=true 或有 fieldType 的用户字段题
      return this.questionnaire.questions.filter(q => !q.isPrivate && !isUserField(q));
    },
    canSubmit() {
      if (!this.questionnaire) return false;
      const answersArray = Object.keys(this.answers).map(questionId => ({
        questionId,
        value: this.answers[questionId]
      }));
      // 只验证可见题目
      const result = validateQuestionnaireAnswers(this.visibleQuestions, answersArray);
      return result.valid;
    }
  },

  onLoad(options) {
    // 读取当前用户
    try {
      const raw = uni.getStorageSync('perf_current_user') || uni.getStorageSync('currentUser');
      this.currentUser = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    } catch (e) {
      this.currentUser = null;
    }

    // 游客拦截：view模式需要登录（没有userId无法查历史）
    if ((!this.currentUser || this.currentUser.role === 'guest') && (options.mode === 'view')) {
      this.loading = false;
      uni.showModal({
        title: '需要登录',
        content: '查看历史记录需要先登录',
        showCancel: false,
        confirmText: '去登录',
        success: () => uni.navigateTo({ url: '/pages/login/login' })
      });
      return;
    }

    this.questionnaireId = options.id;
    this.mode = options.mode || 'fill';
    this.loadData();
  },

  methods: {
    async loadData() {
      this.loading = true;
      try {
        this.questionnaire = await getQuestionnaireDetail(this.questionnaireId);

        if (this.mode === 'fill') {
          const check = canFillQuestionnaire(this.questionnaire);
          if (!check.canFill) {
            uni.showModal({
              title: '提示',
              content: check.reason,
              showCancel: false,
              success: () => uni.navigateBack()
            });
            return;
          }
          // 检查是否已提交过（用于提交前弹窗提示）
          if (!this.isGuest) {
            try {
              const responses = await getUserResponses();
              const found = responses.find(r => r.questionnaireId === this.questionnaireId);
              if (found) this.myResponse = found;
            } catch (e) {}
          }
        }

        if (this.mode === 'view') {
          try {
            const responses = await getUserResponses();
            const response = responses.find(r => r.questionnaireId === this.questionnaireId);
            if (response) {
              this.myResponse = response;
              response.answers.forEach(a => {
                this.$set(this.answers, a.questionId, a.value);
              });
            }
          } catch (e) {}
        }
      } catch (error) {
        uni.showToast({ title: error.message || '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    isMultiSelected(questionId, option) {
      const value = this.answers[questionId];
      return Array.isArray(value) && value.includes(option);
    },

    toggleMulti(questionId, option) {
      let value = this.answers[questionId] || [];
      if (!Array.isArray(value)) value = [];
      const idx = value.indexOf(option);
      if (idx > -1) {
        value = value.filter(v => v !== option);
      } else {
        value = [...value, option];
      }
      this.$set(this.answers, questionId, value);
    },

    async submitQuestionnaire() {
      if (!this.canSubmit) {
        uni.showToast({ title: '请完成所有必填题', icon: 'none' });
        return;
      }
      const hasSubmitted = this.myResponse != null;
      uni.showModal({
        title: hasSubmitted ? '您已提交过此问卷' : '确认提交',
        content: hasSubmitted ? '检测到您已提交过一次，是否继续提交新的回答？' : '提交后将无法修改，确认提交问卷？',
        success: async (res) => {
          if (res.confirm) await this.doSubmit();
        }
      });
    },

    async doSubmit() {
      uni.showLoading({ title: '提交中...' });
      try {
        // 识别用户字段题（isPrivate 或有 fieldType）
        const userFieldQuestions = this.questionnaire.questions.filter(q => q.isPrivate || isUserField(q));
        let userInfo = {};

        if (!this.isGuest) {
          // 登录用户：自动填充用户字段
          userFieldQuestions.forEach(q => {
            const value = getUserFieldValue(q, this.currentUser);
            if (value) this.$set(this.answers, q.id, value);
          });
          userInfo = {
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            userPhone: this.currentUser.phone,
            userBranch: this.currentUser.branch
          };
        } else {
          // 游客：从手动填写中提取用户信息
          userFieldQuestions.forEach(q => {
            const val = this.answers[q.id] || '';
            if (q.fieldType === 'name') userInfo.userName = val;
            else if (q.fieldType === 'branch') userInfo.userBranch = val;
            else if (['employeeId', 'idCard', 'phone', 'idCardLast4'].includes(q.fieldType)) userInfo.userPhone = val;
          });
        }

        // 按题目顺序排列 answers，避免 Object.keys 插入顺序导致导出乱序
        const answersArray = this.questionnaire.questions
          .filter(q => this.answers[q.id] !== undefined)
          .map(q => ({ questionId: q.id, value: this.answers[q.id] }));
        await submitQuestionnaireResponse(this.questionnaireId, answersArray, userInfo);
        uni.hideLoading();
        uni.redirectTo({
          url: `/pages/questionnaire/submission-success?title=${encodeURIComponent(this.questionnaire.title)}`
        });
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: error.message || '提交失败', icon: 'none' });
      }
    },

    getQuestionTitle(questionId) {
      if (!this.questionnaire) return '';
      const q = this.questionnaire.questions.find(q => q.id === questionId);
      return q ? q.title : '';
    },

    getStatusText(status) {
      return { draft: '草稿', published: '进行中', closed: '已关闭' }[status] || status;
    },

    formatDate(timestamp) {
      const d = new Date(timestamp);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
    }
  }
};
</script>

<style lang="scss" scoped>
.questionnaire-detail-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 40rpx;
}

// ===== Header Card =====
.header-card {
  margin: 24rpx 30rpx 0;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);

  .header-body {
    padding: 28rpx 30rpx 24rpx;
  }

  .header-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
    margin-bottom: 20rpx;
  }

  .header-title {
    flex: 1;
    font-size: 36rpx;
    font-weight: 700;
    color: #303133;
    line-height: 1.4;
  }

  .header-badge {
    flex-shrink: 0;
    padding: 8rpx 20rpx;
    background: #67C23A;
    border-radius: 8rpx;
    font-size: 24rpx;
    color: #fff;
    font-weight: 500;
    margin-top: 6rpx;
  }

  .header-meta {
    display: flex;
    gap: 24rpx;
    margin-bottom: 20rpx;

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6rpx;
      font-size: 24rpx;
      color: #909399;
    }
  }

  .header-desc {
    display: block;
    font-size: 26rpx;
    color: #606266;
    line-height: 1.8;
  }
}

// ===== 账号信息提示 =====
.user-info-card {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin: 20rpx 30rpx 0;
  padding: 18rpx 24rpx;
  background: #eff6ff;
  border-radius: 12rpx;
  border-left: 4rpx solid #3B82F6;
}

.user-info-text {
  flex: 1;
  font-size: 22rpx;
  color: #1d4ed8;
  line-height: 1.6;
}

// ===== 描述卡片 =====
.desc-card {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin: 20rpx 30rpx 0;
  padding: 20rpx 24rpx;
  background: #EBF5FF;
  border-radius: 12rpx;
  border-left: 4rpx solid #3B82F6;

  .desc-text {
    flex: 1;
    font-size: 26rpx;
    color: #606266;
    line-height: 1.7;
  }
}

// ===== 瀑布容器 =====
.waterfall-container {
  padding: 24rpx 30rpx 0;
}

// ===== 问题块 =====
.question-block {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);

  .question-header {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin-bottom: 24rpx;
  }

  .question-index {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #3B82F6, #2563EB);
    color: #fff;
    font-size: 24rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .question-title-wrap {
    flex: 1;
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .question-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #303133;
    line-height: 1.5;
    flex: 1;
    min-width: 0;
  }

  .required-mark {
    color: #F56C6C;
    font-size: 30rpx;
    flex-shrink: 0;
  }
}

// ===== 选项 =====
.options-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  background: #F5F7FA;
  border-radius: 12rpx;
  border: 2rpx solid transparent;

  &.selected {
    background: #EBF5FF;
    border-color: #3B82F6;
  }

  .option-indicator {
    width: 36rpx;
    height: 36rpx;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &.radio {
      border-radius: 50%;
      border: 2rpx solid #DCDFE6;

      &.active {
        border-color: #3B82F6;
      }

      .radio-dot {
        width: 20rpx;
        height: 20rpx;
        background: #3B82F6;
        border-radius: 50%;
      }
    }

    &.checkbox {
      border-radius: 6rpx;
      border: 2rpx solid #DCDFE6;

      &.active {
        background: #3B82F6;
        border-color: #3B82F6;
      }
    }
  }

  .option-text {
    flex: 1;
    font-size: 28rpx;
    color: #303133;
    line-height: 1.5;
  }
}

// ===== 文本输入 =====
.text-wrap {
  .text-input {
    width: 100%;
    min-height: 180rpx;
    padding: 20rpx;
    background: #F5F7FA;
    border-radius: 12rpx;
    font-size: 28rpx;
    line-height: 1.7;
    box-sizing: border-box;
    color: #303133;
  }

  .short-input {
    width: 100%;
    height: 80rpx;
    line-height: 80rpx;
    padding: 0 20rpx;
    background: #F5F7FA;
    border-radius: 12rpx;
    font-size: 28rpx;
    box-sizing: border-box;
    color: #303133;
  }

  .char-count {
    text-align: right;
    margin-top: 10rpx;
    font-size: 22rpx;
    color: #C0C4CC;
    display: block;
    width: 100%;
  }
}

// ===== 查看模式答案 =====
.answer-value {
  padding: 20rpx;
  background: #F5F7FA;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #606266;
  line-height: 1.7;
}

// ===== 管理员回复 =====
.admin-reply-block {
  background: #FFF7E6;
  border-radius: 16rpx;
  border-left: 6rpx solid #E6A23C;
  padding: 28rpx;
  margin-bottom: 20rpx;

  .reply-header {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 26rpx;
    font-weight: 600;
    color: #E6A23C;
    margin-bottom: 16rpx;
  }

  .reply-content {
    display: block;
    font-size: 28rpx;
    color: #303133;
    line-height: 1.7;
    margin-bottom: 12rpx;
  }

  .reply-time {
    font-size: 22rpx;
    color: #909399;
  }
}

// ===== 底部提交栏 =====
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 30rpx;
  background: #fff;
  border-top: 1rpx solid #EBEEF5;
  box-shadow: 0 -2rpx 8rpx rgba(0,0,0,0.05);

  .btn-submit {
    width: 100%;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10rpx;
    background: linear-gradient(135deg, #3B82F6, #2563EB);
    color: #fff;
    border-radius: 16rpx;
    font-size: 30rpx;
    font-weight: 600;
    border: none;
    box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.35);

    &[disabled] {
      opacity: 0.5;
      box-shadow: none;
    }
  }
}

// ===== 其他 =====
.loading-container {
  padding: 120rpx 0;
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
</style>
