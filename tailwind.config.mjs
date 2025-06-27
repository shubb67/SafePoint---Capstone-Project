export default {
  content: [
     "./src/**/*.{js,jsx,ts,tsx,html}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-custom': 'var(--gradient, linear-gradient(90deg, #192C63 0%, #006EFE 100%))',
      },
    },
  },
  plugins: [],
};
