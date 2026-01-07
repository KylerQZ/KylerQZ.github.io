import * as THREE from 'three';

// ============================================
// SCENE SETUP
// ============================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4a4a3a); // Dusty/smoky atmosphere
scene.fog = new THREE.Fog(0x6a6a5a, 50, 400); // Bigger world fog

const WORLD_SIZE = 300; // Much bigger world!

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ============================================
// LIGHTING - WAR ZONE ATMOSPHERE
// ============================================

const ambient = new THREE.AmbientLight(0x3a3a2a, 0.4); // Dim, dusty light
scene.add(ambient);

// Simulated explosions/fires in distance
const fireLight1 = new THREE.PointLight(0xFF4500, 2, 60);
fireLight1.position.set(-30, 5, -30);
scene.add(fireLight1);

const fireLight2 = new THREE.PointLight(0xFF6600, 1.5, 50);
fireLight2.position.set(35, 5, 25);
scene.add(fireLight2);

// Flickering fire effect
setInterval(() => {
    fireLight1.intensity = 1.5 + Math.random() * 1;
    fireLight2.intensity = 1 + Math.random() * 1;
}, 100);

// Main sunlight (overcast war zone)
const mainLight = new THREE.DirectionalLight(0x9a9a8a, 0.6);
mainLight.position.set(50, 100, 50);
mainLight.castShadow = true;
mainLight.shadow.camera.left = -60;
mainLight.shadow.camera.right = 60;
mainLight.shadow.camera.top = 60;
mainLight.shadow.camera.bottom = -60;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
scene.add(mainLight);

// ============================================
// WAR ZONE ENVIRONMENT
// ============================================

// Destroyed ground with craters - MUCH BIGGER
const floorGeometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 100, 100);
const vertices = floorGeometry.attributes.position.array;
for (let i = 0; i < vertices.length; i += 3) {
    vertices[i + 2] = Math.random() * 0.5 - 0.2; // Random height variation
}
floorGeometry.attributes.position.needsUpdate = true;
floorGeometry.computeVertexNormals();

const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4a4a3a, // Dirt/mud color
    roughness: 0.95,
    metalness: 0
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Destroyed concrete walls
function createWall(x, z, width, depth) {
    const geometry = new THREE.BoxGeometry(width, 4, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x5a5a4a, // Concrete color
        roughness: 0.9
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
}

// Damaged perimeter walls - bigger world
const wallDist = WORLD_SIZE / 2 + 5;
scene.add(createWall(0, -wallDist, WORLD_SIZE + 10, 3));
scene.add(createWall(0, wallDist, WORLD_SIZE + 10, 3));
scene.add(createWall(-wallDist, 0, 3, WORLD_SIZE + 10));
scene.add(createWall(wallDist, 0, 3, WORLD_SIZE + 10));

// Sandbag barriers and destroyed vehicles
for (let i = 0; i < 15; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = (Math.random() - 0.5) * 90;
    
    // Sandbags
    const sandbag = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1.2, 2),
        new THREE.MeshStandardMaterial({ 
            color: 0x6a5a4a,
            roughness: 0.95
        })
    );
    sandbag.position.set(x, 0.6, z);
    sandbag.rotation.y = Math.random() * Math.PI;
    sandbag.castShadow = true;
    sandbag.receiveShadow = true;
    scene.add(sandbag);
}

// Destroyed vehicles/debris
for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 85;
    const z = (Math.random() - 0.5) * 85;
    
    // Vehicle wreckage
    const wreckage = new THREE.Mesh(
        new THREE.BoxGeometry(5, 2, 3),
        new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            roughness: 0.8,
            metalness: 0.3
        })
    );
    wreckage.position.set(x, 1, z);
    wreckage.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.3
    );
    wreckage.castShadow = true;
    wreckage.receiveShadow = true;
    scene.add(wreckage);
}

// Barbed wire obstacles
for (let i = 0; i < 12; i++) {
    const x = (Math.random() - 0.5) * 95;
    const z = (Math.random() - 0.5) * 95;
    
    const wire = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.05, 8, 16),
        new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            metalness: 0.7,
            roughness: 0.4
        })
    );
    wire.position.set(x, 0.5, z);
    wire.rotation.x = Math.PI / 2;
    wire.castShadow = true;
    scene.add(wire);
}

// Smoke/fire effects (particle-like)
for (let i = 0; i < 5; i++) {
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    
    const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(3, 8, 8),
        new THREE.MeshBasicMaterial({ 
            color: 0x2a2a2a,
            transparent: true,
            opacity: 0.3
        })
    );
    smoke.position.set(x, 5, z);
    scene.add(smoke);
}

// Dead trees scattered around
function createDeadTree(x, z) {
    const tree = new THREE.Group();
    
    // Trunk
    const trunkHeight = 6 + Math.random() * 4;
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, trunkHeight, 8),
        new THREE.MeshStandardMaterial({ 
            color: 0x3a2a1a,
            roughness: 0.95
        })
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);
    
    // Broken branches
    const numBranches = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numBranches; i++) {
        const branchLength = 1 + Math.random() * 2;
        const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.05, branchLength, 6),
            new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.95 })
        );
        const angle = (i / numBranches) * Math.PI * 2;
        const height = trunkHeight * 0.4 + Math.random() * trunkHeight * 0.4;
        branch.position.set(
            Math.cos(angle) * 0.3,
            height,
            Math.sin(angle) * 0.3
        );
        branch.rotation.z = Math.PI / 3 + Math.random() * 0.5;
        branch.rotation.y = angle;
        branch.castShadow = true;
        tree.add(branch);
    }
    
    tree.position.set(x, 0, z);
    return tree;
}

// Add dead trees
for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * (WORLD_SIZE * 0.85);
    const z = (Math.random() - 0.5) * (WORLD_SIZE * 0.85);
    // Don't spawn too close to center
    if (Math.abs(x) > 20 || Math.abs(z) > 20) {
        const tree = createDeadTree(x, z);
        scene.add(tree);
    }
}

// Small abandoned houses
function createSmallHouse(x, z) {
    const house = new THREE.Group();
    
    const width = 8 + Math.random() * 4;
    const depth = 8 + Math.random() * 4;
    const height = 4 + Math.random() * 2;
    
    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a3a2a,
        roughness: 0.9
    });
    
    // Front wall with door hole
    const frontLeft = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.3, height, 0.3),
        wallMaterial
    );
    frontLeft.position.set(-width * 0.25, height / 2, depth / 2);
    frontLeft.castShadow = true;
    frontLeft.receiveShadow = true;
    house.add(frontLeft);
    
    const frontRight = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.3, height, 0.3),
        wallMaterial
    );
    frontRight.position.set(width * 0.25, height / 2, depth / 2);
    frontRight.castShadow = true;
    frontRight.receiveShadow = true;
    house.add(frontRight);
    
    // Back wall (damaged)
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height * 0.6, 0.3),
        wallMaterial
    );
    backWall.position.set(0, height * 0.3, -depth / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    house.add(backWall);
    
    // Side walls
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, height, depth),
        wallMaterial
    );
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    house.add(leftWall);
    
    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, height, depth),
        wallMaterial
    );
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    house.add(rightWall);
    
    // Damaged roof
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width + 1, 0.3, depth + 1),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 })
    );
    roof.position.y = height;
    roof.rotation.x = 0.1;
    roof.castShadow = true;
    roof.receiveShadow = true;
    house.add(roof);
    
    // Windows
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        transparent: true,
        opacity: 0.3
    });
    
    const window1 = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 0.35),
        windowMaterial
    );
    window1.position.set(-width * 0.3, height * 0.5, depth / 2);
    house.add(window1);
    
    const window2 = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 0.35),
        windowMaterial
    );
    window2.position.set(width * 0.3, height * 0.5, depth / 2);
    house.add(window2);
    
    house.position.set(x, 0, z);
    return house;
}

// Add small abandoned houses
for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const distance = 40 + Math.random() * 50;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const house = createSmallHouse(x, z);
    scene.add(house);
}

// ============================================
// PLAYER
// ============================================

const player = {
    position: new THREE.Vector3(0, 1.6, 0),
    velocity: new THREE.Vector3(),
    health: 100,
    maxHealth: 100
};

let cameraYaw = 0;
let cameraPitch = 0;
let isPointerLocked = false;
let bobTime = 0;

canvas.addEventListener('click', () => {
    if (gameStarted && !gameOver && !isPaused) {
        canvas.requestPointerLock().catch(err => {
            console.log('Pointer lock failed:', err);
        });
    }
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === canvas;
});

const WALK_SPEED = 15;
const SPRINT_SPEED = 22;
const JUMP_VELOCITY = 10;
const GRAVITY = 30;

const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false
};

