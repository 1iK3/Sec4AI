/**
 * Convert gen-part1 and gen-part2 sample files into prompts.json entries.
 * Usage: node tools/convert-gen.js
 * Output: writes new entries to tools/gen-converted.json (array of prompt objects)
 */
const fs = require('fs');
const path = require('path');

const GEN_PART1 = 'gen-part1';
const GEN_PART2 = 'gen-part2';

const CATEGORY_MAP = {
  'overt': 'direct-injection',
  'evasive': 'encoding-bypass',
  'indirect': 'indirect-injection',
  'social': 'jailbreak',
  'cross-cutting': 'multi-modal-injection',
  'multi-modal': 'multi-modal-injection',
};

const TAG_MAP = {
  '系统提示泄露': 'leak',
  'prompt-leak': 'leak',
  'system-prompt-leak': 'leak',
  '越狱': 'jailbreak',
  'jailbreak': 'jailbreak',
  '有害内容生成': 'harmful-content',
  '检测绕过': 'bypass',
  '信息泄露': 'leak',
  '指令覆盖': 'override',
  '角色扮演': 'roleplay',
};

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/-+$/, '');
}

function makeEntry({ prompt, category, source, attackGoal, language, tags }) {
  const id = slugify(prompt) || ('gen-' + Math.random().toString(36).slice(2, 8));
  const goal = attackGoal || 'unknown';
  const langTag = language ? language.toLowerCase() : '';
  const tagsArr = [];
  if (tags && tags.length) tagsArr.push(...tags);
  if (langTag === 'zh' || langTag === 'zh-mixed' || langTag === 'zh-cn') tagsArr.push('chinese');
  if (langTag === 'en' || langTag === 'en-spaced') tagsArr.push('english');
  if (goal.includes('leak')) tagsArr.push('leak');
  if (goal.includes('jail') || goal.includes('越狱')) tagsArr.push('jailbreak');
  if (goal.includes('bypass')) tagsArr.push('bypass');
  tagsArr.push('gen-sample');

  return {
    id: 'gen-' + id,
    title: (prompt.length > 60 ? prompt.substring(0, 57) + '...' : prompt),
    category: category || 'direct-injection',
    tags: [...new Set(tagsArr)],
    brief: goal || '对抗测试样本',
    description: `源自 CrowdStrike Prompt Injection 分类学对抗样本集。目标：${goal || '提示词注入检测对抗'}。语言：${language || 'unknown'}。来源文件：${source}`,
    prompt: prompt,
    effect: `对抗性测试载荷，目标为${goal || '提示词注入检测绕过'}。检测器鲁棒性测试。`,
    scenario: `提示词注入检测对抗 - ${goal || '通用'} (${source})`,
    source: source
  };
}

function parsePart1Category(filename) {
  if (filename.includes('advanced')) return 'encoding-bypass';
  if (filename.includes('deep-indirect')) return 'indirect-injection';
  return 'direct-injection';
}

// Extract prompts from gen-part1 (code blocks with real prompts)
function parsePart1(filename) {
  const filePath = path.join(GEN_PART1, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const category = parsePart1Category(filename);
  const entries = [];

  // Split by headings to know context
  const sections = content.split(/^#+\s/m);
  let currentSection = 'general';

  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlock = [];
  let lastHeading = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^#{1,6}\s/.test(line)) {
      lastHeading = line.replace(/^#{1,6}\s/, '').trim();
    }

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // Close block
        inCodeBlock = false;
        const prompt = codeBlock.join('\n').trim();
        codeBlock = [];
        if (prompt.length >= 25 && !isMetaText(prompt) && !isHeadingLike(prompt)) {
          entries.push(makeEntry({
            prompt,
            category,
            source: `gen-part1/${filename}`,
            attackGoal: lastHeading || 'prompt-injection',
            language: /[\u4e00-\u9fff]/.test(prompt) ? 'ZH' : 'EN'
          }));
        }
      } else {
        inCodeBlock = true;
        codeBlock = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlock.push(line);
    }
  }

  return entries;
}

