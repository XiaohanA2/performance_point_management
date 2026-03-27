<template>
  <view class="questionnaire-admin-page">
    <!-- 顶部操作栏 -->
    <view class="header-actions">
      <button class="btn-save" @click="saveAsDraft" :disabled="saving">
        <!-- 云上传图标 -->
        <view class="icon-cloud-upload">
          <view class="cloud-body"></view>
          <view class="cloud-arrow"></view>
        </view>
        <text>{{ saving ? '保存中...' : '保存草稿' }}</text>
      </button>
      <button class="btn-publish" @click="publishQuestionnaire" :disabled="saving || !canPublish">
        <!-- 发送图标（纸飞机） -->
        <view class="icon-send">
          <view class="send-body"></view>
        </view>
        <text>{{ saving ? '发布中...' : '发布问卷' }}</text>
      </button>
    </view>

    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 表单内容 -->
    <scroll-view scroll-y class="form-container" v-else>
      <!-- 基本信息 -->
      <view class="form-section">
        <view class="section-title">
          <!-- 文档图标 -->
          <view class="icon-doc">
            <view class="doc-body">
              <view class="doc-line"></view>
              <view class="doc-line"></view>
              <view class="doc-line short"></view>
            </view>
          </view>
          <text>基本信息</text>
        </view>

        <view class="form-item">
          <text class="form-label required">问卷标题</text>
          <input
            class="form-input"
            placeholder="请输入问卷标题"
            v-model="form.title"
            maxlength="100"
          />
        </view>

        <view class="form-item">
          <text class="form-label">问卷描述</text>
          <textarea
            class="form-textarea"
            placeholder="请输入问卷描述（选填）"
            v-model="form.description"
            maxlength="500"
            auto-height
          ></textarea>
        </view>

        <view class="form-item-row">
          <view class="form-item half">
            <text class="form-label required">开始时间</text>
            <picker mode="date" :value="startDateText" @change="onStartDateChange">
              <view class="picker-input">
                <text>{{ startDateText || '请选择' }}</text>
                <view class="icon-arrow-down"><view class="arrow-down-shape"></view></view>
              </view>
            </picker>
          </view>

          <view class="form-item half">
            <text class="form-label required">截止时间</text>
            <picker mode="date" :value="endDateText" @change="onEndDateChange">
              <view class="picker-input">
                <text>{{ endDateText || '请选择' }}</text>
                <view class="icon-arrow-down"><view class="arrow-down-shape"></view></view>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <!-- 问题列表 -->
      <view class="form-section">
        <view class="section-title">
          <!-- 列表图标 -->
          <view class="icon-list-lines">
            <view class="list-line-item"></view>
            <view class="list-line-item"></view>
            <view class="list-line-item short"></view>
          </view>
          <text>问题列表</text>
          <text class="question-count">（{{ form.questions.length }} 个）</text>
        </view>

        <!-- 问题卡片列表 -->
        <view class="questions-list">
          <view
            class="question-card"
            v-for="(question, index) in form.questions"
            :key="question.id"
          >
            <view class="question-header">
              <text class="question-number">问题 {{ index + 1 }}</text>
              <view class="question-actions">
                <button class="btn-icon" @click="moveQuestion(index, -1)" :disabled="index === 0">
                  <view class="icon-chevron up"><view class="chevron-shape"></view></view>
                </button>
                <button class="btn-icon" @click="moveQuestion(index, 1)" :disabled="index === form.questions.length - 1">
                  <view class="icon-chevron down"><view class="chevron-shape"></view></view>
                </button>
                <button class="btn-icon btn-delete" @click="deleteQuestion(index)">
                  <view class="icon-trash">
                    <view class="trash-lid"></view>
                    <view class="trash-body">
                      <view class="trash-line"></view>
                      <view class="trash-line"></view>
                    </view>
                  </view>
                </button>
              </view>
            </view>

            <view class="question-form">
              <view class="form-item">
                <text class="form-label required">问题标题</text>
                <input
                  class="form-input"
                  placeholder="请输入问题"
                  v-model="question.title"
                  maxlength="200"
                />
              </view>

              <view class="form-item-row">
                <view class="form-item half">
                  <text class="form-label required">问题类型</text>
                  <picker :range="questionTypes" range-key="label" :value="getQuestionTypeIndex(question.type)" @change="onQuestionTypeChange(index, $event)">
                    <view class="picker-input">
                      <text>{{ getQuestionTypeLabel(question.type) }}</text>
                      <view class="icon-arrow-down"><view class="arrow-down-shape"></view></view>
                    </view>
                  </picker>
                </view>

                <view class="form-item half">
                  <text class="form-label">是否必填</text>
                  <switch :checked="question.required" @change="onRequiredChange(index, $event)" color="#3B82F6" />
                </view>
              </view>

              <!-- 选项列表（单选/多选） -->
              <view class="options-section" v-if="question.type === 'single' || question.type === 'multiple'">
                <text class="form-label">选项配置</text>
                <view class="options-list">
                  <view
                    class="option-item-edit"
                    v-for="(option, optIndex) in question.options"
                    :key="optIndex"
                  >
                    <text class="option-number">{{ optIndex + 1 }}.</text>
                    <input
                      class="option-input"
                      placeholder="选项内容"
                      v-model="question.options[optIndex]"
                      maxlength="100"
                    />
                    <button class="btn-icon btn-delete" @click="deleteOption(index, optIndex)" :disabled="question.options.length <= 2">
                      <view class="icon-close">
                        <view class="close-line1"></view>
                        <view class="close-line2"></view>
                      </view>
                    </button>
                  </view>
                </view>
                <button class="btn-add-option" @click="addOption(index)">
                  <view class="icon-plus-blue">
                    <view class="plus-h-blue"></view>
                    <view class="plus-v-blue"></view>
                  </view>
                  <text>添加选项</text>
                </button>
              </view>

              <!-- 其他选项（单选） -->
              <view class="form-item" v-if="question.type === 'single'">
                <view class="switch-row">
                  <text class="switch-label">启用"其他"选项</text>
                  <switch :checked="question.hasOtherOption" @change="onHasOtherChange(index, $event)" color="#3B82F6" />
                </view>
              </view>

              <!-- 从账号自动填充 -->
              <view class="form-item">
                <view class="switch-row">
                  <view class="switch-label-group">
                    <text class="switch-label">从账号自动填充</text>
                    <text class="switch-hint">开启后填写时不显示，信息从登录账号提取</text>
                  </view>
                  <switch :checked="question.isPrivate" @change="onIsPrivateChange(index, $event)" color="#3B82F6" />
                </view>
              </view>

              <!-- 字段类型选择（isPrivate 开启时显示） -->
              <view class="form-item" v-if="question.isPrivate">
                <text class="form-label">自动填充字段</text>
                <picker mode="selector" :range="fieldTypeOptions" range-key="label" :value="getFieldTypeIndex(question.fieldType)" @change="onFieldTypeChange(index, $event)">
                  <view class="picker-value">
                    {{ getFieldTypeLabel(question.fieldType) || '请选择字段类型' }}
                  </view>
                </picker>
              </view>

              <!-- 文本题配置 -->
              <view class="form-item" v-if="question.type === 'text'">
                <text class="form-label">输入提示</text>
                <input
                  class="form-input"
                  placeholder="如：请输入您的意见（选填）"
                  v-model="question.placeholder"
                  maxlength="100"
                />
              </view>
            </view>
          </view>

          <!-- 添加问题按钮 -->
          <button class="btn-add-question" @click="addQuestion">
            <view class="icon-plus-blue">
              <view class="plus-h-blue"></view>
              <view class="plus-v-blue"></view>
            </view>
            <text>添加问题</text>
          </button>
        </view>
      </view>

      <!-- 权限配置 -->
      <view class="form-section">
        <view class="section-title">
          <!-- 锁图标 -->
          <view class="icon-lock">
            <view class="lock-shackle"></view>
            <view class="lock-body">
              <view class="lock-hole"></view>
            </view>
          </view>
          <text>权限配置</text>
        </view>

        <view class="permission-item">
          <text class="permission-label">谁可以查看结果</text>
          <view class="permission-roles">
            <view
              class="role-tag"
              :class="{ active: form.permissions.viewRoles.includes(role.value) }"
              v-for="role in availableRoles"
              :key="role.value"
              @click="togglePermission('viewRoles', role.value)"
            >
              {{ role.label }}
            </view>
          </view>
        </view>

        <view class="permission-item">
          <text class="permission-label">谁可以导出数据</text>
          <view class="permission-roles">
            <view
              class="role-tag"
              :class="{ active: form.permissions.exportRoles.includes(role.value) }"
              v-for="role in availableRoles"
              :key="role.value"
              @click="togglePermission('exportRoles', role.value)"
            >
              {{ role.label }}
            </view>
          </view>
        </view>

        <view class="permission-item">
          <text class="permission-label">谁可以回复</text>
          <view class="permission-roles">
            <view
              class="role-tag"
              :class="{ active: form.permissions.replyRoles.includes(role.value) }"
              v-for="role in availableRoles"
              :key="role.value"
              @click="togglePermission('replyRoles', role.value)"
            >
              {{ role.label }}
            </view>
          </view>
        </view>
      </view>

      <!-- 底部占位 -->
      <view style="height: 120rpx;"></view>
    </scroll-view>
  </view>
