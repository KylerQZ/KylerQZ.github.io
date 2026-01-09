#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#include <GLES3/gl3.h>
#include <cmath>
#include <cstdio>
#include <vector>
#include <random>

// Physics constants - reduced friction and gravity for more arcade feel
const float SPEED_SCALE = 15.0f; // 1 km/h = 15 units
const float MAX_SPEED_KMH = 250.0f; // Maximum speed in km/h
const float MAX_SPEED = MAX_SPEED_KMH * SPEED_SCALE; // 3750 units
const float ACCELERATION = 300.0f; // Faster acceleration
const float DECELERATION = 80.0f; // Slower natural slowdown (less friction)
const float BRAKE_FORCE = 400.0f; // Strong brakes
const float TURN_SPEED = 3.0f; // More responsive steering
const float FRICTION = 0.98f; // Less friction (higher value = less slowdown)
const float DRIFT_FACTOR = 0.7f; // More slide
const float DRIFT_THRESHOLD = 80.0f * SPEED_SCALE; // 80 km/h = 1200 units
const float GRAVITY = 9.8f * 0.5f; // Reduced gravity (half real gravity)
const float JUMP_POWER = 15.0f; // Jump force
const float WORLD_SIZE = 800.0f; // Larger world

// Car state
struct Car {
    float x, y, z;           // Position
    float vx, vy, vz;        // Velocity
    float rotation;          // Rotation angle (radians)
    float speed;             // Current speed
    float steerAngle;        // Steering angle
    float width, height, length; // Dimensions
    bool isGrounded;         // Is car on ground
    float pitch, roll;       // Car tilt angles
    
    Car() : x(0), y(0), z(0), vx(0), vy(0), vz(0), 
            rotation(0), speed(0), steerAngle(0),
            width(2.5f), height(1.2f), length(5.0f),
            isGrounded(true), pitch(0), roll(0) {}
};

// Game state
struct GameState {
    Car playerCar;
    float deltaTime;
    bool keys[256];
    int canvasWidth;
    int canvasHeight;
    
    // Camera
    float cameraX, cameraY, cameraZ;
    float cameraDistance;
    float cameraHeight;
    float cameraAngle;
    
    GameState() : deltaTime(0.016f), canvasWidth(800), canvasHeight(600),
                  cameraDistance(20.0f), cameraHeight(12.0f), cameraAngle(0) {
        for (int i = 0; i < 256; i++) keys[i] = false;
    }
};

GameState gameState;

// Shader sources
const char* vertexShaderSource = R"(
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;
uniform mat4 uMVPMatrix;
uniform vec3 uLightPos;
out vec3 vColor;
out float vLightIntensity;

void main() {
    gl_Position = uMVPMatrix * vec4(aPosition, 1.0);
    vColor = aColor;
    vec3 normal = normalize(cross(dFdx(aPosition), dFdy(aPosition)));
    vLightIntensity = max(dot(normal, normalize(uLightPos - aPosition)), 0.3);
}
)";

const char* fragmentShaderSource = R"(
#version 300 es
precision mediump float;
in vec3 vColor;
in float vLightIntensity;
out vec4 fragColor;

void main() {
    fragColor = vec4(vColor * vLightIntensity, 1.0);
}
)";

// Matrix math
void multiplyMatrix(float* result, const float* a, const float* b) {
    for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4; j++) {
            result[i * 4 + j] = 0;
            for (int k = 0; k < 4; k++) {
                result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
            }
        }
    }
}

void setIdentityMatrix(float* matrix) {
    for (int i = 0; i < 16; i++) {
        matrix[i] = (i % 5 == 0) ? 1.0f : 0.0f;
    }
}

void setTranslationMatrix(float* matrix, float x, float y, float z) {
    setIdentityMatrix(matrix);
    matrix[12] = x;
    matrix[13] = y;
    matrix[14] = z;
}

void setRotationMatrixY(float* matrix, float angle) {
    setIdentityMatrix(matrix);
    matrix[0] = cos(angle);
    matrix[2] = sin(angle);
    matrix[8] = -sin(angle);
    matrix[10] = cos(angle);
}

void setProjectionMatrix(float* matrix, float fov, float aspect, float near, float far) {
    setIdentityMatrix(matrix);
    float f = 1.0f / tan(fov * 0.5f);
    matrix[0] = f / aspect;
    matrix[5] = f;
    matrix[10] = (far + near) / (near - far);
    matrix[11] = -1.0f;
    matrix[14] = (2.0f * far * near) / (near - far);
    matrix[15] = 0.0f;
}

