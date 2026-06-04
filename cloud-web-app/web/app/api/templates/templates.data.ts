export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  genre: 'fps' | 'rpg' | 'platformer' | 'racing' | 'blank';
  style: 'pixel' | 'lowpoly' | 'realistic' | 'scifi' | 'stylized';
  previewImage: string;
  previewVideo?: string;
  estimatedSize: number; // bytes
  features: string[];
  files: TemplateFile[];
  defaultScene: string;
}

export interface TemplateFile {
  path: string;
  content: string;
  type: 'script' | 'asset' | 'config' | 'scene';
}

// ============================================================================
// PRE-WARMED TEMPLATES
// ============================================================================

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'fps-starter',
    name: 'FPS Shooter Starter',
    description: 'Template de FPS completo com sistema de armas, Enemy AI e HUD',
    genre: 'fps',
    style: 'lowpoly',
    previewImage: '/templates/fps-preview.webp',
    previewVideo: '/templates/fps-preview.webm',
    estimatedSize: 15 * 1024 * 1024, // 15MB
    features: ['Weapon system', 'Enemy AI', 'Full HUD', 'Projectile physics'],
    defaultScene: 'MainLevel',
    files: [
      {
        path: '/Content/Scripts/Player/PlayerController.ts',
        type: 'script',
        content: `/**
 * FPS Player Controller
 * Controls player movement, camera, and shooting
 */

import { Component, Input, Camera, RigidBody } from '@aethel/core';

export class PlayerController extends Component {
  // Movement
  moveSpeed = 8;
  sprintMultiplier = 1.5;
  jumpForce = 10;

  // Camera
  mouseSensitivity = 2;
  maxLookAngle = 85;

  // State
  private pitch = 0;
  private yaw = 0;
  private isGrounded = true;
  private isSprinting = false;

  private rb: RigidBody;
  private cam: Camera;

  onStart() {
    this.rb = this.getComponent(RigidBody);
    this.cam = Camera.main;
    Input.lockCursor(true);
  }

  onUpdate(delta: number) {
    this.handleLook(delta);
    this.handleMovement(delta);
    this.handleJump();
    this.handleSprint();
  }

  private handleLook(delta: number) {
    const mouseX = Input.getAxis('MouseX') * this.mouseSensitivity;
    const mouseY = Input.getAxis('MouseY') * this.mouseSensitivity;

    this.yaw += mouseX;
    this.pitch = Math.clamp(this.pitch - mouseY, -this.maxLookAngle, this.maxLookAngle);

    this.transform.rotation.y = this.yaw;
    this.cam.transform.rotation.x = this.pitch;
  }

  private handleMovement(delta: number) {
    const horizontal = Input.getAxis('Horizontal');
    const vertical = Input.getAxis('Vertical');

    const speed = this.isSprinting ? this.moveSpeed * this.sprintMultiplier : this.moveSpeed;

    const forward = this.transform.forward.multiply(vertical);
    const right = this.transform.right.multiply(horizontal);
    const velocity = forward.add(right).normalize().multiply(speed);

    this.rb.velocity.x = velocity.x;
    this.rb.velocity.z = velocity.z;
  }

  private handleJump() {
    if (Input.getButtonDown('Jump') && this.isGrounded) {
      this.rb.addForce({ x: 0, y: this.jumpForce, z: 0 }, 'impulse');
      this.isGrounded = false;
    }
  }

  private handleSprint() {
    this.isSprinting = Input.getButton('Sprint');
  }

  onCollisionEnter(other: Collision) {
    if (other.normal.y > 0.7) {
      this.isGrounded = true;
    }
  }
}`,
      },
      {
        path: '/Content/Scripts/Weapons/Weapon.ts',
        type: 'script',
        content: `/**
 * Base Weapon Class
 */

import { Component, AudioSource, ParticleSystem } from '@aethel/core';

export abstract class Weapon extends Component {
  weaponName = 'Weapon';
  damage = 10;
  fireRate = 0.1; // seconds between shots
  magazineSize = 30;
  reloadTime = 2;

  protected currentAmmo: number;
  protected isReloading = false;
  protected lastFireTime = 0;

  protected audioSource: AudioSource;
  protected muzzleFlash: ParticleSystem;

  onStart() {
    this.currentAmmo = this.magazineSize;
    this.audioSource = this.getComponent(AudioSource);
    this.muzzleFlash = this.getComponentInChildren(ParticleSystem);
  }

  fire(): boolean {
    const now = Time.time;
    if (this.isReloading || this.currentAmmo <= 0 || now - this.lastFireTime < this.fireRate) {
      return false;
    }

    this.lastFireTime = now;
    this.currentAmmo--;
    this.onFire();

    if (this.muzzleFlash) this.muzzleFlash.emit(1);
    if (this.audioSource) this.audioSource.play();

    return true;
  }

  async reload(): Promise<void> {
    if (this.isReloading || this.currentAmmo === this.magazineSize) return;

    this.isReloading = true;
    await Time.delay(this.reloadTime);
    this.currentAmmo = this.magazineSize;
    this.isReloading = false;
  }

  protected abstract onFire(): void;

  get ammo() { return this.currentAmmo; }
  get maxAmmo() { return this.magazineSize; }
}`,
      },
      {
        path: '/Content/Scripts/UI/HUD.tsx',
        type: 'script',
        content: `/**
 * FPS HUD Component
 */

import { UIComponent, useState, useEffect } from '@aethel/ui';
import { PlayerStats, WeaponSystem } from '../Systems';

export function HUD() {
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState({ current: 30, max: 30 });
  const [crosshairHit, setCrosshairHit] = useState(false);

  useEffect(() => {
    const unsub = PlayerStats.onHealthChange(setHealth);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = WeaponSystem.onAmmoChange((current, max) => {
      setAmmo({ current, max });
    });
    return () => unsub();
  }, []);

  return (
    <div className="hud">
      {/* Crosshair */}
      <div className={\`crosshair \${crosshairHit ? 'hit' : ''}\`}>
        <div className="line top" />
        <div className="line bottom" />
        <div className="line left" />
        <div className="line right" />
      </div>

      {/* Health Bar */}
      <div className="health-bar">
        <div className="fill" style={{ width: \`\${health}%\` }} />
        <span>{health}</span>
      </div>

      {/* Ammo Counter */}
      <div className="ammo">
        <span className="current">{ammo.current}</span>
        <span className="separator">/</span>
        <span className="max">{ammo.max}</span>
      </div>
    </div>
  );
}`,
      },
      {
        path: '/Content/Scenes/MainLevel.scene',
        type: 'scene',
        content: JSON.stringify({
          name: 'MainLevel',
          entities: [
            {
              id: 'player',
              name: 'Player',
              transform: { position: [0, 2, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
              components: ['PlayerController', 'RigidBody', 'CapsuleCollider'],
              children: [
                {
                  id: 'camera',
                  name: 'MainCamera',
                  transform: { position: [0, 0.8, 0] },
                  components: ['Camera'],
                }
              ]
            },
            {
              id: 'ground',
              name: 'Ground',
              transform: { position: [0, 0, 0], scale: [50, 1, 50] },
              components: ['MeshRenderer:Cube', 'BoxCollider'],
            },
            {
              id: 'light',
              name: 'Sun',
              transform: { rotation: [50, -30, 0] },
              components: ['DirectionalLight'],
            }
          ],
          settings: {
            physics: { gravity: [0, -20, 0] },
            rendering: { ambientLight: [0.3, 0.3, 0.4] },
          }
        }, null, 2),
      },
      {
        path: '/aethel.config.json',
        type: 'config',
        content: JSON.stringify({
          name: 'FPS Shooter',
          version: '1.0.0',
          engine: '0.1.0',
          genre: 'fps',
          style: 'lowpoly',
          entry: '/Content/Scenes/MainLevel.scene',
          input: {
            actions: {
              'Fire': ['Mouse0', 'Gamepad:RightTrigger'],
              'Aim': ['Mouse1', 'Gamepad:LeftTrigger'],
              'Reload': ['R', 'Gamepad:X'],
              'Jump': ['Space', 'Gamepad:A'],
              'Sprint': ['LeftShift', 'Gamepad:LeftStick'],
            }
          }
        }, null, 2),
      },
    ],
  },
  {
    id: 'rpg-starter',
    name: 'RPG Top-Down Starter',
    description: 'RPG template with inventory, dialogue, and quest system',
    genre: 'rpg',
    style: 'pixel',
    previewImage: '/templates/rpg-preview.webp',
    estimatedSize: 20 * 1024 * 1024,
    features: ['Inventory system', 'Dialogue', 'Quests', 'Turn-based combat'],
    defaultScene: 'Village',
    files: [
      {
        path: '/Content/Scripts/Player/RPGController.ts',
        type: 'script',
        content: `/**
 * Top-Down RPG Player Controller
 */

import { Component, Input, Animator } from '@aethel/core';

export class RPGController extends Component {
  moveSpeed = 5;

  private animator: Animator;
  private lastDirection = 'down';

  onStart() {
    this.animator = this.getComponent(Animator);
  }

  onUpdate(delta: number) {
    const h = Input.getAxis('Horizontal');
    const v = Input.getAxis('Vertical');

    if (h !== 0 || v !== 0) {
      this.transform.position.x += h * this.moveSpeed * delta;
      this.transform.position.y += v * this.moveSpeed * delta;

      // Update animation direction
      if (Math.abs(h) > Math.abs(v)) {
        this.lastDirection = h > 0 ? 'right' : 'left';
      } else {
        this.lastDirection = v > 0 ? 'up' : 'down';
      }

      this.animator.play(\`walk_\${this.lastDirection}\`);
    } else {
      this.animator.play(\`idle_\${this.lastDirection}\`);
    }
  }
}`,
      },
      {
        path: '/Content/Scripts/Systems/Inventory.ts',
        type: 'script',
        content: `/**
 * Inventory System
 */

export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string;
  stackable: boolean;
  maxStack: number;
  type: 'weapon' | 'armor' | 'consumable' | 'key' | 'misc';
  stats?: Record<string, number>;
}

export interface InventorySlot {
  item: Item | null;
  quantity: number;
}

export class Inventory {
  private slots: InventorySlot[];
  private maxSlots: number;

  constructor(maxSlots = 20) {
    this.maxSlots = maxSlots;
    this.slots = Array(maxSlots).fill(null).map(() => ({ item: null, quantity: 0 }));
  }

  addItem(item: Item, quantity = 1): boolean {
    // Try to stack first
    if (item.stackable) {
      const existingSlot = this.slots.find(s =>
        s.item?.id === item.id && s.quantity < item.maxStack
      );
      if (existingSlot) {
        const canAdd = Math.min(quantity, item.maxStack - existingSlot.quantity);
        existingSlot.quantity += canAdd;
        return canAdd === quantity;
      }
    }

    // Find empty slot
    const emptySlot = this.slots.find(s => s.item === null);
    if (emptySlot) {
      emptySlot.item = item;
      emptySlot.quantity = quantity;
      return true;
    }

    return false; // Inventory full
  }

  removeItem(itemId: string, quantity = 1): boolean {
    const slot = this.slots.find(s => s.item?.id === itemId);
    if (!slot || slot.quantity < quantity) return false;

    slot.quantity -= quantity;
    if (slot.quantity <= 0) {
      slot.item = null;
      slot.quantity = 0;
    }
    return true;
  }

  getItems(): InventorySlot[] {
    return this.slots.filter(s => s.item !== null);
  }

  hasItem(itemId: string, quantity = 1): boolean {
    const total = this.slots
      .filter(s => s.item?.id === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
    return total >= quantity;
  }
}`,
      },
      {
        path: '/aethel.config.json',
        type: 'config',
        content: JSON.stringify({
          name: 'RPG Adventure',
          version: '1.0.0',
          engine: '0.1.0',
          genre: 'rpg',
          style: 'pixel',
          entry: '/Content/Scenes/Village.scene',
          rendering: { pixelPerfect: true, pixelsPerUnit: 16 },
        }, null, 2),
      },
    ],
  },
  {
    id: 'platformer-starter',
    name: 'Platformer 2D Starter',
    description: 'Platformer template with 2D physics, parallax, and collectibles',
    genre: 'platformer',
    style: 'stylized',
    previewImage: '/templates/platformer-preview.webp',
    estimatedSize: 12 * 1024 * 1024,
    features: ['2D physics', 'Parallax scrolling', 'Collectibles', 'Checkpoints'],
    defaultScene: 'Level1',
    files: [
      {
        path: '/Content/Scripts/Player/PlatformerController.ts',
        type: 'script',
        content: `/**
 * 2D Platformer Controller
 */

import { Component, Input, RigidBody2D, Animator } from '@aethel/core';

export class PlatformerController extends Component {
  moveSpeed = 8;
  jumpForce = 15;
  coyoteTime = 0.1;
  jumpBufferTime = 0.1;

  private rb: RigidBody2D;
  private animator: Animator;
  private isGrounded = false;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private facingRight = true;

  onStart() {
    this.rb = this.getComponent(RigidBody2D);
    this.animator = this.getComponent(Animator);
  }

  onUpdate(delta: number) {
    this.handleMovement();
    this.handleJump(delta);
    this.updateAnimations();
  }

  private handleMovement() {
    const h = Input.getAxis('Horizontal');
    this.rb.velocity.x = h * this.moveSpeed;

    if (h > 0 && !this.facingRight) this.flip();
    else if (h < 0 && this.facingRight) this.flip();
  }

  private handleJump(delta: number) {
    // Coyote time
    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteTime;
    } else {
      this.coyoteTimer -= delta;
    }

    // Jump buffer
    if (Input.getButtonDown('Jump')) {
      this.jumpBufferTimer = this.jumpBufferTime;
    } else {
      this.jumpBufferTimer -= delta;
    }

    // Execute jump
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.rb.velocity.y = this.jumpForce;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
    }

    // Variable jump height
    if (Input.getButtonUp('Jump') && this.rb.velocity.y > 0) {
      this.rb.velocity.y *= 0.5;
    }
  }

  private flip() {
    this.facingRight = !this.facingRight;
    this.transform.scale.x *= -1;
  }

  private updateAnimations() {
    if (!this.isGrounded) {
      this.animator.play(this.rb.velocity.y > 0 ? 'jump' : 'fall');
    } else if (Math.abs(this.rb.velocity.x) > 0.1) {
      this.animator.play('run');
    } else {
      this.animator.play('idle');
    }
  }

  onCollisionEnter(collision: Collision2D) {
    if (collision.normal.y > 0.7) {
      this.isGrounded = true;
    }
  }

  onCollisionExit(collision: Collision2D) {
    this.isGrounded = false;
  }
}`,
      },
      {
        path: '/aethel.config.json',
        type: 'config',
        content: JSON.stringify({
          name: 'Platformer Adventure',
          version: '1.0.0',
          engine: '0.1.0',
          genre: 'platformer',
          style: 'stylized',
          entry: '/Content/Scenes/Level1.scene',
          physics2D: { gravity: [0, -30] },
        }, null, 2),
      },
    ],
  },
  {
    id: 'blank-project',
    name: 'Blank Project',
    description: 'Empty project to start from scratch',
    genre: 'blank',
    style: 'stylized',
    previewImage: '/templates/blank-preview.webp',
    estimatedSize: 1024 * 1024, // 1MB
    features: ['Cena vazia', 'Liberdade total'],
    defaultScene: 'Main',
    files: [
      {
        path: '/Content/Scenes/Main.scene',
        type: 'scene',
        content: JSON.stringify({
          name: 'Main',
          entities: [
            {
              id: 'camera',
              name: 'MainCamera',
              transform: { position: [0, 5, -10], rotation: [15, 0, 0] },
              components: ['Camera'],
            },
            {
              id: 'light',
              name: 'DirectionalLight',
              transform: { rotation: [50, -30, 0] },
              components: ['DirectionalLight'],
            },
          ],
          settings: {}
        }, null, 2),
      },
      {
        path: '/aethel.config.json',
        type: 'config',
        content: JSON.stringify({
          name: 'My Game',
          version: '1.0.0',
          engine: '0.1.0',
          entry: '/Content/Scenes/Main.scene',
        }, null, 2),
      },
    ],
  },
];
