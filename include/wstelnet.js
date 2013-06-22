/*
 * WebSockets telnet client
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * Included VT100.js from:
 *   http://code.google.com/p/sshconsole
 * Which was modified from:
 *   http://fzort.org/bi/o.php#vt100_js
 *
 * Telnet protocol:
 *   http://www.networksorcery.com/enp/protocol/telnet.htm
 *   http://www.networksorcery.com/enp/rfc/rfc1091.txt
 *
 * ANSI escape sequeneces:
 *   http://en.wikipedia.org/wiki/ANSI_escape_code
 *   http://ascii-table.com/ansi-escape-sequences-vt-100.php
 *   http://www.termsys.demon.co.uk/vtansi.htm
 *   http://invisible-island.net/xterm/ctlseqs/ctlseqs.html
 *
 * ASCII codes:
 *   http://en.wikipedia.org/wiki/ASCII
 *   http://www.hobbyprojects.com/ascii-table/ascii-table.html
 *
 * Other web consoles:
 *   http://stackoverflow.com/questions/244750/ajax-console-window-with-ansi-vt100-support
 *
 * This version has been slightly adjusted by XRM@github / YEN@nightfall (17jun13).
 * (Made echo on-off-switchable, changed to ansi and using keypress instead of the key-map)
 * (Also adjusted code to use TANSI.js instead of VT100.js)
 */

