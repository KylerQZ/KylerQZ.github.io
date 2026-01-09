#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#include <GLES3/gl3.h>
#include <cmath>
#include <cstdio>

// Car physics constants
const float MAX_SPEED = 100.0f;
const float ACCELERATION = 30.0f;
const float DECELERATION = 20.0f;
const float BRAKE_FORCE = 50.0f;
const float TURN_SPEED = 2.5f;
const float FRICTION = 0.95f;
const float DRIFT_FACTOR = 0.8f;

// Car state
struct Car {
    float x, y, z;           // Position
    float vx, vy, vz;        // Velocity
    float rotation;          // Rotation angle (radians)
    float speed;             // Current speed
    float steerAngle;        // Steering angle
    float width, height, length; // Dimensions
    
    Car() : x(0), y(0), z(0), vx(0), vy(0), vz(0), 
            rotation(0), speed(0), steerAngle(0),
            width(2.0f), height(1.5f), length(4.0f) {}
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
                  cameraDistance(15.0f), cameraHeight(8.0f), cameraAngle(0) {
        for (int i = 0; i < 256; i++) keys[i] = false;
    }
};

GameState gameState;

// Physics update
void updateCarPhysics(Car& car, float dt) {
    // Input handling
    bool accelerate = gameState.keys['W'] || gameState.keys['w'];
    bool brake = gameState.keys['S'] || gameState.keys['s'];
    bool turnLeft = gameState.keys['A'] || gameState.keys['a'];
    bool turnRight = gameState.keys['D'] || gameState.keys['d'];
    
    // Acceleration/Braking
    if (accelerate) {
        car.speed += ACCELERATION * dt;
    } else if (brake) {
        car.speed -= BRAKE_FORCE * dt;
    } else {
        // Natural deceleration
        if (car.speed > 0) {
            car.speed -= DECELERATION * dt;
        } else if (car.speed < 0) {
            car.speed += DECELERATION * dt;
        }
    }
    
    // Clamp speed
    if (car.speed > MAX_SPEED) car.speed = MAX_SPEED;
    if (car.speed < -MAX_SPEED * 0.5f) car.speed = -MAX_SPEED * 0.5f;
    
    // Steering (only when moving)
    if (fabs(car.speed) > 0.1f) {
        float turnFactor = car.speed / MAX_SPEED; // Turn better at higher speeds
        if (turnLeft) {
            car.steerAngle = TURN_SPEED * turnFactor;
        } else if (turnRight) {
            car.steerAngle = -TURN_SPEED * turnFactor;
        } else {
            car.steerAngle *= 0.9f; // Return to center
        }
        
        // Apply steering to rotation
        car.rotation += car.steerAngle * dt;
    } else {
        car.steerAngle = 0;
    }
    
    // Apply friction
    car.speed *= FRICTION;
    
    // Update velocity based on rotation and speed
    car.vx = sin(car.rotation) * car.speed;
    car.vz = cos(car.rotation) * car.speed;
    
    // Update position
    car.x += car.vx * dt;
    car.z += car.vz * dt;
    
    // Keep car on ground
    car.y = 0;
    
    // Boundary check (simple wrap-around for now)
    const float WORLD_SIZE = 200.0f;
    if (car.x > WORLD_SIZE) car.x = -WORLD_SIZE;
    if (car.x < -WORLD_SIZE) car.x = WORLD_SIZE;
    if (car.z > WORLD_SIZE) car.z = -WORLD_SIZE;
    if (car.z < -WORLD_SIZE) car.z = WORLD_SIZE;
}

// Update third-person camera
void updateCamera() {
    Car& car = gameState.playerCar;
    
    // Camera follows car from behind and above
    float targetX = car.x - sin(car.rotation) * gameState.cameraDistance;
    float targetZ = car.z - cos(car.rotation) * gameState.cameraDistance;
    float targetY = car.y + gameState.cameraHeight;
    
    // Smooth camera movement
    gameState.cameraX += (targetX - gameState.cameraX) * 0.1f;
    gameState.cameraY += (targetY - gameState.cameraY) * 0.1f;
    gameState.cameraZ += (targetZ - gameState.cameraZ) * 0.1f;
    gameState.cameraAngle = car.rotation;
}

