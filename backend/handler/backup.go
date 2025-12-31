package handler

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

func ListBackupsHandler(path string) echo.HandlerFunc {
	return func(c echo.Context) error {
		entries, err := os.ReadDir(path)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		var backups []map[string]any
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(e.Name(), ".backup") {
				info, _ := e.Info()
				backups = append(backups, map[string]any{
					"name":    e.Name(),
					"size":    info.Size(),
					"created": info.ModTime().Format(time.RFC3339),
				})
			}
		}
		slices.SortFunc(backups, func(a, b map[string]any) int {
			return strings.Compare(b["name"].(string), a["name"].(string))
		})
		return c.JSON(http.StatusOK, map[string]any{"backups": backups})
	}
}

func CreateBackupHandler(configPath, backupsPath string) echo.HandlerFunc {
	return func(c echo.Context) error {
		backupName := fmt.Sprintf("nginx.conf.%s.backup", time.Now().Format("20060102_150405"))
		backupPath := filepath.Join(backupsPath, backupName)

		content, err := os.ReadFile(configPath)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		if err := os.WriteFile(backupPath, content, 0644); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		return c.JSON(http.StatusOK, map[string]any{
			"message": "backup created",
			"name":    backupName,
		})
	}
}

func RestoreBackupHandler(configPath, backupsPath, nginxBin string) echo.HandlerFunc {
	return func(c echo.Context) error {
		name := c.Param("name")
		backupPath := filepath.Join(backupsPath, name)

		content, err := os.ReadFile(backupPath)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": "backup not found"})
		}

		if err := os.WriteFile(configPath, content, 0644); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}

		// 测试并重载
		cmd := exec.Command(nginxBin, "-t")
		output, _ := cmd.CombinedOutput()

		return c.JSON(http.StatusOK, map[string]any{
			"message": "restored",
			"output":  string(output),
		})
	}
}

func DeleteBackupHandler(backupsPath string) echo.HandlerFunc {
	return func(c echo.Context) error {
		name := c.Param("name")
		backupPath := filepath.Join(backupsPath, name)

		if err := os.Remove(backupPath); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]any{"error": "failed to delete backup"})
		}

		return c.JSON(http.StatusOK, map[string]any{
			"message": "backup deleted",
			"name":    name,
		})
	}
}
