/*
 * from noVNC: HTML5 VNC client
 * Copyright (C) 2010 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * Adjusted by XRM from github.com / YEN from nightfall.org on 19jun13
 * to using onkeydown *and* onkeypressed.
 * 
 */

/* Translate DOM key down/up event to keysym value */
function getKeysym(e) {
    var evt, keysym;
    evt = (e ? e : window.event);

    /* Remap modifier and special keys */
    switch ( evt.keyCode ) {
        case 8         : keysym = 0xFF08; break; // BACKSPACE
        case 9         : keysym = 0xFF09; break; // TAB
        case 13        : keysym = 0xFF0D; break; // ENTER
        case 27        : keysym = 0xFF1B; break; // ESCAPE
        case 45        : keysym = 0xFF63; break; // INSERT
        case 38        : keysym = 0xFF52; break; // UP
        case 40        : keysym = 0xFF54; break; // DOWN
        case 112       : keysym = 0xFFBE; break; // F1
        case 113       : keysym = 0xFFBF; break; // F2
        case 114       : keysym = 0xFFC0; break; // F3
        case 115       : keysym = 0xFFC1; break; // F4
        case 116       : keysym = 0xFFC2; break; // F5
        case 117       : keysym = 0xFFC3; break; // F6
        case 118       : keysym = 0xFFC4; break; // F7
        case 119       : keysym = 0xFFC5; break; // F8
        case 120       : keysym = 0xFFC6; break; // F9
        case 121       : keysym = 0xFFC7; break; // F10
        case 16        : keysym = 0xFFE1; break; // SHIFT
        case 17        : keysym = 0xFFE3; break; // CONTROL
        case 18        : keysym = 0xFFE9; break; // Left ALT (Mac Command)
        case 67        : if (!!evt.ctrlKey || !!evt.metaKey) { keysym = 0xFFEA; break; } // CTRL+C (copy-command)
        default        : keysym = evt.keyCode; break;
    } 
    return keysym;
}

