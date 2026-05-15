/**
 * Writes rich HTML to the clipboard.
 * @param {string} htmlContent - The HTML to copy.
 * @returns {Promise<void>}
 */
export async function copyHtmlToClipboard(htmlContent) {
  try {
    const type = 'text/html'
    const blob = new Blob([htmlContent], { type })
    const data = [new ClipboardItem({ [type]: blob })]
    
    await navigator.clipboard.write(data)
  } catch (err) {
    console.error('Failed to copy rich text:', err)
    // Fallback to plain text if HTML copy fails
    await navigator.clipboard.writeText(htmlContent)
    throw new Error('Rich text copy failed, copied as plain HTML/text instead.')
  }
}
