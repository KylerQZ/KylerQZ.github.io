# Makefile for compiling C++ racing game to WebAssembly

# Emscripten compiler
EMCC = emcc

# Source files
SRC = game.cpp

# Output files
OUTPUT = game.js
WASM = game.wasm

# Compiler flags
CFLAGS = -O3 \
         -s WASM=1 \
         -s USE_WEBGL2=1 \
         -s FULL_ES3=1 \
         -s ALLOW_MEMORY_GROWTH=1 \
         -s EXPORTED_FUNCTIONS='["_main","_initGame","_getCarInfo"]' \
         -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
         -s MODULARIZE=1 \
         -s EXPORT_NAME='RacingGame' \
         --bind

# Build target
all: $(OUTPUT)

$(OUTPUT): $(SRC)
	$(EMCC) $(SRC) -o $(OUTPUT) $(CFLAGS)
	@echo "✅ Build complete! Files generated:"
	@echo "   - $(OUTPUT)"
	@echo "   - $(WASM)"
	@echo ""
	@echo "To test locally, run: python3 -m http.server 8000"
	@echo "Then open: http://localhost:8000/index.html"

# Clean build files
clean:
	rm -f $(OUTPUT) $(WASM) game.wast
	@echo "🧹 Cleaned build files"

# Development build with debugging
debug: CFLAGS += -g -s ASSERTIONS=1 -s SAFE_HEAP=1
debug: $(OUTPUT)
	@echo "🐛 Debug build complete"

# Help
help:
	@echo "Racing Game Build System"
	@echo ""
	@echo "Targets:"
	@echo "  make          - Build release version"
	@echo "  make debug    - Build debug version with assertions"
	@echo "  make clean    - Remove build files"
	@echo "  make help     - Show this help"
	@echo ""
	@echo "Requirements:"
	@echo "  - Emscripten SDK installed"
	@echo "  - Run 'source /path/to/emsdk/emsdk_env.sh' first"

.PHONY: all clean debug help
