<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* Import Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* Base styles */
html {
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #020617;
}

body {
  background-color: #020617;
  min-height: 100vh;
  overscroll-behavior-y: contain;
}

/* Mobile-first: prevent zoom on input focus */
@media (max-width: 768px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Hide scrollbar but keep functionality */
* {
  scrollbar-width: thin;
  scrollbar-color: #334155 transparent;
}

*::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 2px;
}

*::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

/* Selection color */
::selection {
  background-color: rgba(99, 102, 241, 0.3);
  color: white;
}

/* Focus visible for accessibility */
*:focus-visible {
  outline: 2px solid #818cf8;
  outline-offset: 2px;
}

/* Disable text selection on interactive elements */
button, a {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* Smooth transitions for color scheme */
* {
  transition-property: background-color, border-color;
  transition-duration: 150ms;
  transition-timing-function: ease;
}

/* Number input - hide arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}

/* Safe area for notched phones */
.safe-area-top {
  padding-top: env(safe-area-inset-top, 0);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

/* Glass effect utility */
.glass {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* Gradient text utility */
.gradient-text {
  background: linear-gradient(135deg, #818cf8 0%, #a855f7 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