// Shader compilation
GLuint compileShader(GLenum type, const char* source) {
    GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);
    
    GLint compiled;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (!compiled) {
        char log[512];
        glGetShaderInfoLog(shader, 512, nullptr, log);
        printf("Shader compilation error: %s\n", log);
        return 0;
    }
    return shader;
}

GLuint createShaderProgram() {
    GLuint vertexShader = compileShader(GL_VERTEX_SHADER, vertexShaderSource);
    GLuint fragmentShader = compileShader(GL_FRAGMENT_SHADER, fragmentShaderSource);
    
    GLuint program = glCreateProgram();
    glAttachShader(program, vertexShader);
    glAttachShader(program, fragmentShader);
    glLinkProgram(program);
    
    GLint linked;
    glGetProgramiv(program, GL_LINK_STATUS, &linked);
    if (!linked) {
        char log[512];
        glGetProgramInfoLog(program, 512, nullptr, log);
        printf("Program linking error: %s\n", log);
        return 0;
    }
    
    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);
    return program;
}

// Physics update
void updateCarPhysics() {
    Car& car = gameState.playerCar;
    
    // Input handling - WASD and Arrow keys
    bool accelerate = gameState.keys['W'] || gameState.keys['w'] || gameState.keys[38]; // W or Up Arrow
    bool brake = gameState.keys['S'] || gameState.keys['s'] || gameState.keys[40]; // S or Down Arrow
    bool turnLeft = gameState.keys['A'] || gameState.keys['a'] || gameState.keys[37]; // A or Left Arrow
    bool turnRight = gameState.keys['D'] || gameState.keys['d'] || gameState.keys[39]; // D or Right Arrow
    bool jump = gameState.keys[' '] || gameState.keys['Space']; // Spacebar for jump
    bool driftKey = gameState.keys['E'] || gameState.keys['e']; // Manual drift control
    
    // Acceleration and braking
    if (accelerate) {
        car.speed += ACCELERATION * gameState.deltaTime;
    } else if (brake) {
        car.speed -= BRAKE_FORCE * gameState.deltaTime;
    } else {
        // Natural deceleration (less friction)
        car.speed *= (1.0f - DECELERATION * gameState.deltaTime);
    }
    
    // Clamp speed
    car.speed = fmaxf(-MAX_SPEED * 0.3f, fminf(MAX_SPEED, car.speed));
    
    // Jump mechanics
    if (jump && car.isGrounded) {
        car.vz = JUMP_POWER;
        car.isGrounded = false;
    }
    
    // Apply gravity (reduced)
    if (!car.isGrounded) {
        car.vz -= GRAVITY * gameState.deltaTime;
        car.z += car.vz * gameState.deltaTime;
        
        // Ground collision
        if (car.z <= 0) {
            car.z = 0;
            car.vz = 0;
            car.isGrounded = true;
        }
    }
    
    // Steering with drift
    if (fabsf(car.speed) > 0.1f) {
        const float turnFactor = car.speed / MAX_SPEED;
        const bool isDrifting = driftKey && fabsf(car.speed) > DRIFT_THRESHOLD;
        const float driftMultiplier = isDrifting ? 2.0f : 1.0f;
        
        float steerInput = 0;
        if (turnLeft) {
            steerInput = -TURN_SPEED * turnFactor * driftMultiplier;
        }
        if (turnRight) {
            steerInput = TURN_SPEED * turnFactor * driftMultiplier;
        }
        
        car.rotation += steerInput * gameState.deltaTime;
        
        // Drift physics
        if (isDrifting && fabsf(steerInput) > 0.001f) {
            const float driftAmount = fminf((fabsf(car.speed) - DRIFT_THRESHOLD) / DRIFT_THRESHOLD, 1.0f);
            const float slideX = cosf(car.rotation) * steerInput * driftAmount * 5.0f;
            const float slideY = sinf(car.rotation) * steerInput * driftAmount * 5.0f;
            
            car.vx += slideX * gameState.deltaTime;
            car.vy += slideY * gameState.deltaTime;
        }
        
        // Apply friction to lateral velocity (less friction)
        car.vx *= FRICTION;
        car.vy *= FRICTION;
    }
    
    // Update position
    car.x += sinf(car.rotation) * car.speed * gameState.deltaTime + car.vx * gameState.deltaTime;
    car.y += cosf(car.rotation) * car.speed * gameState.deltaTime + car.vy * gameState.deltaTime;
    
    // Apply friction to speed
    car.speed *= FRICTION;
    
    // World boundaries with bounce
    if (fabsf(car.x) > WORLD_SIZE) {
        car.x = (car.x > 0) ? WORLD_SIZE : -WORLD_SIZE;
        car.speed *= -0.5f;
        car.vx *= -0.5f;
    }
    if (fabsf(car.y) > WORLD_SIZE) {
        car.y = (car.y > 0) ? WORLD_SIZE : -WORLD_SIZE;
        car.speed *= -0.5f;
        car.vy *= -0.5f;
    }
    
    // Update car tilt based on movement
    car.pitch = car.vx * 0.01f;
    car.roll = -car.vy * 0.01f;
}

