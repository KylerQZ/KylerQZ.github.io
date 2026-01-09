#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#include <GLES3/gl3.h>
#include <cmath>
#include <cstdio>

// Car physics constants
// Speed scaling: 1 km/h = 20 internal units for faster gameplay feel
const float SPEED_SCALE = 20.0f; // 1 km/h = 20 units
const float MAX_SPEED_KMH = 200.0f; // Maximum speed in km/h
const float MAX_SPEED = MAX_SPEED_KMH * SPEED_SCALE; // 4000 units
const float ACCELERATION = 800.0f; // Scaled acceleration
const float DECELERATION = 300.0f; // Scaled deceleration
const float BRAKE_FORCE = 600.0f; // Scaled brake force
const float TURN_SPEED = 2.5f;
const float FRICTION = 0.98f;
const float DRIFT_FACTOR = 0.8f;
const float DRIFT_THRESHOLD = 100.0f * SPEED_SCALE; // 100 km/h = 2000 units

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
    bool driftKey = gameState.keys['E'] || gameState.keys['e']; // Manual drift control
    
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
        
        // Manual drift mode - only drift when E is pressed
        bool isDrifting = driftKey && fabs(car.speed) > DRIFT_THRESHOLD;
        float driftMultiplier = isDrifting ? 1.8f : 1.0f; // More responsive steering when drifting
        
        if (turnLeft) {
            car.steerAngle = TURN_SPEED * turnFactor * driftMultiplier;
        } else if (turnRight) {
            car.steerAngle = -TURN_SPEED * turnFactor * driftMultiplier;
        } else {
            car.steerAngle *= 0.9f; // Return to center
        }
        
        // Apply steering to rotation
        car.rotation += car.steerAngle * dt;
        
        // Drift/slide effect when E key is pressed and speed is high
        if (isDrifting && fabs(car.steerAngle) > 0.1f) {
            // Add lateral drift velocity
            float driftAmount = (fabs(car.speed) - DRIFT_THRESHOLD) / DRIFT_THRESHOLD;
            driftAmount = fmin(driftAmount, 1.0f); // Cap at 1.0
            
            // Slide perpendicular to car direction
            float slideX = cos(car.rotation) * car.steerAngle * driftAmount * 6.0f;
            float slideZ = -sin(car.rotation) * car.steerAngle * driftAmount * 6.0f;
            
            car.vx += slideX;
            car.vz += slideZ;
            
            // Apply extra friction during drift
            car.vx *= 0.97f;
            car.vz *= 0.97f;
        }
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
    
    // Boundary check with bounce physics
    const float WORLD_SIZE = 500.0f; // Larger map
    const float BOUNCE_THRESHOLD = 40.0f;
    
    if (car.x > WORLD_SIZE || car.x < -WORLD_SIZE) {
        if (fabs(car.speed) > BOUNCE_THRESHOLD) {
            // Bounce at high speed
            car.vx = -car.vx * 0.6f; // Reverse and reduce velocity
            car.speed = -car.speed * 0.6f;
        } else {
            // Stop at low speed
            car.speed = 0;
            car.vx = 0;
        }
        // Clamp position
        if (car.x > WORLD_SIZE) car.x = WORLD_SIZE;
        if (car.x < -WORLD_SIZE) car.x = -WORLD_SIZE;
    }
    
    if (car.z > WORLD_SIZE || car.z < -WORLD_SIZE) {
        if (fabs(car.speed) > BOUNCE_THRESHOLD) {
            // Bounce at high speed
            car.vz = -car.vz * 0.6f;
            car.speed = -car.speed * 0.6f;
        } else {
            // Stop at low speed
            car.speed = 0;
            car.vz = 0;
        }
        // Clamp position
        if (car.z > WORLD_SIZE) car.z = WORLD_SIZE;
        if (car.z < -WORLD_SIZE) car.z = -WORLD_SIZE;
    }
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

