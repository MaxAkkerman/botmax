Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\start-bot-service.bat""", 0, False
