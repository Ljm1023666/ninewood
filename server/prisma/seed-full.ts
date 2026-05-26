/**
 * 完整种子数据 — 200 真实用户 + 1000 真实需求 + 关联数据
 * 用法: npx tsx prisma/seed-full.ts
 * 幂等：已存在的手机号自动跳过
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const PWD = bcrypt.hashSync('1', 10)

// ═══ 姓名生成 ═══
const SURNAMES = ['张','李','王','赵','陈','刘','黄','周','吴','郑','冯','孙','褚','卫','蒋','沈','韩','杨','朱','秦','许','何','吕','施','孔','曹','严','华','金','魏','陶','姜','戚','谢','邹','柏','窦','章','苏','潘','葛','范','彭','鲁','韦','马','苗','花','方','俞','任','袁','柳','鲍','史','唐','费','廉','薛','雷','贺','倪','汤','殷','罗','郝','邬','安','常','乐','于','时','傅','皮','齐','康','伍','余','元','顾','孟','平','黄','穆','萧','尹','姚','邵','汪','毛','狄','米','贝','明','臧','计','成','戴','宋','茅','熊','纪','舒','屈','项','祝','董','梁','杜','阮','蓝','闵','席','季','麻','贾','路','娄','江','童','颜','郭','梅','盛','林','钟','徐','邱','骆','高','夏','蔡','田','樊','胡','凌','霍','万','卢','柯','管','房','丁','邓','洪','包','左','石','崔','吉','龚','程','邢','裴','陆','荣','翁','荀','羊','惠','甄','封','芮','储','靳','井','段','富','巫','焦','巴','弓','车','侯','伊','宁','仇','甘','厉','戎','祖','武','符','刘','景','詹','龙','叶','黎','白','赖','卓','谭','温','庄','晏','阎','廖','翟']

const GIVEN_CHARS = ['伟','芳','娜','敏','静','丽','强','磊','军','洋','勇','艳','杰','涛','明','超','秀','霞','平','刚','桂','文','华','飞','波','鹏','斌','宇','浩','然','博','毅','恒','睿','峰','林','旭','晨','轩','铭','哲','涵','琪','萱','怡','悦','瑶','欣','彤','曦']

const CITY_SUFFIXES = ['师傅','老师','同学','设计师','教练','顾问','专家','团队','先生','女士','学长','学姐','君','酱','哥','姐','妹','叔','姨','达人','玩家','职人','老司机','能手','大师']
const PROF_SUFFIXES = ['水电','设计','编程','摄影','保洁','维修','家教','翻译','健身','瑜伽','美发','化妆','厨师','司机','律师','会计','花艺','宠物','钢琴','书法','围棋','驾校','导游','家电','装修','跑腿','代驾','家政','月嫂','康复','按摩','针灸','营养','教练','声乐','舞蹈','绘画','陶艺','木工','皮具']

// ═══ 城市分布 (共 200 人) ═══
const CITY_POOL: { code: string; name: string; count: number }[] = [
  { code: '110000', name: '北京', count: 18 },
  { code: '310000', name: '上海', count: 14 },
  { code: '440100', name: '广州', count: 14 },
  { code: '440300', name: '深圳', count: 14 },
  { code: '330100', name: '杭州', count: 12 },
  { code: '510100', name: '成都', count: 12 },
  { code: '500000', name: '重庆', count: 10 },
  { code: '420100', name: '武汉', count: 10 },
  { code: '320100', name: '南京', count: 9 },
  { code: '610100', name: '西安', count: 9 },
  { code: '120000', name: '天津', count: 7 },
  { code: '430100', name: '长沙', count: 7 },
  { code: '410100', name: '郑州', count: 7 },
  { code: '370200', name: '青岛', count: 7 },
  { code: '530100', name: '昆明', count: 6 },
  { code: '320500', name: '苏州', count: 6 },
  { code: '350200', name: '厦门', count: 6 },
  { code: '210100', name: '沈阳', count: 6 },
  { code: '230100', name: '哈尔滨', count: 5 },
  { code: '350100', name: '福州', count: 5 },
  { code: '520100', name: '贵阳', count: 4 },
  { code: '460100', name: '海口', count: 4 },
  { code: '640100', name: '银川', count: 3 },
  { code: '630100', name: '西宁', count: 3 },
  { code: '540100', name: '拉萨', count: 2 },
]

const CERT_WEIGHTS = ['NONE','NONE','BASIC','BASIC','BASIC','INTERMEDIATE','INTERMEDIATE','ADVANCED'] as const

// ═══ 标签池 ═══
const TAG_POOL = ['水电维修','家电维修','装修','设计','UI设计','前端开发','后端开发','Python','React','Vue','Go','Java','摄影','摄像','化妆','家政保洁','月嫂','家教','英语','日语','韩语','法语','德语','翻译','会计','代账','法律咨询','健身教练','瑜伽教练','跑腿','外卖配送','快递代取','搬家','货运','代驾','厨师','烹饪','烘焙','咖啡','调酒','按摩','针灸','中医','营养顾问','心理咨询','驾校教练','汽车维修','美容','美发','美甲','纹绣','花艺','园艺','宠物美容','宠物寄养','钢琴','吉他','声乐','舞蹈','绘画','书法','围棋','象棋','游泳','滑雪','潜水','攀岩','武术','太极','陶艺','木工','皮具','手机维修','电脑维修','数据恢复','网络安全','视频剪辑','动画制作','配音','主持','婚礼策划','活动执行','导游','翻译导游']

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min: number, max: number, decimals = 1) { return parseFloat((Math.random() * (max - min) + min).toFixed(decimals)) }
function pickN<T>(arr: readonly T[], n: number): T[] { const s = new Set<T>(); while (s.size < n && s.size < arr.length) s.add(pick(arr)); return [...s] }

function genName() { return pick(SURNAMES) + pick(GIVEN_CHARS) + (Math.random() > 0.5 ? pick(GIVEN_CHARS) : '') }
function genNick(city: string) {
  const name = genName()
  const s = Math.random()
  if (s < 0.35) return name + pick(CITY_SUFFIXES)
  if (s < 0.6) return name + '的' + pick(PROF_SUFFIXES)
  if (s < 0.75) return city + pick(PROF_SUFFIXES) + pick(CITY_SUFFIXES)
  return name
}

// ═══ 需求分类 & 模板 ═══
interface DemandTpl { title: string; desc: string; price: number; cat: string }

const CATEGORIES: { name: string; templates: DemandTpl[] }[] = [
  { name: '家政服务', templates: [
    { title: '全屋深度保洁', desc: '{n}㎡住宅全屋深度清洁，含厨房油烟机拆洗、卫生间除霉、玻璃清洁、地板打蜡，自备专业工具和环保清洁剂', price: 380, cat: '家政服务' },
    { title: '新家开荒保洁', desc: '新装修{n}㎡房屋开荒保洁，清除装修残留、水泥渍、油漆点，含窗框轨道和踢脚线细节', price: 680, cat: '家政服务' },
    { title: '收纳整理全屋', desc: '{n}室收纳整理，含衣柜换季整理、厨房分区、书房归类，需自带收纳盒和标签机', price: 350, cat: '家政服务' },
    { title: '油烟机拆洗', desc: '侧吸/顶吸式油烟机深度拆洗，涡轮叶片浸泡除油，密封圈检查更换，自带清洁剂防护垫', price: 168, cat: '家政服务' },
    { title: '地毯沙发清洗', desc: '客厅羊毛地毯{n}㎡+布艺沙发{n}人位，需高温蒸汽清洗机和专业洗涤剂', price: 280, cat: '家政服务' },
    { title: '擦窗服务全屋', desc: '{n}楼全屋玻璃清洁，双层玻璃内外+窗框纱窗，需专业磁吸擦窗器和安全绳', price: 200, cat: '家政服务' },
    { title: '宠物上门喂养', desc: '出差{n}天需每天上门喂猫铲屎换水，英短{n}只+布偶{n}只，猫粮猫砂已备，需发视频确认', price: 210, cat: '家政服务' },
    { title: '老人陪诊半天', desc: '带{n}岁老人去三甲医院看{科室}，帮忙挂号排队缴费取药，需有陪诊经验和耐心', price: 180, cat: '家政服务' },
    { title: '月子餐制作', desc: '产妇第{n}周，每日上门制作{n}餐月子餐+加餐，懂产后营养搭配和催乳汤谱，食材可代购', price: 400, cat: '家政服务' },
    { title: '空调深度清洗', desc: '家用空调挂机{n}台+柜机{n}台，拆机清洗滤网蒸发器风轮，高温蒸汽杀菌消毒', price: 188, cat: '家政服务' },
  ]},
  { name: '装修维修', templates: [
    { title: '卫生间翻新改造', desc: '{n}㎡卫生间整体翻新，砸旧瓷砖+防水重做+贴新砖+换洁具，工期{n}天，需出效果图', price: 8500, cat: '装修维修' },
    { title: '厨房橱柜定制', desc: '厨房{n}延米U型/L型橱柜定制，多层实木板+石英石台面，含拉篮和水槽安装', price: 12000, cat: '装修维修' },
    { title: '墙面刷新服务', desc: '{n}㎡全屋墙面铲旧皮+批腻子+刷乳胶漆，局部裂缝挂网处理，保护家具地面', price: 3200, cat: '装修维修' },
    { title: '水管漏水维修', desc: '厨房/卫生间墙内水管渗漏检测+破墙修复+管道更换，需带漏水检测仪和热熔机', price: 680, cat: '装修维修' },
    { title: '电路改造升级', desc: '老房全屋电路改造，换粗线径+增加回路+配电箱升级，需持电工证，工期{n}天', price: 4500, cat: '装修维修' },
    { title: '地板铺装', desc: '{n}㎡复合/实木地板铺装，含防潮垫+踢脚线+扣条，需带无尘锯，一天完工', price: 2200, cat: '装修维修' },
    { title: '门窗更换', desc: '断桥铝窗{n}扇+防盗门{n}樘，旧窗拆除+发泡胶密封+外墙防水处理', price: 7800, cat: '装修维修' },
    { title: '吊顶安装', desc: '客厅+餐厅+{n}个卧室石膏板吊顶，含灯槽和筒灯孔预留，轻钢龙骨+9.5mm石膏板', price: 4200, cat: '装修维修' },
    { title: '瓷砖美缝', desc: '{n}㎡瓷砖美缝，环氧彩砂/真瓷胶可选，清缝+吸尘+打胶+压缝，包工包料', price: 850, cat: '装修维修' },
    { title: '屋顶防水补漏', desc: '屋顶/阳台{n}㎡渗漏点检测+SBS卷材防水铺贴+保护层，质保{n}年', price: 3500, cat: '装修维修' },
  ]},
  { name: '教育培训', templates: [
    { title: '小学数学辅导', desc: '{n}年级小学生数学一对一辅导，每周{n}次每次2小时，查漏补缺+奥数培优，需有教师资格证', price: 150, cat: '教育培训' },
    { title: '初中英语冲刺', desc: '初三英语中考冲刺，每周{n}次每次2小时，阅读完形+写作模板+语法梳理', price: 200, cat: '教育培训' },
    { title: '高中物理辅导', desc: '高二物理电磁学专题突破，每周{n}次每次2小时，带典型题精讲和思维导图', price: 250, cat: '教育培训' },
    { title: '雅思口语陪练', desc: '雅思口语Part{n}专项训练，每次{n}小时全英文对话+模仿评分+地道表达纠正', price: 180, cat: '教育培训' },
    { title: '钢琴启蒙教学', desc: '{n}岁儿童/成人零基础钢琴入门，每周{n}次每次45分钟，汤普森/巴斯蒂安教材可选', price: 200, cat: '教育培训' },
    { title: '书法培训', desc: '毛笔/硬笔书法{n}节课，楷书/行书入门到进阶，每周{n}次每次{n}小时，碑林区可上门', price: 150, cat: '教育培训' },
    { title: '游泳私教', desc: '{n}对{n}游泳教学{n}节课包教会，蛙泳/自由泳/仰泳可选，持救生员证+教练证', price: 200, cat: '教育培训' },
    { title: '绘画培训', desc: '素描/水彩/油画入门{n}节课，每周{n}次每次{n}小时，包含画材，零基础友好', price: 180, cat: '教育培训' },
    { title: '驾驶陪练', desc: '科目二/科目三考前陪练{n}小时，自带教练车副刹，考场路线熟悉+扣分点精讲', price: 120, cat: '教育培训' },
    { title: 'python编程入门', desc: 'Python零基础入门{n}节课，从变量循环到爬虫实战，线上腾讯会议+课后作业批改', price: 280, cat: '教育培训' },
  ]},
  { name: '设计创意', templates: [
    { title: 'Logo设计', desc: '公司/品牌Logo设计{n}稿选{n}，含标准制图+VI基础应用+源文件，{n}年设计经验', price: 800, cat: '设计创意' },
    { title: 'UI界面设计', desc: '{n}个页面的App/小程序UI设计，含交互原型+设计规范+切图标注，Figma交付', price: 3500, cat: '设计创意' },
    { title: '包装设计', desc: '{n}款产品包装设计+刀版图，含正面/背面/侧面展开图，CMYK印刷文件', price: 1800, cat: '设计创意' },
    { title: '画册设计', desc: '企业宣传画册{n}P，含封面封底+内页排版+图片精修，AI源文件+印刷PDF', price: 2500, cat: '设计创意' },
    { title: '海报设计', desc: '活动/促销海报{n}张，风格可选：国潮/极简/赛博朋克/复古，72小时内出初稿', price: 350, cat: '设计创意' },
    { title: 'PPT美化', desc: '商务PPT{n}页美化，统一配色字体+图表重绘+动画效果+演讲者备注，12h交付', price: 500, cat: '设计创意' },
    { title: '室内效果图', desc: '{n}㎡住宅/商铺3D效果图，含客厅+餐厅+主卧{n}个视角，3dsMax+VRay渲染', price: 1200, cat: '设计创意' },
    { title: '电商详情页', desc: '淘宝/京东详情页{n}屏设计，含主图+卖点+模特+规格参数，三天交付', price: 800, cat: '设计创意' },
  ]},
  { name: 'IT技术', templates: [
    { title: '企业官网开发', desc: '公司官网前后端开发，{n}个页面，响应式+SEO优化+后台管理+域名备案协助', price: 8000, cat: 'IT技术' },
    { title: '小程序开发', desc: '微信小程序{n}个页面，含用户登录+支付+地图+消息推送+后台管理，从零到上线', price: 12000, cat: 'IT技术' },
    { title: 'API接口开发', desc: 'RESTful API{n}个接口，含用户认证+数据CRUD+分页筛选+Swagger文档', price: 5000, cat: 'IT技术' },
    { title: '爬虫数据采集', desc: '指定网站数据爬取{n}万条，反爬处理+数据清洗+CSV/SQL导出，含定时任务', price: 3000, cat: 'IT技术' },
    { title: '服务器运维', desc: '云服务器{n}台环境搭建+安全加固+Nginx配置+SSL+自动备份+监控告警', price: 2500, cat: 'IT技术' },
    { title: 'Bug修复', desc: 'React/Vue项目中{n}个Bug修复+代码审查+性能优化，限时{n}天完成', price: 1500, cat: 'IT技术' },
    { title: '数据库设计', desc: '{n}张核心业务表设计+ER图+索引优化+SQL调优+数据迁移方案', price: 2800, cat: 'IT技术' },
    { title: 'App开发', desc: 'Flutter跨平台App{n}个核心页面，含登录/列表/详情/搜索/个人中心，打包上架', price: 15000, cat: 'IT技术' },
    { title: '自动化脚本', desc: '{n}个自动化脚本，Excel数据批处理/文件批量重命名/定时截图/表单自动填写', price: 600, cat: 'IT技术' },
    { title: '技术顾问', desc: '项目技术选型+架构设计+代码审查+团队培训，{n}年全栈经验，按小时/按天均可', price: 500, cat: 'IT技术' },
  ]},
  { name: '摄影摄像', templates: [
    { title: '婚礼跟拍', desc: '{n}小时婚礼跟拍，双机位+仪式+外景+晚宴，精修{n}张+底片全送', price: 2800, cat: '摄影摄像' },
    { title: '证件照精修', desc: '职业/留学签证证件照拍摄+精修{n}张，含服装指导+光线优化+背景替换', price: 88, cat: '摄影摄像' },
    { title: '产品拍摄', desc: '{n}款产品白底/场景拍摄，每款{n}张角度，3盏LED常亮灯+微距镜头', price: 500, cat: '摄影摄像' },
    { title: '活动跟拍', desc: '公司年会/发布会/开业庆典{n}小时跟拍，含花絮+合影+空镜，当天出预告{n}张', price: 1200, cat: '摄影摄像' },
    { title: '亲子/全家福', desc: '户外公园/n家庭/n人全家福拍摄{n}小时，引导自然互动，精修{n}张', price: 800, cat: '摄影摄像' },
    { title: '短视频拍摄', desc: '抖音/小红书短视频{n}条，含脚本策划+拍摄+剪辑+调色+字幕，时长{n}秒', price: 600, cat: '摄影摄像' },
  ]},
  { name: '医疗健康', templates: [
    { title: '在线问诊', desc: '{科室}在线图文/视频问诊{n}分钟，三甲医院主治以上，可解读检查报告和处方建议', price: 68, cat: '医疗健康' },
    { title: '体检报告解读', desc: '近{n}年体检报告综合解读+健康风险评估+个性化改善建议，含饮食运动方案', price: 128, cat: '医疗健康' },
    { title: '慢病管理方案', desc: '{疾病}慢病管理{n}个月方案，含用药提醒+指标监测+饮食指导+定期随访', price: 380, cat: '医疗健康' },
    { title: '心理咨询', desc: '{n}分钟线上心理咨询，国家二级心理咨询师，擅长焦虑/抑郁/职场压力/亲密关系', price: 200, cat: '医疗健康' },
    { title: '康复理疗', desc: '术后/运动损伤康复理疗{n}次，含评估+手法松解+康复训练+家庭作业指导', price: 280, cat: '医疗健康' },
    { title: '中医调理', desc: '中医体质辨识+针灸/艾灸/拔罐/推拿{n}次，调理亚健康/失眠/脾胃不和', price: 180, cat: '医疗健康' },
    { title: '营养配餐', desc: '{n}天个性化营养配餐方案，含每日三餐+加餐食谱和卡路里计算，可针对减脂增肌控糖', price: 260, cat: '医疗健康' },
  ]},
  { name: '法律咨询', templates: [
    { title: '合同审核', desc: '{n}页合同审核+修改建议+风险提示，限{合同类型}合同', price: 500, cat: '法律咨询' },
    { title: '劳动纠纷咨询', desc: '劳动争议{n}小时咨询，含解除/赔偿/竞业/工伤等法律意见，执业{n}年律师', price: 300, cat: '法律咨询' },
    { title: '知识产权咨询', desc: '商标/专利/著作权咨询{n}小时，含侵权分析+申请流程+维权策略，有代理资质', price: 600, cat: '法律咨询' },
    { title: '公司注册指导', desc: '{n}种公司类型注册全流程指导，含章程撰写+股权设计+税务登记+银行开户', price: 800, cat: '法律咨询' },
  ]},
  { name: '翻译服务', templates: [
    { title: '文档中英翻译', desc: '{n}字中译英/英译中技术文档翻译+术语统一+排版校对，CATTI二级译员', price: 450, cat: '翻译服务' },
    { title: '合同翻译', desc: '商务合同{n}页英译中+审校润色，法律术语准确+格式对应+2个工作日内交付', price: 800, cat: '翻译服务' },
    { title: '论文翻译润色', desc: '学术论文{n}字中译英+母语润色，目标SCI/SSCI期刊，含查重和格式排版', price: 1200, cat: '翻译服务' },
    { title: '同传/交传', desc: '商务会议/论坛{n}小时中英交传/同传，需提前提供资料，含设备租赁', price: 2500, cat: '翻译服务' },
  ]},
  { name: '餐饮美食', templates: [
    { title: '上门家宴', desc: '私厨上门做{n}人家庭聚餐/生日宴/节日宴，{n}菜{n}汤+凉菜+果盘，自带厨具餐具', price: 1280, cat: '餐饮美食' },
    { title: '火锅到家', desc: '重庆/成都老火锅上门，含底料炒制+{n}种荤菜+{n}种素菜+蘸料+锅具，2人起', price: 368, cat: '餐饮美食' },
    { title: '烧烤BBQ', desc: '户外/庭院烧烤BBQ{n}人份，含食材采购+腌制+烧烤+收尾清洁，炭烤/电烤可选', price: 680, cat: '餐饮美食' },
    { title: '烘焙定制', desc: '定制生日蛋糕/甜品台{n}款，慕斯/奶油/翻糖可选，动物奶油+新鲜水果，提前{n}天', price: 350, cat: '餐饮美食' },
    { title: '咖啡拉花教学', desc: '{n}小时咖啡拉花入门，心形/叶子/郁金香{n}种图案，含意式机操作+奶泡打发技巧', price: 280, cat: '餐饮美食' },
  ]},
  { name: '健身运动', templates: [
    { title: '私教减脂', desc: '{n}对{n}私教减脂{n}节课，含体测+饮食计划+力量+有氧，ACE/NSCA认证教练', price: 300, cat: '健身运动' },
    { title: '瑜伽私教', desc: '瑜伽{n}对{n}私教{n}节，哈他/流/阴/孕期可选，全美瑜伽联盟RYT认证', price: 250, cat: '健身运动' },
    { title: '拳击/散打', desc: '拳击/散打{n}对{n}教学{n}节，含基础拳法腿法+沙袋+反应训练+体能', price: 280, cat: '健身运动' },
    { title: '产后恢复', desc: '产后{n}个月恢复训练{n}节，含盆底肌+腹直肌+骨盆修复+核心重建', price: 350, cat: '健身运动' },
  ]},
  { name: '搬家家政', templates: [
    { title: '同城搬家', desc: '{n}室{n}厅搬家，{n}名搬运工+{n}米厢货，含家具拆装+打包+搬运+还原', price: 880, cat: '搬家货运' },
    { title: '跨城货运', desc: '{城市A}→{城市B}跨城搬家/货运，4.2米厢货，含装卸+高速费+保价', price: 2500, cat: '搬家货运' },
    { title: '家具拆装', desc: '{n}件家具拆装（衣柜+床+书桌+沙发），含打包材料+工具+运输至新家', price: 450, cat: '搬家货运' },
    { title: '大件垃圾清运', desc: '旧家具家电{n}件清运，含沙发/床垫/衣柜/冰箱，环保合规处理，不含危险废物', price: 350, cat: '搬家货运' },
  ]},
  { name: '宠物服务', templates: [
    { title: '宠物洗澡美容', desc: '{品种}洗澡+剪毛+指甲+耳道清洁+肛门腺，使用进口浴液，温柔耐心对待', price: 168, cat: '宠物服务' },
    { title: '宠物寄养', desc: '{品种}寄养{n}天，家庭式散养非笼养，每天遛{n}次+视频汇报+可接疫苗齐全', price: 80, cat: '宠物服务' },
    { title: '宠物训练', desc: '{品种}行为训练{n}节课，坐/卧/随行/拒食/定点大小便，正向激励法', price: 280, cat: '宠物服务' },
  ]},
  { name: '美容美发', templates: [
    { title: '上门美发', desc: '{n}人上门理发/烫染，含洗发+修剪+造型，自带工具+围布+吸发器，不弄脏地面', price: 128, cat: '美容美发' },
    { title: '新娘跟妆', desc: '新娘全天跟妆+补妆，含试妆{n}次+头饰搭配，MAC/阿玛尼等专业彩妆', price: 1680, cat: '美容美发' },
    { title: '上门美甲', desc: '{n}款款式可选，猫眼/法式/手绘/贴片/延长，自带光疗灯和200+色胶', price: 168, cat: '美容美发' },
  ]},
  { name: '音乐艺术', templates: [
    { title: '钢琴调律', desc: '立式/三角钢琴调律+整理{n}次，持国家职业资格证，标准音A=440Hz，含清洁内部', price: 300, cat: '音乐艺术' },
    { title: '吉他教学', desc: '{n}节课吉他入门/进阶，民谣/古典/电吉他可选，含识谱+和弦+节奏+弹唱', price: 150, cat: '音乐艺术' },
    { title: '声乐培训', desc: '流行/美声/民族唱法{n}节课，含气息训练+音准+共鸣+歌曲处理，艺考生可辅导', price: 200, cat: '音乐艺术' },
    { title: 'DJ打碟教学', desc: '{n}节课DJ入门，含设备使用+混音技巧+Set编排+风格分析，先锋设备教学', price: 250, cat: '音乐艺术' },
  ]},
  { name: '跑腿代办', templates: [
    { title: '医院排队挂号', desc: '替人在{n}医院排队挂{n}科室专家号+缴费取药+报告自取+邮寄', price: 120, cat: '跑腿代办' },
    { title: '代买代送', desc: '{城市}同城代买{n}物品并配送到{n}地点，现场拍照确认+小票留底', price: 50, cat: '跑腿代办' },
    { title: '文件代办', desc: '代办{n}项政府业务（护照/签证/社保/公积金），含填表+排队+取件+邮寄', price: 280, cat: '跑腿代办' },
    { title: '排队占位', desc: '替人在{n}店/网红店排队{n}小时，现场可随时视频/拍照确认进度', price: 80, cat: '跑腿代办' },
  ]},
  { name: '汽车服务', templates: [
    { title: '汽车保养', desc: '{品牌}车辆常规保养，换机油+三滤+全车检查，自带或代购原厂配件', price: 280, cat: '汽车服务' },
    { title: '代驾服务', desc: '夜间/酒后代驾，{n}公里以内，{n}年驾龄以上，熟悉各类车型，安全稳当', price: 100, cat: '汽车服务' },
    { title: '二手车检测', desc: '购车前{n}项全面检测，含漆面+大梁+发动机+变速箱+泡水火烧排查，出具检测报告', price: 500, cat: '汽车服务' },
    { title: '陪驾练车', desc: '新手司机陪练{n}小时，自带带副刹教练车，市区路况+窄路掉头+侧方停车实操', price: 120, cat: '汽车服务' },
  ]},
  { name: '农业园艺', templates: [
    { title: '阳台花园设计', desc: '{n}㎡阳台/露台花园设计+施工，含植物选择+花盆搭配+自动灌溉+灯光氛围', price: 1500, cat: '农业园艺' },
    { title: '庭院景观', desc: '{n}㎡庭院/别墅花园设计+施工，含硬化+植物+水景+灯光+户外家具方案', price: 15000, cat: '农业园艺' },
    { title: '绿植养护', desc: '办公室/家庭{n}盆绿植定期养护{n}次/月，含浇水+施肥+修剪+病虫害防治+补种', price: 200, cat: '农业园艺' },
  ]},
]

// 分类 → 服务类型 & taxonomy 叶子 ID 映射（必须与前端 TAXONOMY 一致）
const CATEGORY_TAXONOMY_MAP: Record<
  string,
  { serviceType: 'ONLINE' | 'OFFLINE'; taxonomyLeafId: string }
> = {
  '家政服务': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofhcd-2h' },
  '装修维修': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofre-circuit' },
  '教育培训': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofs-interview' },
  '设计创意': { serviceType: 'ONLINE', taxonomyLeafId: 'oldumi-social' },
  'IT技术': { serviceType: 'ONLINE', taxonomyLeafId: 'oldvwf-react' },
  '摄影摄像': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofev-photo' },
  '医疗健康': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofha-general' },
  '法律咨询': { serviceType: 'ONLINE', taxonomyLeafId: 'olpl-contract' },
  '翻译服务': { serviceType: 'ONLINE', taxonomyLeafId: 'ol-write' },
  '餐饮美食': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofhck-daily' },
  '健身运动': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofhm-tui' },
  '搬家货运': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofhmm-studio' },
  '宠物服务': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofpb-home' },
  '美容美发': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofb-hair' },
  '音乐艺术': { serviceType: 'ONLINE', taxonomyLeafId: 'ol-music' },
  '跑腿代办': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofm-labor' },
  '汽车服务': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofac-drunk' },
  '农业园艺': { serviceType: 'OFFLINE', taxonomyLeafId: 'ofpp-garden' },
}

// 辅助: 填充模板中的占位符
function fillTpl(tpl: DemandTpl): { title: string; desc: string; price: number; cat: string } {
  const N = () => String(rand(1, 8))
  const CITY = () => pick(['北京','上海','广州','深圳','杭州','成都','重庆','武汉','南京','西安'])
  const DEPT = () => pick(['心内科','消化内科','骨科','皮肤科','眼科','妇产科','儿科','中医科'])
  const BREED = () => pick(['泰迪','英短','布偶','金毛','柯基','美短','比熊','柴犬','加菲'])
  const BRAND = () => pick(['丰田','本田','大众','宝马','奔驰','奥迪','比亚迪','特斯拉'])
  return {
    title: tpl.title.replace(/\{n\}/g, () => N()).replace(/\{城市\}/g, () => CITY()).replace(/\{品种\}/g, () => BREED()).replace(/\{品牌\}/g, () => BRAND()).replace(/\{科室\}/g, () => DEPT()).replace(/\{疾病\}/g, () => pick(['高血压','糖尿病','冠心病','痛风','甲减','哮喘'])).replace(/\{合同类型\}/g, () => pick(['买卖','租赁','劳动','服务','保密','合伙'])).replace(/\{城市A\}/g, () => CITY()).replace(/\{城市B\}/g, () => CITY()),
    desc: tpl.desc.replace(/\{n\}/g, () => N()).replace(/\{城市\}/g, () => CITY()).replace(/\{品种\}/g, () => BREED()).replace(/\{品牌\}/g, () => BRAND()).replace(/\{科室\}/g, () => DEPT()).replace(/\{疾病\}/g, () => pick(['高血压','糖尿病','冠心病','痛风','甲减','哮喘'])).replace(/\{合同类型\}/g, () => pick(['买卖','租赁','劳动','服务','保密','合伙'])).replace(/\{城市A\}/g, () => CITY()).replace(/\{城市B\}/g, () => CITY()),
    price: tpl.price + rand(-tpl.price / 5, tpl.price / 3),
    cat: tpl.cat,
  }
}

// ═══ 主流程 ═══
async function main() {
  console.log('🚀 开始生成完整种子数据…\n')

  // ── 1. 创建管理员 ──
  const adminPhone = '13800000001'
  let admin = await prisma.user.findUnique({ where: { phone: adminPhone } })
  if (!admin) {
    admin = await prisma.user.create({
      data: { phone: adminPhone, nickname: '管理员', passwordHash: PWD, role: 'ADMIN', cityCode: '110000', certificationLevel: 'ADVANCED', creditScore: 100, completedOrders: 0, bio: '平台管理员', avatarUrl: '/uploads/avatars/avatar_01.png', coverUrl: '/uploads/covers/cover_01.png' },
    })
  }
  console.log('✅ 管理员就绪')

  // ── 2. 生成 200 用户 ──
  console.log('\n👥 创建 200 用户…')
  const allPhones: string[] = [adminPhone]
  const userIds: string[] = [admin.id]
  let createdUsers = 0, skippedUsers = 0
  let phoneCounter = 13800010000

  for (const city of CITY_POOL) {
    for (let i = 0; i < city.count; i++) {
      phoneCounter++
      const phone = String(phoneCounter)
      const existing = await prisma.user.findUnique({ where: { phone } })
      if (existing) { userIds.push(existing.id); allPhones.push(phone); skippedUsers++; continue }

      const cert = pick(CERT_WEIGHTS)
      const credit = cert === 'ADVANCED' ? rand(80, 98) : cert === 'INTERMEDIATE' ? rand(68, 88) : cert === 'BASIC' ? rand(58, 75) : rand(50, 65)
      const orders = cert === 'ADVANCED' ? rand(20, 90) : cert === 'INTERMEDIATE' ? rand(5, 40) : cert === 'BASIC' ? rand(0, 15) : 0
      const tags = pickN(TAG_POOL, rand(1, 5))

      const avatarNum = String(createdUsers % 20 + 1).padStart(2, '0')
      const coverNum = createdUsers % 14 + 1
      const user = await prisma.user.create({
        data: {
          phone, nickname: genNick(city.name), passwordHash: PWD,
          avatarUrl: `/uploads/avatars/avatar_${avatarNum}.png`,
          coverUrl: `/uploads/covers/cover_${String(coverNum).padStart(2, '0')}.png`,
          cityCode: city.code, certificationLevel: cert, creditScore: credit,
          completedOrders: orders,
          bio: `${pick(['资深','专业','热爱','靠谱','热情','认真','有耐心','经验丰富'])}${pick(PROF_SUFFIXES)}从业者，${city.name}${pick(['本地','全城','三环内','全市区'])}可服务，${rand(2,20)}年经验，${tags.slice(0,3).join('、')}专家`,
          role: 'USER',
          serviceTags: tags.slice(0, 5),
        },
      })
      userIds.push(user.id)
      allPhones.push(phone)

      // 创建 UserTag
      for (const tagName of tags) {
        await prisma.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName, category: 'service' } })
        await prisma.userTag.upsert({
          where: { userId_tagName: { userId: user.id, tagName } },
          update: {},
          create: { userId: user.id, tagName, status: 'IDLE', rating: randFloat(4.0, 5.0), orderCount: rand(0, orders) },
        })
      }

      createdUsers++
      if (createdUsers % 30 === 0) console.log(`  ... ${createdUsers} 用户已创建`)
    }
  }
  console.log(`✅ 用户: ${createdUsers} 新建, ${skippedUsers} 已存在, ID池 ${userIds.length}`)

  // ── 3. 创建需求 ──
  console.log('\n📋 创建需求…')
  let createdDemands = 0
  const demandIds: string[] = []
  const TARGET_DEMANDS = 1000

  while (createdDemands < TARGET_DEMANDS) {
    const cat = pick(CATEGORIES)
    const tpl = pick(cat.templates)
    const filled = fillTpl(tpl)
    const publisherId = pick(userIds)

    const win = rand(1, 30) // 1-30 day window
    const visibleUntil = new Date(Date.now() + win * 24 * 60 * 60000)
    const status = Math.random() < 0.4 ? 'COMPLETED' : Math.random() < 0.3 ? 'ACTIVE' : Math.random() < 0.15 ? 'FROZEN' : 'ACTIVE'
    const minPrice = Math.max(10, filled.price)
    const tags = [filled.cat]
    const txMap = CATEGORY_TAXONOMY_MAP[filled.cat] ?? { serviceType: 'OFFLINE', taxonomyLeafId: 'ofhcd-2h' }

    try {
      const cardNum = createdDemands % 14 + 1
      const cardExt = cardNum <= 10 ? 'jpg' : cardNum <= 11 ? 'jpeg' : 'png'
      const demand = await prisma.demand.create({
        data: {
          userId: publisherId, title: filled.title, description: filled.desc,
          minPrice, category: filled.cat, serviceType: txMap.serviceType,
          taxonomyLeafId: txMap.taxonomyLeafId,
          mediaUrls: [`/uploads/card-covers/100${String(cardNum).padStart(2, '0')}.${cardExt}`],
          expireAt: visibleUntil, visibilityWindow: win * 24 * 60, visibleUntil,
          status: status as any, tags, regionId: null,
          stage: status === 'COMPLETED' ? 'completed' : 'active',
          expectedOutcome: `按约定完成${filled.title}`,
          maxApplicants: rand(3, 15),
          applicantCount: status === 'COMPLETED' ? rand(1, 10) : rand(0, 3),
          lifecycleStage: 'ACTIVE',
        },
      })
      demandIds.push(demand.id)
      createdDemands++
      if (createdDemands % 100 === 0) console.log(`  ... ${createdDemands}/${TARGET_DEMANDS} 需求已创建`)
    } catch { /* skip dup */ }
  }
  console.log(`✅ 需求: ${createdDemands} 已创建`)

  // ── 4. 为已完成需求创建订单和结算 ──
  console.log('\n📦 创建订单+结算…')
  const completedDemands = await prisma.demand.findMany({
    where: { status: 'COMPLETED' },
    select: { id: true, userId: true, minPrice: true, deposit: true },
    take: 300,
  })
  let ordersCreated = 0, settlementsCreated = 0

  for (const demand of completedDemands) {
    const providerId = pick(userIds.filter(id => id !== demand.userId))
    const agreedPrice = Number(demand.minPrice) + rand(-Number(demand.minPrice) * 0.2, Number(demand.minPrice) * 0.5)

    try {
      await prisma.order.create({
        data: {
          demandId: demand.id, providerId, requesterId: demand.userId,
          agreedPrice, status: 'COMPLETED', paidAt: new Date(), completedAt: new Date(),
        },
      })
      ordersCreated++

      await prisma.settlement.create({
        data: {
          demandId: demand.id,
          minPrice: Number(demand.minPrice), finalPrice: agreedPrice,
          serviceFee: Math.round(agreedPrice * 0.05 * 100) / 100,
          demanderPaid: agreedPrice + Math.round(agreedPrice * 0.05 * 100) / 100,
          providerReceived: agreedPrice,
          platformRevenue: Math.round(agreedPrice * 0.05 * 100) / 100,
          depositReturned: demand.deposit,
        },
      })
      settlementsCreated++
    } catch { /* skip */ }
  }
  console.log(`✅ 订单: ${ordersCreated}, 结算: ${settlementsCreated}`)

  // ── 5. 为已完成需求关联服务者 ──
  console.log('\n🔗 关联服务者…')
  const linkedCount = await prisma.demand.updateMany({
    where: { status: 'COMPLETED', acceptedProviderId: null },
    data: { /* can't set in bulk easily */ },
  })
  // 逐条更新
  const unlinked = await prisma.demand.findMany({
    where: { status: 'COMPLETED', acceptedProviderId: null },
    select: { id: true },
    take: 200,
  })
  let linked = 0
  for (const d of unlinked) {
    try {
      const order = await prisma.order.findFirst({ where: { demandId: d.id }, select: { providerId: true } })
      if (order) {
        await prisma.demand.update({ where: { id: d.id }, data: { acceptedProviderId: order.providerId } })
        linked++
      }
    } catch { /* skip */ }
  }
  console.log(`✅ 服务者关联: ${linked}`)

  // ── 6. 刷新标签统计 ──
  console.log('\n📊 刷新标签统计…')
  try {
    const { refreshTagStats } = await import('../src/services/tag-stats.js')
    await refreshTagStats()
    console.log('✅ 标签统计已刷新')
  } catch { console.log('⚠️ 标签统计刷新失败（可稍后手动刷新）') }

  console.log('\n🎉 种子数据生成完成!')
  console.log(`   用户: ${createdUsers + skippedUsers}`)
  console.log(`   需求: ${createdDemands}`)
  console.log(`   订单: ${ordersCreated}`)
  console.log(`   结算: ${settlementsCreated}`)
  console.log(`   标签关联: 已自动创建`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
