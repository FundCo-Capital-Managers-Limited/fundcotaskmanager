//tailwind.config.js
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f0ff',
          100: '#ebe3ff',
          200: '#d8c7ff',
          300: '#b89bff',
          400: '#9469ff',
          500: '#7644ef',
          600: '#6B46C1',
          700: '#5835a8',
          800: '#472d84',
          900: '#302055'
        },
        accent: {
          400: '#60a5fa',
          500: '#3B82F6',
          600: '#2563eb'
        }
      },
      boxShadow: {
        soft: '0 12px 40px rgba(17, 24, 39, 0.08)',
        glow: '0 16px 50px rgba(107, 70, 193, 0.22)'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  }
};