</template>

<script>
import { getQuestionnaireDetail, createQuestionnaire, updateQuestionnaire } from '../../services/questionnaire-service.js';
import { ROLES } from '../../services/permission-service.js';

export default {
  name: 'QuestionnaireAdmin',
  data() {
    return {
      loading: false,
      saving: false,
      mode: 'create', // create 或 edit
      questionnaireId: '',

      form: {
        title: '',
        description: '',
        startDate: Date.now(),
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        questions: [],
        permissions: {
          viewRoles: [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN],
          exportRoles: [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN],
          replyRoles: [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN]
        }
      },

      questionTypes: [
        { value: 'single', label: '单选题' },
        { value: 'multiple', label: '多选题' },
        { value: 'text', label: '文本题' }
      ],

      fieldTypeOptions: [
        { value: 'name', label: '姓名' },
        { value: 'phone', label: '手机号' },
        { value: 'branch', label: '所在网点/部门' },
        { value: 'idCardLast4', label: '身份证后四位' }
      ],

      availableRoles: [
        { value: ROLES.SUPER_ADMIN, label: '超级管理员' },
        { value: ROLES.QUESTIONNAIRE_ADMIN, label: '问卷管理员' },
        { value: ROLES.ADMIN, label: '普通管理员' }
      ]
    };
  },

  computed: {
    canPublish() {
      return this.form.title &&
             this.form.questions.length > 0 &&
             this.form.endDate > this.form.startDate;
    },

    startDateText() {
      return this.formatDate(this.form.startDate);
    },

    endDateText() {
      return this.formatDate(this.form.endDate);
    }
  },

  onLoad(options) {
    if (options.id) {
      this.mode = 'edit';
      this.questionnaireId = options.id;
      this.loadQuestionnaire();
    } else {
      this.mode = 'create';
      // 新建问卷预设4个隐私问题：登录用户自动填充，游客手动填写
      this.form.questions = [
        { id: 'q_name', type: 'short_text', title: '姓名', required: true, isPrivate: true, fieldType: 'name', options: [], placeholder: '请输入姓名' },
        { id: 'q_phone', type: 'short_text', title: '手机号', required: true, isPrivate: true, fieldType: 'employeeId', options: [], placeholder: '请输入手机号' },
        { id: 'q_branch', type: 'short_text', title: '所在网点/部门', required: true, isPrivate: true, fieldType: 'branch', options: [], placeholder: '请输入所在网点或部门' },
        { id: 'q_idcard_last4', type: 'short_text', title: '身份证后四位', required: true, isPrivate: true, fieldType: 'idCardLast4', options: [], placeholder: '请输入身份证后四位' }
      ];
    }
  },

  methods: {
    async loadQuestionnaire() {
      this.loading = true;

      try {
        const data = await getQuestionnaireDetail(this.questionnaireId);
        this.form = {
          title: data.title,
          description: data.description || '',
          startDate: data.startDate,
          endDate: data.endDate,
          questions: data.questions || [],
          permissions: data.permissions || this.form.permissions
        };
      } catch (error) {
        uni.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },

    async saveAsDraft() {
      if (!this.validateForm()) return;

      this.saving = true;

      try {
        const data = {
          ...this.form,
          status: 'draft'
        };

        if (this.mode === 'edit') {
          await updateQuestionnaire(this.questionnaireId, data);
        } else {
          const result = await createQuestionnaire(data);
          this.questionnaireId = result._id;
          this.mode = 'edit';
        }

        uni.showToast({
          title: '保存成功',
          icon: 'success'
        });
      } catch (error) {
        uni.showToast({
          title: error.message || '保存失败',
          icon: 'none'
        });
      } finally {
        this.saving = false;
      }
    },

    async publishQuestionnaire() {
      if (!this.validateForm()) return;

      uni.showModal({
        title: '确认发布',
        content: '发布后用户即可填写问卷，确认发布？',
        success: async (res) => {
          if (res.confirm) {
            await this.doPublish();
          }
        }
      });
    },

    async doPublish() {
      this.saving = true;

      try {
        const data = {
          ...this.form,
          status: 'published'
        };

        if (this.mode === 'edit') {
          await updateQuestionnaire(this.questionnaireId, data);
        } else {
          const result = await createQuestionnaire(data);
          this.questionnaireId = result._id;
          this.mode = 'edit';
        }

        uni.showToast({
          title: '发布成功',
          icon: 'success'
        });

        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error) {
        uni.showToast({
          title: error.message || '发布失败',
          icon: 'none'
        });
      } finally {
        this.saving = false;
      }
    },

    validateForm() {
      if (!this.form.title || this.form.title.trim() === '') {
        uni.showToast({
          title: '请输入问卷标题',
          icon: 'none'
        });
        return false;
      }

      if (this.form.questions.length === 0) {
        uni.showToast({
          title: '请至少添加一个问题',
          icon: 'none'
        });
        return false;
      }

      if (this.form.endDate <= this.form.startDate) {
        uni.showToast({
          title: '截止时间必须晚于开始时间',
          icon: 'none'
        });
        return false;
      }

      return true;
    },

    addQuestion() {
      const newQuestion = {
        id: `q_${Date.now()}`,
        type: 'text',
        title: '',
        required: false,
        isPrivate: false,
        options: [],
        placeholder: ''
      };

      this.form.questions.push(newQuestion);
    },

    deleteQuestion(index) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这个问题吗？',
        success: (res) => {
          if (res.confirm) {
            this.form.questions.splice(index, 1);
          }
        }
      });
    },

    moveQuestion(index, direction) {
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < this.form.questions.length) {
        const temp = this.form.questions[index];
        this.form.questions.splice(index, 1);
        this.form.questions.splice(newIndex, 0, temp);
      }
    },

    addOption(questionIndex) {
      this.form.questions[questionIndex].options.push(`选项${this.form.questions[questionIndex].options.length + 1}`);
    },

    deleteOption(questionIndex, optionIndex) {
      this.form.questions[questionIndex].options.splice(optionIndex, 1);
    },

    getQuestionTypeIndex(type) {
      return this.questionTypes.findIndex(t => t.value === type);
    },

    getQuestionTypeLabel(type) {
      const typeObj = this.questionTypes.find(t => t.value === type);
      return typeObj ? typeObj.label : '文本题';
    },

    onQuestionTypeChange(index, event) {
      const type = this.questionTypes[event.detail.value].value;
      this.form.questions[index].type = type;

      // 重置选项
      if (type === 'single' || type === 'multiple') {
        this.form.questions[index].options = ['选项1', '选项2'];
      } else {
        this.form.questions[index].options = [];
        this.form.questions[index].hasOtherOption = false;
      }
    },

    onRequiredChange(index, event) {
      this.form.questions[index].required = event.detail.value;
    },

    onIsPrivateChange(index, event) {
      this.form.questions[index].isPrivate = event.detail.value;
      // 关闭时清空 fieldType
      if (!event.detail.value) {
        this.$set(this.form.questions[index], 'fieldType', '');
      }
    },

    onFieldTypeChange(index, event) {
      const selectedIndex = event.detail.value;
      this.$set(this.form.questions[index], 'fieldType', this.fieldTypeOptions[selectedIndex].value);
    },

    getFieldTypeIndex(fieldType) {
      return this.fieldTypeOptions.findIndex(opt => opt.value === fieldType);
    },

    getFieldTypeLabel(fieldType) {
      const option = this.fieldTypeOptions.find(opt => opt.value === fieldType);
      return option ? option.label : '';
    },

    onHasOtherChange(index, event) {
      this.form.questions[index].hasOtherOption = event.detail.value;
    },

    onStartDateChange(event) {
      this.form.startDate = new Date(event.detail.value).getTime();
    },

    onEndDateChange(event) {
      this.form.endDate = new Date(event.detail.value).getTime() + (23 * 60 + 59) * 60 * 1000;
    },

    togglePermission(type, role) {
      const roles = this.form.permissions[type];
      const index = roles.indexOf(role);

      if (index > -1) {
        // 不允许移除最后一个角色
        if (roles.length > 1) {
          roles.splice(index, 1);
        } else {
          uni.showToast({
            title: '至少保留一个角色',
            icon: 'none'
          });
        }
      } else {
        roles.push(role);
      }
    },

    formatDate(timestamp) {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
};
</script>

