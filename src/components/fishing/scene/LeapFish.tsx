// 釣り上げた瞬間の魚: 水面から飛び出して、手前へ大きく来る（0.8 秒）。
// 幅 0 の親の中に置くと、その点から飛び出す。魚の絵はひれが透けるので、うしろに白い下地を敷く。
import FishIllustration from '../../shared/FishIllustration';

export default function LeapFish({ fishId, big = false, delayMs = 0 }: { fishId: string; big?: boolean; delayMs?: number }) {
  return (
    <div className={`um-leap ${big ? 'is-big' : ''}`} style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}>
      <FishIllustration fishId={fishId} width={168} height={112} silhouette className="um-leap-back" />
      <FishIllustration fishId={fishId} width={168} height={112} className="relative block" />
    </div>
  );
}
