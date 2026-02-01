#!/bin/bash

# Enhanced Windows Build Script with Professional Installer
# This creates a Windows installer with detailed progress and professional appearance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🪟 House of Electronics Sales Manager - Enhanced Windows Build${NC}"
echo "======================================================"

# Check if we're on Windows or have Windows build tools
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo -e "${GREEN}✅ Running on Windows${NC}"
elif command -v wine &> /dev/null; then
    echo -e "${YELLOW}🍷 Using Wine for Windows build${NC}"
else
    echo -e "${YELLOW}⚠️  Building for Windows from non-Windows system${NC}"
fi

# Check for required tools
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Install from: https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Build the application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# Build for Windows with enhanced installer
echo -e "${YELLOW}📦 Building Windows installer with enhanced UI...${NC}"
npm run pack:win

# Get the built installer path
INSTALLER_PATH="release/House of Electronics Sales Manager-1.0.0-Setup.exe"

if [ ! -f "$INSTALLER_PATH" ]; then
    echo -e "${RED}❌ Installer not found at $INSTALLER_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Enhanced Windows installer created successfully!${NC}"
echo -e "${BLUE}📁 Output files:${NC}"
echo "  - Installer: $INSTALLER_PATH"
echo "  - Portable: release/win-ia32-unpacked/"
echo "  - Portable: release/win-unpacked/"

echo -e "${BLUE}🎨 Enhanced Installer Features:${NC}"
echo "  ✅ Professional installation wizard"
echo "  ✅ License agreement page"
echo "  ✅ Installation progress with detailed steps"
echo "  ✅ Language selection (English, Spanish, French, German)"
echo "  ✅ Desktop and Start Menu shortcuts"
echo "  ✅ License system setup"
echo "  ✅ Uninstaller with license data options"
echo "  ✅ Post-installation launch option"

echo -e "${GREEN}🎉 Your enhanced Windows installer is ready!${NC}"
echo -e "${BLUE}💡 Distribution options:${NC}"
echo "  - Direct download from your website"
echo "  - Email the installer file"
echo "  - USB drive distribution"
echo "  - Cloud storage (Google Drive, Dropbox, etc.)"

echo -e "${YELLOW}📋 Installation Experience:${NC}"
echo "1. Users see a professional welcome screen"
echo "2. License agreement with your terms"
echo "3. Installation directory selection"
echo "4. Detailed progress with step-by-step messages"
echo "5. Automatic license system setup"
echo "6. Desktop and Start Menu shortcuts created"
echo "7. Option to launch immediately after installation"
