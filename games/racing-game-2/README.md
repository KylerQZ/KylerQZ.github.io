# 3D Racing Game 2 - Arcade Physics

A high-performance 3D racing game built with C++ and WebAssembly, featuring **reduced friction and gravity** for an arcade-style racing experience.

## 🎮 Features

### **Physics System**
- **Reduced Friction**: Cars maintain speed longer with less natural deceleration
- **50% Gravity**: Half normal gravity for higher jumps and more air time
- **Enhanced Drift**: More responsive and dramatic drifting mechanics
- **250 km/h Top Speed**: Faster than the original racing game

### **Gameplay**
- **3D Third-Person View**: Dynamic camera that follows the car
- **Jump Mechanics**: Press spacebar to jump over obstacles
- **Advanced Drifting**: Hold 'E' for enhanced drift at high speeds
- **Large Open World**: 1600x1600 unit racing environment
- **Particle Effects**: Dust and dirt particles when jumping and drifting

### **Controls**
| Key | Action |
|-----|--------|
| **W** / **↑** | Accelerate |
| **S** / **↓** | Brake |
| **A** / **←** | Turn Left |
| **D** / **→** | Turn Right |
| **Space** | Jump |
| **E** | Drift Mode |

## 🚀 Quick Start

### **Option 1: Play Online (Recommended)**
Visit the live game at: `https://kyler.one/games/racing-game-2/`

### **Option 2: Build and Run Locally**

1. **Install Emscripten SDK**
   ```bash
   # Clone emsdk
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   
   # Install and activate
   ./emsdk install latest
   ./emsdk activate latest
   source ./emsdk_env.sh
   ```

2. **Compile the Game**
   ```bash
   cd racing-game-2
   emcc game.cpp -o game.js -s WASM=1 -s EXPORTED_FUNCTIONS="['_initGame']" -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" -s USE_GLFW=3 -s GL_ENABLE_GET_PROC_ADDRESS=1
   ```

3. **Run Local Server**
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Or using Python 2
   python -m SimpleHTTPServer 8000
   
   # Or using Node.js
   npx http-server -p 8000
   ```

4. **Open in Browser**
   ```
   http://localhost:8000/index.html
   ```

## 🔬 Physics Parameters

### **Reduced Friction System**
```cpp
FRICTION = 0.98f;          // Less friction (higher value = less slowdown)
DECELERATION = 80.0f;      // Slower natural deceleration
ACCELERATION = 300.0f;     // Faster acceleration
```

### **Reduced Gravity**
```cpp
GRAVITY = 9.8f * 0.5f;     // 50% of normal gravity
JUMP_POWER = 15.0f;        // Higher jumps with reduced gravity
```

### **Enhanced Performance**
```cpp
MAX_SPEED_KMH = 250.0f;    // 250 km/h top speed
DRIFT_FACTOR = 0.7f;       // More slide when drifting
TURN_SPEED = 3.0f;         // More responsive steering
```

## 🏗️ Project Structure

```
racing-game-2/
├── game.cpp           # Main C++ game code with arcade physics
├── index.html         # HTML wrapper and UI
├── Makefile          # Build configuration
├── README.md         # This file
├── game.js           # Generated: JS glue code (after build)
└── game.wasm         # Generated: WebAssembly binary (after build)
```

## 🎯 Game Mechanics

### **Movement Physics**
- Cars maintain momentum better with reduced friction
- Natural deceleration is 50% slower than original game
- Acceleration is 2x faster for quicker response

### **Jump System**
- Reduced gravity allows for higher, longer jumps
- Cars can jump over terrain and obstacles
- Landing physics with particle effects

### **Drift Mechanics**
- Drift activates at 80 km/h (lower threshold)
- Enhanced slide factor for more dramatic drifting
- Visual feedback with dust particles

### **World Physics**
- Larger world boundaries (800x800 units)
- Bounce physics at world edges
- 3D height system for jumps

## 🔧 Development Notes

### **C++ Features Used**
- **OpenGL ES 3.0**: For 3D rendering
- **WebAssembly**: High-performance compilation target
- **Emscripten**: Browser compatibility layer
- **Custom Physics Engine**: Tailored for arcade racing

### **Performance Optimizations**
- Efficient matrix calculations
- Optimized particle system
- Smart camera following
- Minimal memory allocations

### **Browser Compatibility**
- Chrome/Edge: Full support with WebGL 2.0
- Firefox: Full support with WebGL 2.0
- Safari: Full support with WebGL 2.0
- Mobile: Touch controls can be added

## 🎨 Visual Features

- **Dynamic Camera**: Third-person view that follows car movement
- **Particle System**: Dust effects for jumps and drifts
- **3D Car Model**: Detailed sportscar with windows and wheels
- **Checkered Ground**: Classic racing track pattern
- **Sky Gradient**: Beautiful blue sky background
- **Real-time UI**: Speed, position, height, and drift indicators

## 🏁 Getting Started

1. **Clone or download** the project files
2. **Install Emscripten** if building locally
3. **Compile** the C++ code to WebAssembly
4. **Run** a local web server
5. **Open** `index.html` in your browser

The game provides an arcade-style racing experience with physics that emphasize fun over realism - perfect for high-speed drifting and jumping! 🏎️

---

**Built with C++ and WebAssembly for maximum performance in the browser!**
