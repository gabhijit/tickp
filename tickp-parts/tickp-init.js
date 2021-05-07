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

/* 
 * contains the two main API functions here. -- 
    $.tickp('#elementID') 
 */
(function($) {
    $.tickp = function(target, options) {
        /* constructor for the plot object. Idea taken from jQuery */
        return new $.tickp.fn.init(target, options);
    };
    /* The plot object prototype */
    $.tickp.fn = {
        emas : {},
        psar: [],
        current : undefined,
        prev: undefined,

        /* The chart layout properties follow */ 
        /* first get the width */
        loffset : 20,
        rmargin : 60,
        plotwidth : 800,
        width : undefined, 
        /* tmargin and ttext row is the upper row. */
        tmargin:40, 
        ttextrow: 24, 
        topmargin : undefined,
        /* vspacing : spacing between main chart and lower indicators */
        vspacing: 5, 
        limargin: 20, 
        liplotht : 100, 
        loweriht : undefined,
        /* Margin at the bottom  */
        bmargin : 20,  
        plotht : 400, 
        height : undefined,

        interval : 0,
        /* chart mode: Supports two modes currently 
            - navigation (0): Displays values for individual candles and
                              simple trendline support. 
            - pan/zoom   (1): Moves along the time axis. TODO: Zoom mode 
        */
        mode: 1, // 0: navigation 1: pan and zoom 

        // supported indicators 
        supported : ['ema', 'sma', 'psar', 'bbands', 'rsi', 'stoch', 'macd'], 
        
        // our copyright text 
        copyrighttext : "\xA9 bolsafinanceira.com", 

        /* init is the constructor function for the object. 
            TODO: options support. Default options only right now. */  
        init: function(target, options) {
            /* 
            * First thing we do is initialize target - 
            *  Assumption neigh requirement is 'target' is going to be the 
            *  'id' of the div where we are going to 'create canvas and shoot.
            */
            this.target = $$(target);
            this.cs = $.tickp.cslight;

            this.width = this.loffset + this.rmargin + this.plotwidth;
            this.topmargin = this.tmargin + this.ttextrow,
            this.loweriht = this.vspacing + this.limargin + this.liplotht,
            this.height = this.topmargin + this.plotht + this.loweriht + this.bmargin;

            // drawing lines
            this.lines = [];
            this.undolines = [];

            this.infodiv = document.createElement('div')
            this.infodiv.id = 'info';
            this.infodiv.zIndex = "1000";
            this.target.appendChild(this.infodiv);
            $.tzoffset = new Date().getTimezoneOffset() * 60000; // it's in minutes

            // make ourselves available to the world as window.$plot (so that refering to us 
            // should not require to know the variable that held us 
            window.$plot = this;
            return this;
        },

        drawlines: function() {
    };
    /* below is needed to give the object all the methods reqd. */
    $.tickp.fn.init.prototype = $.tickp.fn;
    
    // Our own lame selector. 
    function $$(selector) { 
        if (typeof selector !== "string" || !selector) {
            return e;
        }

        // someone gave us #id or div#id. just take the id part out. 
        var i = selector.search('#');
        if(i !== -1) { 
            id = selector.substring(i+1); 
            return document.getElementById(id);
        } else { 
            // we still try by ID in case someone forgot to send the #
            var e = document.getElementById(selector);
            if (!e) { 
                // first of all elements by given name  
                e = document.getElementsByName(selector)[0];
            } 
            // we return whatever we got . 
            return e;
        }     
    };
})(window); 
