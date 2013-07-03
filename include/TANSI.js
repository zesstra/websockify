// TANSI.js -- a telnet-ansi-replacement for VT100 which drops some of the
// extravagant features (set cursor to certain locations, f.e.), but which
// provides scrollback, command history and a separate command line.
// 
// Written by XRM from github.com / YEN from nightfall.org 19jun13
// Bases on VT100.js by Frank Bi <bi@zompower.tk>

function TANSI (width, height, targetId, inputId, promptId)
{
  this._width  = width;
  this._height = height;
  this._target = document.getElementById(targetId);
  this._input = document.getElementById(inputId);
  this._prompt = document.getElementById(promptId);
  this._defaultForeground = 7;
  this._defaultBackground = 0;
  this._state  = [this._defaultForeground, this._defaultBackground, 0];  // Foreground, Background, Mode
  this._greedy = 1;  // grab inputs per default
  this._echo   = 1;  // echo input
  this._buffer = "";  // input line
  this._lineCounter = 0;  // no lines stored yet
  this._isr = undefined;
  this._history = [];
  this._lastLineLength = 0;
  this._target.innerHTML = "";
  this.showBuffer();
  this._firstTag = 1;
  this._noLastSpan = 1;
  this._lastSpan = "";
  this._codeFragment = "";
  this._margin = 2;  // Used to work around unneccessary line breaks due to the prompt in muds
}

TANSI.BOLD = 1;
TANSI.UNDERLINE = 2;
TANSI.BLINK = 4;
TANSI.INVERSE = 8;

TANSI.prototype.setPageSize = function ()
{
  // This may break if the last line consists of too many chars ...
  var s = this._prompt;
  var r = new Array;
  var i = 0;
  r.push(80); r.push(24);
  if (s.textContent === undefined)
  {
    if (s.innerHTML === undefined)
      return r;
    else
      i = 1;
  }
  var l = 0;
  if (i)
    l = s.innerText.length;
  else
    l = s.textContent.length;
  this._width = Math.floor(this._target.clientWidth / (s.offsetWidth / l)) - 1;
  this._height = Math.floor(this._target.clientHeight / s.offsetHeight);
  // If width or length drops below a certain min, reset to default.
  if (this._width < 40)
    this._width = 80;
  if (this._height < 3)
    this._height = 24;
  var w = this._width;
  var h = this._height;
  r[0] = w; r[1] = h;
  this.showBuffer(1);
  return r;
}

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
  var firstLine = 1;
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
      {
        firstLine = 0;
        length = 0;
      }
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
      // margin is used to allow (theoretically) too long lines due to the prompt
      if (length == (this._width + (firstLine?this._margin:0)))
      {
        firstLine = 0;
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
  this._lastLineLength = ret.split("\n").pop().replace(/(<([^>]+)>)/ig,"").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&").length;
  this._lineCounter += ret.split("\n").length - 1;
  var span = document.createElement("span");
  span.innerHTML = ret;
  while (span.firstChild)
  {
    if (span.firstChild.innerHTML == "")
      span.removeChild(span.firstChild);
    else
      this._target.appendChild(span.firstChild);
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

TANSI.prototype.controlBuffer = function (str)
{
  if (!this._greedy)
    return;
  if (str.charCodeAt(0) == 10)
  {
    if (this._echo)
    {
      this.addText(this._buffer + "\n", 1);
      if (this._history[this._history.length - 1] != this._buffer)
        this._history.push(this._buffer);
    }
    if (this._isr !== undefined)
      this._isr(this._buffer+"\n");
    this._historyPos = -1;
    this.clearBuf();
  }
  else if (str.charCodeAt(0) == 8)
  {
    this.eraseLastCharFromBuf();
  }
  else if (str.charCodeAt(0) == 27 && str.charCodeAt(1) == 91)
  {
    if (str[2] == "A")
      this._historyPos++;
    else if (str[2] == "B")
      this._historyPos--;

    if (this._historyPos < 0)
      this._historyPos = -1;
    if (this._historyPos >= this._history.length)
      this._historyPos = this._history.length - 1;
    if (this._history.length == 0 || this._historyPos == -1)
      this._buffer = "";
    else
      this._buffer = "" + this._history[this._history.length - 1 - this._historyPos];
  }
  if (this._echo)
    this.showBuffer();
}

TANSI.prototype.eraseLastCharFromBuf = function ()
{
  if (!this._greedy || this._echo)
    return;
  if (this._buffer.length > 2)
    this._buffer = this._buffer.substr(0, this._buffer.length - 1);
  else
    this._buffer = "";
  if (this._echo)
    this.showBuffer();
}

TANSI.prototype.clearBuf = function (str)
{
  this._buffer = "";
}

TANSI.prototype.updateBuffer = function ()
{
  if (this._input === undefined)
    return;
  if (this._echo)
    this._buffer = this._input.value;
  else
  {
    this._buffer += this._input.value;
    this._input.value = "";
  }
}

TANSI.prototype.showBuffer = function (noUpdate)
{
  this._input.size = this._width - 6;
  if (this._input.value != this._buffer && !noUpdate)
    this._input.value = this._buffer;
  window.scrollTo(0, document.body.scrollHeight);
}

TANSI.prototype.noecho = function ()
{
  this._echo = 0;
  this._input.type = "password";
}

TANSI.prototype.echo = function ()
{
  this._echo = 1;
  this._input.type = "text";
}

TANSI.prototype.setISR = function (isr)
{
  this._isr = isr;
}
