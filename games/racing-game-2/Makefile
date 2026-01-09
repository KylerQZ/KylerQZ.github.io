# Makefile for 3D Racing Game 2
# Build C++ code to WebAssembly for browser deployment

CXX = emcc
CXXFLAGS = -std=c++11 -O3 -Wall -Wextra
TARGET = game
SOURCES = game.cpp
OUTPUT_JS = game.js
OUTPUT_WASM = game.wasm

# WebAssembly compilation flags
WASM_FLAGS = -s WASM=1 \
             -s EXPORTED_FUNCTIONS="['_initGame']" \
             -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" \
             -s USE_GLFW=3 \
             -s GL_ENABLE_GET_PROC_ADDRESS=1 \
             -s ALLOW_MEMORY_GROWTH=1 \
             -s ASYNCIFY

# Default target
all: $(TARGET)

# Build WebAssembly module
$(TARGET): $(SOURCES)
	$(CXX) $(CXXFLAGS) $(SOURCES) -o $(OUTPUT_JS) $(WASM_FLAGS)
	@echo "✅ WebAssembly build complete!"
	@echo "📁 Generated files: $(OUTPUT_JS), $(OUTPUT_WASM)"
	@echo "🌐 Open index.html in your browser to play"

# Development build with debug info
dev: $(SOURCES)
	$(CXX) $(CXXFLAGS) -g -O0 $(SOURCES) -o $(OUTPUT_JS) $(WASM_FLAGS)
	@echo "🔧 Development build complete!"

# Clean build artifacts
clean:
	rm -f $(OUTPUT_JS) $(OUTPUT_WASM) *.wasm *.js
	@echo "🧹 Clean complete!"

# Install Emscripten (if not installed)
install-emsdk:
	@echo "📦 Installing Emscripten SDK..."
	@if [ ! -d "emsdk" ]; then \
		git clone https://github.com/emscripten-core/emsdk.git; \
	fi
	cd emsdk && ./emsdk install latest && ./emsdk activate latest
	@echo "✅ Emscripten installed! Run: source emsdk/emsdk_env.sh"

# Run local development server
run:
	@echo "🚀 Starting local server..."
	@echo "🌐 Game will be available at: http://localhost:8000"
	python3 -m http.server 8000

# Deploy to GitHub Pages (requires git repo)
deploy: all
	@echo "📤 Deploying to GitHub Pages..."
	git add .
	git commit -m "Update racing game 2"
	git push origin main
	@echo "✅ Deployed! Game available at: https://kyler.one/games/racing-game-2/"

# Help target
help:
	@echo "🏁 3D Racing Game 2 - Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  make          - Build production version"
	@echo "  make dev      - Build development version"
	@echo "  make clean    - Clean build files"
	@echo "  make run      - Start local server"
	@echo "  make deploy   - Deploy to GitHub Pages"
	@echo "  make install-emsdk - Install Emscripten"
	@echo "  make help     - Show this help"

.PHONY: all dev clean run deploy install-emsdk help
