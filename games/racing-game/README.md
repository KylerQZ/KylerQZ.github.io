# 🏎️ 3D Racing Game (C++ WebAssembly)

A third-person 3D racing game built with C++ and compiled to WebAssembly for browser play.

## 🎮 Features

### Current Implementation (Basic)
- ✅ **Car Physics**: Realistic acceleration, braking, and steering
- ✅ **Third-Person Camera**: Smooth camera following the car
- ✅ **Speed System**: Max speed of 100 units/s with proper acceleration curves
- ✅ **Basic 3D Car Model**: Simple box model (placeholder for detailed model)
- ✅ **Controls**: WASD keyboard controls
- ✅ **World Boundaries**: Wrap-around world system

### Planned Features
- 🔲 **Race Mode**: Compete against AI opponents with lap-based racing
- 🔲 **Police & Robber Mode**: Evade police cars while collecting objectives
- 🔲 **Detailed Car Models**: Realistic 3D car meshes
- 🔲 **Track System**: Multiple race tracks with checkpoints
- 🔲 **Power-ups**: Speed boosts, shields, etc.
- 🔲 **Minimap**: Top-down view showing positions
- 🔲 **Sound Effects**: Engine sounds, collision sounds

## 🛠️ Build Instructions

### Prerequisites

1. **Install Emscripten SDK**
   ```bash
   # Clone the emsdk repository
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   
   # Install and activate latest version
   ./emsdk install latest
   ./emsdk activate latest
   
   # Set up environment variables (run this every time you open a new terminal)
   source ./emsdk_env.sh
   ```

2. **Verify Installation**
   ```bash
   emcc --version
   # Should show Emscripten version info
   ```

### Building the Game

1. **Navigate to game directory**
   ```bash
   cd games/racing-game
   ```

2. **Build release version**
   ```bash
   make
   ```
   
   This generates:
   - `game.js` - JavaScript glue code
   - `game.wasm` - Compiled WebAssembly binary

3. **Build debug version** (with assertions and debugging info)
   ```bash
   make debug
   ```

4. **Clean build files**
   ```bash
   make clean
   ```

### Testing Locally

1. **Start a local web server**
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Python 2
   python -m SimpleHTTPServer 8000
   
   # Or using Node.js
   npx http-server -p 8000
   ```

2. **Open in browser**
   ```
   http://localhost:8000/index.html
   ```

## 🎯 Controls

| Key | Action |
|-----|--------|
| **W** | Accelerate forward |
| **S** | Brake / Reverse |
| **A** | Turn left |
| **D** | Turn right |

## 📊 Physics Parameters

Current physics constants (defined in `game.cpp`):

```cpp
MAX_SPEED = 100.0f;        // Maximum forward speed
ACCELERATION = 30.0f;      // Acceleration rate
DECELERATION = 20.0f;      // Natural slowdown
BRAKE_FORCE = 50.0f;       // Braking power
TURN_SPEED = 2.5f;         // Steering sensitivity
FRICTION = 0.95f;          // Speed friction coefficient
```

You can adjust these values to change how the car handles!

## 🏗️ Project Structure

```
racing-game/
├── game.cpp           # Main C++ game code with physics
├── index.html         # HTML wrapper and UI
├── Makefile          # Build configuration
├── README.md         # This file
├── game.js           # Generated: JS glue code (after build)
└── game.wasm         # Generated: WebAssembly binary (after build)
```

## 🔧 Development Notes

### Current State
The game currently has:
- Basic car physics with acceleration, braking, and steering
- Third-person camera that follows the car
- Simple 3D rendering using OpenGL ES
- Keyboard input handling

### Next Steps
1. **Improve Car Model**: Replace box with detailed 3D mesh
2. **Add Track**: Create a race track with boundaries
3. **Implement AI**: Add opponent cars with pathfinding
4. **Game Modes**: Implement Race and Police & Robber modes
5. **UI Improvements**: Add speedometer, minimap, lap counter

### Modifying Physics

Edit the constants at the top of `game.cpp`:
```cpp
const float MAX_SPEED = 100.0f;      // Change max speed
const float ACCELERATION = 30.0f;     // Change acceleration
const float TURN_SPEED = 2.5f;        // Change steering
```

Then rebuild:
```bash
make clean && make
```

## 🚀 Deployment

To deploy to GitHub Pages:

1. Build the game:
   ```bash
   make
   ```

2. Commit the generated files:
   ```bash
   git add game.js game.wasm index.html
   git commit -m "Update racing game"
   git push
   ```

3. The game will be live at:
   ```
   https://kyler.one/games/racing-game/
   ```

## 📝 Technical Details

### WebAssembly Integration
- Uses Emscripten to compile C++ to WebAssembly
- OpenGL ES 3.0 for 3D graphics
- HTML5 Canvas for rendering
- Keyboard events handled through Emscripten's HTML5 API

### Performance
- Targets 60 FPS
- Optimized with `-O3` compiler flag
- Memory growth allowed for dynamic allocation

## 🐛 Troubleshooting

**Build fails with "emcc: command not found"**
- Make sure you've run `source ./emsdk_env.sh` in your terminal

**Game doesn't load in browser**
- Check browser console for errors
- Make sure you're using a local web server (not file://)
- Try a different browser (Chrome/Firefox recommended)

**Car physics feel wrong**
- Adjust the physics constants in `game.cpp`
- Rebuild with `make clean && make`

## 📚 Resources

- [Emscripten Documentation](https://emscripten.org/docs/)
- [WebAssembly Documentation](https://webassembly.org/)
- [OpenGL ES Reference](https://www.khronos.org/opengles/)

## 🎨 Future Enhancements

- Realistic car models with textures
- Multiple camera angles
- Particle effects (dust, smoke, sparks)
- Weather system (rain, fog)
- Day/night cycle
- Multiplayer support
- Mobile touch controls
- Gamepad support

---

**Note**: This is currently a basic implementation. The C++ code provides the foundation for physics and rendering. The full game modes (Race and Police & Robber) will be implemented in future updates!
