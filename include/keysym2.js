/*
 * from noVNC: HTML5 VNC client
 * Copyright (C) 2010 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * Adjusted by XRM@github / YEN@nightfall on 19jun13,
 * so certain keys won't be blocked with the current wstelnet.js
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
        case 46        : keysym = 0xFFFF; break; // DELETE
        case 36        : keysym = 0xFF50; break; // HOME
        case 35        : keysym = 0xFF57; break; // END
        case 33        : keysym = 1 /*0xFF55*/; break; // PAGE_UP
        case 34        : keysym = 1 /*0xFF56*/; break; // PAGE_DOWN
        case 37        : keysym = 0xFF51; break; // LEFT
        case 38        : keysym = 0xFF52; break; // UP
        case 39        : keysym = 0xFF53; break; // RIGHT
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
        case 122       : keysym = 1/*0xFFC8*/; break; // F11
        case 123       : keysym = 1/*0xFFC9*/; break; // F12
        case 16        : keysym = 0xFFE1; break; // SHIFT
        case 17        : keysym = 0xFFE3; break; // CONTROL
        //case 18        : keysym = 0xFFE7; break; // Left Meta (Mac Option)
        case 18        : keysym = 0xFFE9; break; // Left ALT (Mac Command)
        default        : keysym = evt.keyCode; break;
    } 

    return keysym;
}

