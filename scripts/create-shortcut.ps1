# DeepSeek TUI 桌面快捷方式脚本
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\DeepSeek-TUI.lnk")
$Shortcut.TargetPath = "$env:USERPROFILE\Desktop\DeepSeek-TUI.bat"
$Shortcut.IconLocation = "shell32.dll,14"
$Shortcut.WorkingDirectory = "E:\Ninewood"
$Shortcut.Description = "DeepSeek TUI - Ninewood"
$Shortcut.Save()
Write-Host "Done: DeepSeek-TUI.lnk created on Desktop"
