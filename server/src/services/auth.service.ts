import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as tencentcloud from 'tencentcloud-sdk-nodejs-sms';
import { prisma } from '../lib/prisma.js';
import { resolveIpRegion } from './ipgeo.service.js';
import { config } from '../config.js';
import { allocateNextAccountNo, isAccountNoConflict, withAllocatedAccountNo } from './account-no.js';
import {
  assertLoginNotLocked,
  clearLoginFailures,
  recordLoginFailure,
} from './login-attempts.js';

import {
  assertRegistrationAge,
  parseBirthdayInput,
} from './compliance-age.js';

const SmsClient = tencentcloud.sms.v20210111.Client;

const MIN_PASSWORD_LENGTH = 8;
const smsStore = new Map<string, { code: string; expires: number }>();

function emailCodeHash(email: string, code: string) {
  const secret = process.env.EMAIL_CODE_SECRET || process.env.JWT_SECRET || 'ninewood-local-email-code';
  return crypto.createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

async function deliverEmailCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw { status: 503, message: '邮箱验证服务暂不可用' };
    }
    console.log(`[EMAIL] Code to ${email}: ${code} (development only)`);
    return;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: '九木登录验证码',
      text: `你的九木验证码是 ${code}，5 分钟内有效。请勿转发给任何人。`,
    }),
  });
  if (!response.ok) throw { status: 503, message: '验证码邮件发送失败，请稍后重试' };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 合规：注册年龄门槛（见 compliance-age.ts）
 */
type LegacyUser = {
  id: string;
  accountNo?: number | null;
  phone: string;
  email?: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  demandCardCoverUrl: string | null;
  cityCode: string | null;
  ipRegion?: string | null;
  bio: string | null;
  birthday?: Date | null;
  certificationLevel: string | null;
  snatchCredits: number | null;
  creditScore: number | null;
  passwordHash?: string | null;
  createdAt?: Date;
};

function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/** 邮箱验证码注册用户使用不可猜测的随机密码（仅支持邮箱 OTP 登录） */
async function randomPasswordHash(): Promise<string> {
  return hashPassword(crypto.randomBytes(32).toString('hex'));
}

function assertPasswordStrength(password: string) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw { status: 400, message: `密码至少 ${MIN_PASSWORD_LENGTH} 位` };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw { status: 400, message: '密码需同时包含字母和数字' };
  }
}

function generateCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendTencentSms(phone: string, code: string) {
  const client = new SmsClient({
    credential: { secretId: config.sms.secretId, secretKey: config.sms.secretKey },
    region: 'ap-guangzhou',
  });
  await client.SendSms({
    SmsSdkAppId: config.sms.sdkAppId,
    SignName: config.sms.signName,
    TemplateId: config.sms.templateId,
    TemplateParamSet: [code, '5'],
    PhoneNumberSet: [`+86${phone}`],
  });
}

