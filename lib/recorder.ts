export type Capture = { stop: () => Promise<Blob>; cancel: () => void };
// PCM WAV avoids sending browser-specific webm/opus to the provider's wav/mp3 endpoint.
export async function captureVoice(): Promise<Capture> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
  let context: AudioContext;
  try { context = new AudioContext(); await context.resume(); } catch (error) { stream.getTracks().forEach(t => t.stop()); throw error; }
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const mute = context.createGain(); mute.gain.value = 0;
  const chunks: Float32Array[] = []; let length = 0, closed = false;
  processor.onaudioprocess = e => {
    if (closed || length > context.sampleRate * 8.1) return;
    const samples = e.inputBuffer.getChannelData(0).slice(); chunks.push(samples); length += samples.length;
  };
  source.connect(processor); processor.connect(mute); mute.connect(context.destination);
  const cleanup = () => { closed = true; processor.disconnect(); source.disconnect(); mute.disconnect(); stream.getTracks().forEach(t => t.stop()); void context.close(); };
  return {
    cancel() { if (!closed) cleanup(); },
    async stop() {
      if (closed) throw new Error("Recording ended");
      const rate = context.sampleRate; cleanup();
      const all = new Float32Array(length); let offset = 0;
      for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
      return encodeWav(all, rate);
    },
  };
}
export function encodeWav(input: Float32Array, sampleRate: number): Blob {
  const rate = 16000, count = Math.min(Math.floor(input.length * rate / sampleRate), rate * 8);
  const data = new ArrayBuffer(44 + count * 2), view = new DataView(data);
  const write = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  write(0, "RIFF"); view.setUint32(4, 36 + count * 2, true); write(8, "WAVEfmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * sampleRate / rate), end = Math.max(start + 1, Math.floor((i + 1) * sampleRate / rate));
    let sum = 0; for (let j = start; j < end && j < input.length; j++) sum += input[j];
    const s = Math.max(-1, Math.min(1, sum / (end - start))); view.setInt16(44 + i * 2, s * (s < 0 ? 32768 : 32767), true);
  }
  return new Blob([data], { type: "audio/wav" });
}