// ============================================
// WEAPON SYSTEM
// ============================================

const weapon = {
    damage: 25,
    fireRate: 0.08, // LMG: Faster fire rate
    reloadTime: 3, // LMG: Longer reload time
    magazineSize: 50, // LMG: 50 round magazine
    totalAmmo: 500, // LMG: 500 total ammo
    currentAmmo: 50,
    reserveAmmo: 450,
    isReloading: false,
    canShoot: true,
    shootCooldown: 0
};

// ============================================
// GAME STATE & PREP TIME
// ============================================

let prepTime = 20; // 20 seconds to prepare
let prepPhase = true;
let combatPhase = false;
const baseWalls = []; // Pre-built base walls
const playerWalls = []; // Player-built walls

// ============================================
// ECONOMY & UPGRADE SYSTEM
// ============================================

let gold = 0;
let baseLevel = 1;
let buildMode = false;
let selectedWallType = 'wood';
let isPaused = false;
let isAiming = false;

// Gun upgrade levels
let gunDamageLevel = 1;
let gunFireRateLevel = 1;
let gunMagazineLevel = 1;

// ============================================
// AUDIO SYSTEM
// ============================================

// Create audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Gun shoot sound (synthesized)
function playShootSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Sharp, punchy gun sound
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Reload sound
function playReloadSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(200, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Hit sound
function playHitSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
}

// Headshot sound
function playHeadshotSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
}

// Wall types with stats
const wallTypes = {
    wood: {
        name: 'Wood Wall',
        cost: 10,
        health: 100,
        maxHealth: 100,
        color: 0x8B4513,
        unlockLevel: 1
    },
    stone: {
        name: 'Stone Wall',
        cost: 25,
        health: 250,
        maxHealth: 250,
        color: 0x808080,
        unlockLevel: 2
    },
    metal: {
        name: 'Metal Wall',
        cost: 50,
        health: 500,
        maxHealth: 500,
        color: 0x4a4a4a,
        unlockLevel: 3
    }
};

// Base level upgrades
const baseLevels = {
    1: {
        name: 'Basic Base',
        cost: 0,
        unlocks: ['Wood Walls'],
        description: 'Can build wood walls'
    },
    2: {
        name: 'Fortified Base',
        cost: 100,
        unlocks: ['Stone Walls', 'Buy Ammo'],
        description: 'Stone walls + ammo shop'
    },
    3: {
        name: 'Military Base',
        cost: 250,
        unlocks: ['Metal Walls', 'Buy Teammates'],
        description: 'Metal walls + recruit soldiers'
    },
    4: {
        name: 'Command Center',
        cost: 500,
        unlocks: ['Turrets', 'Health Packs'],
        description: 'Auto-turrets + healing'
    }
};

// ============================================
// BASE HOUSE - PRE-BUILT DEFENSIVE STRUCTURE
// ============================================

function createBaseHouse() {
    const baseGroup = new THREE.Group();
    
    // House dimensions
    const houseWidth = 30;
    const houseDepth = 30;
    const wallHeight = 5;
    const wallThickness = 1;
    
    // Floor
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(houseWidth, 0.5, houseDepth),
        new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            roughness: 0.9
        })
    );
    floor.position.y = 0.25;
    floor.receiveShadow = true;
    baseGroup.add(floor);
    
    // Back wall (with holes - abandoned!)
    // Left section
    const backWallLeft = new THREE.Mesh(
        new THREE.BoxGeometry(8, wallHeight, wallThickness),
        new THREE.MeshStandardMaterial({ 
            color: 0x4a4a3a,
            roughness: 0.95
        })
    );
    backWallLeft.position.set(-11, wallHeight / 2, -houseDepth / 2);
    backWallLeft.castShadow = true;
    backWallLeft.receiveShadow = true;
    baseGroup.add(backWallLeft);
    baseWalls.push(backWallLeft);
    
    // Right section
    const backWallRight = new THREE.Mesh(
        new THREE.BoxGeometry(8, wallHeight, wallThickness),
        new THREE.MeshStandardMaterial({ 
            color: 0x4a4a3a,
            roughness: 0.95
        })
    );
    backWallRight.position.set(11, wallHeight / 2, -houseDepth / 2);
    backWallRight.castShadow = true;
    backWallRight.receiveShadow = true;
    baseGroup.add(backWallRight);
    baseWalls.push(backWallRight);
    
    // Top section (above hole)
    const backWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(8, 2, wallThickness),
        new THREE.MeshStandardMaterial({ 
            color: 0x4a4a3a,
            roughness: 0.95
        })
    );
    backWallTop.position.set(0, 4, -houseDepth / 2);
    backWallTop.castShadow = true;
    backWallTop.receiveShadow = true;
    baseGroup.add(backWallTop);
    baseWalls.push(backWallTop);
    
    // Left wall (with holes - abandoned!)
    // Bottom section
    const leftWallBottom = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, 2, houseDepth),
        new THREE.MeshStandardMaterial({ 
            color: 0x4a4a3a,
            roughness: 0.95
        })
    );
    leftWallBottom.position.set(-houseWidth / 2, 1, 0);
    leftWallBottom.castShadow = true;
    leftWallBottom.receiveShadow = true;
    baseGroup.add(leftWallBottom);
    baseWalls.push(leftWallBottom);
    
    // Top section
    const leftWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, 2, houseDepth),
        new THREE.MeshStandardMaterial({ 
            color: 0x4a4a3a,
            roughness: 0.95
        })
    );
    leftWallTop.position.set(-houseWidth / 2, 4, 0);
    leftWallTop.castShadow = true;
    leftWallTop.receiveShadow = true;
    baseGroup.add(leftWallTop);
    baseWalls.push(leftWallTop);
    
    // Right wall (with holes - abandoned!)
    // Bottom section
    const rightWallBottom = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, 2, houseDepth),
        new THREE.MeshStandardMaterial({ 
            color: 0x4a4a3a,
            roughness: 0.95
        })
    );
    rightWallBottom.position.set(houseWidth / 2, 1, 0);
    rightWallBottom.castShadow = true;
    rightWallBottom.receiveShadow = true;
    baseGroup.add(rightWallBottom);
    baseWalls.push(rightWallBottom);
    
    // Top section
    const rightWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, 2, houseDepth),
        new THREE.MeshStandardMaterial({ 
            color: 0x4a4a3a,
            roughness: 0.95
        })
    );
    rightWallTop.position.set(houseWidth / 2, 4, 0);
    rightWallTop.castShadow = true;
    rightWallTop.receiveShadow = true;
    baseGroup.add(rightWallTop);
    baseWalls.push(rightWallTop);
    
    // Front wall - LEFT section (with gap for entrance)
    const frontLeftWall = new THREE.Mesh(
        new THREE.BoxGeometry(10, wallHeight, wallThickness),
        new THREE.MeshStandardMaterial({ 
            color: 0x5a5a4a,
            roughness: 0.9
        })
    );
    frontLeftWall.position.set(-10, wallHeight / 2, houseDepth / 2);
    frontLeftWall.castShadow = true;
    frontLeftWall.receiveShadow = true;
    baseGroup.add(frontLeftWall);
    baseWalls.push(frontLeftWall);
    
    // Front wall - RIGHT section
    const frontRightWall = new THREE.Mesh(
        new THREE.BoxGeometry(10, wallHeight, wallThickness),
        new THREE.MeshStandardMaterial({ 
            color: 0x5a5a4a,
            roughness: 0.9
        })
    );
    frontRightWall.position.set(10, wallHeight / 2, houseDepth / 2);
    frontRightWall.castShadow = true;
    frontRightWall.receiveShadow = true;
    baseGroup.add(frontRightWall);
    baseWalls.push(frontRightWall);
    
    // Roof (with skylight holes!)
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(houseWidth + 2, 0.5, houseDepth + 2),
        new THREE.MeshStandardMaterial({ 
            color: 0x5a4a4a,
            roughness: 0.7
        })
    );
    roof.position.y = wallHeight + 0.25;
    roof.castShadow = true;
    roof.receiveShadow = true;
    baseGroup.add(roof);
    
    // Skylights (holes in roof for natural light)
    for (let i = 0; i < 3; i++) {
        const skylight = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.6, 4),
            new THREE.MeshStandardMaterial({ 
                color: 0x88CCFF,
                transparent: true,
                opacity: 0.4,
                emissive: 0x4488FF,
                emissiveIntensity: 0.3
            })
        );
        skylight.position.set(-8 + i * 8, wallHeight + 0.25, 0);
        baseGroup.add(skylight);
    }
    
    // Interior lights (BRIGHTER!)
    const light1 = new THREE.PointLight(0xFFDD88, 3, 50);
    light1.position.set(-8, 3, 0);
    light1.castShadow = true;
    baseGroup.add(light1);
    
    const light2 = new THREE.PointLight(0xFFDD88, 3, 50);
    light2.position.set(8, 3, 0);
    light2.castShadow = true;
    baseGroup.add(light2);
    
    const light3 = new THREE.PointLight(0xFFDD88, 3, 50);
    light3.position.set(0, 3, -8);
    light3.castShadow = true;
    baseGroup.add(light3);
    
    // Center ceiling light (VERY BRIGHT)
    const centerLight = new THREE.PointLight(0xFFFFFF, 4, 60);
    centerLight.position.set(0, 4, 0);
    centerLight.castShadow = true;
    baseGroup.add(centerLight);
    
    // Ambient light for overall brightness
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
    baseGroup.add(ambientLight);
    
    // Shooting windows on left wall (BIGGER!)
    for (let i = 0; i < 4; i++) {
        const window = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness + 0.2, 1.5, 3),
            new THREE.MeshStandardMaterial({ 
                color: 0x1a1a1a,
                transparent: true,
                opacity: 0.3
            })
        );
        window.position.set(-houseWidth / 2, 2 + i * 0.5, -10 + i * 6);
        baseGroup.add(window);
    }
    
    // Shooting windows on right wall (BIGGER!)
    for (let i = 0; i < 4; i++) {
        const window = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness + 0.2, 1.5, 3),
            new THREE.MeshStandardMaterial({ 
                color: 0x1a1a1a,
                transparent: true,
                opacity: 0.3
            })
        );
        window.position.set(houseWidth / 2, 2 + i * 0.5, -10 + i * 6);
        baseGroup.add(window);
    }
    
    // Back wall windows (NEW!)
    for (let i = 0; i < 3; i++) {
        const window = new THREE.Mesh(
            new THREE.BoxGeometry(3, 1.5, wallThickness + 0.2),
            new THREE.MeshStandardMaterial({ 
                color: 0x1a1a1a,
                transparent: true,
                opacity: 0.3
            })
        );
        window.position.set(-8 + i * 8, 2.5, -houseDepth / 2);
        baseGroup.add(window);
    }
    
    // Door frame (front)
    const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(8, wallHeight, wallThickness + 0.2),
        new THREE.MeshStandardMaterial({ 
            color: 0x3a2a2a,
            roughness: 0.7
        })
    );
    doorFrame.position.set(0, wallHeight / 2, houseDepth / 2);
    baseGroup.add(doorFrame);
    
    // Side door - LEFT
    const leftDoor = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness + 0.2, wallHeight - 1, 4),
        new THREE.MeshStandardMaterial({ 
            color: 0x3a2a2a,
            roughness: 0.7
        })
    );
    leftDoor.position.set(-houseWidth / 2, wallHeight / 2, 8);
    baseGroup.add(leftDoor);
    
    // Side door - RIGHT
    const rightDoor = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness + 0.2, wallHeight - 1, 4),
        new THREE.MeshStandardMaterial({ 
            color: 0x3a2a2a,
            roughness: 0.7
        })
    );
    rightDoor.position.set(houseWidth / 2, wallHeight / 2, 8);
    baseGroup.add(rightDoor);
    
    // Sandbag barriers in front of entrance
    for (let i = 0; i < 4; i++) {
        const sandbag = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 1.5),
            new THREE.MeshStandardMaterial({ 
                color: 0x6a5a4a,
                roughness: 0.95
            })
        );
        const angle = (i - 1.5) * 0.5;
        sandbag.position.set(Math.sin(angle) * 8, 0.5, houseDepth / 2 + 3 + Math.abs(angle) * 2);
        sandbag.rotation.y = angle;
        sandbag.castShadow = true;
        sandbag.receiveShadow = true;
        baseGroup.add(sandbag);
        baseWalls.push(sandbag);
    }
    
    // Position the entire base at spawn
    baseGroup.position.set(0, 0, 0);
    
    return baseGroup;
}

