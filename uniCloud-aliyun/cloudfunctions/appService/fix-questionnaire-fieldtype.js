/**
 * 临时修复脚本：为问卷添加 fieldType 字段
 *
 * 使用方法：
 * 在 appService/index.js 中添加：
 * if (action === 'fixQuestionnaireFieldType') {
 *   const { fixQuestionnaireFieldType } = require('./fix-questionnaire-fieldtype.js');
 *   return await fixQuestionnaireFieldType();
 * }
 *
 * 然后调用云函数：
 * uniCloud.callFunction({
 *   name: 'appService',
 *   data: { action: 'fixQuestionnaireFieldType' }
 * })
 */

async function fixQuestionnaireFieldType() {
  const db = uniCloud.database();

  console.log('开始修复问卷 fieldType 字段...');

  try {
    // 获取所有问卷
    const { data: questionnaires } = await db.collection('questionnaires').get();

    let fixedCount = 0;

    for (const questionnaire of questionnaires) {
      let needsUpdate = false;
      const updatedQuestions = questionnaire.questions.map(question => {
        // 如果已经有 fieldType，跳过
        if (question.fieldType) {
          return question;
        }

        // 根据问题标题或ID推断 fieldType
        if (question.id === 'q1' || question.title.includes('姓名')) {
          needsUpdate = true;
          return { ...question, fieldType: 'name' };
        }

        if (question.id === 'q2' || question.title.includes('身份证')) {
          needsUpdate = true;
          return { ...question, fieldType: 'idCard' };
        }

        if (question.title.includes('网点') || question.title.includes('部门')) {
          needsUpdate = true;
          return { ...question, fieldType: 'branch' };
        }

        return question;
      });

      if (needsUpdate) {
        await db.collection('questionnaires').doc(questionnaire._id).update({
          questions: updatedQuestions
        });

        fixedCount++;
        console.log(`✅ 已修复问卷: ${questionnaire.title} (ID: ${questionnaire._id})`);
      }
    }

    console.log(`\n修复完成！共修复 ${fixedCount} 个问卷`);

    return {
      success: true,
      message: `修复完成，共修复 ${fixedCount} 个问卷`,
      fixedCount
    };

  } catch (error) {
    console.error('修复失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  fixQuestionnaireFieldType
};
