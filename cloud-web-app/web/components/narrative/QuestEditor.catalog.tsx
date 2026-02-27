import type { ReactNode } from 'react';
import {
  Gift,
  MapPin,
  MessageCircle,
  Package,
  Shield,
  Swords,
  Target,
  Users,
  Zap,
} from 'lucide-react';

import type { ObjectiveType, QuestCategory } from './QuestEditor.types';

export const QUEST_CATEGORIES: QuestCategory[] = [
  { id: 'main', name: 'Main Story', color: '#eab308', icon: '⭐' },
  { id: 'side', name: 'Side Quest', color: '#3b82f6', icon: '📜' },
  { id: 'faction', name: 'Faction', color: '#8b5cf6', icon: '🛡️' },
  { id: 'bounty', name: 'Bounty', color: '#ef4444', icon: '⚔️' },
  { id: 'exploration', name: 'Exploration', color: '#22c55e', icon: '🗺️' },
  { id: 'crafting', name: 'Crafting', color: '#f97316', icon: '🔨' },
];

export const OBJECTIVE_ICONS: Record<ObjectiveType, ReactNode> = {
  collect: <Package className="w-4 h-4" />,
  kill: <Swords className="w-4 h-4" />,
  explore: <MapPin className="w-4 h-4" />,
  talk: <MessageCircle className="w-4 h-4" />,
  escort: <Users className="w-4 h-4" />,
  defend: <Shield className="w-4 h-4" />,
  craft: <Zap className="w-4 h-4" />,
  deliver: <Gift className="w-4 h-4" />,
  custom: <Target className="w-4 h-4" />,
};