// Create and add the base house
const baseHouse = createBaseHouse();
scene.add(baseHouse);

// ============================================
// AI TEAMMATES
// ============================================

const teammates = [];
const MAX_TEAMMATES = 10;

function createTeammate(x, z) {
    const teammate = new THREE.Group();
    
    // Body - Blue to distinguish from enemies
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.4, 0.6),
        new THREE.MeshStandardMaterial({ 
            color: 0x0066FF,
            emissive: 0x003388,
            emissiveIntensity: 0.2
        })
    );
    body.position.y = 0.7;
    body.castShadow = true;
    teammate.add(body);
    
    // Head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshStandardMaterial({ 
            color: 0x0088FF,
            emissive: 0x004488,
            emissiveIntensity: 0.3
        })
    );
    head.position.y = 1.6;
    head.castShadow = true;
    teammate.add(head);
    
    // Helmet
    const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            metalness: 0.5
        })
    );
    helmet.position.y = 1.7;
    teammate.add(helmet);
    
    teammate.position.set(x, 0, z);
    
    teammate.userData = {
        health: 100,
        maxHealth: 100,
        speed: 12,
        damage: 20,
        shootRate: 0.5,
        shootCooldown: 0,
        sightRange: 40,
        followDistance: 5,
        isTeammate: true
    };
    
    // Add health bar above teammate
    const barWidth = 1.2;
    const barHeight = 0.15;
    
    // Background (red)
    const bgBar = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth, barHeight),
        new THREE.MeshBasicMaterial({ color: 0xFF0000, side: THREE.DoubleSide })
    );
    bgBar.position.set(0, 2.2, 0);
    teammate.add(bgBar);
    
    // Foreground (green - health)
    const healthBar = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth, barHeight),
        new THREE.MeshBasicMaterial({ color: 0x00FF00, side: THREE.DoubleSide })
    );
    healthBar.position.set(0, 2.2, 0.01);
    teammate.add(healthBar);
    
    // Store reference
    teammate.userData.healthBar = healthBar;
    teammate.userData.maxBarWidth = barWidth;
    
    return teammate;
}
// Spawn teammates around player
for (let i = 0; i < MAX_TEAMMATES; i++) {
    const angle = (i / MAX_TEAMMATES) * Math.PI * 2;
    const distance = 5 + Math.random() * 3;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const teammate = createTeammate(x, z);
    scene.add(teammate);
    teammates.push(teammate);
}

// Weapon model (visible in first person) - REALISTIC ASSAULT RIFLE WITH SCOPE
const weaponGroup = new THREE.Group();

// Main gun body (receiver)
const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 })
);
gunBody.position.set(0.25, -0.25, -0.5);
weaponGroup.add(gunBody);

// Stock (back part)
const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.08, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 })
);
stock.position.set(0.25, -0.23, -0.15);
weaponGroup.add(stock);

// Barrel
const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.95, roughness: 0.1 })
);
barrel.rotation.x = Math.PI / 2;
barrel.position.set(0.25, -0.2, -0.95);
weaponGroup.add(barrel);

// Barrel shroud
const barrelShroud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.4 })
);
barrelShroud.rotation.x = Math.PI / 2;
barrelShroud.position.set(0.25, -0.2, -0.9);
weaponGroup.add(barrelShroud);

// Magazine - LMG BOX MAGAZINE (larger for 50 rounds)
const magazine = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.22, 0.12), // Bigger box mag
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6 })
);
magazine.position.set(0.25, -0.42, -0.55);
weaponGroup.add(magazine);

// Pistol grip
const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.12, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 })
);
grip.position.set(0.25, -0.35, -0.45);
grip.rotation.z = 0.2;
weaponGroup.add(grip);

// Trigger guard
const triggerGuard = new THREE.Mesh(
    new THREE.TorusGeometry(0.03, 0.005, 8, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8 })
);
triggerGuard.rotation.x = Math.PI / 2;
triggerGuard.position.set(0.25, -0.3, -0.5);
weaponGroup.add(triggerGuard);

// Scope mount
const scopeMount = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9 })
);
scopeMount.position.set(0.25, -0.12, -0.55);
weaponGroup.add(scopeMount);

// Scope body
const scopeBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2 })
);
scopeBody.rotation.z = Math.PI / 2;
scopeBody.position.set(0.25, -0.08, -0.55);
weaponGroup.add(scopeBody);

// Scope lens (front)
const scopeLensFront = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 16),
    new THREE.MeshStandardMaterial({ 
        color: 0x4488FF, 
        metalness: 0.9, 
        roughness: 0.1,
        emissive: 0x2244AA,
        emissiveIntensity: 0.3
    })
);
scopeLensFront.position.set(0.25, -0.08, -0.65);
weaponGroup.add(scopeLensFront);

