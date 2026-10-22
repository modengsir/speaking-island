"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, CircleHelp, Leaf, Mic, RotateCcw, Settings2, Sparkles, Square, Volume2, VolumeX } from "lucide-react";
import { COLORS, FRUITS, SPEECH, chineseHint, colorById, createSteps, fruitById, getTask, type ColorId, type FruitId, type SpeechId, type VoiceEvidence } from "@/lib/lesson";
import { ObjectArt, Scene, type BearMood } from "@/components/picnic-art";
import { ConsentDialog, ParentSpace } from "@/components/parent-space";
import type { Capture } from "@/lib/recorder";
type Completion = { method: "voice" | "picture"; at: string };
type Progress = Record<string, Completion[]>;
type Phase = "ready" | "requesting" | "recording" | "thinking" | "success";
type Feedback = { english: string; chinese: string };
const STORAGE = "speaking-island:progress:v2";
const EMPTY: Completion[] = [];
const commonGuide: Record<string, Feedback> = {
  intro: { english: "Hello, little friend! Let's have a picnic!", chinese: "你好，一起准备野餐" },
  complete: { english: "Great job! You helped me!", chinese: "真棒，谢谢你" },
  retry: { english: "Listen. Let's try together!", chinese: "听一听，再试试" },
  unheard: { english: "I couldn't hear you. Try again!", chinese: "靠近一点，再说一次" },
  finish: { english: "Hooray! Our picnic is ready!", chinese: "野餐准备好啦" },
};
function validCompletions(value: unknown): value is Completion[] {
  return Array.isArray(value) && value.length <= 3 && value.every(v => v && ["voice", "picture"].includes(v.method) && typeof v.at === "string");
}
function guidance(phrase: SpeechId): Feedback {
  if (commonGuide[phrase]) return commonGuide[phrase];
  const task = getTask(phrase.startsWith("word-") ? phrase.replace("word-", "fruit-") : phrase);
  return task ? { english: task.guide, chinese: task.chinese + " · 跟着说" } : commonGuide.intro;
}
function choiceName(kind: string) {
  if (kind.startsWith("share-")) return fruitById(kind.slice(6) as FruitId).english;
  return FRUITS.find(f => f.id === kind)?.english ?? (COLORS.find(c => kind === c.id + "-cup")?.english + " cup");
}
export default function Home() {
  const [fruitId, setFruitId] = useState<FruitId>("apple"), [colorId, setColorId] = useState<ColorId>("blue");
  const [progress, setProgress] = useState<Progress>({}), [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<{ configured: boolean; authenticated: boolean } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready"), [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null), [spokenPhrase, setSpokenPhrase] = useState<SpeechId | null>(null);
  const [parentOpen, setParentOpen] = useState(false), [consentOpen, setConsentOpen] = useState(false), [consent, setConsent] = useState(false);
  const [muted, setMuted] = useState(false), [speaking, setSpeaking] = useState(false), [greeting, setGreeting] = useState(false);
  const [seconds, setSeconds] = useState(0), [pictureHint, setPictureHint] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [evidence, setEvidence] = useState<VoiceEvidence[]>([]), [lastRecording, setLastRecording] = useState<string | null>(null);
  const [ttsPhrases, setTtsPhrases] = useState<SpeechId[]>([]), [serviceNote, setServiceNote] = useState("");
  const capture = useRef<Capture | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null), waveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const operation = useRef(0), recordEpoch = useRef(0), speechEpoch = useRef(0), mounted = useRef(true);
  const controller = useRef<AbortController | null>(null), speechController = useRef<AbortController | null>(null), audio = useRef<HTMLAudioElement | null>(null);
  const endPlayback = useRef<(() => void) | null>(null);
  const speechCache = useRef(new Map<SpeechId, string>()), recordingUrl = useRef<string | null>(null);
  const fruit = fruitById(fruitId), color = colorById(colorId), steps = createSteps(fruitId, colorId), roundKey = fruitId + "/" + colorId;
  const completed = progress[roundKey] ?? EMPTY, active = completed.length, done = active >= 3, step = steps[Math.min(active, 2)];
  const allCompleted = Object.values(progress).flat(), busy = ["requesting", "recording", "thinking"].includes(phase);
  const guide = spokenPhrase ? guidance(spokenPhrase) : { english: done ? commonGuide.finish.english : step.guide, chinese: done ? commonGuide.finish.chinese : step.chinese };
  const mood: BearMood = phase === "success" || done ? "celebrate" : greeting ? "wave" : phase === "recording" ? "listening" : phase === "thinking" || phase === "requesting" ? "thinking" : speaking ? "speaking" : "idle";
  useEffect(() => {
    mounted.current = true;
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    const abort = new AbortController();
    fetch("/api/voice/status", { signal: abort.signal }).then(async r => { if (!r.ok) throw new Error(); const d = await r.json() as { configured?: boolean; authenticated?: boolean }; if (mounted.current) setStatus({ configured: d.configured === true, authenticated: d.authenticated === true }); }).catch(() => { if (!abort.signal.aborted) { setStatus({ configured: false, authenticated: false }); setServiceNote("语音连接检查失败，固定示范配音和图卡仍可使用。"); } });
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null");
      if (saved?.version === 2) {
        if (FRUITS.some(f => f.id === saved.fruit)) setFruitId(saved.fruit);
        if (COLORS.some(c => c.id === saved.color)) setColorId(saved.color);
        const restored: Progress = {};
        for (const f of FRUITS) for (const c of COLORS) { const k = f.id + "/" + c.id; if (validCompletions(saved.rounds?.[k])) restored[k] = saved.rounds[k]; }
        setProgress(restored);
      } else {
        const legacy = JSON.parse(localStorage.getItem("speaking-island:progress:v1") ?? "null");
        if (legacy?.version === 1 && validCompletions(legacy.completed)) setProgress({ "apple/blue": legacy.completed });
      }
    } catch { /* Practice still works without local storage. */ }
    setLoaded(true);
    return () => {
      mounted.current = false; abort.abort(); controller.current?.abort(); speechController.current?.abort();
      operation.current++; recordEpoch.current++; speechEpoch.current++; capture.current?.cancel();
      if (timer.current) clearTimeout(timer.current); if (waveTimer.current) clearTimeout(waveTimer.current);
      audio.current?.pause(); endPlayback.current?.(); if ("speechSynthesis" in window) window.speechSynthesis.cancel(); speechCache.current.forEach(URL.revokeObjectURL); speechCache.current.clear();
      if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
    };
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(STORAGE, JSON.stringify({ version: 2, fruit: fruitId, color: colorId, rounds: progress })); } catch {} } }, [loaded, fruitId, colorId, progress]);
  useEffect(() => { if (phase !== "recording") return; const interval = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(interval); }, [phase]);
  function silence() { speechEpoch.current++; speechController.current?.abort(); audio.current?.pause(); endPlayback.current?.(); endPlayback.current = null; if ("speechSynthesis" in window) window.speechSynthesis.cancel(); setSpeaking(false); }
  function cancelActivity() {
    operation.current++; recordEpoch.current++; controller.current?.abort(); capture.current?.cancel(); capture.current = null;
    if (timer.current) clearTimeout(timer.current); if (waveTimer.current) clearTimeout(waveTimer.current);
    silence(); setGreeting(false); setPhase("ready"); setAttempts(0); setPictureHint(false); setFeedback(null); setSpokenPhrase(null);
  }
  async function speak(phrase: SpeechId) {
    silence(); setSpokenPhrase(phrase);
    if (muted) return;
    const epoch = speechEpoch.current, abort = new AbortController(); speechController.current = abort;
    try {
      let url = speechCache.current.get(phrase);
      if (!url) {
        let response = await fetch("/media/voice/v2/" + phrase + ".mp3", { signal: abort.signal });
        if (!response.ok) response = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phrase }), signal: abort.signal });
        if (!response.ok) { const error = await response.json() as { error?: string }; throw new Error(error.error || "配音暂时没有连上。"); }
        url = URL.createObjectURL(await response.blob());
        if (!mounted.current || epoch !== speechEpoch.current) { URL.revokeObjectURL(url); return; }
        speechCache.current.set(phrase, url); setTtsPhrases(p => p.includes(phrase) ? p : [...p, phrase]);
      }
      if (epoch !== speechEpoch.current || !mounted.current) return;
      const playEnglish = async () => {
        if (epoch !== speechEpoch.current || !mounted.current) return;
        const voice = new Audio(url); voice.playbackRate = 0.9; audio.current = voice;
        await new Promise<void>((resolve, reject) => {
          const finish = () => { if (endPlayback.current === finish) endPlayback.current = null; resolve(); };
          endPlayback.current = finish;
          voice.onplaying = () => { if (mounted.current && epoch === speechEpoch.current) setSpeaking(true); };
          voice.onended = () => { if (mounted.current && epoch === speechEpoch.current) setSpeaking(false); finish(); };
          voice.onerror = () => { finish(); reject(new Error("配音播放失败，请再点一次单词。")); };
          void voice.play().catch(error => { finish(); reject(error); });
        });
      };
      await playEnglish();
      // A brief system Mandarin hint sits between two genuine Ming English demonstrations.
      // If the browser lacks Mandarin, the same short hint remains visible on screen.
      const hint = chineseHint(phrase);
      if (hint && "speechSynthesis" in window && epoch === speechEpoch.current && mounted.current) {
        await new Promise<void>(resolve => {
          const utterance = new SpeechSynthesisUtterance(hint);
          utterance.lang = "zh-CN"; utterance.rate = 0.85;
          const chineseVoice = window.speechSynthesis.getVoices().find(v => /^zh[-_](CN|Hans)/i.test(v.lang)) ?? window.speechSynthesis.getVoices().find(v => /^zh[-_](TW|Hant)/i.test(v.lang));
          if (!chineseVoice) { resolve(); return; }
          utterance.voice = chineseVoice;
          const timeout = setTimeout(() => { window.speechSynthesis.cancel(); finish(); }, 5000);
          const finish = () => { clearTimeout(timeout); if (endPlayback.current === finish) endPlayback.current = null; if (mounted.current && epoch === speechEpoch.current) setSpeaking(false); resolve(); };
          endPlayback.current = finish;
          utterance.onstart = () => { if (mounted.current && epoch === speechEpoch.current) setSpeaking(true); };
          utterance.onend = finish; utterance.onerror = finish;
          window.speechSynthesis.speak(utterance);
        });
        await playEnglish();
      }
    } catch (error) { if (mounted.current && epoch === speechEpoch.current && !abort.signal.aborted) { setSpeaking(false); setServiceNote(error instanceof Error ? error.message : "配音暂时没有连上。"); setFeedback({ english: "Tap the word. Let's listen!", chinese: "点一下单词，再听听" }); } }
  }
  function pickFruit(id: FruitId) {
    if (busy) return;
    cancelActivity(); setFruitId(id);
    void speak(("word-" + id) as SpeechId);
  }
  function pickColor(id: ColorId) { if (busy) return; cancelActivity(); setColorId(id); }
  function hello() {
    if (busy) return; silence(); setGreeting(true); if (waveTimer.current) clearTimeout(waveTimer.current);
    void speak("intro"); waveTimer.current = setTimeout(() => setGreeting(false), 4500);
  }
  function markComplete(method: Completion["method"]) {
    if (done || phase === "success") return;
    silence(); setPhase("success"); setFeedback({ english: method === "voice" ? "You said it! Great job!" : "You found it! Let's say it, too.", chinese: method === "voice" ? "小熊听懂啦" : "找对啦，也试着说一说" });
    setProgress(p => ({ ...p, [roundKey]: [...(p[roundKey] ?? []), { method, at: new Date().toISOString() }].slice(0, 3) }));
    void speak(active === 2 ? "finish" : "complete");
  }
  function continueLesson() { cancelActivity(); if (steps[active]) void speak(steps[active].speech); }
  function resetRound() { cancelActivity(); setProgress(p => ({ ...p, [roundKey]: [] })); void speak(steps[0].speech); }
  function choose(kind: string) {
    if (busy || phase === "success" || done) return;
    const correct = step.category === "fruit" ? kind === fruitId : step.category === "color" ? kind === colorId + "-cup" : kind === "share-" + fruitId;
    if (correct) markComplete("picture");
    else { setFeedback({ english: choiceName(kind) + "! Look for " + step.english.toLowerCase() + ".", chinese: "再找找看" }); void speak(step.speech); }
  }
  async function startRecording() {
    if (busy || done || phase === "success") return;
    if (!status?.configured || !status.authenticated) { setParentOpen(true); return; }
    if (!consent) { setConsentOpen(true); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setFeedback({ english: "Let's try a picture!", chinese: "请家长检查麦克风" }); setPictureHint(true); return; }
    silence(); setGreeting(false); setFeedback(null); setPhase("requesting"); setSpokenPhrase(null);
    const epoch = ++recordEpoch.current;
    try {
      const { captureVoice } = await import("@/lib/recorder"), recorder = await captureVoice();
      if (!mounted.current || epoch !== recordEpoch.current) { recorder.cancel(); return; }
      capture.current = recorder; setSeconds(0); setPhase("recording");
      timer.current = setTimeout(() => { void finishRecording(); }, 8000);
    } catch { if (mounted.current && epoch === recordEpoch.current) { setPhase("ready"); setFeedback({ english: "A picture can help, too!", chinese: "请家长打开麦克风，或先用图卡" }); setPictureHint(true); } }
  }
  async function finishRecording() {
    const recorder = capture.current; if (!recorder) return;
    capture.current = null; if (timer.current) clearTimeout(timer.current);
    const epoch = ++operation.current; setPhase("thinking");
    try {
      const blob = await recorder.stop();
      if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
      recordingUrl.current = URL.createObjectURL(blob); setLastRecording(recordingUrl.current);
      const form = new FormData(); form.set("audio", blob, "speech.wav"); form.set("step", step.id); form.set("consent", "yes");
      const abort = new AbortController(); controller.current = abort;
      const response = await fetch("/api/voice/listen", { method: "POST", body: form, signal: abort.signal }), data = await response.json();
      if (!mounted.current || epoch !== operation.current) return;
      if (!response.ok) throw new Error((data as { error?: string }).error || "语音暂时没连上。");
      const result = data as VoiceEvidence; setEvidence(e => [...e, result].slice(-30));
      setServiceNote("");
      if (result.understanding === "unavailable") setServiceNote("本次用真实 ASR 转写和固定任务规则判断内容；audio-flash 未成功返回，未计为理解模型成功。");
      if (result.verdict === "complete") markComplete("voice");
      else {
        setPhase("ready"); const next = attempts + 1; setAttempts(next); if (next >= 2) setPictureHint(true);
        setFeedback(result.verdict === "unheard" ? { english: "A little louder. Let's try again!", chinese: "靠近一点，再说一次" } : { english: "Let's say it together!", chinese: "听一听，再试试" });
        void speak(result.verdict === "unheard" ? "unheard" : step.speech);
      }
    } catch (error) { if (mounted.current && epoch === operation.current) { setPhase("ready"); setFeedback({ english: "Let's use a picture for now.", chinese: "语音暂未连上，先用图卡" }); setServiceNote(error instanceof Error ? error.message : "语音暂时没连上。"); } }
  }
  function clearData() {
    cancelActivity(); setProgress({}); setEvidence([]); setTtsPhrases([]); setConsent(false); setServiceNote("本机所有进度与本次记录已清除。");
    if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current); recordingUrl.current = null; setLastRecording(null);
    try { localStorage.removeItem("speaking-island:progress:v1"); localStorage.removeItem(STORAGE); } catch {}
  }
  function exportEvidence() {
    const data = { application: "开口小岛 · 水果与颜色", version: 2, at: new Date().toISOString(), note: "真实 API 结果；英文固定示范配音由 Ming 生成并缓存；中文短提示使用浏览器系统语音，不计为 Ming 输出。用时包含网络。图卡不计为语音完成；不提供发音分数。", voice: evidence, synthesized: ttsPhrases.map(id => ({ model: "Ming-3.0-tts", text: SPEECH[id], phrase: id })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "picnic-ming-real-results.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="island-app">
    <header className="site-header"><a className="brand" href="/" aria-label="开口小岛首页"><span className="brand-mark" aria-hidden="true"><Leaf size={25} strokeWidth={2.2}/><span/></span><span className="brand-copy"><span className="brand-name"><span>开</span><span>口</span><span>小</span><span>岛</span><Leaf className="brand-leaf" size={17} aria-hidden="true"/><Sparkles className="brand-star" size={20} aria-hidden="true"/></span><small>跟小熊做任务，<br className="brand-tagline-break"/>开口说英语</small></span></a><nav aria-label="学习导航"><span className="header-tag">Little words. A little courage.</span><button className="icon-button" aria-label={muted ? "开启声音" : "关闭声音"} onClick={() => { if (!muted) silence(); setMuted(m => !m); }}>{muted ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button><button className="parent-button" onClick={() => setParentOpen(true)}><Settings2 size={17}/><span>家长空间</span></button></nav></header>
    <main className="main-wrap">
      <div className="chapter-bar"><span className="chapter-path"><span className="path-dot"/>Story 01<ChevronRight size={13}/>小熊的野餐</span><span className="age-tag">4–8 岁<span>·</span>3 little tasks</span></div>
      <div className="lesson-heading"><div><div className="eyebrow">MIMI'S LITTLE PICNIC <span>✦</span></div><h1>Let's have a picnic!<small>小熊的野餐</small></h1><p>Pick a fruit. Find a color. Say a little English.</p></div><div className="adventure-stamp"><Sparkles size={16}/><span>A little<br/><strong>braver today</strong></span></div></div>
      <div className="round-summary"><div><ObjectArt kind={fruitId}/><strong>{fruit.english}</strong><span className="summary-plus">+</span><i style={{ background: color.fill }}/><strong>{color.english}</strong><small>6 fruits · 6 colors</small></div><button onClick={() => setPickerOpen(v => !v)} aria-controls="picnic-picker" aria-expanded={pickerOpen}>{pickerOpen ? "Let's play!" : "Change"}<small>{pickerOpen ? "开始玩" : "换一换"}</small><ChevronRight size={14} className={pickerOpen ? "rotate" : ""}/></button></div>
      <section id="picnic-picker" className={"picnic-picker " + (pickerOpen ? "picker-open" : "picker-closed")} aria-label="选择水果和颜色">
        <div className="fruit-picker"><div className="picker-label"><span>① Choose a fruit</span><small>选一种水果</small></div><div className="fruit-options">{FRUITS.map(f => {
          const collected = Object.entries(progress).some(([key, value]) => key.startsWith(f.id + "/") && value.length === 3);
          return <button key={f.id} className={"fruit-option " + (fruitId === f.id ? "selected" : "")} aria-pressed={fruitId === f.id} aria-label={"选择水果 " + f.english + " " + f.chinese} onClick={() => pickFruit(f.id)} disabled={busy}><ObjectArt kind={f.id}/><strong>{f.english}</strong><small>{f.chinese}</small>{collected ? <span className="fruit-collected"><Check size={10}/></span> : null}</button>;
        })}</div></div>
        <div className="color-picker"><div className="picker-label"><span>② Pick a color</span><small>再选个颜色</small></div><div className="color-options">{COLORS.map(c => <button key={c.id} className={colorId === c.id ? "selected" : ""} aria-pressed={colorId === c.id} aria-label={"选择颜色 " + c.english + " " + c.chinese} onClick={() => pickColor(c.id)} disabled={busy}><span className="color-swatch" style={{ background: c.fill }}>{colorId === c.id ? <Check size={14}/> : null}</span><span>{c.english}</span></button>)}</div><p>One fruit + one color. One tiny adventure.<small>每次只练三小步</small></p></div>
      </section>
      <div className="adventure-layout">
        <section className="story-section" aria-label="野餐故事场景"><Scene count={active} fruit={fruitId} step={steps[1]} mood={mood} speaking={speaking} guide={guide} onReplay={hello} onRepeat={() => { if (!busy) void speak(spokenPhrase ?? (done ? "finish" : step.speech)); }}/><div className="story-footnote"><span><span className="footnote-dot"/>Your friend Mimi is here.</span><span>Listen first. Then it's your turn.</span></div></section>
        <section className="task-panel" aria-label="当前英语任务">
          <div className="task-progress"><span>PICNIC CHECKLIST</span><strong>{active}<em> / 3</em></strong></div><div className="progress-trail" aria-label={"已完成 " + active + " 个任务，共 3 个"}>{steps.map((s, i) => <div className={"trail-step " + (i < active ? "complete" : i === active ? "current" : "")} key={s.id}><span>{i < active ? <Check size={13}/> : i + 1}</span><i/></div>)}</div>
          {done ? <div className="finish-card"><span className="finish-medal">✦</span><span className="task-kicker">PICNIC READY!</span><h2>We did it!</h2><p>Thank you, my little helper!<small>谢谢你，小小野餐家</small></p><div className="learned-words"><span>{fruit.english.toLowerCase()}</span><span>{color.english.toLowerCase()}</span><span>please</span></div><button className="primary-button" onClick={() => pickFruit(FRUITS[(FRUITS.indexOf(fruit) + 1) % FRUITS.length].id)}>Try another fruit<ArrowRight size={18}/></button><button className="text-button" onClick={resetRound}><RotateCcw size={13}/>Play again · 再玩一次</button><p className="finish-note">{completed.filter(c => c.method === "voice").length} 次语音完成 · {completed.filter(c => c.method === "picture").length} 次图卡帮助</p></div>
          : phase === "success" ? <div className="step-success"><span className="success-check"><Check size={30}/></span><span className="task-kicker">A LITTLE WIN</span><h2>Great job!</h2><p>{feedback?.english}<small>{feedback?.chinese}</small></p><button className="primary-button" onClick={continueLesson}>What's next?<ArrowRight size={19}/></button></div>
          : <><div className="task-kicker">STEP {step.number}<span>· {step.category === "please" ? "A little sentence" : "A little word"}</span></div><h2 className="english-task-title">{step.title}</h2><p className="task-subtitle">{step.subtitle}</p>
            <button className={"word-card " + (speaking ? "word-speaking" : "")} onClick={() => void speak(step.speech)} disabled={busy} aria-label={"听小熊中英示范：" + step.english}><ObjectArt kind={step.art} className="word-art"/><span><strong className={step.category === "please" ? "phrase-word" : ""}>{step.english}</strong><small>{step.chinese}</small></span><span className="word-sound"><Volume2 size={19}/></span></button>
            <div className="try-label"><span/>YOUR TURN<span/></div><p className="speak-hint">{phase === "requesting" ? "One little moment…" : phase === "recording" ? "I'm listening! " + Math.min(seconds, 8) + " / 8s" : phase === "thinking" ? "Let me listen…" : step.hint}<small>{phase === "recording" ? "说完再点一下" : step.hintChinese}</small></p>
            <button className={"record-button " + (phase === "recording" ? "recording" : phase === "thinking" ? "thinking" : "")} disabled={phase === "requesting" || phase === "thinking" || status === null} onClick={() => phase === "recording" ? void finishRecording() : void startRecording()} aria-label={phase === "recording" ? "说完了，结束录音" : "点一下，和小熊说英语"}>{phase === "recording" ? <Square size={21} fill="currentColor"/> : phase === "thinking" ? <span className="thinking-dots"><i/><i/><i/></span> : <Mic size={24}/>}<span>{phase === "recording" ? "I'm done!" : phase === "thinking" ? "Listening…" : "Your turn!"}<small>{phase === "recording" ? "说完啦" : phase === "thinking" ? "小熊在听" : "开口说"}</small></span></button>
            <div className="record-note">{status?.configured ? "Tap to start. Tap again to finish. · 最长 8 秒" : "Listen and play with picture cards first."}</div>
            {feedback ? <div className="feedback visible bilingual-feedback" role="status" aria-live="polite"><strong>{feedback.english}</strong><small>{feedback.chinese}</small></div> : null}
            <button className="picture-help" onClick={() => setPictureHint(h => !h)} aria-expanded={pictureHint}><CircleHelp size={15}/>{attempts >= 2 ? "A picture can help!" : "Need a little help?"}<small>图卡帮忙</small><ChevronRight size={14} className={pictureHint ? "rotate" : ""}/></button>
            {pictureHint ? <div className="picture-choices">{step.choices.map(choice => <button key={choice} disabled={busy} onClick={() => choose(choice)} aria-label={choice.startsWith("share-") ? "用图卡练习 " + step.english : "选择图卡 " + choiceName(choice)}><ObjectArt kind={choice.startsWith("share-") ? fruitId : choice}/>{choice.startsWith("share-") ? <span>{step.english}</span> : <span className="choice-word">{choiceName(choice)}</span>}</button>)}<small>图卡帮助单独记录，不计为语音完成。</small></div> : null}
          </>}
          <div className="task-panel-bottom"><Leaf size={13}/>Little tries make big smiles.</div>
        </section>
      </div>
      <section className="journey-strip" aria-label="本关学习路线"><div className="journey-intro"><span>Little things you learned</span><p>把英语，放进生活里。</p></div>{steps.map((s,i) => <div className={"journey-item " + (i < active ? "collected" : "")} key={s.id}><span className="journey-art"><ObjectArt kind={s.art}/></span><span><strong>{["A fruit","A color","A kind request"][i]}</strong><small>{s.english}</small></span><span className="journey-check">{i < active ? <Check size={14}/> : <span>0{i+1}</span>}</span></div>)}</section>
    </main>
    <footer className="site-footer"><span>开口小岛 <i>✦</i> 跟小熊做任务，开口说英语。</span><span>Listen. Try. Smile. · 和家长一起玩</span></footer>
    <ParentSpace open={parentOpen} onClose={() => setParentOpen(false)} configured={status?.configured ?? false} authenticated={status?.authenticated ?? false} consent={consent} onConsent={value => { setConsent(value); if (!value && busy) cancelActivity(); }} voiceCount={allCompleted.filter(c => c.method === "voice").length} pictureCount={allCompleted.filter(c => c.method === "picture").length} evidence={evidence} lastRecording={lastRecording} hasSpeech={ttsPhrases.length > 0} onExport={exportEvidence} onClear={clearData} serviceNote={serviceNote}/>
    <ConsentDialog open={consentOpen} onClose={() => setConsentOpen(false)} onAgree={() => { setConsent(true); setConsentOpen(false); setFeedback({ english: "Ready! Tap the microphone.", chinese: "已开启，再点麦克风开始" }); }} onPicture={() => { setConsentOpen(false); setPictureHint(true); }}/>
  </div>;
}