// Rendering functions
void drawGround() {
    // Simple ground plane
    glBegin(GL_QUADS);
    glColor3f(0.2f, 0.6f, 0.2f); // Green ground
    
    // Ground grid
    const float groundSize = WORLD_SIZE * 2.0f;
    const int gridSize = 20;
    const float tileSize = groundSize / gridSize;
    
    for (int x = -gridSize/2; x < gridSize/2; x++) {
        for (int y = -gridSize/2; y < gridSize/2; y++) {
            float px = x * tileSize;
            float py = y * tileSize;
            
            // Checkerboard pattern
            if ((x + y) % 2 == 0) {
                glColor3f(0.2f, 0.6f, 0.2f);
            } else {
                glColor3f(0.15f, 0.5f, 0.15f);
            }
            
            glVertex3f(px, py, 0);
            glVertex3f(px + tileSize, py, 0);
            glVertex3f(px + tileSize, py + tileSize, 0);
            glVertex3f(px, py + tileSize, 0);
        }
    }
    glEnd();
}

void drawCar() {
    const Car& car = gameState.playerCar;
    
    glPushMatrix();
    glTranslatef(car.x, car.y, car.z);
    glRotatef(car.rotation * 180.0f / M_PI, 0, 0, 1);
    glRotatef(car.pitch * 180.0f / M_PI, 0, 1, 0);
    glRotatef(car.roll * 180.0f / M_PI, 1, 0, 0);
    
    // Car body - sporty red
    glColor3f(0.8f, 0.1f, 0.1f);
    
    // Main body
    glBegin(GL_QUADS);
    // Front
    glVertex3f(-car.width/2, -car.length/2, 0);
    glVertex3f(car.width/2, -car.length/2, 0);
    glVertex3f(car.width/2, -car.length/2, car.height);
    glVertex3f(-car.width/2, -car.length/2, car.height);
    
    // Back
    glVertex3f(-car.width/2, car.length/2, 0);
    glVertex3f(car.width/2, car.length/2, 0);
    glVertex3f(car.width/2, car.length/2, car.height);
    glVertex3f(-car.width/2, car.length/2, car.height);
    
    // Left side
    glVertex3f(-car.width/2, -car.length/2, 0);
    glVertex3f(-car.width/2, car.length/2, 0);
    glVertex3f(-car.width/2, car.length/2, car.height);
    glVertex3f(-car.width/2, -car.length/2, car.height);
    
    // Right side
    glVertex3f(car.width/2, -car.length/2, 0);
    glVertex3f(car.width/2, car.length/2, 0);
    glVertex3f(car.width/2, car.length/2, car.height);
    glVertex3f(car.width/2, -car.length/2, car.height);
    
    // Top
    glVertex3f(-car.width/2, -car.length/2, car.height);
    glVertex3f(car.width/2, -car.length/2, car.height);
    glVertex3f(car.width/2, car.length/2, car.height);
    glVertex3f(-car.width/2, car.length/2, car.height);
    glEnd();
    
    // Windows - dark blue
    glColor3f(0.1f, 0.1f, 0.3f);
    glBegin(GL_QUADS);
    // Front windshield
    glVertex3f(-car.width/2 + 0.3f, -car.length/2 + 0.5f, car.height - 0.2f);
    glVertex3f(car.width/2 - 0.3f, -car.length/2 + 0.5f, car.height - 0.2f);
    glVertex3f(car.width/2 - 0.3f, -car.length/2 + 1.5f, car.height);
    glVertex3f(-car.width/2 + 0.3f, -car.length/2 + 1.5f, car.height);
    glEnd();
    
    // Wheels - black
    glColor3f(0.1f, 0.1f, 0.1f);
    glBegin(GL_QUADS);
    // Front wheels
    glVertex3f(-car.width/2 - 0.2f, -car.length/2 + 0.5f, 0);
    glVertex3f(-car.width/2 + 0.2f, -car.length/2 + 0.5f, 0);
    glVertex3f(-car.width/2 + 0.2f, -car.length/2 + 1.0f, 0);
    glVertex3f(-car.width/2 - 0.2f, -car.length/2 + 1.0f, 0);
    
    glVertex3f(car.width/2 - 0.2f, -car.length/2 + 0.5f, 0);
    glVertex3f(car.width/2 + 0.2f, -car.length/2 + 0.5f, 0);
    glVertex3f(car.width/2 + 0.2f, -car.length/2 + 1.0f, 0);
    glVertex3f(car.width/2 - 0.2f, -car.length/2 + 1.0f, 0);
    
    // Rear wheels
    glVertex3f(-car.width/2 - 0.2f, car.length/2 - 1.0f, 0);
    glVertex3f(-car.width/2 + 0.2f, car.length/2 - 1.0f, 0);
    glVertex3f(-car.width/2 + 0.2f, car.length/2 - 0.5f, 0);
    glVertex3f(-car.width/2 - 0.2f, car.length/2 - 0.5f, 0);
    
    glVertex3f(car.width/2 - 0.2f, car.length/2 - 1.0f, 0);
    glVertex3f(car.width/2 + 0.2f, car.length/2 - 1.0f, 0);
    glVertex3f(car.width/2 + 0.2f, car.length/2 - 0.5f, 0);
    glVertex3f(car.width/2 - 0.2f, car.length/2 - 0.5f, 0);
    glEnd();
    
    glPopMatrix();
}

