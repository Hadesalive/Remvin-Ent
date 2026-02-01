/**
 * Login Page
 * Remvin Enterprise LTD
 * Simplified Branding & Refined Minimalist Design
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { RemvinIcon } from '../components/ui/RemvinIcon';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading: authLoading } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(username, password);

            if (result.success) {
                navigate(from, { replace: true });
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50/30 p-6 relative">
            {/* Light Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-purple-50/30 pointer-events-none"></div>
            <div className="w-full max-w-md relative z-10">
                {/* Brand Header */}
                <div className="text-center mb-12">
                    <div className="h-20 w-auto mx-auto mb-6 flex items-center justify-center">
                        <RemvinIcon 
                            width={72} 
                            height={72} 
                            color="#1e40af"
                        />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">
                            Remvin Enterprise
                        </h1>
                        <p className="text-sm text-slate-500 uppercase tracking-[0.2em] font-medium">
                            LTD
                        </p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Sign In</h2>
                        <p className="text-sm text-slate-500">Enter your credentials to continue</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 placeholder:text-slate-400"
                                placeholder="Enter your username"
                                required
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 placeholder:text-slate-400 pr-12"
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !username || !password}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-slate-500">
                    <p>© {new Date().getFullYear()} Remvin Enterprise LTD</p>
                </div>
            </div>
        </div>
    );
}