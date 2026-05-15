<script setup>
import { ref, watch, onMounted } from 'vue'
import { renderMarkdown } from './composables/useMarkdown'
import { copyHtmlToClipboard } from './composables/useClipboard'
import { prepareForLark } from './utils/larkCompat'

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
const showToast = ref(false)
const toastMessage = ref('')

let debounceTimer = null

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

watch(markdownInput, (newValue) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(updatePreview, 500)
})

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

const notify = (msg, isError = false) => {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      MD to Lark
    </div>
    <div class="actions">
      <label class="btn btn-outline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Open .md
        <input type="file" accept=".md" @change="handleFileUpload" style="display: none;">
      </label>
      <button class="btn btn-outline" @click="updatePreview" :disabled="isRendering">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6"></path>
          <path d="M1 20v-6h6"></path>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </button>
      <button class="btn btn-primary" @click="handleCopyToLark">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy to Lark
      </button>
    </div>
  </header>

  <main class="main-content">
    <section class="pane">
      <div class="pane-header">Markdown Editor</div>
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
      <div class="pane-header">Preview (Ready to Copy)</div>
      <div class="preview-container">
        <div class="markdown-body" v-html="renderedHtml"></div>
      </div>
    </section>
  </main>

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
