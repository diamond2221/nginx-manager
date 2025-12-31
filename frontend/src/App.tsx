import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"
import { MainConfig } from "@/pages/MainConfig"
import { Servers } from "@/pages/Servers"
import { Backups } from "@/pages/Backups"

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<MainConfig />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/backups" element={<Backups />} />
        </Routes>
      </Layout>
      <PWAInstallPrompt />
    </BrowserRouter>
  )
}
