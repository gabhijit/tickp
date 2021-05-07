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

/* bringing together all plotting related functions for the tickp object */
/* 
 * 
 * Two API functions from this file are - 
 *    - plot : Called by the caller 
 *    - plotempty : Initialize the empty plot
 */
(function($) { 
    /* All plotting functions taken together */ 
    $.tickp.plot =  function() {
        /* 
         * first try to plot the data
         */
        this._initPlotCanvas();
        this._doplot(this.ctx, this.current);
        if (!this.mode) { 
            this.drawlines();
        } 
    },

    $.tickp.plotempty = function() { 
        this.cp = { numindicators : 0};
        this._initPlotCanvas();
        this._drawText("Loading....", 100, 100, {font: '20pt Arial'});
    
    }, 
    /* low level plot function. Should not be used directly. */
    /* Since this is a plotting function, we don't do any calculation 
        inside this function. We assume, all data is with us
        ctx : the context on which to plot.
        dataset : complete dataset - OHLC plus overlays plus lower 
                  indicators if any 
        shift : if present, specifies , shift relative to last plot, for
                the first plot, makes no sense, used in pan mode. 
    */
    $.tickp._doplot = function(ctx, dataset, shift) {

        var cs = this.cs;
        var cp = this.cp;

        var data = dataset.ohlc;
        var vol = dataset.vol;
        var overlays = dataset.overlays;
        var indicators =dataset.indicators;
        /* let's clear ourselves before we start plotting anything */
        this._clear(ctx);

        var ob = this._window(data, overlays, shift); 
        var xmin = ob.xmin, ymin = ob.ymin, xmax = ob.xmax, ymax = ob.ymax;

        // We get top, bottom, right, left of the plot and draw a bounding 
        // rectangle 
        var _top = this.topmargin, _left = this.loffset, _right = _left + this.plotwidth, _bottom = _top + this.plotht;
        ctx.strokeStyle = this.cs.stroke;
        ctx.strokeRect(_left, _top, this.plotwidth, this.plotht);
        var h = _bottom;

        // If the scale is log scale, we use, Math.log and Math.exp or else
        // we use identity function.
        // Max candles we'd be plotting would not be more than hundred or
        // so, hence calculating log and exp is not as expensive as it may
        // appear than doing it for entire data. 
        var _log = (cp.logscale ? Math.log : function(x) {return x});
        var _exp = (cp.logscale ? Math.exp : function(x) {return x}); 
        var c = Math.round(cp.cwidth/2); // center of first (and every) cdl 
        var csize = Math.round(cp.cwidth/1.6);

       // the following variables are needed for plotting volume.
        var vt = this.topmargin + this.plotht ;//+ this.vspacing;
        var vb = vt ; //+ this.liplotht + this.limargin;
        var vl = this.loffset;
        var vr = this.loffset + this.plotwidth;
        var vymax = _minmax1d(vol.slice(xmin,xmax))[1] * 1.1;
        var vymin = 0; 
        var vrange = vymax - vymin;
        var vscale = this.liplotht/vrange;
        var vh = vb;
        /* ctx.strokeStyle = this.cs.stroke;
        ctx.strokeRect(vl, vt, this.plotwidth, this.liplotht + this.limargin);
        */

        var off = cp.offset; 
        var range = ymax - ymin;
        var scale = this.plotht/range; // scale: how much a unit htakes on the plot
        var prevxy = []; // used for drawing line to last point
        for(var i = xmin; i < xmax; i++) {
            var d = data[i]; 
            if ( d === undefined) 
                continue;
            var yop = Math.round((_log(d[0])-cp.ymin)*scale);
            var yhi = Math.round((_log(d[1])-cp.ymin)*scale);
            var ylo = Math.round((_log(d[2])-cp.ymin)*scale);
            var ycl = Math.round((_log(d[3])-cp.ymin)*scale);
            
            var xlo = (c + (i-xmin+off)*cp.cwidth) - csize + this.loffset;
            var xline = xlo + Math.round(csize/2);

            /* invert colors if Open > Close */
            // FIXME : Fix for Opera.. Doesn't like negative width/height
            // FIXME : check if it works
            if (yop > ycl) {
                ctx.fillStyle = cs.rcandle;
            } else {
                ctx.fillStyle = cs.gcandle;
                var t = ycl; ycl = yop; yop = t; 
            }
            /* We can plot volume only after we have identified the colors */
            /* try plotting the volume */ 
            if(vol[i-xmin]) { 
                var yvol = vol[i-xmin] * vscale;
                // FIXME : Fix for opera, check if it works 
                ctx.globalAlpha = 0.25;
                ctx.fillRect( xlo, vh-yvol, csize, yvol);
            } 

            ctx.globalAlpha = 1.0;
            if(cp.type == 1) {  // candle-stick
                ctx.fillRect( xlo, h-yop, csize, yop-ycl);
                _drawline(ctx,xline, h-yhi, xline, h-ylo, ctx.fillStyle, 1);
            } else if( cp.type == 2) { // OHLC 
                _drawline(ctx,xline, h-yhi, xline, h-ylo, ctx.fillStyle, 2);
                _drawline(ctx, xlo, h-yop, xline, h-yop, ctx.fillStyle, 2);
                _drawline(ctx, xline, h-ycl, xlo+csize, h-ycl, ctx.fillStyle, 2);
            } else {  
                if ( i-xmin > 0) { /* skip first line */
                    _drawline(ctx,prevxy[0], prevxy[1], xline, h-ycl, cs.stroke, 3);
                } 
                prevxy = [xline, h-ycl];
            }
        };

        /* plot any overlay indicators */
        var k = 0; 
        for (var o in overlays) {
            
            // TODO: evaluate, whether it makes sense to have separate 
            // functions for each of the overlays. Right now this looks ok. 
            var prevxy = [];
            var o1 = overlays[o].data;
            for(var j = xmin; j < xmax; j++) { 
                var i = j  - xmin + off;
                var ycl = Math.round((_log(o1[j])-ymin)*scale);
                if (!o.search('psar')) { //overlay name begins with psar.. this is our 
                    var pwidth = Math.round(cp.minwidth/8);
                    var xlo = (c + i*cp.cwidth) - 2*pwidth + this.loffset;
                    ctx.fillStyle = cs.psar;
                    //FIXME: Fix for opera, check 
                    ctx.fillRect(xlo, h-ycl-2*pwidth, 2*pwidth, 2*pwidth);
                } else if(!o.search('bbands')) { 
                    if (!o1[j][0]) { 
                        continue;
                    }
                    var xlo = (c + i*cp.cwidth) - csize + this.loffset;
                    var xline = xlo + Math.round(csize/2);
                    var bmax = Math.round((_log(o1[j][0])-ymin)*scale);
                    var bm = Math.round((_log(o1[j][1])-ymin)*scale);
                    var bmin = Math.round((_log(o1[j][2])-ymin)*scale);
                    if (i > 0 && prevxy[0]) { //skip first line
                        _drawline(ctx,prevxy[0][0], prevxy[0][1], xline, h-bmax, cs.bbands[0], 1);
                        _drawline(ctx,prevxy[1][0], prevxy[1][1], xline, h-bm, cs.bbands[1], 1);
                        _drawline(ctx,prevxy[2][0], prevxy[2][1], xline, h-bmin, cs.bbands[2], 1);
                    }
                    prevxy = [[xline, h - bmax], [xline, h - bm], [xline, h-bmin]];

                } else {
                    overlays[o].offset = k;
                    if(!o1[j]) { 
                        continue;
                    } 
                    var xlo = (c + i*cp.cwidth) - csize + this.loffset;
                    var xline = xlo + Math.round(csize/2);
                    if (i>0 && prevxy[0]) { //skip first line
                        _drawline(ctx,prevxy[0], prevxy[1], xline, h-ycl, cs.overlays[k%cs.overlays.length], 1);
                    }
                    prevxy = [xline, h-ycl];
                }
            } 
            k += 1;
        }

        /* and X and Y axis  FIXME:  get it right */ 
        var ystops = this._ygrid(_exp(ymin), _exp(ymax), 10);
        for(var i in ystops) {
            var logystp = _log(ystops[i]);
            var y1 = Math.round((logystp - cp.ymin)*scale);
            if( y1 > 20) { // don't draw anything in first 20 pixels  
                _drawline(ctx, _left, h-y1, _right, h-y1, cs.stroke, 0.1);
                label = ystops[i];
                this._drawText(label, _right, h - y1, {align:'left', padding:5});
            } 
        };
        
        /* let's write a function called getLabels
        var labels = getLabels(xmin, xmax);*/ 
        var howmany = xmax-xmin;
        //var xstop = Math.floor(howmany/cp.maxxlabels);
        var xstop = Math.ceil(cp.cwidth * 20 / howmany);
        h = h + (cp.numindicators)*this.loweriht;
        for(var i = xmin; i < xmax; i++) { 
            if(i%xstop == 0) {
                var label = this._idxToDate(i);
                if(label === undefined)
                    continue;
                var xlo = (c + (i-xmin+off)*cp.cwidth) - csize + this.loffset;
                var xline = xlo + Math.round(csize/2);
                if(xlo > this.loffset + 20) { 
                    _drawline(ctx, xline, h , xline, h-10, cs.stroke, 1.5);
                    //_drawline(ctx, xline, h , xline, this.topmargin, cs.stroke);
                    ctx.fillStyle = cs.label;
                    ctx.textAlign = "center";
                    ctx.fillText(label,xlo,h + this.vspacing + 10); 
                } 
            } 
        }  

        // Labels need to be added after the lines are drawn */
        k = 1;
        for(var j in indicators) {
            this._plotIndicator(indicators[j], k);
            k += 1;
        }

        /* And now let's give it a label. */
        if (this.cp.label) { 
            // this._drawText("VOLUME", vl, vt+20, {align:'left', padding:5, font:'10pt Arial'});
            this._drawText(this.cp.label, this.loffset - 2, 24, {align:'left', font:'16pt Arial'});
            this._drawText(this.copyrighttext, this.width - 60, 24, {align:'right', padding:5, font:'12pt Arial'});
            var ol = this.cs.overlays;
            for (var i in overlays) {
                if (overlays[i].offset !== undefined) {
                    var o = overlays[i].offset;
                    this._drawLegend(i, o);
                } 
            } 
        }
    };

    $.tickp._initPlotCanvas = function() {
        // First determine the width and height. width won't change
        this.width = this.loffset + this.rmargin + this.plotwidth;
        this.height = this.topmargin + this.plotht + this.loweriht + this.bmargin + (this.cp.numindicators * this.loweriht);
        if(this.canvas) { 
            // A canvas already exists, we probably need to resize the
            // canvas
            this.canvas.height = this.height;
            this.canvas.width = this.width;
            this.overlay.height = this.height;
            this.overlay.width = this.width;
        } else { // first time call to us
            this.canvas = _getCanvas(this.width, this.height);
            if (!this.canvas) { 
                throw "Cannot Initialize canvas";
            } 
            this.canvas.plot = this;
            this.target.appendChild(this.canvas);
        
            this.overlay = _getCanvas(this.width, this.height);
            if (!this.overlay) {
                throw "Cannot Initialize overlay";
            } 
            this.overlay.style.position  = 'absolute';
            // FIXME: Check if the code below is correct 
            this.overlay.style.left  = this._ElemPageOffsetX(this.canvas) + 'px';
            this.overlay.style.top  =  this._ElemPageOffsetY(this.canvas) + 'px';
            this.overlay.plot = this;
            this.overlay.tabIndex = 0;
            this.target.appendChild(this.overlay);
            // this.removeELs().addELs();
        } 
        // following we've to do everytime. 
        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = this.cs.background;
        this.ctx.fillRect(0,0,this.width,this.height);
        this.octx = this.overlay.getContext("2d");
        
        // We add copyright notice even before we've any data. lame.... :-)
        return this;
    };

    $.tickp._clear = function(ctx) { 
        ctx.clearRect(0,0, this.width, this.height);
        ctx.fillStyle = this.cs.background;
        ctx.fillRect(0,0,this.width,this.height);
    };

    $.tickp._plotIndicator = function(i, o) {
        var data = i.data;
        var type = i.type;     
        var str = i.str;
        var t = this.topmargin + this.plotht + (o*this.loweriht) + this.vspacing;
        var b = t + this.liplotht + this.limargin;
        var l = this.loffset;
        var r = this.loffset + this.plotwidth;
        var begin = this.cp.begin;
        var end = this.cp.end;
        
        var cp = this.cp;
        var cs = this.cs;
        var off = cp.offset;
        
        ctx = this.ctx;

        var c = Math.round(cp.cwidth/2); // center of first (and every) cdl 
        var csize = Math.round(cp.cwidth/1.6);
        switch(type) { 
        case 'macd':
            var d = _minmax2d(data.slice(begin,end));
            var ymax = d[1], ymin = d[0];
            var range = (ymax - ymin);
            ymax = ymax + 0.1 * range;
            ymin = ymin - 0.1 * range;
            range  = ymax - ymin ; 
            var scale = this.liplotht / range;
            var h = b; 
            prevxy = [];
            ctx.strokeStyle = this.cs.stroke;
            ctx.strokeRect(l, t, this.plotwidth, this.liplotht + this.limargin);
            for(var j = begin; j < end; j++) { 
                if(data[j][0] === undefined ) {
                    continue;
                }
                var i = j - begin + off; 
                var xlo = (c + i*cp.cwidth) - csize + this.loffset;
                var xline = xlo + Math.round(csize/2);
                var mhi = Math.round((data[j][0]-ymin)*scale);
                var mlo = Math.round((data[j][1]-ymin)*scale);
                var mzero = Math.round((0 - ymin)*scale);
                if (prevxy[0]) { //skip first line
                    _drawline(ctx,prevxy[0][0], prevxy[0][1], xline, h-mhi, cs.macd[0], 1);
                    _drawline(ctx,prevxy[1][0], prevxy[1][1], xline, h-mlo, cs.macd[1], 1);
                    ctx.fillStyle = cs.stroke;
                    // FIXME : Fix for opera, check if it works
                    if(mhi-mlo > 0) {
                        ctx.fillRect(xlo, h-mzero-(mhi-mlo), csize, (mhi-mlo)); 
                    } else { 
                        ctx.fillRect(xlo, h-mzero, csize, (mlo-mhi)); 
                    } 
                }
                prevxy = [[xline, h - mhi], [xline, h - mlo]];
            } 
            break;
        case 'rsi': 
            ymax = 100;
            ymin = 0;
            range  = ymax - ymin ; 
            var scale = this.liplotht / range;
            var h = b; 
            prevxy = [];
            ctx.strokeStyle = this.cs.stroke;
            ctx.strokeRect(l, t, this.plotwidth, this.liplotht + this.limargin);
            for(var j = begin; j < end; j++) { 
                if(!data[j]) {
                    continue;
                }
                var i = j - begin + off; 
                var xlo = (c + i*cp.cwidth) - csize + this.loffset;
                var xline = xlo + Math.round(csize/2);
                var rsi = Math.round((data[j]-ymin)*scale);
                if (prevxy[0]) { //skip first line
                    _drawline(ctx,prevxy[0], prevxy[1], xline, h-rsi, cs.macd[0], 1);
                }
                prevxy = [xline, h - rsi];
            } 
            ystops = [30, 50, 70];
            for( var j in ystops) { 
                var ystop = Math.round((ystops[j]-ymin)*scale);
                _drawline(ctx, this.loffset, h - ystop, this.loffset+this.plotwidth, h - ystop, cs.stroke, 1);
                label = ystops[j];
                this._drawText(label, r, h - ystop, {align:'left', padding:5});
            }
            break;
        case 'stoch': 
            ymax = 100;
            ymin = 0;
            range  = ymax - ymin ; 
            var scale = this.liplotht / range;
            var h = b; 
            prevxy = [];
            ctx.strokeStyle = this.cs.stroke;
            ctx.strokeRect(l, t, this.plotwidth, this.liplotht + this.limargin);
            for(var j = begin; j < end; j++) { 
                if(data[j][0] === undefined ) {
                    continue;
                }
                var i = j - begin + off; 
                var xlo = (c + i*cp.cwidth) - csize + this.loffset;
                var xline = xlo + Math.round(csize/2);
                var mhi = Math.round((data[j][0]-ymin)*scale);
                var mlo = Math.round((data[j][1]-ymin)*scale);
                var mzero = Math.round((0 - ymin)*scale);
                if (prevxy[0]) { //skip first line
                    _drawline(ctx,prevxy[0][0], prevxy[0][1], xline, h-mhi, cs.macd[0], 1);
                    _drawline(ctx,prevxy[1][0], prevxy[1][1], xline, h-mlo, cs.macd[1], 1);
                }
                prevxy = [[xline, h - mhi], [xline, h - mlo]];
            } 
            ystops = [20, 50, 80];
            for( var j in ystops) { 
                var ystop = Math.round((ystops[j]-ymin)*scale);
                _drawline(ctx, this.loffset, h - ystop, this.loffset+this.plotwidth, h - ystop, cs.stroke, 1);
                label = ystops[j];
                this._drawText(label, r, h - ystop, {align:'left', padding:5});
            }
            break;
        default:
            break;
        }
        this._drawText(str, l, t+20, {align:'left', padding:5, font:'10pt Arial'});
    };
    $.tickp.drawlines = function() {
        this.octx.clearRect(0,0, this.width, this.height);
        this.octx.strokeStyle = plot.cs.stroke;
        var lines = this.lines; 
        for(var i = 0; i < lines.length; i++) { 
            this.octx.beginPath();
            this.octx.moveTo(lines[i][0][0], lines[i][0][1]);
            this.octx.lineTo(lines[i][1][0], lines[i][1][1]);
            this.octx.stroke();
        } 
    };
 
})(window);
