import React from 'react';

interface RemvinIconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * Get Remvin Icon as inline SVG string for use in print contexts
 */
export function getRemvinIconSVG(color: string = '#1e40af', size: number = 120): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="58" fill="url(#gradient)" stroke="${color}" stroke-width="2" opacity="0.1"/>
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2563eb" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#1e40af" stop-opacity="0.1"/>
      </linearGradient>
    </defs>
    <path d="M 35 25 L 35 95 L 50 95 L 50 70 L 65 70 L 75 95 L 92 95 L 80 65 L 92 40 L 75 40 L 65 60 L 50 60 L 50 25 Z" fill="${color}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="75" cy="35" r="3" fill="${color}" opacity="0.6"/>
    <circle cx="82" cy="42" r="2" fill="${color}" opacity="0.4"/>
    <circle cx="88" cy="50" r="2" fill="${color}" opacity="0.4"/>
    <line x1="35" y1="75" x2="50" y2="75" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
  </svg>`;
}

/**
 * Get Remvin Icon Simple as inline SVG string
 */
export function getRemvinIconSimpleSVG(color: string = '#1e40af', size: number = 60): string {
  return `<svg width="${size}" height="${size * 1.33}" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 15 10 L 15 70 L 30 70 L 30 45 L 45 45 L 55 70 L 72 70 L 60 40 L 72 15 L 55 15 L 45 35 L 30 35 L 30 10 Z" fill="${color}" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/**
 * Remvin Enterprise Icon Component
 * A modern, professional icon representing Remvin Enterprise LTD
 */
export function RemvinIcon({ 
  className = '', 
  width = 'auto', 
  height = 'auto',
  color = 'currentColor',
  style = {}
}: RemvinIconProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-label="Remvin Enterprise Logo"
    >
      {/* Background Circle */}
      <circle cx="60" cy="60" r="58" fill="url(#gradient)" stroke={color} strokeWidth="2" opacity="0.1"/>
      
      {/* Gradient Definition */}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      
      {/* Stylized "R" Letter */}
      <path
        d="M 35 25 L 35 95 L 50 95 L 50 70 L 65 70 L 75 95 L 92 95 L 80 65 L 92 40 L 75 40 L 65 60 L 50 60 L 50 25 Z"
        fill={color}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Decorative Elements - Representing Enterprise/Progress */}
      <circle cx="75" cy="35" r="3" fill={color} opacity="0.6"/>
      <circle cx="82" cy="42" r="2" fill={color} opacity="0.4"/>
      <circle cx="88" cy="50" r="2" fill={color} opacity="0.4"/>
      
      {/* Bottom Accent Line */}
      <line x1="35" y1="75" x2="50" y2="75" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
    </svg>
  );
}

/**
 * Simplified Remvin Icon - Just the "R" letter
 * Useful for smaller spaces or when a simpler icon is needed
 */
export function RemvinIconSimple({ 
  className = '', 
  width = 'auto', 
  height = 'auto',
  color = 'currentColor',
  style = {}
}: RemvinIconProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 60 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-label="Remvin Enterprise Logo"
    >
      {/* Stylized "R" Letter */}
      <path
        d="M 15 10 L 15 70 L 30 70 L 30 45 L 45 45 L 55 70 L 72 70 L 60 40 L 72 15 L 55 15 L 45 35 L 30 35 L 30 10 Z"
        fill={color}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
