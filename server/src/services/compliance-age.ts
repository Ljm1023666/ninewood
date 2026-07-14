/** 合规：注册与未成年人相关年龄计算 */
export const MIN_REGISTRATION_AGE = 14

export function calculateAge(birthday: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthday.getFullYear()
  const m = now.getMonth() - birthday.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age--
  return age
}

export function parseBirthdayInput(birthday: string): Date {
  const d = new Date(birthday)
  if (Number.isNaN(d.getTime())) {
    throw { status: 400, message: '出生日期格式错误' }
  }
  return d
}

/** 注册年龄门槛：<14 拒注，14-18 需监护人同意 */
export function assertRegistrationAge(
  birthday: Date,
  guardianConsent?: boolean,
): void {
  const age = calculateAge(birthday)
  if (age < MIN_REGISTRATION_AGE) {
    throw {
      status: 403,
      message: `本服务不面向 ${MIN_REGISTRATION_AGE} 岁以下用户。根据《未成年人保护法》及《生成式 AI 服务管理暂行办法》，未成年人请在监护人陪同下使用相关服务。`,
    }
  }
  if (age < 18 && !guardianConsent) {
    throw {
      status: 400,
      message: '未满 18 周岁需勾选"已征得监护人同意"承诺',
    }
  }
}

export function isMinor(birthday: Date | null | undefined): boolean {
  if (!birthday) return false
  return calculateAge(birthday) < 18
}
