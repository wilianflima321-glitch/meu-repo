import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const shouldSeedDemo = process.env.SEED_DEMO_USER === '1';
  if (!shouldSeedDemo) {
    console.log('Seed completed (demo user skipped). Set SEED_DEMO_USER=1 to create a demo account.');
    return;
  }

  const demoEmail = process.env.SEED_DEMO_EMAIL || 'demo@aethel.ai';
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) {
    throw new Error('SEED_DEMO_PASSWORD is required when SEED_DEMO_USER=1');
  }

  const hashedPassword = await bcrypt.hash(demoPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      password: hashedPassword,
      name: 'Demo User',
      plan: 'pro',
    },
  });

  console.log('Created demo user:', user.email);

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

  console.log('Created demo project:', project.name);
  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
