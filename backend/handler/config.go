package handler

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

func ConfigHandler(path string) echo.HandlerFunc {
	return func(c echo.Context) error {
		content, err := os.ReadFile(path)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"content": string(content),
			"path":    path,
		})
	}
}

func SaveConfigHandler(path, backupsPath, nginxBin string) echo.HandlerFunc {
	return func(c echo.Context) error {
		var req struct {
			Content string `json:"content"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]any{"error": "invalid request"})
		}

		// 1. 创建备份
		backupName := fmt.Sprintf("nginx.conf.%s.backup", time.Now().Format("20060102_150405"))
		backupPath := filepath.Join(backupsPath, backupName)
		original, _ := os.ReadFile(path)
		os.WriteFile(backupPath, original, 0644)

		// 2. 写入新配置
		if err := os.WriteFile(path, []byte(req.Content), 0644); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		// 3. 测试配置
		testCmd := exec.Command(nginxBin, "-t")
		testOutput, err := testCmd.CombinedOutput()
		if err != nil {
			// 恢复备份
			os.WriteFile(path, original, 0644)
			return c.JSON(http.StatusBadRequest, map[string]any{
				"error":  "config test failed",
				"output": string(testOutput),
				"backup": backupName,
			})
		}

		// 4. 重载 nginx
		reloadCmd := exec.Command(nginxBin, "-s", "reload")
		reloadOutput, err := reloadCmd.CombinedOutput()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{
				"error":  "config saved but reload failed",
				"output": string(reloadOutput),
				"backup": backupName,
			})
		}

		return c.JSON(http.StatusOK, map[string]any{
			"message": "saved, tested and reloaded",
			"backup":  backupName,
			"output":  string(testOutput),
			"reload":  string(reloadOutput),
		})
	}
}

func TestConfigHandler(path, nginxBin string) echo.HandlerFunc {
	return func(c echo.Context) error {
		cmd := exec.Command(nginxBin, "-t", "-c", path)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]any{
				"success": false,
				"output":  string(output),
			})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"success": true,
			"output":  string(output),
		})
	}
}

func ReloadConfigHandler(path, nginxBin string) echo.HandlerFunc {
	return func(c echo.Context) error {
		cmd := exec.Command(nginxBin, "-s", "reload")
		output, err := cmd.CombinedOutput()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{
				"error":  err.Error(),
				"output": string(output),
			})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"message": "reloaded",
			"output":  string(output),
		})
	}
}

func NginxControlHandler(action, nginxBin string) echo.HandlerFunc {
	return func(c echo.Context) error {
		var cmd *exec.Cmd
		switch action {
		case "start":
			cmd = exec.Command(nginxBin)
		case "stop":
			cmd = exec.Command(nginxBin, "-s", "stop")
		case "restart":
			cmd = exec.Command(nginxBin, "-s", "stop")
			cmd.Run()
			cmd = exec.Command(nginxBin)
		}

		output, err := cmd.CombinedOutput()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{
				"error":  err.Error(),
				"output": string(output),
			})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"message": action + "ed",
			"output":  string(output),
		})
	}
}

// NginxStatusHandler 返回 Nginx 进程状态
func NginxStatusHandler() echo.HandlerFunc {
	return func(c echo.Context) error {
		// 使用 pgrep 或 ps 命令检查 nginx 进程
		cmd := exec.Command("pgrep", "-x", "nginx")
		output, err := cmd.CombinedOutput()
		running := err == nil && len(output) > 0

		return c.JSON(http.StatusOK, map[string]any{
			"running": running,
			"pids":    strings.Fields(string(output)),
		})
	}
}

func ServersHandler(path string) echo.HandlerFunc {
	return func(c echo.Context) error {
		entries, err := os.ReadDir(path)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		var servers []map[string]any
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(e.Name(), ".conf") {
				filePath := filepath.Join(path, e.Name())
				info, _ := e.Info()
				servers = append(servers, map[string]any{
					"name":    e.Name(),
					"path":    filePath,
					"size":    info.Size(),
					"updated": info.ModTime().Unix(),
				})
			}
		}
		return c.JSON(http.StatusOK, map[string]any{"servers": servers})
	}
}

func GetServerHandler(path string) echo.HandlerFunc {
	return func(c echo.Context) error {
		name := c.Param("name")
		filePath := filepath.Join(path, name)
		content, err := os.ReadFile(filePath)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]any{
			"name":    name,
			"content": string(content),
			"path":    filePath,
		})
	}
}

func SaveServerHandler(path, backupsPath, nginxBin string) echo.HandlerFunc {
	return func(c echo.Context) error {
		name := c.Param("name")
		var req struct {
			Content string `json:"content"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]any{"error": "invalid request"})
		}

		filePath := filepath.Join(path, name)

		// 备份
		backupName := fmt.Sprintf("%s.%s.backup", name, time.Now().Format("20060102_150405"))
		backupPath := filepath.Join(backupsPath, backupName)
		original, _ := os.ReadFile(filePath)
		os.WriteFile(backupPath, original, 0644)

		// 写入
		if err := os.WriteFile(filePath, []byte(req.Content), 0644); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		// 重载 nginx
		reloadCmd := exec.Command(nginxBin, "-s", "reload")
		reloadOutput, err := reloadCmd.CombinedOutput()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{
				"error":  "config saved but reload failed",
				"output": string(reloadOutput),
				"backup": backupName,
			})
		}

		return c.JSON(http.StatusOK, map[string]any{
			"message": "saved and reloaded",
			"backup":  backupName,
			"output":  string(reloadOutput),
		})
	}
}

