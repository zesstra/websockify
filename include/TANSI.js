// TANSI.js -- a telnet-ansi-replacement for VT100 which drops some of the
// extravagant features (set cursor to certain locations, f.e.), but which
// provides scrollback, command history and a separate command line.
// 
// Written by XRM from github.com / YEN from nightfall.org 19jun13
// Bases on VT100.js by Frank Bi <bi@zompower.tk>

function TANSI (width, height, targetId)
{
  this._width  = width;
  this._height = height;
  this._target = document.getElementById(targetId);
  this._defaultForeground = 7;
  this._defaultBackground = 0;
  this._state  = [this._defaultForeground, this._defaultBackground, 0];  // Foreground, Background, Mode
  this._cursor = 1;  // cursor visible
  this._greedy = 1;  // grab inputs per default
  this._echo   = 1;  // echo input
  this._buffer = "> ";  // input line
  this._bufferPos = 0;  // Position in buffer
  this._lastBufferPos = 0;  // Position in buffer after last refresh
  this._lineCounter = 0;  // no lines stored yet
  this._isr = undefined;
  this._output = "";
  this._input = "";
  this._history = [];
  this._lastLineLength = 0;
  this._target.innerHTML = this._output = this.stateToSpan(this._state, 1);
  this.showBuffer(1);
  this._firstTag = 1;
  this._noLastSpan = 1;
  this._lastSpan = "";
  this._codeFragment = "";
}

TANSI.BOLD = 1;
TANSI.UNDERLINE = 2;
TANSI.BLINK = 4;
TANSI.INVERSE = 8;

TANSI.prototype.numToCol = function (num, bold)
{
  switch (num)
  {
    case 0: return bold?"#808080":"#1D1D1D";  // BLACK
    case 1: return bold?"#FF0000":"#800000";  // RED
    case 2: return bold?"#00FF00":"#008000";  // GREEN
    case 3: return bold?"#FFD700":"#808000";  // YELLOW
    case 4: return bold?"#0000FF":"#000080";  // BLUE
    case 5: return bold?"#FF00FF":"#800080";  // PURPLE
    case 6: return bold?"#00FFFF":"#008080";  // CYAN
    case 7: return bold?"#FFFFFF":"#C0C0C0";  // WHITE
  }
  return "";
}

TANSI.prototype.stateToSpan = function (state, force)
{
  if (this._noLastSpan)
    this._noLastSpan = 0;
  var r = "<span style=\"";
  if ((state[0] != this._defaultForeground && !(state[2] & TANSI.INVERSE)) || force)
    r += "color:" + this.numToCol(state[(state[2] & TANSI.INVERSE)?1:0], state[2] & TANSI.BOLD) + ";"
  if (state[1] != this._defaultBackground || force)
    r += "background-color:" + this.numToCol(state[(state[2] & TANSI.INVERSE)?0:1], 0) + ";";
  if (state[2] & TANSI.UNDERLINE && state[2] & TANSI.BLINK)
    r += "text-decoration:underline blink;";
  else if (state[2] & TANSI.UNDERLINE)
    r += "text-decoration:underline;";
  else if (state[2] & TANSI.BLINK)
    r += "text-decoration:blink;";
  if (state[2] & TANSI.BOLD)
    r += "font-weight:bold;";
  if (r == "<span style=\"")
  {
    this._lastSpan = "";
    this._noLastSpan = 1;
    return "";
  }
  this._lastSpan = r + "\">";
  return this._lastSpan;
}

TANSI.prototype.addText = function (str, fromBuffer)
{
  var ret = this._lastSpan;
  this._lastSpan = "";
  var i = 0;
  var j = 0;
  var k = 0;
  var length = this._lastLineLength;
  var code = "";
  str = this._codeFragment + str;
  this._codeFragment = "";
  while (i < str.length)
  {
    if (str.charCodeAt(i) != 27)
    {
      if (str.charCodeAt(i) < 32 && str.charCodeAt(i) != 10)
      {
        i++;
        continue;
      }
      if (str.charCodeAt(i) == 10)
        length = 0;
      else
        length++;
      if (str[i] == "<")
        ret += "&lt;";
      else if (str[i] == ">")
        ret += "&gt;";
      else if (str[i] == "&")
        ret += "&amp;";
      else
        ret += str[i];
      i++;
      if (length == 82)
      {
        ret += "\n";
        length = 0;
      }
    }
    else
    {
      var tmp0 = this._state[0];
      var tmp1 = this._state[1];
      var tmp2 = this._state[2];
      j = 2;
      while (str.charCodeAt(i + j) < 64 && (i+j) < str.length)
        j++;
      j++
      if (i+j >= str.length)
        this._codeFragment = str.substr(i, j);
      code = str.substr(i + 2, j - 3).split(";");  // Get main part of code
      for (k = 0; k < code.length; k++)
      {
        if (code[k].length == 1)
        {
          if (code[k] == "1")
            this._state[2] |= TANSI.BOLD;
          else if (code[k] == "4")
            this._state[2] |= TANSI.UNDERLINE;
          else if (code[k] == "5")
            this._state[2] |= TANSI.BLINK;
          else if (code[k] == "7")
            this._state[2] |= TANSI.INVERSE;
          else if (code[k] == "0")
          {
            this._state[0] = this._defaultForeground;
            this._state[1] = this._defaultBackground;
            this._state[2] = 0;
          }
        }
        else if (code[k].length == 2)
        {
          code[k] = parseInt(code[k]);
          if (code[k] >= 30 && code[k] <= 39)
          {
            if (code[k] == 39)
              this._state[0] = this._defaultForeground;
            else
              this._state[0] = code[k] - 30;
          }
          else if (code[k] >= 40 && code[k] <= 49)
            this._state[1] = code[k] - 40;
        }
        if (this._state[0] != tmp0 || this._state[1] != tmp1 || this._state[2] != tmp2)
        {
          ret += (this._noLastSpan?"":"</span>") + this.stateToSpan(this._state);
          tmp0 = this._state[0];
          tmp1 = this._state[1];
          tmp2 = this._state[2];
        }
        i += j;
      }
    }
  }
  if (!this._noLastSpan)
    ret += "</span>";
  if (fromBuffer === undefined)
    this._lastLineLength = ret.split("\n").pop().replace(/(<([^>]+)>)/ig,"").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&").length;
  this._lineCounter += ret.split("\n").length - 1;
  this._target.removeChild(this._target.lastChild);
  var div = document.createElement("div");
  div.innerHTML = ret;
  while (div.firstChild)
  {
    if (div.firstChild.innerHTML == "")
      div.removeChild(div.firstChild);
    else
      this._target.appendChild(div.firstChild);
  }
  this.showBuffer(1);
  document.title = "Nightfall Webclient (" + this._lineCounter + " lines)"
}

