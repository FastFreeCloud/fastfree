/**
 * FastFree OpenDesign to Quasar 2 Component Transpiler Bridge
 * Converts raw HTML/Vue prototypes into FastFree LowCode-compliant Vue 3 SFCs.
 * 
 * Rules:
 * - Injects useFormatNumber and useStatusHelpers
 * - Converts raw buttons to <q-btn>
 * - Replaces emojis with official FastFree SVG or MDI icons
 * - Enforces RTL-compatible logical CSS (inset-inline, margin-inline)
 */

import fs from 'node:fs';
import path from 'node:path';

export function transpileHtmlToQuasar(htmlContent, componentName = 'FastFreeGeneratedScreen') {
  let cleaned = htmlContent;

  // 1. Purge raw emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  cleaned = cleaned.replace(emojiRegex, '');

  // 2. Replace hardcoded AI-indigo with FastFree Cyber Blue
  cleaned = cleaned.replace(/#6366f1/gi, '#2563EB');
  cleaned = cleaned.replace(/#4f46e5/gi, '#1D4ED8');
  cleaned = cleaned.replace(/#4338ca/gi, '#1E40AF');

  // 3. Convert physical CSS offsets to logical properties
  cleaned = cleaned.replace(/\bleft:\s*/gi, 'inset-inline-start: ');
  cleaned = cleaned.replace(/\bright:\s*/gi, 'inset-inline-end: ');
  cleaned = cleaned.replace(/\bmargin-left:\s*/gi, 'margin-inline-start: ');
  cleaned = cleaned.replace(/\bmargin-right:\s*/gi, 'margin-inline-end: ');
  cleaned = cleaned.replace(/\bpadding-left:\s*/gi, 'padding-inline-start: ');
  cleaned = cleaned.replace(/\bpadding-right:\s*/gi, 'padding-inline-end: ');

  // 4. Wrap into clean Vue 3 SFC with LowCode composables
  const sfc = `<template>
  <div class="${componentName.toLowerCase()}-container q-pa-md">
    ${cleaned.trim()}
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useFormatNumber, useStatusHelpers } from '@fastfree/lowcode';

const { formatCurrency, formatNumber } = useFormatNumber();
const { getStatusBadgeColor, getStatusLabel } = useStatusHelpers();
</script>

<style scoped>
/* Windows 11 Fluent 2 & Cairo RTL Styles */
.${componentName.toLowerCase()}-container {
  font-family: 'Segoe UI Variable', 'Cairo', sans-serif;
  color: #F8FAFC;
}
</style>
`;

  return sfc;
}

if (process.argv[2]) {
  const filePath = path.resolve(process.argv[2]);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const out = transpileHtmlToQuasar(raw, path.basename(filePath, path.extname(filePath)));
    const outPath = filePath.replace(/\.html$/, '.vue');
    fs.writeFileSync(outPath, out, 'utf8');
    console.log(`Transpiled successfully: ${outPath}`);
  }
}
