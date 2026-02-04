// src/lib/auth.ts
export interface User {
    id: string;
    email: string;
    name: string;
    photoUrl: string;
}

const AUTH_KEY = 'payroll_app_auth';

export const getUser = (): User | null => {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
};

export const login = (user: User) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
};

export const logout = () => {
    localStorage.removeItem(AUTH_KEY);
};

// Mock Google Login Process
export const signInWithGoogle = async (): Promise<User> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Return mock user
    return {
        id: 'google_123',
        email: 'owner@example.com',
        name: '사장님',
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner'
    };
};
