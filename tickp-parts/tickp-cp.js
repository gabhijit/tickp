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
    /* the chartparams object. Used by several plot routines to findout current
        chart settings. Used for plotting */
    $.tickp.chartparams  = {
        init: function(plot) {
            this.plot = plot; // have a ref back to plot 
            return this;
        },  
        logscale: false,
        autoscale: false,
        type: 1, // 1: candlestick, 2: ohlc, 3: linecharts 
        w: undefined,
        h: undefined,
        candles : undefined,
        cwidth: 16, // initialized to 4 
        csize:undefined,
        ymin:undefined,
        ymax:undefined,
        numoverlays:0, // number of overlays.
        numindicators:0, // number of overlays.
        maxylabels: 10,
        maxxlabels: 10,
        minwidth: 40, //minimum width of a candle
        offset: 0
    };
    /* assigning prototype */
    $.tickp.chartparams.init.prototype = $.tickp.chartparams;

    $.tickp.csdark = {
        background : '#000000', 
        label: '#EEEEEE',
        stroke: '#AAAAAA',
        gridlines: '#AAAAAA',
        overlays : ['#CB2BC6','#5217DB','#18E197', '#DED71F','#DE521F', '#10F5B8', '#A6ACE2', '#DF9FB0'], //['#FF6600', '#FFFF33', '#FFFF33', '#00CCFF', '#3366FF'],
        bbands: ['#aabbcc', '#aabbcc', '#aabbcc'],
        macd: ['#0000FF', '#FF0000', '#aabbcc'],
        psar: '#CCFFFF', 
        rcandle: '#FF0000',
        gcandle: '#00FF00',
        lineplot: '#CCCCCC',
        idcss: 'position:absolute; border: 2px solid #0066CC; background: #FFFFCC;font-size:10px;font-family:arial,sans-serif;text-align:center;width:80px;height:100px; padding:2px;', 
        oloffset : 0

    };

    $.tickp.cslight = {
        background : '#FBFBFB', 
        label: '#080808',
        stroke: '#0B0B0B',
        gridlines: '#111111',
        overlays : ['#CB2BC6','#5217DB','#18E197', '#DED71F','#DE521F', '#10F5B8', '#A6ACE2', '#DF9FB0'], //['#FF6600', '#FFFF33', '#FFFF33', '#00CCFF', '#3366FF'],
        //overlays : ['#50124E','#250966','#075237','#3F3D08', '#3F1607', '#05523E', '#3F4158','#583F45'], //['#663300', '#FFCC00', '#000066', '#00CCFF', '#3366FF'],
        bbands: ['#001122', '#001122', '#001122'],
        macd: ['#000088', '#880000', '#aabbcc'],
        psar: '#000099', 
        rcandle: '#880000',
        gcandle: '#008800',
        lineplot: '#333333',
        idcss: 'position:absolute; border: 2px solid #0066CC; background: #FFFFCC;font-size:10px;font-family:arial,sans-serif;text-align:center;width:80px;height:100px; padding:2px;',
        oloffset : 0
    };
})(window);
