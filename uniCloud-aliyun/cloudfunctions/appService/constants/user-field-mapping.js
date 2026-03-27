/**
 * 用户字段映射表（云函数版本）
 */

const USER_FIELD_TYPES = ['name', 'phone', 'employeeId', 'branch', 'idCardLast4', 'idCard'];

/**
 * 判断问题是否为用户字段
 */
function isUserField(question) {
  return question?.fieldType && USER_FIELD_TYPES.includes(question.fieldType);
}

module.exports = {
  USER_FIELD_TYPES,
  isUserField
};