// Scope lens (back)
const scopeLensBack = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 16),
    new THREE.MeshStandardMaterial({ 
        color: 0x2244AA, 
        metalness: 0.9, 
        roughness: 0.1,
        emissive: 0x1133AA,
        emissiveIntensity: 0.5
    })
);
scopeLensBack.rotation.y = Math.PI;
scopeLensBack.position.set(0.25, -0.08, -0.45);
weaponGroup.add(scopeLensBack);

// Front sight
const frontSight = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.03, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xFFAA00, emissive: 0xFF8800, emissiveIntensity: 0.5 })
);
frontSight.position.set(0.25, -0.17, -1.0);
weaponGroup.add(frontSight);

// Foregrip
const foregrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.08, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 })
);
foregrip.position.set(0.25, -0.32, -0.75);
weaponGroup.add(foregrip);

camera.add(weaponGroup);
scene.add(camera);

// Muzzle flash
let muzzleFlash = null;

// ============================================
// ENEMIES
// ============================================

const enemies = [];

function createEnemy(x, z) {
    const enemy = new THREE.Group();
    
    // Body - Gray military uniform (not scary)
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.5, 0.7),
        new THREE.MeshStandardMaterial({ 
            color: 0x4a4a4a, // Gray uniform
            roughness: 0.8
        })
    );
    body.position.y = 0.75;
    body.castShadow = true;
    enemy.add(body);
    
    // Head - Normal skin tone
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshStandardMaterial({ 
            color: 0xD4A574, // Skin tone
            roughness: 0.7
        })
    );
    head.position.y = 1.8;
    head.castShadow = true;
    enemy.add(head);
    
    // Helmet - Dark military helmet
    const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.37, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            metalness: 0.3,
            roughness: 0.7
        })
    );
    helmet.position.y = 1.9;
    enemy.add(helmet);
    
    // Simple eyes (not glowing/scary)
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.12, 1.85, 0.32);
    enemy.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.12, 1.85, 0.32);
    enemy.add(rightEye);
    
    // Weapon in hand
    const gun = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    gun.position.set(0.4, 1, 0.3);
    gun.rotation.y = -Math.PI / 4;
    enemy.add(gun);
    
    enemy.position.set(x, 0, z);
    
    enemy.userData = {
        health: 100,
        maxHealth: 100,
        speed: 8 + Math.random() * 3, // Faster since melee only
        damage: 25, // Higher melee damage
        attackCooldown: 0,
        attackRate: 1,
        sightRange: 60,
        isEnemy: true,
        targetPosition: null,
        pathUpdateTimer: 0,
        stuckTimer: 0,
        lastPosition: new THREE.Vector3()
    };
    
    return enemy;
}

function spawnWave(waveNumber) {
    const enemyCount = 50 + (waveNumber - 1) * 10; // +10 enemies per wave!
    // Spawn from far side of map
    const spawnSide = Math.random() < 0.5 ? 1 : -1;
    const spawnZ = spawnSide * (WORLD_SIZE / 2 - 20);
    
    for (let i = 0; i < enemyCount; i++) {
        const x = (Math.random() - 0.5) * (WORLD_SIZE * 0.8);
        const z = spawnZ + (Math.random() - 0.5) * 40;
        const enemy = createEnemy(x, z);
        scene.add(enemy);
        enemies.push(enemy);
    }
    console.log(`Wave ${waveNumber}: ${enemyCount} enemies spawned from ${spawnSide > 0 ? 'NORTH' : 'SOUTH'}!`);
}

// ============================================
// PROJECTILES
// ============================================

const bullets = [];

function createBullet(position, direction) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xFFFF00,
        emissive: 0xFFFF00,
        emissiveIntensity: 1
    });
    const bullet = new THREE.Mesh(geometry, material);
    bullet.position.copy(position);
    
    bullet.userData = {
        velocity: direction.clone().multiplyScalar(100),
        lifetime: 2
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    return bullet;
}

// ============================================
// GAME STATE
// ============================================

let gameStarted = false;
let gameOver = false;
let kills = 0;
let currentWave = 1;

// ============================================
// INPUT
// ============================================

document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'Space':
            e.preventDefault();
            if (player.position.y <= 1.6) {
                player.velocity.y = JUMP_VELOCITY;
            }
            break;
        case 'ShiftLeft': moveState.sprint = true; break;
        case 'KeyC':
            if (prepPhase) {
                buildMode = !buildMode;
                console.log('Build mode:', buildMode ? 'ON' : 'OFF');
                updateUI();
            }
            break;
        case 'KeyQ':
            if (prepPhase && buildMode) {
                // Cycle through wall types based on level
                if (selectedWallType === 'wood' && baseLevel >= 2) {
                    selectedWallType = 'stone';
                } else if (selectedWallType === 'stone' && baseLevel >= 3) {
                    selectedWallType = 'metal';
                } else if (selectedWallType === 'metal') {
                    selectedWallType = 'wood';
                } else {
                    selectedWallType = 'wood';
                }
                console.log(`Selected: ${wallTypes[selectedWallType].name}`);
                updateUI();
            }
            break;
        case 'KeyU':
            if (prepPhase) {
                upgradeBase();
            }
            break;
        case 'KeyT':
            if (prepPhase && buildMode && baseLevel >= 3) {
                buyTeammate();
            }
            break;
        case 'KeyR':
            if (prepPhase && buildMode && baseLevel >= 2) {
                buyAmmo();
            } else if (!prepPhase && !buildMode) {
                reload();
            }
            break;
        case 'KeyM':
            if (prepPhase && buildMode) {
                buyMedicine();
            }
            break;
        case 'Escape':
            if (buildMode) {
                buildMode = false;
                console.log('Build mode: OFF');
                updateUI();
            } else if (gameStarted && !gameOver) {
                togglePause();
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'ShiftLeft': moveState.sprint = false; break;
    }
});

// Right-click to aim
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (isPointerLocked) {
        cameraYaw -= e.movementX * 0.002;
        cameraPitch -= e.movementY * 0.002;
        cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraPitch));
    }
});

// Track mouse button state for full auto
let isMouseDown = false;

canvas.addEventListener('mousedown', (e) => {
    if (!gameStarted || isPaused) return;
    
    if (e.button === 0) { // Left click
        isMouseDown = true;
        if (buildMode && prepPhase) {
            placeWall();
        } else if (combatPhase) {
            shoot(); // First shot
        }
    } else if (e.button === 2) { // Right click
        isAiming = true;
        document.getElementById('crosshair').classList.add('aiming');
        document.getElementById('scopeOverlay').classList.add('active');
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) { // Left click release
        isMouseDown = false;
    } else if (e.button === 2) { // Right click release
        isAiming = false;
        document.getElementById('crosshair').classList.remove('aiming');
        document.getElementById('scopeOverlay').classList.remove('active');
    }
});

// Pause system
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        document.getElementById('pauseMenu').style.display = 'block';
        document.exitPointerLock();
        updatePauseMenu();
        console.log('⏸️ GAME PAUSED');
    } else {
        document.getElementById('pauseMenu').style.display = 'none';
        // Request pointer lock with error handling
        setTimeout(() => {
            canvas.requestPointerLock().catch(err => {
                console.log('Pointer lock failed on resume:', err);
            });
        }, 100);
        console.log('▶️ GAME RESUMED');
    }
}

function updatePauseMenu() {
    document.getElementById('gunDamageLevel').textContent = gunDamageLevel;
    document.getElementById('gunDamage').textContent = weapon.damage;
    document.getElementById('gunFireRateLevel').textContent = gunFireRateLevel;
    document.getElementById('gunFireRate').textContent = weapon.fireRate.toFixed(2);
    document.getElementById('gunMagLevel').textContent = gunMagazineLevel;
    document.getElementById('gunMag').textContent = weapon.magazineSize;
}

// Gun upgrade functions
function upgradeGunDamage() {
    const cost = 50;
    if (gold < cost) {
        console.log(`Not enough gold! Need ${cost}, have ${gold}`);
        return;
    }
    
    gold -= cost;
    gunDamageLevel++;
    weapon.damage += 10; // +10 damage per level
    console.log(`🔫 Gun damage upgraded to ${weapon.damage}!`);
    updatePauseMenu();
    updateUI();
}

function upgradeGunFireRate() {
    const cost = 50;
    if (gold < cost) {
        console.log(`Not enough gold! Need ${cost}, have ${gold}`);
        return;
    }
    
    if (weapon.fireRate <= 0.02) {
        console.log('Max fire rate reached!');
        return;
    }
    
    gold -= cost;
    gunFireRateLevel++;
    weapon.fireRate = Math.max(0.02, weapon.fireRate - 0.01); // -0.01s per level (faster)
    console.log(`🔫 Fire rate upgraded to ${weapon.fireRate.toFixed(2)}s!`);
    updatePauseMenu();
    updateUI();
}

