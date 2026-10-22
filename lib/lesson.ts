export const FRUITS = [
  { id: "apple", english: "Apple", chinese: "苹果", article: "an apple", plural: "apples", color: "blue" },
  { id: "banana", english: "Banana", chinese: "香蕉", article: "a banana", plural: "bananas", color: "yellow" },
  { id: "orange", english: "Orange", chinese: "橙子", article: "an orange", plural: "oranges", color: "orange" },
  { id: "pear", english: "Pear", chinese: "梨", article: "a pear", plural: "pears", color: "green" },
  { id: "grapes", english: "Grapes", chinese: "葡萄", article: "some grapes", plural: "grapes", color: "purple" },
  { id: "strawberry", english: "Strawberry", chinese: "草莓", article: "a strawberry", plural: "strawberries", color: "red" },
] as const;
export const COLORS = [
  { id: "red", english: "Red", chinese: "红色", fill: "#e48072", light: "#f7c1b1" },
  { id: "yellow", english: "Yellow", chinese: "黄色", fill: "#e8bc5f", light: "#f8e3a6" },
  { id: "orange", english: "Orange", chinese: "橙色", fill: "#e4a264", light: "#f5d1a7" },
  { id: "green", english: "Green", chinese: "绿色", fill: "#8bae80", light: "#d3e1b9" },
  { id: "purple", english: "Purple", chinese: "紫色", fill: "#aa92c0", light: "#dfcdea" },
  { id: "blue", english: "Blue", chinese: "蓝色", fill: "#8ebecb", light: "#c7e4e8" },
] as const;
export type FruitId = typeof FRUITS[number]["id"];
export type ColorId = typeof COLORS[number]["id"];
export type StepId = `fruit-${FruitId}` | `color-${ColorId}` | `please-${FruitId}`;
export type Verdict = "complete" | "retry" | "unheard";
export type SpeechId = "intro" | "complete" | "retry" | "unheard" | "finish" | `word-${FruitId}` | `color-${ColorId}` | `please-${FruitId}`;
export type LessonStep = {
  id: StepId; number: string; category: "fruit" | "color" | "please"; title: string; subtitle: string;
  english: string; chinese: string; hint: string; hintChinese: string; speech: SpeechId; art: string;
  choices: string[]; target: string; guide: string; criteria: string;
};
export function fruitById(id: FruitId) { return FRUITS.find(f => f.id === id)!; }
export function colorById(id: ColorId) { return COLORS.find(c => c.id === id)!; }