<style lang="scss" scoped>
.questionnaire-admin-page {
  min-height: 100vh;
  background-color: #F5F7FA;
}

.header-actions {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #EBEEF5;

  button {
    flex: 1;
    height: 80rpx;
    border-radius: 12rpx;
    font-size: 28rpx;
    font-weight: bold;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;

    &.btn-save {
      background-color: #909399;
      color: #fff;
    }

    &.btn-publish {
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: #fff;

      &[disabled] {
        opacity: 0.5;
      }
    }
  }
}

.loading-container {
  padding: 120rpx 0;
}

.form-container {
  height: calc(100vh - 160rpx);
}

.form-section {
  margin: 30rpx;
  padding: 30rpx;
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  overflow: hidden;

  .section-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 32rpx;
    font-weight: bold;
    color: #303133;
    margin-bottom: 30rpx;

    .question-count {
      font-size: 26rpx;
      color: #909399;
      font-weight: normal;
    }
  }

  .form-item {
    margin-bottom: 30rpx;
    box-sizing: border-box;
    overflow: hidden;

    &.half {
      flex: 1;
      min-width: 0;
    }

    .form-label {
      display: block;
      font-size: 26rpx;
      color: #606266;
      margin-bottom: 12rpx;

      &.required::after {
        content: '*';
        color: #F56C6C;
        margin-left: 4rpx;
      }
    }

    .form-input {
      display: block;
      width: 100%;
      height: 88rpx;
      line-height: 88rpx;
      padding: 0 24rpx;
      background-color: #F5F7FA;
      border-radius: 12rpx;
      font-size: 28rpx;
      color: #303133;
      box-sizing: border-box;
    }

    .form-textarea {
      display: block;
      width: 100%;
      min-height: 160rpx;
      padding: 20rpx;
      background-color: #F5F7FA;
      border-radius: 12rpx;
      font-size: 28rpx;
      line-height: 1.6;
      box-sizing: border-box;
    }

    .picker-input {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20rpx;
      background-color: #F5F7FA;
      border-radius: 12rpx;
      font-size: 28rpx;
      color: #303133;
    }
  }

  .form-item-row {
    display: flex;
    gap: 20rpx;

    .form-item {
      margin-bottom: 0;
    }
  }

  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;

    .switch-label {
      font-size: 28rpx;
      color: #303133;
    }
  }

  .btn-add-question {
    width: 100%;
    height: 80rpx;
    background-color: #EBF5FF;
    border: 2rpx dashed #3B82F6;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    font-size: 28rpx;
    color: #3B82F6;
    margin-bottom: 30rpx;
  }
}