function upgradeGunMagazine() {
    const cost = 50;
    if (gold < cost) {
        console.log(`Not enough gold! Need ${cost}, have ${gold}`);
        return;
    }
    
    gold -= cost;
    gunMagazineLevel++;
    weapon.magazineSize += 10; // +10 rounds per level
    weapon.currentAmmo = weapon.magazineSize; // Refill magazine
    console.log(`🔫 Magazine upgraded to ${weapon.magazineSize} rounds!`);
    updatePauseMenu();
    updateUI();
}

// Shop functions
function upgradeBase() {
    const nextLevel = baseLevel + 1;
    if (!baseLevels[nextLevel]) {
        console.log('Max base level reached!');
        return;
    }
    
    const cost = baseLevels[nextLevel].cost;
    if (gold < cost) {
        console.log(`Not enough gold! Need ${cost}, have ${gold}`);
        return;
    }
    
    gold -= cost;
    baseLevel = nextLevel;
    console.log(`🏠 BASE UPGRADED TO LEVEL ${baseLevel}!`);
    console.log(`Unlocked: ${baseLevels[nextLevel].unlocks.join(', ')}`);
    updateUI();
}

function buyTeammate() {
    const cost = 100;
    if (gold < cost) {
        console.log(`Not enough gold! Need ${cost}, have ${gold}`);
        return;
    }
    
    if (teammates.length >= 20) {
        console.log('Max teammates reached (20)!');
        return;
    }
    
    gold -= cost;
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 3;
    const x = player.position.x + Math.cos(angle) * distance;
    const z = player.position.z + Math.sin(angle) * distance;
    const teammate = createTeammate(x, z);
    scene.add(teammate);
    teammates.push(teammate);
    console.log(`👥 Teammate recruited! Total: ${teammates.filter(t => t.userData.health > 0).length}`);
    updateUI();
}

function buyAmmo() {
    const cost = 20;
    const ammoAmount = 60;
    if (gold < cost) {
        console.log(`Not enough gold! Need ${cost}, have ${gold}`);
        return;
    }
    
    gold -= cost;
    weapon.reserveAmmo += ammoAmount;
    weapon.totalAmmo += ammoAmount;
    console.log(`🔫 Bought ${ammoAmount} ammo! Total: ${weapon.totalAmmo}`);
    updateUI();
}

function buyMedicine() {
    const cost = 30;
    if (gold < cost) {
        console.log(`Not enough gold! Need ${cost}, have ${gold}`);
        return;
    }
    
    if (player.health >= player.maxHealth) {
        console.log('Already at full health!');
        return;
    }
    
    gold -= cost;
    player.health = player.maxHealth;
    console.log(`💊 Medicine used! Health restored to ${player.maxHealth}!`);
    updateUI();
}

// Building system with costs
function placeWall() {
    const wallType = wallTypes[selectedWallType];
    
    // Check if unlocked
    if (wallType.unlockLevel > baseLevel) {
        console.log(`${wallType.name} requires Base Level ${wallType.unlockLevel}!`);
        return;
    }
    
    // Check if can afford
    if (gold < wallType.cost) {
        console.log(`Not enough gold! Need ${wallType.cost}, have ${gold}`);
        return;
    }
    
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const wallPos = player.position.clone().add(forward.multiplyScalar(5));
    wallPos.y = 2;
    
    // Create wall with health
    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(6, 4, 1),
        new THREE.MeshStandardMaterial({ 
            color: wallType.color,
            roughness: 0.9
        })
    );
    wall.position.copy(wallPos);
    wall.rotation.y = cameraYaw;
    wall.castShadow = true;
    wall.receiveShadow = true;
    
    // Add health data
    wall.userData = {
        health: wallType.health,
        maxHealth: wallType.maxHealth,
        type: selectedWallType,
        isPlayerWall: true
    };
    
    scene.add(wall);
    playerWalls.push(wall);
    baseWalls.push(wall); // Add to collision array
    
    // Add health bar above wall
    createWallHealthBar(wall);
    
    // Deduct gold
    gold -= wallType.cost;
    
    console.log(`${wallType.name} placed! Cost: ${wallType.cost} gold. Remaining: ${gold} gold`);
    updateUI();
}

// Create health bar for wall
function createWallHealthBar(wall) {
    const barWidth = 6;
    const barHeight = 0.3;
    
    // Background (red)
    const bgBar = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth, barHeight),
        new THREE.MeshBasicMaterial({ color: 0xFF0000, side: THREE.DoubleSide })
    );
    bgBar.position.set(0, 2.5, 0);
    wall.add(bgBar);
    
    // Foreground (green - health)
    const healthBar = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth, barHeight),
        new THREE.MeshBasicMaterial({ color: 0x00FF00, side: THREE.DoubleSide })
    );
    healthBar.position.set(0, 2.5, 0.01);
    wall.add(healthBar);
    
    // Store reference
    wall.userData.healthBar = healthBar;
    wall.userData.maxBarWidth = barWidth;
}

// ============================================
// SHOOTING
// ============================================

function shoot() {
    if (!weapon.canShoot || weapon.isReloading) {
        return;
    }
    
    // Infinite ammo - no ammo decrease
    // weapon.currentAmmo--;
    weapon.canShoot = false;
    weapon.shootCooldown = weapon.fireRate;
    
    // Play shoot sound
    playShootSound();
    
    // Muzzle flash
    if (muzzleFlash) scene.remove(muzzleFlash);
    muzzleFlash = new THREE.PointLight(0xFFFF00, 2, 5);
    muzzleFlash.position.copy(camera.position);
    muzzleFlash.position.add(new THREE.Vector3(0.3, -0.15, -0.9).applyQuaternion(camera.quaternion));
    scene.add(muzzleFlash);
    setTimeout(() => {
        if (muzzleFlash) scene.remove(muzzleFlash);
    }, 50);
    
    // Weapon recoil animation
    weaponGroup.position.z += 0.1;
    setTimeout(() => weaponGroup.position.z -= 0.1, 50);
    
    // Raycast to hit enemies
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    const intersects = raycaster.intersectObjects(enemies, true);
    if (intersects.length > 0) {
        let hitEnemy = intersects[0].object;
        const hitObject = intersects[0].object; // Store original hit object
        
        while (hitEnemy.parent && !enemies.includes(hitEnemy.parent)) {
            hitEnemy = hitEnemy.parent;
        }
        if (hitEnemy.parent) hitEnemy = hitEnemy.parent;
        
        const enemy = enemies.find(e => e === hitEnemy);
        if (enemy) {
            // Check for headshot (if aiming and hit head)
            const isHeadshot = isAiming && hitObject.geometry && 
                               hitObject.geometry.type === 'SphereGeometry' &&
                               hitObject.position.y > 1.3; // Head is at top
            
            let damage = weapon.damage;
            let goldReward = 1;
            
            if (isHeadshot) {
                // Instant kill + 2 gold for headshot!
                enemy.userData.health = 0;
                goldReward = 2;
                console.log('💀 HEADSHOT! +2 gold!');
                playHeadshotSound(); // Headshot sound!
            } else {
                enemy.userData.health -= damage;
                playHitSound(); // Normal hit sound
            }
            
            // Hitmarker
            showHitmarker();
            
            // Flash enemy (red for headshot, white for normal)
            const flashColor = isHeadshot ? 0xFF0000 : 0xFFFFFF;
            enemy.traverse(child => {
                if (child.isMesh) {
                    const originalColor = child.material.color.clone();
                    child.material.color.set(flashColor);
                    setTimeout(() => child.material.color.copy(originalColor), 100);
                }
            });
            
            // Kill enemy
            if (enemy.userData.health <= 0) {
                scene.remove(enemy);
                enemies.splice(enemies.indexOf(enemy), 1);
                kills++;
                gold += goldReward;
                console.log(`💰 +${goldReward} gold! Total: ${gold}`);
                
                // Hitmarker
                document.getElementById('hitmarker').style.opacity = '1';
                setTimeout(() => {
                    document.getElementById('hitmarker').style.opacity = '0';
                }, 100);
                
                updateUI();
            }
        }
    }
    
    // Auto reload disabled - infinite ammo
    // if (weapon.currentAmmo === 0) {
    //     reload();
    // }
    
    updateUI();
}

