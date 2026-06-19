import licensesData from '@/data/licenses.json'

type License = {
  name: string
  version: string
  license: string
  publisher: string
  repository: string
}

const licenses = licensesData as License[]

export default function Licenses() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">开源许可</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        本应用使用了以下开源组件。遵循各自的许可证条款，在此表示感谢。
      </p>
      <div className="flex flex-col gap-2">
        {licenses
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((pkg) => (
            <div
              key={pkg.name}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--text-primary)]">
                  {pkg.name}
                </span>
                <span className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                  {pkg.license}
                </span>
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                {pkg.publisher && <span>{pkg.publisher} · </span>}
                <span>v{pkg.version}</span>
              </div>
              {pkg.repository && (
                <a
                  href={pkg.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-xs text-[var(--accent-color)] hover:underline"
                >
                  {pkg.repository}
                </a>
              )}
            </div>
          ))}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        MIT 许可证全文
      </h2>
      <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-muted)] leading-relaxed">
{`MIT License

Copyright (c) <year> <copyright holders>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
      </pre>
      <p className="mt-6 text-xs text-[var(--text-muted)]">
        本页面信息通过 license-checker 自动生成，如有遗漏或错误请联系维护者修正。
      </p>
    </div>
  )
}
