/**
 * 批量种子需求生成器 — 基于 Taxonomy V2
 * 每个叶子节点生成 20-200 条，总量约 3-8 万条
 * 价格按服务类型精确匹配
 *
 * 运行: tsx prisma/seed-bulk.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 叶子节点定义：ID -> { label, priceMin, priceMax, unit }
type LeafDef = {
  label: string
  priceMin: number
  priceMax: number
  unit: string
  tags: string[]
}

const LEAVES: Record<string, LeafDef> = {
  // ========== 游戏代练 ==========
  'olgbwr-bronze': { label: '王者青铜→白银', priceMin: 15, priceMax: 30, unit: '元/段', tags: ['王者', '代练', '低段位'] },
  'olgbwr-silver': { label: '王者白银→黄金', priceMin: 20, priceMax: 40, unit: '元/段', tags: ['王者', '代练'] },
  'olgbwr-gold': { label: '王者黄金→铂金', priceMin: 25, priceMax: 50, unit: '元/段', tags: ['王者', '代练'] },
  'olgbwr-plat': { label: '王者铂金→钻石', priceMin: 30, priceMax: 60, unit: '元/段', tags: ['王者', '代练'] },
  'olgbwr-diamond': { label: '王者钻石→星耀', priceMin: 40, priceMax: 80, unit: '元/段', tags: ['王者', '代练'] },
  'olgbwrs-25': { label: '王者星耀25星', priceMin: 50, priceMax: 120, unit: '元/段', tags: ['王者', '代练', '星耀'] },
  'olgbwrs-50': { label: '王者星耀50星', priceMin: 80, priceMax: 200, unit: '元/段', tags: ['王者', '代练'] },
  'olgbwrs-100': { label: '王者星耀百星', priceMin: 150, priceMax: 400, unit: '元/段', tags: ['王者', '代练', '高端'] },
  'olgbwrs25-mid': { label: '星耀25星中路', priceMin: 60, priceMax: 150, unit: '元/段', tags: ['王者', '代练', '中路'] },
  'olgbwrs25-jungle': { label: '星耀25星打野', priceMin: 60, priceMax: 150, unit: '元/段', tags: ['王者', '代练', '打野'] },
  'olgbwrs25-top': { label: '星耀25星对抗路', priceMin: 60, priceMax: 150, unit: '元/段', tags: ['王者', '代练', '对抗路'] },
  'olgbwrs25-adc': { label: '星耀25星发育路', priceMin: 60, priceMax: 150, unit: '元/段', tags: ['王者', '代练', '发育路'] },
  'olgbwrs25-support': { label: '星耀25星游走', priceMin: 60, priceMax: 150, unit: '元/段', tags: ['王者', '代练', '游走'] },
  'olgbwrs50-mid': { label: '星耀50星中路', priceMin: 100, priceMax: 250, unit: '元/段', tags: ['王者', '代练', '中路'] },
  'olgbwrs50-jungle': { label: '星耀50星打野', priceMin: 100, priceMax: 250, unit: '元/段', tags: ['王者', '代练', '打野'] },
  'olgbwrs50-top': { label: '星耀50星对抗路', priceMin: 100, priceMax: 250, unit: '元/段', tags: ['王者', '代练', '对抗路'] },
  'olgbwrs50-adc': { label: '星耀50星发育路', priceMin: 100, priceMax: 250, unit: '元/段', tags: ['王者', '代练', '发育路'] },
  'olgbwrs50-support': { label: '星耀50星游走', priceMin: 100, priceMax: 250, unit: '元/段', tags: ['王者', '代练', '游走'] },
  'olgbwrs100-mid': { label: '星耀百星中路', priceMin: 180, priceMax: 500, unit: '元/段', tags: ['王者', '代练', '中路'] },
  'olgbwrs100-jungle': { label: '星耀百星打野', priceMin: 180, priceMax: 500, unit: '元/段', tags: ['王者', '代练', '打野'] },
  'olgbwrs100-top': { label: '星耀百星对抗路', priceMin: 180, priceMax: 500, unit: '元/段', tags: ['王者', '代练', '对抗路'] },
  'olgbwrs100-adc': { label: '星耀百星发育路', priceMin: 180, priceMax: 500, unit: '元/段', tags: ['王者', '代练', '发育路'] },
  'olgbwrs100-support': { label: '星耀百星游走', priceMin: 180, priceMax: 500, unit: '元/段', tags: ['王者', '代练', '游走'] },
  'olgbwr-king': { label: '王者→荣耀', priceMin: 100, priceMax: 300, unit: '元/段', tags: ['王者', '代练'] },
  'olgbwr-myth': { label: '王者传奇百星', priceMin: 200, priceMax: 600, unit: '元/段', tags: ['王者', '代练', '高端'] },
  'olgbwa-avatar': { label: '王者荣耀播报', priceMin: 30, priceMax: 100, unit: '元/个', tags: ['王者', '成就'] },
  'olgbwa-title': { label: '王者称号代打', priceMin: 50, priceMax: 200, unit: '元/个', tags: ['王者', '成就'] },
  'olgbwa-medal': { label: '王者成就徽章', priceMin: 20, priceMax: 80, unit: '元/个', tags: ['王者', '成就'] },
  'olgbwa-ranking': { label: '王者战区排名', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['王者', '排名'] },
  'olgbwh-shan': { label: '上官婉儿战力', priceMin: 30, priceMax: 150, unit: '元/千战力', tags: ['王者', '英雄', '婉儿'] },
  'olgbwh-libai': { label: '李白战力', priceMin: 30, priceMax: 150, unit: '元/千战力', tags: ['王者', '英雄', '李白'] },
  'olgbwh-hanxin': { label: '韩信战力', priceMin: 30, priceMax: 150, unit: '元/千战力', tags: ['王者', '英雄', '韩信'] },
  'olgbwh-luna': { label: '露娜战力', priceMin: 40, priceMax: 180, unit: '元/千战力', tags: ['王者', '英雄', '露娜'] },
  'olgbwh-jing': { label: '镜战力', priceMin: 40, priceMax: 180, unit: '元/千战力', tags: ['王者', '英雄', '镜'] },
  'olgbwh-mengqi': { label: '梦奇战力', priceMin: 20, priceMax: 100, unit: '元/千战力', tags: ['王者', '英雄'] },
  'olgbwho-mid': { label: '王者中路战力', priceMin: 25, priceMax: 120, unit: '元/千战力', tags: ['王者', '中路'] },
  'olgbwho-jungle': { label: '王者打野战力', priceMin: 25, priceMax: 120, unit: '元/千战力', tags: ['王者', '打野'] },
  'olgbwho-top': { label: '王者对抗路战力', priceMin: 25, priceMax: 120, unit: '元/千战力', tags: ['王者', '对抗路'] },
  'olgbwho-adc': { label: '王者发育路战力', priceMin: 25, priceMax: 120, unit: '元/千战力', tags: ['王者', '发育路'] },
  'olgbwho-support': { label: '王者游走战力', priceMin: 25, priceMax: 120, unit: '元/千战力', tags: ['王者', '游走'] },
  'olgbwt-team': { label: '战队上分', priceMin: 50, priceMax: 300, unit: '元/次', tags: ['王者', '战队'] },
  'olgbwt-tournament': { label: '赛事代打', priceMin: 200, priceMax: 1000, unit: '元/次', tags: ['王者', '赛事'] },

  // LOL
  'olgblr-iron': { label: 'LOL黑铁→青铜', priceMin: 20, priceMax: 40, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblr-bronze': { label: 'LOL青铜→白银', priceMin: 25, priceMax: 50, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblr-silver': { label: 'LOL白银→黄金', priceMin: 30, priceMax: 60, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblr-gold': { label: 'LOL黄金→铂金', priceMin: 40, priceMax: 80, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblr-plat': { label: 'LOL铂金→翡翠', priceMin: 50, priceMax: 100, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblr-emerald': { label: 'LOL翡翠→钻石', priceMin: 60, priceMax: 150, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblr-diamond': { label: 'LOL钻石→大师', priceMin: 100, priceMax: 300, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblr-master': { label: 'LOL大师→宗师', priceMin: 150, priceMax: 400, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblr-gm': { label: 'LOL宗师→王者', priceMin: 200, priceMax: 600, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblr-challenger': { label: 'LOL最强王者', priceMin: 300, priceMax: 1000, unit: '元/段', tags: ['LOL', '代练'] },
  'olgblp-win5': { label: 'LOL定级5胜', priceMin: 30, priceMax: 80, unit: '元/次', tags: ['LOL', '定级'] },
  'olgblp-win7': { label: 'LOL定级7胜', priceMin: 50, priceMax: 120, unit: '元/次', tags: ['LOL', '定级'] },
  'olgblp-win10': { label: 'LOL定级10胜', priceMin: 80, priceMax: 200, unit: '元/次', tags: ['LOL', '定级'] },
  'olgblr-top': { label: 'LOL上单代练', priceMin: 30, priceMax: 100, unit: '元/段', tags: ['LOL', '上单'] },
  'olgblr-jungle': { label: 'LOL打野代练', priceMin: 30, priceMax: 100, unit: '元/段', tags: ['LOL', '打野'] },
  'olgblr-mid': { label: 'LOL中单代练', priceMin: 30, priceMax: 100, unit: '元/段', tags: ['LOL', '中单'] },
  'olgblr-adc': { label: 'LOL射手代练', priceMin: 30, priceMax: 100, unit: '元/段', tags: ['LOL', '射手'] },
  'olgblr-support': { label: 'LOL辅助代练', priceMin: 25, priceMax: 80, unit: '元/段', tags: ['LOL', '辅助'] },
  'olgbla-lv': { label: 'LOL等级代练', priceMin: 20, priceMax: 100, unit: '元/级', tags: ['LOL', '等级'] },
  'olgbla-skin': { label: 'LOL皮肤代刷', priceMin: 50, priceMax: 500, unit: '元/个', tags: ['LOL', '皮肤'] },
  'olgbla-blue': { label: 'LOL蓝色精粹', priceMin: 10, priceMax: 50, unit: '元/万', tags: ['LOL', '精粹'] },

  // 吃鸡
  'olgbpr-bronze': { label: '和平精英青铜→白银', priceMin: 15, priceMax: 30, unit: '元/段', tags: ['吃鸡', '代练'] },
  'olgbpr-silver': { label: '和平精英白银→黄金', priceMin: 20, priceMax: 40, unit: '元/段', tags: ['吃鸡', '代练'] },
  'olgbpr-gold': { label: '和平精英黄金→铂金', priceMin: 25, priceMax: 50, unit: '元/段', tags: ['吃鸡', '代练'] },
  'olgbpr-plat': { label: '和平精英铂金→钻石', priceMin: 30, priceMax: 60, unit: '元/段', tags: ['吃鸡', '代练'] },
  'olgbpr-diamond': { label: '和平精英钻石→皇冠', priceMin: 40, priceMax: 80, unit: '元/段', tags: ['吃鸡', '代练'] },
  'olgbpr-crown': { label: '和平精英皇冠→王牌', priceMin: 50, priceMax: 120, unit: '元/段', tags: ['吃鸡', '代练'] },
  'olgbpr-ace': { label: '和平精英王牌→战神', priceMin: 100, priceMax: 300, unit: '元/段', tags: ['吃鸡', '代练'] },
  'olgbp-rp': { label: '和平精英赛季手册', priceMin: 30, priceMax: 100, unit: '元/本', tags: ['吃鸡', '手册'] },
  'olgbpk-100': { label: '和平精英100击杀', priceMin: 20, priceMax: 50, unit: '元/百', tags: ['吃鸡', '击杀'] },
  'olgbpk-300': { label: '和平精英300击杀', priceMin: 40, priceMax: 100, unit: '元/百', tags: ['吃鸡', '击杀'] },
  'olgbpk-500': { label: '和平精英500击杀', priceMin: 60, priceMax: 150, unit: '元/百', tags: ['吃鸡', '击杀'] },
  'olgbp-gun': { label: '和平精英枪械皮肤', priceMin: 50, priceMax: 300, unit: '元/个', tags: ['吃鸡', '皮肤'] },

  // 其他游戏代练
  'olgb-hyxd': { label: '荒野行动代练', priceMin: 20, priceMax: 100, unit: '元/段', tags: ['荒野', '代练'] },
  'olgba-rank': { label: 'Apex排位上分', priceMin: 30, priceMax: 200, unit: '元/段', tags: ['Apex', '代练'] },
  'olgba-bp': { label: 'Apex通行证', priceMin: 30, priceMax: 80, unit: '元/本', tags: ['Apex', '通行证'] },
  'olgbd-mm': { label: 'Dota2天梯分', priceMin: 50, priceMax: 300, unit: '元/千分', tags: ['Dota2', '代练'] },
  'olgbd-calibration': { label: 'Dota2定级赛', priceMin: 30, priceMax: 100, unit: '元/次', tags: ['Dota2', '定级'] },
  'olgbo-rank': { label: '守望先锋竞技段位', priceMin: 30, priceMax: 150, unit: '元/段', tags: ['守望', '代练'] },
  'olgbw-rating': { label: '魔兽评级战场', priceMin: 50, priceMax: 300, unit: '元/段', tags: ['魔兽', '评级'] },
  'olgbw-mythic': { label: '魔兽大秘境', priceMin: 30, priceMax: 200, unit: '元/层', tags: ['魔兽', '大秘境'] },
  'olgbw-gold': { label: '魔兽金币', priceMin: 10, priceMax: 100, unit: '元/万', tags: ['魔兽', '金币'] },
  'olgbw-level': { label: '魔兽等级代练', priceMin: 20, priceMax: 100, unit: '元/级', tags: ['魔兽', '等级'] },
  'olgbf-level': { label: 'FF14等级代练', priceMin: 20, priceMax: 80, unit: '元/级', tags: ['FF14', '等级'] },
  'olgbf-raid': { label: 'FF14零式/绝本', priceMin: 100, priceMax: 500, unit: '元/本', tags: ['FF14', '副本'] },
  'olgb-other': { label: '其他游戏代练', priceMin: 20, priceMax: 200, unit: '元/次', tags: ['代练'] },

  // 陪玩
  'olgcwr-low': { label: '王者低段位陪玩', priceMin: 15, priceMax: 40, unit: '元/小时', tags: ['王者', '陪玩'] },
  'olgcwr-mid': { label: '王者中段位陪玩', priceMin: 20, priceMax: 60, unit: '元/小时', tags: ['王者', '陪玩'] },
  'olgcwr-high': { label: '王者高段位陪玩', priceMin: 30, priceMax: 100, unit: '元/小时', tags: ['王者', '陪玩'] },
  'olgcwr-top': { label: '王者顶端局陪玩', priceMin: 50, priceMax: 200, unit: '元/小时', tags: ['王者', '陪玩'] },
  'olgcwf-sound': { label: '王者语音陪玩', priceMin: 20, priceMax: 80, unit: '元/小时', tags: ['王者', '语音陪玩'] },
  'olgcwf-duo': { label: '王者双排娱乐', priceMin: 15, priceMax: 50, unit: '元/小时', tags: ['王者', '双排'] },
  'olgcwf-five': { label: '王者五排车队', priceMin: 10, priceMax: 30, unit: '元/人', tags: ['王者', '五排'] },
  'olgcwt-hero': { label: '王者英雄教学', priceMin: 30, priceMax: 100, unit: '元/小时', tags: ['王者', '教学'] },
  'olgcwt-macro': { label: '王者意识教学', priceMin: 40, priceMax: 120, unit: '元/小时', tags: ['王者', '教学'] },
  'olgcwt-micro': { label: '王者操作教学', priceMin: 30, priceMax: 100, unit: '元/小时', tags: ['王者', '教学'] },
  'olgcwg-chat': { label: '王者聊天陪伴', priceMin: 20, priceMax: 60, unit: '元/小时', tags: ['王者', '陪伴'] },
  'olgcwg-game': { label: '王者游戏陪伴', priceMin: 15, priceMax: 50, unit: '元/小时', tags: ['王者', '陪伴'] },
  'olgcl-rank': { label: 'LOL排位陪玩', priceMin: 20, priceMax: 80, unit: '元/小时', tags: ['LOL', '陪玩'] },
  'olgcl-fun': { label: 'LOL娱乐陪玩', priceMin: 15, priceMax: 50, unit: '元/小时', tags: ['LOL', '陪玩'] },
  'olgcl-teach': { label: 'LOL教学陪玩', priceMin: 30, priceMax: 100, unit: '元/小时', tags: ['LOL', '教学'] },
  'olgc-pubg': { label: 'PUBG陪玩', priceMin: 15, priceMax: 50, unit: '元/小时', tags: ['吃鸡', '陪玩'] },
  'olgc-valorant': { label: '瓦罗兰特陪玩', priceMin: 20, priceMax: 60, unit: '元/小时', tags: ['瓦罗兰特', '陪玩'] },
  'olgc-csgo': { label: 'CS2陪玩', priceMin: 20, priceMax: 60, unit: '元/小时', tags: ['CS2', '陪玩'] },
  'olgc-fortnite': { label: '堡垒之夜陪玩', priceMin: 15, priceMax: 50, unit: '元/小时', tags: ['堡垒之夜', '陪玩'] },
  'olgc-mc': { label: '我的世界陪玩', priceMin: 15, priceMax: 40, unit: '元/小时', tags: ['MC', '陪玩'] },
  'olgc-other': { label: '其他游戏陪玩', priceMin: 15, priceMax: 50, unit: '元/小时', tags: ['陪玩'] },

  // 账号交易
  'olgabw-v8': { label: '王者V8贵族号', priceMin: 300, priceMax: 800, unit: '元/个', tags: ['王者', '买号'] },
  'olgabw-v9': { label: '王者V9贵族号', priceMin: 500, priceMax: 1500, unit: '元/个', tags: ['王者', '买号'] },
  'olgabw-v10': { label: '王者V10贵族号', priceMin: 1000, priceMax: 5000, unit: '元/个', tags: ['王者', '买号'] },
  'olgabw-limited': { label: '王者限定皮肤号', priceMin: 2000, priceMax: 10000, unit: '元/个', tags: ['王者', '买号'] },
  'olgabl-skin': { label: 'LOL皮肤号', priceMin: 200, priceMax: 3000, unit: '元/个', tags: ['LOL', '买号'] },
  'olgabl-rank': { label: 'LOL段位号', priceMin: 100, priceMax: 2000, unit: '元/个', tags: ['LOL', '买号'] },
  'olgab-steam': { label: 'Steam账号', priceMin: 100, priceMax: 2000, unit: '元/个', tags: ['Steam', '买号'] },
  'olgab-psn': { label: 'PSN账号', priceMin: 200, priceMax: 3000, unit: '元/个', tags: ['PSN', '买号'] },
  'olgab-xbox': { label: 'Xbox账号', priceMin: 200, priceMax: 3000, unit: '元/个', tags: ['Xbox', '买号'] },
  'olgab-nintendo': { label: '任天堂账号', priceMin: 200, priceMax: 2000, unit: '元/个', tags: ['任天堂', '买号'] },
  'olga-sell': { label: '卖号估价', priceMin: 10, priceMax: 100, unit: '元/次', tags: ['卖号'] },
  'olgar-hour': { label: '租号按小时', priceMin: 3, priceMax: 20, unit: '元/小时', tags: ['租号'] },
  'olgar-day': { label: '租号按天', priceMin: 20, priceMax: 100, unit: '元/天', tags: ['租号'] },
  'olgar-week': { label: '租号按周', priceMin: 80, priceMax: 300, unit: '元/周', tags: ['租号'] },
  'olga-recover': { label: '账号找回申诉', priceMin: 50, priceMax: 300, unit: '元/次', tags: ['账号找回'] },

  // 道具
  'olgi-gold': { label: '游戏金币代刷', priceMin: 5, priceMax: 50, unit: '元/万', tags: ['金币'] },
  'olgi-skin': { label: '皮肤代购', priceMin: 50, priceMax: 500, unit: '元/个', tags: ['皮肤'] },
  'olgi-card': { label: '点卡代充', priceMin: 10, priceMax: 500, unit: '元/次', tags: ['点卡'] },
  'olgi-gacha': { label: '抽卡代抽', priceMin: 50, priceMax: 500, unit: '元/次', tags: ['抽卡'] },
  'olgi-pass': { label: '通行证代刷', priceMin: 20, priceMax: 100, unit: '元/次', tags: ['通行证'] },
  'olgl-observer': { label: '游戏OB解说', priceMin: 100, priceMax: 500, unit: '元/场', tags: ['直播', '解说'] },
  'olgl-host': { label: '直播托管', priceMin: 50, priceMax: 300, unit: '元/天', tags: ['直播'] },
  'olgl-edit': { label: '直播剪辑', priceMin: 50, priceMax: 200, unit: '元/条', tags: ['直播', '剪辑'] },
  'olgl-cover': { label: '直播间封面', priceMin: 20, priceMax: 100, unit: '元/张', tags: ['直播', '封面'] },
  'olgt-qa': { label: '游戏功能测试', priceMin: 50, priceMax: 300, unit: '元/天', tags: ['测试'] },
  'olgt-localize': { label: '游戏本地化测试', priceMin: 80, priceMax: 400, unit: '元/天', tags: ['测试'] },
  'olgt-balance': { label: '游戏数值测试', priceMin: 100, priceMax: 500, unit: '元/天', tags: ['测试'] },
  'olgt-bug': { label: '游戏BUG提交', priceMin: 5, priceMax: 50, unit: '元/个', tags: ['测试'] },

  // ========== 设计（精简样例） ==========
  'oldumi-social': { label: 'iOS社交App设计', priceMin: 2000, priceMax: 8000, unit: '元/套', tags: ['UI', 'iOS'] },
  'oldumi-ecom': { label: 'iOS电商App设计', priceMin: 3000, priceMax: 12000, unit: '元/套', tags: ['UI', 'iOS'] },
  'oldumi-tool': { label: 'iOS工具App设计', priceMin: 1500, priceMax: 6000, unit: '元/套', tags: ['UI', 'iOS'] },
  'oldumi-game': { label: 'iOS游戏UI设计', priceMin: 3000, priceMax: 15000, unit: '元/套', tags: ['UI', 'iOS'] },
  'oldumi-health': { label: 'iOS健康App设计', priceMin: 2000, priceMax: 8000, unit: '元/套', tags: ['UI', 'iOS'] },
  'olduma-social': { label: '安卓社交App设计', priceMin: 2000, priceMax: 8000, unit: '元/套', tags: ['UI', '安卓'] },
  'olduma-ecom': { label: '安卓电商App设计', priceMin: 3000, priceMax: 12000, unit: '元/套', tags: ['UI', '安卓'] },
  'olduma-tool': { label: '安卓工具App设计', priceMin: 1500, priceMax: 6000, unit: '元/套', tags: ['UI', '安卓'] },
  'oldum-flutter': { label: 'Flutter界面设计', priceMin: 2000, priceMax: 8000, unit: '元/套', tags: ['UI', 'Flutter'] },
  'oldum-rn': { label: 'React Native设计', priceMin: 2000, priceMax: 8000, unit: '元/套', tags: ['UI', 'RN'] },
  'olduw-landing': { label: '落地页设计', priceMin: 500, priceMax: 3000, unit: '元/页', tags: ['网页', '落地页'] },
  'olduwd-analytics': { label: '数据看板设计', priceMin: 2000, priceMax: 8000, unit: '元/套', tags: ['网页', '数据'] },
  'olduwd-crm': { label: 'CRM界面设计', priceMin: 3000, priceMax: 12000, unit: '元/套', tags: ['网页', 'CRM'] },
  'olduwd-erp': { label: 'ERP界面设计', priceMin: 4000, priceMax: 15000, unit: '元/套', tags: ['网页', 'ERP'] },
  'olduw-saas': { label: 'SaaS产品UI', priceMin: 3000, priceMax: 15000, unit: '元/套', tags: ['网页', 'SaaS'] },
  'olduw-portfolio': { label: '作品集网站设计', priceMin: 800, priceMax: 3000, unit: '元/套', tags: ['网页', '作品集'] },
  'olduw-blog': { label: '博客UI设计', priceMin: 500, priceMax: 2000, unit: '元/套', tags: ['网页', '博客'] },
  'oldu-app': { label: 'App界面设计', priceMin: 2000, priceMax: 10000, unit: '元/套', tags: ['UI', 'App'] },
  'oldum-wechat': { label: '微信小程序设计', priceMin: 1000, priceMax: 5000, unit: '元/套', tags: ['小程序'] },
  'oldum-alipay': { label: '支付宝小程序设计', priceMin: 1000, priceMax: 5000, unit: '元/套', tags: ['小程序'] },
  'oldum-bytedance': { label: '抖音小程序设计', priceMin: 1000, priceMax: 5000, unit: '元/套', tags: ['小程序'] },
  'oldu-tv': { label: 'TV大屏UI', priceMin: 2000, priceMax: 8000, unit: '元/套', tags: ['UI', 'TV'] },
  'oldu-watch': { label: '手表UI设计', priceMin: 1500, priceMax: 5000, unit: '元/套', tags: ['UI', '穿戴'] },
  'oldu-prototype': { label: '交互原型设计', priceMin: 500, priceMax: 3000, unit: '元/套', tags: ['原型'] },
  'oldu-designsys': { label: '设计系统搭建', priceMin: 5000, priceMax: 20000, unit: '元/套', tags: ['设计系统'] },

  // 品牌
  'oldbl-word': { label: '文字LOGO设计', priceMin: 200, priceMax: 1000, unit: '元/个', tags: ['LOGO'] },
  'oldbl-icon': { label: '图形LOGO设计', priceMin: 300, priceMax: 2000, unit: '元/个', tags: ['LOGO'] },
  'oldbl-combine': { label: '组合LOGO设计', priceMin: 500, priceMax: 3000, unit: '元/个', tags: ['LOGO'] },
  'oldbl-mascot': { label: '吉祥物设计', priceMin: 800, priceMax: 5000, unit: '元/个', tags: ['品牌', '吉祥物'] },
  'oldbv-card': { label: '名片设计', priceMin: 100, priceMax: 500, unit: '元/套', tags: ['VI', '名片'] },
  'oldbv-stationery': { label: '办公用品VI', priceMin: 300, priceMax: 1500, unit: '元/套', tags: ['VI'] },
  'oldbv-uniform': { label: '工服设计', priceMin: 500, priceMax: 2000, unit: '元/套', tags: ['VI'] },
  'oldbv-sign': { label: '门头标识设计', priceMin: 500, priceMax: 3000, unit: '元/套', tags: ['VI', '标识'] },
  'oldb-guide': { label: '品牌手册设计', priceMin: 1000, priceMax: 5000, unit: '元/本', tags: ['品牌手册'] },
  'oldb-naming': { label: '品牌命名服务', priceMin: 500, priceMax: 3000, unit: '元/次', tags: ['品牌', '命名'] },

  // 平面
  'oldpp-recruit': { label: '招聘海报设计', priceMin: 100, priceMax: 500, unit: '元/张', tags: ['海报'] },
  'oldpp-promo': { label: '促销海报设计', priceMin: 100, priceMax: 500, unit: '元/张', tags: ['海报'] },
  'oldpp-film': { label: '影视海报设计', priceMin: 200, priceMax: 1000, unit: '元/张', tags: ['海报'] },
  'oldpp-event': { label: '活动海报设计', priceMin: 100, priceMax: 500, unit: '元/张', tags: ['海报'] },
  'oldp-flyer': { label: '传单/折页设计', priceMin: 200, priceMax: 800, unit: '元/版', tags: ['印刷'] },
  'oldpb-catalog': { label: '产品目录设计', priceMin: 500, priceMax: 3000, unit: '元/本', tags: ['画册'] },
  'oldpb-magazine': { label: '杂志排版', priceMin: 300, priceMax: 1500, unit: '元/本', tags: ['排版'] },
  'oldpb-annual': { label: '年报设计', priceMin: 1000, priceMax: 4000, unit: '元/本', tags: ['画册'] },
  'oldpk-food': { label: '食品包装设计', priceMin: 500, priceMax: 3000, unit: '元/款', tags: ['包装'] },
  'oldpk-cos': { label: '化妆品包装', priceMin: 800, priceMax: 4000, unit: '元/款', tags: ['包装'] },
  'oldpk-elect': { label: '电子产品包装', priceMin: 500, priceMax: 3000, unit: '元/款', tags: ['包装'] },
  'oldpk-gift': { label: '礼品包装设计', priceMin: 300, priceMax: 2000, unit: '元/款', tags: ['包装'] },
  'oldp-billboard': { label: '户外广告设计', priceMin: 500, priceMax: 2000, unit: '元/版', tags: ['户外'] },

  // ========== 线下家政（精简样例） ==========
  'ofhcd-2h': { label: '日常保洁2小时', priceMin: 60, priceMax: 100, unit: '元/次', tags: ['保洁'] },
  'ofhcd-3h': { label: '日常保洁3小时', priceMin: 90, priceMax: 150, unit: '元/次', tags: ['保洁'] },
  'ofhcd-4h': { label: '日常保洁4小时', priceMin: 120, priceMax: 200, unit: '元/次', tags: ['保洁'] },
  'ofhcd-one': { label: '单间深度保洁', priceMin: 150, priceMax: 300, unit: '元/次', tags: ['深度保洁'] },
  'ofhcd-whole': { label: '全屋深度保洁', priceMin: 300, priceMax: 800, unit: '元/次', tags: ['深度保洁'] },
  'ofhcw-in': { label: '擦窗内部', priceMin: 80, priceMax: 200, unit: '元/次', tags: ['擦窗'] },
  'ofhcw-out': { label: '内外擦窗', priceMin: 150, priceMax: 350, unit: '元/次', tags: ['擦窗'] },
  'ofhcw-curtain': { label: '窗帘拆洗', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['窗帘'] },
  'ofhc-carpet': { label: '地毯清洗', priceMin: 50, priceMax: 200, unit: '元/平米', tags: ['地毯'] },
  'ofhc-sofa': { label: '布艺沙发清洗', priceMin: 100, priceMax: 300, unit: '元/座', tags: ['沙发'] },
  'ofhca-hang': { label: '空调挂机清洗', priceMin: 80, priceMax: 150, unit: '元/台', tags: ['空调'] },
  'ofhca-center': { label: '中央空调清洗', priceMin: 200, priceMax: 600, unit: '元/台', tags: ['空调'] },
  'ofhca-commercial': { label: '商用空调清洗', priceMin: 300, priceMax: 1000, unit: '元/台', tags: ['空调'] },
  'ofhc-fridge': { label: '冰箱清洗', priceMin: 80, priceMax: 200, unit: '元/台', tags: ['家电清洗'] },
  'ofhckh-standard': { label: '油烟机标准拆洗', priceMin: 100, priceMax: 200, unit: '元/台', tags: ['油烟机'] },
  'ofhckh-steam': { label: '油烟机高温蒸汽', priceMin: 150, priceMax: 300, unit: '元/台', tags: ['油烟机'] },
  'ofhck-oven': { label: '烤箱灶台清洁', priceMin: 80, priceMax: 200, unit: '元/台', tags: ['厨房'] },
  'ofhck-cabinet': { label: '橱柜清洁', priceMin: 100, priceMax: 300, unit: '元/延米', tags: ['厨房'] },
  'ofhcb-mold': { label: '卫生间除霉', priceMin: 80, priceMax: 200, unit: '元/间', tags: ['卫生间'] },
  'ofhcb-grout': { label: '美缝清洁', priceMin: 5, priceMax: 15, unit: '元/米', tags: ['美缝'] },
  'ofhcb-toilet': { label: '马桶深度清洁', priceMin: 50, priceMax: 100, unit: '元/个', tags: ['马桶'] },

  // 搬家
  'ofhmm-studio': { label: '单间搬家', priceMin: 200, priceMax: 400, unit: '元/次', tags: ['搬家'] },
  'ofhmm-1br': { label: '一室一厅搬家', priceMin: 300, priceMax: 600, unit: '元/次', tags: ['搬家'] },
  'ofhmm-2br': { label: '两室一厅搬家', priceMin: 400, priceMax: 800, unit: '元/次', tags: ['搬家'] },
  'ofhmm-3br': { label: '三室及以上搬家', priceMin: 600, priceMax: 1500, unit: '元/次', tags: ['搬家'] },
  'ofhmm-house': { label: '别墅大平层搬家', priceMin: 1500, priceMax: 4000, unit: '元/次', tags: ['搬家'] },
  'ofhmp-whole': { label: '全屋收纳整理', priceMin: 300, priceMax: 1000, unit: '元/次', tags: ['收纳'] },
  'ofhmp-room': { label: '单间收纳整理', priceMin: 150, priceMax: 400, unit: '元/次', tags: ['收纳'] },
  'ofhmp-closet': { label: '衣橱整理', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['收纳'] },
  'ofhm-piano': { label: '钢琴搬运', priceMin: 300, priceMax: 800, unit: '元/次', tags: ['搬运'] },

  // 月嫂看护
  'ofhcm-26d': { label: '月嫂26天', priceMin: 8000, priceMax: 15000, unit: '元/期', tags: ['月嫂'] },
  'ofhcm-42d': { label: '月嫂42天', priceMin: 12000, priceMax: 22000, unit: '元/期', tags: ['月嫂'] },
  'ofhcm-3m': { label: '月嫂3个月', priceMin: 20000, priceMax: 35000, unit: '元/期', tags: ['月嫂'] },
  'ofhc-nanny': { label: '育儿嫂', priceMin: 4000, priceMax: 8000, unit: '元/月', tags: ['育儿'] },
  'ofhc-elder': { label: '老人陪护', priceMin: 3000, priceMax: 6000, unit: '元/月', tags: ['陪护'] },
  'ofhc-doula': { label: '催乳/导乐', priceMin: 200, priceMax: 500, unit: '元/次', tags: ['产后'] },
  'ofhc-daily': { label: '日常做饭阿姨', priceMin: 1500, priceMax: 3000, unit: '元/月', tags: ['做饭'] },
  'ofhc-party': { label: '家宴厨师上门', priceMin: 300, priceMax: 1000, unit: '元/次', tags: ['私厨'] },
  'ofhc-banquet': { label: '宴席厨师', priceMin: 500, priceMax: 2000, unit: '元/次', tags: ['私厨'] },
  'ofhc-diet': { label: '减脂餐定制', priceMin: 100, priceMax: 300, unit: '元/天', tags: ['饮食'] },

  // ========== 维修（精简） ==========
  'ofre-circuit': { label: '电路检修', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['电路'] },
  'ofre-switch': { label: '开关插座安装', priceMin: 20, priceMax: 80, unit: '元/个', tags: ['电路'] },
  'ofre-panel': { label: '配电箱维修', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['电路'] },
  'ofre-wiring': { label: '布线改造', priceMin: 30, priceMax: 100, unit: '元/米', tags: ['电路'] },
  'ofrp-toilet': { label: '马桶疏通', priceMin: 50, priceMax: 150, unit: '元/次', tags: ['疏通'] },
  'ofrp-kitchen': { label: '厨房下水疏通', priceMin: 60, priceMax: 150, unit: '元/次', tags: ['疏通'] },
  'ofrp-drain': { label: '地漏疏通', priceMin: 40, priceMax: 100, unit: '元/个', tags: ['疏通'] },
  'ofrp-roof': { label: '防水补漏', priceMin: 200, priceMax: 800, unit: '元/次', tags: ['防水'] },
  'ofrl-open': { label: '开锁服务', priceMin: 50, priceMax: 150, unit: '元/次', tags: ['开锁'] },
  'ofrl-change': { label: '换锁芯', priceMin: 80, priceMax: 200, unit: '元/次', tags: ['换锁'] },
  'ofrl-smart': { label: '智能锁安装', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['智能锁'] },
  'ofrf-flat': { label: '板式家具安装', priceMin: 50, priceMax: 200, unit: '元/件', tags: ['家具安装'] },
  'ofrf-wardrobe': { label: '衣柜安装', priceMin: 100, priceMax: 300, unit: '元/个', tags: ['家具安装'] },
  'ofrf-bed': { label: '床/床垫安装', priceMin: 50, priceMax: 150, unit: '元/个', tags: ['家具安装'] },
  'ofrf-curtain': { label: '窗帘安装', priceMin: 30, priceMax: 100, unit: '元/条', tags: ['窗帘'] },
  'ofra-tv': { label: '电视维修', priceMin: 50, priceMax: 300, unit: '元/次', tags: ['家电维修'] },
  'ofra-wm': { label: '洗衣机维修', priceMin: 50, priceMax: 300, unit: '元/次', tags: ['家电维修'] },
  'ofra-fridge': { label: '冰箱维修', priceMin: 80, priceMax: 400, unit: '元/次', tags: ['家电维修'] },
  'ofra-water': { label: '净水器维修', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['家电维修'] },
  'ofra-heater': { label: '热水器维修', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['家电维修'] },
  'ofrp-screen': { label: '手机换屏', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['手机维修'] },
  'ofrp-battery': { label: '手机换电池', priceMin: 50, priceMax: 150, unit: '元/次', tags: ['手机维修'] },
  'ofrp-water': { label: '手机进水维修', priceMin: 100, priceMax: 400, unit: '元/次', tags: ['手机维修'] },
  'ofrp-board': { label: '手机主板维修', priceMin: 150, priceMax: 600, unit: '元/次', tags: ['手机维修'] },
  'ofrc-software': { label: '电脑系统重装', priceMin: 30, priceMax: 100, unit: '元/次', tags: ['电脑维修'] },
  'ofrc-hardware': { label: '电脑硬件维修', priceMin: 50, priceMax: 300, unit: '元/次', tags: ['电脑维修'] },
  'ofrc-data': { label: '数据恢复', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['数据恢复'] },
  'ofrc-network': { label: '网络布线', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['网络'] },
  'ofrc-install': { label: '监控安装', priceMin: 100, priceMax: 500, unit: '元/路', tags: ['监控'] },
  'ofrc-nvr': { label: '录像机设置', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['监控'] },
  'ofr-lamp': { label: '灯具安装', priceMin: 20, priceMax: 100, unit: '元/个', tags: ['灯具'] },

  // 更多线下...
  'ofha-general': { label: '普通陪诊', priceMin: 50, priceMax: 150, unit: '元/次', tags: ['陪诊'] },
  'ofha-elder': { label: '老年陪诊', priceMin: 60, priceMax: 200, unit: '元/次', tags: ['陪诊'] },
  'ofha-child': { label: '儿童陪诊', priceMin: 60, priceMax: 200, unit: '元/次', tags: ['陪诊'] },
  'ofhm-tui': { label: '推拿按摩上门', priceMin: 80, priceMax: 200, unit: '元/次', tags: ['推拿'] },
  'ofhm-foot': { label: '足疗上门', priceMin: 80, priceMax: 200, unit: '元/次', tags: ['足疗'] },
  'ofhm-cupping': { label: '拔罐刮痧', priceMin: 50, priceMax: 150, unit: '元/次', tags: ['拔罐'] },
  'ofhm-gua': { label: '刮痧上门', priceMin: 50, priceMax: 150, unit: '元/次', tags: ['刮痧'] },
  'ofh-tcm': { label: '中医针灸上门', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['中医'] },
  'ofh-psy': { label: '心理咨询', priceMin: 200, priceMax: 600, unit: '元/次', tags: ['心理'] },
  'ofh-diet': { label: '营养指导', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['营养'] },
  'ofh-rehab': { label: '康复训练上门', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['康复'] },

  'ofaw-standard': { label: '标准洗车', priceMin: 30, priceMax: 60, unit: '元/次', tags: ['洗车'] },
  'ofaw-deep': { label: '精洗', priceMin: 80, priceMax: 200, unit: '元/次', tags: ['洗车'] },
  'ofaw-wax': { label: '打蜡镀晶', priceMin: 200, priceMax: 800, unit: '元/次', tags: ['美容'] },
  'ofaw-interior': { label: '内饰清洗', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['内饰'] },
  'ofaf-window': { label: '车窗贴膜', priceMin: 300, priceMax: 1500, unit: '元/套', tags: ['贴膜'] },
  'ofaf-body': { label: '改色膜', priceMin: 2000, priceMax: 8000, unit: '元/套', tags: ['改色'] },
  'ofaf-ppf': { label: '车衣PPF', priceMin: 3000, priceMax: 15000, unit: '元/套', tags: ['车衣'] },
  'ofar-oil': { label: '换机油保养', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['保养'] },
  'ofar-tire': { label: '轮胎/动平衡', priceMin: 50, priceMax: 200, unit: '元/条', tags: ['轮胎'] },
  'ofar-brake': { label: '刹车系统维修', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['维修'] },
  'ofar-engine': { label: '发动机维修', priceMin: 500, priceMax: 3000, unit: '元/次', tags: ['维修'] },
  'ofat-jump': { label: '搭电救援', priceMin: 50, priceMax: 100, unit: '元/次', tags: ['救援'] },
  'ofat-tow': { label: '拖车救援', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['救援'] },
  'ofat-tire': { label: '换备胎', priceMin: 30, priceMax: 80, unit: '元/次', tags: ['救援'] },
  'ofat-fuel': { label: '送油服务', priceMin: 50, priceMax: 150, unit: '元/次', tags: ['救援'] },
  'ofa-charge': { label: '充电桩安装', priceMin: 500, priceMax: 2000, unit: '元/台', tags: ['充电桩'] },
  'ofac-drunk': { label: '酒后代驾', priceMin: 30, priceMax: 100, unit: '元/次', tags: ['代驾'] },
  'ofac-practice': { label: '陪练', priceMin: 50, priceMax: 150, unit: '元/小时', tags: ['陪练'] },
  'ofac-long': { label: '长途代驾', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['代驾'] },
  'ofa-inspect': { label: '年检代办', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['年检'] },

  'ofe-inspect': { label: '验房量房', priceMin: 200, priceMax: 500, unit: '元/次', tags: ['验房'] },
  'ofe-cleanout': { label: '退租清扫', priceMin: 200, priceMax: 500, unit: '元/次', tags: ['退租'] },
  'ofe-moth': { label: '除虫白蚁', priceMin: 200, priceMax: 800, unit: '元/次', tags: ['除虫'] },
  'ofe-air': { label: '除甲醛', priceMin: 500, priceMax: 2000, unit: '元/次', tags: ['甲醛'] },
  'ofe-hosting': { label: '民宿代运营', priceMin: 1000, priceMax: 5000, unit: '元/月', tags: ['民宿'] },

  'ofevw-plan': { label: '婚礼策划', priceMin: 8000, priceMax: 80000, unit: '元/场', tags: ['婚礼'] },
  'ofevw-photo': { label: '婚礼跟拍', priceMin: 2000, priceMax: 8000, unit: '元/场', tags: ['婚礼'] },
  'ofevw-makeup': { label: '新娘跟妆', priceMin: 800, priceMax: 3000, unit: '元/次', tags: ['婚礼'] },
  'ofevw-host': { label: '婚礼司仪', priceMin: 1000, priceMax: 5000, unit: '元/场', tags: ['婚礼'] },
  'ofevw-dress': { label: '婚纱租赁', priceMin: 500, priceMax: 3000, unit: '元/件', tags: ['婚礼'] },
  'ofevc-annual': { label: '企业年会策划', priceMin: 10000, priceMax: 100000, unit: '元/场', tags: ['企业'] },
  'ofevc-team': { label: '团建活动', priceMin: 100, priceMax: 500, unit: '元/人', tags: ['企业'] },
  'ofs-abroad': { label: '留学规划', priceMin: 3000, priceMax: 20000, unit: '元/次', tags: ['留学'] },
  'ofevc-exhibit': { label: '展台搭建', priceMin: 10000, priceMax: 100000, unit: '元/场', tags: ['企业'] },
  'ofev-photo': { label: '活动摄影', priceMin: 500, priceMax: 3000, unit: '元/场', tags: ['摄影'] },
  'ofevm-wedding': { label: '新娘妆', priceMin: 500, priceMax: 2000, unit: '元/次', tags: ['美妆'] },
  'ofevm-stage': { label: '舞台妆', priceMin: 200, priceMax: 800, unit: '元/次', tags: ['美妆'] },
  'ofevm-semi': { label: '半永久纹绣', priceMin: 1000, priceMax: 5000, unit: '元/次', tags: ['美业'] },

  'ofpb-home': { label: '上门喂养', priceMin: 30, priceMax: 80, unit: '元/次', tags: ['宠物'] },
  'ofpb-shop': { label: '宠物店寄养', priceMin: 30, priceMax: 100, unit: '元/天', tags: ['宠物'] },
  'ofpb-cat': { label: '猫咪专护', priceMin: 40, priceMax: 120, unit: '元/天', tags: ['宠物'] },
  'ofpw-30min': { label: '遛狗30分钟', priceMin: 20, priceMax: 40, unit: '元/次', tags: ['遛狗'] },
  'ofpw-1h': { label: '遛狗1小时', priceMin: 30, priceMax: 60, unit: '元/次', tags: ['遛狗'] },
  'ofpt-basic': { label: '训犬基础服从', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['训犬'] },
  'ofpt-behave': { label: '训犬行为纠正', priceMin: 150, priceMax: 400, unit: '元/次', tags: ['训犬'] },
  'ofp-groom': { label: '宠物美容', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['宠物'] },
  'ofp-vet': { label: '宠物医疗协助', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['宠物'] },
  'ofpp-garden': { label: '庭院养护', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['园艺'] },
  'ofpp-aquarium': { label: '鱼缸维护', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['鱼缸'] },
  'ofpp-lawn': { label: '草坪修剪', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['园艺'] },

  'oftg-city': { label: '城市向导', priceMin: 50, priceMax: 200, unit: '元/小时', tags: ['旅行'] },
  'oftg-study': { label: '研学陪同', priceMin: 50, priceMax: 200, unit: '元/小时', tags: ['研学'] },
  'oftg-food': { label: '美食向导', priceMin: 50, priceMax: 200, unit: '元/小时', tags: ['向导'] },
  'oft-car': { label: '包车接送', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['包车'] },
  'ofts-beginner': { label: '滑雪初级教练', priceMin: 200, priceMax: 500, unit: '元/小时', tags: ['滑雪'] },
  'ofts-intermediate': { label: '滑雪中级教练', priceMin: 300, priceMax: 800, unit: '元/小时', tags: ['滑雪'] },
  'ofts-advanced': { label: '滑雪高级教练', priceMin: 500, priceMax: 1500, unit: '元/小时', tags: ['滑雪'] },
  'oft-dive': { label: '潜水体验', priceMin: 200, priceMax: 800, unit: '元/次', tags: ['潜水'] },
  'oft-climb': { label: '攀岩保护', priceMin: 100, priceMax: 400, unit: '元/次', tags: ['攀岩'] },
  'oft-camp': { label: '露营搭建', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['露营'] },

  'ofs-abroad': { label: '留学规划', priceMin: 2000, priceMax: 10000, unit: '元/次', tags: ['留学'] },
  'ofs-visa': { label: '签证办理', priceMin: 200, priceMax: 1000, unit: '元/次', tags: ['签证'] },
  'ofs-interview': { label: '面试辅导', priceMin: 200, priceMax: 800, unit: '元/次', tags: ['面试'] },
  'ofs-portfolio': { label: '作品集指导', priceMin: 500, priceMax: 3000, unit: '元/次', tags: ['作品集'] },

  'off-machine': { label: '农机作业', priceMin: 200, priceMax: 1000, unit: '元/亩', tags: ['农机'] },
  'off-green': { label: '大棚灌溉改造', priceMin: 500, priceMax: 5000, unit: '元/次', tags: ['农业'] },
  'off-cold': { label: '冷库维保', priceMin: 300, priceMax: 2000, unit: '元/次', tags: ['冷库'] },
  'off-certify': { label: '有机认证', priceMin: 2000, priceMax: 10000, unit: '元/次', tags: ['认证'] },

  'ofbn-gel': { label: '美甲甲油胶', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['美甲'] },
  'ofbn-art': { label: '美甲款式', priceMin: 80, priceMax: 300, unit: '元/次', tags: ['美甲'] },
  'ofbn-foot': { label: '足部护理', priceMin: 60, priceMax: 200, unit: '元/次', tags: ['美甲'] },
  'ofbs-clean': { label: '皮肤深层清洁', priceMin: 100, priceMax: 300, unit: '元/次', tags: ['美容'] },
  'ofbs-acne': { label: '祛痘管理', priceMin: 100, priceMax: 400, unit: '元/次', tags: ['美容'] },
  'ofbs-anti': { label: '抗衰管理', priceMin: 200, priceMax: 800, unit: '元/次', tags: ['美容'] },
  'ofb-hair': { label: '美发造型', priceMin: 50, priceMax: 300, unit: '元/次', tags: ['美发'] },
  'ofb-tattoo': { label: '纹绣纹身', priceMin: 500, priceMax: 3000, unit: '元/次', tags: ['纹身'] },
  'ofb-eyelash': { label: '嫁接睫毛', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['美睫'] },

  'ofm-labor': { label: '力工搬运', priceMin: 50, priceMax: 200, unit: '元/小时', tags: ['搬运'] },
  'ofm-cold': { label: '冷链短驳', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['冷链'] },
  'ofm-waste': { label: '垃圾清运', priceMin: 100, priceMax: 500, unit: '元/车', tags: ['清运'] },

  'of-cook': { label: '餐饮烘焙上门', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['餐饮'] },
  'of-lang': { label: '线下口译', priceMin: 800, priceMax: 3000, unit: '元/天', tags: ['翻译'] },

  // ========== 线上教育/内容/电商等（精简）==========
  'olele-ielts': { label: '雅思辅导', priceMin: 100, priceMax: 400, unit: '元/小时', tags: ['英语'] },
  'olele-toefl': { label: '托福辅导', priceMin: 100, priceMax: 400, unit: '元/小时', tags: ['英语'] },
  'olele-speaking': { label: '英语口语陪练', priceMin: 50, priceMax: 200, unit: '元/小时', tags: ['英语'] },
  'olele-writing': { label: '英语写作批改', priceMin: 30, priceMax: 100, unit: '元/篇', tags: ['英语'] },
  'olelj-n1': { label: '日语N1辅导', priceMin: 80, priceMax: 300, unit: '元/小时', tags: ['日语'] },
  'olelj-n2': { label: '日语N2辅导', priceMin: 60, priceMax: 200, unit: '元/小时', tags: ['日语'] },
  'olelj-speaking': { label: '日语口语陪练', priceMin: 50, priceMax: 150, unit: '元/小时', tags: ['日语'] },
  'olel-kr': { label: '韩语辅导', priceMin: 60, priceMax: 200, unit: '元/小时', tags: ['韩语'] },
  'olel-fr': { label: '法语辅导', priceMin: 80, priceMax: 250, unit: '元/小时', tags: ['法语'] },
  'olel-de': { label: '德语辅导', priceMin: 80, priceMax: 250, unit: '元/小时', tags: ['德语'] },
  'olel-es': { label: '西班牙语辅导', priceMin: 60, priceMax: 200, unit: '元/小时', tags: ['西语'] },
  'olel-other': { label: '小语种辅导', priceMin: 50, priceMax: 200, unit: '元/小时', tags: ['小语种'] },
  'olek-math': { label: '数学家教', priceMin: 80, priceMax: 300, unit: '元/小时', tags: ['家教'] },
  'olek-phy': { label: '物理家教', priceMin: 80, priceMax: 300, unit: '元/小时', tags: ['家教'] },
  'olek-chem': { label: '化学家教', priceMin: 80, priceMax: 300, unit: '元/小时', tags: ['家教'] },
  'olek-bio': { label: '生物家教', priceMin: 80, priceMax: 300, unit: '元/小时', tags: ['家教'] },
  'olek-chinese': { label: '语文家教', priceMin: 80, priceMax: 300, unit: '元/小时', tags: ['家教'] },
  'olek-eng': { label: '英语家教', priceMin: 80, priceMax: 300, unit: '元/小时', tags: ['家教'] },
  'olek-gaokao': { label: '高考冲刺辅导', priceMin: 150, priceMax: 500, unit: '元/小时', tags: ['高考'] },
  'olek-yjs': { label: '考研辅导', priceMin: 100, priceMax: 400, unit: '元/小时', tags: ['考研'] },
  'olec-cpa': { label: 'CPA辅导', priceMin: 100, priceMax: 400, unit: '元/小时', tags: ['考证'] },
  'olec-law': { label: '法考辅导', priceMin: 100, priceMax: 400, unit: '元/小时', tags: ['考证'] },
  'olec-med': { label: '医师资格辅导', priceMin: 100, priceMax: 400, unit: '元/小时', tags: ['考证'] },
  'olec-teach': { label: '教资辅导', priceMin: 80, priceMax: 200, unit: '元/小时', tags: ['考证'] },
  'olec-arch': { label: '一建辅导', priceMin: 100, priceMax: 300, unit: '元/小时', tags: ['考证'] },
  'olec-hr': { label: '人力资源管理师', priceMin: 80, priceMax: 200, unit: '元/小时', tags: ['考证'] },
  'olei-coding': { label: '编程入门教学', priceMin: 100, priceMax: 300, unit: '元/小时', tags: ['编程'] },
  'olei-ds': { label: '算法数据结构', priceMin: 150, priceMax: 400, unit: '元/小时', tags: ['算法'] },
  'olei-network': { label: '网络技术教学', priceMin: 100, priceMax: 300, unit: '元/小时', tags: ['网络'] },
  'olei-linux': { label: 'Linux教学', priceMin: 100, priceMax: 300, unit: '元/小时', tags: ['Linux'] },
  'olea-piano': { label: '钢琴线上教学', priceMin: 100, priceMax: 300, unit: '元/小时', tags: ['音乐'] },
  'olea-guitar': { label: '吉他线上教学', priceMin: 80, priceMax: 200, unit: '元/小时', tags: ['音乐'] },
  'olea-dance': { label: '舞蹈线上教学', priceMin: 80, priceMax: 200, unit: '元/小时', tags: ['舞蹈'] },
  'olea-paint': { label: '绘画线上教学', priceMin: 80, priceMax: 200, unit: '元/小时', tags: ['绘画'] },
  'olea-calligraphy': { label: '书法教学', priceMin: 80, priceMax: 200, unit: '元/小时', tags: ['书法'] },
  'ole-fitness': { label: '线上健身指导', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['健身'] },
  'ole-business': { label: '商业课程辅导', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['商业'] },
  'ole-life': { label: '生活技能教学', priceMin: 50, priceMax: 200, unit: '元/次', tags: ['生活'] },

  // 内容创作
  'olcw-article': { label: '文章代写', priceMin: 30, priceMax: 200, unit: '元/篇', tags: ['文案'] },
  'olcw-script': { label: '剧本脚本代写', priceMin: 100, priceMax: 500, unit: '元/篇', tags: ['文案'] },
  'olcw-plan': { label: '活动方案策划', priceMin: 200, priceMax: 1000, unit: '元/份', tags: ['策划'] },
  'olcw-report': { label: '行业研究报告', priceMin: 500, priceMax: 3000, unit: '元/份', tags: ['研究'] },
  'olcc-slogan': { label: '品牌Slogan', priceMin: 100, priceMax: 500, unit: '元/条', tags: ['文案'] },
  'olcc-product': { label: '产品文案撰写', priceMin: 50, priceMax: 200, unit: '元/篇', tags: ['文案'] },
  'olcc-social': { label: '社媒文案', priceMin: 30, priceMax: 150, unit: '元/篇', tags: ['文案'] },
  'olcc-seo': { label: 'SEO文案', priceMin: 20, priceMax: 100, unit: '元/篇', tags: ['SEO'] },
  'olct-doc': { label: '文档翻译', priceMin: 50, priceMax: 200, unit: '元/千字', tags: ['翻译'] },
  'olct-subtitle': { label: '字幕翻译', priceMin: 30, priceMax: 100, unit: '元/分钟', tags: ['翻译'] },
  'olct-website': { label: '网站本地化', priceMin: 500, priceMax: 3000, unit: '元/项目', tags: ['翻译'] },
  'olct-interpret': { label: '线上口译', priceMin: 200, priceMax: 800, unit: '元/小时', tags: ['翻译'] },
  'olcv-ad': { label: '广告配音', priceMin: 200, priceMax: 1000, unit: '元/条', tags: ['配音'] },
  'olcv-anime': { label: '动漫配音', priceMin: 100, priceMax: 500, unit: '元/角色', tags: ['配音'] },
  'olcv-book': { label: '有声书录制', priceMin: 50, priceMax: 200, unit: '元/集', tags: ['配音'] },
  'olcv-asmr': { label: 'ASMR录制', priceMin: 100, priceMax: 500, unit: '元/次', tags: ['配音'] },

  // 技术开发（部分样例）
  'oldvwf-react': { label: 'React前端开发', priceMin: 1000, priceMax: 8000, unit: '元/项目', tags: ['前端'] },
  'oldvwf-vue': { label: 'Vue前端开发', priceMin: 1000, priceMax: 8000, unit: '元/项目', tags: ['前端'] },
  'oldvwf-angular': { label: 'Angular开发', priceMin: 1500, priceMax: 10000, unit: '元/项目', tags: ['前端'] },
  'oldvwf-next': { label: 'Next.js开发', priceMin: 2000, priceMax: 12000, unit: '元/项目', tags: ['前端'] },
  'oldvwf-nuxt': { label: 'Nuxt开发', priceMin: 2000, priceMax: 12000, unit: '元/项目', tags: ['前端'] },
  'oldvwf-svelte': { label: 'Svelte开发', priceMin: 1000, priceMax: 8000, unit: '元/项目', tags: ['前端'] },
  'oldvwf-solid': { label: 'Solid.js开发', priceMin: 1500, priceMax: 8000, unit: '元/项目', tags: ['前端'] },
  'oldvwb-node': { label: 'Node.js后端', priceMin: 1500, priceMax: 10000, unit: '元/项目', tags: ['后端'] },
  'oldvwb-py': { label: 'Python后端', priceMin: 1500, priceMax: 10000, unit: '元/项目', tags: ['后端'] },
  'oldvwb-java': { label: 'Java后端开发', priceMin: 2000, priceMax: 20000, unit: '元/项目', tags: ['后端'] },
  'oldvwb-go': { label: 'Go后端开发', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['后端'] },
  'oldvwb-rust': { label: 'Rust开发', priceMin: 3000, priceMax: 25000, unit: '元/项目', tags: ['后端'] },
  'oldvwb-php': { label: 'PHP开发', priceMin: 1000, priceMax: 8000, unit: '元/项目', tags: ['后端'] },
  'oldvwb-dotnet': { label: '.NET开发', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['后端'] },
  'oldvw-full': { label: '全栈开发', priceMin: 3000, priceMax: 30000, unit: '元/项目', tags: ['全栈'] },
  'oldvwc-wp': { label: 'WordPress建站', priceMin: 500, priceMax: 5000, unit: '元/项目', tags: ['CMS'] },
  'oldvwc-shopify': { label: 'Shopify开发', priceMin: 1000, priceMax: 8000, unit: '元/项目', tags: ['CMS'] },
  'oldvwc-webflow': { label: 'Webflow建站', priceMin: 1000, priceMax: 8000, unit: '元/项目', tags: ['CMS'] },
  'oldvwc-strapi': { label: 'Strapi开发', priceMin: 1500, priceMax: 10000, unit: '元/项目', tags: ['CMS'] },
  'oldvw-ecom': { label: '电商网站开发', priceMin: 3000, priceMax: 20000, unit: '元/项目', tags: ['电商'] },
  'oldvm-wechat': { label: '微信小程序开发', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['小程序'] },
  'oldvm-alipay': { label: '支付宝小程序', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['小程序'] },
  'oldvm-tiktok': { label: '抖音小程序', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['小程序'] },
  'oldvm-uniapp': { label: 'uni-app开发', priceMin: 2000, priceMax: 12000, unit: '元/项目', tags: ['跨端'] },
  'oldvai-swift': { label: 'Swift iOS开发', priceMin: 3000, priceMax: 25000, unit: '元/项目', tags: ['iOS'] },
  'oldvai-oc': { label: 'OC iOS开发', priceMin: 3000, priceMax: 20000, unit: '元/项目', tags: ['iOS'] },
  'oldvaa-kotlin': { label: 'Kotlin安卓开发', priceMin: 3000, priceMax: 20000, unit: '元/项目', tags: ['安卓'] },
  'oldvaa-java': { label: 'Java安卓开发', priceMin: 3000, priceMax: 20000, unit: '元/项目', tags: ['安卓'] },
  'oldva-flutter': { label: 'Flutter开发', priceMin: 3000, priceMax: 20000, unit: '元/项目', tags: ['Flutter'] },
  'oldva-rn': { label: 'React Native开发', priceMin: 3000, priceMax: 20000, unit: '元/项目', tags: ['RN'] },
  'oldva-electron': { label: 'Electron桌面端', priceMin: 3000, priceMax: 20000, unit: '元/项目', tags: ['桌面'] },
  'oldva-rest': { label: 'REST API开发', priceMin: 1000, priceMax: 8000, unit: '元/项目', tags: ['API'] },
  'oldva-graphql': { label: 'GraphQL开发', priceMin: 1500, priceMax: 10000, unit: '元/项目', tags: ['API'] },
  'oldva-micro': { label: '微服务开发', priceMin: 5000, priceMax: 30000, unit: '元/项目', tags: ['架构'] },
  'oldva-db': { label: '数据库设计', priceMin: 500, priceMax: 5000, unit: '元/项目', tags: ['数据库'] },
  'oldva-auth': { label: '认证权限系统', priceMin: 1000, priceMax: 8000, unit: '元/项目', tags: ['安全'] },
  'oldvd-bi': { label: 'BI报表开发', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['数据'] },
  'oldvd-etl': { label: 'ETL数据清洗', priceMin: 1000, priceMax: 8000, unit: '元/项目', tags: ['数据'] },
  'oldvd-ml': { label: '机器学习项目', priceMin: 3000, priceMax: 30000, unit: '元/项目', tags: ['AI'] },
  'oldvd-nlp': { label: 'NLP自然语言', priceMin: 2000, priceMax: 20000, unit: '元/项目', tags: ['AI'] },
  'oldvd-cv': { label: '计算机视觉', priceMin: 3000, priceMax: 30000, unit: '元/项目', tags: ['AI'] },
  'oldvdl-finetune': { label: '模型微调', priceMin: 2000, priceMax: 20000, unit: '元/项目', tags: ['AI'] },
  'oldvdl-rag': { label: 'RAG知识库', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['AI'] },
  'oldvdl-agent': { label: 'AI Agent开发', priceMin: 3000, priceMax: 30000, unit: '元/项目', tags: ['AI'] },
  'oldvdl-prompt': { label: 'Prompt工程', priceMin: 500, priceMax: 5000, unit: '元/项目', tags: ['AI'] },
  'oldvd-scrape': { label: '爬虫采集', priceMin: 500, priceMax: 5000, unit: '元/项目', tags: ['数据'] },
  'oldvc-deploy': { label: '部署上线', priceMin: 200, priceMax: 2000, unit: '元/次', tags: ['运维'] },
  'oldvc-cicd': { label: 'CI/CD搭建', priceMin: 500, priceMax: 3000, unit: '元/次', tags: ['运维'] },
  'oldvc-k8s': { label: 'K8s容器化', priceMin: 1000, priceMax: 8000, unit: '元/次', tags: ['运维'] },
  'oldvc-monitor': { label: '监控告警搭建', priceMin: 500, priceMax: 3000, unit: '元/次', tags: ['运维'] },
  'oldvc-dbops': { label: '数据库运维', priceMin: 500, priceMax: 3000, unit: '元/次', tags: ['运维'] },
  'oldvs-pen': { label: '渗透测试', priceMin: 1000, priceMax: 10000, unit: '元/次', tags: ['安全'] },
  'oldvs-audit': { label: '代码审计', priceMin: 500, priceMax: 5000, unit: '元/次', tags: ['安全'] },
  'oldvs-compliance': { label: '等保合规', priceMin: 2000, priceMax: 20000, unit: '元/次', tags: ['安全'] },
  'oldvs-recovery': { label: '数据恢复', priceMin: 200, priceMax: 2000, unit: '元/次', tags: ['安全'] },
  'oldvg-unity': { label: 'Unity开发', priceMin: 3000, priceMax: 20000, unit: '元/项目', tags: ['游戏'] },
  'oldvg-ue': { label: 'Unreal开发', priceMin: 5000, priceMax: 30000, unit: '元/项目', tags: ['游戏'] },
  'oldvg-cocos': { label: 'Cocos开发', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['游戏'] },
  'oldvg-webgame': { label: 'H5小游戏', priceMin: 1000, priceMax: 10000, unit: '元/项目', tags: ['游戏'] },
  'oldvb-contract': { label: '智能合约开发', priceMin: 2000, priceMax: 20000, unit: '元/项目', tags: ['Web3'] },
  'oldvb-dapp': { label: 'DApp开发', priceMin: 5000, priceMax: 50000, unit: '元/项目', tags: ['Web3'] },
  'oldvb-defi': { label: 'DeFi开发', priceMin: 10000, priceMax: 80000, unit: '元/项目', tags: ['Web3'] },
  'oldvb-nft': { label: 'NFT开发', priceMin: 3000, priceMax: 30000, unit: '元/项目', tags: ['Web3'] },
  'oldvi-mcu': { label: '单片机开发', priceMin: 1000, priceMax: 10000, unit: '元/项目', tags: ['嵌入式'] },
  'oldvi-linux': { label: 'Linux驱动', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['嵌入式'] },
  'oldvi-pcb': { label: 'PCB设计', priceMin: 500, priceMax: 5000, unit: '元/项目', tags: ['硬件'] },
  'oldvi-comm': { label: '通信协议开发', priceMin: 2000, priceMax: 15000, unit: '元/项目', tags: ['嵌入式'] },

  // 电商
  'olecs-tb': { label: '淘宝店铺装修', priceMin: 200, priceMax: 2000, unit: '元/套', tags: ['电商'] },
  'olecs-jd': { label: '京东店铺装修', priceMin: 200, priceMax: 2000, unit: '元/套', tags: ['电商'] },
  'olecs-pdd': { label: '拼多多装修', priceMin: 200, priceMax: 1500, unit: '元/套', tags: ['电商'] },
  'olecs-dy': { label: '抖音店铺装修', priceMin: 200, priceMax: 2000, unit: '元/套', tags: ['电商'] },
  'olecs-xhs': { label: '小红书店铺装修', priceMin: 200, priceMax: 1500, unit: '元/套', tags: ['电商'] },
  'olecl-host': { label: '直播主播', priceMin: 50, priceMax: 500, unit: '元/小时', tags: ['直播'] },
  'olecl-script': { label: '直播脚本撰写', priceMin: 100, priceMax: 500, unit: '元/份', tags: ['直播'] },
  'olecl-operation': { label: '直播运营', priceMin: 200, priceMax: 1000, unit: '元/天', tags: ['直播'] },
  'olecs-baidu': { label: '百度SEM投放', priceMin: 500, priceMax: 5000, unit: '元/月', tags: ['推广'] },
  'olecs-toutiao': { label: '头条信息流', priceMin: 500, priceMax: 5000, unit: '元/月', tags: ['推广'] },
  'olecs-wechat': { label: '微信广告投放', priceMin: 500, priceMax: 5000, unit: '元/月', tags: ['推广'] },
  'olec-private': { label: '私域运营', priceMin: 1000, priceMax: 5000, unit: '元/月', tags: ['运营'] },
  'olecx-amz': { label: '亚马逊运营', priceMin: 2000, priceMax: 10000, unit: '元/月', tags: ['跨境'] },
  'olecx-shopee': { label: 'Shopee运营', priceMin: 1500, priceMax: 8000, unit: '元/月', tags: ['跨境'] },
  'olecx-listing': { label: 'Listing优化', priceMin: 200, priceMax: 1000, unit: '元/条', tags: ['跨境'] },
  'olecx-ad': { label: '跨境广告投放', priceMin: 1000, priceMax: 8000, unit: '元/月', tags: ['跨境'] },
  'olec-customer': { label: '客服外包', priceMin: 2000, priceMax: 5000, unit: '元/月', tags: ['客服'] },

  // 专业服务
  'olpl-contract': { label: '合同审查', priceMin: 200, priceMax: 1000, unit: '元/份', tags: ['法律'] },
  'olpl-labor': { label: '劳动纠纷咨询', priceMin: 300, priceMax: 1500, unit: '元/次', tags: ['法律'] },
  'olpl-corporate': { label: '公司法律顾问', priceMin: 2000, priceMax: 10000, unit: '元/月', tags: ['法律'] },
  'olpl-litigation': { label: '诉讼文书代写', priceMin: 500, priceMax: 3000, unit: '元/份', tags: ['法律'] },
  'olpf-book': { label: '代理记账', priceMin: 200, priceMax: 800, unit: '元/月', tags: ['财税'] },
  'olpf-tax': { label: '税务筹划', priceMin: 500, priceMax: 5000, unit: '元/次', tags: ['财税'] },
  'olpf-audit': { label: '审计报告', priceMin: 2000, priceMax: 10000, unit: '元/份', tags: ['财税'] },
  'olpf-payroll': { label: '薪资外包', priceMin: 500, priceMax: 2000, unit: '元/月', tags: ['HR'] },
  'olp-hr': { label: '人力资源咨询', priceMin: 500, priceMax: 3000, unit: '元/次', tags: ['HR'] },
  'olps-bp': { label: '商业计划书', priceMin: 1000, priceMax: 8000, unit: '元/份', tags: ['咨询'] },
  'olps-market': { label: '市场调研报告', priceMin: 2000, priceMax: 10000, unit: '元/份', tags: ['咨询'] },
  'olps-consult': { label: '管理咨询', priceMin: 2000, priceMax: 20000, unit: '元/次', tags: ['咨询'] },
  'olpip-tm': { label: '商标注册', priceMin: 500, priceMax: 2000, unit: '元/类', tags: ['知识产权'] },
  'olpip-patent': { label: '专利申请', priceMin: 3000, priceMax: 15000, unit: '元/件', tags: ['知识产权'] },
  'olpip-copy': { label: '著作权登记', priceMin: 300, priceMax: 1000, unit: '元/件', tags: ['知识产权'] },
  'olp-audit': { label: '体系认证辅导', priceMin: 2000, priceMax: 20000, unit: '元/次', tags: ['认证'] },
}

// ============================================================
// 需求生成
// ============================================================
function randRange(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) / 10) * 10
}

function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateDemands(
  leafId: string,
  def: LeafDef,
  count: number,
  userIds: string[],
): any[] {
  const isOffline = leafId.startsWith('of')
  const demands: any[] = []
  const urgentWords = ['急需', '急求', '本周需要', '尽快', '时间紧']
  const normalWords = ['寻找', '需要', '求', '想找', '诚找', '希望']

  const templates = [
    `${randPick(normalWords)}${def.label}服务，预算${def.priceMin}-${def.priceMax}${def.unit}，${randPick(['有经验者优先', '可长期合作', '价格可议', '最好能马上开始', '需要本周完成'])}。`,
    `${randPick(urgentWords)}${def.label}！${randPick(['预算', '心理价位', '期望价格'])}${def.priceMin}-${def.priceMax}${def.unit}，${randPick(['请带报价联系', '有经验优先', '需要案例参考', '可面议'])}。`,
    `求${def.label}，${randPick(['价格好商量', '长期需求', '每月固定', '量大从优'])}，${def.priceMin}-${def.priceMax}${def.unit}以内。`,
    `需要${def.label}服务，要求${randPick(['专业负责', '经验丰富', '细心耐心', '效率高', '服务好'])}，${randPick(['预算范围内可谈', '优秀者可加价', '长期合作优先'])}。`,
    `${randPick(['诚招', '寻觅', '找一位'])}${def.label}的师傅，${randPick(['价格', '预算', '费用'])}${def.priceMin}-${def.priceMax}${def.unit}，${randPick(['期待长期合作', '急急急！', '希望尽快到位', '需要本周落实'])}。`,
  ]

  for (let i = 0; i < count; i++) {
    const price = randRange(def.priceMin, def.priceMax)
    demands.push({
      userId: userIds[Math.floor(Math.random() * userIds.length)],
      title: def.label,
      description: templates[Math.floor(Math.random() * templates.length)],
      minPrice: price,
      category: leafId,
      taxonomyLeafId: leafId,
      serviceType: isOffline ? 'OFFLINE' : 'ONLINE',
      expireAt: new Date(Date.now() + (15 + Math.floor(Math.random() * 45)) * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      isExample: true,
      isPublic: true,
      applicantCount: Math.floor(Math.random() * 20),
      mediaUrls: [],
    })
  }

  return demands
}

// ============================================================
// 主入口
// ============================================================
// 种子用户数据
const SEED_USERS = [
  { id: 'seed-u01', phone: '13900000001', nickname: '李明', avatar: '/uploads/avatars/avatar_01.png', coverIdx: 0 },
  { id: 'seed-u02', phone: '13900000002', nickname: '王芳', avatar: '/uploads/avatars/avatar_02.png', coverIdx: 1 },
  { id: 'seed-u03', phone: '13900000003', nickname: '张伟', avatar: '/uploads/avatars/avatar_03.png', coverIdx: 2 },
  { id: 'seed-u04', phone: '13900000004', nickname: '刘洋', avatar: '/uploads/avatars/avatar_04.png', coverIdx: 3 },
  { id: 'seed-u05', phone: '13900000005', nickname: '陈静', avatar: '/uploads/avatars/avatar_05.png', coverIdx: 4 },
  { id: 'seed-u06', phone: '13900000006', nickname: '赵磊', avatar: '/uploads/avatars/avatar_06.png', coverIdx: 5 },
  { id: 'seed-u07', phone: '13900000007', nickname: '黄丽', avatar: '/uploads/avatars/avatar_07.png', coverIdx: 6 },
  { id: 'seed-u08', phone: '13900000008', nickname: '周杰', avatar: '/uploads/avatars/avatar_08.png', coverIdx: 7 },
  { id: 'seed-u09', phone: '13900000009', nickname: '吴敏', avatar: '/uploads/avatars/avatar_09.png', coverIdx: 8 },
  { id: 'seed-u10', phone: '13900000010', nickname: '郑浩', avatar: '/uploads/avatars/avatar_10.png', coverIdx: 9 },
  { id: 'seed-u11', phone: '13900000011', nickname: '孙悦', avatar: '/uploads/avatars/avatar_11.png', coverIdx: 10 },
  { id: 'seed-u12', phone: '13900000012', nickname: '钱峰', avatar: '/uploads/avatars/avatar_12.png', coverIdx: 11 },
  { id: 'seed-u13', phone: '13900000013', nickname: '林涛', avatar: '/uploads/avatars/avatar_13.png', coverIdx: 12 },
  { id: 'seed-u14', phone: '13900000014', nickname: '何雪', avatar: '/uploads/avatars/avatar_14.png', coverIdx: 13 },
  { id: 'seed-u15', phone: '13900000015', nickname: '马丁', avatar: '/uploads/avatars/avatar_15.png', coverIdx: 0 },
  { id: 'seed-u16', phone: '13900000016', nickname: '高远', avatar: '/uploads/avatars/avatar_16.png', coverIdx: 1 },
  { id: 'seed-u17', phone: '13900000017', nickname: '梁欣', avatar: '/uploads/avatars/avatar_17.png', coverIdx: 2 },
  { id: 'seed-u18', phone: '13900000018', nickname: '宋阳', avatar: '/uploads/avatars/avatar_18.png', coverIdx: 3 },
  { id: 'seed-u19', phone: '13900000019', nickname: '唐娜', avatar: '/uploads/avatars/avatar_19.png', coverIdx: 4 },
  { id: 'seed-u20', phone: '13900000020', nickname: '韩冰', avatar: '/uploads/avatars/avatar_20.png', coverIdx: 5 },
  { id: 'seed-u21', phone: '13900000021', nickname: '曹宇', avatar: '/uploads/avatars/avatar_01.png', coverIdx: 6 },
  { id: 'seed-u22', phone: '13900000022', nickname: '邓丽', avatar: '/uploads/avatars/avatar_02.png', coverIdx: 7 },
  { id: 'seed-u23', phone: '13900000023', nickname: '许强', avatar: '/uploads/avatars/avatar_03.png', coverIdx: 8 },
  { id: 'seed-u24', phone: '13900000024', nickname: '沈洁', avatar: '/uploads/avatars/avatar_04.png', coverIdx: 9 },
  { id: 'seed-u25', phone: '13900000025', nickname: '潘龙', avatar: '/uploads/avatars/avatar_05.png', coverIdx: 10 },
  { id: 'seed-u26', phone: '13900000026', nickname: '叶舟', avatar: '/uploads/avatars/avatar_06.png', coverIdx: 11 },
  { id: 'seed-u27', phone: '13900000027', nickname: '田甜', avatar: '/uploads/avatars/avatar_07.png', coverIdx: 12 },
  { id: 'seed-u28', phone: '13900000028', nickname: '侯晨', avatar: '/uploads/avatars/avatar_08.png', coverIdx: 13 },
  { id: 'seed-u29', phone: '13900000029', nickname: '武磊', avatar: '/uploads/avatars/avatar_09.png', coverIdx: 0 },
  { id: 'seed-u30', phone: '13900000030', nickname: '万雪', avatar: '/uploads/avatars/avatar_10.png', coverIdx: 1 },
  { id: 'seed-u31', phone: '13900000031', nickname: '常远', avatar: '/uploads/avatars/avatar_11.png', coverIdx: 2 },
  { id: 'seed-u32', phone: '13900000032', nickname: '姜涛', avatar: '/uploads/avatars/avatar_12.png', coverIdx: 3 },
  { id: 'seed-u33', phone: '13900000033', nickname: '崔娜', avatar: '/uploads/avatars/avatar_13.png', coverIdx: 4 },
  { id: 'seed-u34', phone: '13900000034', nickname: '谭飞', avatar: '/uploads/avatars/avatar_14.png', coverIdx: 5 },
  { id: 'seed-u35', phone: '13900000035', nickname: '汪峰', avatar: '/uploads/avatars/avatar_15.png', coverIdx: 6 },
  { id: 'seed-u36', phone: '13900000036', nickname: '乔琳', avatar: '/uploads/avatars/avatar_16.png', coverIdx: 7 },
  { id: 'seed-u37', phone: '13900000037', nickname: '龚平', avatar: '/uploads/avatars/avatar_17.png', coverIdx: 8 },
  { id: 'seed-u38', phone: '13900000038', nickname: '邱慧', avatar: '/uploads/avatars/avatar_18.png', coverIdx: 9 },
  { id: 'seed-u39', phone: '13900000039', nickname: '陆飞', avatar: '/uploads/avatars/avatar_19.png', coverIdx: 10 },
  { id: 'seed-u40', phone: '13900000040', nickname: '秦雨', avatar: '/uploads/avatars/avatar_20.png', coverIdx: 11 },
]

const COVER_PRESETS = [
  '/user-cover-presets/10001.jpg', '/user-cover-presets/10002.jpg', '/user-cover-presets/10003.jpg',
  '/user-cover-presets/10004.jpg', '/user-cover-presets/10005.jpg', '/user-cover-presets/10006.jpg',
  '/user-cover-presets/10007.jpg', '/user-cover-presets/10008.jpg', '/user-cover-presets/10009.jpg',
  '/user-cover-presets/10010.jpg', '/user-cover-presets/10011.jpeg', '/user-cover-presets/10012.png',
  '/user-cover-presets/10013.png', '/user-cover-presets/10014.png',
]

// 给每个种子用户分配一张封面图
function assignCover(userId: string): string {
  let h = 2166136261
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return COVER_PRESETS[Math.abs(h) % COVER_PRESETS.length]
}

async function main() {
  // 创建种子用户
  console.log('正在创建/更新种子用户...')
  const allUserIds: string[] = []
  // 清除旧的种子用户（保留 seed-system 和真实用户）
  await prisma.demand.deleteMany({ where: { userId: { startsWith: 'seed-u' } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: 'seed-u' } } })
  for (const u of SEED_USERS) {
    const user = await prisma.user.create({
      data: {
        id: u.id,
        phone: u.phone,
        nickname: u.nickname,
        avatarUrl: u.avatar,
        coverUrl: assignCover(u.id),
        passwordHash: '',
        certificationLevel: 'NONE',
      },
    })
    allUserIds.push(user.id)
  }
  // 保留旧的 seed-system 用于未分配的需求
  const sysUser = await prisma.user.upsert({
    where: { id: 'seed-system' },
    update: {},
    create: {
      id: 'seed-system',
      phone: '10000000000',
      nickname: '系统',
      passwordHash: '',
      certificationLevel: 'NONE',
    },
  })
  console.log(`${allUserIds.length} 个种子用户就绪`)

  console.log('正在清除旧种子需求...')
  const deleted = await prisma.demand.deleteMany({ where: { isExample: true } })
  console.log(`已清除 ${deleted.count} 条`)

  const leafIds = Object.keys(LEAVES)
  console.log(`共 ${leafIds.length} 个叶子节点`)

  let totalCreated = 0
  const BATCH = 500

  for (const leafId of leafIds) {
    const def = LEAVES[leafId]
    if (!def) { console.warn(`  ⚠ 跳过未定义的节点: ${leafId}`); continue }

    // 代表性节点多生成一些（首页、热门分类）
    const isPopular = leafId.startsWith('olgb') || leafId.startsWith('olgc') || leafId.startsWith('ofhcd') || leafId.startsWith('ofrp') || leafId.startsWith('ofr-phone') || leafId.startsWith('oldvwf') || leafId.startsWith('ole')
    const count = isPopular
      ? 60 + Math.floor(Math.random() * 140) // 60-200
      : 20 + Math.floor(Math.random() * 80)   // 20-100

    const demands = generateDemands(leafId, def, count, allUserIds)

    for (let i = 0; i < demands.length; i += BATCH) {
      await prisma.demand.createMany({ data: demands.slice(i, i + BATCH) })
    }

    totalCreated += demands.length
    process.stdout.write(`  ${def.label}: ${demands.length}条 ✓\n`)
  }

  console.log(`\n✅ 生成完毕！共 ${totalCreated} 条种子需求`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