function reload() {
    if (weapon.isReloading || weapon.currentAmmo === weapon.magazineSize || weapon.reserveAmmo === 0) {
        return;
    }
    
    weapon.isReloading = true;
    playReloadSound(); // Reload sound!
    console.log('Reloading...');
    
    // RELOAD ANIMATION
    // Step 1: Lower weapon (0-0.3s)
    let reloadStep = 0;
    const reloadInterval = setInterval(() => {
        reloadStep += 0.016; // ~60fps
        
        if (reloadStep < 0.3) {
            // Lower weapon
            weaponGroup.position.y = -0.15 * (reloadStep / 0.3);
            weaponGroup.rotation.x = 0.3 * (reloadStep / 0.3);
        } else if (reloadStep < 0.8) {
            // Magazine drop (hide magazine)
            const dropProgress = (reloadStep - 0.3) / 0.5;
            magazine.position.y = -0.42 - (dropProgress * 2);
            magazine.visible = dropProgress < 0.8;
        } else if (reloadStep < 1.2) {
            // New magazine insert
            const insertProgress = (reloadStep - 0.8) / 0.4;
            magazine.visible = true;
            magazine.position.y = -0.42 - 2 + (insertProgress * 2);
        } else if (reloadStep < 1.5) {
            // Raise weapon back
            const raiseProgress = (reloadStep - 1.2) / 0.3;
            weaponGroup.position.y = -0.15 * (1 - raiseProgress);
            weaponGroup.rotation.x = 0.3 * (1 - raiseProgress);
        } else {
            // Reset to normal
            weaponGroup.position.y = 0;
            weaponGroup.rotation.x = 0;
            magazine.position.y = -0.42;
            clearInterval(reloadInterval);
        }
    }, 16);
    
    setTimeout(() => {
        const ammoNeeded = weapon.magazineSize - weapon.currentAmmo;
        const ammoToReload = Math.min(ammoNeeded, weapon.reserveAmmo);
        weapon.currentAmmo += ammoToReload;
        weapon.reserveAmmo -= ammoToReload;
        weapon.isReloading = false;
        console.log('Reload complete!');
        updateUI();
    }, weapon.reloadTime * 1000);
}

function showHitmarker() {
    const hitmarker = document.getElementById('hitmarker');
    hitmarker.style.display = 'block';
    setTimeout(() => hitmarker.style.display = 'none', 100);
}

// ============================================
// GAME LOOP
// ============================================

let prevTime = performance.now();

function updatePlayer(delta) {
    if (!gameStarted || gameOver) return;
    
    // Prep time countdown
    if (prepPhase) {
        prepTime -= delta;
        document.getElementById('prepTime').textContent = Math.max(0, Math.ceil(prepTime));
        
        if (prepTime <= 0) {
            prepPhase = false;
            combatPhase = true;
            document.getElementById('prepTime').parentElement.style.display = 'none';
            console.log('⚠️ COMBAT PHASE STARTED!');
            spawnWave(currentWave);
        }
    }
    
    // Movement
    const speed = moveState.sprint ? SPRINT_SPEED : WALK_SPEED;
    
    player.velocity.x *= 0.9;
    player.velocity.z *= 0.9;
    player.velocity.y -= GRAVITY * delta;
    
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    
    if (moveState.forward) {
        player.velocity.x += forward.x * speed * delta;
        player.velocity.z += forward.z * speed * delta;
    }
    if (moveState.backward) {
        player.velocity.x -= forward.x * speed * delta;
        player.velocity.z -= forward.z * speed * delta;
    }
    if (moveState.right) {
        player.velocity.x += right.x * speed * delta;
        player.velocity.z += right.z * speed * delta;
    }
    if (moveState.left) {
        player.velocity.x -= right.x * speed * delta;
        player.velocity.z -= right.z * speed * delta;
    }
    
    // Apply velocity with wall collision check
    const newPlayerPos = player.position.clone().add(player.velocity.clone().multiplyScalar(delta));
    
    // Check wall collision for player
    if (!checkWallCollision(newPlayerPos)) {
        player.position.copy(newPlayerPos);
    } else {
        // Try sliding along walls
        const slideX = player.position.clone();
        slideX.x = newPlayerPos.x;
        if (!checkWallCollision(slideX)) {
            player.position.x = slideX.x;
        }
        
        const slideZ = player.position.clone();
        slideZ.z = newPlayerPos.z;
        if (!checkWallCollision(slideZ)) {
            player.position.z = slideZ.z;
        }
        
        // Stop velocity if blocked
        player.velocity.x *= 0.5;
        player.velocity.z *= 0.5;
    }
    
    // Ground collision
    if (player.position.y < 1.6) {
        player.position.y = 1.6;
        player.velocity.y = 0;
    }
    
    // Update weapon cooldown
    if (weapon.shootCooldown > 0) {
        weapon.shootCooldown -= delta;
    }
    
    // Camera shake / head bobbing when moving
    const isMoving = moveState.forward || moveState.backward || moveState.left || moveState.right;
    if (isMoving && player.position.y <= 1.6) {
        const bobSpeed = moveState.sprint ? 14 : 9; // Faster bob when sprinting
        const bobAmount = moveState.sprint ? 0.1 : 0.06; // Stronger shake when sprinting
        bobTime += delta * bobSpeed;
        
        const bobY = Math.sin(bobTime) * bobAmount;
        const bobX = Math.cos(bobTime * 0.5) * bobAmount * 0.5;
        
        camera.position.y = player.position.y + bobY;
        weaponGroup.position.x = 0.25 + bobX;
        weaponGroup.position.y = -0.15 + bobY * 0.5;
    } else {
        camera.position.y = player.position.y;
        weaponGroup.position.x = 0.25;
        weaponGroup.position.y = -0.15;
        bobTime = 0;
    }
    
    // Reset canShoot when cooldown is finished
    if (weapon.shootCooldown <= 0 && !weapon.canShoot) {
        weapon.canShoot = true;
        weapon.shootCooldown = 0; // Reset to 0
    }
}

function updateTeammates(delta) {
    teammates.forEach(teammate => {
        if (teammate.userData.health <= 0) return;
        
        const data = teammate.userData;
        const distanceToPlayer = teammate.position.distanceTo(player.position);
        
        // DEFENSIVE POSITIONING when prep time is low (last 5 seconds)
        const isPreparingDefense = prepPhase && prepTime <= 5 && prepTime > 0;
        
        let targetPos;
        const teammateIndex = teammates.indexOf(teammate);
        const angle = (teammateIndex / MAX_TEAMMATES) * Math.PI * 2;
        
        if (isPreparingDefense) {
            // Move to defensive arc around player (wider formation)
            const defenseRadius = 8 + (teammateIndex % 3) * 3; // Multiple defensive rings
            const formationOffset = new THREE.Vector3(
                Math.cos(angle) * defenseRadius,
                0,
                Math.sin(angle) * defenseRadius
            );
            targetPos = player.position.clone().add(formationOffset);
            
            // Face outward for defense
            const outwardAngle = angle + Math.PI;
            teammate.rotation.y = outwardAngle;
        } else {
            // Normal following - spread out formation
            const formationOffset = new THREE.Vector3(
                Math.cos(angle) * 3,
                0,
                Math.sin(angle) * 3
            );
            targetPos = player.position.clone().add(formationOffset);
        }
        
        // Move to target position
        const moveThreshold = isPreparingDefense ? 1.0 : data.followDistance + 2;
        if (distanceToPlayer > moveThreshold || isPreparingDefense) {
            const direction = new THREE.Vector3();
            direction.subVectors(targetPos, teammate.position);
            direction.y = 0;
            
            if (direction.length() > 0.5) {
                direction.normalize();
                
                // Check for wall collisions
                const newPos = teammate.position.clone();
                const moveSpeed = isPreparingDefense ? data.speed * 1.5 : data.speed; // Faster when taking positions
                newPos.x += direction.x * moveSpeed * delta;
                newPos.z += direction.z * moveSpeed * delta;
                
                if (!checkWallCollision(newPos)) {
                    teammate.position.copy(newPos);
                }
                
                if (!isPreparingDefense) {
                    teammate.rotation.y = Math.atan2(direction.x, direction.z);
                }
            }
        }
        
        // Smarter shooting - prioritize closest threats
        data.shootCooldown -= delta;
        if (data.shootCooldown <= 0 && combatPhase) {
            // Find nearest enemy
            let nearestEnemy = null;
            let nearestDist = data.sightRange;
            
            enemies.forEach(enemy => {
                const dist = teammate.position.distanceTo(enemy.position);
                // Prioritize enemies close to player
                const distToPlayer = enemy.position.distanceTo(player.position);
                const priority = dist - (distToPlayer < 10 ? 10 : 0);
                
                if (priority < nearestDist) {
                    nearestDist = priority;
                    nearestEnemy = enemy;
                }
            });
            
            if (nearestEnemy) {
                // Face enemy
                const dirToEnemy = new THREE.Vector3();
                dirToEnemy.subVectors(nearestEnemy.position, teammate.position);
                teammate.rotation.y = Math.atan2(dirToEnemy.x, dirToEnemy.z);
                
                // Shoot at enemy
                nearestEnemy.userData.health -= data.damage;
                data.shootCooldown = data.shootRate;
                
                // Visual feedback
                nearestEnemy.traverse(child => {
                    if (child.isMesh) {
                        const originalColor = child.material.color.clone();
                        child.material.color.set(0xFFFFFF);
                        setTimeout(() => child.material.color.copy(originalColor), 100);
                    }
                });
                
                // Kill enemy
                if (nearestEnemy.userData.health <= 0) {
                    scene.remove(nearestEnemy);
                    enemies.splice(enemies.indexOf(nearestEnemy), 1);
                    kills++;
                    gold++; // +1 gold per kill!
                    updateUI();
                }
            }
        }
    });
}

