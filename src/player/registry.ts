import type { PlayerPlugin } from '../plugins/types';
import { multipleChoicePlayer } from '../plugins/multipleChoice/player';

const plugins: PlayerPlugin<never>[] = [multipleChoicePlayer as PlayerPlugin<never>];

export function getPlayerPlugin(type: string): PlayerPlugin | undefined {
  return plugins.find((p) => p.type === type) as PlayerPlugin | undefined;
}