.questions-list {
  .question-card {
    padding: 24rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;
    margin-bottom: 20rpx;
    box-sizing: border-box;
    overflow: hidden;

    .question-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20rpx;

      .question-number {
        font-size: 26rpx;
        font-weight: bold;
        color: #3B82F6;
      }

      .question-actions {
        display: flex;
        gap: 8rpx;

        .btn-icon {
          width: 56rpx;
          height: 56rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #fff;
          border-radius: 8rpx;

          &[disabled] {
            opacity: 0.5;
          }

          &.btn-delete {
            background-color: #FEF0F0;
          }
        }
      }
    }

    .options-section {
      margin-top: 20rpx;

      .options-list {
        .option-item-edit {
          display: flex;
          align-items: center;
          gap: 12rpx;
          margin-bottom: 12rpx;

          .option-number {
            font-size: 24rpx;
            color: #909399;
            width: 40rpx;
          }

          .option-input {
            flex: 1;
            height: 72rpx;
            line-height: 72rpx;
            padding: 0 16rpx;
            background-color: #fff;
            border-radius: 8rpx;
            font-size: 26rpx;
            box-sizing: border-box;
            min-width: 0;
          }
        }
      }

      .btn-add-option {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6rpx;
        padding: 12rpx;
        background-color: #EBF5FF;
        border-radius: 8rpx;
        font-size: 24rpx;
        color: #3B82F6;
        margin-top: 12rpx;
      }
    }
  }
}

