import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as tencentcloud from 'tencentcloud-sdk-nodejs-sms';
import { prisma } from '../lib/prisma.js';
import { resolveIpRegion } from './ipgeo.service.js';
import { config } from '../config.js';

const SmsClient = tencentcloud.sms.v20210111.Client;

const DEFAULT_PASSWORD = '1';
const smsStore = new Map<string, { code: string; expires: number }>();

type LegacyUser = {
  id: string;
  phone: string;
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

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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
    phone: user.phone,
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
    const rows = await (prisma as any).$queryRawUnsafe(
      'SELECT "id","phone","nickname","avatarUrl","coverUrl","demandCardCoverUrl","cityCode","bio","birthday","certificationLevel","snatchCredits","creditScore","passwordHash","createdAt" FROM "User" WHERE "phone" = $1 LIMIT 1',
      phone,
    );
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function findLegacyUserById(userId: string): Promise<LegacyUser | null> {
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      'SELECT "id","phone","nickname","avatarUrl","coverUrl","demandCardCoverUrl","cityCode","bio","birthday","certificationLevel","snatchCredits","creditScore","createdAt" FROM "User" WHERE "id" = $1 LIMIT 1',
      userId,
    );
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function createLegacyUser(phone: string): Promise<LegacyUser | null> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const tail = phone.slice(-4);
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      'INSERT INTO "User" ("phone","nickname","passwordHash","createdAt","updatedAt") VALUES ($1,$2,$3,NOW(),NOW()) RETURNING "id","phone","nickname","avatarUrl","coverUrl","demandCardCoverUrl","cityCode","bio","certificationLevel","snatchCredits","creditScore","createdAt"',
      phone,
      `用户_${tail}`,
      passwordHash,
    );
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
        nickname: true,
        avatarUrl: true,
        coverUrl: true,
        demandCardCoverUrl: true,
        cityCode: true,
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
        phone: true,
        nickname: true,
        avatarUrl: true,
        coverUrl: true,
        demandCardCoverUrl: true,
        cityCode: true,
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
      console.warn(`[SMS] Send failed for ${phone}:`, err.message, `| dev code: ${code}`);
    }

    return { phone, code: smsOk ? undefined : code };
  },

  async register(phone: string, code: string, ip?: string) {
    const stored = smsStore.get(phone);
    if (!stored || stored.expires < Date.now()) {
      throw { status: 400, message: '验证码已过期，请重新获取' };
    }
    if (stored.code !== code) {
      throw { status: 400, message: '验证码错误' };
    }
    smsStore.delete(phone);

    const [legacyExists, modernExists] = await Promise.all([
      findLegacyUserByPhone(phone),
      findModernUserByPhone(phone),
    ]);
    if (legacyExists || modernExists) {
      throw { status: 400, message: '该手机号已注册，请直接输入密码登录' };
    }

    const legacyUser = await createLegacyUser(phone);
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

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const tail = phone.slice(-4);
    const modernUser = await prisma.user.create({
      data: {
        phone,
        nickname: `用户_${tail}`,
        passwordHash,
        ipRegion: ip ? await resolveIpRegion(ip).catch(() => null) : null,
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatarUrl: true,
        coverUrl: true,
        demandCardCoverUrl: true,
        cityCode: true,
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
  },

  async login(phone: string, password: string, ip?: string) {
    const legacyUser = await findLegacyUserByPhone(phone);
    if (legacyUser) {
      let valid = false;
      try {
        valid = await bcrypt.compare(password, legacyUser.passwordHash || '');
      } catch {
        valid = false;
      }
      if (!valid) throw { status: 400, message: '密码错误' };
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
    if (!modernUser) throw { status: 400, message: '手机号未注册，请先获取验证码注册' };

    let valid = false;
    try {
      valid = await bcrypt.compare(password, modernUser.passwordHash || '');
    } catch {
      valid = false;
    }
    if (!valid && modernUser.passwordHash === password) {
      valid = true;
      const hash = await bcrypt.hash(password, 10);
      await prisma.user.update({ where: { id: modernUser.id }, data: { passwordHash: hash } });
    }
    if (!valid) throw { status: 400, message: '密码错误' };

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
