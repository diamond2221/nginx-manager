package main

import (
	"log"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/zhangyu/nginx-app/backend/handler"
)

func main() {
	// 配置
	configPath := "/opt/homebrew/etc/nginx/nginx.conf"
	serversPath := "/opt/homebrew/etc/nginx/servers"
	backupsPath := "./backups"
	nginxBin := "/opt/homebrew/bin/nginx"

	os.MkdirAll(backupsPath, 0755)

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// 路由
	e.GET("/api/health", healthHandler)

	// 配置相关
	e.GET("/api/config", handler.ConfigHandler(configPath))
	e.PUT("/api/config", handler.SaveConfigHandler(configPath, backupsPath, nginxBin))
	e.POST("/api/config/test", handler.TestConfigHandler(configPath, nginxBin))
	e.POST("/api/config/reload", handler.ReloadConfigHandler(configPath, nginxBin))
	e.GET("/api/nginx/status", handler.NginxStatusHandler())
	e.POST("/api/nginx/start", handler.NginxControlHandler("start", nginxBin))
	e.POST("/api/nginx/stop", handler.NginxControlHandler("stop", nginxBin))
	e.POST("/api/nginx/restart", handler.NginxControlHandler("restart", nginxBin))

	// 服务器列表
	e.GET("/api/servers", handler.ServersHandler(serversPath))
	e.GET("/api/servers/:name", handler.GetServerHandler(serversPath))
	e.PUT("/api/servers/:name", handler.SaveServerHandler(serversPath, backupsPath, nginxBin))
	e.POST("/api/servers", handler.CreateServerHandler(serversPath))
	e.PATCH("/api/servers/:name", handler.RenameServerHandler(serversPath))
	e.DELETE("/api/servers/:name", handler.DeleteServerHandler(serversPath, backupsPath))

	// 备份 - 注意：具体路由要放在通配符路由之前
	e.GET("/api/backups", handler.ListBackupsHandler(backupsPath))
	e.POST("/api/backups", handler.CreateBackupHandler(configPath, backupsPath))
	e.POST("/api/backups/:name/restore", handler.RestoreBackupHandler(configPath, backupsPath, nginxBin))
	e.DELETE("/api/backups/:name", handler.DeleteBackupHandler(backupsPath))

	log.Println("Server running on http://localhost:49856")
	log.Fatal(e.Start(":49856"))
}

func healthHandler(c echo.Context) error {
	return c.JSON(200, map[string]any{"status": "ok"})
}
