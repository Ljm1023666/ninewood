/**
 * 第三方开源组件版权声明
 *
 * MIT / Apache-2.0 / ISC 协议均要求分发时保留原始版权声明。
 * license-checker 的 publisher 字段不完全等同于版权持有人，因此手动维护此映射。
 *
 * 未收录的包默认使用 publisher 字段作为版权持有人。
 */

/** 按包名精确匹配 */
export const COPYRIGHT_BY_NAME: Record<string, string> = {
  // React 生态
  react: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
  'react-dom': 'Copyright (c) Meta Platforms, Inc. and affiliates.',

  // Radix UI — 所有 @radix-ui/* 包统一版权
  '@radix-ui/react-avatar': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-dialog': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-dropdown-menu': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-label': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-radio-group': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-scroll-area': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-select': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-separator': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-slot': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-switch': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-tabs': 'Copyright (c) 2023 WorkOS Inc.',
  '@radix-ui/react-tooltip': 'Copyright (c) 2023 WorkOS Inc.',

  // Axios
  axios: 'Copyright (c) 2014-present Matt Zabriskie',

  // class-variance-authority (Apache-2.0)
  'class-variance-authority': 'Copyright (c) Joe Bell',

  // clsx
  clsx: 'Copyright (c) Luke Edwards',

  // cmdk
  cmdk: 'Copyright (c) Paco Coursey',

  // framer-motion
  'framer-motion': 'Copyright (c) Framer B.V.',

  // gsap (Custom — 非标准开源协议，需额外注意)
  gsap: 'Copyright (c) GreenSock. All Rights Reserved.',

  // @hookform/*
  '@hookform/resolvers': 'Copyright (c) Beier Luo',

  // lucide-react (ISC)
  'lucide-react': 'Copyright (c) Lucide Contributors',

  // motion
  motion: 'Copyright (c) Framer B.V.',

  // react-hook-form
  'react-hook-form': 'Copyright (c) Beier Luo',

  // react-resizable-panels
  'react-resizable-panels': 'Copyright (c) Brian Vaughn',

  // react-router-dom
  'react-router-dom': 'Copyright (c) Remix Software Inc.',

  // react-element-to-jsx-string
  'react-element-to-jsx-string': 'Copyright (c) Algolia, Inc.',

  // recharts
  recharts: 'Copyright (c) Recharts Contributors',

  // @sentry/react
  '@sentry/react': 'Copyright (c) Sentry',

  // socket.io-client
  'socket.io-client': 'Copyright (c) Guillermo Rauch',

  // sonner
  sonner: 'Copyright (c) Emil Kowalski',

  // tailwind-merge
  'tailwind-merge': 'Copyright (c) Dany Castillo',

  // three
  three: 'Copyright (c) Ricardo Cabello (mrdoob)',

  // @tsparticles/*
  '@tsparticles/engine': 'Copyright (c) Matteo Bruni',
  '@tsparticles/react': 'Copyright (c) Matteo Bruni',
  '@tsparticles/slim': 'Copyright (c) Matteo Bruni',

  // vaul
  vaul: 'Copyright (c) Emil Kowalski',

  // zod
  zod: 'Copyright (c) Colin McDonnell',

  // zustand
  zustand: 'Copyright (c) Paul Henschel',
}

/** 需要额外注意的许可 */
export const LICENSE_NOTES: Record<string, string> = {
  gsap:
    '自 Webflow 赞助后，GSAP 已 100% 免费（含所有插件），包括商业用途。' +
    '详见 README 及 https://gsap.com/standard-license/',
}