TANSI.prototype.write = function(str)
{
  var i = 0;
  var t = "";
  for (i = 0; i < str.length; i++)
  {
    if (str.charCodeAt(i) >= 32 || str.charCodeAt(i) == 27 || str.charCodeAt(i) == 10)
    {
      t += str[i];
    }
    else if (str.charCodeAt(i) == 8)
    {
      if (t.length > 0)
        t = t.substr(0, t.length - 1);
    }
  }
  this.addText(t);
}

TANSI.prototype.addCharToBuf = function (str)
{
  if (!this._greedy)
    return;
  if (str.charCodeAt(0) == 10)
  {
    this._buffer = this._buffer.substr(2);
    if (this._isr !== undefined)
      this._isr(this._buffer+"\n");
    if (this._echo)
    {
      this.addText(this._buffer + "\n", 1);
      if (this._history[this._history.length - 1] != this._buffer)
        this._history.push(this._buffer);
    }
    this._lastBufferPos = this._bufferPos;
    this._bufferPos = 0;
    this._historyPos = -1;
    this.clearBuf();
  }
  else if (str.charCodeAt(0) == 8)
  {
    this._lastBufferPos = this._bufferPos;
    this._bufferPos = 0;
    this.eraseLastCharFromBuf();
  }
  else if (str.charCodeAt(0) == 27 && str.charCodeAt(1) == 91)
  {
    if (str[2] == "A")
      this._historyPos++;
    else if (str[2] == "B")
      this._historyPos--;
    else
    {
      this._lastBufferPos = this._bufferPos;
      if (str[2] == "C")
        this._bufferPos--;
      if (str[2] == "D")
        this._bufferPos++;
      if (this._bufferPos > (this._buffer.length - 80))
        this._bufferPos = this._buffer.length - 80;
      if (this._bufferPos < 0)
        this._bufferPos = 0;
      this.showBuffer();
      return;
    }
    this._lastBufferPos = this._bufferPos;
    this._bufferPos = 0;
    if (this._historyPos < 0)
      this._historyPos = -1;
    if (this._historyPos >= this._history.length)
      this._historyPos = this._history.length - 1;
    if (this._historyPos == -1)
      this._buffer = "> ";
    else
      this._buffer = "> " + this._history[this._history.length - 1 - this._historyPos];
  }
  else
  {
    if (str.charCodeAt(0) == 0)
      return;
    this._buffer += str;
    this._lastBufferPos = this._bufferPos;
    this._bufferPos = 0;
  }
  if (this._echo)
    this.showBuffer();
}

TANSI.prototype.eraseLastCharFromBuf = function ()
{
  if (!this._greedy)
    return;
  if (this._buffer.length > 2)
    this._buffer = this._buffer.substr(0, this._buffer.length - 1);
  else
    this._buffer = "> ";
  this._lastBufferPos = this._bufferPos;
  this._bufferPos = 0;
  if (this._echo)
    this.showBuffer();
}

TANSI.prototype.clearBuf = function (str)
{
  this._buffer = "> ";
  this._lastBufferPos = this._bufferPos;
  this._bufferPos = 0;
}

TANSI.prototype.showBuffer = function (noRecalc)
{
  var pos = this._buffer.length - 80 - this._bufferPos;
  if (pos < 0)
    pos = 0;
  if (this._buffer.length <= 80)
    var b = this._buffer.substr(pos, this._buffer.length);
  else
    var b = this._buffer.substr(pos, 80);
  var bl = b.length;
  if (this._cursor && this._bufferPos == 0)
    b += "<span style=\"text-decoration: blink;\">_</span>";
  var div = document.createElement("div");
  div.innerHTML = "\n--------------------------------------------------------------------------------\n" + b;
  if (!noRecalc)
    this._target.replaceChild(div, this._target.lastChild);
  else
    this._target.appendChild(div);
  window.scrollTo(0, document.body.scrollHeight);
}

TANSI.prototype.noecho = function ()
{
  this._echo = 0;
}

TANSI.prototype.echo = function ()
{
  this._echo = 1;
}

TANSI.prototype.cursor = function (visible)
{
  this._cursor = visible>0?1:0;
  this.showBuffer();
}

TANSI.prototype.setISR = function (isr)
{
  this._isr = isr;
}
