import React from 'react';

/**
 * Clean, minimal side panel design for login pages
 */
export function LoginSidePanel() {
    return (
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-blue-600 lg:rounded-l-3xl">
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 lg:rounded-l-3xl"></div>
            
            {/* Subtle Pattern */}
            <div className="absolute inset-0 opacity-5">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
                            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="white" strokeWidth="0.5"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            {/* Minimal Decorative Elements */}
            <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-white/3 blur-3xl"></div>
        </div>
    );
}