.permission-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #EBEEF5;

  &:last-child {
    border-bottom: none;
  }

  .permission-label {
    display: block;
    font-size: 26rpx;
    color: #303133;
    margin-bottom: 16rpx;
    font-weight: bold;
  }

  .permission-roles {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;

    .role-tag {
      padding: 12rpx 20rpx;
      background-color: #F5F7FA;
      border-radius: 8rpx;
      font-size: 24rpx;
      color: #606266;
      border: 2rpx solid transparent;
      transition: all 0.2s ease;

      &.active {
        background-color: #EBF5FF;
        color: #3B82F6;
        border-color: #3B82F6;
      }
    }
  }
}
// ==================== CSS 图标 ====================

// 云上传图标
.icon-cloud-upload {
  position: relative;
  width: 32rpx;
  height: 28rpx;

  .cloud-body {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 32rpx;
    height: 18rpx;
    background-color: #fff;
    border-radius: 9rpx;
  }

  .cloud-arrow {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 7rpx solid transparent;
    border-right: 7rpx solid transparent;
    border-bottom: 10rpx solid #fff;
  }
}

// 发送图标（三角形）
.icon-send {
  width: 28rpx;
  height: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .send-body {
    width: 0;
    height: 0;
    border-top: 10rpx solid transparent;
    border-bottom: 10rpx solid transparent;
    border-left: 18rpx solid #fff;
    margin-left: 4rpx;
  }
}

