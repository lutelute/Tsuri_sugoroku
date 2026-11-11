// 札の絵係: 札の上半分に入れる絵（320x150 の横長の一枚絵）。
// どの絵柄を出すかは eventArtPick.ts（純粋関数）が決める。ここは絵柄 → 絵の対応だけ。
import { useId } from 'react';
import type { ReactNode } from 'react';
import type { EventArtSpec } from './eventArtPick';
import { ART_W, ART_H } from './artBase';
import { ArtDefs } from './artKit';
import {
  SceneCoins, SceneWallet, SceneGift, SceneRodBreak, SceneReelSoak, SceneLureLost, SceneFish, SceneTairyo, ScenePower,
  SceneStorm, SceneSky, SceneTravel, SceneRest, SceneDice, SceneShrine, SceneLottery,
} from './EventArtScenes';
import {
  SceneBird, SceneMonkey, SceneBear, SceneBoar, SceneDolphin, SceneTurtle,
  SceneNamazu, SceneSquid, SceneFire, SceneMarket, SceneHouse, SceneElection,
} from './EventArtScenes2';
import { OnsenShapes } from '../rest/OnsenScene';

function scene(spec: EventArtSpec, u: string): ReactNode {
  const v = spec.variant;
  switch (spec.kind) {
    case 'coins': return <SceneCoins u={u} />;
    case 'wallet': return <SceneWallet u={u} />;
    case 'gift': return <SceneGift u={u} variant={v} />;
    case 'rod_break': return <SceneRodBreak u={u} />;
    case 'reel_soak': return <SceneReelSoak u={u} />;
    case 'lure_lost': return <SceneLureLost u={u} />;
    case 'fish': return <SceneFish u={u} variant={v} />;
    case 'tairyo': return <SceneTairyo u={u} />;
    case 'power': return <ScenePower u={u} />;
    case 'storm': return <SceneStorm u={u} variant={v} />;
    case 'sky': return <SceneSky u={u} variant={v} />;
    case 'bird': return <SceneBird u={u} variant={v} />;
    case 'monkey': return <SceneMonkey u={u} />;
    case 'bear': return <SceneBear u={u} />;
    case 'boar': return <SceneBoar u={u} />;
    case 'dolphin': return <SceneDolphin u={u} />;
    case 'turtle': return <SceneTurtle u={u} />;
    case 'travel': return <SceneTravel u={u} variant={v} />;
    case 'rest': return <SceneRest />;
    case 'dice': return <SceneDice u={u} />;
    case 'onsen':
      return (
        <svg x="0" y="0" width={ART_W} height={ART_H} viewBox="0 6 360 164" preserveAspectRatio="xMidYMid slice">
          <OnsenShapes u={u} />
        </svg>
      );
    case 'shrine': return <SceneShrine u={u} />;
    case 'lottery': return <SceneLottery u={u} />;
    case 'namazu': return <SceneNamazu u={u} />;
    case 'squid': return <SceneSquid u={u} />;
    case 'fire': return <SceneFire u={u} />;
    case 'market': return <SceneMarket u={u} variant={v} />;
    case 'house': return <SceneHouse u={u} variant={v} />;
    case 'election': return <SceneElection u={u} />;
  }
}

interface EventArtProps {
  spec: EventArtSpec;
  /** 札の種類（縁の色を変える） */
  tone?: 'good' | 'bad' | 'random';
  className?: string;
}

/** 札の絵（額に入れた一枚絵） */
export default function EventArt({ spec, tone = 'random', className = '' }: EventArtProps) {
  const u = `ea${useId().replace(/:/g, '')}`;
  return (
    <div className={`fd-art is-${tone} ${className}`} aria-hidden="true">
      <svg viewBox={`0 0 ${ART_W} ${ART_H}`} preserveAspectRatio="xMidYMid slice" className="block w-full h-full">
        <ArtDefs u={u} />
        {scene(spec, u)}
      </svg>
    </div>
  );
}
