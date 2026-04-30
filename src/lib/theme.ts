import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
    const [theme] = useState<Theme>('light');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('dark');
        root.classList.add('light');
        localStorage.setItem('theme', 'light');
    }, []);

    const setTheme = (_newTheme: Theme) => {
        // Disabled
    };

    return { theme: 'light' as Theme, setTheme };
}
