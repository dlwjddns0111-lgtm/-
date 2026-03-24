import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";

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

// Real Google Login Process using Firebase (Reverted to Popup for better compatibility if Redirect fails)
export const signInWithGoogle = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;

        return {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Google User',
            photoUrl: firebaseUser.photoURL || ''
        };
    } catch (error) {
        console.error("Google Login Error", error);
        throw error;
    }
};
