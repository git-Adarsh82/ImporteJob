/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic':
                    'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },

            colors: {
                background: 'hsl(var(--background) / <alpha-value>)',
                foreground: 'hsl(var(--foreground) / <alpha-value>)',

                primary: 'hsl(var(--primary) / <alpha-value>)',
                'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',

                secondary: 'hsl(var(--secondary) / <alpha-value>)',
                'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',

                muted: 'hsl(var(--muted) / <alpha-value>)',
                'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',

                accent: 'hsl(var(--accent) / <alpha-value>)',
                'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',

                destructive: 'hsl(var(--destructive) / <alpha-value>)',
                'destructive-foreground': 'hsl(var(--destructive-foreground) / <alpha-value>)',

                border: 'hsl(var(--border) / <alpha-value>)',
                input: 'hsl(var(--input) / <alpha-value>)',
                ring: 'hsl(var(--ring) / <alpha-value>)',
            },
        },
    },
    plugins: [],
};
