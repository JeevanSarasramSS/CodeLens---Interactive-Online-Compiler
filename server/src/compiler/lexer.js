// ============================================
// C LEXER — Tokenizer for C-like source code
// ============================================

const KEYWORDS = new Set([
  'auto','break','case','char','const','continue','default','do',
  'double','else','enum','extern','float','for','goto','if',
  'int','long','register','return','short','signed','sizeof',
  'static','struct','switch','typedef','union','unsigned','void',
  'volatile','while'
]);

const MULTI_CHAR_OPS = [
  '<<=','>>=','+=','-=','*=','/=','%=','&=','|=','^=',
  '==','!=','<=','>=','&&','||','++','--','->','<<','>>',
];

const SINGLE_CHAR_OPS = new Set(['+','-','*','/','%','=','<','>','!','&','|','^','~','?',':']);
const PUNCTUATION = new Set(['(',')','{','}','[',']',';',',','.']);

class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  peek(offset = 0) {
    const i = this.pos + offset;
    return i < this.source.length ? this.source[i] : null;
  }

  advance() {
    const ch = this.source[this.pos++];
    if (ch === '\n') { this.line++; this.column = 1; }
    else { this.column++; }
    return ch;
  }

  addToken(type, value, line, col) {
    this.tokens.push({ type, value, line, column: col });
  }

  isDigit(ch) { return ch && ch >= '0' && ch <= '9'; }
  isAlpha(ch) { return ch && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'); }

  skipWhitespace() {
    while (this.pos < this.source.length && /\s/.test(this.source[this.pos])) {
      this.advance();
    }
  }

  tokenize() {
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const sl = this.line, sc = this.column;
      const ch = this.peek();

      if (ch === '/' && this.peek(1) === '/') { this.readLineComment(sl, sc); }
      else if (ch === '/' && this.peek(1) === '*') { this.readBlockComment(sl, sc); }
      else if (ch === '#') { this.readPreprocessor(sl, sc); }
      else if (ch === '"') { this.readString(sl, sc); }
      else if (ch === "'") { this.readCharLiteral(sl, sc); }
      else if (this.isDigit(ch)) { this.readNumber(sl, sc); }
      else if (this.isAlpha(ch)) { this.readWord(sl, sc); }
      else if (PUNCTUATION.has(ch)) { this.addToken('PUNCTUATION', this.advance(), sl, sc); }
      else { this.readOperator(sl, sc); }
    }
    return this.tokens;
  }

  readLineComment(sl, sc) {
    let v = '';
    while (this.pos < this.source.length && this.peek() !== '\n') v += this.advance();
    this.addToken('COMMENT', v, sl, sc);
  }

  readBlockComment(sl, sc) {
    let v = this.advance() + this.advance(); // /*
    while (this.pos < this.source.length) {
      if (this.peek() === '*' && this.peek(1) === '/') { v += this.advance() + this.advance(); break; }
      v += this.advance();
    }
    this.addToken('COMMENT', v, sl, sc);
  }

  readPreprocessor(sl, sc) {
    let v = '';
    while (this.pos < this.source.length && this.peek() !== '\n') v += this.advance();
    this.addToken('PREPROCESSOR', v.trim(), sl, sc);
  }

  readString(sl, sc) {
    let v = this.advance(); // "
    while (this.pos < this.source.length && this.peek() !== '"') {
      if (this.peek() === '\\') v += this.advance();
      v += this.advance();
    }
    if (this.pos < this.source.length) v += this.advance(); // "
    this.addToken('STRING_LITERAL', v, sl, sc);
  }

  readCharLiteral(sl, sc) {
    let v = this.advance(); // '
    while (this.pos < this.source.length && this.peek() !== "'") {
      if (this.peek() === '\\') v += this.advance();
      v += this.advance();
    }
    if (this.pos < this.source.length) v += this.advance(); // '
    this.addToken('CHAR_LITERAL', v, sl, sc);
  }

  readNumber(sl, sc) {
    let v = '', isFloat = false;
    while (this.isDigit(this.peek())) v += this.advance();
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      isFloat = true; v += this.advance();
      while (this.isDigit(this.peek())) v += this.advance();
    }
    this.addToken(isFloat ? 'FLOAT_LITERAL' : 'INT_LITERAL', v, sl, sc);
  }

  readWord(sl, sc) {
    let v = '';
    while (this.pos < this.source.length && (this.isAlpha(this.peek()) || this.isDigit(this.peek()))) {
      v += this.advance();
    }
    this.addToken(KEYWORDS.has(v) ? 'KEYWORD' : 'IDENTIFIER', v, sl, sc);
  }

  readOperator(sl, sc) {
    // Try multi-char operators first (longest match)
    for (const op of MULTI_CHAR_OPS) {
      let match = true;
      for (let i = 0; i < op.length; i++) {
        if (this.peek(i) !== op[i]) { match = false; break; }
      }
      if (match) {
        for (let i = 0; i < op.length; i++) this.advance();
        this.addToken('OPERATOR', op, sl, sc);
        return;
      }
    }
    if (SINGLE_CHAR_OPS.has(this.peek())) {
      this.addToken('OPERATOR', this.advance(), sl, sc);
    } else {
      this.advance(); // skip unknown
    }
  }
}

function tokenize(source) {
  return new Lexer(source).tokenize();
}

module.exports = { tokenize, Lexer };
