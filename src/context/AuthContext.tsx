import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types/shm';

interface AuthContextType {
  user: User | null;
  users: User[];
  signIn: (email: string, pass: string, remember: boolean) => { success: boolean; message: string };
  signUp: (data: {
    fullName: string;
    email: string;
    organization?: string;
    department?: string;
    designation?: string;
    country: string;
    phoneNumber: string;
    password: string;
  }) => { success: boolean; message: string; user?: User };
  signOut: () => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  toggleUserStatus: (userId: string) => void;
}

const STORAGE_KEY_USER = 'shm_current_user';
const STORAGE_KEY_USERS = 'shm_all_users';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse users', e);
      }
    }
    // Start empty according to Zero Mock / Clean Database Policy
    return [];
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse current user', e);
      }
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [user]);

  const signIn = (email: string, _pass: string, _remember: boolean) => {
    const trimmedEmail = email.trim().toLowerCase();

    // If database is empty and someone logs in with admin@example.com, auto-create the first admin
    if (users.length === 0 && trimmedEmail === 'admin@example.com') {
      const initialAdmin: User = {
        id: 'usr_admin_01',
        fullName: 'System Administrator',
        email: 'admin@example.com',
        organization: 'Federal Infrastructure Authority',
        department: 'SHM Operations',
        designation: 'Chief Engineer',
        country: 'United States',
        phoneNumber: '+1 555-0192',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setUsers([initialAdmin]);
      setUser(initialAdmin);
      return { success: true, message: 'Initial Administrator account initialized and signed in.' };
    }

    const matchedUser = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (matchedUser) {
      if (!matchedUser.isActive) {
        return { success: false, message: 'Account is deactivated. Please contact an Administrator.' };
      }
      setUser(matchedUser);
      return { success: true, message: `Welcome back, ${matchedUser.fullName}!` };
    }

    return { success: false, message: 'User not found. Please register an account.' };
  };

  const signUp = (data: {
    fullName: string;
    email: string;
    organization?: string;
    department?: string;
    designation?: string;
    country: string;
    phoneNumber: string;
    password: string;
  }) => {
    const existing = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      return { success: false, message: 'An account with this email address already exists.' };
    }

    // First account ever created automatically receives 'admin' role, others receive 'user'
    const assignedRole: UserRole = users.length === 0 ? 'admin' : 'user';

    const newUser: User = {
      id: `usr_${Date.now()}`,
      fullName: data.fullName,
      email: data.email,
      organization: data.organization,
      department: data.department,
      designation: data.designation,
      country: data.country,
      phoneNumber: data.phoneNumber,
      role: assignedRole,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);
    setUser(newUser);
    return {
      success: true,
      message: `Account registered! Role: ${assignedRole.toUpperCase()}`,
      user: newUser,
    };
  };

  const signOut = () => {
    setUser(null);
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, role } : u))
    );
    if (user && user.id === userId) {
      setUser({ ...user, role });
    }
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    );
  };

  return (
    <AuthContext.Provider value={{ user, users, signIn, signUp, signOut, updateUserRole, toggleUserStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