void setupCamera() {
    const Car& car = gameState.playerCar;
    
    // Third-person camera behind car
    gameState.cameraX = car.x - sinf(car.rotation) * gameState.cameraDistance;
    gameState.cameraY = car.y - cosf(car.rotation) * gameState.cameraDistance;
    gameState.cameraZ = car.z + gameState.cameraHeight;
    
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(
        gameState.cameraX, gameState.cameraY, gameState.cameraZ,
        car.x, car.y, car.z + 2.0f,
        0, 0, 1
    );
}

// Main game loop
void mainLoop() {
    updateCarPhysics();
    
    // Clear screen
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    
    // Setup camera
    setupCamera();
    
    // Draw scene
    drawGround();
    drawCar();
    
    // Swap buffers
    emscripten_webgl_commit_frame();
}

// Input handling
EM_BOOL keyCallback(int eventType, const EmscriptenKeyboardEvent* keyEvent, void* userData) {
    if (eventType == EMSCRIPTEN_EVENT_KEYDOWN) {
        if (keyEvent->keyCode < 256) {
            gameState.keys[keyEvent->keyCode] = true;
        }
        // Handle spacebar
        if (strcmp(keyEvent->code, "Space") == 0) {
            gameState.keys[' '] = true;
        }
    } else if (eventType == EMSCRIPTEN_EVENT_KEYUP) {
        if (keyEvent->keyCode < 256) {
            gameState.keys[keyEvent->keyCode] = false;
        }
        // Handle spacebar
        if (strcmp(keyEvent->code, "Space") == 0) {
            gameState.keys[' '] = false;
        }
    }
    return EM_TRUE;
}

// Initialize game
extern "C" void EMSCRIPTEN_KEEPALIVE initGame() {
    // Setup OpenGL
    glEnable(GL_DEPTH_TEST);
    glClearColor(0.5f, 0.7f, 1.0f, 1.0f); // Sky blue
    
    // Setup projection
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(60.0f, (float)gameState.canvasWidth / gameState.canvasHeight, 0.1f, 1000.0f);
    
    // Setup input
    emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, nullptr, EM_TRUE, keyCallback);
    emscripten_set_keyup_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, nullptr, EM_TRUE, keyCallback);
    
    // Start game loop
    emscripten_request_animation_frame_loop([](double time, void* userData) -> EM_BOOL {
        mainLoop();
        return EM_TRUE;
    }, nullptr);
}

int main() {
    printf("3D Racing Game with Reduced Physics - Starting...\n");
    return 0;
}