function makeToken(user: { id: string; phone: string; certificationLevel: string }) {
  return jwt.sign(
    { userId: user.id, phone: user.phone, certLevel: user.certificationLevel },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

function legacyUserResponse(user: LegacyUser) {
  return {
    id: user.id,
    accountNo: user.accountNo ?? null,
    phone: user.phone,
    email: user.email || null,
    nickname: user.nickname || `用户_${user.phone.slice(-4)}`,
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    demandCardCoverUrl: user.demandCardCoverUrl,
    cityCode: user.cityCode,
    ipRegion: user.ipRegion || null,
    bio: user.bio,
    birthday: user.birthday?.toISOString?.() ?? user.birthday ?? null,
    certificationLevel: user.certificationLevel || 'NONE',
    snatchCredits: user.snatchCredits || 0,
    creditScore: user.creditScore || 60,
    createdAt: user.createdAt?.toISOString(),
  };
}

function modernUserResponse(user: LegacyUser) {
  return legacyUserResponse(user);
}

async function findLegacyUserByPhone(phone: string): Promise<LegacyUser | null> {
  try {
    const rows = await prisma.$queryRaw<LegacyUser[]>`
      SELECT "id","phone","nickname","avatarUrl","coverUrl","demandCardCoverUrl","cityCode","ipRegion","bio","birthday","certificationLevel","snatchCredits","creditScore","passwordHash","createdAt"
      FROM "User" WHERE "phone" = ${phone} LIMIT 1`;
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function findLegacyUserByAccountNo(accountNo: number): Promise<LegacyUser | null> {
  try {
    const rows = await prisma.$queryRaw<LegacyUser[]>`
      SELECT "id","accountNo","phone","nickname","avatarUrl","coverUrl","demandCardCoverUrl","cityCode","ipRegion","bio","birthday","certificationLevel","snatchCredits","creditScore","passwordHash","createdAt"
      FROM "User" WHERE "accountNo" = ${accountNo} LIMIT 1`;
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function findLegacyUserById(userId: string): Promise<LegacyUser | null> {
  try {
    const rows = await prisma.$queryRaw<LegacyUser[]>`
      SELECT "id","phone","nickname","avatarUrl","coverUrl","demandCardCoverUrl","cityCode","ipRegion","bio","birthday","certificationLevel","snatchCredits","creditScore","passwordHash","createdAt"
      FROM "User" WHERE "id" = ${userId} LIMIT 1`;
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function createLegacyUser(
  phone: string,
  birthday: Date,
  accountNo: number,
  password: string,
): Promise<LegacyUser | null> {
  assertPasswordStrength(password);
  const passwordHash = await hashPassword(password);
  const tail = phone.slice(-4);
  const nickname = `用户_${tail}`;
  try {
    const rows = await prisma.$queryRaw<LegacyUser[]>`
      INSERT INTO "User" ("phone","nickname","passwordHash","birthday","accountNo","createdAt","updatedAt")
      VALUES (${phone}, ${nickname}, ${passwordHash}, ${birthday}, ${accountNo}, NOW(), NOW())
      RETURNING "id","accountNo","phone","nickname","avatarUrl","coverUrl","demandCardCoverUrl","cityCode","bio","birthday","certificationLevel","snatchCredits","creditScore","createdAt"`;
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function findModernUserByPhone(phone: string): Promise<LegacyUser | null> {
  try {
    return await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        coverUrl: true,
        demandCardCoverUrl: true,
        cityCode: true,
        ipRegion: true,
        certificationLevel: true,
        snatchCredits: true,
        creditScore: true,
        passwordHash: true,
        bio: true,
        birthday: true,
        createdAt: true,
      },
    });
  } catch {
    return null;
  }
}

async function findModernUserByAccountNo(accountNo: number): Promise<LegacyUser | null> {
  try {
    return await prisma.user.findUnique({
      where: { accountNo },
      select: {
        id: true,
        accountNo: true,
        phone: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        coverUrl: true,
        demandCardCoverUrl: true,
        cityCode: true,
        ipRegion: true,
        certificationLevel: true,
        snatchCredits: true,
        creditScore: true,
        passwordHash: true,
        bio: true,
        birthday: true,
        createdAt: true,
      },
    });
  } catch {
    return null;
  }
}

async function findModernUserById(userId: string): Promise<LegacyUser | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountNo: true,
        phone: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        coverUrl: true,
        demandCardCoverUrl: true,
        cityCode: true,
        ipRegion: true,
        certificationLevel: true,
        snatchCredits: true,
        creditScore: true,
        passwordHash: true,
        bio: true,
        birthday: true,
        createdAt: true,
      },
    });
  } catch {
    return null;
  }
}

async function findModernUserByEmail(email: string): Promise<LegacyUser | null> {
  try {
    return await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        phone: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        coverUrl: true,
        demandCardCoverUrl: true,
        cityCode: true,
        ipRegion: true,
        certificationLevel: true,
        snatchCredits: true,
        creditScore: true,
        passwordHash: true,
        bio: true,
        birthday: true,
        createdAt: true,
      },
    });
  } catch {
    return null;
  }
}

