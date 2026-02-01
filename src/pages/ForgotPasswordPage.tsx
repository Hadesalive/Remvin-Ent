/**
 * Forgot Password Page
 * Remvin Enterprise LTD
 * Simplified Branding & Refined Minimalist Design
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { RemvinIcon } from '../components/ui/RemvinIcon';

interface UserInfo {
    username: string;
    fullName: string;
    role: string;
    isActive: boolean;
}

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [checkingUser, setCheckingUser] = useState(false);

    // Check username when it changes (with debounce)
    useEffect(() => {
        if (!username || username.trim() === '') {
            setUserInfo(null);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setCheckingUser(true);
            try {
                if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
                    const result = await window.electron.ipcRenderer.invoke('get-user-by-username', username.trim()) as {
                        success: boolean;
                        data?: UserInfo;
                        error?: string;
                    };

                    if (result.success && result.data) {
                        setUserInfo(result.data);
                        setError('');
                    } else {
                        setUserInfo(null);
                    }
                }
            } catch (err) {
                setUserInfo(null);
            } finally {
                setCheckingUser(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!username) {
            setError('Please enter your username');
            return;
        }

        if (!newPassword) {
            setError('Please enter a new password');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
                const result = await window.electron.ipcRenderer.invoke('reset-user-password', {
                    username,
                    newPassword
                }) as {
                    success: boolean;
                    error?: string;
                };

                if (result.success) {
                    setSuccess(true);
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                } else {
                    setError(result.error || 'Failed to reset password');
                }
            } else {
                setError('Unable to connect to system. Please try again.');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50/30 p-6 relative">
            {/* Light Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-purple-50/30 pointer-events-none"></div>
            <div className="w-full max-w-md relative z-10">
                {/* Simplified Brand Header */}
                <div className="text-center mb-10">
                    <div className="h-16 w-auto mx-auto mb-6 flex items-center justify-center">
                        <RemvinIcon 
                            width={64} 
                            height={64} 
                            color="#1e40af"
                        />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
                            Remvin Enterprise
                        </h1>
                        <p className="text-sm text-slate-600 uppercase tracking-[0.2em] font-medium">
                            LTD
                        </p>
                    </div>
                </div>

                {/* Reset Password Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Reset Password</h2>
                        <p className="text-sm text-slate-500">Enter your details to create a new password</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-medium text-green-700">
                                Password reset successfully! Redirecting...
                            </p>
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
                                disabled={isLoading || success}
                            />
                            {userInfo && (
                                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{userInfo.fullName}</p>
                                        <p className="text-xs text-slate-600 uppercase tracking-wider">{userInfo.role}</p>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    id="newPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 placeholder:text-slate-400 pr-12"
                                    placeholder="Enter new password"
                                    required
                                    disabled={isLoading || success}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 placeholder:text-slate-400 pr-12"
                                    placeholder="Confirm password"
                                    required
                                    disabled={isLoading || success}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || success}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6"
                        >
                            {isLoading ? 'Processing...' : success ? 'Done' : 'Update Password'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
