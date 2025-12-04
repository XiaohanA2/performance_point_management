'use strict';

const db = uniCloud.database();
const {
  CURRENT_QUARTER,
  DEFAULT_USERS,
  DEFAULT_BRANCHES,
  SCORING_RULES,
  DEFAULT_SETTINGS
} = require('./default-data.js');

const collections = {
  users: db.collection('users'),
  branches: db.collection('branches'),
  rules: db.collection('rules'),
  submissions: db.collection('submissions'),
  settings: db.collection('settings'),
  smsCodes: db.collection('sms_codes')
};

const sanitizeUser = user => {
  if (!user) return null;
  const clone = { ...user };
  delete clone.password;
  return clone;
};

const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function ensureDefaults() {
  const [usersCount, branchesCount, rulesCount, settingsCount] = await Promise.all([
    collections.users.count(),
    collections.branches.count(),
    collections.rules.count(),
    collections.settings.count()
  ]);

  if (usersCount.total === 0) {
    await collections.users.add(
      DEFAULT_USERS.map(user => ({
        ...user,
        _id: genId(),
        createdAt: Date.now()
      }))
    );
  }

  if (branchesCount.total === 0) {
    await collections.branches.add(
      DEFAULT_BRANCHES.map(branch => ({
        ...branch,
        createdAt: Date.now()
      }))
    );
  }

  if (rulesCount.total === 0) {
    await collections.rules.add(
      SCORING_RULES.map(rule => ({
        ...rule,
        createdAt: Date.now()
      }))
    );
  }

  if (settingsCount.total === 0) {
    await collections.settings.add({
      _id: 'global',
      ...DEFAULT_SETTINGS,
      updatedAt: Date.now()
    });
  }
}

async function bootstrap() {
  await ensureDefaults();
  const settingsRes = await collections.settings.doc('global').get();
  const settingsDoc = settingsRes.data[0] || { ...DEFAULT_SETTINGS };
  const currentQuarter = settingsDoc.currentQuarter || CURRENT_QUARTER;
  const [usersRes, branchesRes, rulesRes, submissionsRes] = await Promise.all([
    collections.users.get(),
    collections.branches.get(),
    collections.rules.get(),
    collections.submissions.where({ quarter: currentQuarter }).get()
  ]);
  return {
    users: usersRes.data.map(sanitizeUser),
    branches: branchesRes.data,
    rules: rulesRes.data,
    settings: settingsDoc,
    currentQuarter,
    submissions: submissionsRes.data
  };
}

async function loginWithPassword(payload) {
  const { phone, password } = payload;
  const userRes = await collections.users.where({ phone, password, status: 'active' }).get();
  if (!userRes.data.length) throw new Error('账号或密码错误');
  return sanitizeUser(userRes.data[0]);
}

async function loginWithCode(payload) {
  const { phone, code } = payload;
  await verifySmsCode(phone, code);
  const userRes = await collections.users.where({ phone, status: 'active' }).get();
  if (!userRes.data.length) throw new Error('用户不存在或已停用');
  return sanitizeUser(userRes.data[0]);
}

async function generateSmsCode(payload) {
  const { phone } = payload;
  if (!phone) throw new Error('手机号不能为空');
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await collections.smsCodes.doc(phone).set({
    code,
    expiresAt: Date.now() + 5 * 60 * 1000
  });
  return { code };
}

async function verifySmsCode(phone, code) {
  const res = await collections.smsCodes.doc(phone).get();
  const record = res.data[0];
  if (!record) throw new Error('验证码已过期，请重新获取');
  if (record.code !== code) throw new Error('验证码错误');
  if (record.expiresAt < Date.now()) {
    await collections.smsCodes.doc(phone).remove();
    throw new Error('验证码已过期，请重新获取');
  }
  await collections.smsCodes.doc(phone).remove();
}

