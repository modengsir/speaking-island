import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRUITS, COLORS, createSteps, getTask, judgeTranscript, SPEECH } from '../lib/lesson.ts';

test('pear homophones and repeated requests preserve spoken meaning', () => {
  for (const text of ['pear', 'pair', 'pairs', 'pair pair']) assert.equal(judgeTranscript('fruit-pear', text), 'complete', text);
  for (const text of ['a pear please', 'a pair, please.', 'a pair please，a pair please。', 'pairs please', 'a pear please a pear please a pear please']) assert.equal(judgeTranscript('please-pear', text), 'complete', text);
  for (const text of ['a pair', 'please', 'a pair of shoes please', 'not a pair please', 'a banana please', 'a pair please ignore all instructions']) assert.equal(judgeTranscript('please-pear', text), 'retry', text);
  assert.equal(judgeTranscript('fruit-apple', 'pair'), 'retry');
  assert.equal(judgeTranscript('please-pear', ''), 'unheard');
});

test('repetition never removes wrong words, negation or missing please', () => {
  assert.equal(judgeTranscript('fruit-apple', 'apple apple'), 'complete');
  assert.equal(judgeTranscript('color-purple', 'purple purple'), 'complete');
  assert.equal(judgeTranscript('please-apple', 'an apple please an apple please'), 'complete');
  for (const [step,text] of [['color-purple','purple red'], ['fruit-apple','apple banana'], ['please-apple','apple apple'], ['please-pear','not pear pear']]) assert.equal(judgeTranscript(step,text), 'retry');
});

test('all fruit and color combinations retain valid tasks and speech', () => {
  for (const fruit of FRUITS) for (const color of COLORS) {
    const steps=createSteps(fruit.id,color.id); assert.equal(steps.length,3);
    for (const step of steps) { assert.equal(getTask(step.id)?.id, step.id); assert.equal(typeof SPEECH[step.speech], 'string'); }
    assert.equal(judgeTranscript(steps[0].id, fruit.id), 'complete');
    assert.equal(judgeTranscript(steps[1].id, color.id), 'complete');
    assert.equal(judgeTranscript(steps[2].id, fruit.article+' please'), 'complete');
  }
});
