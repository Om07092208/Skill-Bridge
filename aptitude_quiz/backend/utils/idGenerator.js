/**
 * Room Code & ID Generator
 * Generates unique 5-character uppercase alphanumeric room codes
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(existingRooms = new Map()) {
  let code;
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    attempts++;
  } while (existingRooms.has(code) && attempts < 100);

  return code;
}

function generatePlayerId() {
  return 'p_' + Math.random().toString(36).substring(2, 9);
}

function generateRoundId() {
  return 'rnd_' + Date.now().toString(36);
}

module.exports = {
  generateRoomCode,
  generatePlayerId,
  generateRoundId
};