// 文档图标
.icon-doc {
  width: 18rpx;
  height: 22rpx;

  .doc-body {
    width: 100%;
    height: 100%;
    background-color: #3B82F6;
    border-radius: 2rpx;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3rpx;
    padding: 4rpx;
    box-sizing: border-box;

    .doc-line {
      height: 2rpx;
      background-color: #fff;
      border-radius: 1rpx;
      width: 100%;

      &.short { width: 60%; }
    }
  }
}

// 列表图标
.icon-list-lines {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  width: 18rpx;
  justify-content: center;

  .list-line-item {
    height: 3rpx;
    background-color: #3B82F6;
    border-radius: 2rpx;
    width: 100%;

    &.short { width: 60%; }
  }
}

// 下箭头图标
.icon-arrow-down {
  width: 24rpx;
  height: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .arrow-down-shape {
    width: 0;
    height: 0;
    border-left: 7rpx solid transparent;
    border-right: 7rpx solid transparent;
    border-top: 8rpx solid #909399;
  }
}

// 上/下箭头（移动问题）
.icon-chevron {
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .chevron-shape {
    width: 14rpx;
    height: 14rpx;
    border-left: 3rpx solid #909399;
    border-top: 3rpx solid #909399;
  }

  &.up .chevron-shape {
    transform: rotate(45deg);
    margin-top: 4rpx;
  }

  &.down .chevron-shape {
    transform: rotate(225deg);
    margin-bottom: 4rpx;
  }
}

