import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#282421',
        muted: '#706963',
        paper: '#fffefd',
        shell: '#f4f8f5',
        blush: '#b84a62',
        rose: '#f9d6dd',
        sage: '#497564',
        mint: '#dcece4',
      },
      boxShadow: {
        soft: '0 16px 40px rgba(40, 36, 33, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
