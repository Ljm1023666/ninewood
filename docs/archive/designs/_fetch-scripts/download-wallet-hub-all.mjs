/**
 * 批量下载暖金奢华 Hub 子页 HTML + 复制钱包页
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'stitch-wallet-hub-subpages')
const walletSrc = path.join(root, 'stitch-points-wallet', 'variant-d.html')

const pages = [
  {
    tab: 'home',
    title: '首页 - Warm Luxury Variant',
    screenId: 'bc27efc905c64c069f3417ae4a20dfdc',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzk5NDM2YThmZDA0OTQwZDM4NTRkZDc4OTJiZTlkNzE3EgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLvRxAVN7HdulQ5cx61dh6qO-1GUt7ngb7hsNknEMi4rC5ww9Mm3iYL113sKB8UlWWWHTbmYjeiZdDPW9cNlgjt5mVOrK8H7qaJ6hiFo4ouF19mRxg1SYbz7erYWPLADn2XqQL8cnTLZqiinRg-vWIg0MHhZY5qx1G7Ao8tVrSInQRQeG9dRZyU-8xSlRCNERyjOi4_BQ4to5aifabp7G3s57tgPqSQg-vOLmzQ28DYLK5WPFADfEZJSNg',
  },
  {
    tab: 'community',
    title: '圈子社区 - Warm Luxury Variant',
    screenId: '08a9c3acc8da46d2bdce84b5a17b4559',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzMwYzdmM2IwM2MzZjRkMzFhMGVkYjk3MTUwYmZjOWMzEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLtLBYkHLP3DLqSODhhsZLXm_fJTsXVzddZ8TWTYrK0bLV3KRpYcTaOhYF1NnFCjxGDceFr4RPY3uWu1O8eI97VtnG6oAfmMSztKSrHt8FgAL42ZuTz-I1NgxkDDNhRKXPA9Pd24gM1aQ6vX_WXlxSbJzyqMETj6FkWHL7uLtxsr6YjZy8U4lYEkY0hQbbgIR_xqUxKkT5hPEMlDi3enZN-KIvNuuAY557d5vYCCXG5GfWS_eK8CJil1HIo',
  },
  {
    tab: 'resources',
    title: '资源文件 - Warm Luxury Variant',
    screenId: '00ed709d86344da8a99b8a3a3d9ec215',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2U1M2FlMTBkNzY0ZjQ2YjJhZTZhNzQ5OTQwOTdkNjA0EgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLv7jTA1iHYntJWxz1SC9l1YdDsEmaHn7FFeF92VdL1WrVD1i-kLTk-schbRiDvwQ_vqisB_7FLn0SYLDeAcxRBCOeys9SDLS1uQMqpBZ6y-kV4sU3iVQZtlN7jv_S-N1aatQk-VkH86r6tNCWnR5NHZfrKqd5Gs9pKmw1xlmUECNCNcSrkwCgvWEES4wqAixKB9Ul4z-oRAM7GLdd4-PoIGhmavAieSijHpgkyk35Ue9h81xO66tGNXO5E',
  },
  {
    tab: 'analytics',
    title: '分析数据 - Warm Luxury Variant',
    screenId: '6ed829c62996498991b04c6351f1df59',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzIzNGE3ZjM3ODUxZDQyMTc5N2IyMmUzNWI5NThlNGVhEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLvHcJYq87NdFBCphcAiGi-GAbZI0T9kYae0kDb8NBLAqlvz83_sRxijMMPS_kH3YU0CUQ1Qy18y_Wj2CxxZDPhPvw1LAtbMIyt1Nz_RuR6FXeiSbTIHRAiFsK-4BirJfz1aWVDM1MeMroVjoO5hmarWaXv3e1zQK42XQUWb1esg1ftYuznYUR2Gnxe9V0Lsav4Lm2Q6sPRF0eA1nIJNuejHdqXmtCG0GzEtSF3e1w8AvYkK4Vhgw-KssEk',
  },
  {
    tab: 'help',
    title: '帮助中心 - Warm Luxury Variant',
    screenId: '828f6ac2070340faaa9eb211d881004d',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzI5NGNlNGRkMGQwZTQyYjBiZjRmOTAyMTFhNzU3NjI4EgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLsc0fNs2SDSutjyTfFahDydcemEwAm6AtYQYuLWXvZmTOJPlJwTrmgN_XbaDzV0mv7tB7oKSZgSbM3Mbx4kFMXEYgsqovqxkJgza9xQYDmKUlC34kVoXiVrDdTQuj2PYpAtfyGyaCjHlWSgShBcTEg4QHzmq7sLqKbGVHym8V8o-u3lW0c-ugL00PMw661gUlW9MDtBOMkjRLsOiZ-g06O6BsCfoGk8nG77n9ow2iosa0EmqC2FnDvuezg',
  },
  {
    tab: 'teams',
    title: '我的团队 - Warm Luxury Variant',
    screenId: '732fb7aa513a431abce691318176a823',
    htmlUrl:
      'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzA2ZWFkOWQ5MzQ4MDQwYjM5N2I3YjAwN2MxNTdjZTJjEgoSBhCJ1a-ILRgBkgEkCgpwcm9qZWN0X2lkEhZCFDE3MjQ4NjcwNTI3NDg3MDEwMTE0&filename=&opi=96797242',
    screenshot:
      'https://lh3.googleusercontent.com/aida/AP1WRLumVZLXq7-R9yFEo_jjPq2pFERHeaYp-SI48-MWHlhWbGBUHdzbzLznpLiLjdmFzRphKO-Tayl3MVnA6pteCHKf94ESE03UOnoU918TUgdhRBRSN-7sJ-o7TsIoSx_UT14Nq14uRY_5sERrbHaV8ks57DqEsxmzye4p7vILVlWGvSqRQEgp09MiU6HAU14me0rEhwMym0sD242sAxMznUqXCtD0LFaus4YNr3b--xUl8ntnY51BOv0PbPU',
  },
]

fs.mkdirSync(outDir, { recursive: true })

const manifest = []

for (const p of pages) {
  const res = await fetch(p.htmlUrl)
  if (!res.ok) throw new Error(`Failed ${p.tab}: ${res.status}`)
  const html = await res.text()
  const filename = `${p.tab}.html`
  fs.writeFileSync(path.join(outDir, filename), html, 'utf8')
  manifest.push({
    tab: p.tab,
    file: filename,
    title: p.title,
    screenId: p.screenId,
    screenshot: p.screenshot,
  })
  console.log('Wrote', filename)
}

// 钱包页：复制方案 D
if (!fs.existsSync(walletSrc)) throw new Error('variant-d.html not found')
fs.copyFileSync(walletSrc, path.join(outDir, 'wallet.html'))
manifest.push({
  tab: 'wallet',
  file: 'wallet.html',
  title: '点数钱包 - Warm Luxury Variant',
  screenId: 'a352636672d64c2cada743f594941c70',
  screenshot:
    'https://lh3.googleusercontent.com/aida/AP1WRLurQDP7RwpRXgRxFpbMKgvlMOD7aGvUfMgcNpeCNd4wARta8IqC5_HDtt2aATqlA0VG43S7j_KMefCXk3jLlrNrKsUzKo0W4zES82MobVk9L3hd_pWcGQ8b9MK7dl80qNlbiuHkhvzEUznNJLU9mEDCDIlNg6NZweu5m4-692v05CXgRRDJsy7HJ7Vrqg3YaWwwYi2PhhW4-ntQ0tO4x6qscgWp8M60WAk-hXMUx46tQ0LzJyUszteN_A',
  source: 'docs/archive/designs/stitch-points-wallet/variant-d.html',
})
console.log('Copied wallet.html from variant-d')

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
console.log('Done. manifest has', manifest.length, 'entries')
