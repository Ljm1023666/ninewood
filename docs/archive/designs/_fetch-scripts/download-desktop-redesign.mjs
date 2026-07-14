/**
 * 批量下载桌面端重设计 HTML（P0 + P1）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'stitch-desktop-redesign')

/** @type {Array<{id:string,title:string,route:string,priority:string,screenId:string,htmlUrl:string,screenshot:string}>} */
const pages = [
  {
    id: 'welfare',
    title: '公益中心 - Fluent Desktop Variant',
    screenId: 'dbb6cdeabc704259aa9a0455809460da',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2ZlNTQxNzVhNTZjZDRkNzY5ZDEyYjA2OWFkYTA1NzBlEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLu7yXgO8ECUl3LVUnnD--cHSo6rVW602dq6KE6mxVPpC2EpCqp1EN_ye5l2FXWRJQk301WkTiwyJy7AKGsZEWLcbQxsubZ_vCJ_v-VQAi4CbxyyNNRyPekyLGFm-g1uQu8pK8GWc-cwDeukLHpIE-gT-ZWl9m3POm9Q7PMG4xBt72nxmKqy3-ch5Ghg33Kgea3kaDaxSFOjnWiNPlBXudXIJ-oIPTQ0dqvm8PuSygu6l4nNdiH5sR0idQ',
    route: '/welfare',
    priority: 'P0',
  },
  {
    id: 'cert-center',
    title: '认证中心 - Ninewood Desktop',
    screenId: 'b42d1184d28c4ba196acc6d780ccf272',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzlkMTU5YjQ2YTgzMTRjNmU5ZTRhZjExOWU2YTAzY2Y1EgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLvmNH5u3jLI7c7yrF3jr_BHGTEihCa9TZVqms0fUIBJ0Aag4YWg0kfzM2HSL8j6E4dSo2aKbA9EW3zX3xheOh8GbH9SCmiT7eNND0ZYkxxEw_CHsQfw0dg0os_aIARrhnewNqQHC7No49gpE0fwPcHWqRIL4_AK0lcHBENlK-NLOzJqEYuUjgGpsWwE4EH_eouaLojY-bgcbYNRRkNcaZciLEsakm_Ji0apov6vP5GPxVfCqvMDMIrTdKQ',
    route: '/cert-center',
    priority: 'P0',
  },
  {
    id: 'search',
    title: '找人 - Desktop Search Variant',
    screenId: '548f021eeecb48dd85fd8bd37abf77a2',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzk1MWFmNjk3ZDNiYTQ5NmNhNmJmYzBmMmUzMThiOWRhEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLv9dTETk2YwOYInTVTzy7YLePJLmtgdm-QsUasL2xIDBcRW2BNEP6Ny8rTGB1fuFB38qW1OHt5UCrPp3Ucj0OzUFjSjlMmolEHAafrIvNW3Btz08v3qIHlpi3mjN_ofYPN4ms8VirSWd7dMI5mcdiYX2i-jbQbsdsCZyiLMLEQKLWGotP-_czH4k8SV1SeSFvm0eZkYld5Vw4mTENjx7bT_0HXNTI9CSmL0z_H_YYE3cUIXLY35W9pVcvU',
    route: '/search',
    priority: 'P0',
  },
  {
    id: 'my-tags',
    title: '我的标签 - Ninewood Desktop',
    screenId: '9a039bf22e804e4092917aa0f98685bb',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2YwZGQzOGIxZDcyMDRmMjhiZTgyOGE4MTIxZDI1YWUwEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLtZ_dmOy4uC_cP3wQcxR7Fg1E9YUgAIan1gVx80NgpZSq1HGleJf_YPaPLUU3JOXRDud5ebhPwvxvITGIOIzJWGJaTPRtSUc-I656fiEnLDV1IoAf1uRQJxBSRqajbe6pzVrDdS9DT-_LaNvbiu0FXbVLF3B9hsLeCJd28UHLPR9Vh4DkHvbO6p9kk9QDLUAJDuBfurnVPQBv_XVgg2DyF4RIaknNfXJ_ZryHbamsBiAmC8DnJdcQJ9BG8',
    route: '/my-tags',
    priority: 'P0',
  },
  {
    id: 'payment',
    title: '点数支付 - Ninewood Elite',
    screenId: '7a378b4549624316b2e913de78973eb5',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzkyMWI5NWIxNjFmNzQ3ZjQ4ZTg2MWUyYWIxNDM2M2NlEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLuJ2elyqKsnYd8r01rSHddFh9ko8Z62zsVfV8Jtyfb3UDnEWCAO2bQHInD0AI6TB5QqAP5RxlUGszRmoDpqUe3sxjFHcb4brzcaJE2ytiTOur188KpuNnH45JKMnvno8a5xnW9zXqslsZUyGSQhRo8l8LkSpEvwMbgxl0CSptai6SvwKW9LTxvL1Bbrg-K9xNGgIkvU9bNtFjWmRLpePFiSOYYBhd3dtiJs3VjWW3XUe0D9XyUyXk_p7M8',
    route: '/payment/:id',
    priority: 'P1',
  },
  {
    id: 'providers',
    title: '找服务者 - Ninewood Desktop',
    screenId: '4332f931352f4218b5c63becdcf7321d',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzk0MzAwZjI2NDljZjQ2YjdiZTQ5Y2ZjNzYxNTA3YTZjEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLsyzJYlA5Cw8JVHExGjcdsvAll6WY6pVX8Cd4EZ2JFOEpKm__gLzn5SwSbIqpRt3zYKdNV4KSmqreSmAdaTTuZzLr-XdlWzzIymPp3qad9kRN9YZxMnTGHnZH1_mcOIlm1xsYBV0jNGXPA99jt7r1GCMaEL9BKEBIK49hnAb3r9q5QsxuVnRR5HA-Ic__KFJIZvX_qQ8mBSFE_p0X4UZJycMCD2TPCUgdlSkuFZxC0GoPnTV3jBg1b3tA',
    route: '/providers',
    priority: 'P1',
  },
  {
    id: 'follows',
    title: '关注/粉丝 - Ninewood Desktop',
    screenId: '5cdceb47ea804c08afc638b87ce2bc9c',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2EzMWU4YmZkOTkzYzRiZjU5ZDg1MmI2ZDM4NzM2ODMwEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLsagTO9Fo5lWw3LgiBm7VqOl17QajLnyQNyoitVb0jmdWuFl27JibTMSbPdhO6ZBfXFgiQAK__KnzAfU9k4qzsDmeh5c8z_rEhhh8Qly7ExrN2dCl9fc6ccwsJLm-L0aIUdXAUYCBZegQJOY1cqWV8taUr6gUENrm77vfFRTTtQIOeYSsloi3cConfGMOTaTUsTnJAKPxUZllGTRznk6808ASUUaDY7z-YlQmspPkLkmbynX_QFYetFG4o',
    route: '/follows/:userId',
    priority: 'P1',
  },
  {
    id: 'cert-intro',
    title: '认证介绍 - Ninewood Desktop',
    screenId: '683eec376581422dad68c678eaddde89',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2EyNGM4Y2Y2OTc4ZjQxNzBiM2NiODYyZTY2NzU1MTVjEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLsShoQ2eHkBkNwlf_tXN-DkqeEHWyI4TRxnvJG_K9XceO09VHobN3-gw0quhDs9ChonmMNm0shPNdjXO76dFlhKbPlTuLGx9lbwDo2unEv5-4y_b_4Tw_buzmRFMyg0GzoJV4hqF17YcjkOWKmJQls4lENP1NUrV1HKO-dfk1AfPU6Kh3LQ4N5uU9WObJ8yP9jc0Ir1NjFECUyvgpD5cYwM_PM5qMw2QCrfEuYaBCPt0O-RbbUFNTTIfDs',
    route: '/cert-intro',
    priority: 'P1',
  },
  {
    id: 'my-bids',
    title: '我的应标 - Ninewood Desktop',
    screenId: 'fa0a534a5f254b379c267741789f7234',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAyODFiMDFiZGYzOTQxZWU5NjE3YzE1MTNiNmVhY2NjEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLuPkeEN6NfJbAByT82ZLOk7nafWLEH1FQa_RlZdIka8N9RjLGT-JpxikSnQYrKZHYkb3Hpfwc_L221TFQV_XM4CmjXB1vKGSKf9OJJ7J7Jzk-OMtigTS1geXMUiTfKngoDblyUKQHs-rrR5ol4A_UOv92Z8V00XFDaHGexU4GT6yvWE26ae0mxEjT8UnrKc8ZIuAdhCTpIVARug9SN2wkdx-d_wIo4UT5gw1oENuV8tKRa2IQTE7Mkyc_o',
    route: '/my-bids',
    priority: 'P1',
  },
  {
    id: 'not-found',
    title: '404 Not Found - Ninewood Desktop',
    screenId: '9f1a4194bffd475c93232c940dab313b',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzYxNTMxMmQ3MWU2MjQ2NzFhYjkxYjkxZDhjODk2ZmRkEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLu1E7UceD2ZGjWuL6cCtGXwtUR8biQqAydoUjP_N6Wm_ylxfD4m64za1xBVR91m598IPT-sEYMY5yTA7hB0nq9NFckREqTVDlNSk6oNukKSVe7o0T8O8EUo6Vwof1RqDGAxIEIb6p3Hsitq51Xg-FNPTELhPyhk-3OK9PzdBI1gX40bO87B5USbBuZfvHD5IlCi-0dl-sN1w5y9-X_PN5zy4w4qwM6kr8P0s3jMAnl824Fu69QyYIU8ZA',
    route: '/*',
    priority: 'P2',
  },
]

