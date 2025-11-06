import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const CubieGameJS = () => {
  const canvasRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showConsole, setShowConsole] = useState(true);
  const [fps, setFps] = useState(0);
  const [showDocs, setShowDocs] = useState(false);
  
  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-9), { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    // ========================================
    // CUBIEGAMEJS v1.0.0
    // Created by CubieCloud
    // ========================================
    
    class Cubie {
      constructor(config = {}) {
        // Core configuration
        this.version = '1.0.0';
        this.config = {
          canvas: config.canvas,
          width: config.width || window.innerWidth,
          height: config.height || window.innerHeight,
          mode: config.mode || '3d', // '2d' or '3d'
          antialias: config.antialias !== undefined ? config.antialias : true,
          shadows: config.shadows !== undefined ? config.shadows : true,
          powerPreference: config.powerPreference || 'high-performance',
          pixelRatio: config.pixelRatio || window.devicePixelRatio,
          alpha: config.alpha || false,
          preserveDrawingBuffer: config.preserveDrawingBuffer || false
        };
        
        // Core systems
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.time = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.isRunning = false;
        this.isPaused = false;
        
        // Collections
        this.entities = new Map();
        this.systems = new Map();
        this.layers = new Map();
        
        // Subsystems
        this.input = new InputSystem(this);
        this.physics = new PhysicsSystem(this);
        this.audio = new AudioSystem(this);
        this.assets = new AssetSystem(this);
        this.particles = new ParticleSystem(this);
        this.tweens = new TweenSystem(this);
        this.logger = new Logger(this);
        this.performance = new PerformanceMonitor(this);
        this.graphics = new GraphicsSystem(this);
        this.storage = new StorageSystem(this);
        
        // 2D Support
        this.sprite = new SpriteSystem(this);
        this.canvas2d = null;
        this.ctx2d = null;
        
        // Event system
        this.events = new EventEmitter();
        
        // Lifecycle hooks
        this.hooks = {
          preUpdate: [],
          postUpdate: [],
          preRender: [],
          postRender: []
        };
        
        this.init();
      }
      
      // ============ INITIALIZATION ============
      init() {
        this.logger.info('Initializing CubieGameJS v' + this.version);
        
        if (this.config.mode === '3d') {
          this.init3D();
        } else {
          this.init2D();
        }
        
        this.setupEventListeners();
        this.performance.start();
        this.logger.success('Engine initialized successfully');
      }
      
      init3D() {
        // Scene
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
          75,
          this.config.width / this.config.height,
          0.1,
          1000
        );
        this.camera.position.set(0, 5, 10);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.config.canvas,
          antialias: this.config.antialias,
          powerPreference: this.config.powerPreference,
          alpha: this.config.alpha,
          preserveDrawingBuffer: this.config.preserveDrawingBuffer
        });
        this.renderer.setSize(this.config.width, this.config.height);
        this.renderer.setPixelRatio(this.config.pixelRatio);
        this.renderer.shadowMap.enabled = this.config.shadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Default lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
      }
      
      init2D() {
        // 2D Canvas context
        this.canvas2d = this.config.canvas;
        this.ctx2d = this.canvas2d.getContext('2d', {
          alpha: this.config.alpha,
          desynchronized: true
        });
        this.canvas2d.width = this.config.width;
        this.canvas2d.height = this.config.height;
        
        // Create layers for 2D rendering
        this.layers.set('background', []);
        this.layers.set('main', []);
        this.layers.set('foreground', []);
        this.layers.set('ui', []);
      }
      
      setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.pause();
          } else {
            this.resume();
          }
        });
      }
      
      // ============ LIFECYCLE ============
      start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isPaused = false;
        this.logger.info('Game loop started');
        this.loop();
        this.events.emit('start');
      }
      
      stop() {
        this.isRunning = false;
        this.logger.info('Game loop stopped');
        this.events.emit('stop');
      }
      
      pause() {
        this.isPaused = true;
        this.logger.info('Game paused');
        this.events.emit('pause');
      }
      
      resume() {
        this.isPaused = false;
        this.logger.info('Game resumed');
        this.events.emit('resume');
      }
      
      loop() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.loop());
        
        if (this.isPaused) return;
        
        // Calculate delta time
        this.deltaTime = this.clock.getDelta();
        this.time += this.deltaTime;
        this.frameCount++;
        
        // Pre-update hooks
        this.hooks.preUpdate.forEach(fn => fn(this.deltaTime));
        
        // Update systems
        this.update(this.deltaTime);
        
        // Post-update hooks
        this.hooks.postUpdate.forEach(fn => fn(this.deltaTime));
        
        // Pre-render hooks
        this.hooks.preRender.forEach(fn => fn());
        
        // Render
        this.render();
        
        // Post-render hooks
        this.hooks.postRender.forEach(fn => fn());
        
        // Performance monitoring
        this.performance.update();
      }
      
      update(dt) {
        // Update input
        this.input.update(dt);
        
        // Update physics
        this.physics.update(dt);
        
        // Update particles
        this.particles.update(dt);
        
        // Update tweens
        this.tweens.update(dt);
        
        // Update custom systems
        this.systems.forEach(system => {
          if (system.enabled && system.update) {
            system.update(dt);
          }
        });
        
        // Update entities
        this.entities.forEach(entity => {
          if (entity.enabled && entity.update) {
            entity.update(dt);
          }
        });
      }
      
      render() {
        if (this.config.mode === '3d') {
          this.render3D();
        } else {
          this.render2D();
        }
      }
      
      render3D() {
        this.renderer.render(this.scene, this.camera);
      }
      
      render2D() {
        const ctx = this.ctx2d;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas2d.width, this.canvas2d.height);
        
        // Render layers in order
        ['background', 'main', 'foreground', 'ui'].forEach(layerName => {
          const layer = this.layers.get(layerName);
          if (layer) {
            layer.forEach(renderable => {
              if (renderable.visible && renderable.render) {
                renderable.render(ctx);
              }
            });
          }
        });
      }
      
      resize() {
        this.config.width = window.innerWidth;
        this.config.height = window.innerHeight;
        
        if (this.config.mode === '3d') {
          this.camera.aspect = this.config.width / this.config.height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(this.config.width, this.config.height);
        } else {
          this.canvas2d.width = this.config.width;
          this.canvas2d.height = this.config.height;
        }
        
        this.events.emit('resize', { width: this.config.width, height: this.config.height });
      }
      
      // ============ ENTITY MANAGEMENT ============
      entity = {
        create: (name, config = {}) => {
          const entity = new Entity(name, config, this);
          this.entities.set(name, entity);
          
          if (this.config.mode === '3d' && entity.mesh) {
            this.scene.add(entity.mesh);
          } else if (this.config.mode === '2d') {
            const layer = config.layer || 'main';
            if (!this.layers.has(layer)) {
              this.layers.set(layer, []);
            }
            this.layers.get(layer).push(entity);
          }
          
          this.logger.debug(`Entity created: ${name}`);
          this.events.emit('entity:create', entity);
          return entity;
        },
        
        get: (name) => this.entities.get(name),
        
        remove: (name) => {
          const entity = this.entities.get(name);
          if (!entity) return;
          
          if (this.config.mode === '3d' && entity.mesh) {
            this.scene.remove(entity.mesh);
          } else if (this.config.mode === '2d') {
            this.layers.forEach(layer => {
              const index = layer.indexOf(entity);
              if (index > -1) layer.splice(index, 1);
            });
          }
          
          this.entities.delete(name);
          this.logger.debug(`Entity removed: ${name}`);
          this.events.emit('entity:remove', entity);
        },
        
        find: (predicate) => {
          const results = [];
          this.entities.forEach(entity => {
            if (predicate(entity)) results.push(entity);
          });
          return results;
        },
        
        findByTag: (tag) => {
          return this.entity.find(e => e.hasTag(tag));
        }
      };
      
      // ============ PRIMITIVES (3D) ============
      primitive = {
        box: (name, options = {}) => {
          const geometry = new THREE.BoxGeometry(
            options.width || 1,
            options.height || 1,
            options.depth || 1
          );
          const material = new THREE.MeshStandardMaterial({
            color: options.color || 0x00ff00,
            roughness: options.roughness || 0.5,
            metalness: options.metalness || 0.5,
            transparent: options.transparent || false,
            opacity: options.opacity || 1
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = options.castShadow !== false;
          mesh.receiveShadow = options.receiveShadow !== false;
          
          const entity = this.entity.create(name, { mesh, ...options });
          if (options.position) entity.position.set(options.position);
          if (options.physics) this.physics.addBody(entity, options.physics);
          return entity;
        },
        
        sphere: (name, options = {}) => {
          const geometry = new THREE.SphereGeometry(
            options.radius || 1,
            options.segments || 32,
            options.segments || 32
          );
          const material = new THREE.MeshStandardMaterial({
            color: options.color || 0xff0000,
            roughness: options.roughness || 0.5,
            metalness: options.metalness || 0.5
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = options.castShadow !== false;
          mesh.receiveShadow = options.receiveShadow !== false;
          
          const entity = this.entity.create(name, { mesh, ...options });
          if (options.position) entity.position.set(options.position);
          if (options.physics) this.physics.addBody(entity, options.physics);
          return entity;
        },
        
        plane: (name, options = {}) => {
          const geometry = new THREE.PlaneGeometry(
            options.width || 10,
            options.height || 10
          );
          const material = new THREE.MeshStandardMaterial({
            color: options.color || 0x808080,
            roughness: options.roughness || 0.8,
            metalness: options.metalness || 0.2
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.rotation.x = -Math.PI / 2;
          mesh.receiveShadow = options.receiveShadow !== false;
          
          const entity = this.entity.create(name, { mesh, ...options });
          if (options.position) entity.position.set(options.position);
          return entity;
        },
        
        cylinder: (name, options = {}) => {
          const geometry = new THREE.CylinderGeometry(
            options.radiusTop || 1,
            options.radiusBottom || 1,
            options.height || 2,
            options.segments || 32
          );
          const material = new THREE.MeshStandardMaterial({
            color: options.color || 0x0000ff,
            roughness: options.roughness || 0.5,
            metalness: options.metalness || 0.5
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = options.castShadow !== false;
          mesh.receiveShadow = options.receiveShadow !== false;
          
          const entity = this.entity.create(name, { mesh, ...options });
          if (options.position) entity.position.set(options.position);
          if (options.physics) this.physics.addBody(entity, options.physics);
          return entity;
        }
      };
      
      // ============ LIGHTING ============
      light = {
        add: (type, options = {}) => {
          let light;
          switch(type) {
            case 'directional':
              light = new THREE.DirectionalLight(options.color || 0xffffff, options.intensity || 1);
              if (options.castShadow) {
                light.castShadow = true;
                light.shadow.mapSize.width = options.shadowMapSize || 2048;
                light.shadow.mapSize.height = options.shadowMapSize || 2048;
              }
              break;
            case 'point':
              light = new THREE.PointLight(options.color || 0xffffff, options.intensity || 1, options.distance || 0);
              light.castShadow = options.castShadow || false;
              break;
            case 'spot':
              light = new THREE.SpotLight(options.color || 0xffffff, options.intensity || 1);
              light.angle = options.angle || Math.PI / 6;
              light.castShadow = options.castShadow || false;
              break;
            case 'ambient':
              light = new THREE.AmbientLight(options.color || 0xffffff, options.intensity || 0.5);
              break;
            default:
              light = new THREE.AmbientLight(0xffffff, 0.5);
          }
          
          if (options.position) {
            light.position.set(options.position.x || 0, options.position.y || 0, options.position.z || 0);
          }
          
          this.scene.add(light);
          this.logger.debug(`Light added: ${type}`);
          return light;
        }
      };
      
      // ============ CAMERA CONTROLS ============
      camera = {
        setPosition: (x, y, z) => {
          if (this.config.mode === '3d') {
            this.camera.position.set(x, y, z);
          }
        },
        
        lookAt: (x, y, z) => {
          if (this.config.mode === '3d') {
            this.camera.lookAt(x, y, z);
          }
        },
        
        follow: (entity, offset = { x: 0, y: 5, z: 10 }) => {
          const followSystem = {
            enabled: true,
            update: (dt) => {
              const pos = entity.position.get();
              this.camera.position.x = pos.x + offset.x;
              this.camera.position.y = pos.y + offset.y;
              this.camera.position.z = pos.z + offset.z;
              this.camera.lookAt(pos.x, pos.y, pos.z);
            }
          };
          this.systems.set('camera-follow', followSystem);
        }
      };
      
      // ============ SCENE CONTROLS ============
      scene = {
        setBackground: (color) => {
          if (this.config.mode === '3d') {
            this.scene.background = new THREE.Color(color);
          } else {
            this.canvas2d.style.background = `#${color.toString(16).padStart(6, '0')}`;
          }
        },
        
        setSkybox: (urls) => {
          if (this.config.mode === '3d') {
            const loader = new THREE.CubeTextureLoader();
            this.scene.background = loader.load(urls);
          }
        },
        
        setFog: (color, near, far) => {
          if (this.config.mode === '3d') {
            this.scene.fog = new THREE.Fog(color, near, far);
          }
        }
      };
      
      // ============ SYSTEM MANAGEMENT ============
      system = {
        add: (name, system) => {
          system.enabled = system.enabled !== undefined ? system.enabled : true;
          this.systems.set(name, system);
          this.logger.debug(`System added: ${name}`);
          if (system.init) system.init(this);
        },
        
        get: (name) => this.systems.get(name),
        
        remove: (name) => {
          const system = this.systems.get(name);
          if (system && system.destroy) system.destroy();
          this.systems.delete(name);
          this.logger.debug(`System removed: ${name}`);
        },
        
        enable: (name) => {
          const system = this.systems.get(name);
          if (system) system.enabled = true;
        },
        
        disable: (name) => {
          const system = this.systems.get(name);
          if (system) system.enabled = false;
        }
      };
      
      // ============ HOOKS ============
      hook = {
        preUpdate: (fn) => this.hooks.preUpdate.push(fn),
        postUpdate: (fn) => this.hooks.postUpdate.push(fn),
        preRender: (fn) => this.hooks.preRender.push(fn),
        postRender: (fn) => this.hooks.postRender.push(fn)
      };
      
      // ============ UTILITIES ============
      utils = {
        lerp: (a, b, t) => a + (b - a) * t,
        clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
        map: (value, inMin, inMax, outMin, outMax) => {
          return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
        },
        random: (min, max) => Math.random() * (max - min) + min,
        randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
        degToRad: (deg) => deg * Math.PI / 180,
        radToDeg: (rad) => rad * 180 / Math.PI,
        distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
        distance3D: (x1, y1, z1, x2, y2, z2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2)
      };
    }
    
    // ============ ENTITY CLASS ============
    class Entity {
      constructor(name, config, engine) {
        this.name = name;
        this.engine = engine;
        this.mesh = config.mesh || null;
        this.enabled = config.enabled !== undefined ? config.enabled : true;
        this.visible = config.visible !== undefined ? config.visible : true;
        this.components = new Map();
        this.scripts = [];
        this.tags = new Set();
        
        // 2D properties
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = config.width || 0;
        this.height = config.height || 0;
        this.rotation = config.rotation || 0;
        this.scaleX = config.scaleX || 1;
        this.scaleY = config.scaleY || 1;
        this.alpha = config.alpha || 1;
        
        // Image/sprite
        this.image = config.image || null;
      }
      
      // Position API
      position = {
        set: (pos) => {
          if (this.mesh) {
            this.mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
          } else {
            this.x = pos.x || 0;
            this.y = pos.y || 0;
          }
        },
        get: () => {
          if (this.mesh) {
            return { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z };
          }
          return { x: this.x, y: this.y };
        }
      };
      
      // Rotation API
      rotate = {
        set: (rot) => {
          if (this.mesh) {
            this.mesh.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0);
          } else {
            this.rotation = rot;
          }
        },
        get: () => {
          if (this.mesh) {
            return { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z };
          }
          return this.rotation;
        }
      };
      
      // Scale API
      scale = {
        set: (scale) => {
          if (this.mesh) {
            const s = typeof scale === 'number' ? { x: scale, y: scale, z: scale } : scale;
            this.mesh.scale.set(s.x || 1, s.y || 1, s.z || 1);
          } else {
            this.scaleX = scale.x || scale;
            this.scaleY = scale.y || scale;
          }
        },
        get: () => {
          if (this.mesh) {
            return { x: this.mesh.scale.x, y: this.mesh.scale.y, z: this.mesh.scale.z };
          }
          return { x: this.scaleX, y: this.scaleY };
        }
      };
      
      // Component system
      addComponent(name, component) {
        this.components.set(name, component);
      }
      
      getComponent(name) {
        return this.components.get(name);
      }
      
      removeComponent(name) {
        this.components.delete(name);
      }
      
      // Script system
      addScript(script) {
        this.scripts.push(script);
        if (script.init) script.init(this);
      }
      
      update(dt) {
        this.scripts.forEach(script => {
          if (script.update) script.update(dt, this);
        });
      }
      
      // 2D render
      render(ctx) {
        if (!this.visible) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);
        
        if (this.image) {
          ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        }
        
        ctx.restore();
      }
      
      // Tags
      addTag(tag) {
        this.tags.add(tag);
      }
      
      removeTag(tag) {
        this.tags.delete(tag);
      }
      
      hasTag(tag) {
        return this.tags.has(tag);
      }
      
      destroy() {
        this.engine.entity.remove(this.name);
      }
    }
    
    // ============ INPUT SYSTEM ============
    class InputSystem {
      constructor(engine) {
        this.engine = engine;
        this.keys = {};
        this.keysPressed = {};
        this.keysReleased = {};
        this.mouse = { x: 0, y: 0, buttons: {}, pressed: {}, released: {} };
        this.touches = new Map();
        this.gamepad = null;
        
        this.setupListeners();
      }
      
      setupListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
          if (!this.keys[e.key.toLowerCase()]) {
            this.keysPressed[e.key.toLowerCase()] = true;
          }
          this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
          this.keys[e.key.toLowerCase()] = false;
          this.keysReleased[e.key.toLowerCase()] = true;
        });
        
        // Mouse
        window.addEventListener('mousedown', (e) => {
          if (!this.mouse.buttons[e.button]) {
            this.mouse.pressed[e.button] = true;
          }
          this.mouse.buttons[e.button] = true;
        });
        
        window.addEventListener('mouseup', (e) => {
          this.mouse.buttons[e.button] = false;
          this.mouse.released[e.button] = true;
        });
        
        window.addEventListener('mousemove', (e) => {
          this.mouse.x = e.clientX;
          this.mouse.y = e.clientY;
          this.mouse.movementX = e.movementX;
          this.mouse.movementY = e.movementY;
        });
        
        // Touch
        window.addEventListener('touchstart', (e) => {
          Array.from(e.changedTouches).forEach(touch => {
            this.touches.set(touch.identifier, {
              x: touch.clientX,
              y: touch.clientY,
              startX: touch.clientX,
              startY: touch.clientY
            });
          });
        });
        
        window.addEventListener('touchmove', (e) => {
          Array.from(e.changedTouches).forEach(touch => {
            const t = this.touches.get(touch.identifier);
            if (t) {
              t.x = touch.clientX;
              t.y = touch.clientY;
            }
          });
        });
        
        window.addEventListener('touchend', (e) => {
          Array.from(e.changedTouches).forEach(touch => {
            this.touches.delete(touch.identifier);
          });
        });
        
        // Gamepad
        window.addEventListener('gamepadconnected', (e) => {
          this.gamepad = e.gamepad;
          this.engine.logger.info(`Gamepad connected: ${e.gamepad.id}`);
        });
      }
      
      update(dt) {
        // Clear pressed/released states
        this.keysPressed = {};
        this.keysReleased = {};
        this.mouse.pressed = {};
        this.mouse.released = {};
        
        // Update gamepad
        if (this.gamepad) {
          const gamepads = navigator.getGamepads();
          this.gamepad = gamepads[this.gamepad.index];
        }
      }
      
      // Keyboard API
      isKeyDown(key) {
        return this.keys[key.toLowerCase()] || false;
      }
      
      isKeyPressed(key) {
        return this.keysPressed[key.toLowerCase()] || false;
      }
      
      isKeyReleased(key) {
        return this.keysReleased[key.toLowerCase()] || false;
      }
      
      // Mouse API
      isMouseDown(button = 0) {
        return this.mouse.buttons[button] || false;
      }
      
      isMousePressed(button = 0) {
        return this.mouse.pressed[button] || false;
      }
      
      isMouseReleased(button = 0) {
        return this.mouse.released[button] || false;
      }
      
      getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
      }
      
      // Touch API
      getTouches() {
        return Array.from(this.touches.values());
      }
      
      getTouchCount() {
        return this.touches.size;
      }
      
      // Gamepad API
      getGamepad() {
        return this.gamepad;
      }
      
      getButton(index) {
        return this.gamepad?.buttons[index]?.pressed || false;
      }
      
      getAxis(index) {
        return this.gamepad?.axes[index] || 0;
      }
    }
    
    // ============ PHYSICS SYSTEM ============
    class PhysicsSystem {
      constructor(engine) {
        this.engine = engine;
        this.gravity = -9.8;
        this.bodies = [];
        this.enabled = true;
      }
      
      addBody(entity, config = {}) {
        const body = {
          entity,
          velocity: config.velocity || { x: 0, y: 0, z: 0 },
          acceleration: config.acceleration || { x: 0, y: 0, z: 0 },
          mass: config.mass || 1,
          useGravity: config.useGravity !== undefined ? config.useGravity : true,
          isStatic: config.isStatic || false,
          restitution: config.restitution || 0.5,
          friction: config.friction || 0.5,
          drag: config.drag || 0.01,
          collider: config.collider || 'sphere',
          radius: config.radius || 1,
          bounds: config.bounds || null
        };
        this.bodies.push(body);
        this.engine.logger.debug(`Physics body added to: ${entity.name}`);
        return body;
      }
      
      removeBody(entity) {
        this.bodies = this.bodies.filter(b => b.entity !== entity);
      }
      
      update(dt) {
        if (!this.enabled) return;
        
        this.bodies.forEach(body => {
          if (body.isStatic) return;
          
          // Apply gravity
          if (body.useGravity) {
            body.acceleration.y = this.gravity;
          }
          
          // Update velocity
          body.velocity.x += body.acceleration.x * dt;
          body.velocity.y += body.acceleration.y * dt;
          body.velocity.z += body.acceleration.z * dt;
          
          // Apply drag
          body.velocity.x *= (1 - body.drag);
          body.velocity.y *= (1 - body.drag);
          body.velocity.z *= (1 - body.drag);
          
          // Update position
          const pos = body.entity.position.get();
          pos.x += body.velocity.x * dt;
          pos.y += body.velocity.y * dt;
          pos.z += body.velocity.z * dt;
          body.entity.position.set(pos);
          
          // Ground collision
          if (pos.y < 0) {
            pos.y = 0;
            body.velocity.y = -body.velocity.y * body.restitution;
            body.velocity.x *= (1 - body.friction);
            body.velocity.z *= (1 - body.friction);
            body.entity.position.set(pos);
          }
          
          // Bounds collision
          if (body.bounds) {
            if (pos.x < body.bounds.minX) { pos.x = body.bounds.minX; body.velocity.x *= -body.restitution; }
            if (pos.x > body.bounds.maxX) { pos.x = body.bounds.maxX; body.velocity.x *= -body.restitution; }
            if (pos.z < body.bounds.minZ) { pos.z = body.bounds.minZ; body.velocity.z *= -body.restitution; }
            if (pos.z > body.bounds.maxZ) { pos.z = body.bounds.maxZ; body.velocity.z *= -body.restitution; }
            body.entity.position.set(pos);
          }
          
          // Reset acceleration
          body.acceleration.x = 0;
          body.acceleration.y = 0;
          body.acceleration.z = 0;
        });
        
        // Collision detection
        for (let i = 0; i < this.bodies.length; i++) {
          for (let j = i + 1; j < this.bodies.length; j++) {
            this.checkCollision(this.bodies[i], this.bodies[j]);
          }
        }
      }
      
      checkCollision(bodyA, bodyB) {
        const posA = bodyA.entity.position.get();
        const posB = bodyB.entity.position.get();
        
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const dz = posB.z - posA.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const minDist = bodyA.radius + bodyB.radius;
        
        if (distance < minDist && distance > 0) {
          // Collision response
          const nx = dx / distance;
          const ny = dy / distance;
          const nz = dz / distance;
          
          const overlap = minDist - distance;
          
          if (!bodyA.isStatic) {
            posA.x -= nx * overlap * 0.5;
            posA.y -= ny * overlap * 0.5;
            posA.z -= nz * overlap * 0.5;
            bodyA.entity.position.set(posA);
          }
          
          if (!bodyB.isStatic) {
            posB.x += nx * overlap * 0.5;
            posB.y += ny * overlap * 0.5;
            posB.z += nz * overlap * 0.5;
            bodyB.entity.position.set(posB);
          }
          
          // Emit collision event
          this.engine.events.emit('collision', { bodyA, bodyB });
        }
      }
      
      applyForce(body, force) {
        body.acceleration.x += force.x / body.mass;
        body.acceleration.y += force.y / body.mass;
        body.acceleration.z += force.z / body.mass;
      }
      
      setGravity(gravity) {
        this.gravity = gravity;
      }
    }
    
    // ============ AUDIO SYSTEM ============
    class AudioSystem {
      constructor(engine) {
        this.engine = engine;
        this.sounds = new Map();
        this.music = null;
        this.masterVolume = 1.0;
        this.soundVolume = 1.0;
        this.musicVolume = 1.0;
        this.listener = null;
        this.audioLoader = null;
        
        if (engine.config.mode === '3d') {
          this.listener = new THREE.AudioListener();
          this.audioLoader = new THREE.AudioLoader();
        }
      }
      
      async load(name, url) {
        return new Promise((resolve, reject) => {
          if (this.engine.config.mode === '3d') {
            const sound = new THREE.Audio(this.listener);
            this.audioLoader.load(url, (buffer) => {
              sound.setBuffer(buffer);
              this.sounds.set(name, sound);
              this.engine.logger.debug(`Audio loaded: ${name}`);
              resolve(sound);
            }, undefined, reject);
          } else {
            const audio = new Audio(url);
            audio.addEventListener('canplaythrough', () => {
              this.sounds.set(name, audio);
              this.engine.logger.debug(`Audio loaded: ${name}`);
              resolve(audio);
            });
            audio.addEventListener('error', reject);
          }
        });
      }
      
      play(name, options = {}) {
        const sound = this.sounds.get(name);
        if (sound) {
          const volume = (options.volume || 1) * this.soundVolume * this.masterVolume;
          sound.setVolume ? sound.setVolume(volume) : (sound.volume = volume);
          sound.setLoop ? sound.setLoop(options.loop || false) : (sound.loop = options.loop || false);
          sound.play();
          this.engine.logger.debug(`Playing sound: ${name}`);
        }
      }
      
      stop(name) {
        const sound = this.sounds.get(name);
        if (sound && (sound.isPlaying || !sound.paused)) {
          sound.stop ? sound.stop() : sound.pause();
        }
      }
      
      playMusic(name, options = {}) {
        if (this.music && (this.music.isPlaying || !this.music.paused)) {
          this.music.stop ? this.music.stop() : this.music.pause();
        }
        this.music = this.sounds.get(name);
        if (this.music) {
          const volume = (options.volume || 1) * this.musicVolume * this.masterVolume;
          this.music.setVolume ? this.music.setVolume(volume) : (this.music.volume = volume);
          this.music.setLoop ? this.music.setLoop(true) : (this.music.loop = true);
          this.music.play();
          this.engine.logger.info(`Playing music: ${name}`);
        }
      }
      
      stopMusic() {
        if (this.music) {
          this.music.stop ? this.music.stop() : this.music.pause();
        }
      }
      
      setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
      }
      
      setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
      }
      
      setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
      }
    }
    
    // ============ ASSET SYSTEM ============
    class AssetSystem {
      constructor(engine) {
        this.engine = engine;
        this.textures = new Map();
        this.images = new Map();
        this.models = new Map();
        this.data = new Map();
        this.textureLoader = null;
        
        if (engine.config.mode === '3d') {
          this.textureLoader = new THREE.TextureLoader();
        }
      }
      
      async loadTexture(name, url) {
        return new Promise((resolve, reject) => {
          this.textureLoader.load(url, (texture) => {
            this.textures.set(name, texture);
            this.engine.logger.debug(`Texture loaded: ${name}`);
            resolve(texture);
          }, undefined, reject);
        });
      }
      
      async loadImage(name, url) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            this.images.set(name, img);
            this.engine.logger.debug(`Image loaded: ${name}`);
            resolve(img);
          };
          img.onerror = reject;
          img.src = url;
        });
      }
      
      async loadJSON(name, url) {
        try {
          const response = await fetch(url);
          const data = await response.json();
          this.data.set(name, data);
          this.engine.logger.debug(`JSON loaded: ${name}`);
          return data;
        } catch (error) {
          this.engine.logger.error(`Failed to load JSON: ${name}`, error);
          throw error;
        }
      }
      
      async loadMultiple(assets, onProgress) {
        const total = assets.length;
        let loaded = 0;
        
        const promises = assets.map(async (asset) => {
          let result;
          switch (asset.type) {
            case 'texture':
              result = await this.loadTexture(asset.name, asset.url);
              break;
            case 'image':
              result = await this.loadImage(asset.name, asset.url);
              break;
            case 'json':
              result = await this.loadJSON(asset.name, asset.url);
              break;
            case 'audio':
              result = await this.engine.audio.load(asset.name, asset.url);
              break;
          }
          loaded++;
          if (onProgress) onProgress(loaded / total);
          return result;
        });
        
        return Promise.all(promises);
      }
      
      getTexture(name) {
        return this.textures.get(name);
      }
      
      getImage(name) {
        return this.images.get(name);
      }
      
      getData(name) {
        return this.data.get(name);
      }
    }
    
    // ============ PARTICLE SYSTEM ============
    class ParticleSystem {
      constructor(engine) {
        this.engine = engine;
        this.emitters = [];
      }
      
      createEmitter(options = {}) {
        const emitter = {
          position: options.position || { x: 0, y: 0, z: 0 },
          rate: options.rate || 10,
          lifetime: options.lifetime || 2,
          velocity: options.velocity || { x: 0, y: 1, z: 0 },
          velocityVariance: options.velocityVariance || { x: 0.5, y: 0.5, z: 0.5 },
          color: options.color || 0xffffff,
          size: options.size || 0.1,
          sizeEnd: options.sizeEnd || 0,
          alpha: options.alpha || 1,
          alphaEnd: options.alphaEnd || 0,
          particles: [],
          timer: 0,
          maxParticles: options.maxParticles || 1000,
          enabled: true
        };
        
        if (this.engine.config.mode === '3d') {
          const geometry = new THREE.BufferGeometry();
          const material = new THREE.PointsMaterial({
            color: emitter.color,
            size: emitter.size,
            transparent: true,
            opacity: emitter.alpha,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          
          emitter.system = new THREE.Points(geometry, material);
          this.engine.scene.add(emitter.system);
        }
        
        this.emitters.push(emitter);
        this.engine.logger.debug('Particle emitter created');
        return emitter;
      }
      
      update(dt) {
        this.emitters.forEach(emitter => {
          if (!emitter.enabled) return;
          
          emitter.timer += dt;
          
          // Spawn particles
          while (emitter.timer > 1 / emitter.rate && emitter.particles.length < emitter.maxParticles) {
            emitter.timer -= 1 / emitter.rate;
            emitter.particles.push({
              position: { ...emitter.position },
              velocity: {
                x: emitter.velocity.x + (Math.random() - 0.5) * emitter.velocityVariance.x * 2,
                y: emitter.velocity.y + (Math.random() - 0.5) * emitter.velocityVariance.y * 2,
                z: emitter.velocity.z + (Math.random() - 0.5) * emitter.velocityVariance.z * 2
              },
              life: emitter.lifetime,
              maxLife: emitter.lifetime
            });
          }
          
          // Update particles
          const positions = [];
          const sizes = [];
          const colors = [];
          
          emitter.particles = emitter.particles.filter(particle => {
            particle.life -= dt;
            if (particle.life <= 0) return false;
            
            particle.position.x += particle.velocity.x * dt;
            particle.position.y += particle.velocity.y * dt;
            particle.position.z += particle.velocity.z * dt;
            
            const t = 1 - (particle.life / particle.maxLife);
            const size = emitter.size + (emitter.sizeEnd - emitter.size) * t;
            
            positions.push(particle.position.x, particle.position.y, particle.position.z);
            sizes.push(size);
            
            return true;
          });
          
          if (this.engine.config.mode === '3d' && emitter.system) {
            emitter.system.geometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(positions, 3)
            );
          }
        });
      }
      
      removeEmitter(emitter) {
        const index = this.emitters.indexOf(emitter);
        if (index > -1) {
          if (emitter.system) {
            this.engine.scene.remove(emitter.system);
          }
          this.emitters.splice(index, 1);
        }
      }
    }
    
    // ============ TWEEN SYSTEM ============
    class TweenSystem {
      constructor(engine) {
        this.engine = engine;
        this.tweens = [];
      }
      
      to(target, props, duration, options = {}) {
        const tween = {
          target,
          startValues: {},
          endValues: props,
          duration,
          elapsed: 0,
          easing: options.easing || this.easeLinear,
          onUpdate: options.onUpdate,
          onComplete: options.onComplete,
          delay: options.delay || 0,
          active: true
        };
        
        // Store start values
        Object.keys(props).forEach(key => {
          tween.startValues[key] = target[key];
        });
        
        this.tweens.push(tween);
        return tween;
      }
      
      update(dt) {
        this.tweens = this.tweens.filter(tween => {
          if (!tween.active) return false;
          
          if (tween.delay > 0) {
            tween.delay -= dt;
            return true;
          }
          
          tween.elapsed += dt;
          const t = Math.min(tween.elapsed / tween.duration, 1);
          const easedT = tween.easing(t);
          
          Object.keys(tween.endValues).forEach(key => {
            const start = tween.startValues[key];
            const end = tween.endValues[key];
            tween.target[key] = start + (end - start) * easedT;
          });
          
          if (tween.onUpdate) tween.onUpdate(tween.target, easedT);
          
          if (t >= 1) {
            if (tween.onComplete) tween.onComplete(tween.target);
            return false;
          }
          
          return true;
        });
      }
      
      // Easing functions
      easeLinear(t) { return t; }
      easeInQuad(t) { return t * t; }
      easeOutQuad(t) { return t * (2 - t); }
      easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
      easeInCubic(t) { return t * t * t; }
      easeOutCubic(t) { return (--t) * t * t + 1; }
      easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; }
    }
    
    // ============ LOGGER SYSTEM ============
    class Logger {
      constructor(engine) {
        this.engine = engine;
        this.logs = [];
        this.maxLogs = 100;
        this.logLevel = 'debug'; // 'debug', 'info', 'warn', 'error'
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
        this.callbacks = [];
      }
      
      log(level, message, data) {
        if (this.levels[level] < this.levels[this.logLevel]) return;
        
        const log = {
          level,
          message,
          data,
          timestamp: new Date().toISOString(),
          frame: this.engine.frameCount
        };
        
        this.logs.push(log);
        if (this.logs.length > this.maxLogs) {
          this.logs.shift();
        }
        
        // Console output
        const consoleMethod = console[level] || console.log;
        consoleMethod(`[CubieGameJS] [${level.toUpperCase()}] ${message}`, data || '');
        
        // Callbacks
        this.callbacks.forEach(cb => cb(log));
      }
      
      debug(message, data) { this.log('debug', message, data); }
      info(message, data) { this.log('info', message, data); }
      warn(message, data) { this.log('warn', message, data); }
      error(message, data) { this.log('error', message, data); }
      success(message, data) { this.log('info', `✓ ${message}`, data); }
      
      onLog(callback) {
        this.callbacks.push(callback);
      }
      
      setLevel(level) {
        this.logLevel = level;
      }
      
      getLogs(level = null) {
        return level ? this.logs.filter(l => l.level === level) : this.logs;
      }
      
      clear() {
        this.logs = [];
      }
    }
    
    // ============ PERFORMANCE MONITOR ============
    class PerformanceMonitor {
      constructor(engine) {
        this.engine = engine;
        this.fps = 0;
        this.frameTime = 0;
        this.memory = 0;
        this.drawCalls = 0;
        this.triangles = 0;
        this.lastTime = performance.now();
        this.frames = 0;
        this.fpsUpdateInterval = 0.5;
        this.fpsTimer = 0;
      }
      
      start() {
        this.lastTime = performance.now();
      }
      
      update() {
        const now = performance.now();
        this.frameTime = now - this.lastTime;
        this.lastTime = now;
        
        this.frames++;
        this.fpsTimer += this.engine.deltaTime;
        
        if (this.fpsTimer >= this.fpsUpdateInterval) {
          this.fps = Math.round(this.frames / this.fpsTimer);
          this.frames = 0;
          this.fpsTimer = 0;
        }
        
        // Memory (if available)
        if (performance.memory) {
          this.memory = Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
        }
        
        // Render stats (3D only)
        if (this.engine.renderer && this.engine.renderer.info) {
          const info = this.engine.renderer.info;
          this.drawCalls = info.render.calls;
          this.triangles = info.render.triangles;
        }
      }
      
      getStats() {
        return {
          fps: this.fps,
          frameTime: this.frameTime.toFixed(2),
          memory: this.memory,
          drawCalls: this.drawCalls,
          triangles: this.triangles,
          entities: this.engine.entities.size,
          systems: this.engine.systems.size
        };
      }
    }
    
    // ============ GRAPHICS SYSTEM ============
    class GraphicsSystem {
      constructor(engine) {
        this.engine = engine;
      }
      
      // 2D Drawing API
      rect(x, y, width, height, color, options = {}) {
        if (this.engine.config.mode !== '2d') return;
        const ctx = this.engine.ctx2d;
        ctx.fillStyle = color;
        if (options.stroke) {
          ctx.strokeStyle = options.strokeColor || '#000';
          ctx.lineWidth = options.strokeWidth || 1;
          ctx.strokeRect(x, y, width, height);
        }
        ctx.fillRect(x, y, width, height);
      }
      
      circle(x, y, radius, color, options = {}) {
        if (this.engine.config.mode !== '2d') return;
        const ctx = this.engine.ctx2d;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (options.stroke) {
          ctx.strokeStyle = options.strokeColor || '#000';
          ctx.lineWidth = options.strokeWidth || 1;
          ctx.stroke();
        }
      }
      
      line(x1, y1, x2, y2, color, width = 1) {
        if (this.engine.config.mode !== '2d') return;
        const ctx = this.engine.ctx2d;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
      }
      
      text(text, x, y, options = {}) {
        if (this.engine.config.mode !== '2d') return;
        const ctx = this.engine.ctx2d;
        ctx.font = options.font || '16px Arial';
        ctx.fillStyle = options.color || '#000';
        ctx.textAlign = options.align || 'left';
        ctx.fillText(text, x, y);
      }
    }
    
    // ============ STORAGE SYSTEM ============
    class StorageSystem {
      constructor(engine) {
        this.engine = engine;
        this.prefix = 'cubiegame_';
      }
      
      save(key, data) {
        try {
          const serialized = JSON.stringify(data);
          localStorage.setItem(this.prefix + key, serialized);
          return true;
        } catch (error) {
          this.engine.logger.error('Failed to save data', error);
          return false;
        }
      }
      
      load(key) {
        try {
          const serialized = localStorage.getItem(this.prefix + key);
          return serialized ? JSON.parse(serialized) : null;
        } catch (error) {
          this.engine.logger.error('Failed to load data', error);
          return null;
        }
      }
      
      remove(key) {
        localStorage.removeItem(this.prefix + key);
      }
      
      clear() {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.prefix)) {
            localStorage.removeItem(key);
          }
        });
      }
    }
    
    // ============ SPRITE SYSTEM ============
    class SpriteSystem {
      constructor(engine) {
        this.engine = engine;
      }
      
      create(name, options) {
        const entity = this.engine.entity.create(name, {
          x: options.x || 0,
          y: options.y || 0,
          width: options.width || 32,
          height: options.height || 32,
          image: options.image || null,
          layer: options.layer || 'main'
        });
        
        if (options.imageName) {
          entity.image = this.engine.assets.getImage(options.imageName);
        }
        
        return entity;
      }
    }
    
    // ============ EVENT EMITTER ============
    class EventEmitter {
      constructor() {
        this.events = new Map();
      }
      
      on(event, callback) {
        if (!this.events.has(event)) {
          this.events.set(event, []);
        }
        this.events.get(event).push(callback);
      }
      
      off(event, callback) {
        if (!this.events.has(event)) return;
        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
      
      emit(event, data) {
        if (!this.events.has(event)) return;
        this.events.get(event).forEach(callback => callback(data));
      }
      
      once(event, callback) {
        const wrapper = (data) => {
          callback(data);
          this.off(event, wrapper);
        };
        this.on(event, wrapper);
      }
    }
    
    // ============ DEMO GAME ============
    const cubie = new Cubie({
      canvas: canvasRef.current,
      mode: '3d',
      shadows: true
    });
    
    // Setup logger callback
    cubie.logger.onLog((log) => {
      addLog(log.message, log.level);
    });
    
    // Loading screen simulation
    const loadAssets = async () => {
      addLog('Loading assets...', 'info');
      
      for (let i = 0; i <= 100; i += 10) {
        setLoadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setLoading(false);
      addLog('Assets loaded!', 'info');
    };
    
    loadAssets();
    
    // Setup scene
    cubie.scene.setBackground(0x87ceeb);
    cubie.scene.setFog(0x87ceeb, 20, 100);
    
    // Ground
    cubie.primitive.plane('ground', {
      width: 100,
      height: 100,
      color: 0x228b22
    });
    
    // Player
    const player = cubie.primitive.box('player', {
      width: 1,
      height: 2,
      depth: 1,
      color: 0xff0000,
      position: { x: 0, y: 1, z: 0 },
      physics: { mass: 1, friction: 0.9, useGravity: true, radius: 1 }
    });
    
    player.addTag('player');
    
    // Obstacles
    for (let i = 0; i < 8; i++) {
      cubie.primitive.box(`box${i}`, {
        width: Math.random() + 0.5,
        height: Math.random() * 2 + 1,
        depth: Math.random() + 0.5,
        color: Math.random() * 0xffffff,
        position: {
          x: (Math.random() - 0.5) * 30,
          y: 0.5,
          z: (Math.random() - 0.5) * 30
        }
      });
    }
    
    // Spheres
    for (let i = 0; i < 5; i++) {
      cubie.primitive.sphere(`sphere${i}`, {
        radius: 0.5,
        color: Math.random() * 0xffffff,
        position: {
          x: (Math.random() - 0.5) * 25,
          y: Math.random() * 5 + 3,
          z: (Math.random() - 0.5) * 25
        },
        physics: { mass: 0.5, restitution: 0.9, useGravity: true, radius: 0.5 }
      });
    }
    
    // Player controller system
    const playerController = {
      enabled: true,
      speed: 8,
      jumpForce: 8,
      canJump: true,
      rotationSpeed: 3,
      
      update: (dt) => {
        const body = cubie.physics.bodies.find(b => b.entity === player);
        if (!body) return;
        
        const pos = player.position.get();
        
        // Movement
        let moveX = 0;
        let moveZ = 0;
        
        if (cubie.input.isKeyDown('w')) moveZ = -1;
        if (cubie.input.isKeyDown('s')) moveZ = 1;
        if (cubie.input.isKeyDown('a')) moveX = -1;
        if (cubie.input.isKeyDown('d')) moveX = 1;
        
        // Touch controls
        const touches = cubie.input.getTouches();
        if (touches.length > 0) {
          const touch = touches[0];
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          moveX = (touch.x - centerX) / centerX;
          moveZ = (touch.y - centerY) / centerY;
        }
        
        // Apply movement
        body.velocity.x = moveX * playerController.speed;
        body.velocity.z = moveZ * playerController.speed;
        
        // Rotation based on movement
        if (moveX !== 0 || moveZ !== 0) {
          const targetRotation = Math.atan2(moveX, moveZ);
          const currentRotation = player.rotate.get().y;
          const newRotation = currentRotation + (targetRotation - currentRotation) * playerController.rotationSpeed * dt;
          player.rotate.set({ x: 0, y: newRotation, z: 0 });
        }
        
        // Jump
        if (pos.y <= 1.1) playerController.canJump = true;
        
        if ((cubie.input.isKeyPressed(' ') || cubie.input.isKeyPressed('w')) && playerController.canJump) {
          body.velocity.y = playerController.jumpForce;
          playerController.canJump = false;
          cubie.audio.play && cubie.logger.debug('Jump!');
        }
        
        // Gamepad support
        const gamepad = cubie.input.getGamepad();
        if (gamepad) {
          const axisX = cubie.input.getAxis(0);
          const axisY = cubie.input.getAxis(1);
          if (Math.abs(axisX) > 0.1) body.velocity.x = axisX * playerController.speed;
          if (Math.abs(axisY) > 0.1) body.velocity.z = axisY * playerController.speed;
          if (cubie.input.getButton(0) && playerController.canJump) {
            body.velocity.y = playerController.jumpForce;
            playerController.canJump = false;
          }
        }
      }
    };
    
    cubie.system.add('playerController', playerController);
    
    // Camera follow system
    cubie.camera.follow(player, { x: 0, y: 8, z: 15 });
    
    // Rotation system
    const rotationSystem = {
      enabled: true,
      update: (dt) => {
        cubie.entities.forEach((entity, name) => {
          if (name.startsWith('box')) {
            const rot = entity.rotate.get();
            entity.rotate.set({ x: rot.x, y: rot.y + dt, z: rot.z });
          }
        });
      }
    };
    
    cubie.system.add('rotation', rotationSystem);
    
    // Particle effects
    const particleEmitter = cubie.particles.createEmitter({
      position: { x: 8, y: 2, z: 8 },
      rate: 30,
      lifetime: 2.5,
      velocity: { x: 0, y: 3, z: 0 },
      velocityVariance: { x: 1, y: 0.5, z: 1 },
      color: 0xffaa00,
      size: 0.3,
      sizeEnd: 0,
      alpha: 1,
      alphaEnd: 0
    });
    
    // Collectible system
    for (let i = 0; i < 10; i++) {
      const collectible = cubie.primitive.sphere(`coin${i}`, {
        radius: 0.3,
        color: 0xffff00,
        position: {
          x: (Math.random() - 0.5) * 40,
          y: 1,
          z: (Math.random() - 0.5) * 40
        }
      });
      collectible.addTag('collectible');
      
      // Floating animation
      collectible.addScript({
        startY: collectible.position.get().y,
        time: Math.random() * Math.PI * 2,
        update: (dt, entity) => {
          entity.time += dt * 2;
          const pos = entity.position.get();
          pos.y = entity.startY + Math.sin(entity.time) * 0.3;
          entity.position.set(pos);
          entity.rotate.set({ x: 0, y: entity.time, z: 0 });
        }
      });
    }
    
    // Collision detection for collectibles
    let score = 0;
    cubie.events.on('collision', ({ bodyA, bodyB }) => {
      const entities = [bodyA.entity, bodyB.entity];
      const playerEntity = entities.find(e => e.hasTag('player'));
      const collectible = entities.find(e => e.hasTag('collectible'));
      
      if (playerEntity && collectible) {
        collectible.destroy();
        score += 10;
        cubie.logger.success(`Collected! Score: ${score}`);
        
        // Spawn particle burst
        const pos = collectible.position.get();
        const burst = cubie.particles.createEmitter({
          position: pos,
          rate: 100,
          lifetime: 0.5,
          velocity: { x: 0, y: 5, z: 0 },
          velocityVariance: { x: 3, y: 3, z: 3 },
          color: 0xffff00,
          size: 0.2,
          maxParticles: 50
        });
        
        setTimeout(() => {
          cubie.particles.removeEmitter(burst);
        }, 1000);
      }
    });
    
    // Lighting
    cubie.light.add('point', {
      color: 0xff8800,
      intensity: 2,
      distance: 20,
      position: { x: 8, y: 3, z: 8 }
    });
    
    cubie.light.add('point', {
      color: 0x00ff88,
      intensity: 1.5,
      distance: 15,
      position: { x: -10, y: 3, z: -10 }
    });
    
    // Performance monitoring
    cubie.hook.postRender(() => {
      const stats = cubie.performance.getStats();
      setFps(stats.fps);
    });
    
    // Event listeners
    cubie.events.on('start', () => {
      cubie.logger.info('Game started!');
    });
    
    cubie.events.on('pause', () => {
      cubie.logger.warn('Game paused');
    });
    
    cubie.events.on('resume', () => {
      cubie.logger.info('Game resumed');
    });
    
    // Tween example - pulsating box
    const pulseBox = cubie.primitive.box('pulseBox', {
      width: 1,
      height: 1,
      depth: 1,
      color: 0xff00ff,
      position: { x: -8, y: 2, z: -8 }
    });
    
    const pulseTween = () => {
      cubie.tweens.to(pulseBox.mesh.scale, { x: 1.5, y: 1.5, z: 1.5 }, 1, {
        easing: cubie.tweens.easeInOutQuad,
        onComplete: () => {
          cubie.tweens.to(pulseBox.mesh.scale, { x: 1, y: 1, z: 1 }, 1, {
            easing: cubie.tweens.easeInOutQuad,
            onComplete: pulseTween
          });
        }
      });
    };
    pulseTween();
    
    // Debug commands
    window.cubie = cubie;
    window.cubieDebug = {
      spawnSphere: () => {
        const sphere = cubie.primitive.sphere(`sphere_${Date.now()}`, {
          radius: 0.5,
          color: Math.random() * 0xffffff,
          position: { x: 0, y: 10, z: 0 },
          physics: { mass: 1, restitution: 0.8, useGravity: true, radius: 0.5 }
        });
        cubie.logger.info('Sphere spawned!');
        return sphere;
      },
      clearPhysics: () => {
        cubie.physics.bodies = [];
        cubie.logger.info('Physics cleared');
      },
      toggleSystem: (name) => {
        const system = cubie.system.get(name);
        if (system) {
          system.enabled = !system.enabled;
          cubie.logger.info(`System ${name}: ${system.enabled ? 'enabled' : 'disabled'}`);
        }
      },
      getStats: () => cubie.performance.getStats(),
      setGravity: (g) => {
        cubie.physics.setGravity(g);
        cubie.logger.info(`Gravity set to ${g}`);
      }
    };
    
    cubie.logger.success('CubieGameJS initialized successfully!');
    cubie.logger.info('Controls: WASD = Move, SPACE = Jump');
    cubie.logger.info('Open console and type "window.cubieDebug" for debug commands');
    
    // Start game after loading
    setTimeout(() => {
      cubie.start();
    }, 1500);
    
    return () => {
      cubie.stop();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Loading Screen */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-6xl font-bold text-white mb-8 animate-pulse">
              🎮 CubieGameJS
            </div>
            <div className="text-xl text-cyan-300 mb-4">Ultimate 2D/3D Game Engine</div>
            <div className="w-64 h-4 bg-gray-800 rounded-full overflow-hidden mx-auto">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <div className="text-white mt-4">{loadProgress}%</div>
            <div className="text-xs text-gray-400 mt-8">Created by CubieCloud</div>
          </div>
        </div>
      )}
      
      {/* Console */}
      {showConsole && !loading && (
        <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-sm text-green-400 p-4 rounded-lg font-mono text-xs max-w-md border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-bold text-green-300">🎮 CubieGameJS v2.0.0</div>
            <button 
              onClick={() => setShowConsole(false)}
              className="text-red-400 hover:text-red-300 px-2"
            >
              ✕
            </button>
          </div>
          <div className="text-[10px] text-green-600 mb-2">
            WASD: Move | SPACE: Jump | Touch: Move | Gamepad: Supported
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {logs.map((log, i) => (
              <div 
                key={i} 
                className={`
                  ${log.type === 'error' ? 'text-red-400' : ''}
                  ${log.type === 'warn' ? 'text-yellow-400' : ''}
                  ${log.type === 'info' ? 'text-cyan-400' : ''}
                  ${log.type === 'debug' ? 'text-gray-400' : ''}
                `}
              >
                [{log.time}] {log.msg}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Performance HUD */}
      {!loading && (
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white p-3 rounded-lg font-mono text-xs border border-cyan-500/30">
          <div className="text-cyan-400 font-bold mb-1">⚡ PERFORMANCE</div>
          <div className="space-y-1">
            <div>FPS: <span className={fps > 50 ? 'text-green-400' : fps > 30 ? 'text-yellow-400' : 'text-red-400'}>{fps}</span></div>
            <div className="text-gray-400">Press C for console</div>
          </div>
        </div>
      )}
      
      {/* Bottom Controls */}
      {!loading && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          {!showConsole && (
            <button
              onClick={() => setShowConsole(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
            >
              📋 Console
            </button>
          )}
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
          >
            📚 API Docs
          </button>
        </div>
      )}
      
      {/* Credits */}
      <div className="absolute bottom-4 right-4 text-gray-500 text-xs font-mono">
        Created by <span className="text-cyan-400 font-bold">CubieCloud</span>
      </div>
      
      {/* API Documentation Panel */}
      {showDocs && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-4xl font-bold text-cyan-400">CubieGameJS API v2.0.0</h1>
              <button
                onClick={() => setShowDocs(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="text-white space-y-6">
              {/* Quick Start */}
              <section className="bg-gray-900 p-6 rounded-lg border border-cyan-500/30">
                <h2 className="text-2xl font-bold text-green-400 mb-4">🚀 Quick Start</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-cyan-300">
{`// Initialize engine
const cubie = new Cubie({
  canvas: document.getElementById('canvas'),
  mode: '3d', // or '2d'
  shadows: true,
  antialias: true
});

// Create entities
const player = cubie.primitive.box('player', {
  width: 1, height: 2, depth: 1,
  color: 0xff0000,
  position: { x: 0, y: 1, z: 0 },
  physics: { mass: 1, useGravity: true }
});

// Add systems
cubie.system.add('mySystem', {
  update: (dt) => {
    // Your game logic
  }
});

// Start engine
cubie.start();`}
                </pre>
              </section>

              {/* Core API */}
              <section className="bg-gray-900 p-6 rounded-lg border border-purple-500/30">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">🎯 Core API</h2>
                <div className="space-y-2 text-sm">
                  <div><span className="text-yellow-300">cubie.start()</span> - Start game loop</div>
                  <div><span className="text-yellow-300">cubie.stop()</span> - Stop game loop</div>
                  <div><span className="text-yellow-300">cubie.pause()</span> - Pause game</div>
                  <div><span className="text-yellow-300">cubie.resume()</span> - Resume game</div>
                  <div><span className="text-yellow-300">cubie.resize()</span> - Resize canvas</div>
                  <div><span className="text-yellow-300">cubie.deltaTime</span> - Time since last frame</div>
                  <div><span className="text-yellow-300">cubie.time</span> - Total game time</div>
                </div>
              </section>

              {/* Entity System */}
              <section className="bg-gray-900 p-6 rounded-lg border border-pink-500/30">
                <h2 className="text-2xl font-bold text-pink-400 mb-4">👾 Entity System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-green-300">
{`// Create entity
const entity = cubie.entity.create('myEntity', {
  x: 0, y: 0, z: 0
});

// Get entity
const entity = cubie.entity.get('myEntity');

// Remove entity
cubie.entity.remove('myEntity');

// Find entities
const enemies = cubie.entity.findByTag('enemy');

// Entity API
entity.position.set({ x: 5, y: 10, z: 0 });
entity.position.get(); // { x: 5, y: 10, z: 0 }
entity.rotate.set({ x: 0, y: Math.PI, z: 0 });
entity.scale.set(2); // or { x: 2, y: 1, z: 1 }
entity.addTag('player');
entity.hasTag('player'); // true
entity.addComponent('health', { value: 100 });
entity.getComponent('health');
entity.destroy();`}
                </pre>
              </section>

              {/* Primitives */}
              <section className="bg-gray-900 p-6 rounded-lg border border-blue-500/30">
                <h2 className="text-2xl font-bold text-blue-400 mb-4">📦 3D Primitives</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-cyan-300">
{`// Box
cubie.primitive.box('box1', {
  width: 1, height: 1, depth: 1,
  color: 0xff0000,
  position: { x: 0, y: 0, z: 0 },
  physics: { mass: 1 }
});

// Sphere
cubie.primitive.sphere('sphere1', {
  radius: 1,
  segments: 32,
  color: 0x00ff00
});

// Plane
cubie.primitive.plane('ground', {
  width: 50, height: 50,
  color: 0x808080
});

// Cylinder
cubie.primitive.cylinder('pillar', {
  radiusTop: 1,
  radiusBottom: 1,
  height: 5
});`}
                </pre>
              </section>

              {/* Physics */}
              <section className="bg-gray-900 p-6 rounded-lg border border-red-500/30">
                <h2 className="text-2xl font-bold text-red-400 mb-4">⚡ Physics System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-orange-300">
{`// Add physics body
const body = cubie.physics.addBody(entity, {
  mass: 1,
  velocity: { x: 0, y: 0, z: 0 },
  useGravity: true,
  isStatic: false,
  restitution: 0.8, // Bounciness
  friction: 0.5,
  drag: 0.01,
  radius: 1
});

// Apply force
cubie.physics.applyForce(body, { x: 10, y: 0, z: 0 });

// Set gravity
cubie.physics.setGravity(-20);

// Collision events
cubie.events.on('collision', ({ bodyA, bodyB }) => {
  console.log('Collision detected!');
});`}
                </pre>
              </section>

              {/* Input System */}
              <section className="bg-gray-900 p-6 rounded-lg border border-yellow-500/30">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4">🎮 Input System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-lime-300">
{`// Keyboard
if (cubie.input.isKeyDown('w')) { /* held */ }
if (cubie.input.isKeyPressed('space')) { /* just pressed */ }
if (cubie.input.isKeyReleased('esc')) { /* just released */ }

// Mouse
if (cubie.input.isMouseDown(0)) { /* left button */ }
const pos = cubie.input.getMousePosition(); // { x, y }

// Touch
const touches = cubie.input.getTouches();
const touchCount = cubie.input.getTouchCount();

// Gamepad
const gamepad = cubie.input.getGamepad();
if (cubie.input.getButton(0)) { /* button A */ }
const axisX = cubie.input.getAxis(0); // Left stick X`}
                </pre>
              </section>

              {/* Audio */}
              <section className="bg-gray-900 p-6 rounded-lg border border-indigo-500/30">
                <h2 className="text-2xl font-bold text-indigo-400 mb-4">🔊 Audio System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-purple-300">
{`// Load audio
await cubie.audio.load('jump', 'jump.mp3');

// Play sound
cubie.audio.play('jump', {
  volume: 0.8,
  loop: false
});

// Stop sound
cubie.audio.stop('jump');

// Music
cubie.audio.playMusic('bgm', { volume: 0.5 });
cubie.audio.stopMusic();

// Volume control
cubie.audio.setMasterVolume(0.8);
cubie.audio.setSoundVolume(1.0);
cubie.audio.setMusicVolume(0.6);`}
                </pre>
              </section>

              {/* Assets */}
              <section className="bg-gray-900 p-6 rounded-lg border border-teal-500/30">
                <h2 className="text-2xl font-bold text-teal-400 mb-4">📦 Asset System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-cyan-300">
{`// Load single asset
await cubie.assets.loadImage('player', 'player.png');
await cubie.assets.loadTexture('brick', 'brick.jpg');
await cubie.assets.loadJSON('level', 'level.json');

// Load multiple assets
await cubie.assets.loadMultiple([
  { type: 'image', name: 'player', url: 'player.png' },
  { type: 'audio', name: 'music', url: 'music.mp3' },
  { type: 'json', name: 'data', url: 'data.json' }
], (progress) => {
  console.log(\`Loading: \${progress * 100}%\`);
});

// Get assets
const img = cubie.assets.getImage('player');
const texture = cubie.assets.getTexture('brick');
const data = cubie.assets.getData('level');`}
                </pre>
              </section>

              {/* Particles */}
              <section className="bg-gray-900 p-6 rounded-lg border border-orange-500/30">
                <h2 className="text-2xl font-bold text-orange-400 mb-4">✨ Particle System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-yellow-300">
{`// Create emitter
const emitter = cubie.particles.createEmitter({
  position: { x: 0, y: 5, z: 0 },
  rate: 50, // particles per second
  lifetime: 2, // seconds
  velocity: { x: 0, y: 3, z: 0 },
  velocityVariance: { x: 1, y: 1, z: 1 },
  color: 0xffaa00,
  size: 0.2,
  sizeEnd: 0,
  alpha: 1,
  alphaEnd: 0,
  maxParticles: 1000
});

// Control emitter
emitter.enabled = false;
cubie.particles.removeEmitter(emitter);`}
                </pre>
              </section>

              {/* Tweens */}
              <section className="bg-gray-900 p-6 rounded-lg border border-green-500/30">
                <h2 className="text-2xl font-bold text-green-400 mb-4">🎬 Tween System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-lime-300">
{`// Animate properties
cubie.tweens.to(entity.mesh.position, 
  { x: 10, y: 5, z: 0 }, 
  2, // duration in seconds
  {
    easing: cubie.tweens.easeInOutQuad,
    delay: 0.5,
    onUpdate: (target, progress) => {
      console.log('Progress:', progress);
    },
    onComplete: (target) => {
      console.log('Animation complete!');
    }
  }
);

// Available easing functions
// easeLinear, easeInQuad, easeOutQuad, easeInOutQuad
// easeInCubic, easeOutCubic, easeInOutCubic`}
                </pre>
              </section>

              {/* Systems */}
              <section className="bg-gray-900 p-6 rounded-lg border border-violet-500/30">
                <h2 className="text-2xl font-bold text-violet-400 mb-4">⚙️ System Management</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-purple-300">
{`// Add custom system
cubie.system.add('enemyAI', {
  enabled: true,
  init: (engine) => {
    console.log('System initialized');
  },
  update: (dt) => {
    // Update logic every frame
  },
  destroy: () => {
    console.log('System destroyed');
  }
});

// Control systems
cubie.system.enable('enemyAI');
cubie.system.disable('enemyAI');
cubie.system.remove('enemyAI');
const system = cubie.system.get('enemyAI');`}
                </pre>
              </section>

              {/* Lighting */}
              <section className="bg-gray-900 p-6 rounded-lg border border-amber-500/30">
                <h2 className="text-2xl font-bold text-amber-400 mb-4">💡 Lighting</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-yellow-300">
{`// Directional light
cubie.light.add('directional', {
  color: 0xffffff,
  intensity: 1,
  position: { x: 5, y: 10, z: 5 },
  castShadow: true
});

// Point light
cubie.light.add('point', {
  color: 0xff0000,
  intensity: 2,
  distance: 20,
  position: { x: 0, y: 5, z: 0 }
});

// Spot light
cubie.light.add('spot', {
  color: 0xffffff,
  intensity: 1,
  angle: Math.PI / 6,
  castShadow: true
});

// Ambient light
cubie.light.add('ambient', {
  color: 0x404040,
  intensity: 0.5
});`}
                </pre>
              </section>

              {/* Camera */}
              <section className="bg-gray-900 p-6 rounded-lg border border-sky-500/30">
                <h2 className="text-2xl font-bold text-sky-400 mb-4">📷 Camera Controls</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-cyan-300">
{`// Set camera position
cubie.camera.setPosition(0, 10, 20);

// Look at target
cubie.camera.lookAt(0, 0, 0);

// Follow entity
cubie.camera.follow(player, { x: 0, y: 5, z: 10 });

// Direct access (3D mode)
cubie.camera.fov = 60;
cubie.camera.near = 0.1;
cubie.camera.far = 1000;
cubie.camera.updateProjectionMatrix();`}
                </pre>
              </section>

              {/* Scene */}
              <section className="bg-gray-900 p-6 rounded-lg border border-emerald-500/30">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4">🌍 Scene Controls</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-green-300">
{`// Set background color
cubie.scene.setBackground(0x87ceeb);

// Set skybox
cubie.scene.setSkybox([
  'right.jpg', 'left.jpg',
  'top.jpg', 'bottom.jpg',
  'front.jpg', 'back.jpg'
]);

// Set fog
cubie.scene.setFog(0xffffff, 10, 100);`}
                </pre>
              </section>

              {/* 2D Graphics */}
              <section className="bg-gray-900 p-6 rounded-lg border border-rose-500/30">
                <h2 className="text-2xl font-bold text-rose-400 mb-4">🎨 2D Graphics (2D Mode)</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-pink-300">
{`// Rectangle
cubie.graphics.rect(100, 100, 50, 50, '#ff0000', {
  stroke: true,
  strokeColor: '#000',
  strokeWidth: 2
});

// Circle
cubie.graphics.circle(200, 200, 30, '#00ff00');

// Line
cubie.graphics.line(0, 0, 100, 100, '#0000ff', 2);

// Text
cubie.graphics.text('Hello World!', 50, 50, {
  font: '24px Arial',
  color: '#fff',
  align: 'center'
});`}
                </pre>
              </section>

              {/* Sprites */}
              <section className="bg-gray-900 p-6 rounded-lg border border-fuchsia-500/30">
                <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">🖼️ Sprite System (2D Mode)</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-purple-300">
{`// Load image first
await cubie.assets.loadImage('player', 'player.png');

// Create sprite
const sprite = cubie.sprite.create('playerSprite', {
  x: 100,
  y: 100,
  width: 64,
  height: 64,
  imageName: 'player',
  layer: 'main' // background, main, foreground, ui
});

// Manipulate sprite
sprite.x = 200;
sprite.y = 150;
sprite.rotation = Math.PI / 4;
sprite.alpha = 0.5;
sprite.visible = true;`}
                </pre>
              </section>

              {/* Events */}
              <section className="bg-gray-900 p-6 rounded-lg border border-lime-500/30">
                <h2 className="text-2xl font-bold text-lime-400 mb-4">📡 Event System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-green-300">
{`// Listen to events
cubie.events.on('collision', ({ bodyA, bodyB }) => {
  console.log('Collision!');
});

cubie.events.on('entity:create', (entity) => {
  console.log('Entity created:', entity.name);
});

// Built-in events
// 'start', 'stop', 'pause', 'resume'
// 'resize', 'collision'
// 'entity:create', 'entity:remove'

// Once listener
cubie.events.once('start', () => {
  console.log('Game started once!');
});

// Remove listener
const handler = (data) => console.log(data);
cubie.events.on('myEvent', handler);
cubie.events.off('myEvent', handler);

// Emit custom events
cubie.events.emit('myEvent', { data: 'value' });`}
                </pre>
              </section>

              {/* Hooks */}
              <section className="bg-gray-900 p-6 rounded-lg border border-cyan-500/30">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">🪝 Lifecycle Hooks</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-blue-300">
{`// Pre-update hook
cubie.hook.preUpdate((dt) => {
  // Runs before update systems
});

// Post-update hook
cubie.hook.postUpdate((dt) => {
  // Runs after update systems
});

// Pre-render hook
cubie.hook.preRender(() => {
  // Runs before rendering
});

// Post-render hook
cubie.hook.postRender(() => {
  // Runs after rendering
  const stats = cubie.performance.getStats();
  console.log('FPS:', stats.fps);
});`}
                </pre>
              </section>

              {/* Logger */}
              <section className="bg-gray-900 p-6 rounded-lg border border-green-500/30">
                <h2 className="text-2xl font-bold text-green-400 mb-4">📝 Logger System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-lime-300">
{`// Log messages
cubie.logger.debug('Debug message');
cubie.logger.info('Info message');
cubie.logger.warn('Warning message');
cubie.logger.error('Error message');
cubie.logger.success('Success message');

// Listen to logs
cubie.logger.onLog((log) => {
  console.log(log.level, log.message, log.data);
});

// Set log level
cubie.logger.setLevel('warn'); // debug, info, warn, error

// Get logs
const allLogs = cubie.logger.getLogs();
const errors = cubie.logger.getLogs('error');

// Clear logs
cubie.logger.clear();`}
                </pre>
              </section>

              {/* Performance */}
              <section className="bg-gray-900 p-6 rounded-lg border border-yellow-500/30">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4">⚡ Performance Monitor</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-amber-300">
{`// Get performance stats
const stats = cubie.performance.getStats();

console.log(stats.fps);        // Frames per second
console.log(stats.frameTime);  // Frame time in ms
console.log(stats.memory);     // Memory usage in MB
console.log(stats.drawCalls);  // Draw calls (3D)
console.log(stats.triangles);  // Triangle count (3D)
console.log(stats.entities);   // Entity count
console.log(stats.systems);    // System count

// Monitor in real-time
cubie.hook.postRender(() => {
  const stats = cubie.performance.getStats();
  document.getElementById('fps').textContent = stats.fps;
});`}
                </pre>
              </section>

              {/* Storage */}
              <section className="bg-gray-900 p-6 rounded-lg border border-indigo-500/30">
                <h2 className="text-2xl font-bold text-indigo-400 mb-4">💾 Storage System</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-violet-300">
{`// Save data
cubie.storage.save('playerData', {
  name: 'Player1',
  score: 1000,
  level: 5
});

// Load data
const data = cubie.storage.load('playerData');
console.log(data.score); // 1000

// Remove data
cubie.storage.remove('playerData');

// Clear all data
cubie.storage.clear();`}
                </pre>
              </section>

              {/* Utilities */}
              <section className="bg-gray-900 p-6 rounded-lg border border-pink-500/30">
                <h2 className="text-2xl font-bold text-pink-400 mb-4">🛠️ Utility Functions</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-rose-300">
{`// Math utilities
cubie.utils.lerp(0, 100, 0.5);           // 50
cubie.utils.clamp(150, 0, 100);          // 100
cubie.utils.map(5, 0, 10, 0, 100);       // 50
cubie.utils.random(0, 100);              // Random float
cubie.utils.randomInt(0, 10);            // Random int
cubie.utils.degToRad(90);                // π/2
cubie.utils.radToDeg(Math.PI);           // 180
cubie.utils.distance(0, 0, 3, 4);        // 5
cubie.utils.distance3D(0,0,0, 1,1,1);    // √3`}
                </pre>
              </section>

              {/* Advanced Example */}
              <section className="bg-gray-900 p-6 rounded-lg border border-orange-500/30">
                <h2 className="text-2xl font-bold text-orange-400 mb-4">🎮 Complete Game Example</h2>
                <pre className="bg-black p-4 rounded text-sm overflow-x-auto text-yellow-300">
{`// Initialize engine
const cubie = new Cubie({
  canvas: document.getElementById('canvas'),
  mode: '3d',
  shadows: true
});

// Load assets
await cubie.assets.loadMultiple([
  { type: 'image', name: 'player', url: 'player.png' },
  { type: 'audio', name: 'jump', url: 'jump.mp3' },
  { type: 'json', name: 'level', url: 'level.json' }
], (progress) => {
  console.log(\`Loading \${progress * 100}%\`);
});

// Setup scene
cubie.scene.setBackground(0x87ceeb);
cubie.scene.setFog(0x87ceeb, 20, 100);

// Create ground
cubie.primitive.plane('ground', {
  width: 100, height: 100,
  color: 0x228b22
});

// Create player
const player = cubie.primitive.box('player', {
  width: 1, height: 2, depth: 1,
  color: 0xff0000,
  position: { x: 0, y: 1, z: 0 },
  physics: { mass: 1, useGravity: true }
});

player.addTag('player');
player.addComponent('health', { value: 100 });

// Player controller
cubie.system.add('playerController', {
  speed: 5,
  update: (dt) => {
    const body = cubie.physics.bodies.find(b => 
      b.entity === player
    );
    
    if (cubie.input.isKeyDown('w')) 
      body.velocity.z = -this.speed;
    if (cubie.input.isKeyDown('s')) 
      body.velocity.z = this.speed;
    if (cubie.input.isKeyDown('a')) 
      body.velocity.x = -this.speed;
    if (cubie.input.isKeyDown('d')) 
      body.velocity.x = this.speed;
    if (cubie.input.isKeyPressed(' ')) {
      body.velocity.y = 10;
      cubie.audio.play('jump');
    }
  }
});

// Camera follow
cubie.camera.follow(player, { x: 0, y: 5, z: 10 });

// Enemy system
cubie.system.add('enemyAI', {
  update: (dt) => {
    const playerPos = player.position.get();
    cubie.entity.findByTag('enemy').forEach(enemy => {
      const enemyPos = enemy.position.get();
      const dx = playerPos.x - enemyPos.x;
      const dz = playerPos.z - enemyPos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      
      if (dist > 1) {
        enemyPos.x += (dx/dist) * 2 * dt;
        enemyPos.z += (dz/dist) * 2 * dt;
        enemy.position.set(enemyPos);
      }
    });
  }
});

// Collision handling
cubie.events.on('collision', ({ bodyA, bodyB }) => {
  const entities = [bodyA.entity, bodyB.entity];
  const player = entities.find(e => e.hasTag('player'));
  const enemy = entities.find(e => e.hasTag('enemy'));
  
  if (player && enemy) {
    const health = player.getComponent('health');
    health.value -= 10;
    cubie.logger.warn(\`Health: \${health.value}\`);
    
    if (health.value <= 0) {
      cubie.logger.error('Game Over!');
      cubie.pause();
    }
  }
});

// Lighting
cubie.light.add('directional', {
  color: 0xffffff,
  intensity: 1,
  position: { x: 10, y: 20, z: 10 },
  castShadow: true
});

// Particles
cubie.particles.createEmitter({
  position: { x: 0, y: 5, z: 0 },
  rate: 30,
  lifetime: 2,
  velocity: { x: 0, y: 3, z: 0 },
  color: 0xffaa00
});

// Save/Load system
cubie.events.on('pause', () => {
  cubie.storage.save('gameState', {
    playerPos: player.position.get(),
    health: player.getComponent('health').value,
    score: window.gameScore || 0
  });
});

// Start game
cubie.start();

// Debug commands
window.cubie = cubie;
console.log('Type "cubie" in console for debug access');`}
                </pre>
              </section>

              {/* Debug Commands */}
              <section className="bg-gray-900 p-6 rounded-lg border border-red-500/30">
                <h2 className="text-2xl font-bold text-red-400 mb-4">🐛 Debug Commands</h2>
                <div className="text-sm space-y-2">
                  <div className="text-cyan-300">Open browser console and type:</div>
                  <pre className="bg-black p-3 rounded text-xs text-green-300">
{`// Access engine
window.cubie

// Spawn sphere
window.cubieDebug.spawnSphere()

// Toggle system
window.cubieDebug.toggleSystem('playerController')

// Get stats
window.cubieDebug.getStats()

// Set gravity
window.cubieDebug.setGravity(-20)

// Clear physics
window.cubieDebug.clearPhysics()

// Spawn entity
const box = cubie.primitive.box('test', {
  color: 0xff00ff,
  position: { x: 0, y: 10, z: 0 }
});

// Direct manipulation
cubie.entities.forEach((entity, name) => {
  console.log(name, entity.position.get());
});`}
                  </pre>
                </div>
              </section>

              {/* Features List */}
              <section className="bg-gray-900 p-6 rounded-lg border border-emerald-500/30">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4">✨ Features</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>2D & 3D Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Entity-Component System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Physics Engine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Collision Detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Input System (KB/Mouse/Touch/Gamepad)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Audio System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Asset Manager</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Particle System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Tween Animations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Event System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Logger System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Performance Monitor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Storage System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Sprite System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>2D Graphics API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Lighting System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Camera Controls</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Lifecycle Hooks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Custom Systems</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Tag System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Component System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>JSON Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Version Management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Loading Screens</span>
                  </div>
                </div>
              </section>

              {/* Credits */}
              <section className="bg-gradient-to-r from-purple-900 to-cyan-900 p-6 rounded-lg border-2 border-cyan-400">
                <h2 className="text-3xl font-bold text-center text-cyan-300 mb-4">🎮 CubieGameJS</h2>
                <div className="text-center text-white space-y-2">
                  <div className="text-xl">Ultimate 2D/3D Game Engine</div>
                  <div className="text-lg text-cyan-400">Version 2.0.0</div>
                  <div className="text-sm text-gray-300 mt-4">Created by</div>
                  <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                    CubieCloud
                  </div>
                  <div className="text-xs text-gray-400 mt-4">
                    High-performance, feature-rich game engine for modern web games
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CubieGameJS;
