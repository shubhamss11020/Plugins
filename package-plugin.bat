@echo off
title Package Raj's Claude Plugin
echo ===================================================
echo       Building clean raj-plugins.zip for Claude
echo ===================================================
echo.

python -c "import os, zipfile; zip_path = r'..\raj-plugins.zip'; base_dir = '.'; include_folders = ['.claude-plugin', 'scripts', 'skills']; include_files = ['config.json', 'SKILL.md', 'plugin.json', 'mcp_config.json']; z = zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED); [z.write(f, arcname=f) for f in include_files if os.path.exists(f)]; [(z.write(os.path.join(root, file), arcname=os.path.relpath(os.path.join(root, file), base_dir).replace('\\', '/'))) for folder in include_folders for root, dirs, files in os.walk(folder) for file in files]; z.close(); print('[SUCCESS] Clean POSIX ZIP created at: ' + os.path.abspath(zip_path))"

echo.
echo ===================================================
echo Ready! Upload raj-plugins.zip into Claude Desktop!
echo ===================================================
pause