function Telnet(target, connect_callback, disconnect_callback) {

var that = {},  // Public API interface
    tansi, ws, sQ = [];
    termType = "ANSI";


Array.prototype.pushStr = function (str) {
    var n = str.length;
    for (var i=0; i < n; i++) {
        this.push(str.charCodeAt(i));
    }
}

function do_send() {
    if (sQ.length > 0) {
        Util.Debug("Sending " + sQ);
        ws.send(sQ);
        sQ = [];
    }
}

function do_recv() {
    //console.log(">> do_recv");
    var arr = ws.rQshiftBytes(ws.rQlen()), str = "",
        chr, cmd, code, value;

    Util.Debug("Received array '" + arr + "'");
    while (arr.length > 0) {
        chr = arr.shift();
        switch (chr) {
        case 255:   // IAC
            cmd = chr;
            code = arr.shift();
            value = arr.shift();
            switch (code) {
            case 254: // DONT
                if (value === 1) {
                    tansi.noecho();
                }
                Util.Info("Got Cmd DONT '" + value + "', ignoring");
                break;
            case 253: // DO
                Util.Info("Got Cmd DO '" + value + "'");
                if (value === 1) {
                    tansi.echo();
                    Util.Info("Send WILL '" + value + "' (echo)");
                    sQ.push(255, 251, value);
                } else if (value === 24) {
                    // Terminal type
                    Util.Info("Send WILL '" + value + "' (TERM-TYPE)");
                    sQ.push(255, 251, value);
                } else {
                    // Refuse other DO requests with a WONT
                    Util.Info("Send WONT '" + value + "'");
                    sQ.push(255, 252, value);
                }
                break;
            case 252: // WONT
                if (value === 1) {
                    tansi.echo();
                    Util.Info("Send WILL '" + value + "' (echo)");
                    sQ.push(255, 251, value);
                }
                else
                    Util.Info("Got Cmd WONT '" + value + "', ignoring");
                break;
            case 251: // WILL
                Util.Info("Got Cmd WILL '" + value + "'");
                if (value === 1) {
                    // Server will echo, turn off local echo
                    tansi.noecho();
                    // Affirm echo with DO
                    Util.Info("Send Cmd DO '" + value + "' (echo)");
                    sQ.push(255, 253, value);
                } else {
                    // Reject other WILL offers with a DONT
                    Util.Info("Send Cmd DONT '" + value + "'");
                    sQ.push(255, 254, value);
                }
                break;
            case 250: // SB (subnegotiation)
                if (value === 24) {
                    Util.Info("Got IAC SB TERM-TYPE SEND(1) IAC SE");
                    // TERM-TYPE subnegotiation
                    if (arr[0] === 1 &&
                        arr[1] === 255 &&
                        arr[2] === 240) {
                        arr.shift(); arr.shift(); arr.shift();
                        Util.Info("Send IAC SB TERM-TYPE IS(0) '" + 
                                  termType + "' IAC SE");
                        sQ.push(255, 250, 24, 0); 
                        sQ.pushStr(termType);
                        sQ.push(255, 240);
                    } else {
                        Util.Info("Invalid subnegotiation received" + arr);
                    }
                } else {
                    Util.Info("Ignoring SB " + value);
                }
                break;
            default:
                Util.Info("Got Cmd " + cmd + " " + value + ", ignoring"); }
            continue;
        case 242:   // Data Mark (Synch)
            cmd = chr;
            code = arr.shift();
            value = arr.shift();
            Util.Info("Ignoring Data Mark (Synch)");
            break;
        default:   // everything else
            str += String.fromCharCode(chr);
        }
    }

    if (sQ) {
        do_send();
    }

    if (str) {
        tansi.write(str);
    }

    //console.log("<< do_recv");
}



that.connect = function(host, port, encrypt) {
    var host = host,
        port = port,
        scheme = "ws://", uri;

    Util.Debug(">> connect");
    if ((!host) || (!port)) {
        console.log("must set host and port");
        return;
    }

    if (ws) {
        ws.close();
    }

    if (encrypt) {
        scheme = "wss://";
    }
    uri = scheme + host + ":" + port;
    Util.Info("connecting to " + uri);

    ws.open(uri);

    Util.Debug("<< connect");
}

that.disconnect = function() {
    Util.Debug(">> disconnect");
    if (ws) {
        ws.close();
    }
    tansi.curs_set(true, false);

    disconnect_callback();
    Util.Debug("<< disconnect");
}


function constructor() {
    /* Initialize Websock object */
    ws = new Websock();

    ws.on('message', do_recv);
    ws.on('open', function(e) {
        Util.Info(">> WebSockets.onopen");
        tansi.curs_set(true, true);
        connect_callback();
        Util.Info("<< WebSockets.onopen");
    });
    ws.on('close', function(e) {
        Util.Info(">> WebSockets.onclose");
        that.disconnect();
        Util.Info("<< WebSockets.onclose");
    });
    ws.on('error', function(e) {
        Util.Info(">> WebSockets.onerror");
        that.disconnect();
        Util.Info("<< WebSockets.onerror");
    });

    /* Initialize the terminal emulator/renderer */

    tansi = new TANSI(80, 36, target);


    /*
     * Override tansi I/O routines
     */

    // Set handler for sending characters
    tansi.setISR(
        function send_chr(chr, vt) {
            var i;
            Util.Debug(">> send_chr: " + chr);
            for (i = 0; i < chr.length; i++) {
                sQ.push(chr.charCodeAt(i));
            }
            do_send();
        }
    );

    tansi.curs_set = function(vis, grab, eventist)
    {
        if (vis !== undefined)
            this.cursor(vis);
        if (eventist === undefined)
            eventist = window;
        if (grab === true || grab === false) {
            if (grab === this.grab_events_)
                return;
            if (grab) {
                this._greedy = true;
                Util.addEvent(eventist, 'keypress', tansi.key_press);
                Util.addEvent(eventist, 'keydown', tansi.key_down);
                Util.addEvent(eventist, 'keyup', tansi.key_up);
            } else {
                Util.removeEvent(eventist, 'keypress', tansi.key_press);
                Util.removeEvent(eventist, 'keydown', tansi.key_down);
                Util.removeEvent(eventist, 'keyup', tansi.key_up);
                this._greedy = false;
            }
        }
    }

    tansi.key_press = function(e) {
        var str = String.fromCharCode(e.charCode);
        if (!tansi._greedy)
            return true;
        if (str)
            tansi.addCharToBuf(str);
        Util.stopEvent(e);
        return false;
    }

    tansi.key_down = function(e) {
        var keysym, ch, str = "";
        if (!tansi._greedy)
            return true;
        keysym = getKeysym(e);

        if (keysym < 128) {
            return 0;
        } else {
            switch (keysym) {
            case 65505: // Shift, do not send directly
                break;
            case 65507: // Ctrl, do not send directly
                break;
            case 65293: // Carriage return, line feed
                str = '\n'; break;
            case 65288: // Backspace
                str = '\b'; break;
            case 65307: // Escape
                str = '\x1b'; break;
            case 65361: // Left arrow 
                str = '\x1b[D'; break;
            case 65362: // Up arrow 
                str = '\x1b[A'; break;
            case 65363: // Right arrow 
                str = '\x1b[C'; break;
            case 65364: // Down arrow 
                str = '\x1b[B'; break;
            default:
                Util.Info("Unrecoginized keysym " + keysym);
            }
        }

        if (str)
            tansi.addCharToBuf(str);

        Util.stopEvent(e);
        return false;
    }

    tansi.key_up = function(e) {
        if (!tansi._greedy)
            return true;
        Util.stopEvent(e);
        return false;
    }


    return that;
}

return constructor(); // Return the public API interface

} // End of Telnet()
