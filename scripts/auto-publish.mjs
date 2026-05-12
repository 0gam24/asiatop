#!/usr/bin/env node
/**
 * 자동 발행 통합 러너 — G0~G8 순차 실행
 *
 * 입력:
 *   --question "..."         # 지식인 질문 본문 (단일)
 *   --question-file path.txt # 또는 파일에서 읽기
 *   --brief path.yaml        # brief 직접 지정 (G1~G3 스킵, G4~G8만)
 *   --mdx path.mdx           # 이미 LLM 생성된 본문 (G4~G8만)
 *   --dry-run                # 실제 파일 생성 X, 결과 보고만
 *   --mock                   # MOCK_AUTHORITY=1 강제 (default)
 *
 * 흐름:
 *   1. G0 dedup → G1 sanitize → G2 cluster → G3 source-probe (Pre-LLM)
 *   2. brief 자동 골격 생성 (V2 — 현재는 별도 단계 위임)
 *   3. LLM 4-pass (article-pipeline.mjs 위임 — V2)
 *   4. G4 fact-verify → G5 adsense → G6 disclosure → G7 plagiarism → G8 ai-likeness
 *   5. PR 자동 생성 (auto-publish.yml 워크플로 영역)
 *
 * V1 범위: G0~G2 + G5~G8 dry-run + audit 로그.
 *  - G3는 fixture 의존, G4는 권위 fetch 의존 → 외부 API 키 발급 후 활성
 *  - LLM 4-pass는 별도 단계 (article-pipeline.mjs)
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isDuplicate, recordSeen, questionHash } from './lib/dedup-index.mjs';
import { sanitizeQuestion } from './gates/g1-question-sanitize.mjs';
import { mapCluster } from './gates/g2-cluster-map.mjs';
import { probeAuthoritySources } from './gates/g3-source-probe.mjs';
import { verifyFacts } from './lib/fact-verifier.mjs';
import { checkAdSensePolicy } from './gates/g5-adsense-policy.mjs';
import { attachAndVerifyDisclosures } from './gates/g6-disclosure-attach.mjs';
import { checkPlagiarism } from './gates/g7-plagiarism.mjs';
import { checkAILikeness } from './gates/g8-ai-likeness.mjs';
import { fetchAllForCluster } from './lib/authority-sources/index.mjs';
import { generateBriefSkeleton } from './lib/auto-brief-generator.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REJECTED_DIR = resolve(ROOT, 'briefs', '_pool', '_rejected');

// ─────────────────────────────────────────────
// CLI 인자
// ─────────────────────────────────────────────
function arg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] !== undefined) return process.argv[idx + 1];
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return null;
}
function hasFlag(flag) {
  return process.argv.includes(flag);
}

// ─────────────────────────────────────────────
// audit log 작성
// ─────────────────────────────────────────────
function writeRejectionAudit(hash, gateId, reason, payload) {
  const date = new Date().toISOString().slice(0, 10);
  const dir = resolve(REJECTED_DIR, date);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${hash}.yaml`);
  // 단순 YAML-like (의존성 X — js-yaml 사용 안 함)
  const yaml = [
    '_rejected:',
    `  gate: "${gateId}"`,
    `  reason: ${JSON.stringify(reason)}`,
    `  hash: "${hash}"`,
    `  rejected_at: "${new Date().toISOString()}"`,
    `  details: ${JSON.stringify(payload).slice(0, 500)}`,
    '',
  ].join('\n');
  writeFileSync(path, yaml, 'utf-8');
  return path;
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────
async function main() {
  const dryRun = hasFlag('--dry-run');
  process.env.MOCK_AUTHORITY = process.env.MOCK_AUTHORITY ?? '1';

  // 입력 모드 결정
  let questionText = arg('--question');
  const questionFile = arg('--question-file');
  if (!questionText && questionFile) {
    questionText = readFileSync(questionFile, 'utf-8').trim();
  }

  const briefPath = arg('--brief');
  const mdxPath = arg('--mdx');

  // ─── 모드 A: 질문 단독 → Pre-LLM 게이트만 (G0~G3)
  if (questionText && !briefPath && !mdxPath) {
    return preLLMOnly(questionText, dryRun);
  }

  // ─── 모드 B: brief + mdx → Post-LLM 게이트 (G4~G8)
  if (briefPath && mdxPath) {
    return postLLMOnly(briefPath, mdxPath, dryRun);
  }

  // ─── 모드 C: 질문 + brief + mdx → 전체 흐름
  if (questionText && briefPath && mdxPath) {
    const pre = await preLLMOnly(questionText, dryRun);
    if (!pre.pass) return pre;
    return postLLMOnly(briefPath, mdxPath, dryRun, { questionText });
  }

  console.error('Usage:');
  console.error('  node scripts/auto-publish.mjs --question "..."          # G0~G3');
  console.error('  node scripts/auto-publish.mjs --brief path --mdx path   # G4~G8');
  console.error('  node scripts/auto-publish.mjs --question-file path.txt  # 파일');
  process.exit(1);
}

async function preLLMOnly(questionText, dryRun) {
  const trace = [];
  const hash = questionHash(questionText);
  const briefOut = arg('--brief-out'); // 옵션: brief YAML 출력 경로 지정 (워크플로 다음 step 입력)

  // G0 dedup
  if (isDuplicate(questionText)) {
    trace.push({ gate: 'g0', pass: false, reason: 'g0-duplicate-24h' });
    if (!dryRun) writeRejectionAudit(hash, 'g0', 'duplicate-24h', { hash });
    return reportFail(trace, 'g0');
  }
  trace.push({ gate: 'g0', pass: true });

  // G1 sanitize
  const g1 = sanitizeQuestion(questionText);
  trace.push({ gate: 'g1', pass: g1.pass, reasons: g1.reasons, meta: g1.meta });
  if (!g1.pass) {
    if (!dryRun) {
      recordSeen(questionText, 'rejected', g1.reasons.join(','));
      writeRejectionAudit(hash, 'g1', g1.reasons.join(','), g1);
    }
    return reportFail(trace, 'g1');
  }

  // G2 cluster
  const g2 = mapCluster(questionText);
  trace.push({ gate: 'g2', pass: g2.pass, reasons: g2.reasons, cluster: g2.cluster, score: g2.score });
  if (!g2.pass) {
    if (!dryRun) {
      recordSeen(questionText, 'rejected', g2.reasons.join(','));
      writeRejectionAudit(hash, 'g2', g2.reasons.join(','), g2);
    }
    return reportFail(trace, 'g2');
  }

  // G3 source-probe — MOCK_AUTHORITY 환경변수 반영 (real fetch 모드 지원, R53 #5~#7)
  const useMock = process.env.MOCK_AUTHORITY !== '0';
  const query = { keywords: g2.ranking[0].matched, expected_facts: [] };
  const g3 = await probeAuthoritySources(g2.cluster, query, { mock: useMock });
  trace.push({ gate: 'g3', pass: g3.pass, reasons: g3.reasons, meta: g3.meta });
  if (!g3.pass) {
    if (!dryRun) {
      recordSeen(questionText, 'rejected', g3.reasons.join(','));
      writeRejectionAudit(hash, 'g3', g3.reasons.join(','), { meta: g3.meta });
    }
    return reportFail(trace, 'g3');
  }

  // R54-1 — brief 자동 생성 (V2 통합 1단계).
  // G3 가 반환한 authorityResponses (auth-sources/index.mjs 의 fetchAllForCluster 응답)
  // 를 받아 brief skeleton 작성. dry-run 이어도 brief 는 생성 (다음 step 입력 의도).
  let briefPath = null;
  let briefSkeleton = null;
  try {
    const authorityResponses = await fetchAllForCluster(g2.cluster, query, { mock: useMock });
    briefSkeleton = generateBriefSkeleton({
      questionText,
      cluster: g2.cluster,
      matchedKeywords: g2.ranking[0].matched,
      authorityResponses,
    });
    if (briefOut) {
      const yaml = await import('js-yaml');
      const dumped = yaml.dump(briefSkeleton, { lineWidth: 120, noRefs: true });
      const dir = dirname(briefOut);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(briefOut, dumped, 'utf-8');
      briefPath = briefOut;
    }
    trace.push({
      gate: 'brief-skeleton',
      pass: true,
      meta: {
        slug: briefSkeleton.meta?.slug,
        brief_id: briefSkeleton.meta?.brief_id,
        primary_sources: briefSkeleton.primary_sources?.length ?? 0,
        out: briefPath,
      },
    });
  } catch (e) {
    trace.push({ gate: 'brief-skeleton', pass: false, reason: String(e?.message ?? e) });
    // brief 생성 실패는 hard fail 아님 — pre-LLM 통과로 보고하되 다음 step 에서 활성 차단
  }

  // 통과 → pending 큐에 기록 (dry-run 이면 기록 X)
  if (!dryRun) {
    recordSeen(questionText, 'pending', null);
  }
  return reportPass(trace, {
    hash,
    cluster: g2.cluster,
    brief_path: briefPath,
    brief_summary: briefSkeleton
      ? {
          slug: briefSkeleton.meta?.slug,
          brief_id: briefSkeleton.meta?.brief_id,
          primary_sources_count: briefSkeleton.primary_sources?.length ?? 0,
        }
      : null,
  });
}

async function postLLMOnly(briefPath, mdxPath, dryRun, extra = {}) {
  const trace = [];
  if (!existsSync(briefPath) || !existsSync(mdxPath)) {
    console.error(`brief or mdx not found: ${briefPath} / ${mdxPath}`);
    process.exit(1);
  }
  // YAML 파서 의존: validate-brief가 js-yaml 사용. 여기서는 brief 직접 import 대신
  // article-pipeline 통합 시 brief 객체로 받음. V1 단독 실행은 brief 객체 stub.
  let brief;
  try {
    const yaml = await import('js-yaml');
    brief = yaml.load(readFileSync(briefPath, 'utf-8'));
  } catch (e) {
    console.error('brief load failed:', e.message);
    process.exit(1);
  }
  const mdx = readFileSync(mdxPath, 'utf-8');

  // G4 fact-verify — R54-4: mock 강제 제거. MOCK_AUTHORITY 환경변수 반영.
  // MOCK_AUTHORITY=0 시 어댑터 V2 의 real fetch 응답으로 본문 토큰 1:1 매칭.
  const useMock = process.env.MOCK_AUTHORITY !== '0';
  const g4 = await verifyFacts(mdx, brief, {
    authorityFetch: (cluster, query) => fetchAllForCluster(cluster, query, { mock: useMock }),
    mock: useMock,
  });
  trace.push({ gate: 'g4', pass: g4.pass, match_rate: g4.match_rate, unmatched: g4.unmatched.length, stats: g4.stats });
  if (!g4.pass) return reportFail(trace, 'g4');

  // G5 AdSense
  const g5 = checkAdSensePolicy(mdx, brief);
  trace.push({ gate: 'g5', pass: g5.pass, reasons: g5.reasons, warnings: g5.warnings });
  if (!g5.pass) return reportFail(trace, 'g5');

  // G6 disclosure (mdx mutate)
  const g6 = attachAndVerifyDisclosures(mdx, brief);
  trace.push({ gate: 'g6', pass: g6.pass, reasons: g6.reasons });
  if (!g6.pass) return reportFail(trace, 'g6');
  const mdxFinal = g6.mdx;

  // G7 plagiarism
  const questionText = extra.questionText ?? brief?.source_question?.original_text ?? null;
  const g7 = checkPlagiarism(mdxFinal, questionText);
  trace.push({ gate: 'g7', pass: g7.pass, reasons: g7.reasons, meta: g7.meta });
  if (!g7.pass) return reportFail(trace, 'g7');

  // G8 ai-likeness
  const g8 = checkAILikeness(mdxFinal);
  trace.push({ gate: 'g8', pass: g8.pass, score: g8.score, threshold: g8.threshold, signals: g8.signals });
  if (!g8.pass) return reportFail(trace, 'g8');

  return reportPass(trace, { mdx: mdxFinal });
}

function reportFail(trace, lastGate) {
  console.log(JSON.stringify({ pass: false, last_gate: lastGate, trace }, null, 2));
  process.exitCode = 2;
  return { pass: false, last_gate: lastGate, trace };
}

function reportPass(trace, extra) {
  console.log(JSON.stringify({ pass: true, trace, ...(extra ?? {}) }, null, 2));
  return { pass: true, trace, ...(extra ?? {}) };
}

main().catch((e) => {
  console.error(e?.stack ?? e);
  process.exit(3);
});
