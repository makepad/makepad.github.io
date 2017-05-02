'use strict'

module.exports = function encodeBuffer(buffer, encoding)
{
  var padding = (buffer.length % 4 === 0) ? 0 : 4 - buffer.length % 4;

  var result = '';
  for (var i = 0; i < buffer.length; i += 4) {

    /* 32 bit number of the current 4 bytes (padded with 0 as necessary) */
    var num = ((buffer[i] << 24) >>> 0) + // Shift right to force unsigned number
        (((i + 1 > buffer.length ? 0 : buffer[i + 1]) << 16) >>> 0) +
        (((i + 2 > buffer.length ? 0 : buffer[i + 2]) <<  8) >>> 0) +
        (((i + 3 > buffer.length ? 0 : buffer[i + 3]) <<  0) >>> 0);

    /* Create 5 characters from '!' to 'u' alphabet */
    var block = [];
    for (var j = 0; j < 5; ++j) {
      block.unshift(enctable[num % 85]);
      num = Math.floor(num / 85);
    }

    block = block.join('');
    if (block === '!!!!!' && 'ascii85' === encoding) {
      block = 'z';
    }
    /* And append them to the result */
    result += block;
  }
  return result
}
var enctable = {
  0:  '!',
  1:  '"',
  2:  '#',
  3:  '$',
  4:  '%',
  5:  '&',
  6:  '\'',
  7:  '(',
  8:  ')',
  9:  '*',
  10: '+',
  11: ',',
  12: '-',
  13: '.',
  14: '/',
  15: '0',
  16: '1',
  17: '2',
  18: '3',
  19: '4',
  20: '5',
  21: '6',
  22: '7',
  23: '8',
  24: '9',
  25: ':',
  26: ';',
  27: '<',
  28: '=',
  29: '>',
  30: '?',
  31: '@',
  32: 'A',
  33: 'B',
  34: 'C',
  35: 'D',
  36: 'E',
  37: 'F',
  38: 'G',
  39: 'H',
  40: 'I',
  41: 'J',
  42: 'K',
  43: 'L',
  44: 'M',
  45: 'N',
  46: 'O',
  47: 'P',
  48: 'Q',
  49: 'R',
  50: 'S',
  51: 'T',
  52: 'U',
  53: 'V',
  54: 'W',
  55: 'X',
  56: 'Y',
  57: 'Z',
  58: '[',
  59: '\\',
  60: ']',
  61: '^',
  62: '_',
  63: '`',
  64: 'a',
  65: 'b',
  66: 'c',
  67: 'd',
  68: 'e',
  69: 'f',
  70: 'g',
  71: 'h',
  72: 'i',
  73: 'j',
  74: 'k',
  75: 'l',
  76: 'm',
  77: 'n',
  78: 'o',
  79: 'p',
  80: 'q',
  81: 'r',
  82: 's',
  83: 't',
  84: 'u'
};
