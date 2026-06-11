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

import type { ObjectiveType } from './quest-editor-models';

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