async function addUser(payload) {
  const { phone } = payload;
  const exists = await collections.users.where({ phone }).count();
  if (exists.total > 0) throw new Error('手机号已存在');
  const doc = {
    _id: genId(),
    name: payload.name,
    branch: payload.branch,
    phone: payload.phone,
    password: payload.password || '123456',
    role: payload.role || 'manager',
    status: payload.status || 'active',
    createdAt: Date.now()
  };
  await collections.users.add(doc);
  return sanitizeUser(doc);
}

async function updateUser(payload) {
  const { id, updates } = payload;
  if (!id) throw new Error('缺少用户ID');
  if (updates?.phone) {
    const exists = await collections.users
      .where({ phone: updates.phone, _id: db.command.neq(id) })
      .count();
    if (exists.total > 0) throw new Error('手机号已存在');
  }
  await collections.users.doc(id).update({
    ...updates,
    updatedAt: Date.now()
  });
  const { data } = await collections.users.doc(id).get();
  return sanitizeUser(data[0]);
}

async function toggleUserStatus({ id }) {
  if (!id) throw new Error('缺少用户ID');
  const { data } = await collections.users.doc(id).get();
  if (!data.length) throw new Error('用户不存在');
  const nextStatus = data[0].status === 'active' ? 'disabled' : 'active';
  await collections.users.doc(id).update({ status: nextStatus, updatedAt: Date.now() });
  return sanitizeUser({ ...data[0], status: nextStatus });
}

async function resetPassword({ id, password = '123456' }) {
  if (!id) throw new Error('缺少用户ID');
  await collections.users.doc(id).update({ password, updatedAt: Date.now() });
  return true;
}

async function changePassword({ id, oldPassword, newPassword }) {
  if (!id || !newPassword) throw new Error('信息不完整');
  const { data } = await collections.users.doc(id).get();
  if (!data.length) throw new Error('用户不存在');
  if (data[0].password !== oldPassword) throw new Error('原密码错误');
  await collections.users.doc(id).update({ password: newPassword, updatedAt: Date.now() });
  return true;
}

async function addBranch(payload) {
  const { id, name } = payload;
  if (!id || !name) throw new Error('支行编号和名称不能为空');
  const exists = await collections.branches.where(db.command.or([{ id }, { name }])).count();
  if (exists.total > 0) throw new Error('支行编号或名称已存在');
  await collections.branches.add({ id, name, createdAt: Date.now() });
  return { id, name };
}

async function updateBranch(payload) {
  const { id, updates } = payload;
  if (!id) throw new Error('缺少支行编号');
  const { data } = await collections.branches.where({ id }).get();
  if (!data.length) throw new Error('支行不存在');
  const nextId = updates?.id || id;
  const nextName = updates?.name || data[0].name;
  if (nextId !== id || nextName !== data[0].name) {
    const exists = await collections.branches
      .where(db.command.or([{ id: nextId }, { name: nextName }]))
      .where({ id: db.command.neq(id) })
      .count();
    if (exists.total > 0) throw new Error('支行编号或名称已存在');
  }
  await collections.branches.where({ id }).update({ id: nextId, name: nextName });
  await collections.users.where({ branch: data[0].name }).update({ branch: nextName });
  return { id: nextId, name: nextName };
}

async function deleteBranch({ id }) {
  if (!id) throw new Error('缺少支行编号');
  const branchRes = await collections.branches.where({ id }).get();
  if (!branchRes.data.length) throw new Error('支行不存在');
  const usersRes = await collections.users.where({ branch: branchRes.data[0].name }).count();
  if (usersRes.total > 0) throw new Error('该支行仍有关联用户，请先调整所属支行');
  await collections.branches.where({ id }).remove();
  return true;
}

async function addRule(payload) {
  const doc = {
    ...payload,
    id: payload.id || genId(),
    createdAt: Date.now()
  };
  await collections.rules.add(doc);
  return doc;
}

async function updateRule(payload) {
  const { id, updates } = payload;
  if (!id) throw new Error('缺少规则ID');
  await collections.rules.where({ id }).update({ ...updates, updatedAt: Date.now() });
  const { data } = await collections.rules.where({ id }).get();
  return data[0];
}

