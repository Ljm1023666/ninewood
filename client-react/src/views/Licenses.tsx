import { useMemo } from 'react'
import licensesData from '@/data/licenses.json'
import { COPYRIGHT_BY_NAME, LICENSE_NOTES } from '@/data/copyright-notices'
import { BackButton } from '@/components/ui/back-button'

type License = {
  name: string
  version: string
  license: string
  publisher: string
  repository: string
}

const licenses = licensesData as License[]

/** 从映射表或 publisher 字段推导版权声明 */
function resolveCopyright(pkg: License): string {
  if (COPYRIGHT_BY_NAME[pkg.name]) return COPYRIGHT_BY_NAME[pkg.name]
  if (pkg.publisher) return `Copyright (c) ${pkg.publisher}`
  return `Copyright (c) ${pkg.name} contributors`
}

/** 判断是否为标准 MIT */
function isMIT(license: string) {
  return license === 'MIT' || license.startsWith('MIT')
}

/** 判断是否为 Apache-2.0 */
function isApache(license: string) {
  return license === 'Apache-2.0' || license.startsWith('Apache-2.0')
}

/** 判断是否为 ISC */
function isISC(license: string) {
  return license === 'ISC' || license.startsWith('ISC')
}

/** 判断是否为已知标准协议 */
function isStandardLicense(license: string) {
  return isMIT(license) || isApache(license) || isISC(license)
}

/** 归一化协议类型用于分组（MIT/Apache/ISC/Other） */
function normalizeLicenseType(license: string): string {
  if (isMIT(license)) return 'MIT'
  if (isApache(license)) return 'Apache-2.0'
  if (isISC(license)) return 'ISC'
  return 'Other'
}

// 按协议类型分组（归并为 MIT / Apache-2.0 / ISC / Other）
function groupByLicenseType(pkgs: License[]) {
  const groups: Record<string, License[]> = {}
  for (const pkg of pkgs) {
    const key = normalizeLicenseType(pkg.license)
    if (!groups[key]) groups[key] = []
    groups[key].push(pkg)
  }
  return groups
}

export default function Licenses() {
  const sorted = useMemo(() => [...licenses].sort((a, b) => a.name.localeCompare(b.name)), [])
  const licenseGroups = useMemo(() => groupByLicenseType(sorted), [sorted])
  const licenseTypes = useMemo(() => Object.keys(licenseGroups).sort(), [licenseGroups])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <BackButton />
      {/* ======== 页面标题 ======== */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">开源许可</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          本应用使用了以下第三方开源组件，在此表示感谢。各组件的版权归各自作者所有。
        </p>
      </div>

      {/* ======== 版权声明（MIT/Apache-2.0/ISC 均要求保留） ======== */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          第三方开源组件版权声明
        </h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          MIT / Apache-2.0 / ISC 协议要求分发时完整保留以下版权声明。
          版权年份可能因版本而异，具体请查阅各项目源码仓库。
        </p>
        <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-muted)] leading-relaxed max-h-80 overflow-y-auto">
{`=== Third-Party Copyright Notices ===

${sorted.map((pkg) => `${pkg.name} (${pkg.license.split(':')[0]}) — ${resolveCopyright(pkg)}`).join('\n')}
`}
        </pre>
      </section>

      {/* ======== 组件列表 ======== */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">依赖组件清单</h2>
        <div className="mt-3 flex flex-col gap-2">
          {sorted.map((pkg) => {
            const copyright = resolveCopyright(pkg)
            const hasNote = LICENSE_NOTES[pkg.name]
            return (
              <div
                key={pkg.name}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text-primary)]">
                    {pkg.name}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      isMIT(pkg.license)
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : isApache(pkg.license)
                          ? 'bg-amber-500/10 text-amber-400'
                          : isISC(pkg.license)
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-orange-500/10 text-orange-400'
                    }`}
                  >
                    {pkg.license}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  <span>{copyright}</span>
                  {pkg.version && <span> · v{pkg.version}</span>}
                </div>
                {pkg.repository && (
                  <a
                    href={pkg.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-xs text-[var(--accent-color)] hover:underline truncate"
                  >
                    {pkg.repository}
                  </a>
                )}
                {hasNote && (
                  <div className="mt-2 rounded-md border border-blue-500/20 bg-blue-500/[0.04] p-2 text-xs text-blue-300/80">
                    {LICENSE_NOTES[pkg.name]}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ======== 许可证全文（按类型分组） ======== */}
      {licenseTypes.map((type) => {
        if (type === 'MIT' || type === 'Apache-2.0' || type === 'ISC') return null
        const pkgs = licenseGroups[type]
        return (
          <section key={type}>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              其他许可协议
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              以下组件使用非标准开源协议，请查看各自官方页面了解完整条款：
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-[var(--text-muted)]">
              {pkgs.map((p) => (
                <li key={p.name}>
                  <span className="font-medium">{p.name}</span>
                  {' — '}
                  <span>{p.license}</span>
                  {p.repository && (
                    <>
                      {' · '}
                      <a
                        href={p.repository}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-color)] hover:underline"
                      >
                        源码仓库
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {/* MIT 全文 */}
      {licenseGroups['MIT'] && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            MIT 许可证全文
          </h2>
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            适用于：{licenseGroups['MIT'].map((p) => p.name).join('、')}
          </p>
          <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-muted)] leading-relaxed max-h-80 overflow-y-auto">
{`MIT License

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
        </section>
      )}

      {/* Apache-2.0 全文 */}
      {licenseGroups['Apache-2.0'] && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Apache License 2.0 全文
          </h2>
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            适用于：{licenseGroups['Apache-2.0'].map((p) => p.name).join('、')}
          </p>
          <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-muted)] leading-relaxed max-h-80 overflow-y-auto">
{`                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS`}
          </pre>
        </section>
      )}

      {/* ISC 全文 */}
      {licenseGroups['ISC'] && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            ISC 许可证全文
          </h2>
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            适用于：{licenseGroups['ISC'].map((p) => p.name).join('、')}
          </p>
          <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-muted)] leading-relaxed">
{`ISC License

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`}
          </pre>
        </section>
      )}

      {/* ======== 页脚 ======== */}
      <p className="text-xs text-[var(--text-muted)]">
        本页面组件清单通过 license-checker 自动生成，版权声明为手动维护。
        如有遗漏或错误请联系维护者修正。
      </p>
    </div>
  )
}
