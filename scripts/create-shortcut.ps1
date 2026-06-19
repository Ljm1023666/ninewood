$WScriptShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Ninewood.lnk"

$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Windows\System32\cmd.exe"
$Shortcut.Arguments = "/c E:\Ninewood\scripts\start-ninewood.bat"
$Shortcut.WorkingDirectory = "E:\Ninewood"
$Shortcut.IconLocation = "E:\Ninewood\node_modules\.pnpm\electron@42.2.0\node_modules\electron\dist\electron.exe,0"
$Shortcut.Save()

Write-Host "Shortcut created on Desktop"
