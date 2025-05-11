/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f9fafb', // fundo claro
        foreground: '#111827', // texto escuro padrão (exemplo: gray-900)
      },
    },
  },
  plugins: [],
}
