import { EditorView } from "@codemirror/view"

export interface EditorTheme {
  id: string
  name: string
  description: string
  // Dark/Light mode syntax colors
  dark: EditorThemeColors
  light: EditorThemeColors
}

export interface EditorThemeColors {
  keyword: string      // Block markers: http, server, location
  directive: string    // Nginx directives
  string: string       // String values
  comment: string      // Comments
  variable: string     // Variables ($var)
  number: string       // Numbers
  operator: string     // Braces, semicolons
}

// Nord theme - arctic, north-bluish color palette
export const nordTheme: EditorTheme = {
  id: "nord",
  name: "Nord",
  description: "北极风蓝色调，舒缓优雅",
  dark: {
    keyword: "#81a1c1",     // Frost 4
    directive: "#88c0d0",   // Frost 3
    string: "#a3be8c",      // Aurora 3
    comment: "#616e88",     // Polar 3
    variable: "#8fbcbb",    // Frost 2
    number: "#b48ead",      // Aurora 5
    operator: "#81a1c1",    // Frost 4
  },
  light: {
    keyword: "#3b526d",     // Darkened frost
    directive: "#356780",
    string: "#5d7a52",
    comment: "#616e88",
    variable: "#2e5c5a",
    number: "#765c7d",
    operator: "#3b526d",
  },
}

// Dracula theme - popular dark theme
export const draculaTheme: EditorTheme = {
  id: "dracula",
  name: "Dracula",
  description: "经典的暗色调主题，高对比度",
  dark: {
    keyword: "#ff79c6",     // Pink
    directive: "#50fa7b",   // Green
    string: "#f1fa8c",      // Yellow
    comment: "#6272a4",     // Comment
    variable: "#8be9fd",    // Cyan
    number: "#bd93f9",      // Purple
    operator: "#ff79c6",    // Pink
  },
  light: {
    keyword: "#d63384",
    directive: "#22863a",
    string: "#b08800",
    comment: "#6a737d",
    variable: "#005cc5",
    number: "#6f42c1",
    operator: "#d63384",
  },
}

// GitHub theme - clean and modern
export const githubTheme: EditorTheme = {
  id: "github",
  name: "GitHub",
  description: "GitHub 风格，清新简洁",
  dark: {
    keyword: "#ff7b72",     // Red
    directive: "#79c0ff",   // Blue
    string: "#a5d6ff",      // Light blue
    comment: "#8b949e",     // Gray
    variable: "#ffa657",    // Orange
    number: "#79c0ff",      // Blue
    operator: "#ff7b72",    // Red
  },
  light: {
    keyword: "#d73a49",
    directive: "#0366d6",
    string: "#032f62",
    comment: "#6a737d",
    variable: "#e36209",
    number: "#005cc5",
    operator: "#d73a49",
  },
}

// Monokai theme - classic vibrant colors
export const monokaiTheme: EditorTheme = {
  id: "monokai",
  name: "Monokai",
  description: "经典 Monokai，色彩鲜艳",
  dark: {
    keyword: "#f92672",     // Pink/Red
    directive: "#a6e22e",   // Green
    string: "#e6db74",      // Yellow
    comment: "#75715e",     // Gray
    variable: "#66d9ef",    // Cyan
    number: "#ae81ff",      // Purple
    operator: "#f92672",    // Pink/Red
  },
  light: {
    keyword: "#a71d5d",
    directive: "#3e999f",
    string: "#977800",
    comment: "#75715e",
    variable: "#21889b",
    number: "#8959a8",
    operator: "#a71d5d",
  },
}

// One Dark theme - Atom's default dark theme
export const oneDarkTheme: EditorTheme = {
  id: "one-dark",
  name: "One Dark",
  description: "Atom One Dark，现代感强",
  dark: {
    keyword: "#c678dd",     // Purple
    directive: "#61afef",   // Blue
    string: "#98c379",      // Green
    comment: "#5c6370",     // Gray
    variable: "#e06c75",    // Red
    number: "#d19a66",      // Orange
    operator: "#56b6c2",    // Cyan
  },
  light: {
    keyword: "#a626a4",
    directive: "#4078f2",
    string: "#50a14f",
    comment: "#a0a1a7",
    variable: "#e45649",
    number: "#986801",
    operator: "#0084bc",
  },
}

// Solarized theme - precision colors for readability
export const solarizedTheme: EditorTheme = {
  id: "solarized",
  name: "Solarized",
  description: "Solarized 精心调配的色彩",
  dark: {
    keyword: "#6c71c4",     // Blue-violet
    directive: "#2aa198",   // Cyan
    string: "#859900",      // Green
    comment: "#586e75",     // Base01
    variable: "#b58900",    // Yellow
    number: "#d33682",      // Magenta
    operator: "#6c71c4",    // Blue-violet
  },
  light: {
    keyword: "#268bd2",
    directive: "#2aa198",
    string: "#859900",
    comment: "#93a1a1",
    variable: "#b58900",
    number: "#d33682",
    operator: "#268bd2",
  },
}

// VSCode Dark+ theme - VSCode's default dark theme
export const vscodeTheme: EditorTheme = {
  id: "vscode",
  name: "VSCode Dark+",
  description: "VSCode 默认深色主题",
  dark: {
    keyword: "#569cd6",     // Blue
    directive: "#9cdcfe",   // Light blue
    string: "#ce9178",      // Orange/brown
    comment: "#6a9955",     // Green
    variable: "#4fc1ff",    // Cyan
    number: "#b5cea8",      // Light green
    operator: "#d4d4d4",    // White/gray
  },
  light: {
    keyword: "#0000ff",
    directive: "#001080",
    string: "#a31515",
    comment: "#008000",
    variable: "#098658",
    number: "#098658",
    operator: "#000000",
  },
}

export const editorThemes: EditorTheme[] = [
  nordTheme,
  draculaTheme,
  githubTheme,
  monokaiTheme,
  oneDarkTheme,
  solarizedTheme,
  vscodeTheme,
]

export function getEditorTheme(id: string): EditorTheme {
  return editorThemes.find((t) => t.id === id) || nordTheme
}

/**
 * Create CodeMirror theme from editor theme colors
 */
export function createEditorHighlightTheme(
  colors: EditorThemeColors
) {
  return EditorView.theme({
    // Comments (# comment)
    "& .tok-comment": {
      color: colors.comment,
      fontStyle: "italic",
    },
    // Keywords (block markers like http, server, location)
    "& .tok-keyword": {
      color: colors.keyword,
      fontWeight: "600",
    },
    // Property names (directives)
    "& .tok-propertyName": {
      color: colors.directive,
    },
    // Strings
    "& .tok-string": {
      color: colors.string,
    },
    // Numbers
    "& .tok-number": {
      color: colors.number,
    },
    // Variables ($var)
    "& .tok-variableName": {
      color: colors.variable,
    },
    // Braces
    "& .tok-brace": {
      color: colors.operator,
    },
    // Punctuation (semicolons)
    "& .tok-punctuation": {
      color: colors.operator,
    },
  }, {
    // Use dark: false to prevent auto theme switching
    dark: false
  })
}
