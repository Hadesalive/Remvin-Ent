import React from 'react';

/**
 * Tech Background Component
 * Clean, minimal Apple-inspired design
 */
export function TechBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Soft Base Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30"></div>
            
            {/* Subtle Accent Gradient - Top Right */}
            <div 
                className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-30"
                style={{
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
                    transform: 'translate(30%, -30%)',
                }}
            ></div>
            
            {/* Subtle Accent Gradient - Bottom Left */}
            <div 
                className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-20"
                style={{
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)',
                    transform: 'translate(-30%, 30%)',
                }}
            ></div>
            
            {/* Very Subtle Grid - Only visible on close inspection */}
            <div 
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '80px 80px',
                }}
            ></div>
        </div>
    );
}
