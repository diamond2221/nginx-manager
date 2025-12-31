const API_BASE = "/api"

export interface ConfigResponse {
  content: string
  path: string
}

export interface Server {
  name: string
  path: string
  size: number
  updated: number
}

export interface ServerResponse {
  name: string
  content: string
  path: string
}

export interface Backup {
  name: string
  size: number
  created: string
}

export interface ApiResponse {
  error?: string
  message?: string
  name?: string
  newName?: string
  path?: string
  backup?: string
  output?: string
  [key: string]: unknown
}

export interface NginxStatusResponse {
  running: boolean
  pids: string[]
}

async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  if (!res.ok) {
    const data = await res.json()
    const errorMsg = data.output || data.error || "Request failed"
    throw new Error(errorMsg)
  }
  return res.json()
}

export const api = {
  // Config
  getConfig: () => request<ConfigResponse>("/config"),
  saveConfig: (content: string) =>
    request<ApiResponse>("/config", {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  testConfig: () =>
    request<ApiResponse>("/config/test", { method: "POST" }),
  reloadConfig: () =>
    request<ApiResponse>("/config/reload", { method: "POST" }),

  // Nginx control
  getNginxStatus: () =>
    request<NginxStatusResponse>("/nginx/status"),
  startNginx: () =>
    request<ApiResponse>("/nginx/start", { method: "POST" }),
  stopNginx: () =>
    request<ApiResponse>("/nginx/stop", { method: "POST" }),
  restartNginx: () =>
    request<ApiResponse>("/nginx/restart", { method: "POST" }),

  // Servers
  getServers: () => request<{ servers: Server[] }>("/servers"),
  getServer: (name: string) =>
    request<ServerResponse>(`/servers/${name}`),
  saveServer: (name: string, content: string) =>
    request<ApiResponse>(`/servers/${name}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  createServer: (name: string, content?: string) =>
    request<ApiResponse>("/servers", {
      method: "POST",
      body: JSON.stringify({ name, content }),
    }),
  renameServer: (oldName: string, newName: string) =>
    request<ApiResponse>(`/servers/${oldName}`, {
      method: "PATCH",
      body: JSON.stringify({ newName }),
    }),
  deleteServer: (name: string) =>
    request<ApiResponse>(`/servers/${name}`, {
      method: "DELETE",
    }),

  // Backups
  getBackups: () => request<{ backups: Backup[] }>("/backups"),
  createBackup: () =>
    request<ApiResponse>("/backups", { method: "POST" }),
  restoreBackup: (name: string) =>
    request<ApiResponse>(`/backups/${name}/restore`, {
      method: "POST",
    }),
  deleteBackup: (name: string) =>
    request<ApiResponse>(`/backups/${name}`, {
      method: "DELETE",
    }),
}