// Wall collision detection
function checkWallCollision(position) {
    const checkRadius = 0.5;
    for (const wall of baseWalls) {
        const wallBox = new THREE.Box3().setFromObject(wall);
        const posBox = new THREE.Box3(
            new THREE.Vector3(position.x - checkRadius, 0, position.z - checkRadius),
            new THREE.Vector3(position.x + checkRadius, 3, position.z + checkRadius)
        );
        if (wallBox.intersectsBox(posBox)) {
            return true;
        }
    }
    return false;
}

function updateEnemies(delta) {
    if (!combatPhase) return;
    
    enemies.forEach(enemy => {
        const data = enemy.userData;
        
        // Update path periodically for smarter AI
        data.pathUpdateTimer += delta;
        if (data.pathUpdateTimer > 0.5) {
            data.pathUpdateTimer = 0;
            
            // Choose target: player or nearest teammate
            let target = player.position;
            let minDist = enemy.position.distanceTo(player.position);
            
            teammates.forEach(teammate => {
                if (teammate.userData.health > 0) {
                    const dist = enemy.position.distanceTo(teammate.position);
                    if (dist < minDist) {
                        minDist = dist;
                        target = teammate.position;
                    }
                }
            });
            
            data.targetPosition = target.clone();
        }
        
        if (!data.targetPosition) return;
        
        const direction = new THREE.Vector3();
        direction.subVectors(data.targetPosition, enemy.position);
        direction.y = 0;
        const distance = direction.length();
        
        if (distance > 1.5) { // Stop when close for melee
            direction.normalize();
            
            // Try to move towards target
            const newPos = enemy.position.clone();
            newPos.x += direction.x * data.speed * delta;
            newPos.z += direction.z * data.speed * delta;
            
            // Smart pathfinding around walls
            if (checkWallCollision(newPos)) {
                // Try to go around - check perpendicular directions
                const rightDir = new THREE.Vector3(-direction.z, 0, direction.x);
                const leftDir = new THREE.Vector3(direction.z, 0, -direction.x);
                
                const rightPos = enemy.position.clone().add(rightDir.multiplyScalar(data.speed * delta));
                const leftPos = enemy.position.clone().add(leftDir.multiplyScalar(data.speed * delta));
                
                if (!checkWallCollision(rightPos)) {
                    enemy.position.copy(rightPos);
                } else if (!checkWallCollision(leftPos)) {
                    enemy.position.copy(leftPos);
                }
                // If both blocked, stay in place
            } else {
                enemy.position.copy(newPos);
            }
            
            // Face movement direction
            enemy.rotation.y = Math.atan2(direction.x, direction.z);
        }
        
        // Melee attack when close (NO SHOOTING!)
        data.attackCooldown -= delta;
        if (data.attackCooldown <= 0) {
            // Attack player if close
            const distToPlayer = enemy.position.distanceTo(player.position);
            if (distToPlayer < 2) {
                player.health -= data.damage;
                data.attackCooldown = data.attackRate;
                console.log(`Melee attack! Health: ${player.health}`);
                
                // Screen flash
                const oldBg = scene.background.clone();
                scene.background.set(0xFF0000);
                setTimeout(() => scene.background.copy(oldBg), 100);
                
                if (player.health <= 0) {
                    endGame();
                }
            }
            
            // Attack teammates if close
            teammates.forEach(teammate => {
                if (teammate.userData.health <= 0) return;
                const distToTeammate = enemy.position.distanceTo(teammate.position);
                if (distToTeammate < 2) {
                    teammate.userData.health -= data.damage;
                    data.attackCooldown = data.attackRate;
                    
                    // Update health bar
                    if (teammate.userData.healthBar) {
                        const healthPercent = teammate.userData.health / teammate.userData.maxHealth;
                        teammate.userData.healthBar.scale.x = healthPercent;
                        teammate.userData.healthBar.position.x = -(teammate.userData.maxBarWidth / 2) * (1 - healthPercent);
                        
                        // Change color based on health
                        if (healthPercent > 0.6) {
                            teammate.userData.healthBar.material.color.set(0x00FF00); // Green
                        } else if (healthPercent > 0.3) {
                            teammate.userData.healthBar.material.color.set(0xFFFF00); // Yellow
                        } else {
                            teammate.userData.healthBar.material.color.set(0xFF0000); // Red
                        }
                    }
                    
                    if (teammate.userData.health <= 0) {
                        teammate.visible = false;
                        console.log('Teammate down!');
                    }
                }
            });
            
            // Attack player-built walls if close
            for (let i = playerWalls.length - 1; i >= 0; i--) {
                const wall = playerWalls[i];
                const distToWall = enemy.position.distanceTo(wall.position);
                if (distToWall < 3) {
                    wall.userData.health -= data.damage;
                    data.attackCooldown = data.attackRate;
                    
                    // Update health bar
                    if (wall.userData.healthBar) {
                        const healthPercent = wall.userData.health / wall.userData.maxHealth;
                        wall.userData.healthBar.scale.x = healthPercent;
                        wall.userData.healthBar.position.x = -(wall.userData.maxBarWidth / 2) * (1 - healthPercent);
                        
                        // Change color based on health
                        if (healthPercent > 0.6) {
                            wall.userData.healthBar.material.color.set(0x00FF00); // Green
                        } else if (healthPercent > 0.3) {
                            wall.userData.healthBar.material.color.set(0xFFFF00); // Yellow
                        } else {
                            wall.userData.healthBar.material.color.set(0xFF0000); // Red
                        }
                    }
                    
                    // Visual feedback - flash wall
                    const originalColor = wall.material.color.clone();
                    wall.material.color.set(0xFF0000);
                    setTimeout(() => wall.material.color.copy(originalColor), 100);
                    
                    console.log(`Wall damaged! HP: ${wall.userData.health}/${wall.userData.maxHealth}`);
                    
                    // Destroy wall if health reaches 0
                    if (wall.userData.health <= 0) {
                        scene.remove(wall);
                        playerWalls.splice(i, 1);
                        const baseIndex = baseWalls.indexOf(wall);
                        if (baseIndex > -1) {
                            baseWalls.splice(baseIndex, 1);
                        }
                        console.log('💥 Wall destroyed!');
                    }
                    break; // Only attack one wall per cooldown
                }
            }
        }
    });
    
    // Check wave complete
    if (enemies.length === 0 && combatPhase) {
        currentWave++;
        prepPhase = true;
        combatPhase = false;
        prepTime = 20;
        document.getElementById('prepTime').parentElement.style.display = 'block';
        console.log(`Wave ${currentWave - 1} complete! Prep for next wave...`);
    }
}

function updateBullets(delta) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.userData.velocity.clone().multiplyScalar(delta));
        bullet.userData.lifetime -= delta;
        
        if (bullet.userData.lifetime <= 0) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

function updateUI() {
    const aliveTeammates = teammates.filter(t => t.userData.health > 0).length;
    const maxEnemies = 50 + (currentWave - 1) * 10;
    document.getElementById('health').textContent = `❤️ Health: ${Math.max(0, player.health)}/${player.maxHealth}`;
    document.getElementById('ammo').textContent = `🔫 Ammo: ${weapon.currentAmmo} / ${weapon.reserveAmmo}`;
    document.getElementById('teammates').textContent = `${aliveTeammates}/${teammates.length}`;
    document.getElementById('kills').textContent = kills;
    document.getElementById('wave').textContent = currentWave;
    document.getElementById('enemies').textContent = `${enemies.length}/${maxEnemies}`;
    document.getElementById('gold').textContent = gold;
    document.getElementById('baseLevel').textContent = baseLevel;
    
    // Build mode info
    if (prepPhase) {
        document.getElementById('buildInfo').style.display = buildMode ? 'block' : 'none';
        document.getElementById('buildModeText').textContent = buildMode ? 'Build: ON' : 'Build: OFF';
        
        const wallType = wallTypes[selectedWallType];
        document.getElementById('wallTypeText').textContent = 
            `${wallType.name} (${wallType.cost}g, ${wallType.health}HP)`;
        
        // Shop options
        let shopText = 'C - Build Mode | U - Upgrade';
        if (buildMode) {
            shopText = 'Q - Cycle Walls | M - Medicine (30g)';
            if (baseLevel >= 2) shopText += ' | R - Ammo (20g)';
            if (baseLevel >= 3) shopText += ' | T - Teammate (100g)';
        }
        document.getElementById('shopOptions').textContent = shopText;
    }
}