// Render more realistic car model
void renderCar(const Car& car) {
    glPushMatrix();
    
    // Position and rotate car
    glTranslatef(car.x, car.y, car.z);
    glRotatef(car.rotation * 180.0f / M_PI, 0, 1, 0);
    
    // Main car body - sleek sports car shape
    glColor3f(0.8f, 0.1f, 0.1f); // Metallic red
    glBegin(GL_QUADS);
    
    // Lower body
    float bodyHeight = car.height * 0.4f;
    glVertex3f(-car.width/2, 0, car.length/2);
    glVertex3f(car.width/2, 0, car.length/2);
    glVertex3f(car.width/2, bodyHeight, car.length/2);
    glVertex3f(-car.width/2, bodyHeight, car.length/2);
    
    glVertex3f(-car.width/2, 0, -car.length/2);
    glVertex3f(-car.width/2, bodyHeight, -car.length/2);
    glVertex3f(car.width/2, bodyHeight, -car.length/2);
    glVertex3f(car.width/2, 0, -car.length/2);
    
    glVertex3f(-car.width/2, 0, -car.length/2);
    glVertex3f(-car.width/2, 0, car.length/2);
    glVertex3f(-car.width/2, bodyHeight, car.length/2);
    glVertex3f(-car.width/2, bodyHeight, -car.length/2);
    
    glVertex3f(car.width/2, 0, -car.length/2);
    glVertex3f(car.width/2, bodyHeight, -car.length/2);
    glVertex3f(car.width/2, bodyHeight, car.length/2);
    glVertex3f(car.width/2, 0, car.length/2);
    glEnd();
    
    // Cabin/roof - smaller and set back
    glColor3f(0.7f, 0.1f, 0.1f);
    glBegin(GL_QUADS);
    float cabinWidth = car.width * 0.8f;
    float cabinStart = car.length * 0.1f;
    float cabinEnd = -car.length * 0.2f;
    float cabinHeight = car.height;
    
    glVertex3f(-cabinWidth/2, bodyHeight, cabinStart);
    glVertex3f(cabinWidth/2, bodyHeight, cabinStart);
    glVertex3f(cabinWidth/2, cabinHeight, cabinStart);
    glVertex3f(-cabinWidth/2, cabinHeight, cabinStart);
    
    glVertex3f(-cabinWidth/2, bodyHeight, cabinEnd);
    glVertex3f(-cabinWidth/2, cabinHeight, cabinEnd);
    glVertex3f(cabinWidth/2, cabinHeight, cabinEnd);
    glVertex3f(cabinWidth/2, bodyHeight, cabinEnd);
    
    glVertex3f(-cabinWidth/2, bodyHeight, cabinEnd);
    glVertex3f(-cabinWidth/2, bodyHeight, cabinStart);
    glVertex3f(-cabinWidth/2, cabinHeight, cabinStart);
    glVertex3f(-cabinWidth/2, cabinHeight, cabinEnd);
    
    glVertex3f(cabinWidth/2, bodyHeight, cabinEnd);
    glVertex3f(cabinWidth/2, cabinHeight, cabinEnd);
    glVertex3f(cabinWidth/2, cabinHeight, cabinStart);
    glVertex3f(cabinWidth/2, bodyHeight, cabinStart);
    
    glVertex3f(-cabinWidth/2, cabinHeight, cabinEnd);
    glVertex3f(-cabinWidth/2, cabinHeight, cabinStart);
    glVertex3f(cabinWidth/2, cabinHeight, cabinStart);
    glVertex3f(cabinWidth/2, cabinHeight, cabinEnd);
    glEnd();
    
    // Windows - dark blue/black
    glColor3f(0.1f, 0.1f, 0.2f);
    glBegin(GL_QUADS);
    float windowInset = 0.05f;
    glVertex3f(-cabinWidth/2 + windowInset, bodyHeight + windowInset, cabinStart - windowInset);
    glVertex3f(cabinWidth/2 - windowInset, bodyHeight + windowInset, cabinStart - windowInset);
    glVertex3f(cabinWidth/2 - windowInset, cabinHeight - windowInset, cabinStart - windowInset);
    glVertex3f(-cabinWidth/2 + windowInset, cabinHeight - windowInset, cabinStart - windowInset);
    glEnd();
    
    // Wheels - black
    glColor3f(0.1f, 0.1f, 0.1f);
    float wheelRadius = 0.4f;
    float wheelWidth = 0.3f;
    float wheelPositions[4][2] = {
        {car.width/2 + 0.2f, car.length/2 - 0.5f},
        {car.width/2 + 0.2f, -car.length/2 + 0.5f},
        {-car.width/2 - 0.2f, car.length/2 - 0.5f},
        {-car.width/2 - 0.2f, -car.length/2 + 0.5f}
    };
    
    for (int i = 0; i < 4; i++) {
        glPushMatrix();
        glTranslatef(wheelPositions[i][0], wheelRadius, wheelPositions[i][1]);
        glRotatef(90, 0, 0, 1);
        
        // Simple wheel cylinder
        glBegin(GL_QUAD_STRIP);
        for (int j = 0; j <= 8; j++) {
            float angle = j * M_PI / 4;
            glVertex3f(cos(angle) * wheelRadius, -wheelWidth/2, sin(angle) * wheelRadius);
            glVertex3f(cos(angle) * wheelRadius, wheelWidth/2, sin(angle) * wheelRadius);
        }
        glEnd();
        glPopMatrix();
    }
    
    // Headlights - yellow
    glColor3f(1.0f, 1.0f, 0.5f);
    glBegin(GL_QUADS);
    float lightSize = 0.2f;
    glVertex3f(-car.width/2 + 0.2f, bodyHeight * 0.5f, car.length/2);
    glVertex3f(-car.width/2 + 0.2f + lightSize, bodyHeight * 0.5f, car.length/2);
    glVertex3f(-car.width/2 + 0.2f + lightSize, bodyHeight * 0.5f + lightSize, car.length/2);
    glVertex3f(-car.width/2 + 0.2f, bodyHeight * 0.5f + lightSize, car.length/2);
    
    glVertex3f(car.width/2 - 0.2f - lightSize, bodyHeight * 0.5f, car.length/2);
    glVertex3f(car.width/2 - 0.2f, bodyHeight * 0.5f, car.length/2);
    glVertex3f(car.width/2 - 0.2f, bodyHeight * 0.5f + lightSize, car.length/2);
    glVertex3f(car.width/2 - 0.2f - lightSize, bodyHeight * 0.5f + lightSize, car.length/2);
    glEnd();
    
    // Tail lights - red
    glColor3f(1.0f, 0.0f, 0.0f);
    glBegin(GL_QUADS);
    glVertex3f(-car.width/2 + 0.2f, bodyHeight * 0.3f, -car.length/2);
    glVertex3f(-car.width/2 + 0.2f + lightSize, bodyHeight * 0.3f, -car.length/2);
    glVertex3f(-car.width/2 + 0.2f + lightSize, bodyHeight * 0.3f + lightSize, -car.length/2);
    glVertex3f(-car.width/2 + 0.2f, bodyHeight * 0.3f + lightSize, -car.length/2);
    
    glVertex3f(car.width/2 - 0.2f - lightSize, bodyHeight * 0.3f, -car.length/2);
    glVertex3f(car.width/2 - 0.2f, bodyHeight * 0.3f, -car.length/2);
    glVertex3f(car.width/2 - 0.2f, bodyHeight * 0.3f + lightSize, -car.length/2);
    glVertex3f(car.width/2 - 0.2f - lightSize, bodyHeight * 0.3f + lightSize, -car.length/2);
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

// Render clean field terrain with borders
void renderGround() {
    const float WORLD_SIZE = 500.0f;
    
    // Base ground - clean asphalt/concrete color
    glColor3f(0.35f, 0.35f, 0.35f);
    glBegin(GL_QUADS);
    glVertex3f(-WORLD_SIZE, 0, -WORLD_SIZE);
    glVertex3f(WORLD_SIZE, 0, -WORLD_SIZE);
    glVertex3f(WORLD_SIZE, 0, WORLD_SIZE);
    glVertex3f(-WORLD_SIZE, 0, WORLD_SIZE);
    glEnd();
    
    // Grid lines for depth perception
    glColor3f(0.4f, 0.4f, 0.4f);
    glLineWidth(1.0f);
    glBegin(GL_LINES);
    for (int i = -50; i <= 50; i += 5) {
        // Vertical lines
        glVertex3f(i * 10, 0.01f, -WORLD_SIZE);
        glVertex3f(i * 10, 0.01f, WORLD_SIZE);
        // Horizontal lines
        glVertex3f(-WORLD_SIZE, 0.01f, i * 10);
        glVertex3f(WORLD_SIZE, 0.01f, i * 10);
    }
    glEnd();
    
    // Border walls - red and white barriers
    float wallHeight = 2.0f;
    float wallThickness = 1.0f;
    
    // North wall
    for (int i = -50; i < 50; i++) {
        float x = i * 10;
        glColor3f((i % 2 == 0) ? 1.0f : 0.9f, (i % 2 == 0) ? 0.0f : 0.9f, (i % 2 == 0) ? 0.0f : 0.9f);
        glBegin(GL_QUADS);
        glVertex3f(x, 0, WORLD_SIZE);
        glVertex3f(x + 10, 0, WORLD_SIZE);
        glVertex3f(x + 10, wallHeight, WORLD_SIZE);
        glVertex3f(x, wallHeight, WORLD_SIZE);
        glEnd();
    }
    
    // South wall
    for (int i = -50; i < 50; i++) {
        float x = i * 10;
        glColor3f((i % 2 == 0) ? 1.0f : 0.9f, (i % 2 == 0) ? 0.0f : 0.9f, (i % 2 == 0) ? 0.0f : 0.9f);
        glBegin(GL_QUADS);
        glVertex3f(x, 0, -WORLD_SIZE);
        glVertex3f(x, wallHeight, -WORLD_SIZE);
        glVertex3f(x + 10, wallHeight, -WORLD_SIZE);
        glVertex3f(x + 10, 0, -WORLD_SIZE);
        glEnd();
    }
    
    // East wall
    for (int i = -50; i < 50; i++) {
        float z = i * 10;
        glColor3f((i % 2 == 0) ? 1.0f : 0.9f, (i % 2 == 0) ? 0.0f : 0.9f, (i % 2 == 0) ? 0.0f : 0.9f);
        glBegin(GL_QUADS);
        glVertex3f(WORLD_SIZE, 0, z);
        glVertex3f(WORLD_SIZE, wallHeight, z);
        glVertex3f(WORLD_SIZE, wallHeight, z + 10);
        glVertex3f(WORLD_SIZE, 0, z + 10);
        glEnd();
    }
    
    // West wall
    for (int i = -50; i < 50; i++) {
        float z = i * 10;
        glColor3f((i % 2 == 0) ? 1.0f : 0.9f, (i % 2 == 0) ? 0.0f : 0.9f, (i % 2 == 0) ? 0.0f : 0.9f);
        glBegin(GL_QUADS);
        glVertex3f(-WORLD_SIZE, 0, z);
        glVertex3f(-WORLD_SIZE, 0, z + 10);
        glVertex3f(-WORLD_SIZE, wallHeight, z + 10);
        glVertex3f(-WORLD_SIZE, wallHeight, z);
        glEnd();
    }
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
