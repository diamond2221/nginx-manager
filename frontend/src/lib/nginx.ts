import { LanguageSupport, StreamLanguage, StreamParser } from "@codemirror/language"
import { EditorView } from "@codemirror/view"

// NGINX directives and keywords organized by category
const nginxDirectives = [
  // Main context
  "user", "worker_processes", "error_log", "pid", "worker_rlimit_nofile",
  "worker_rlimit_core", "worker_priority", "worker_cpu_affinity", "daemon",
  "master_process", "timer_resolution", "working_directory", "env",
  // Events context
  "events", "worker_connections", "use", "accept_mutex", "accept_mutex_delay",
  "multi_accept", "debug_connection", "debug_points", "log_not_found",
  "open_file_cache", "open_file_cache_valid", "open_file_cache_min_uses",
  "open_file_cache_errors", "ignore_invalid_headers",
  // HTTP context
  "http", "include", "default_type", "types", "types_hash_bucket_size",
  "types_hash_max_size", "sendfile", "sendfile_max_chunk", "tcp_nopush",
  "tcp_nodelay", "keepalive_timeout", "keepalive_requests", "keepalive_disable",
  "lingering_close", "lingering_time", "lingering_timeout", "reset_timedout_connection",
  "client_body_buffer_size", "client_body_in_file_only", "client_body_in_single_buffer",
  "client_body_timeout", "client_header_buffer_size", "client_header_timeout",
  "client_max_body_size", "large_client_header_buffers", "send_timeout",
  "chunked_transfer_encoding", "gzip", "gzip_comp_level", "gzip_min_length",
  "gzip_buffers", "gzip_proxied", "gzip_vary", "gzip_disable", "gzip_http_version",
  "gzip_types", "gzip_static", "autoindex", "autoindex_exact_size",
  "autoindex_localtime", "autoindex_format", "log_format", "access_log",
  "open_log_file_cache", "server", "listen", "server_name", "server_name_in_redirect",
  "server_names_hash_bucket_size", "server_names_hash_max_size", "server_tokens",
  "location", "root", "alias", "index", "try_files", "return", "rewrite",
  "rewrite_log", "if", "set", "break", "location_match", "internal",
  "proxy_pass", "proxy_redirect", "proxy_set_header", "proxy_set_body",
  "proxy_hide_header", "proxy_ignore_headers", "proxy_intercept_errors",
  "proxy_connect_timeout", "proxy_send_timeout", "proxy_read_timeout",
  "proxy_buffer_size", "proxy_buffers", "proxy_busy_buffers_size",
  "proxy_temp_file_write_size", "proxy_cache", "proxy_cache_path",
  "proxy_cache_key", "proxy_cache_valid", "proxy_cache_bypass", "proxy_no_cache",
  "proxy_store", "proxy_store_access", "fastcgi_pass", "fastcgi_index",
  "fastcgi_param", "fastcgi_ignore_headers", "fastcgi_intercept_errors",
  "fastcgi_connect_timeout", "fastcgi_send_timeout", "fastcgi_read_timeout",
  "fastcgi_buffer_size", "fastcgi_buffers", "fastcgi_busy_buffers_size",
  "fastcgi_temp_file_write_size", "fastcgi_cache", "fastcgi_cache_path",
  "fastcgi_cache_key", "fastcgi_cache_valid", "fastcgi_cache_bypass",
  "fastcgi_store", "uwsgi_pass", "scgi_pass", "memcached_pass",
  "grpc_pass", "add_header", "add_before_body", "add_after_body",
  "expires", "etag", "if_modified_since", "try_files",
  "auth_basic", "auth_basic_user_file", "auth_request", "auth_request_set",
  "satisfy", "satisfy_any", "allow", "deny", "limit_except",
  "limit_conn", "limit_conn_zone", "limit_conn_status", "limit_rate",
  "limit_rate_after", "limit_req", "limit_req_zone", "limit_req_status",
  "upstream", "zone", "state", "least_conn", "ip_hash", "random",
  "hash", "keepalive", "keepalive_requests", "keepalive_timeout",
  "ntlm", "websocket", "ip_hash", "sticky", "sticky_cookie_insert",
  // SSL
  "ssl", "ssl_certificate", "ssl_certificate_key", "ssl_protocols",
  "ssl_ciphers", "ssl_prefer_server_ciphers", "ssl_session_cache",
  "ssl_session_timeout", "ssl_session_tickets", "ssl_stapling",
  "ssl_stapling_verify", "ssl_trusted_certificate", "ssl_verify_client",
  "ssl_verify_depth", "ssl_password_file", "ssl_ecdh_curve",
]

const nginxDirectivesSet = new Set(nginxDirectives.map(d => d.toLowerCase()))

// Block context markers (keywords)
const blockKeywords = new Set([
  "http", "events", "server", "location", "upstream", "if", "limit_except",
  "geo", "map", "types", "charset_map", "limit_zone", "split_client",
  "map_hash_bucket_size", "server_names_hash_bucket_size",
  "variables_hash_bucket_size",
])