async function deleteRule({ id }) {
  if (!id) throw new Error('缺少规则ID');
  const submissions = await collections.submissions.where({ ruleId: id }).count();
  if (submissions.total > 0) throw new Error('已有提报引用该规则，暂无法删除');
  await collections.rules.where({ id }).remove();
  return true;
}

async function addSubmission(payload) {
  const doc = {
    ...payload,
    _id: genId(),
    timestamp: Date.now()
  };
  await collections.submissions.add(doc);
  return doc;
}

async function updateSubmission(payload) {
  const { id, updates } = payload;
  if (!id) throw new Error('缺少提报ID');
  await collections.submissions.doc(id).update({ ...updates, updatedAt: Date.now() });
  const { data } = await collections.submissions.doc(id).get();
  return data[0];
}

async function deleteSubmission({ id }) {
  if (!id) throw new Error('缺少提报ID');
  await collections.submissions.doc(id).remove();
  return true;
}

async function switchQuarter(payload) {
  const { nextQuarter, resetCurrent } = payload;
  if (!nextQuarter) throw new Error('缺少季度信息');
  const settingsRes = await collections.settings.doc('global').get();
  const settings = settingsRes.data[0] || { ...DEFAULT_SETTINGS };
  if (resetCurrent) {
    await collections.submissions.where({ quarter: settings.currentQuarter }).remove();
  }
  await collections.settings.doc('global').update({
    currentQuarter: nextQuarter,
    updatedAt: Date.now()
  });
  return { currentQuarter: nextQuarter };
}

async function clearQuarter({ archiveOnly }) {
  const settingsRes = await collections.settings.doc('global').get();
  const settings = settingsRes.data[0] || { ...DEFAULT_SETTINGS };
  if (archiveOnly) {
    await collections.submissions.where({ quarter: settings.currentQuarter }).update({
      archived: true
    });
  } else {
    await collections.submissions.where({ quarter: settings.currentQuarter }).remove();
  }
  return true;
}

async function updateSettings(payload) {
  await collections.settings.doc('global').update({
    ...payload,
    updatedAt: Date.now()
  });
  const { data } = await collections.settings.doc('global').get();
  return data[0];
}

exports.main = async (event, context) => {
  const { action, payload = {} } = event;
  try {
    let data;
    switch (action) {
      case 'bootstrap':
        data = await bootstrap();
        break;
      case 'loginWithPassword':
        data = await loginWithPassword(payload);
        break;
      case 'loginWithCode':
        data = await loginWithCode(payload);
        break;
      case 'generateSmsCode':
        data = await generateSmsCode(payload);
        break;
      case 'addUser':
        data = await addUser(payload);
        break;
      case 'updateUser':
        data = await updateUser(payload);
        break;
      case 'toggleUserStatus':
        data = await toggleUserStatus(payload);
        break;
      case 'resetPassword':
        data = await resetPassword(payload);
        break;
      case 'changePassword':
        data = await changePassword(payload);
        break;
      case 'addBranch':
        data = await addBranch(payload);
        break;
      case 'updateBranch':
        data = await updateBranch(payload);
        break;
      case 'deleteBranch':
        data = await deleteBranch(payload);
        break;
      case 'addRule':
        data = await addRule(payload);
        break;
      case 'updateRule':
        data = await updateRule(payload);
        break;
      case 'deleteRule':
        data = await deleteRule(payload);
        break;
      case 'addSubmission':
        data = await addSubmission(payload);
        break;
      case 'updateSubmission':
        data = await updateSubmission(payload);
        break;
      case 'deleteSubmission':
        data = await deleteSubmission(payload);
        break;
      case 'switchQuarter':
        data = await switchQuarter(payload);
        break;
      case 'clearQuarter':
        data = await clearQuarter(payload);
        break;
      case 'updateSettings':
        data = await updateSettings(payload);
        break;
      default:
        throw new Error(`未支持的action：${action}`);
    }
    return { data };
  } catch (error) {
    return { error: error.message || '服务异常' };
  }
};

