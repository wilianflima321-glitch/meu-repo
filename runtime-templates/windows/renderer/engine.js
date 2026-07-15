/**
 * AETHEL GAME RUNTIME - Game Engine Core
 * 
 * Lightweight Three.js-based engine for running exported Aethel games.
 * Optimized for standalone distribution.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

// ============================================================================
// GAME ENGINE
// ============================================================================

class AethelGameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBar = document.getElementById('loading-bar');
        this.loadingStatus = document.getElementById('loading-status');
        this.gameTitle = document.getElementById('game-title');
        this.fpsCounter = document.getElementById('fps-counter');
        this.pauseMenu = document.getElementById('pause-menu');
        
        // Engine state
        this.isRunning = false;
        this.isPaused = false;
        this.showFPS = false;
        this.deltaTime = 0;
        this.lastTime = 0;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        
        // Three.js components
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.composer = null;
        this.controls = null;
        
        // Loaders
        this.gltfLoader = null;
        this.textureLoader = null;
        this.audioLoader = null;
        
        // Game state
        this.gameConfig = null;
        this.settings = null;
        this.currentScene = null;
        this.gameObjects = new Map();
        this.scripts = new Map();
        
        // Input
        this.keys = new Set();
        this.mousePosition = { x: 0, y: 0 };
        this.mouseButtons = new Set();
        
        // Audio
        this.audioContext = null;
        this.audioListener = null;
        this.sounds = new Map();
        
        // Physics (Rapier loaded dynamically)
        this.physics = null;
        this.physicsWorld = null;
        this.rigidBodies = new Map();
        
        this.init();
    }
    
    async init() {
        try {
            // Load config
            this.updateLoading(5, 'Loading configuration...');
            this.gameConfig = await window.AethelRuntime.getGameConfig();
            this.settings = await window.AethelRuntime.getSettings();
            this.gameTitle.textContent = this.gameConfig.name;
            document.title = this.gameConfig.name;
            
            // Initialize renderer
            this.updateLoading(15, 'Initializing renderer...');
            await this.initRenderer();
            
            // Initialize loaders
            this.updateLoading(25, 'Setting up asset loaders...');
            this.initLoaders();
            
            // Initialize audio
            this.updateLoading(35, 'Initializing audio system...');
            this.initAudio();
            
            // Initialize physics
            this.updateLoading(45, 'Loading physics engine...');
            await this.initPhysics();
            
            // Initialize input
            this.updateLoading(55, 'Setting up input handlers...');
            this.initInput();
            
            // Initialize UI
            this.updateLoading(65, 'Preparing UI...');
            this.initUI();
            
            // Load start scene
            this.updateLoading(75, 'Loading game scene...');
            await this.loadScene(this.gameConfig.startScene || 'main');
            
            // Start game loop
            this.updateLoading(100, 'Starting game...');
            await this.delay(500);
            
            this.hideLoading();
            this.start();
            
        } catch (error) {
            console.error('[Engine] Initialization failed:', error);
            this.loadingStatus.textContent = `Error: ${error.message}`;
            this.loadingStatus.style.color = '#ef4444';
        }
    }
    
    async initRenderer() {
        const { resolution, graphicsPreset } = this.settings;
        const res = resolution || this.gameConfig.resolution;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: this.gameConfig.antialiasing !== false,
            powerPreference: 'high-performance',
            stencil: false
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        
        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        // Bloom
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5, 0.4, 0.85
        );
        this.composer.addPass(bloomPass);
        
        // Anti-aliasing
        const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
        this.composer.addPass(smaaPass);
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    initLoaders() {
        // GLTF/GLB loader with Draco compression
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./draco/');
        
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(dracoLoader);
        
        // Texture loader
        this.textureLoader = new THREE.TextureLoader();
        
        // Audio loader
        this.audioLoader = new THREE.AudioLoader();
    }
    
    initAudio() {
        // Create audio listener and attach to camera
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);
        
        // Set volumes from settings
        this.audioListener.setMasterVolume(this.settings.volume?.master ?? 1.0);
    }
    
    async initPhysics() {
        try {
            const RAPIER = await import('@dimforge/rapier3d-compat');
            await RAPIER.init();
            this.physics = RAPIER;
            
            // Create physics world with gravity
            const gravity = { x: 0.0, y: -9.81, z: 0.0 };
            this.physicsWorld = new RAPIER.World(gravity);
            
            console.log('[Engine] Rapier physics initialized');
        } catch (error) {
            console.warn('[Engine] Physics not available:', error);
        }
    }
    
    initInput() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys.add(e.code);
            
            // Pause on Escape
            if (e.code === 'Escape' && this.isRunning) {
                this.togglePause();
            }
            
            // Toggle FPS on F3
            if (e.code === 'F3') {
                this.showFPS = !this.showFPS;
                this.fpsCounter.classList.toggle('visible', this.showFPS);
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });
        
        // Mouse
        window.addEventListener('mousemove', (e) => {
            this.mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        
        window.addEventListener('mousedown', (e) => {
            this.mouseButtons.add(e.button);
        });
        
        window.addEventListener('mouseup', (e) => {
            this.mouseButtons.delete(e.button);
        });
        
        // Prevent context menu
        window.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Pointer lock for FPS games
        this.canvas.addEventListener('click', () => {
            if (!this.isPaused && document.pointerLockElement !== this.canvas) {
                // this.canvas.requestPointerLock(); // Enable if needed
            }
        });
    }
    
    initUI() {
        // Pause menu buttons
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-save').addEventListener('click', () => this.saveGame());
        document.getElementById('btn-load').addEventListener('click', () => this.loadGameState());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitGame());
    }
    
    async loadScene(sceneName) {
        try {
            const result = await window.AethelRuntime.loadScene(sceneName);
            if (!result.success) {
                throw new Error(result.error);
            }
            
            const sceneData = result.scene;
            this.currentScene = sceneData;
            
            // Clear existing scene
            while (this.scene.children.length > 0) {
                const child = this.scene.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                this.scene.remove(child);
            }
            this.gameObjects.clear();
            
            // Load scene objects
            if (sceneData.objects) {
                for (const obj of sceneData.objects) {
                    await this.loadGameObject(obj);
                }
            }
            
            // Load lights
            if (sceneData.lights) {
                for (const light of sceneData.lights) {
                    this.createLight(light);
                }
            }
            
            // Set environment
            if (sceneData.environment) {
                this.setEnvironment(sceneData.environment);
            }
            
            // Set camera position
            if (sceneData.camera) {
                this.camera.position.set(
                    sceneData.camera.position.x,
                    sceneData.camera.position.y,
                    sceneData.camera.position.z
                );
                if (sceneData.camera.target) {
                    this.camera.lookAt(
                        sceneData.camera.target.x,
                        sceneData.camera.target.y,
                        sceneData.camera.target.z
                    );
                }
            }
            
            console.log(`[Engine] Scene '${sceneName}' loaded`);
            
        } catch (error) {
            console.error('[Engine] Failed to load scene:', error);
            
            // Create default scene
            this.createDefaultScene();
        }
    }
    
    async loadGameObject(data) {
        let object = null;
        
        switch (data.type) {
            case 'mesh':
                if (data.modelPath) {
                    object = await this.loadModel(data.modelPath);
                } else {
                    object = this.createPrimitive(data.primitive || 'cube');
                }
                break;
                
            case 'light':
                object = this.createLight(data);
                break;
                
            case 'camera':
                // Use main camera for now
                break;
                
            default:
                object = new THREE.Object3D();
        }
        
        if (object) {
            // Apply transform
            if (data.position) {
                object.position.set(data.position.x, data.position.y, data.position.z);
            }
            if (data.rotation) {
                object.rotation.set(
                    THREE.MathUtils.degToRad(data.rotation.x),
                    THREE.MathUtils.degToRad(data.rotation.y),
                    THREE.MathUtils.degToRad(data.rotation.z)
                );
            }
            if (data.scale) {
                object.scale.set(data.scale.x, data.scale.y, data.scale.z);
            }
            
            object.name = data.name || data.id;
            this.scene.add(object);
            this.gameObjects.set(data.id, object);
            
            // Add physics body if specified
            if (data.physics && this.physicsWorld) {
                this.addPhysicsBody(object, data.physics);
            }
        }
        
        return object;
    }
    
    async loadModel(path) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                `./assets/${path}`,
                (gltf) => resolve(gltf.scene),
                undefined,
                reject
            );
        });
    }
    
    createPrimitive(type) {
        let geometry;
        
        switch (type) {
            case 'cube':
            case 'box':
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.5, 32, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                break;
            case 'plane':
                geometry = new THREE.PlaneGeometry(10, 10);
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.5,
            roughness: 0.5
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    createLight(data) {
        let light;
        
        switch (data.lightType || 'point') {
            case 'directional':
                light = new THREE.DirectionalLight(data.color || 0xffffff, data.intensity || 1);
                light.castShadow = true;
                light.shadow.mapSize.width = 2048;
                light.shadow.mapSize.height = 2048;
                break;
                
            case 'point':
                light = new THREE.PointLight(data.color || 0xffffff, data.intensity || 1, data.distance || 0);
                light.castShadow = true;
                break;
                
            case 'spot':
                light = new THREE.SpotLight(data.color || 0xffffff, data.intensity || 1);
                light.angle = data.angle || Math.PI / 4;
                light.penumbra = data.penumbra || 0.1;
                light.castShadow = true;
                break;
                
            case 'ambient':
                light = new THREE.AmbientLight(data.color || 0x404040, data.intensity || 0.5);
                break;
                
            case 'hemisphere':
                light = new THREE.HemisphereLight(
                    data.skyColor || 0xffffbb,
                    data.groundColor || 0x080820,
                    data.intensity || 1
                );
                break;
        }
        
        return light;
    }
    
    setEnvironment(env) {
        if (env.background) {
            this.scene.background = new THREE.Color(env.background);
        }
        
        if (env.fog) {
            this.scene.fog = new THREE.Fog(
                env.fog.color || 0x000000,
                env.fog.near || 10,
                env.fog.far || 100
            );
        }
    }
    
    createDefaultScene() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.2,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Sample cube
        const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
        const cubeMaterial = new THREE.MeshStandardMaterial({
            color: 0x6366f1,
            metalness: 0.5,
            roughness: 0.3
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.y = 1;
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.scene.add(cube);
        this.gameObjects.set('defaultCube', cube);
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }
    
    addPhysicsBody(mesh, physicsConfig) {
        if (!this.physics || !this.physicsWorld) return;
        
        const { RigidBodyDesc, ColliderDesc } = this.physics;
        
        // Create rigid body
        let bodyDesc;
        if (physicsConfig.static) {
            bodyDesc = RigidBodyDesc.fixed();
        } else if (physicsConfig.kinematic) {
            bodyDesc = RigidBodyDesc.kinematicPositionBased();
        } else {
            bodyDesc = RigidBodyDesc.dynamic();
        }
        
        bodyDesc.setTranslation(mesh.position.x, mesh.position.y, mesh.position.z);
        const body = this.physicsWorld.createRigidBody(bodyDesc);
        
        // Create collider
        let colliderDesc;
        const scale = mesh.scale;
        
        switch (physicsConfig.shape || 'box') {
            case 'box':
                colliderDesc = ColliderDesc.cuboid(scale.x / 2, scale.y / 2, scale.z / 2);
                break;
            case 'sphere':
                colliderDesc = ColliderDesc.ball(scale.x / 2);
                break;
            case 'capsule':
                colliderDesc = ColliderDesc.capsule(scale.y / 2, scale.x / 2);
                break;
        }
        
        if (colliderDesc) {
            this.physicsWorld.createCollider(colliderDesc, body);
        }
        
        this.rigidBodies.set(mesh.uuid, { body, mesh });
    }
    
    // =========================================================================
    // GAME LOOP
    // =========================================================================
    
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.gameLoop());
        
        // Calculate delta time
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Cap delta time
        if (this.deltaTime > 0.1) this.deltaTime = 0.1;
        
        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.fpsUpdateTime >= 1000) {
            if (this.showFPS) {
                this.fpsCounter.textContent = `FPS: ${this.frameCount}`;
            }
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }
        
        if (!this.isPaused) {
            // Update physics
            this.updatePhysics();
            
            // Update game logic
            this.update();
        }
        
        // Render
        this.render();
    }
    
    updatePhysics() {
        if (!this.physicsWorld) return;
        
        // Step physics
        this.physicsWorld.step();
        
        // Sync transforms
        for (const { body, mesh } of this.rigidBodies.values()) {
            const position = body.translation();
            const rotation = body.rotation();
            
            mesh.position.set(position.x, position.y, position.z);
            mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        }
    }
    
    update() {
        // Run game scripts
        for (const script of this.scripts.values()) {
            if (script.update) {
                script.update(this.deltaTime);
            }
        }
        
        // Demo: rotate default cube
        const cube = this.gameObjects.get('defaultCube');
        if (cube) {
            cube.rotation.y += this.deltaTime * 0.5;
        }
    }
    
    render() {
        this.composer.render();
    }
    
    // =========================================================================
    // GAME STATE
    // =========================================================================
    
    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseMenu.classList.toggle('visible', this.isPaused);
        
        if (this.isPaused) {
            document.exitPointerLock();
        }
    }
    
    async saveGame() {
        const saveData = {
            scene: this.currentScene?.name || 'main',
            timestamp: Date.now(),
            camera: {
                position: this.camera.position.toArray(),
                rotation: this.camera.rotation.toArray()
            },
            gameState: {} // Custom game state
        };
        
        const result = await window.AethelRuntime.saveGame('slot1', saveData);
        if (result.success) {
            console.log('[Engine] Game saved');
        }
    }
    
    async loadGameState() {
        const result = await window.AethelRuntime.loadGame('slot1');
        if (result.success && result.data) {
            await this.loadScene(result.data.scene);
            if (result.data.camera) {
                this.camera.position.fromArray(result.data.camera.position);
                this.camera.rotation.fromArray(result.data.camera.rotation);
            }
            console.log('[Engine] Game loaded');
        }
    }
    
    showSettings() {
        // TODO: Implement settings UI
        console.log('[Engine] Settings not implemented yet');
    }
    
    async quitGame() {
        await window.AethelRuntime.quit();
    }
    
    // =========================================================================
    // UTILITIES
    // =========================================================================
    
    updateLoading(progress, status) {
        this.loadingBar.style.width = `${progress}%`;
        this.loadingStatus.textContent = status;
    }
    
    hideLoading() {
        this.loadingScreen.classList.add('hidden');
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Public API for scripts
    getInput() {
        return {
            keys: this.keys,
            mouse: this.mousePosition,
            mouseButtons: this.mouseButtons,
            isKeyDown: (key) => this.keys.has(key),
            isMouseDown: (button) => this.mouseButtons.has(button)
        };
    }
    
    getObject(id) {
        return this.gameObjects.get(id);
    }
    
    getDeltaTime() {
        return this.deltaTime;
    }
}

// Start engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.engine = new AethelGameEngine();
});

export { AethelGameEngine };
