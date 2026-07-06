/**
 * 批量下载桌面端重设计 HTML
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../docs/stitch-desktop-redesign')

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
]

fs.mkdirSync(outDir, { recursive: true })
const manifest = []

for (const p of pages) {
  const res = await fetch(p.htmlUrl)
  if (!res.ok) throw new Error(`Failed ${p.id}: ${res.status}`)
  const html = await res.text()
  const filename = `${p.id}.html`
  fs.writeFileSync(path.join(outDir, filename), html, 'utf8')
  manifest.push({
    id: p.id,
    file: filename,
    title: p.title,
    route: p.route,
    priority: p.priority,
    screenId: p.screenId,
    screenshot: p.screenshot,
  })
  console.log('Wrote', filename)
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
console.log('Done', manifest.length, 'pages')
