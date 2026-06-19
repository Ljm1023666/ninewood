import { prisma } from '../src/lib/prisma.js';

const regions = [
  // 国家
  { id: 100000, name: '中国', level: 1, parentId: 0 },

  // 省/直辖市
  { id: 110000, name: '北京市', level: 2, parentId: 100000 },
  { id: 120000, name: '天津市', level: 2, parentId: 100000 },
  { id: 310000, name: '上海市', level: 2, parentId: 100000 },
  { id: 500000, name: '重庆市', level: 2, parentId: 100000 },
  { id: 320000, name: '江苏省', level: 2, parentId: 100000 },
  { id: 330000, name: '浙江省', level: 2, parentId: 100000 },
  { id: 350000, name: '福建省', level: 2, parentId: 100000 },
  { id: 420000, name: '湖北省', level: 2, parentId: 100000 },
  { id: 440000, name: '广东省', level: 2, parentId: 100000 },
  { id: 510000, name: '四川省', level: 2, parentId: 100000 },
  { id: 530000, name: '云南省', level: 2, parentId: 100000 },
  { id: 610000, name: '陕西省', level: 2, parentId: 100000 },

  // 市（北京市下辖区）
  { id: 110101, name: '东城区', level: 3, parentId: 110000 },
  { id: 110105, name: '朝阳区', level: 3, parentId: 110000 },
  { id: 110108, name: '海淀区', level: 3, parentId: 110000 },

  // 市（上海市下辖区）
  { id: 310104, name: '徐汇区', level: 3, parentId: 310000 },
  { id: 310106, name: '静安区', level: 3, parentId: 310000 },
  { id: 310115, name: '浦东新区', level: 3, parentId: 310000 },

  // 广东省
  { id: 440100, name: '广州市', level: 3, parentId: 440000 },
  { id: 440300, name: '深圳市', level: 3, parentId: 440000 },
  // 广州市下辖区
  { id: 440104, name: '越秀区', level: 4, parentId: 440100 },
  { id: 440106, name: '天河区', level: 4, parentId: 440100 },
  // 深圳市下辖区
  { id: 440304, name: '福田区', level: 4, parentId: 440300 },
  { id: 440305, name: '南山区', level: 4, parentId: 440300 },

  // 浙江省
  { id: 330100, name: '杭州市', level: 3, parentId: 330000 },
  // 杭州市下辖区
  { id: 330106, name: '西湖区', level: 4, parentId: 330100 },
  { id: 330108, name: '滨江区', level: 4, parentId: 330100 },

  // 四川省
  { id: 510100, name: '成都市', level: 3, parentId: 510000 },
  // 成都市下辖区
  { id: 510107, name: '武侯区', level: 4, parentId: 510100 },
  { id: 510109, name: '高新区', level: 4, parentId: 510100 },

  // 湖北省
  { id: 420100, name: '武汉市', level: 3, parentId: 420000 },
  // 武汉市下辖区
  { id: 420106, name: '武昌区', level: 4, parentId: 420100 },
  { id: 420111, name: '洪山区', level: 4, parentId: 420100 },

  // 陕西省
  { id: 610100, name: '西安市', level: 3, parentId: 610000 },
  // 西安市下辖区
  { id: 610103, name: '碑林区', level: 4, parentId: 610100 },
  { id: 610113, name: '雁塔区', level: 4, parentId: 610100 },

  // 江苏省
  { id: 320100, name: '南京市', level: 3, parentId: 320000 },
  // 南京市下辖区
  { id: 320102, name: '玄武区', level: 4, parentId: 320100 },
  { id: 320106, name: '鼓楼区', level: 4, parentId: 320100 },

  // 云南省
  { id: 530100, name: '昆明市', level: 3, parentId: 530000 },

  // 福建省
  { id: 350200, name: '厦门市', level: 3, parentId: 350000 },
  // 厦门市下辖区
  { id: 350203, name: '思明区', level: 4, parentId: 350200 },
  { id: 350206, name: '湖里区', level: 4, parentId: 350200 },
];

export async function seedRegions() {
  for (const region of regions) {
    await prisma.region.upsert({
      where: { id: region.id },
      update: { name: region.name, level: region.level, parentId: region.parentId },
      create: region,
    });
  }
  console.log(`[Seed] 已写入 ${regions.length} 条行政区划数据`);
}

seedRegions();
