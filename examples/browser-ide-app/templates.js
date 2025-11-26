/**
 * Professional Templates System
 * 20+ ready-to-use templates for games, movies, and apps
 */

const Templates = {
  // ============================================
  // GAME TEMPLATES (10)
  // ============================================
  
  games: {
    platformer2d: {
      id: 'platformer2d',
      name: '2D Platformer',
      category: 'game',
      genre: 'platformer',
      difficulty: 'beginner',
      estimatedTime: '30 minutes',
      description: 'Classic 2D platformer with player, platforms, and collectibles',
      tags: ['2d', 'platformer', 'beginner', 'mario-style'],
      thumbnail: 'platformer2d.png',
      code: {
        main: `// 2D Platformer Game
const player = createPlayer({ x: 100, y: 300, speed: 5, jumpForce: 10 });
const platforms = createPlatforms([
  { x: 0, y: 400, width: 800, height: 50 },
  { x: 200, y: 300, width: 200, height: 20 },
  { x: 500, y: 200, width: 200, height: 20 }
]);
const collectibles = createCollectibles(10);

function gameLoop() {
  handleInput(player);
  applyGravity(player);
  checkCollisions(player, platforms);
  checkCollectibles(player, collectibles);
  render();
}`,
      },
      assets: ['player_sprite.png', 'platform_tile.png', 'coin.png'],
    },
    
    fps3d: {
      id: 'fps3d',
      name: '3D First-Person Shooter',
      category: 'game',
      genre: 'fps',
      difficulty: 'intermediate',
      estimatedTime: '2 hours',
      description: 'First-person shooter with enemies, weapons, and health system',
      tags: ['3d', 'fps', 'shooter', 'action'],
      thumbnail: 'fps3d.png',
      code: {
        main: `// FPS Game
const player = createFPSPlayer({ health: 100, speed: 5 });
const weapon = createWeapon({ damage: 25, fireRate: 0.5 });
const enemies = createEnemies(5, { health: 50, speed: 2 });
const level = loadLevel('fps_level_1');

function gameLoop() {
  handleFPSControls(player);
  updateEnemies(enemies, player);
  handleShooting(weapon, enemies);
  checkGameOver(player);
  render3D();
}`,
      },
      assets: ['weapon_model.fbx', 'enemy_model.fbx', 'level_1.fbx'],
    },
    
    racing: {
      id: 'racing',
      name: 'Racing Game',
      category: 'game',
      genre: 'racing',
      difficulty: 'intermediate',
      estimatedTime: '2 hours',
      description: 'Racing game with physics, AI opponents, and lap system',
      tags: ['3d', 'racing', 'physics', 'multiplayer'],
      thumbnail: 'racing.png',
    },
    
    puzzle: {
      id: 'puzzle',
      name: 'Puzzle Game',
      category: 'game',
      genre: 'puzzle',
      difficulty: 'beginner',
      estimatedTime: '1 hour',
      description: 'Match-3 puzzle game with scoring and levels',
      tags: ['2d', 'puzzle', 'match3', 'casual'],
      thumbnail: 'puzzle.png',
    },
    
    towerDefense: {
      id: 'towerDefense',
      name: 'Tower Defense',
      category: 'game',
      genre: 'strategy',
      difficulty: 'intermediate',
      estimatedTime: '3 hours',
      description: 'Tower defense with multiple tower types and enemy waves',
      tags: ['2d', 'strategy', 'tower-defense', 'waves'],
      thumbnail: 'tower_defense.png',
    },
    
    rpgTopDown: {
      id: 'rpgTopDown',
      name: 'Top-Down RPG',
      category: 'game',
      genre: 'rpg',
      difficulty: 'advanced',
      estimatedTime: '5 hours',
      description: 'Zelda-style RPG with inventory, quests, and combat',
      tags: ['2d', 'rpg', 'adventure', 'zelda-style'],
      thumbnail: 'rpg_topdown.png',
    },
    
    endlessRunner: {
      id: 'endlessRunner',
      name: 'Endless Runner',
      category: 'game',
      genre: 'runner',
      difficulty: 'beginner',
      estimatedTime: '1 hour',
      description: 'Temple Run style endless runner with obstacles',
      tags: ['3d', 'runner', 'endless', 'mobile'],
      thumbnail: 'endless_runner.png',
    },
    
    physicsPuzzle: {
      id: 'physicsPuzzle',
      name: 'Physics Puzzle',
      category: 'game',
      genre: 'puzzle',
      difficulty: 'intermediate',
      estimatedTime: '2 hours',
      description: 'Angry Birds style physics-based puzzle game',
      tags: ['2d', 'physics', 'puzzle', 'casual'],
      thumbnail: 'physics_puzzle.png',
    },
    
    rhythmGame: {
      id: 'rhythmGame',
      name: 'Rhythm Game',
      category: 'game',
      genre: 'rhythm',
      difficulty: 'intermediate',
      estimatedTime: '2 hours',
      description: 'Guitar Hero style rhythm game with music sync',
      tags: ['2d', 'rhythm', 'music', 'timing'],
      thumbnail: 'rhythm_game.png',
    },
    
    survival: {
      id: 'survival',
      name: 'Survival Game',
      category: 'game',
      genre: 'survival',
      difficulty: 'advanced',
      estimatedTime: '5 hours',
      description: 'Minecraft-style survival with crafting and building',
      tags: ['3d', 'survival', 'crafting', 'open-world'],
      thumbnail: 'survival.png',
    },
  },
  
  // ============================================
  // APP TEMPLATES (5)
  // ============================================
  
  apps: {
    dashboard: {
      id: 'dashboard',
      name: 'Analytics Dashboard',
      category: 'app',
      type: 'dashboard',
      difficulty: 'intermediate',
      estimatedTime: '2 hours',
      description: 'Professional analytics dashboard with charts and metrics',
      tags: ['web', 'dashboard', 'analytics', 'charts'],
      thumbnail: 'dashboard.png',
      code: {
        html: `<div class="dashboard">
  <header class="dashboard-header">
    <h1>Analytics Dashboard</h1>
  </header>
  <div class="metrics-grid">
    <div class="metric-card">
      <h3>Total Users</h3>
      <p class="metric-value">12,345</p>
    </div>
    <!-- More metrics -->
  </div>
  <div class="charts-grid">
    <canvas id="chart1"></canvas>
    <canvas id="chart2"></canvas>
  </div>
</div>`,
      },
    },
    
    ecommerce: {
      id: 'ecommerce',
      name: 'E-commerce Store',
      category: 'app',
      type: 'ecommerce',
      difficulty: 'advanced',
      estimatedTime: '5 hours',
      description: 'Complete e-commerce with products, cart, and checkout',
      tags: ['web', 'ecommerce', 'shop', 'payment'],
      thumbnail: 'ecommerce.png',
    },
    
    socialMedia: {
      id: 'socialMedia',
      name: 'Social Media Feed',
      category: 'app',
      type: 'social',
      difficulty: 'intermediate',
      estimatedTime: '3 hours',
      description: 'Social media feed with posts, likes, and comments',
      tags: ['web', 'social', 'feed', 'interactive'],
      thumbnail: 'social_media.png',
    },
    
    portfolio: {
      id: 'portfolio',
      name: 'Portfolio Website',
      category: 'app',
      type: 'portfolio',
      difficulty: 'beginner',
      estimatedTime: '1 hour',
      description: 'Professional portfolio website with projects showcase',
      tags: ['web', 'portfolio', 'showcase', 'personal'],
      thumbnail: 'portfolio.png',
    },
    
    adminPanel: {
      id: 'adminPanel',
      name: 'Admin Panel',
      category: 'app',
      type: 'admin',
      difficulty: 'advanced',
      estimatedTime: '4 hours',
      description: 'Complete admin panel with CRUD operations',
      tags: ['web', 'admin', 'crud', 'management'],
      thumbnail: 'admin_panel.png',
    },
  },
  
  // ============================================
  // MOVIE/ANIMATION TEMPLATES (5)
  // ============================================
  
  movies: {
    sciFiScene: {
      id: 'sciFiScene',
      name: 'Sci-Fi Scene',
      category: 'movie',
      genre: 'scifi',
      difficulty: 'advanced',
      estimatedTime: '4 hours',
      description: 'Futuristic sci-fi scene with spaceship and effects',
      tags: ['3d', 'scifi', 'cinematic', 'effects'],
      thumbnail: 'scifi_scene.png',
    },
    
    actionSequence: {
      id: 'actionSequence',
      name: 'Action Sequence',
      category: 'movie',
      genre: 'action',
      difficulty: 'advanced',
      estimatedTime: '5 hours',
      description: 'High-octane action sequence with explosions',
      tags: ['3d', 'action', 'cinematic', 'explosions'],
      thumbnail: 'action_sequence.png',
    },
    
    characterAnimation: {
      id: 'characterAnimation',
      name: 'Character Animation',
      category: 'movie',
      type: 'animation',
      difficulty: 'intermediate',
      estimatedTime: '3 hours',
      description: 'Character animation showcase with walk cycle',
      tags: ['3d', 'animation', 'character', 'rigging'],
      thumbnail: 'character_animation.png',
    },
    
    environmentShowcase: {
      id: 'environmentShowcase',
      name: 'Environment Showcase',
      category: 'movie',
      type: 'environment',
      difficulty: 'intermediate',
      estimatedTime: '3 hours',
      description: 'Beautiful environment with camera flythrough',
      tags: ['3d', 'environment', 'landscape', 'cinematic'],
      thumbnail: 'environment_showcase.png',
    },
    
    vfxDemo: {
      id: 'vfxDemo',
      name: 'VFX Demo',
      category: 'movie',
      type: 'vfx',
      difficulty: 'advanced',
      estimatedTime: '4 hours',
      description: 'Visual effects demo with particles and post-processing',
      tags: ['3d', 'vfx', 'particles', 'effects'],
      thumbnail: 'vfx_demo.png',
    },
  },
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  /**
   * Get all templates
   */
  getAll() {
    return {
      ...this.games,
      ...this.apps,
      ...this.movies,
    };
  },
  
  /**
   * Get templates by category
   */
  getByCategory(category) {
    switch (category) {
      case 'game':
        return this.games;
      case 'app':
        return this.apps;
      case 'movie':
        return this.movies;
      default:
        return this.getAll();
    }
  },
  
  /**
   * Get template by ID
   */
  getById(id) {
    const all = this.getAll();
    return all[id];
  },
  
  /**
   * Search templates
   */
  search(query) {
    const all = this.getAll();
    const lowerQuery = query.toLowerCase();
    
    return Object.values(all).filter(template => 
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.includes(lowerQuery))
    );
  },
  
  /**
   * Get templates by difficulty
   */
  getByDifficulty(difficulty) {
    const all = this.getAll();
    return Object.values(all).filter(t => t.difficulty === difficulty);
  },
  
  /**
   * Get templates by tag
   */
  getByTag(tag) {
    const all = this.getAll();
    return Object.values(all).filter(t => t.tags.includes(tag));
  },
  
  /**
   * Create project from template
   */
  async createProject(templateId, projectName) {
    const template = this.getById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    const project = {
      id: `project_${Date.now()}`,
      name: projectName || template.name,
      template: templateId,
      category: template.category,
      created: Date.now(),
      code: template.code || {},
      assets: template.assets || [],
      settings: {
        genre: template.genre,
        difficulty: template.difficulty,
      },
    };
    
    return project;
  },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Templates };
}
