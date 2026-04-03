'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-blue-500 hover:underline ml-4 flex-shrink-0 transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}