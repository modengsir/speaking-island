"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Mic, RotateCcw, ShieldCheck, X } from "lucide-react";
import type { VoiceEvidence } from "@/lib/lesson";
export function ParentSpace({ open, onClose, configured, authenticated, consent, onConsent, voiceCount, pictureCount, evidence, lastRecording, hasSpeech, onExport, onClear, serviceNote }: {
  open: boolean; onClose: () => void; configured: boolean; authenticated: boolean; consent: boolean; onConsent: (value: boolean) => void;
  voiceCount: number; pictureCount: number; evidence: VoiceEvidence[]; lastRecording: string | null; hasSpeech: boolean; onExport: () => void; onClear: () => void; serviceNote: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <dialog ref={dialog} className="parent-dialog" aria-labelledby="parent-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dialog-header"><span className="eyebrow">FOR PARENTS</span><button className="icon-button" onClick={onClose} aria-label="关闭家长空间"><X size={20}/></button></div>
    <h2 id="parent-title">陪孩子，慢慢开口。</h2><p className="dialog-intro">六种水果、六种颜色。每次只做三个小任务。英语为主，中文只提示词义；先听、再说、再分享。反馈判断表达内容，不提供发音分数。</p>
    <div className={"service-status " + (configured ? "online" : "")}><span className="service-dot"/><div><strong>{configured ? "Ming 在线语音已配置" : "图卡与示范配音可先体验"}</strong><p>{configured ? "密钥仅在服务端。是否可用以实际调用为准。" : "开启识别需要在服务端配置 MING_API_KEY。"}</p></div></div>
    {!authenticated ? <p className="parent-service-note">在线语音尚未开启。请部署者配置服务端家长访问口令，再刷新页面。</p> : null}
    {open && configured && authenticated ? <ConnectionCheck/> : null}
    {serviceNote ? <p className="parent-service-note" role="status">{serviceNote}</p> : null}
    <div className="parent-stats"><div><strong>{voiceCount}</strong><span>语音完成</span></div><div><strong>{pictureCount}</strong><span>图卡帮助</span></div><div><strong>{evidence.length}</strong><span>本次真实识别</span></div></div>
    <div className="parent-section"><h3><ShieldCheck size={17}/>录音与隐私</h3><p>监护人确认后才申请麦克风。录音经本应用代理交由蚂蚁百灵处理，本应用不写入服务器存储。最近录音和识别结果只在当前页面内存中，刷新后清除；第三方保留规则以其政策为准。本机只保存水果、颜色与关卡进度。</p><label className="consent-toggle"><input type="checkbox" checked={consent} onChange={e => onConsent(e.target.checked)}/><span>监护人已了解并允许本次语音练习</span></label></div>
    <div className="parent-section"><h3>真实调用记录</h3>{lastRecording ? <div className="recording-review"><span>最近输入 · 仅本次会话</span><audio controls src={lastRecording}/></div> : null}
      {evidence.length ? <div className="evidence-list">{evidence.slice(-4).reverse().map(e => <div key={e.id}><strong>{e.transcript || "未识别到文字"}</strong><span>{e.verdict === "complete" ? "表达已完成" : "再试一次"} · {(e.timings.totalMs / 1000).toFixed(1)}s（含网络）</span><small>{e.models.asr} → {e.understanding === "unavailable" ? "转写 + 任务规则；理解服务未返回" : e.models.understanding}</small></div>)}</div> : <p>暂无真实识别记录。图卡过关单独记录，不计作语音识别。英文示范配音由 Ming 实际生成并缓存。中文短提示使用浏览器系统语音；浏览器不支持中文语音时保留文字提示。</p>}
      <button className="secondary-button" disabled={!evidence.length && !hasSpeech} onClick={onExport}><Download size={16}/>导出真实测试记录</button>
    </div>
    <details className="technical-notes"><summary>模型与内容边界</summary><p>ASR：Ming-3.0-asr-tiny<br/>理解：Ming-3.0-audio-flash<br/>合成：Ming-3.0-tts<br/>官方服务端代理：api.ant-ling.com</p><p>理解服务不可用时，用真实转写配合固定任务规则，导出记录会标记 asr_rules。颜色任务接受颜色词或“颜色 + cup”；分享任务需要水果与 please。梨的任务接受 pear / pair 的同音转写，也允许同一句正确表达重复跟读。内容匹配不代表发音准确率。</p><p>小熊是浏览器分层角色动画；说话动作随音频播放启停，不是音素口型同步。</p></details>
    <button className="text-button clear-button" onClick={onClear}><RotateCcw size={15}/>清除本机所有进度与本次记录</button>
  </dialog>;
}
function ConnectionCheck() {
  const [checking, setChecking] = useState(false), [result, setResult] = useState<VoiceEvidence | null>(null), [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function check() {
    const abort = new AbortController(); controller.current = abort; setChecking(true); setResult(null); setError("");
    try {
      const sample = await fetch("/media/connection-check-pear.wav", { signal: abort.signal });
      if (!sample.ok) throw new Error("检测音频未加载，请刷新后再试。");
      const form = new FormData(); form.set("audio", await sample.blob(), "connection-check.wav"); form.set("step", "please-pear"); form.set("consent", "yes");
      const response = await fetch("/api/voice/listen", { method: "POST", body: form, signal: abort.signal });
      const data = await response.json() as VoiceEvidence & { error?: string };
      if (!response.ok) throw new Error(data.error || "语音连接检测失败。");
      if (!abort.signal.aborted) setResult(data as VoiceEvidence);
    } catch (cause) { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "语音连接检测失败。"); }
    finally { if (!abort.signal.aborted) setChecking(false); }
  }
  return <div className="connection-check"><strong>语音连接检测</strong><p>使用固定示例 “A pear, please.”，不打开麦克风，不计入孩子的练习成绩。</p><button className="secondary-button" disabled={checking} onClick={() => { void check(); }}>{checking ? "正在检测…" : "用示例音频检测连接"}</button>
    <div role="status" aria-live="polite">{error ? <p>{error}</p> : result ? <><p><strong>识别 API 已连通</strong><br/>实际转写：{result.transcript || "（空）"}<br/>示例任务：{result.verdict === "complete" ? "通过" : "未通过"}<br/>理解模型：{result.understanding === "unavailable" ? "暂未返回，使用转写规则" : "已返回"}<br/>用时：{(result.timings.totalMs / 1000).toFixed(1)} 秒（含网络）</p></> : null}</div>
  </div>;
}
export function ConsentDialog({ open, onAgree, onPicture, onClose }: { open: boolean; onAgree: () => void; onPicture: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <dialog ref={dialog} className="consent-dialog" aria-labelledby="consent-title" onCancel={onClose}><span className="consent-icon"><Mic size={26}/></span><h2 id="consent-title">请家长帮忙开启语音</h2><p>一小段录音会发送给蚂蚁百灵，用于识别英语和理解任务。本应用不保存录音到服务器。最近录音只保留在当前页面，刷新清除；第三方保留规则以其政策为准。</p><div className="consent-actions"><button className="primary-button" onClick={onAgree}>我是监护人，同意本次练习</button><button className="text-button" onClick={onPicture}>先玩图卡</button></div></dialog>;
}