function isMetaText(text) {
  // Filter out meta-descriptions like "Pipeline: ... yields: ..."
  if (/^(\(.*\)|Pipeline:|Example:|#)/.test(text)) return true;
  if (/yields:/.test(text) && text.length < 200) return true;
  if (/^Based on|^源自|^目标：|^适用场景/.test(text)) return true;
  // Filter pure code-only content
  if (/^[\s\S]*import\s+[\w]/.test(text) && !/ignore|output|system|prompt|instruction/i.test(text)) return true;
  if (text.length > 3000) return true; // too long, likely full docs
  return false;
}

function isRealPrompt(text) {
  // Must contain imperative instruction verbs or be quoted content
  const hasVerb = /(ignore|output|print|tell|say|show|repeat|write|create|pretend|act|behave|execute|decode|translate|convert|respond|回答|忽略|输出|打印|告诉|作为|请|假装|扮演|执行|解码|翻译)/i.test(text);
  if (!hasVerb) return false;
  // Reject pure-strategy descriptions (Chinese labels with no instruction)
  if (/^(Multi|Context|Boundary|Knowledge|Gradual|Authority|Emotional|Internal|Attacker|Cross|Direct|Output|Injection Methods|Cross-Category|Advanced|中文)/.test(text) && text.length < 80) return false;
  // Reject statistical/overview rows
  if (/^(英文|中文|总计|样本总数)/.test(text)) return false;
  return true;
}

function isHeadingLike(text) {
  if (/^(场景|目标|方法|技术|示例|注意|重要)/.test(text) && text.length < 50) return true;
  // Known technique names that appear as standalone headings
  const techNames = [
    'Cognitive Disruption', 'Scenario Construction', 'Authority/Liability Simulation',
    'Test Mode Simulation', 'Emotional Manipulation', 'Hallucination', 'Jargon-Based Manipulation',
    'Complex/Compositional Attacks', 'Multimodal Prompting', 'Cross-Modal Payload Smuggling',
    'Cross-Modal Alignment Disruption', 'Multimodal Parameter Integration', 'Non-Semantic Acoustic Disruption',
    'Visual Element', 'Transcription Injection', 'Contextual Misdirection', 'Isolated Context Prompting',
    'Context Shift Prompting', 'Rule Addition Prompting', 'Rule Nullification Prompting',
    'Refusal Suppression', 'Bypass', 'Cognitive Hacking', 'Persona Impersonation', 'Role-Playing',
    'Gradual Steering', 'In-Session Protocol', 'Context Overflow', 'Context Padding',
    'Context Overload Prompting', 'Textual Boundary Mimicry', 'Separator Manipulation', 'Negation',
    'Continuation', 'System Prompt Contamination', 'False Injection', 'Output-Driven Injection',
    'Knowledge Integration Prompting', 'Implicit Knowledge Integration', 'Reformulation',
    'Constraint Imposition Prompting', 'Unintelligible Input Prompting', 'Glitched Token',
    'Surrogate Format Prompting', 'Phonetic Manipulation', 'Phonetic Alpha Manipulation',
    'Visual Substitution', 'Homoglyph Substitution', 'String Decomposition', 'Base-Encoding',
    'Natural Language Manipulation', 'Non-Semantic Word Modification', 'Non-Semantic Sentence Modification',
    'Multilingual Formulation', 'Paraphrastic Substitution', 'Pig Latin', 'Cognitive Control',
    'Pragmatic Manipulation', 'Instruction Reformulation', 'Morpho-Syntactic Manipulation',
    'Higher-Level Functioning Disruption', 'Reasoning Disruption', 'Generation Disruption',
    'Cross-Modal Audio Injection', 'Multi-Turn Prompting', 'Emotional', 'Direct Integration',
    'Reference Integration', 'Intra-word Modification', 'Typo Injection', 'Word Addition',
    'Intra-Sentence Modification'
  ];
  for (const t of techNames) {
    if (text === t || text === t + '（' || text === t + ' - ' || text === t + ' Prompting' || text === t + ' Prompting（') return true;
  }
  return false;
}

// Parse gen-part2 markdown tables
function parsePart2(filename) {
  const filePath = path.join(GEN_PART2, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const entries = [];
  const category = CATEGORY_MAP[filename.toLowerCase().includes('social') ? 'social' :
    filename.toLowerCase().includes('evasive') ? 'evasive' :
    filename.toLowerCase().includes('indirect') ? 'indirect' :
    'overt'];

  const lines = content.split('\n');
  let inTable = false;
  let headerCols = [];
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^#{1,6}\s/.test(line)) {
      currentSection = line.replace(/^#{1,6}\s/, '').trim();
    }

    // Detect table header row (starts with | and has --- separators next)
    if (line.trim().startsWith('|') && !inTable) {
      const next = lines[i + 1] || '';
      if (/^\|[\s\-:|]+\|$/.test(next.trim())) {
        inTable = true;
        headerCols = line.split('|').map(c => c.trim()).filter(Boolean);
        i++; // skip separator
        continue;
      }
    }

    if (inTable) {
      // End of table detection
      if (!line.trim().startsWith('|')) {
        inTable = false;
        headerCols = [];
        continue;
      }
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === ''));
      // The prompt is typically in the 2nd column (after #)
      if (cells.length >= 2) {
        let prompt = '';
        let attackGoal = '';
        let language = '';
        let defenseDim = '';

        for (let ci = 0; ci < cells.length; ci++) {
          const header = (headerCols[ci] || '').toLowerCase();
          const cell = cells[ci];
          // Strip backticks
          const clean = cell.replace(/^`|`$/g, '').trim();

          if (/^\d+$/.test(clean) && ci === 0) continue; // row number

          if (header.includes('对抗') || header.includes('prompt') || header.includes('样本') || header.includes('载荷')) {
            if (clean.length > 10) prompt = clean;
          } else if (header.includes('目标') || header.includes('goal') || header.includes('效果')) {
            attackGoal = clean;
          } else if (header.includes('语言') || header.includes('lang')) {
            language = clean;
          } else if (header.includes('防御') || header.includes('维度') || header.includes('策略')) {
            defenseDim = clean;
          } else if (!prompt && clean.length > 10 && ci === 1) {
            prompt = clean;
          }
        }

        if (!prompt && cells.length >= 2) {
          // Fallback: second cell is often the prompt
          const second = cells[1].replace(/^`|`$/g, '').trim();
          if (second.length > 10 && !/^\d+$/.test(second)) prompt = second;
        }

        if (prompt.length >= 20 && !isMetaText(prompt) && !isHeadingLike(prompt) && isRealPrompt(prompt)) {
          entries.push(makeEntry({
            prompt,
            category,
            source: `gen-part2/${filename}`,
            attackGoal: attackGoal || currentSection || 'prompt-injection',
            language: language || (/[\u4e00-\u9fff]/.test(prompt) ? 'ZH' : 'EN'),
            tags: defenseDim ? [slugify(defenseDim)] : []
          }));
        }
      }
    }
  }

  return entries;
}

function main() {
  const all = [];

  // Parse gen-part1
  const part1Files = fs.readdirSync(GEN_PART1).filter(f => f.endsWith('.md'));
  for (const f of part1Files) {
    const entries = parsePart1(f);
    console.log(`gen-part1/${f}: ${entries.length} prompts`);
    all.push(...entries);
  }

  // Parse gen-part2
  const part2Files = fs.readdirSync(GEN_PART2).filter(f => f.endsWith('.md'));
  for (const f of part2Files) {
    const entries = parsePart2(f);
    console.log(`gen-part2/${f}: ${entries.length} prompts`);
    all.push(...entries);
  }

  // Deduplicate within generated set
  const seen = new Set();
  const unique = [];
  for (const e of all) {
    const norm = e.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(norm)) {
      seen.add(norm);
      unique.push(e);
    }
  }

  console.log(`\nTotal parsed: ${all.length}, unique: ${unique.length}`);
  fs.writeFileSync('tools/gen-converted.json', JSON.stringify(unique, null, 2), 'utf8');
  console.log('Written to tools/gen-converted.json');
}

main();