const filter = process.argv[2] // optional: page id
const selected = filter ? pages.filter((p) => p.id === filter) : pages
if (filter && selected.length === 0) {
  console.error('Unknown page id:', filter)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

// 合并已有 manifest
const manifestPath = path.join(outDir, 'manifest.json')
/** @type {typeof pages} */
let manifest = []
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch {
    manifest = []
  }
}

for (const p of selected) {
  const res = await fetch(p.htmlUrl)
  if (!res.ok) throw new Error(`Failed ${p.id}: ${res.status}`)
  const html = await res.text()
  const filename = `${p.id}.html`
  fs.writeFileSync(path.join(outDir, filename), html, 'utf8')
  const entry = {
    id: p.id,
    file: filename,
    title: p.title,
    route: p.route,
    priority: p.priority,
    screenId: p.screenId,
    screenshot: p.screenshot,
  }
  manifest = manifest.filter((m) => m.id !== p.id).concat(entry)
  console.log('Wrote', filename)
}

manifest.sort((a, b) => {
  const pri = { P0: 0, P1: 1, P2: 2 }
  return (pri[a.priority] ?? 9) - (pri[b.priority] ?? 9) || a.id.localeCompare(b.id)
})
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
console.log('Done', selected.length, 'page(s), manifest has', manifest.length)
