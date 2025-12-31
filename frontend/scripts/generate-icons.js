/**
 * 图标生成脚本
 * 使用方法: node scripts/generate-icons.js
 *
 * 此脚本需要安装 sharp:
 * npm install --save-dev sharp
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取 SVG 文件
const svgPath = path.join(__dirname, '../public/icon.svg')

// PNG 图标尺寸
const sizes = [192, 512]

// 生成 PNG 图标
async function generateIcons() {
  const publicDir = path.join(__dirname, '../public')

  for (const size of sizes) {
    const pngPath = path.join(publicDir, `icon-${size}x${size}.png`)

    // 使用 sharp 转换 SVG 到 PNG
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(pngPath)

    console.log(`✓ Generated: icon-${size}x${size}.png`)
  }

  console.log('\n✨ All icons generated successfully!')
}

generateIcons().catch(console.error)
