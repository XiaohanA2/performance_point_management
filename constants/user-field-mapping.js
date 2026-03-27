/**
 * 用户字段映射表
 * 用于问卷中自动填充登录用户信息
 */

export const USER_FIELD_MAP = {
  name: {
    label: '姓名',
    getValue: (user) => user?.name || ''
  },
  phone: {
    label: '手机号',
    getValue: (user) => user?.phone || ''
  },
  employeeId: {
    label: '工号',
    getValue: (user) => user?.phone || ''
  },
  branch: {
    label: '所在网点/部门',
    getValue: (user) => user?.branch || ''
  },
  idCardLast4: {
    label: '身份证后四位',
    getValue: (user) => '已验证'
  }
};

/**
 * 判断问题是否为用户字段
 */
export function isUserField(question) {
  return question?.fieldType && USER_FIELD_MAP[question.fieldType];
}

/**
 * 获取用户字段的值
 */
export function getUserFieldValue(question, user) {
  if (!question?.fieldType || !user) return '';
  const mapping = USER_FIELD_MAP[question.fieldType];
  return mapping ? mapping.getValue(user) : '';
}

/**
 * 根据题目标题智能识别可能的 fieldType（用于旧问卷迁移）
 */
export function guessFieldType(title) {
  if (!title) return null;

  const patterns = {
    name: /^(姓名|名字|your name)$/i,
    phone: /^(手机号?|电话|联系方式|phone|mobile)$/i,
    employeeId: /^(工号|employee id)$/i,
    branch: /^(所在网点|网点|部门|单位|branch|department)$/i,
    idCardLast4: /身份证.*后.*四位|id.*last.*4/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(title.trim())) return type;
  }

  return null;
}
