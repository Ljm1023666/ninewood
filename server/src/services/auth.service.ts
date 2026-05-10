import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as tencentcloud from 'tencentcloud-sdk-nodejs-sms';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const SmsClient = tencentcloud.sms.v20210111.Client;

const DEFAULT_PASSWORD = '1';
const smsStore = new Map<string, { code: string; expires: number }>();

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

function userResponse(user: any) {
  return {
    id: user.id, phone: user.phone, nickname: user.nickname,
    avatarUrl: user.avatarUrl, coverUrl: user.coverUrl, cityCode: user.cityCode, bio: user.bio,
    certificationLevel: user.certificationLevel,
    snatchCredits: user.snatchCredits, creditScore: user.creditScore,
  };
}

export const authService = {
  // SMS code only for new user registration
  async sendCode(phone: string) {
    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) throw { status: 400, message: '该手机号已注册，请直接输入密码登录' };

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

  // Register: phone + code → create user with default password
  async register(phone: string, code: string) {
    const stored = smsStore.get(phone);
    if (!stored || stored.expires < Date.now()) {
      throw { status: 400, message: '验证码已过期，请重新获取' };
    }
    if (stored.code !== code) {
      throw { status: 400, message: '验证码错误' };
    }
    smsStore.delete(phone);

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const tail = phone.slice(-4);
    const user = await prisma.user.create({
      data: { phone, nickname: `用户_${tail}`, passwordHash },
    });

    return { user: userResponse(user), token: makeToken(user) };
  },

  // Login: phone + password for existing users
  async login(phone: string, password: string) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw { status: 400, message: '手机号未注册，请先获取验证码注册' };

    if (!user.passwordHash) {
      // Legacy user without password — set default
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
      user.passwordHash = hash;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw { status: 400, message: '密码错误' };

    return { user: userResponse(user), token: makeToken(user) };
  },
};
