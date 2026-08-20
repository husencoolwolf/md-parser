<script setup>
import { ref, watch, onMounted } from 'vue'
import { renderMarkdown } from './composables/useMarkdown'
import { copyHtmlToClipboard } from './composables/useClipboard'
import { convertHtmlToMarkdown } from './composables/useHtmlToMarkdown'
import { prepareForLark } from './utils/larkCompat'

// Application Mode: 'md-to-lark' | 'lark-to-md'
const currentMode = ref('md-to-lark')

// --- State for Markdown -> Lark Mode ---
const markdownInput = ref(`# Welcome to MD to Lark! 🚀

This app helps you create beautiful Lark documents with **Mermaid diagram** support.

## How to Use
1. Write markdown in the left pane.
2. See the live preview in the right pane.
3. Click **"Copy to Lark"** to copy formatted content to your clipboard.
4. Paste (Cmd+V) into your Lark document.

## Mermaid Example
\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Check console]
\`\`\`

## Table Example
| Feature | Status |
| --- | --- |
| Markdown | ✅ |
| Mermaid | ✅ |
| Copy to Lark | ✅ |
`)

const renderedHtml = ref('')
const isRendering = ref(false)

// --- State for Lark -> Markdown Mode ---
const larkPasteRef = ref(null)
const convertedMarkdown = ref('')
const isConverting = ref(false)

// --- Common UI State ---
const showToast = ref(false)
const toastMessage = ref('')
let debounceTimer = null

/**
 * Updates the live Markdown to HTML preview.
 * @returns {Promise<void>}
 */
const updatePreview = async () => {
  isRendering.value = true
  try {
    const html = await renderMarkdown(markdownInput.value)
    renderedHtml.value = html
  } catch (err) {
    console.error('Rendering error:', err)
  } finally {
    isRendering.value = false
  }
}

watch(markdownInput, () => {
  if (currentMode.value === 'md-to-lark') {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(updatePreview, 500)
  }
})

/**
 * Handles copying rendered rich HTML to clipboard for Lark.
 * @returns {Promise<void>}
 */
const handleCopyToLark = async () => {
  isRendering.value = true
  try {
    const larkHtml = await renderMarkdown(markdownInput.value, true)
    const compatibleHtml = prepareForLark(larkHtml)
    await copyHtmlToClipboard(compatibleHtml)
    notify('Successfully copied to clipboard!')
  } catch (err) {
    console.error('Copy to Lark failed:', err)
    notify('Failed to copy rich text. Please try again.', true)
  } finally {
    isRendering.value = false
  }
}

/**
 * Handles pasting rich content from Lark into the Lark-to-Markdown zone.
 * @param {ClipboardEvent} event - The paste event object.
 */
const handleLarkPaste = (event) => {
  event.preventDefault()
  isConverting.value = true

  const clipboardData = event.clipboardData || window.clipboardData
  const htmlData = clipboardData.getData('text/html')
  const plainText = clipboardData.getData('text/plain')

  // Set visual content in contenteditable paste box
  if (larkPasteRef.value) {
    larkPasteRef.value.innerHTML = htmlData || plainText.replace(/\n/g, '<br>')
  }

  // Convert HTML or plain text fallback to Markdown
  const sourceToConvert = htmlData || plainText
  convertedMarkdown.value = convertHtmlToMarkdown(sourceToConvert)
  isConverting.value = false
  notify('Converted from Lark Docs!')
}

/**
 * Handles manual input or typing in the Lark paste box.
 */
const handleLarkInput = () => {
  if (!larkPasteRef.value) return
  const html = larkPasteRef.value.innerHTML
  convertedMarkdown.value = convertHtmlToMarkdown(html)
}

/**
 * Clears the Lark input area and generated Markdown.
 */
const handleClearLarkInput = () => {
  if (larkPasteRef.value) {
    larkPasteRef.value.innerHTML = ''
  }
  convertedMarkdown.value = ''
  notify('Cleared Lark input')
}

/**
 * Copies the converted Markdown text to clipboard.
 * @returns {Promise<void>}
 */
const handleCopyMarkdown = async () => {
  if (!convertedMarkdown.value) {
    notify('Nothing to copy', true)
    return
  }

  try {
    await navigator.clipboard.writeText(convertedMarkdown.value)
    notify('Markdown copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy markdown:', err)
    notify('Failed to copy text', true)
  }
}

/**
 * Downloads the converted Markdown content as a `.md` file.
 */
