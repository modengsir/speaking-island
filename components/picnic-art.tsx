import { Leaf, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { COLORS, type FruitId, type LessonStep } from "@/lib/lesson";
export function ObjectArt({ kind, className = "" }: { kind: string; className?: string }) {
  const color = COLORS.find(c => kind === c.id + "-cup") ?? COLORS[5];
  return <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
    <ellipse cx="60" cy="105" rx="35" ry="6" fill="#332c2012"/>
    {kind === "apple" ? <><path d="M61 40C19 14 5 72 34 97c12 11 18 3 27 3s15 8 27-3C117 72 103 14 61 40Z" fill="#ed7257"/><path d="M61 40c-4-14 0-22 6-27" stroke="#83503b" strokeWidth="7" strokeLinecap="round"/><path d="M63 27c6-20 27-17 27-17S87 34 63 27Z" fill="#7aa576"/><path d="M35 53c-8 5-10 15-8 22" fill="none" stroke="#ffb19a" strokeWidth="7" strokeLinecap="round"/></>
    : kind === "banana" ? <><path d="M28 28c-9 41 27 67 66 39-8 38-63 46-77 8-5-14-4-32 11-47Z" fill="#f8c759"/><path d="m28 28 3-10" stroke="#8b6e3c" strokeWidth="7" strokeLinecap="round"/><path d="M28 51c2 25 25 40 48 29" fill="none" stroke="#ffe399" strokeWidth="5" strokeLinecap="round"/></>
    : kind === "orange" ? <><circle cx="59" cy="66" r="39" fill="#eea252"/><path d="M58 29c2-10 7-16 14-18" fill="none" stroke="#8b7c42" strokeWidth="6" strokeLinecap="round"/><path d="M63 25c7-17 25-10 25-10S80 32 63 25Z" fill="#82a774"/><path d="M34 55c-4 5-6 12-5 18" fill="none" stroke="#ffd08a" strokeWidth="6" strokeLinecap="round"/><g fill="#d58b42"><circle cx="77" cy="74" r="2"/><circle cx="84" cy="61" r="1.7"/><circle cx="69" cy="91" r="1.5"/></g></>
    : kind === "pear" ? <><path d="M48 29c12-9 25-1 27 15 2 13 22 23 23 39 2 31-76 31-76 0 0-19 20-28 23-43Z" fill="#b2c876"/><path d="M59 29c-1-10 0-17 6-21" fill="none" stroke="#947147" strokeWidth="6" strokeLinecap="round"/><path d="M63 21c5-15 21-13 21-13S79 26 63 21Z" fill="#7da06e"/><path d="M40 63c-7 8-10 16-6 24" fill="none" stroke="#dbe39e" strokeWidth="6" strokeLinecap="round"/></>
    : kind === "grapes" ? <><path d="M57 30c3-10 8-18 13-21M58 31l-15-9" stroke="#8c9655" strokeWidth="6" strokeLinecap="round"/><path d="M63 27c1-18 25-20 29-14-5 14-17 20-29 14Z" fill="#86a478"/>{[[40,43],[62,40],[80,48],[31,64],[53,61],[76,70],[44,83],[64,89],[53,104]].map(([cx,cy],i)=><g key={i}><circle cx={cx} cy={cy} r="14" fill={["#a68abc","#b39ac7","#947ab2"][i%3]}/><circle cx={cx-4} cy={cy-4} r="3.5" fill="#d4c0e2" opacity=".7"/></g>)}</>
    : kind === "strawberry" ? <><path d="M26 44c19-14 52-16 68 0 20 22-10 48-32 63-22-11-57-41-36-63Z" fill="#e98479"/><path d="m31 39-5-17 20 9 13-22 10 22 24-8-7 18-22 8Z" fill="#8aaf7c"/>{[[38,56],[58,58],[79,53],[45,74],[67,76],[58,94],[83,69]].map(([x,y],i)=><ellipse key={i} cx={x} cy={y} rx="2" ry="3.5" fill="#ffe5a6" transform={"rotate(-15 "+x+" "+y+")"}/>)}</>
    : kind.includes("cup") ? <><path d="M86 47h8c26 0 24 37-2 37H82" fill="none" stroke={color.fill} strokeWidth="11"/><path d="M25 39h63l-6 52c-2 17-48 17-51 0Z" fill={color.fill}/><ellipse cx="56.5" cy="39" rx="31.5" ry="10" fill={color.light}/><path d="m40 57 3 26" stroke="#ffffff70" strokeWidth="6" strokeLinecap="round"/></>
    : <><path d="M20 56h80l-9 43H30Z" fill="#bd9562"/><path d="M35 55c0-45 50-45 50 0" fill="none" stroke="#a27b4f" strokeWidth="8"/><path d="M20 56h80M28 72h66M31 86h61M44 60v34M61 60v35M78 60v34" stroke="#e1bb83" strokeWidth="5" strokeLinecap="round"/></>}
  </svg>;
}

export type BearMood = "idle" | "speaking" | "listening" | "thinking" | "celebrate" | "wave";
export function MimiBear({ mood, speaking }: { mood: BearMood; speaking: boolean }) {
  const source = "/media/mimi-bear-v2.png";
  // Arms sit behind the torso; the scarf stays on the torso as the head moves.
  // This is a browser puppet animation, not generated video or phoneme-aligned lip sync.
  return <div className={"mimi-character mood-" + mood + (speaking ? " mimi-talking" : "")} role="img" aria-label={"小熊米米：" + ({idle:"轻轻摇摆",speaking:"正在说话",listening:"侧耳倾听",thinking:"正在思考",celebrate:"开心庆祝",wave:"挥手打招呼"}[mood])}>
    <div className="mimi-shadow"/>
    <div className="mimi-puppet">
      {/* eslint-disable @next/next/no-img-element */}
      <img className="mimi-layer mimi-body" src={source} alt="" draggable={false}/>
      <img className="mimi-layer mimi-arm-left" src={source} alt="" draggable={false}/>
      <img className="mimi-layer mimi-arm-right" src={source} alt="" draggable={false}/>
      <img className="mimi-layer mimi-scarf" src={source} alt="" draggable={false}/>
      <div className="mimi-head">
        <img className="mimi-layer mimi-head-image" src={source} alt="" draggable={false}/>
        <span className="mimi-eyelid mimi-eye-left"/><span className="mimi-eyelid mimi-eye-right"/>
        <span className="mimi-mouth"><span/></span>
      </div>
    </div>
  </div>;
}
export function Scene({ count, fruit, step, mood, speaking, guide, onReplay, onRepeat }: {
  count: number; fruit: FruitId; step: LessonStep; mood: BearMood; speaking: boolean; guide: { english: string; chinese: string }; onReplay: () => void; onRepeat: () => void;
}) {
  return <div className={"scene picnic-scene-v2 " + (count >= 3 ? "scene-done" : "")}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/media/picnic-background-v2.png" alt="阳光下的森林野餐垫和藤编篮子" className="scene-image" fetchPriority="high"/>
    <MimiBear mood={mood} speaking={speaking}/>
    <div className="scene-top"><span className="scene-label"><i/>MIMI'S PICNIC</span><button className="scene-replay" disabled={mood === "listening" || mood === "thinking"} onClick={onReplay} aria-label="听小熊的故事"><RotateCcw size={15}/>Hello, Mimi!</button></div>
    <button className={"bear-bubble bilingual-bubble " + (speaking ? "bubble-speaking" : "")} disabled={mood === "listening" || mood === "thinking"} onClick={onRepeat} aria-label="再听一遍当前引导">
      <span className="bubble-who"><Volume2 size={12}/> MIMI SAYS</span><strong>{guide.english}</strong><small>{guide.chinese}</small>
    </button>
    {count > 0 ? <div className="packed apple-packed" key={fruit}><ObjectArt kind={fruit}/></div> : null}
    {count > 1 ? <div className="packed cup-packed" key={step.art}><ObjectArt kind={step.category === "color" ? step.art : "basket"}/></div> : null}
    {count >= 3 || mood === "celebrate" ? <div className="scene-confetti" aria-hidden="true">✦ <span>✧</span> ✦</div> : null}
    {mood === "listening" ? <div className="mimi-listening"><span/><span/><span/> I'm listening!</div> : null}
    <div className="scene-caption"><span className="little-leaf">{count >= 3 ? <Sparkles size={16}/> : <Leaf size={16}/>}</span><span><strong>{["Let's pack our picnic!", "One little helper, one happy bear.", "Almost ready! Let's share.", "Our picnic is ready!"][Math.min(count,3)]}</strong><small>{["一起准备野餐", "谢谢你的帮助", "一起分享吧", "野餐准备好啦"][Math.min(count,3)]}</small></span></div>
    <span className="scene-page">STORY 01 <span>/ LITTLE WORDS, BIG ADVENTURES</span></span>
  </div>;
}