// CreateServerHandler 创建新的服务器配置文件
func CreateServerHandler(path string) echo.HandlerFunc {
	return func(c echo.Context) error {
		var req struct {
			Name    string `json:"name"`
			Content string `json:"content"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]any{"error": "invalid request"})
		}

		// 验证文件名
		if req.Name == "" {
			return c.JSON(http.StatusBadRequest, map[string]any{"error": "name is required"})
		}

		// 确保文件名以 .conf 结尾
		fileName := req.Name
		if !strings.HasSuffix(fileName, ".conf") {
			fileName += ".conf"
		}

		// 验证文件名只包含安全字符
		if !isValidFileName(fileName) {
			return c.JSON(http.StatusBadRequest, map[string]any{"error": "invalid file name"})
		}

		filePath := filepath.Join(path, fileName)

		// 检查文件是否已存在
		if _, err := os.Stat(filePath); err == nil {
			return c.JSON(http.StatusConflict, map[string]any{"error": "file already exists"})
		}

		// 默认内容
		content := req.Content
		if content == "" {
			content = `server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
    }
}`
		}

		// 创建文件
		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		return c.JSON(http.StatusOK, map[string]any{
			"message": "file created",
			"name":    fileName,
			"path":    filePath,
		})
	}
}

// RenameServerHandler 重命名服务器配置文件
func RenameServerHandler(path string) echo.HandlerFunc {
	return func(c echo.Context) error {
		oldName := c.Param("name")
		var req struct {
			NewName string `json:"newName"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]any{"error": "invalid request"})
		}

		if req.NewName == "" {
			return c.JSON(http.StatusBadRequest, map[string]any{"error": "newName is required"})
		}

		// 确保新文件名以 .conf 结尾
		newFileName := req.NewName
		if !strings.HasSuffix(newFileName, ".conf") {
			newFileName += ".conf"
		}

		// 验证文件名只包含安全字符
		if !isValidFileName(newFileName) {
			return c.JSON(http.StatusBadRequest, map[string]any{"error": "invalid file name"})
		}

		oldPath := filepath.Join(path, oldName)
		newPath := filepath.Join(path, newFileName)

		// 检查旧文件是否存在
		if _, err := os.Stat(oldPath); os.IsNotExist(err) {
			return c.JSON(http.StatusNotFound, map[string]any{"error": "file not found"})
		}

		// 检查新文件名是否已存在
		if _, err := os.Stat(newPath); err == nil {
			return c.JSON(http.StatusConflict, map[string]any{"error": "target file already exists"})
		}

		// 重命名文件
		if err := os.Rename(oldPath, newPath); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		return c.JSON(http.StatusOK, map[string]any{
			"message": "file renamed",
			"oldName": oldName,
			"newName": newFileName,
		})
	}
}

// DeleteServerHandler 删除服务器配置文件
func DeleteServerHandler(path, backupsPath string) echo.HandlerFunc {
	return func(c echo.Context) error {
		name := c.Param("name")
		filePath := filepath.Join(path, name)

		// 检查文件是否存在
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			return c.JSON(http.StatusNotFound, map[string]any{"error": "file not found"})
		}

		// 创建备份
		backupName := fmt.Sprintf("%s.%s.backup", name, time.Now().Format("20060102_150405"))
		backupPath := filepath.Join(backupsPath, backupName)
		content, _ := os.ReadFile(filePath)
		os.WriteFile(backupPath, content, 0644)

		// 删除文件
		if err := os.Remove(filePath); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		return c.JSON(http.StatusOK, map[string]any{
			"message": "file deleted",
			"backup":  backupName,
		})
	}
}

// isValidFileName 验证文件名是否安全
func isValidFileName(name string) bool {
	if name == "" || name == "." || name == ".." {
		return false
	}
	// 只允许字母、数字、连字符、下划线和点
	for _, c := range name {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.') {
			return false
		}
	}
	return true
}
