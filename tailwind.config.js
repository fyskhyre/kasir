/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // GANTI BARIS INI: Gunakan tanda bintang agar lebih aman
    "./node_modules/react-tailwindcss-datepicker/dist/**/*.js"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}