async function findLegacyUserByEmail(email: string): Promise<LegacyUser | null> {
  try {
    const rows = await prisma.$queryRaw<LegacyUser[]>`
      SELECT "id","phone","email","nickname","avatarUrl","coverUrl","demandCardCoverUrl","cityCode","ipRegion","bio","birthday","certificationLevel","snatchCredits","creditScore","passwordHash","createdAt"
      FROM "User" WHERE LOWER("email") = ${email} LIMIT 1`;
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function generateUniquePlaceholderPhone(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = `900${String(Math.floor(10000000 + Math.random() * 90000000))}`;
    const [legacyExists, modernExists] = await Promise.all([
      findLegacyUserByPhone(candidate),
      findModernUserByPhone(candidate),
    ]);
    if (!legacyExists && !modernExists) return candidate;
  }
  throw { status: 500, message: '系统繁忙，请稍后重试' };
}

export const authService = {
  async sendCode(phone: string) {
    const [legacyExists, modernExists] = await Promise.all([
      findLegacyUserByPhone(phone),
      findModernUserByPhone(phone),
    ]);
    if (legacyExists || modernExists) {
      throw { status: 400, message: '该手机号已注册，请直接输入密码登录' };
    }

    const code = generateCode();
    smsStore.set(phone, { code, expires: Date.now() + 5 * 60 * 1000 });

    let smsOk = false;
    try {
      await sendTencentSms(phone, code);
      console.log(`[SMS] Sent to ${phone}`);
      smsOk = true;
    } catch (err: any) {
      console.error(`[SMS] Send failed for ${phone}:`, err.message);
      if (process.env.NODE_ENV === 'production') {
        throw { status: 503, message: '短信发送失败，请稍后重试' };
      }
      console.warn(`[SMS] Dev fallback: code logged server-side only for ${phone}`);
    }

    if (!smsOk && process.env.NODE_ENV === 'production') {
      throw { status: 503, message: '短信发送失败，请稍后重试' };
    }

    return { phone };
  },

  async sendEmailCode(email: string) {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      throw { status: 400, message: '邮箱格式不正确' };
    }

    const latest = await prisma.emailVerificationCode.findFirst({
      where: { email: normalized },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < 60_000) {
      throw { status: 429, message: '验证码发送过于频繁，请稍后再试' };
    }
    const code = generateCode();
    await deliverEmailCode(normalized, code);
    await prisma.emailVerificationCode.create({
      data: { email: normalized, codeHash: emailCodeHash(normalized, code), expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });
    // 开发环境仅服务端日志，绝不回传验证码
    console.log(`[EMAIL] Code to ${normalized} (valid 5 min, server log only)`);

    return { email: normalized };
  },

  async loginWithEmail(
    email: string,
    code: string,
    ip?: string,
    birthday?: string,
    guardianConsent?: boolean,
  ) {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      throw { status: 400, message: '邮箱格式不正确' };
    }

    const stored = await prisma.emailVerificationCode.findFirst({
      where: { email: normalized, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      throw { status: 400, message: '验证码已过期，请重新获取' };
    }
    if (stored.attempts >= 5) throw { status: 429, message: '验证码尝试次数过多，请重新获取' };
    if (stored.codeHash !== emailCodeHash(normalized, code)) {
      await prisma.emailVerificationCode.update({ where: { id: stored.id }, data: { attempts: { increment: 1 } } });
      throw { status: 400, message: '验证码错误' };
    }
    const consumed = await prisma.emailVerificationCode.updateMany({
      where: { id: stored.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw { status: 409, message: '验证码已使用，请重新获取' };

    let user =
      (await findLegacyUserByEmail(normalized)) ||
      (await findModernUserByEmail(normalized));

    if (!user) {
      if (!birthday) {
        throw { status: 400, message: '首次邮箱登录请填写出生日期（合规要求）' };
      }
      const birthdayDate = parseBirthdayInput(birthday);
      assertRegistrationAge(birthdayDate, guardianConsent);

      const placeholderPhone = await generateUniquePlaceholderPhone();
      const localPart = normalized.split('@')[0] || '用户';
      const passwordHash = await randomPasswordHash();
      const modernUser = await withAllocatedAccountNo(async (tx, accountNo) =>
        tx.user.create({
          data: {
            phone: placeholderPhone,
            email: normalized,
            nickname: localPart.slice(0, 20),
            passwordHash,
            accountNo,
            birthday: birthdayDate,
            ipRegion: ip ? await resolveIpRegion(ip).catch(() => null) : null,
          },
          select: {
            id: true,
            accountNo: true,
            phone: true,
            email: true,
            nickname: true,
            avatarUrl: true,
            coverUrl: true,
            demandCardCoverUrl: true,
            cityCode: true,
            ipRegion: true,
            certificationLevel: true,
            snatchCredits: true,
            creditScore: true,
            passwordHash: true,
            bio: true,
            birthday: true,
            createdAt: true,
          },
        }),
      );
      user = modernUser;
    } else if (ip && !user.ipRegion) {
      resolveIpRegion(ip)
        .then((region) => {
          prisma.user
            .update({ where: { id: user!.id }, data: { ipRegion: region } })
            .catch(() => {});
        })
        .catch(() => {});
    }

    return {
      user: legacyUserResponse(user),
      token: makeToken({
        id: user.id,
        phone: user.phone,
        certificationLevel: user.certificationLevel || 'NONE',
      }),
    };
  },

  async register(
    phone: string,
    code: string,
    password: string,
    ip?: string,
    birthday?: string,
    guardianConsent?: boolean,
  ) {
    const stored = smsStore.get(phone);
    if (!stored || stored.expires < Date.now()) {
      throw { status: 400, message: '验证码已过期，请重新获取' };
    }
    if (stored.code !== code) {
      throw { status: 400, message: '验证码错误' };
    }
    smsStore.delete(phone);

    if (!birthday) {
      throw { status: 400, message: '请填写出生日期（合规要求）' };
    }
    const birthdayDate = parseBirthdayInput(birthday);
    assertRegistrationAge(birthdayDate, guardianConsent);

    const [legacyExists, modernExists] = await Promise.all([
      findLegacyUserByPhone(phone),
      findModernUserByPhone(phone),
    ]);
    if (legacyExists || modernExists) {
      throw { status: 400, message: '该手机号已注册，请直接输入密码登录' };
    }

    assertPasswordStrength(password);

    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const accountNo = await prisma.$transaction(async (tx) =>
        allocateNextAccountNo(tx),
      );

      const legacyUser = await createLegacyUser(
        phone,
        birthdayDate,
        accountNo,
        password,
      );
      if (legacyUser) {
        return {
          user: legacyUserResponse(legacyUser),
          token: makeToken({
            id: legacyUser.id,
            phone: legacyUser.phone,
            certificationLevel: legacyUser.certificationLevel || 'NONE',
          }),
        };
      }

      try {
        const passwordHash = await hashPassword(password);
        const tail = phone.slice(-4);
        const modernUser = await prisma.user.create({
          data: {
            phone,
            nickname: `用户_${tail}`,
            passwordHash,
            accountNo,
            ipRegion: ip ? await resolveIpRegion(ip).catch(() => null) : null,
            birthday: birthdayDate,
          },
          select: {
            id: true,
            accountNo: true,
            phone: true,
            nickname: true,
            avatarUrl: true,
            coverUrl: true,
            demandCardCoverUrl: true,
            cityCode: true,
            ipRegion: true,
            certificationLevel: true,
            snatchCredits: true,
            creditScore: true,
            passwordHash: true,
            bio: true,
            birthday: true,
            createdAt: true,
          },
        });
        return {
          user: modernUserResponse(modernUser),
          token: makeToken({
            id: modernUser.id,
            phone,
            certificationLevel: 'NONE',
          }),
        };
      } catch (error) {
        if (isAccountNoConflict(error) && attempt < MAX_ATTEMPTS - 1) {
          continue;
        }
        throw error;
      }
    }

    throw { status: 500, message: '注册失败，请稍后重试' };
  },

  async loginById(accountId: string, password: string, ip?: string) {
    const trimmed = accountId.trim();
    if (!trimmed) throw { status: 400, message: '请输入账号 ID' };
    if (!/^\d+$/.test(trimmed)) {
      throw { status: 400, message: '账号 ID 必须为数字（如 0、1、2）' };
    }
    const lockKey = `id:${trimmed}`;
    await assertLoginNotLocked(lockKey);
    const accountNo = Number.parseInt(trimmed, 10);

    const legacyUser = await findLegacyUserByAccountNo(accountNo);
    if (legacyUser) {
      let valid = false;
      try {
        valid = await bcrypt.compare(password, legacyUser.passwordHash || '');
      } catch {
        valid = false;
      }
      if (!valid) {
        await recordLoginFailure(lockKey);
        throw { status: 400, message: '密码错误' };
      }
      await clearLoginFailures(lockKey);
      return {
        user: legacyUserResponse(legacyUser),
        token: makeToken({
          id: legacyUser.id,
          phone: legacyUser.phone,
          certificationLevel: legacyUser.certificationLevel || 'NONE',
        }),
      };
    }

    const modernUser = await findModernUserByAccountNo(accountNo);
    if (!modernUser) {
      await recordLoginFailure(lockKey);
      throw { status: 400, message: '账号 ID 不存在' };
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(password, modernUser.passwordHash || '');
    } catch {
      valid = false;
    }
    if (!valid) {
      await recordLoginFailure(lockKey);
      throw { status: 400, message: '密码错误' };
    }
    await clearLoginFailures(lockKey);

    if (ip && !modernUser.ipRegion) {
      resolveIpRegion(ip).then(region => {
        prisma.user.update({ where: { id: modernUser.id }, data: { ipRegion: region } }).catch(() => {})
      }).catch(() => {})
    }

    return {
      user: modernUserResponse(modernUser),
      token: makeToken({
        id: modernUser.id,
        phone: modernUser.phone,
        certificationLevel: modernUser.certificationLevel || 'NONE',
      }),
    };
  },

  async login(phone: string, password: string, ip?: string) {
    const lockKey = `phone:${phone}`;
    await assertLoginNotLocked(lockKey);

    const legacyUser = await findLegacyUserByPhone(phone);
    if (legacyUser) {
      let valid = false;
      try {
        valid = await bcrypt.compare(password, legacyUser.passwordHash || '');
      } catch {
        valid = false;
      }
      if (!valid) {
        await recordLoginFailure(lockKey);
        throw { status: 400, message: '密码错误' };
      }
      await clearLoginFailures(lockKey);
      return {
        user: legacyUserResponse(legacyUser),
        token: makeToken({
          id: legacyUser.id,
          phone: legacyUser.phone,
          certificationLevel: legacyUser.certificationLevel || 'NONE',
        }),
      };
    }

    const modernUser = await findModernUserByPhone(phone);
    if (!modernUser) {
      await recordLoginFailure(lockKey);
      throw { status: 400, message: '手机号未注册，请先获取验证码注册' };
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(password, modernUser.passwordHash || '');
    } catch {
      valid = false;
    }
    if (!valid) {
      await recordLoginFailure(lockKey);
      throw { status: 400, message: '密码错误' };
    }
    await clearLoginFailures(lockKey);

    // 异步更新 IP 属地
    if (ip && !modernUser.ipRegion) {
      resolveIpRegion(ip).then(region => {
        prisma.user.update({ where: { id: modernUser.id }, data: { ipRegion: region } }).catch(() => {})
      }).catch(() => {})
    }

    return {
      user: modernUserResponse(modernUser),
      token: makeToken({
        id: modernUser.id,
        phone: modernUser.phone,
        certificationLevel: modernUser.certificationLevel || 'NONE',
      }),
    };
  },

  async me(userId: string) {
    const legacyUser = await findLegacyUserById(userId);
    if (legacyUser) return legacyUserResponse(legacyUser);

    const modernUser = await findModernUserById(userId);
    if (modernUser) return modernUserResponse(modernUser);

    return null;
  },
};
