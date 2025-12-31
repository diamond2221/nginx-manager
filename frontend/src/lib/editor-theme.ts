import { keymap, highlightSpecialChars, drawSelection, lineNumbers, highlightActiveLineGutter, rectangularSelection, crosshairCursor } from "@codemirror/view"
import { Compartment, Extension } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap, toggleLineComment } from "@codemirror/commands"
import { indentOnInput, bracketMatching, foldGutter, foldKeymap } from "@codemirror/language"
import { closeBrackets, autocompletion, completionKeymap } from "@codemirror/autocomplete"
import { highlightSelectionMatches } from "@codemirror/search"
import { StreamLanguage, LanguageSupport } from "@codemirror/language"
import { tags } from "@lezer/highlight"
import { createTheme } from "@uiw/codemirror-themes"

// Theme color maps with dark/light variants
const themes: Record<string, { dark: Record<string, string>; light: Record<string, string> }> = {
  nord: { dark: { keyword: "#81a1c1", directive: "#88c0d0", string: "#a3be8c", comment: "#616e88", variable: "#8fbcbb", number: "#b48ead", operator: "#81a1c1" }, light: { keyword: "#3b526d", directive: "#356780", string: "#5d7a52", comment: "#616e88", variable: "#2e5c5a", number: "#765c7d", operator: "#3b526d" } },
  dracula: { dark: { keyword: "#ff79c6", directive: "#50fa7b", string: "#f1fa8c", comment: "#6272a4", variable: "#8be9fd", number: "#bd93f9", operator: "#ff79c6" }, light: { keyword: "#d63384", directive: "#22863a", string: "#b08800", comment: "#6a737d", variable: "#005cc5", number: "#6f42c1", operator: "#d63384" } },
  github: { dark: { keyword: "#ff7b72", directive: "#79c0ff", string: "#a5d6ff", comment: "#8b949e", variable: "#ffa657", number: "#79c0ff", operator: "#ff7b72" }, light: { keyword: "#d73a49", directive: "#0366d6", string: "#032f62", comment: "#6a737d", variable: "#e36209", number: "#005cc5", operator: "#d73a49" } },
  monokai: { dark: { keyword: "#f92672", directive: "#a6e22e", string: "#e6db74", comment: "#75715e", variable: "#66d9ef", number: "#ae81ff", operator: "#f92672" }, light: { keyword: "#a71d5d", directive: "#3e999f", string: "#977800", comment: "#75715e", variable: "#21889b", number: "#8959a8", operator: "#a71d5d" } },
  "one-dark": { dark: { keyword: "#c678dd", directive: "#61afef", string: "#98c379", comment: "#5c6370", variable: "#e06c75", number: "#d19a66", operator: "#56b6c2" }, light: { keyword: "#a626a4", directive: "#4078f2", string: "#50a14f", comment: "#a0a1a7", variable: "#e45649", number: "#986801", operator: "#0084bc" } },
  solarized: { dark: { keyword: "#6c71c4", directive: "#2aa198", string: "#859900", comment: "#586e75", variable: "#b58900", number: "#d33682", operator: "#6c71c4" }, light: { keyword: "#268bd2", directive: "#2aa198", string: "#859900", comment: "#93a1a1", variable: "#b58900", number: "#d33682", operator: "#268bd2" } },
  vscode: { dark: { keyword: "#569cd6", directive: "#9cdcfe", string: "#ce9178", comment: "#6a9955", variable: "#4fc1ff", number: "#b5cea8", operator: "#d4d4d4" }, light: { keyword: "#0000ff", directive: "#001080", string: "#a31515", comment: "#008000", variable: "#098658", number: "#098658", operator: "#000000" } },
}

// Nginx parser - minimal version without highlighting
const nginxParser = {
  token(stream: any) {
    if (stream.eatSpace()) return null
    if (stream.peek() === "#") {
      stream.skipToEnd()
      return "comment"
    }
    if (stream.match(/\{|\}/)) return "brace"
    if (stream.match(/["']/)) {
      while (stream.peek()) {
        if (stream.peek() === "\\" && stream.next()) stream.next()
        else if (stream.peek() === stream.current()) { stream.next(); break }
        else stream.next()
      }
      return "string"
    }
    if (stream.match(/\d+/)) return "number"
    if (stream.match(/\$\w+/)) return "variableName"
    if (stream.match(/[a-zA-Z_][\w:]*/)) {
      const w = stream.current().toLowerCase()
      if (["http", "server", "location", "events", "upstream", "if", "limit_except"].includes(w)) return "keyword"
      return "propertyName"
    }
    if (stream.match(/;/)) return "punctuation"
    stream.next()
    return null
  }
}

const nginxLang = StreamLanguage.define(nginxParser)

function nginxSupport(): LanguageSupport {
  return new LanguageSupport(nginxLang, [
    nginxLang.data.of({ commentTokens: { line: "#" } }),
    // Map parser token names to CodeMirror tags
    nginxLang.data.of({
      keyword: tags.keyword,
      propertyName: tags.name,
      comment: tags.comment,
      string: tags.string,
      number: tags.number,
      variableName: tags.variableName,
      brace: tags.brace,
      punctuation: tags.punctuation,
    }),
  ])
}

// Compartment for dynamic theme reconfiguration
const themeCompartment = new Compartment()
const baseExtensionsCompartment = new Compartment()

export { themeCompartment, baseExtensionsCompartment }

// Create base extensions (without theme)
export function createBaseExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    foldGutter(),
    rectangularSelection(),
    crosshairCursor(),
    highlightSelectionMatches({ highlightWordAroundCursor: true }),
    indentOnInput(),
    bracketMatching({ afterCursor: true }),
    closeBrackets(),
    autocompletion(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap]),
    keymap.of([{ key: "Mod-/", run: toggleLineComment }]),
    nginxSupport(),
  ]
}

// Create a complete theme for the editor
export function createEditorTheme(themeId: string, isDark: boolean): Extension {
  const theme = themes[themeId] || themes.nord
  const colors = isDark ? theme.dark : theme.light

  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: "transparent",
      foreground: "var(--text-primary)",
      caret: "var(--accent)",
      selection: "var(--accent-subtle)",
      gutterBackground: "transparent",
      gutterForeground: "var(--text-muted)",
    },
    styles: [
      { tag: tags.comment, color: colors.comment, fontStyle: "italic" },
      { tag: tags.keyword, color: colors.keyword, fontWeight: "bold" },
      { tag: tags.name, color: colors.directive },
      { tag: tags.string, color: colors.string },
      { tag: tags.number, color: colors.number },
      { tag: tags.variableName, color: colors.variable },
      { tag: tags.brace, color: colors.operator },
      { tag: tags.punctuation, color: colors.operator },
    ],
  })
}

// Reconfigure editor theme
export function configureTheme(themeId: string, isDark: boolean): Extension {
  const theme = createEditorTheme(themeId, isDark)
  return themeCompartment.of(theme)
}

// Get theme colors for current theme
export function getThemeColors(themeId: string, isDark: boolean) {
  const theme = themes[themeId] || themes.nord
  return isDark ? theme.dark : theme.light
}
