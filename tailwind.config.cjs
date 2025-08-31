/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    fontFamily: {
      tusker: ["Tusker Grotesk", "sans-serif"],
      archivo: ["Archivo Black", "sans-serif"],
      inter: ["Inter", "sans-serif"],
      oswald: ["Oswald", "sans-serif"],
    },
    extend: {
      // This section customizes the typography plugin
      typography: (theme) => ({
        DEFAULT: {
          css: {
            // This styles all hyperlink 'a' tags
            a: {
              color: theme('colors.blue.600'),
              textDecoration: 'underline',
              fontWeight: '500',
              '&:hover': {
                color: theme('colors.blue.800'),
              },
            },
          },
        },
      }),
    },
  },
  // This adds the plugin to your project
  plugins: [
    require('@tailwindcss/typography'),
  ],
};