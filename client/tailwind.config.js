/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Dòng này báo Tailwind hãy quét toàn bộ file code trong thư mục src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}