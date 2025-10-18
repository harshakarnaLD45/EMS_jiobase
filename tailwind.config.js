/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        foreground: 'var(--foreground)',
        'muted-foreground': 'var(--muted-foreground)',
        'primary-dark': 'var(--primary-dark)',
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(to right bottom, var(--gradient-card-from), var(--gradient-card-to))',
        'gradient-primary': 'linear-gradient(to right bottom, var(--gradient-primary-from), var(--gradient-primary-to))',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
}