#!/bin/bash

# Build script for 3D Racing Game 2
# This script compiles the C++ code to WebAssembly for browser deployment

echo "🏁 Building 3D Racing Game 2..."

# Check if Emscripten is installed
if ! command -v emcc &> /dev/null; then
    echo "❌ Emscripten not found! Please install Emscripten first:"
    echo "   git clone https://github.com/emscripten-core/emsdk.git"
    echo "   cd emsdk && ./emsdk install latest && ./emsdk activate latest"
    echo "   source ./emsdk_env.sh"
    exit 1
fi

echo "✅ Emscripten found"

# Create build directory
mkdir -p build
cd build

# Compile C++ to WebAssembly
echo "🔨 Compiling C++ to WebAssembly..."
emcc ../game.cpp \
    -std=c++11 \
    -O3 \
    -o game.js \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS="['_initGame']" \
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" \
    -s USE_GLFW=3 \
    -s GL_ENABLE_GET_PROC_ADDRESS=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ASYNCIFY

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo "✅ Compilation successful!"
    
    # Copy files back to main directory
    cp game.js ../
    cp game.wasm ../
    
    echo "📁 Generated files:"
    echo "   - game.js (JavaScript glue code)"
    echo "   - game.wasm (WebAssembly binary)"
    
    echo ""
    echo "🌐 To play the game:"
    echo "   1. Start a local server: python3 -m http.server 8000"
    echo "   2. Open: http://localhost:8000/index.html"
    
else
    echo "❌ Compilation failed!"
    exit 1
fi

cd ..
rm -rf build

echo "🎮 Build complete! Ready to race! 🏎️"