// Render simple car (placeholder - will be replaced with proper 3D model)
void renderCar(const Car& car) {
    glPushMatrix();
    
    // Position and rotate car
    glTranslatef(car.x, car.y + car.height * 0.5f, car.z);
    glRotatef(car.rotation * 180.0f / M_PI, 0, 1, 0);
    
    // Car body (simple box for now)
    glColor3f(1.0f, 0.0f, 0.0f); // Red car
    glBegin(GL_QUADS);
    
    // Front
    glVertex3f(-car.width/2, 0, car.length/2);
    glVertex3f(car.width/2, 0, car.length/2);
    glVertex3f(car.width/2, car.height, car.length/2);
    glVertex3f(-car.width/2, car.height, car.length/2);
    
    // Back
    glVertex3f(-car.width/2, 0, -car.length/2);
    glVertex3f(-car.width/2, car.height, -car.length/2);
    glVertex3f(car.width/2, car.height, -car.length/2);
    glVertex3f(car.width/2, 0, -car.length/2);
    
    // Left
    glVertex3f(-car.width/2, 0, -car.length/2);
    glVertex3f(-car.width/2, 0, car.length/2);
    glVertex3f(-car.width/2, car.height, car.length/2);
    glVertex3f(-car.width/2, car.height, -car.length/2);
    
    // Right
    glVertex3f(car.width/2, 0, -car.length/2);
    glVertex3f(car.width/2, car.height, -car.length/2);
    glVertex3f(car.width/2, car.height, car.length/2);
    glVertex3f(car.width/2, 0, car.length/2);
    
    // Top
    glVertex3f(-car.width/2, car.height, -car.length/2);
    glVertex3f(-car.width/2, car.height, car.length/2);
    glVertex3f(car.width/2, car.height, car.length/2);
    glVertex3f(car.width/2, car.height, -car.length/2);
    
    // Bottom
    glVertex3f(-car.width/2, 0, -car.length/2);
    glVertex3f(car.width/2, 0, -car.length/2);
    glVertex3f(car.width/2, 0, car.length/2);
    glVertex3f(-car.width/2, 0, car.length/2);
    
    glEnd();
    
    glPopMatrix();
}

// Particle system for smoke
struct Particle {
    float x, y, z;
    float vx, vy, vz;
    float life;
    float size;
    float alpha;
    
    Particle() : x(0), y(0), z(0), vx(0), vy(0), vz(0), 
                 life(0), size(1.0f), alpha(1.0f) {}
};

const int MAX_PARTICLES = 100;
Particle particles[MAX_PARTICLES];
int particleIndex = 0;

// Create smoke particle
void createSmokeParticle(float x, float y, float z) {
    Particle& p = particles[particleIndex];
    p.x = x + (rand() % 100 - 50) / 100.0f;
    p.y = y + 0.1f;
    p.z = z + (rand() % 100 - 50) / 100.0f;
    p.vx = (rand() % 100 - 50) / 200.0f;
    p.vy = 0.5f + (rand() % 50) / 100.0f;
    p.vz = (rand() % 100 - 50) / 200.0f;
    p.life = 1.0f;
    p.size = 0.5f + (rand() % 50) / 100.0f;
    p.alpha = 0.6f;
    
    particleIndex = (particleIndex + 1) % MAX_PARTICLES;
}

// Update particles
void updateParticles(float dt) {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (particles[i].life > 0) {
            particles[i].x += particles[i].vx * dt;
            particles[i].y += particles[i].vy * dt;
            particles[i].z += particles[i].vz * dt;
            particles[i].life -= dt * 0.5f;
            particles[i].alpha = particles[i].life * 0.6f;
            particles[i].size += dt * 0.5f;
        }
    }
}

// Render particles
void renderParticles() {
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glDepthMask(GL_FALSE);
    
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (particles[i].life > 0) {
            glPushMatrix();
            glTranslatef(particles[i].x, particles[i].y, particles[i].z);
            
            // Billboard effect - face camera
            glRotatef(-gameState.cameraAngle * 180.0f / M_PI, 0, 1, 0);
            
            float gray = 0.5f + particles[i].life * 0.2f;
            glColor4f(gray, gray, gray, particles[i].alpha);
            
            float s = particles[i].size;
            glBegin(GL_QUADS);
            glVertex3f(-s, -s, 0);
            glVertex3f(s, -s, 0);
            glVertex3f(s, s, 0);
            glVertex3f(-s, s, 0);
            glEnd();
            
            glPopMatrix();
        }
    }
    
    glDepthMask(GL_TRUE);
    glDisable(GL_BLEND);
}