const nginxParser: StreamParser<any> = {
  // Configure comment syntax for nginx (# is line comment)
  token(stream) {
    if (stream.eatSpace()) {
      return null
    }

    // Handle comments
    if (stream.peek() === "#") {
      stream.skipToEnd()
      return "comment"
    }

    // Track brace depth
    if (stream.match(/\{/)) {
      return "brace"
    }
    if (stream.match(/\}/)) {
      return "brace"
    }

    // Handle strings
    const nextChar = stream.peek()
    if (nextChar === '"' || nextChar === "'") {
      stream.next()
      while (stream.peek()) {
        if (stream.peek() === "\\" && stream.next() !== null) {
          // Skip the backslash and the escaped character
          if (stream.peek()) {
            stream.next()
          }
        } else if (stream.peek() === nextChar) {
          stream.next()
          break
        } else {
          stream.next()
        }
      }
      return "string"
    }

    // Handle numbers (including decimals and time units like 1s, 10m)
    if (stream.match(/^-?\d+\.?\d*([smhdwkyMg]?b?)?/)) {
      return "number"
    }

    // Handle variables ($var or ${var})
    if (stream.match(/\$[\w_]+/)) {
      return "variableName"
    }
    if (stream.match(/\$\{[\w_]+\}/)) {
      return "variableName"
    }

    // Handle directives/keywords
    if (stream.match(/[a-zA-Z_][\w_]*/)) {
      const word = stream.current().toLowerCase()

      // Check if it's a block keyword first
      if (blockKeywords.has(word)) {
        return "keyword"
      }

      // Check if it's a directive
      if (nginxDirectivesSet.has(word)) {
        return "propertyName"
      }

      return null
    }

    // Handle semicolons
    if (stream.match(/;/)) {
      return "punctuation"
    }

    stream.next()
    return null
  },
}

export const nginx = StreamLanguage.define(nginxParser)

/**
 * Nginx language support with comment tokens configuration
 * This enables toggle comment functionality (Cmd/Ctrl + /)
 */
export function nginxSupport() {
  return new LanguageSupport(nginx, [
    // Add language data extension for comment support
    nginx.data.of({
      commentTokens: { line: "#" },
    }),
  ])
}

/**
 * Syntax highlighting theme for nginx
 * StreamLanguage uses tok- prefix for token classes
 * Uses --editor-syn-* variables to avoid conflicts with global theme
 */
/**
 * Format nginx configuration content
 * - Proper indentation for blocks
 * - Consistent spacing
 * - Clean line breaks
 */
export function formatNginxConfig(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let indentLevel = 0
  const indentStr = '  ' // 2 spaces

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()

    // Skip empty lines but preserve one blank line between blocks
    if (line === '') {
      // Only add blank line if previous line wasn't blank and we're not at start
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('')
      }
      continue
    }

    // Check if line contains closing brace
    const hasClosingBrace = line.includes('}')
    const hasOpeningBrace = line.includes('{')

    // Decrease indent before closing brace
    if (hasClosingBrace && !hasOpeningBrace) {
      indentLevel = Math.max(0, indentLevel - 1)
    }

    // Handle lines with both opening and closing braces (e.g., "location / { }")
    if (hasClosingBrace && hasOpeningBrace) {
      // Check if closing comes before opening
      const closeIdx = line.indexOf('}')
      const openIdx = line.indexOf('{')
      if (closeIdx < openIdx) {
        indentLevel = Math.max(0, indentLevel - 1)
      }
    }

    // Format the line
    let formattedLine = line

    // Normalize spacing around braces
    formattedLine = formattedLine.replace(/\s*\{\s*/g, ' {')
    formattedLine = formattedLine.replace(/\s*\}\s*/g, '}')

    // Ensure space before opening brace
    formattedLine = formattedLine.replace(/(\S)\{/g, '$1 {')

    // Handle standalone closing brace
    if (formattedLine === '}') {
      result.push(indentStr.repeat(indentLevel) + '}')
    } else {
      result.push(indentStr.repeat(indentLevel) + formattedLine)
    }

    // Increase indent after opening brace (if not also closing on same line)
    if (hasOpeningBrace) {
      const openCount = (line.match(/\{/g) || []).length
      const closeCount = (line.match(/\}/g) || []).length
      indentLevel += openCount - closeCount
      indentLevel = Math.max(0, indentLevel)
    }
  }

  // Remove trailing empty lines and ensure single newline at end
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop()
  }

  return result.join('\n') + '\n'
}

export const nginxHighlightStyle = EditorView.theme({
  // Comments (# comment)
  "& .tok-comment": {
    color: "var(--editor-syn-comment, var(--syn-comment))",
    fontStyle: "italic",
  },
  // Keywords (block markers like http, server, location)
  "& .tok-keyword": {
    color: "var(--editor-syn-keyword, var(--syn-keyword))",
    fontWeight: "600",
  },
  // Property names (directives)
  "& .tok-propertyName": {
    color: "var(--editor-syn-directive, var(--syn-directive))",
  },
  // Strings
  "& .tok-string": {
    color: "var(--editor-syn-string, var(--syn-string))",
  },
  // Numbers
  "& .tok-number": {
    color: "var(--editor-syn-number, var(--syn-number))",
  },
  // Variables ($var)
  "& .tok-variableName": {
    color: "var(--editor-syn-variable, var(--syn-variable))",
  },
  // Braces
  "& .tok-brace": {
    color: "var(--editor-syn-operator, var(--syn-operator))",
  },
  // Punctuation (semicolons)
  "& .tok-punctuation": {
    color: "var(--editor-syn-operator, var(--syn-operator))",
  },
}, { dark: false })
