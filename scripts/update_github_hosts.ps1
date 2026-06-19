$ErrorActionPreference = "Stop"

$hostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
$backup = "$hostsPath.bak.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $hostsPath $backup -Force

$startMark = "# github520-auto-start"
$endMark = "# github520-auto-end"

$entries = @(
  "140.82.112.25 alive.github.com"
  "20.205.243.168 api.github.com"
  "140.82.114.22 api.individual.githubcopilot.com"
  "185.199.108.133 avatars.githubusercontent.com"
  "185.199.108.133 avatars0.githubusercontent.com"
  "185.199.108.133 avatars1.githubusercontent.com"
  "185.199.108.133 avatars2.githubusercontent.com"
  "185.199.108.133 avatars3.githubusercontent.com"
  "185.199.108.133 avatars4.githubusercontent.com"
  "185.199.108.133 avatars5.githubusercontent.com"
  "185.199.108.133 camo.githubusercontent.com"
  "140.82.113.21 central.github.com"
  "185.199.108.133 cloud.githubusercontent.com"
  "20.205.243.165 codeload.github.com"
  "140.82.114.22 collector.github.com"
  "185.199.108.133 desktop.githubusercontent.com"
  "185.199.108.133 favicons.githubusercontent.com"
  "20.205.243.166 gist.github.com"
  "16.15.253.58 github-cloud.s3.amazonaws.com"
  "16.15.229.119 github-com.s3.amazonaws.com"
  "52.216.33.121 github-production-release-asset-2e65be.s3.amazonaws.com"
  "3.5.8.170 github-production-repository-file-5c1aeb.s3.amazonaws.com"
  "52.216.32.217 github-production-user-asset-6210df.s3.amazonaws.com"
  "192.0.66.2 github.blog"
  "20.205.243.166 github.com"
  "140.82.112.18 github.community"
  "185.199.110.215 github.githubassets.com"
  "151.101.193.194 github.global.ssl.fastly.net"
  "185.199.109.153 github.io"
  "185.199.108.133 github.map.fastly.net"
  "185.199.109.153 githubstatus.com"
  "140.82.114.26 live.github.com"
  "185.199.108.133 media.githubusercontent.com"
  "185.199.108.133 objects.githubusercontent.com"
  "13.107.42.16 pipelines.actions.githubusercontent.com"
  "185.199.108.133 raw.githubusercontent.com"
  "185.199.108.133 user-images.githubusercontent.com"
  "13.107.226.39 vscode.dev"
  "140.82.112.21 education.github.com"
  "185.199.108.133 private-user-images.githubusercontent.com"
)

$existing = Get-Content $hostsPath -Raw -Encoding UTF8
if ($null -eq $existing) {
  $existing = ""
}
$pattern = "(?s)" + [regex]::Escape($startMark) + ".*?" + [regex]::Escape($endMark)

$block = @(
  $startMark
  $entries
  "# Update time: 2026-05-13T20:53:21+08:00"
  "# Source: https://raw.githubusercontent.com/521xueweihan/GitHub520/master/hosts"
  $endMark
) -join "`r`n"

if ([regex]::IsMatch($existing, $pattern)) {
  $newContent = [regex]::Replace(
    $existing,
    $pattern,
    [System.Text.RegularExpressions.MatchEvaluator] { param($m) $block }
  )
} else {
  $separator = if ($existing.EndsWith("`r`n")) { "" } else { "`r`n" }
  $newContent = $existing + $separator + "`r`n" + $block + "`r`n"
}

Set-Content -Path $hostsPath -Value $newContent -Encoding UTF8 -Force
ipconfig /flushdns | Out-Null

Write-Output "HOSTS_OK"
Write-Output "BACKUP=$backup"
