/*
 * TickP : A library for plotting Stock Charts and Technical Analysis  
 * using html canvas 
 * 
 * Copyright (c) 2010 - Abhijit Gadgil <gabhijit@gmail.com>
 * 
 * Licensed under the MIT License 
 * http://www.opensource.org/licenses/mit-license.php
 *  
 * Includes some code from jQuery. 
 * 
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 * 
 * 
 */
(function($) { 
    // Function below is not perfect. But as close to usable. 
    // Some Date formats like '12-Oct' fail. But yes, thats understandable.  
    function _getDateTs(str, fmt) { 
        var d;
        d = new Date(str).getTime();
        if (!isNaN(d)) {
            return d;
        }
        str = str.replace(/-/g, ' '); //1 Jan 2010 works but 1-Jan-2010 doesn't
        d = new Date(str).getTime();
        if (!isNaN(d)) {
            return d;
        }
        // may be what we've is a time stamp. 
        if((d = parseInt(str)) > 100000) { 
            // we are not handling something that's up on 1st Jan 1971, as yet.
            // assume it is a valid time stamp and just send it back.
           return d;this
        }  
    };


    function _tsToDate(ts) {
        var d = new Date(ts);
        var dd = d.getUTCDate();
        var mm = d.getUTCMonth() + 1;
        dd = (dd >= 10? dd : '0' + dd); 
        mm = (mm >= 10? mm : '0' + mm);       
        yy = d.getUTCFullYear(); 

        return yy + '-' + mm + '-' + dd;
    }; 

    /* Following functions are used from jQuery 
        The reason for doing this
        1. jquery does it properly 
        2. Including jquery for three functions is kind of an overkill. So 
            we'd keep including functions from jquery in here. If and when
            this becomes too big to be so, we'd just use jQuery library.

        Copyright 2010, John Resig (http://jquery.org/license)

    */
    function parseJSON(data) { 
		if ( typeof data !== "string" || !data ) {
			return null;
		}

	    var rtrim = /^(\s|\u00A0)+|(\s|\u00A0)+$/g,
		// Make sure leading/trailing whitespace is removed (IE can't handle it)
		data = data.replace(rtrim, "");
		
		// Make sure the incoming data is actual JSON
		// Logic borrowed from http://json.org/json2.js
		if ( /^[\],:{}\s]*$/.test(data.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
			.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
			.replace(/(?:^|:|,)(?:\s*\[)+/g, "")) ) {

			// Try to use the native JSON parser first
			return window.JSON && window.JSON.parse ?
				window.JSON.parse( data ) :
				(new Function("return " + data))();

		} else {
			throw  "JSON parse error:"; 
		}
    };

    function isArray(a) { 
		return Object.prototype.toString.call(a) === "[object Array]";
    };

    function isFunction(f) { 
		return Object.prototype.toString.call(f) === "[object Function]";
    };

    /* util functions */
    /* Get the canvas for us. */ 
    function  _getCanvas(w, h) {
        c = document.createElement('canvas');
        c.id = Math.round(Math.random()*100);
        c.width = w;
        c.height = h;
        return c; 
    };
    function _minmax2d(data) {
        var max = -Infinity;
        var min = Infinity;
        
        for(var i in data) {
            for (j in data[i]) {
                if (data[i][j] >= max)  max = data[i][j];
                if (data[i][j] < min) min = data[i][j]; 
            }
        }
        return [min, max];
    };

    function _minmax1d(data) { 
        var max = -Infinity;
        var min = Infinity;
        
        for(var i in data) {
           if (data[i] >= max)  max = data[i];
           if (data[i] < min) min = data[i]; 
        }
        return [min, max];
    };
})(window);