// 垃圾桶图标
.icon-trash {
  width: 28rpx;
  height: 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;

  .trash-lid {
    width: 24rpx;
    height: 4rpx;
    background-color: #F56C6C;
    border-radius: 2rpx;
  }

  .trash-body {
    width: 20rpx;
    height: 22rpx;
    border: 3rpx solid #F56C6C;
    border-top: none;
    border-radius: 0 0 4rpx 4rpx;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 3rpx 3rpx 0;
    box-sizing: border-box;

    .trash-line {
      width: 3rpx;
      height: 12rpx;
      background-color: #F56C6C;
      border-radius: 2rpx;
    }
  }
}

// 关闭图标（×）
.icon-close {
  position: relative;
  width: 24rpx;
  height: 24rpx;

  .close-line1, .close-line2 {
    position: absolute;
    width: 20rpx;
    height: 3rpx;
    background-color: #F56C6C;
    border-radius: 2rpx;
    top: 50%;
    left: 50%;
  }

  .close-line1 { transform: translate(-50%, -50%) rotate(45deg); }
  .close-line2 { transform: translate(-50%, -50%) rotate(-45deg); }
}

// 蓝色加号图标
.icon-plus-blue {
  position: relative;
  width: 24rpx;
  height: 24rpx;

  .plus-h-blue, .plus-v-blue {
    position: absolute;
    background-color: #3B82F6;
    border-radius: 2rpx;
    top: 50%;
    left: 50%;
  }

  .plus-h-blue {
    width: 16rpx;
    height: 3rpx;
    transform: translate(-50%, -50%);
  }

  .plus-v-blue {
    width: 3rpx;
    height: 16rpx;
    transform: translate(-50%, -50%);
  }
}

// 锁图标
.icon-lock {
  width: 16rpx;
  height: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;

  .lock-shackle {
    width: 12rpx;
    height: 8rpx;
    border: 3rpx solid #3B82F6;
    border-bottom: none;
    border-radius: 6rpx 6rpx 0 0;
  }

  .lock-body {
    width: 16rpx;
    height: 12rpx;
    background-color: #3B82F6;
    border-radius: 2rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .lock-hole {
      width: 5rpx;
      height: 5rpx;
      border-radius: 50%;
      background-color: #fff;
    }
  }
}
</style>
