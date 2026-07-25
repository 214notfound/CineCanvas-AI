/**
 * Split a data URL into mime type + raw base64 payload for Gemini inline_data.
 * Expects: data:image/jpeg;base64,....
 */
export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl)
  if (!match) {
    throw new Error('图片 data URL 格式无效，期望 data:<mime>;base64,...')
  }
  return { mimeType: match[1], data: match[2] }
}

/**
 * Strip markdown fences the model often adds despite being told not to.
 * Handles ```json ... ``` and bare ``` ... ```, including trailing fences.
 */
export function stripJsonFences(text: string): string {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(cleaned.trim())
  if (fenced) cleaned = fenced[1]
  return cleaned.trim()
}
