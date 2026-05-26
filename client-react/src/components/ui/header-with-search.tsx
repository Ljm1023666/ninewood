import React from 'react';
import { Grid2x2PlusIcon, MenuIcon, SearchIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchModal } from '@/components/ui/search-modal';

export function Header({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const hasCustomSearch = !!children

  const links = [
    { label: '发现', href: '/' },
    { label: '发布', href: '/demands/create' },
  ];

  return (
    <header
      className={cn(
        'z-50 w-full border-b backdrop-blur-lg',
        'bg-background/95 supports-[backdrop-filter]:bg-background/80',
      )}
    >
      <nav className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
        <div className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 duration-100">
          <Grid2x2PlusIcon className="size-6" />
          <p className="font-mono text-lg font-bold">九木</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <a className={buttonVariants({ variant: 'ghost' })} href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          {hasCustomSearch ? children : (
            <SearchModal data={blogs}>
              <Button
                variant="outline"
                className="relative size-9 cursor-pointer p-0 md:border xl:h-9 xl:w-60 xl:justify-between xl:px-3 xl:py-2"
              >
                <span className="hidden xl:inline-flex">搜索...</span>
                <span className="sr-only">Search</span>
                <SearchIcon className="size-4" />
              </Button>
            </SearchModal>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setOpen(!open)}
              className="lg:hidden"
            >
              <MenuIcon className="size-4" />
            </Button>
            <SheetContent
              className="bg-background/95 supports-[backdrop-filter]:bg-background/80 gap-0 backdrop-blur-lg"
              showClose={false}
              side="left"
            >
              <div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
                {links.map((link) => (
                  <a
                    className={buttonVariants({ variant: 'ghost', className: 'justify-start' })}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <SheetFooter>
                <Button variant="outline">登录</Button>
                <Button>注册</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

const blogs: { id: string; title: string; description: string; category: string }[] = [
  { id: '1', title: 'GPU算力', description: 'A100/4090 云端GPU按小时租用', category: '技术' },
  { id: '2', title: 'Python开发', description: '后端API、爬虫、自动化脚本', category: '技术' },
  { id: '3', title: '前端开发', description: 'React/Vue/小程序页面开发', category: '技术' },
  { id: '4', title: 'AI训练', description: '大模型微调、LoRA定制训练', category: '技术' },
  { id: '5', title: '家政保洁', description: '日常保洁、开荒保洁、深度清洁', category: '生活' },
  { id: '6', title: '跑腿代办', description: '代取快递、代买、排队', category: '生活' },
  { id: '7', title: '平面设计', description: 'LOGO、海报、包装、VI设计', category: '设计' },
  { id: '8', title: '视频剪辑', description: '短视频精剪、特效、转场', category: '设计' },
  { id: '9', title: '家教辅导', description: '数学、物理、英语、考研', category: '教育' },
  { id: '10', title: '摄影跟拍', description: '写真、婚纱、活动、证件照', category: '创意' },
];