export function createSteps(fruitId: FruitId, colorId: ColorId): LessonStep[] {
  const fruit = fruitById(fruitId), color = colorById(colorId), word = fruit.id;
  const share = fruit.article[0].toUpperCase() + fruit.article.slice(1) + ", please.";
  const repetition = " Accept up to four repetitions of the same correct utterance; repetition is not an error.";
  const homophone = word === "pear" ? " Pear and pair are homophones. In this spoken fruit task, treat pair/pairs spellings as pear/pears; do not reject correct speech because of ASR spelling." : "";
  const choices = [word, ...FRUITS.filter(f => f.id !== word).slice(0, 2).map(f => f.id)];
  const colorChoices = [color.id, ...COLORS.filter(c => c.id !== color.id).slice(0, 2).map(c => c.id)];
  // Rotate the answer's position so children must identify the object, not a fixed button.
  const rotate = (items: string[], n: number) => [...items.slice(n), ...items.slice(0, n)];
  const steps: LessonStep[] = [
    { id: ("fruit-" + word) as StepId, number: "01", category: "fruit", title: "Pack " + fruit.article, subtitle: "装上" + fruit.chinese, english: fruit.english, chinese: fruit.chinese, hint: "Listen. Say " + word + "!", hintChinese: "听一听，跟着说", speech: ("word-" + word) as SpeechId, art: word, choices: rotate(choices, FRUITS.indexOf(fruit) % 3), target: word, guide: fruit.english + "! Can you say " + word + "?", criteria: "Accept the fruit word alone, its plural, or a short positive request for this fruit. Do not infer any missing word." },
    { id: ("color-" + color.id) as StepId, number: "02", category: "color", title: "Find the " + color.id + " cup", subtitle: "找到" + color.chinese + "的杯子", english: color.english, chinese: color.chinese, hint: "Say " + color.id + ". A " + color.id + " cup!", hintChinese: "说颜色，找到小杯子", speech: ("color-" + color.id) as SpeechId, art: color.id + "-cup", choices: rotate(colorChoices.map(c => c + "-cup"), COLORS.indexOf(color) % 3), target: color.id, guide: color.english + "! A " + color.id + " cup.", criteria: "This is a color vocabulary task. Accept the color word alone OR the color plus cup. Reject a different color." },
    { id: ("please-" + word) as StepId, number: "03", category: "please", title: "Let's share!", subtitle: "礼貌地分享", english: share, chinese: "请给我" + fruit.chinese, hint: "Your turn! " + share, hintChinese: "加上 please，礼貌地说", speech: ("please-" + word) as SpeechId, art: word, choices: ["share-" + word], target: word, guide: share, criteria: "Require this fruit AND the word please in a short positive request. Reject negations or different fruits." },
  ];
  return steps.map(step => ({ ...step, criteria: step.criteria + repetition + (step.category === "color" ? "" : homophone) }));
}
export function getTask(id: string): LessonStep | undefined {
  const legacy: Record<string, string> = { apple: "fruit-apple", cup: "color-blue", please: "please-apple" };
  const resolved = legacy[id] ?? id;
  for (const f of FRUITS) {
    const found = createSteps(f.id, f.color).find(s => s.id === resolved);
    if (found) return found;
  }
  for (const c of COLORS) {
    const found = createSteps("apple", c.id).find(s => s.id === resolved);
    if (found) return found;
  }
}
export const STEPS = createSteps("apple", "blue");
// Keep each Ming request in English: mixing languages degraded the Mandarin hints in API tests.
export const SPEECH = Object.freeze({
  intro: "Hello, little friend! Let's have a picnic. Can you help me?",
  complete: "Great job! You helped me. Thank you, my friend!",
  retry: "Let's listen again. Listen, and say it with me!",
  unheard: "I couldn't hear you. Let's try again!",
  finish: "Hooray! Our picnic is ready! You're a wonderful helper!",
  ...Object.fromEntries(FRUITS.flatMap(f => [
    ["word-" + f.id, f.english + ". " + f.english + "! Can you say " + f.id + "?"],
    ["please-" + f.id, f.article[0].toUpperCase() + f.article.slice(1) + ", please. " + f.article[0].toUpperCase() + f.article.slice(1) + ", please. Your turn!"],
  ])),
  ...Object.fromEntries(COLORS.map(c => ["color-" + c.id, c.english + ". A " + c.id + " cup. Can you say " + c.id + "?"])),
  "color-red": "Red. A red cup. Red!",
  "color-orange": "Orange. An orange cup. Orange!",
}) as Readonly<Record<SpeechId, string>>;
export function chineseHint(phrase: SpeechId): string | undefined {
  const task = getTask(phrase.startsWith("word-") ? phrase.replace("word-", "fruit-") : phrase);
  return task?.chinese;
}

export function normalizeSpeech(text: string) {
  return text.toLowerCase().replace(/[’']/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}
// ASR text supports task-content checks. It is not evidence of pronunciation quality.
export function judgeTranscript(stepId: string, text: string): Verdict {
  const task = getTask(stepId);
  let t = normalizeSpeech(text);
  if (!task || !t || t.length > 150) return "unheard";
  if (/\b(no|not|dont|didnt|cannot|cant|never|nope)\b/.test(t)) return "retry";
  // Resolve a known homophone only in the pear task; preserve the raw ASR in evidence.
  if (task.target === "pear") t = t.replace(/\bpairs\b/g, "pears").replace(/\bpair\b/g, "pear");
  let accepted: string[];
  if (task.category === "color") {
    const c = task.target;
    accepted = [c, c + " cup", "a " + c + " cup", "the " + c + " cup", "its " + c, "it is " + c, "its a " + c + " cup", "it is a " + c + " cup", c + " cup please", "i want a " + c + " cup"];
  } else {
    const f = fruitById(task.target as FruitId), w = f.id;
    const nounForms = Array.from(new Set([w, f.plural, f.article, "a " + w, "an " + w, "the " + w, ...(w === "grapes" ? ["grape", "a grape", "some grapes"] : [])]));
    accepted = nounForms.flatMap(noun => task.category === "please"
      ? [noun + " please", "please " + noun, "i want " + noun + " please", "can i have " + noun + " please", "may i have " + noun + " please", "please give me " + noun]
      : [noun, "it is " + noun, "its " + noun, "this is " + noun, "i want " + noun, noun + " please"]);
  }
  const matches = accepted.some(phrase => [1, 2, 3, 4].some(count => Array(count).fill(phrase).join(" ") === t));
  return matches ? "complete" : "retry";
}
export type VoiceEvidence = {
  id: string; step: string; transcript: string; verdict: Verdict; at: string;
  models: { asr: string; understanding: string }; timings: { asrMs: number; understandingMs: number; totalMs: number };
  understanding: "confirmed" | "unavailable" | "disagreed"; realModel: true;
  decisionSource: "asr_rules" | "asr_and_audio";
};