// Minimap rendering - CAMERA-CENTERED (player stays in center)
function updateMinimap() {
    const minimapCanvas = document.getElementById('minimapCanvas');
    if (!minimapCanvas) return;
    const ctx = minimapCanvas.getContext('2d');
    
    const size = 120; // Square minimap
    const centerX = size / 2;
    const centerY = size / 2;
    const viewRange = 100; // How much of the world to show (in world units)
    const scale = size / viewRange;
    
    // Clear with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);
    
    // Draw border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    
    // Draw grid lines for reference
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    const gridSize = size / 4;
    for (let i = 0; i <= 4; i++) {
        const pos = i * gridSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(size, pos);
        ctx.stroke();
    }
    
    // Draw NORTH indicator
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', centerX, 12);
    
    // Draw player walls (yellow) - relative to player
    ctx.fillStyle = '#FFFF00';
    playerWalls.forEach(wall => {
        const relX = wall.position.x - player.position.x;
        const relZ = wall.position.z - player.position.z;
        const x = centerX + relX * scale;
        const y = centerY + relZ * scale;
        if (x >= 0 && x <= size && y >= 0 && y <= size) {
            ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
    });
    
    // Draw base house walls (gray) - relative to player
    ctx.fillStyle = '#666666';
    baseWalls.forEach(wall => {
        const relX = wall.position.x - player.position.x;
        const relZ = wall.position.z - player.position.z;
        const x = centerX + relX * scale;
        const y = centerY + relZ * scale;
        if (x >= 0 && x <= size && y >= 0 && y <= size) {
            ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
    });
    
    // Draw enemies (red dots with glow) - relative to player
    enemies.forEach(enemy => {
        const relX = enemy.position.x - player.position.x;
        const relZ = enemy.position.z - player.position.z;
        const x = centerX + relX * scale;
        const y = centerY + relZ * scale;
        
        if (x >= 0 && x <= size && y >= 0 && y <= size) {
            // Glow effect
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Dot
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }
    });
    
    // Draw teammates (blue dots) - relative to player
    teammates.forEach(teammate => {
        if (teammate.userData.health > 0) {
            const relX = teammate.position.x - player.position.x;
            const relZ = teammate.position.z - player.position.z;
            const x = centerX + relX * scale;
            const y = centerY + relZ * scale;
            
            if (x >= 0 && x <= size && y >= 0 && y <= size) {
                // Glow
                ctx.fillStyle = 'rgba(0, 102, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Dot
                ctx.fillStyle = '#00AAFF';
                ctx.beginPath();
                ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
    
    // Draw player (bright green with glow) - ALWAYS IN CENTER
    // Outer glow
    ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Player dot
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player direction (view cone)
    ctx.strokeStyle = '#00FF00';
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 2;
    
    // View cone
    const viewAngle = Math.PI / 3; // 60 degree cone
    const viewDistance = 12;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, viewDistance, 
        -cameraYaw - viewAngle / 2 - Math.PI / 2,
        -cameraYaw + viewAngle / 2 - Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Enemy count indicator
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`👹 ${enemies.length}`, 3, 10);
    
    // Teammate count indicator
    const aliveTeammates = teammates.filter(t => t.userData.health > 0).length;
    ctx.fillStyle = '#00AAFF';
    ctx.fillText(`👥 ${aliveTeammates}`, 3, 22);
}

function endGame() {
    gameOver = true;
    document.exitPointerLock();
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalKills').textContent = kills;
    document.getElementById('finalWave').textContent = currentWave;
    console.log('Game Over!');
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    prevTime = time;
    
    // Skip game updates if paused
    if (!isPaused) {
        // FULL AUTO FIRE - Keep shooting while mouse held
        if (isMouseDown && combatPhase && !weapon.isReloading && weapon.canShoot) {
            shoot();
        }
        
        updatePlayer(delta);
        updateTeammates(delta);
        updateEnemies(delta);
        updateBullets(delta);
        updateMinimap();
        
        // Smooth aim zoom
        const targetFOV = isAiming ? 45 : 75;
        camera.fov += (targetFOV - camera.fov) * 0.2;
        camera.updateProjectionMatrix();
        
        // AIMING ANIMATION - Move weapon closer and center it
        const targetWeaponX = isAiming ? 0 : 0.25;
        const targetWeaponY = isAiming ? -0.15 : 0;
        const targetWeaponZ = isAiming ? -0.3 : 0;
        
        weaponGroup.position.x += (targetWeaponX - weaponGroup.position.x) * 0.15;
        weaponGroup.position.y += (targetWeaponY - weaponGroup.position.y) * 0.15;
        weaponGroup.position.z += (targetWeaponZ - weaponGroup.position.z) * 0.15;
        
        // Update camera position and rotation
        camera.position.copy(player.position);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = cameraYaw;
        camera.rotation.x = cameraPitch;
    }
    
    renderer.render(scene, camera);
}

// ============================================
// MENU
// ============================================

document.getElementById('loading').style.display = 'none';
document.getElementById('mainMenu').style.display = 'flex';

document.getElementById('startGame').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    document.getElementById('instructions').style.display = 'block';
    document.getElementById('minimap').style.display = 'block';
    gameStarted = true;
    prepPhase = true;
    combatPhase = false;
    console.log('⏱️ PREP PHASE: 20 seconds to prepare!');
    console.log('🏠 Defend your base house from enemy waves!');
    console.log('Stay inside or near the base for protection!');
});

document.getElementById('howToPlay').addEventListener('click', () => {
    alert(`📋 MISSION BRIEFING - WARZONE SURVIVAL

SITUATION:
You are deployed in a hostile war zone. Enemy forces are advancing in waves. Your mission is to hold the position and eliminate all hostiles.

MOVEMENT:
• WASD - Tactical Movement
• SHIFT - Sprint (Limited stamina)
• SPACE - Jump/Vault
• Mouse - Aim Weapon

COMBAT:
• Left Click - Fire Weapon
• R - Reload Magazine
• Aim Center Mass for Best Results

OBJECTIVES:
• Eliminate All Enemy Combatants
• Survive Each Wave
• Maintain Combat Effectiveness (Health > 0)

TACTICAL NOTES:
• Use Sandbags and Wreckage for Cover
• Conserve Ammunition
• Reload During Safe Moments
• Keep Moving to Avoid Being Flanked
• Watch Your Six

RULES OF ENGAGEMENT:
• All Hostiles are Armed and Dangerous
• No Friendly Fire (You're Alone)
• No Retreat - Hold the Line

GOOD LUCK, SOLDIER!`);
});

document.getElementById('settings').addEventListener('click', () => {
    alert(`⚙️ SETTINGS

DIFFICULTY:
Current: HARDCORE
(Cannot be changed mid-mission)

GRAPHICS:
• Shadows: ENABLED
• Fog: ENABLED  
• Particles: ENABLED

AUDIO:
• Master Volume: 100%
• SFX: 100%
• Music: 100%

CONTROLS:
• Mouse Sensitivity: 1.0x
• Invert Y-Axis: NO

Note: Full settings menu coming in future update.`);
});

document.getElementById('restart').addEventListener('click', () => {
    location.reload();
});

// Pause menu buttons
document.getElementById('resumeGame').addEventListener('click', () => {
    togglePause();
});

document.getElementById('quitToMenu').addEventListener('click', () => {
    location.reload();
});

document.getElementById('upgradeDamage').addEventListener('click', () => {
    upgradeGunDamage();
});

document.getElementById('upgradeFireRate').addEventListener('click', () => {
    upgradeGunFireRate();
});

document.getElementById('upgradeMagazine').addEventListener('click', () => {
    upgradeGunMagazine();
});

document.getElementById('mainMenuBtn').addEventListener('click', () => {
    location.reload();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

console.log('⚠️ WARZONE SURVIVAL - MILITARY COMBAT SIMULATOR');
console.log('═══════════════════════════════════════════');
console.log('🏠 Base House: 30x30 units with shooting windows');
console.log('💰 Economy System: +1 gold per kill');
console.log('🏗️ Building: Wood/Stone/Metal walls (costs gold)');
console.log('📈 Base Levels: Unlock upgrades & abilities');
console.log('🛡️ Breakable Walls: Enemies can destroy walls!');
console.log('🛒 Shop: Buy ammo, teammates, upgrades');
console.log('⚔️ 50 Melee Enemies per wave');
console.log('═══════════════════════════════════════════');
console.log('STATUS: READY FOR DEPLOYMENT');
