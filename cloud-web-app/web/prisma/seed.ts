import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@aethel.ai' },
    update: {},
    create: {
      email: 'demo@aethel.ai',
      password: hashedPassword,
      name: 'Demo User',
      plan: 'pro',
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create demo project
  const project = await prisma.project.create({
    data: {
      name: 'My First Game',
      template: 'platformer2d',
      userId: user.id,
      files: {
        create: [
          {
            path: '/src/main.js',
            content: `// Main game file
console.log('Game starting...');

function init() {
  console.log('Initializing game...');
}

function update() {
  // Game loop
}

init();`,
            language: 'javascript',
          },
          {
            path: '/src/player.js',
            content: `// Player controller
class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.speed = 5;
  }

  move(dx, dy) {
    this.x += dx * this.speed;
    this.y += dy * this.speed;
  }
}

export default Player;`,
            language: 'javascript',
          },
          {
            path: '/index.html',
            content: `<!DOCTYPE html>
<html>
<head>
  <title>My First Game</title>
  <style>
    body { margin: 0; padding: 0; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script src="src/main.js"></script>
</body>
</html>`,
            language: 'html',
          },
        ],
      },
    },
  });

  console.log('✅ Created demo project:', project.name);

  console.log('🎉 Seeding completed!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Email: demo@aethel.ai');
  console.log('  Password: demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
