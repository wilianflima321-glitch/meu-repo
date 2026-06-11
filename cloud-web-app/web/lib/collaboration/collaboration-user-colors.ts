const USER_COLORS = [
  '#f38ba8',
  '#fab387',
  '#f9e2af',
  '#a6e3a1',
  '#94e2d5',
  '#89b4fa',
  '#cba6f7',
  '#f5c2e7',
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}
