import { PortfolioPage } from '@/components/ui/starfall-portfolio-landing'
import type { PortfolioPageProps } from '@/components/ui/starfall-portfolio-landing'
import { Footer } from '@/components/ui/footer-section'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  const portfolioData: PortfolioPageProps = {
    logo: {
      initials: 'N',
      name: 'Ninewood',
    },
    navLinks: [],
    resume: {
      label: '进入平台',
      onClick: () => navigate('/discover'),
    },
    hero: {
      titleLine1: '匿名发布 · 精准匹配 ·',
      titleLine2Gradient: '安全交付',
      subtitle: '匿名发布需求 · AI 语义分类 · 卡池筛选匹配 · 圈子协作交流',
    },
    ctaButtons: {
      primary: {
        label: '浏览需求',
        onClick: () => navigate('/discover'),
      },
      secondary: {
        label: '发布需求',
        onClick: () => navigate('/demands/create'),
      },
    },
    projects: [
      {
        title: '需求发布与匹配',
        description:
          'AI 语义分类器自动解析需求关键词，精准匹配服务分类。匿名发布，保护隐私。',
        tags: ['AI 分类', '匿名', '匹配'],
      },
      {
        title: '卡池筛选',
        description:
          '以卡牌形式浏览服务分类，拖拽组合筛选条件，桌面区实时展示匹配需求。',
        tags: ['卡池', '筛选', '桌面'],
      },
      {
        title: '圈子协作',
        description: '加入兴趣圈子，圈内发布定向需求，与同频创作者交流协作。',
        tags: ['社群', '协作', '定向'],
      },
    ],
    stats: [
      { value: '发布', label: '匿名需求' },
      { value: '匹配', label: '智能筛选' },
      { value: '交易', label: '安全闭环' },
    ],
    showAnimatedBackground: true,
  }

  return (
    <div className="flex flex-col min-h-full">
      <PortfolioPage {...portfolioData} />
      <Footer />
    </div>
  )
}
