import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Ninewood] FATAL: JWT_SECRET 环境变量未设置，拒绝启动');
      process.exit(1);
    }
    console.warn('[Ninewood] 警告: JWT_SECRET 未设置，使用开发默认值（严禁用于生产环境）');
    return 'dev-secret-do-not-use-in-prod';
  })(),
  jwtExpiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
  uploadDir: path.join(__dirname, '..', 'uploads'),
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'app://.'],

  // MiniMax / DeepSeek AI（OpenAI 兼容接口）
  aiProvider: process.env.AI_PROVIDER || 'minimax',
  aiBaseUrl: process.env.AI_BASE_URL || 'https://api.minimax.chat/v1',
  aiApiKey: process.env.AI_API_KEY || '',
  // 默认模型（用于普通问答、分类等非思考任务）
  aiModel: process.env.AI_MODEL || 'MiniMax-M2.7-highspeed',
  // think 模式用推理模型；未设置则回退到 aiModel
  aiThinkModel: process.env.AI_THINK_MODEL || '',
  // 快速模式用轻量模型；未设置则回退到 aiModel
  aiFastModel: process.env.AI_FAST_MODEL || '',

  // 多提供商配置（用于模型选择器切换）
  providers: {
    deepseek: {
      baseUrl: process.env.DS_BASE_URL || 'https://api.deepseek.com',
      apiKey: process.env.DS_API_KEY || '',
      defaultModel: process.env.DS_MODEL || 'deepseek-v4-pro',
    },
  },

  // hCaptcha 人机验证
  hcaptcha: {
    siteKey: process.env.HCAPTCHA_SITE_KEY || '',
    secretKey: process.env.HCAPTCHA_SECRET_KEY || '',
  },

  // Tencent Cloud SMS
  sms: {
    secretId: process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || '',
    sdkAppId: process.env.TENCENT_SMS_APPID || '',
    signName: process.env.TENCENT_SMS_SIGN || '乌鲁木齐往昔科技有限公司',
    templateId: process.env.TENCENT_SMS_TEMPLATE || '2631789',
  },
};

// ── 启动时环境检查 ──

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.SENTRY_DSN) {
  console.warn('[Ninewood] 警告: 生产环境未设置 SENTRY_DSN，错误将不会被上报');
}

if (!config.aiApiKey) {
  const msg = isProd
    ? '[Ninewood] 警告: AI_API_KEY 未设置，AI 功能将不可用'
    : '[Ninewood] 提示: AI_API_KEY 未设置，AI 功能将不可用';
  console.warn(msg);
}

if (isProd && !config.hcaptcha.secretKey) {
  console.warn('[Ninewood] 警告: 生产环境未设置 HCAPTCHA_SECRET_KEY，人机验证将不可用');
}

if (isProd && (!config.sms.secretId || !config.sms.secretKey)) {
  console.warn('[Ninewood] 警告: 生产环境未设置腾讯云 SMS 密钥，短信验证码将不可用');
}
