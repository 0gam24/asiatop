#!/usr/bin/env node
/**
 * R95-11 — Stage 4: topic → 확장 brief.yaml 생성.
 *
 * cluster-questions.mjs (Stage 3) 가 만든 data/topics/<id>.json 을 입력으로,
 * 기존 auto-brief-generator.mjs 호출 + pillar 묶음의 추가 질문들을 reader_intent.sub_questions
 * 과 structure.faq.must_include_questions 에 자동 inject 하여 pillar brief 생성.
 *
 * 단편 1건 brief → pillar 3~5건 묶음 brief 로 확장. HCU thin-content 회피 + AI Overviews 인용 단위 일치.
 *
 * 사용:
 *   node scripts/topic-to-brief.mjs --topic data/topics/<id>.json --out /tmp/brief.yaml
 *   node scripts/topic-to-brief.mjs --auto-pick                      # data/topics/ 첫 번째 자동
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

import { generateBriefSkeleton } from './lib/auto-brief-generator.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TOPICS_DIR = join(ROOT, 'data', 'topics');

function parseArgs() {
  const argv = process.argv.slice(2);
  const args = { autoPick: false, topic: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--auto-pick') args.autoPick = true;
    else if (argv[i] === '--topic') args.topic = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

function findFirstTopic() {
  if (!existsSync(TOPICS_DIR)) return null;
  const files = readdirSync(TOPICS_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) return null;
  return join(TOPICS_DIR, files[0]);
}

function pickPrimaryQuestion(topic) {
  // 가장 긴 (= 구체적인) 질문을 primary 로
  const sorted = topic.questions.slice().sort((a, b) => b.title.length - a.title.length);
  return sorted[0].title;
}

function deriveSubQuestions(topic, primary) {
  // primary 외 질문들을 sub_questions 로
  return topic.questions
    .map((q) => q.title)
    .filter((t) => t !== primary)
    .slice(0, 5); // 최대 5개
}

function main() {
  const args = parseArgs();
  let topicPath = args.topic;
  if (!topicPath && args.autoPick) topicPath = findFirstTopic();
  if (!topicPath) {
    console.error('[topic-to-brief] ❌ --topic <path> 또는 --auto-pick 필요');
    process.exit(1);
  }
  if (!existsSync(topicPath)) {
    console.error(`[topic-to-brief] ❌ topic 파일 부재: ${topicPath}`);
    process.exit(1);
  }

  const topic = JSON.parse(readFileSync(topicPath, 'utf-8'));
  console.log(`[topic-to-brief] 입력 topic: ${topic.topic_id} · cluster=${topic.cluster} · ${topic.size}건 질문`);

  const primary = pickPrimaryQuestion(topic);
  const subQuestions = deriveSubQuestions(topic, primary);
  console.log(`  primary: ${primary}`);
  console.log(`  sub_questions: ${subQuestions.length}개`);

  // 기존 brief-skeleton 생성 — primary 질문 + cluster keywords
  const brief = generateBriefSkeleton({
    questionText: primary,
    cluster: topic.cluster,
    matchedKeywords: topic.primary_keywords ?? [],
    authorityResponses: [],
    sourceUrl: topic.questions[0]?.source ?? null,
  });

  // R95-11 pillar 강화 — sub_questions inject
  brief.reader_intent ??= {};
  brief.reader_intent.sub_questions = subQuestions.length >= 3
    ? subQuestions
    : [...subQuestions, ...Array(3 - subQuestions.length).fill('<TODO sub-question>')];

  // FAQ must_include 에 sub_questions 반영 → article-pipeline 의 H2 / FAQ 가 자연 확장
  brief.structure ??= {};
  brief.structure.faq ??= { count: 3 };
  brief.structure.faq.must_include_questions = subQuestions.slice(0, 3);

  // pillar 메타 (audit 용 — article-pipeline 이 무시해도 무해, brief.meta 안에 inject)
  brief.meta ??= {};
  brief.meta.pillar = {
    topic_id: topic.topic_id,
    source_question_count: topic.size,
    source_questions: topic.questions.map((q) => ({ title: q.title, source: q.source ?? null })),
    primary_keywords: topic.primary_keywords ?? [],
  };

  const outPath = args.out ?? '/tmp/topic-brief.yaml';
  writeFileSync(outPath, yaml.dump(brief, { lineWidth: 120, noRefs: true }), 'utf-8');
  console.log(`\n[topic-to-brief] ✅ ${outPath} 저장`);
  console.log(`  reader_intent.sub_questions: ${brief.reader_intent.sub_questions.length}개`);
  console.log(`  structure.faq.must_include: ${brief.structure.faq.must_include_questions.length}개`);
  console.log(`  meta.pillar.source_question_count: ${brief.meta.pillar.source_question_count}`);
}

main();
