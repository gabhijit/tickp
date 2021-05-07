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

    function _drawline(ctx, x1, y1, x2, y2, color, width) {
        color = color || "#111111";
        var width = width || 0.8;

        var w = ctx.lineWidth;
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1,y1);
        ctx.lineTo(x2,y2);
        ctx.stroke();
        ctx.closePath();
        ctx.lineWidth = w;
            
    };

    /* event handlers in the default 'trendline' mode */
    var _beginTrendLine = function(event) { 
        var ctx = this.plot.octx;
        ctx.begin_x = event.pageX - this.plot._ElemPageOffsetX(this);
        ctx.begin_y = event.pageY - this.plot._ElemPageOffsetY(this);
        ctx.start = true;
    };

    var _drawTrendLine = function(event) { 
        ctx = this.plot.octx;
        var myx = event.pageX - this.plot._ElemPageOffsetX(this);
        var myy = event.pageY - this.plot._ElemPageOffsetY(this);
        if (ctx.start) { 
            this.plot.drawlines();
            ctx.beginPath();
            ctx.strokeStyle = plot.cs.stroke;
            ctx.lineWidth = 1;
            ctx.moveTo(ctx.begin_x, ctx.begin_y);
            ctx.lineTo(myx, myy);
            ctx.stroke();
            ctx.closePath();
        } else { 
            var cdl = this.plot._getCandle(myx, myy);
            if (cdl) { 
                this.plot._showInfo(cdl, event.pageX, event.pageY);
            } else { 
                this.plot.infodiv.style.display = 'none'; 
            }
        } 
    };

    function _endTrendLine(event) { 
        ctx = this.plot.octx;
        ctx.start = false;
        // completed one line 
        var bx = ctx.begin_x;
        var by = ctx.begin_y;
        var ex = this.plot._canvasOffsetX(event.pageX, this);
        var ey = this.plot._canvasOffsetY(event.pageY, this);
        var len = Math.sqrt(Math.pow((ex-bx),2) + Math.pow((ey-by),2));
        if (len > 50) { 
            this.plot.lines.push([[bx,by],[ex,ey]]);
        }
        this.plot.drawlines();
    };

    function _keyActions(event) { 
        var p = this.plot;
        if(event.ctrlKey) { 
            if(event.keyCode === 90) {
                var line = p.lines.pop();
                if(line) 
                    p.undolines.unshift(line);
                p.drawlines();
            } else if( event.keyCode === 89) { 
                var line = p.undolines.shift();
                if(line) 
                    p.lines.push(line); 
                p.drawlines();
            } 
        } else if(event.altKey) {
            if (event.keyCode === 107) { 
                p.zoom(1);
            } else if (event.keyCode === 109) { 
                p.zoom(0);
            } 
        } 
        
    }; 

    /* event handlers in the Pan and zoom mode */
    var _beginPanning = function(event) { 
        this.style.cursor = 'move';
        var ctx = this.plot.octx;
        ctx.begin_x = this.plot._canvasOffsetX(event.pageX, this);
        ctx.begin_y = this.plot._canvasOffsetY(event.pageY, this);
        ctx.start = true;
    };  
    var _doPanning = function(event) { 
        var p = this.plot;
        var ctx = p.octx;
        var myx = p._canvasOffsetX(event.pageX, this);
        var myy = p._canvasOffsetY(event.pageY, this);
        var xo = myx - ctx.begin_x;
        var yo = myy - ctx.begin_y;
        
        if(ctx.start) {
            console.log(xo, p.cp.cwidth);
            if (Math.abs(xo) > p.cp.cwidth) {
                size = Math.floor(xo/p.cp.cwidth); 
                console.log(size);
                p._doplot(p.ctx, p.current, size);
                ctx.begin_x = myx;
                ctx.begin_y = myy;
            } 
        }      
    };  
    var _endPanning = function(event) { 
        this.plot.octx.start = false;
        this.style.cursor = 'default';
    };

        /* Bells and whistles functions : Gives you candles from X, Y 
            co-ordinate, if the mouse is in the area of a candle, candle
            is returned or else nothing. This is used by _showInfo to 
            display OHLC data. 
        */
    $.tickp._getCandle = function(x,y) { 
        x = x - this.loffset;
        y = y - this.topmargin;
        var cp = this.cp;
            
        var pc = this.plotwidth/(cp.end - cp.begin);
        var xos = Math.round(x/pc) + cp.begin;
        if ((xos < cp.end) && (xos >= cp.begin)) { 
            var candle = this.current.ohlc[xos];
            var chi = candle[1];
            var clo = candle[2];
            pc = this.plotht / (cp.ymax - cp.ymin); 
            var yos = cp.ymax - Math.round(y/pc);
            if((chi > yos) && (clo < yos)) {
               return xos;
            }
        }
        return null;
    },

    $.tickp._showInfo = function(o, x, y) {
        var data = this.current.ohlc;
        var s = this.infodiv.style;
    /*    s.background = '#FFFFCC';  
        s.display = 'block'; 
        s.position = 'absolute';
        s.border = '2px solid #0066CC';
        s.width = '100px';
        s.height = '200px';*/
        s.cssText = this.cs.idcss;
        s.left = (x -100 -5) + 'px';
        s.top = (y - 100-5) + 'px'; 
        html = '<table>';
        html += "<tr> <td>O</td><td>" + data[o][0] + "</td></tr>";
        html += "<tr> <td>H</td><td>" + data[o][1] + "</td></tr>";
        html += "<tr> <td>L</td><td>" + data[o][2] + "</td></tr>";
        html += "<tr> <td>C</td><td>" + data[o][3] + "</td></tr>";
        html += "</td>";
        this.infodiv.innerHTML = html;
    };

    /* given PageX, PageY, find the offset on the canvas. This is of 
        importance to us to determine the candles later on
     *  FIXME : I think we can get rid of _canvasXXXX functions once the ElemPageOffsetXXX functions are there. That's for  first review. 
    */
    $.tickp._canvasOffsetX= function(x, c) { 
        var ox = 0; 
        do { 
            ox += c.offsetLeft;
        }while (c = c.offsetParent) ; // from quirksmode 
        return  x-ox;
    }; 

    $.tickp._canvasOffsetY= function(y,c) { 
        var oy = 0; 
        do { 
            oy += c.offsetTop;
        } while (c = c.offsetParent) ; // from quirksmode 
        return y-oy;
    }; 

    // Fixme, one can move these out of the object
    $.tickp._ElemPageOffsetX= function(e) { 
        var ox = 0; 
        do { 
            ox += e.offsetLeft;
        } while (e = e.offsetParent) ; // from quirksmode 
        return ox;
    }; 

    $.tickp._ElemPageOffsetY= function(e) { 
        var oy = 0; 
        do { 
            oy += e.offsetTop;
        } while (e = e.offsetParent) ; // from quirksmode 
        return oy;
    };

    // removes all the event listners on the overlay. 
    $.tickp.removeELs = function() {
        var o = this.overlay;
        
        //bruteforce... remove everything
        o.removeEventListener('mousedown', _beginTrendLine, false); 
        o.removeEventListener('mousemove', _drawTrendLine, false);
        o.removeEventListener('mouseup', _endTrendLine, false); 
        o.removeEventListener('keyup', _keyActions, false);
        o.removeEventListener('mousedown', _beginPanning, false); 
        o.removeEventListener('mousemove', _doPanning, false);
        o.removeEventListener('mouseup', _endPanning, false); 
        // returns self to the caller to allow chaining
        return this; 

    };

    $.tickp.addELs = function() { 
        var o = this.overlay;
        if (!this.mode) { 
            o.addEventListener('mousedown', _beginTrendLine, false); 
            o.addEventListener('mousemove', _drawTrendLine, false);
            o.addEventListener('mouseup', _endTrendLine, false); 
        } else { // Pan mode 
            o.addEventListener('mousedown', _beginPanning, false); 
            o.addEventListener('mousemove', _doPanning, false);
            o.addEventListener('mouseup', _endPanning, false); 

        } 
        o.addEventListener('keyup', _keyActions, false);
        return this.overlay;

    };

    $.tickp.changemode = function(mode) { 
        mode = parseInt(mode);
        if (isNaN(mode)) { 
            return false;
        } 
        if(mode && mode != 1) { 
            return false;
        } 
        if(this.mode === mode) { 
            return false; // don't do anything if mode is same 
        }
        this.mode = mode;
        this.removeELs().addELs(); 
        this.lines = [], this.undolines = [];
        this.drawlines();
        this.plot();
    };
})(window);