// Render rocky field terrain
void renderGround() {
    // Base ground - dirt/sand color
    glColor3f(0.55f, 0.45f, 0.35f);
    glBegin(GL_QUADS);
    glVertex3f(-500, 0, -500);
    glVertex3f(500, 0, -500);
    glVertex3f(500, 0, 500);
    glVertex3f(-500, 0, 500);
    glEnd();
    
    // Rocky patches - darker brown/gray rocks scattered
    srand(12345); // Fixed seed for consistent rock placement
    for (int i = 0; i < 200; i++) {
        float x = (rand() % 1000) - 500;
        float z = (rand() % 1000) - 500;
        float size = 2.0f + (rand() % 300) / 100.0f;
        
        // Rock color variation
        float r = 0.3f + (rand() % 20) / 100.0f;
        float g = 0.25f + (rand() % 20) / 100.0f;
        float b = 0.2f + (rand() % 20) / 100.0f;
        glColor3f(r, g, b);
        
        // Irregular rock shape
        glBegin(GL_TRIANGLE_FAN);
        glVertex3f(x, 0.01f, z);
        int sides = 5 + rand() % 3;
        for (int j = 0; j <= sides; j++) {
            float angle = (j * 2.0f * M_PI) / sides;
            float radius = size * (0.8f + (rand() % 40) / 100.0f);
            glVertex3f(x + cos(angle) * radius, 0.01f, z + sin(angle) * radius);
        }
        glEnd();
    }
    
    // Dirt tracks/paths - lighter brown
    glColor3f(0.45f, 0.35f, 0.25f);
    for (int i = -50; i <= 50; i += 20) {
        glBegin(GL_QUAD_STRIP);
        for (int j = -500; j <= 500; j += 10) {
            float offset = sin(j * 0.01f) * 3.0f;
            glVertex3f(i * 10 + offset - 2, 0.005f, j);
            glVertex3f(i * 10 + offset + 2, 0.005f, j);
        }
        glEnd();
    }
    
    // Small pebbles scattered around
    glColor3f(0.4f, 0.35f, 0.3f);
    srand(54321);
    glPointSize(2.0f);
    glBegin(GL_POINTS);
    for (int i = 0; i < 1000; i++) {
        float x = (rand() % 1000) - 500;
        float z = (rand() % 1000) - 500;
        glVertex3f(x, 0.02f, z);
    }
    glEnd();
}

// Main render function
void render() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glLoadIdentity();
    
    // Set up third-person camera
    gluLookAt(
        gameState.cameraX, gameState.cameraY, gameState.cameraZ,  // Camera position
        gameState.playerCar.x, gameState.playerCar.y + 2.0f, gameState.playerCar.z,  // Look at car
        0, 1, 0  // Up vector
    );
    
    // Render scene
    renderGround();
    renderCar(gameState.playerCar);
    renderParticles();
}

// Main game loop
void gameLoop() {
    // Update physics
    updateCarPhysics(gameState.playerCar, gameState.deltaTime);
    
    // Update camera
    updateCamera();
    
    // Update particles
    updateParticles(gameState.deltaTime);
    
    // Spawn smoke particles when car is moving
    Car& car = gameState.playerCar;
    if (fabs(car.speed) > 1.0f) {
        // Spawn smoke from rear wheels
        static float smokeTimer = 0;
        smokeTimer += gameState.deltaTime;
        
        if (smokeTimer > 0.05f) { // Spawn every 50ms
            // Left rear wheel
            float leftX = car.x - sin(car.rotation) * car.length * 0.3f - cos(car.rotation) * car.width * 0.4f;
            float leftZ = car.z - cos(car.rotation) * car.length * 0.3f + sin(car.rotation) * car.width * 0.4f;
            createSmokeParticle(leftX, 0, leftZ);
            
            // Right rear wheel
            float rightX = car.x - sin(car.rotation) * car.length * 0.3f + cos(car.rotation) * car.width * 0.4f;
            float rightZ = car.z - cos(car.rotation) * car.length * 0.3f - sin(car.rotation) * car.width * 0.4f;
            createSmokeParticle(rightX, 0, rightZ);
            
            smokeTimer = 0;
        }
    }
    
    // Render
    render();
}

// Keyboard callbacks
EM_BOOL keyCallback(int eventType, const EmscriptenKeyboardEvent *e, void *userData) {
    bool isDown = (eventType == EMSCRIPTEN_EVENT_KEYDOWN);
    
    if (e->keyCode < 256) {
        gameState.keys[e->keyCode] = isDown;
    }
    
    return true;
}

// Initialize game
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void initGame(int width, int height) {
        gameState.canvasWidth = width;
        gameState.canvasHeight = height;
        
        // Set up OpenGL
        glViewport(0, 0, width, height);
        glMatrixMode(GL_PROJECTION);
        glLoadIdentity();
        gluPerspective(45.0, (float)width / (float)height, 0.1, 1000.0);
        glMatrixMode(GL_MODELVIEW);
        
        glEnable(GL_DEPTH_TEST);
        glClearColor(0.53f, 0.81f, 0.92f, 1.0f); // Sky blue
        
        // Set up keyboard input
        emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, nullptr, true, keyCallback);
        emscripten_set_keyup_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, nullptr, true, keyCallback);
        
        printf("Racing Game Initialized!\n");
        printf("Controls: WASD to drive, Space to brake\n");
        printf("Max Speed: %.1f units/s\n", MAX_SPEED);
    }
    
    EMSCRIPTEN_KEEPALIVE
    void getCarInfo(float* x, float* y, float* z, float* speed, float* rotation) {
        *x = gameState.playerCar.x;
        *y = gameState.playerCar.y;
        *z = gameState.playerCar.z;
        *speed = gameState.playerCar.speed;
        *rotation = gameState.playerCar.rotation;
    }
}

int main() {
    // Start game loop
    emscripten_set_main_loop(gameLoop, 0, 1);
    return 0;
}