const handleDownloadMarkdown = () => {
  if (!convertedMarkdown.value) {
    notify('No markdown content to download', true)
    return
  }

  const blob = new Blob([convertedMarkdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'lark-exported-doc.md'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  notify('Downloaded .md file!')
}

/**
 * Displays a temporary toast message.
 * @param {string} msg - Message text.
 * @param {boolean} isError - Whether the message is an error.
 */
const notify = (msg, isError = false) => {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

/**
 * Handles `.md` file upload for Markdown -> Lark mode.
 * @param {Event} event - File input change event.
 */
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    markdownInput.value = e.target.result
  }
  reader.readAsText(file)
}

onMounted(() => {
  updatePreview()
})
</script>

<template>
  <header class="app-header">
    <div class="logo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      MD & Lark Bridge
    </div>

    <!-- Mode Selector Tabs -->
    <div class="mode-switcher">
      <button
        class="mode-tab"
        :class="{ active: currentMode === 'md-to-lark' }"
        @click="currentMode = 'md-to-lark'"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="13 17 18 12 13 7"></polyline>
          <polyline points="6 17 11 12 6 7"></polyline>
        </svg>
        Markdown &rarr; Lark
      </button>
      <button
        class="mode-tab"
        :class="{ active: currentMode === 'lark-to-md' }"
        @click="currentMode = 'lark-to-md'"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="11 17 6 12 11 7"></polyline>
          <polyline points="18 17 13 12 18 7"></polyline>
        </svg>
        Lark &rarr; Markdown
      </button>
    </div>

    <!-- Actions for Mode: Markdown -> Lark -->
    <div v-if="currentMode === 'md-to-lark'" class="actions">
      <label class="btn btn-outline" title="Open .md file from disk">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Open .md
        <input type="file" accept=".md,.markdown,.txt" @change="handleFileUpload" style="display: none;">
      </label>
      <button class="btn btn-outline" @click="updatePreview" :disabled="isRendering" title="Refresh preview">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6"></path>
          <path d="M1 20v-6h6"></path>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </button>
      <button class="btn btn-primary" @click="handleCopyToLark" :disabled="isRendering">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy to Lark
      </button>
    </div>

    <!-- Actions for Mode: Lark -> Markdown -->
    <div v-else class="actions">
      <button class="btn btn-outline" @click="handleClearLarkInput" title="Clear paste box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        Clear
      </button>
      <button class="btn btn-outline" @click="handleDownloadMarkdown" :disabled="!convertedMarkdown" title="Download as .md file">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download .md
      </button>
      <button class="btn btn-primary" @click="handleCopyMarkdown" :disabled="!convertedMarkdown">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy Markdown
      </button>
    </div>
  </header>

  <!-- Informational banner for Lark -> Markdown mode -->
  <div v-if="currentMode === 'lark-to-md'" class="info-banner">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
    <span>Copy any content from your Lark Doc (Cmd+C), then click the left box and paste (Cmd+V).</span>
  </div>

  <!-- Main Split Pane Layout -->
  <main class="main-content">
    <!-- MODE 1: Markdown -> Lark -->
    <template v-if="currentMode === 'md-to-lark'">
      <section class="pane">
        <div class="pane-header">
          <span>Markdown Editor</span>
          <span class="pane-header-hint">Supports Mermaid</span>
        </div>
        <div class="editor-container">
          <textarea
            v-model="markdownInput"
            class="markdown-editor"
            placeholder="Write your markdown here..."
          ></textarea>
          <div v-if="isRendering" class="loading-overlay">
            <div class="spinner"></div>
          </div>
        </div>
      </section>

      <section class="pane">
        <div class="pane-header">
          <span>Preview (Ready to Copy)</span>
          <span class="pane-header-hint">Rich HTML</span>
        </div>
        <div class="preview-container">
          <div class="markdown-body" v-html="renderedHtml"></div>
        </div>
      </section>
    </template>

    <!-- MODE 2: Lark -> Markdown -->
    <template v-else>
      <section class="pane">
        <div class="pane-header">
          <span>Lark Paste Area</span>
          <span class="pane-header-hint">Paste rich text here (Cmd+V)</span>
        </div>
        <div class="editor-container">
          <div
            ref="larkPasteRef"
            class="lark-paste-box"
            contenteditable="true"
            data-placeholder="Paste (Cmd+V / Ctrl+V) rich content copied from Lark Docs here..."
            @paste="handleLarkPaste"
            @input="handleLarkInput"
          ></div>
        </div>
      </section>

      <section class="pane">
        <div class="pane-header">
          <span>Converted Markdown</span>
          <span class="pane-header-hint">GFM Output</span>
        </div>
        <div class="editor-container">
          <textarea
            v-model="convertedMarkdown"
            class="markdown-editor"
            placeholder="Generated markdown will appear here automatically..."
          ></textarea>
        </div>
      </section>
    </template>
  </main>

  <!-- Toast Notification -->
  <div v-if="showToast" class="toast">
    {{ toastMessage }}
  </div>
</template>

<style scoped>
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
