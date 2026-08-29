/**
 * Question Service
 * Loads CSV question bank and manages server-side question selection
 */

const fs = require('fs');
const path = require('path');
const { getTimeLimit } = require('./scoringService');

let questionBank = [];

const OPTION_MAP = {
  'option_a': 0,
  'option_b': 1,
  'option_c': 2,
  'option_d': 3,
  'a': 0,
  'b': 1,
  'c': 2,
  'd': 3,
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3
};

/**
 * Parse CSV line handling quotes
 */
function parseCSVLine(text) {
  const result = [];
  let curr = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        curr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(curr.trim());
      curr = '';
    } else {
      curr += char;
    }
  }
  result.push(curr.trim());
  return result;
}

/**
 * Load and validate CSV at startup
 */
function loadQuestionBank(filePath) {
  const resolvedPath = filePath || path.join(__dirname, '../data/aptitude_quiz.csv');
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Question bank CSV file not found at: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) {
    throw new Error('Question bank CSV is empty or has no data rows.');
  }

  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const requiredHeaders = ['id', 'category', 'difficulty', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];

  for (const req of requiredHeaders) {
    if (!header.includes(req)) {
      throw new Error(`CSV validation failed: missing required column '${req}'`);
    }
  }

  const idIdx = header.indexOf('id');
  const catIdx = header.indexOf('category');
  const diffIdx = header.indexOf('difficulty');
  const qIdx = header.indexOf('question');
  const optAIdx = header.indexOf('option_a');
  const optBIdx = header.indexOf('option_b');
  const optCIdx = header.indexOf('option_c');
  const optDIdx = header.indexOf('option_d');
  const ansIdx = header.indexOf('correct_answer');

  const seenIds = new Set();
  const loaded = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < requiredHeaders.length) continue;

    const id = cols[idIdx];
    if (seenIds.has(id)) {
      console.warn(`[QUESTIONS] Warning: Duplicate question ID ${id} at line ${i + 1}`);
      continue;
    }
    seenIds.add(id);

    const category = cols[catIdx];
    const difficulty = cols[diffIdx];
    const prompt = cols[qIdx];
    const options = [cols[optAIdx], cols[optBIdx], cols[optCIdx], cols[optDIdx]];
    const rawAnswer = cols[ansIdx].toLowerCase();

    const correctIndex = OPTION_MAP[rawAnswer] !== undefined ? OPTION_MAP[rawAnswer] : 0;
    const timeLimit = getTimeLimit(difficulty);

    loaded.push({
      id,
      category,
      difficulty,
      prompt,
      options,
      correctIndex,
      timeLimit
    });
  }

  questionBank = loaded;
  console.log(`[QUESTIONS] Successfully loaded ${questionBank.length} questions from ${path.basename(resolvedPath)}`);
  return questionBank;
}

/**
 * Select balanced questions for a 10-question round
 */
function selectQuestionsForRound(count = 10) {
  if (questionBank.length === 0) {
    loadQuestionBank();
  }

  // Shuffle array copy
  const shuffled = [...questionBank].sort(() => 0.5 - Math.random());
  
  // Pick desired count
  const selected = shuffled.slice(0, Math.min(count, questionBank.length));
  return selected;
}

/**
 * Sanitize question for client transmission (NEVER send correctIndex or answers)
 */
function getPublicQuestion(q) {
  return {
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    prompt: q.prompt,
    options: q.options,
    timeLimit: q.timeLimit || getTimeLimit(q.difficulty)
  };
}

function getQuestionCount() {
  return questionBank.length;
}

module.exports = {
  loadQuestionBank,
  selectQuestionsForRound,
  getPublicQuestion,
  getQuestionCount
};
