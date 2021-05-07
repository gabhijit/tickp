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
         /* We assume the data is already downloaded using probably ajax or a local copy.  We just read this data in the TA object. If there are any known indicators in the template, we fire and store those in the TA object supported formats: json array, or JS array. Anything else, we don't process as of now Upon completion, done function is called - first parameter is 'TA object' second parameter is error code.  TODO : implement done function functionality completely.*/
    $.tickp.read = function(data, done) {
        // We expect the data to be in the following form 
        // { label : 'label for the chart', data: [[ts,o,h,l,c,v], [ts,o,h,l,c,v],....] } 

        //New chart param. We are not going to plot before read anyways.
        this.cp =  new $.tickp.chartparams.init(this);
        var errorcode = 0;
        var label = '';
        if (!data.label || !data.data) { 
            // see if it's an array.
            if (isArray(data)) { 
                if(!(data.length)) { // empty array 
                    return false;
                } 
                var d = data;
            }
        } 
        if (data.data) {
            if (isArray(data.data)) { 
                if(!data.data.length) { // empty array
                    return false;
                } 
                var d = data.data;
            }
            if (data.label) {
                label = data.label;
            } 
        }  
        // neither data or data.data was an array, try to parse json or else give up 
        if(!d) {
            try { 
                errorcode = 0;
                var d = parseJSON(data);
                if (d.data)  {
                    if (isArray(d.data)) {
                        label  = d.label;
                        d = d.data;
                    } else {
                        errorcode = -3;
                    } 
                } else if (!isArray(d)) {
                    errorcode = -3;
                }
            } catch (e) {
                alert(e);  // FIXME: Is not portable. I guess alert is okay for portability
                errorcode = -2; // JSON failure.
            }
        } 

        if (errorcode) {
            if (isFunction(done)) { // Data not good 
                return false; // FIXME : revisit this later
                return done.call(this, errorcode); 
            } else {
                return false;
            }
        }
        /*  We Got Data now. We separate this into timestamps and OHLC
            The advantage of separating these two is that, later when we 
            need slices of the data, we'd use the timestamps to obtain 
            indices and then use those offsets in ohlc and indicators.
            it'd be efficient goin through the timestamps table */
        this.current = { ts: [], ohlc:[], vol:[], overlays:{}, indicators:[], ressupport: {}};
        this.cp.numindicators = 0; // Canvas uses this value. Need to be reset
        this.cp.label = label; // FIXME: The data should take care of it 
        var ts = [];//this.current.ts; //just for convenience
        var ohlc = [];//this.current.ohlc; //just for convenience
        var v = []; // this.current.vol;
        if (!d) { 
            var d = data;
        }
        for(var i in d) {
            ts[i] = _getDateTs(d[i][0]);
            ohlc[i] = [d[i][1], d[i][2], d[i][3], d[i][4]];
            if(d[i][5]) { 
                v[i] = d[i][5];
            }
        }
        
        this.dailydata = undefined;
        this.monthlydata = undefined;
        this.weeklydata = undefined;
        this.dailydata = {ts:ts, ohlc:ohlc, vol : v};
        if (this.interval == 1) { 
            this.timescale(ts, ohlc, v, 'weekly');
        }
        if (this.interval == 2) {  
            this.timescale(ts, ohlc, v, 'monthly');
        } 
        this.setTimeScale(this.interval);
        //this.getResSupport();
        return true;
    };
    
    /* 
     * We add last candle or 'update the last candle', If the OHLC data
     * is there, we check the timestamp with the last of the timestamp
     * of current.ts -- if they match, we update 'close' and if req.
     * high/low 
     */
    $.tickp.pushLast = function(data) {
        var ts = this.current.ts;
        var idx = this.current.ts.length - 1;
        var ohlc = this.current.ohlc;
        var vol = this.current.vol;
        if(data.length == 1) { /* just a tick, update last */

        }
        if(!isArray(data)) { /* ignore, we dont know what to do with this */

        }

        if((data.length == 6) || (data.length == 5)) { /* ts,o,h,l,c[,v] */
            var lastts = this.current.ts[idx];
            var _ts = data[0];
            var o = parseFloat(data[1]);
            var h = parseFloat(data[2]);
            var l = parseFloat(data[3]);
            var c = parseFloat(data[4]);
            var v = (data[5] === undefined) ? 0: parseFloat(data[5]); 
            if ((lastts == _ts) || ((_ts - lastts) < 100)) { /* updated the ohlc */
                ohlc[idx][3] = c; 
                if (h > ohlc[idx][1]) {
                    ohlc[idx][1] = h;
                }
                if (l < ohlc[idx][2]) {
                    ohlc[idx][2] = l;
                }
                if(vol.length > 0) 
                    vol[idx] = v; // FIXME : Check this 
            }
            if (_ts > lastts) {
                this.current.ohlc.push([o,h,l,c]);
                this.current.ts.push(_ts);
                if(vol.length > 0) 
                    this.current.vol.push(v);
                this.cp.end = this.cp.end + 1; // we need to move this further that this gets plotted.
            }
        }
        this.updateOverlays();
    };

    /* We get the resistance and support lines for the current plot. Previous highs above are resistance
       previous low below are support */ 
    $.tickp.getResSupport  = function() {
        var trend, i;
        var curtrend = 0; 
        var ohlc = this.current.ohlc;
        var last, cur;
        var ressup = this.current.ressupport;
        var cursup = -1;
        var curres = -1;

        if(this.current.ressupport.resitances === undefined)
            this.current.ressupport.resistances = [];
        if(this.current.ressupport.supports === undefined)
            this.current.ressupport.supports = [];
        var resarray = ressup.resistances;
        var suparray = ressup.supports;
        for (i = 1; i < ohlc.length; i++) {
            last = ohlc[i-1];
            cur = ohlc[i];

            if((cur[1] >= last[1]) && (cur[2] >= last[2])) { 
                trend = 1 ; // current trend 
                if(curtrend == 1) {
                    resarray.pop();
                } 
                resarray.push(cur[1]) ;
            } else 
            if ((cur[2] < last[2]) && (cur[1] < last[1])) { 
                trend = -1;
                if(curtrend == -1) {  
                    suparray.pop();
                } 
                suparray.push(cur[2]);
            } else if ((cur[1] >= last[1]) && (cur[2] < last[2])) {  
                if(curtrend == -1) { // if trend is down push the high and update low
                    resarray.push(cur[1]);
                    suparray.pop();
                    suparray.push(cur[2]);
                } else if(curtrend == 1) { 
                    suparray.push(cur[2]);
                    resarray.pop();
                    resarray.push(cur[1]);
                } else { // second candle
                    suparray.pop();
                    suparray.push(cur[2]);
                    resarray.pop();
                    resarray.push(cur[1]);
                } 
            } else {

            } 
            curtrend = trend; 
            /* 
            if(trend == curtrend) {
                continue;
            } 
            
            curtrend = trend;
            if(suparray.length == 0) 
                suparray.push(last[2]); 
            if(resarray.length == 0) 
                resarray.push(last[1]);        
            if(trend == 1) { /* now the trend is up.. push one more to the supports * /
                var lastsup = suparray[suparray.length-1];
                if(cur[2] < lastsup) {
                    suparray.pop();
                    suparray.push(cur[2]);
                } else {
                    suparray.push(last[2]);
                }
            } else if(trend == -1) {
                var lastres = resarray[resarray.length-1]; 
                if(cur[1] > lastres) { 
                    resarray.pop();
                    resarray.push(cur[1]);
                } else {
                    resarray.push(last[1]);
                }
            }  
            */
        } 
    };

    /* FIXME : complete for all overlays */
    $.tickp.updateOverlays = function() {
        for( var o in this.current.overlays) {
            var ob = this.current.overlays[o];
            var type = ob['type'];
            var par = ob['params'];
            if (type == 'ema') {
                this.delindicator(o);
                this.ema(this.current.ohlc, par[0], par[1]);
            } 
        }
    };

    $.tickp.accumulate = function(ts, data, volume, factor, name) {
        var newohlc = [], newts = [], newv = [];
        var hi,lo;
        var j = 0; 
        var t, dt, v;
        var curq, prevq; 
        
        dt = data[0];
        newohlc[0] = [dt[0], dt[1], dt[2], dt[3]]; 
        newv[0] = volume[0]; 
        newts[0] = ts[0]; 
        hi = dt[1];
        lo = dt[2]; 
        prevq = curq = (ts[0] / factor) >> 0;     
        for(var i = 1; i < ts.length; i++) {
            t = ts[i];
            dt = data[i];
            v = volume[i]; 
            curq = (t / factor) >> 0; 
            if( curq == prevq) { 
                if(dt[1] > newohlc[j][1]) 
                    newohlc[j][1] = dt[1];
                if(dt[2] < newohlc[j][2]) 
                    newohlc[j][2] = dt[2];
                newohlc[j][3] = dt[3];
                newv[j] += v; 
            } else { 
                j++; 
                newohlc[j] = [dt[0], dt[1], dt[2], dt[3]]; 
                newv[j] = v;
                newts[j] = t; 
            }
            prevq = curq;
        }
        this[name] = { ts: newts , ohlc : newohlc, vol : newv}
    };

    $.tickp.timescale = function(ts, data, volume, tmscale) {
        var cwi = -1, lwi = -1;
        var wohlc = [], wts = [], v = [];
        var whi, wlo;

        var pwd = (tmscale == 'weekly' ? 7 : 32);
        for (var i = 0; i < data.length; i++) {
            var dt = data[i]; 
            var d = new Date(ts[i]);
            var wom = (tmscale == 'weekly' ? d.getDay(): d.getDate());
            if ( wom < pwd) { // new week has started 
                cwi++; 
                wohlc[cwi] = [dt[0], dt[1], dt[2], dt[3]]; 
                wts[cwi] = ts[i]; 
                v[cwi] = volume[i];
                whi = dt[1];
                wlo = dt[2]; 
            } else { 
                if (dt[1] > whi) {
                    whi = dt[1]; 
                    wohlc[cwi][1] = whi;
                } 
                if (dt[2] < wlo) { 
                    wlo = dt[2]; 
                    wohlc[cwi][2] = wlo;
                } 
                 wohlc[cwi][3] = dt[3];
                v[cwi] += volume[i];
            } 
            pwd = wom; 
        }
        if (tmscale == 'weekly') { 
            this.weeklydata = { ts: wts, ohlc : wohlc, vol : v}; 
        } 
        if (tmscale == 'monthly') { 
            this.monthlydata = { ts: wts, ohlc: wohlc, vol : v};
        } 
    };
    
    /* FIXME : This should not be calling plot. */
    $.tickp.setTimeScale = function(ts) {
        var ts = parseInt(ts); 
        if(isNaN(ts)) ts = 0; 
        this.interval = ts;
        if (!this.dailydata) return; // just in case. 
        switch(ts) { 
            case 0:
                this.current.ohlc = this.dailydata.ohlc;
                this.current.ts = this.dailydata.ts;
                this.current.vol = this.dailydata.vol;
                this.cp.end = this.dailydata.ohlc.length;
                break;
            case 1:
                
                if(!this.weeklydata) {
                    this.timescale(this.dailydata.ts, this.dailydata.ohlc, this.dailydata.vol, 'weekly');
                }
                this.current.ohlc = this.weeklydata.ohlc;
                this.current.ts = this.weeklydata.ts;
                this.current.vol = this.weeklydata.vol;
                this.cp.end = this.weeklydata.ohlc.length;
                break;
            case 2:
                if(!this.monthlydata) {
                    this.timescale(this.dailydata.ts, this.dailydata.ohlc, this.dailydata.vol, 'monthly');
                }
                this.current.ohlc = this.monthlydata.ohlc;
                this.current.ts = this.monthlydata.ts;
                this.current.vol = this.monthlydata.vol;
                this.cp.end = this.monthlydata.ohlc.length;
                break;
            default: 
                this.current.ohlc = this.daily.ohlc;
                this.current.ts = this.daily.ts;
                this.current.vol = this.daily.vol;
                break;
        }
        // We now delete all indicators and overlays.  
        // Remember : Always use delindicator to delete an indicator. It keeps the internal
        // plot structure consistent. 
        var all = this.getindicators();
        for(var i in all) { 
            this.delindicator(i);
        } 
        this.plot();
    };
                
    /* zooming.. basically this is very simple . We change the cpminwidth 
        value and replot
    */
    $.tickp.zoom = function(up) {
        if (up) { 
            this.cp.cwidth += 2;
            if (this.cp.cwidth > 40) {
                this.cp.cwidth = 40;
            }
        } else { 
            this.cp.cwidth -= 2;
            if (this.cp.cwidth < 2) {
                this.cp.cwidth = 2;
            }
        } 
        this.plot();
    };
        
    /* The function below returns an array of values for Y axis for Grid
    Display. Basic algorithm is given below - 
    Figure out the closest separator value from the lookup 
    for given input and then return ceil of min to floor of max times the
    separator in an array. Those will be our grid points. 
    Loved, this piece of code. Not brilliant, but very clever, hopefully
    should scale from Penny stocks to Zimbabwe market */ 
    $.tickp._ygrid = function(ymin, ymax, howmany) {
        var approx = (ymax - ymin)/howmany;
        lookup = [0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 25.0, 50.0, 
             100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0, 
             10000.0, 25000.0];

        var na = []
        for (i in lookup) {
            var b = lookup[i]/approx;
            if (b < 1.0) { b = 1/b; } 
            na.push(b);
        }
        var closest = lookup[na.indexOf(Math.min.apply(this,na))];
        var minindex = Math.ceil(ymin/closest); 
        var maxindex = Math.floor(ymax/closest);
        vals = [];
        for(var j = minindex; j <= maxindex; j++) { 
            vals.push(j*closest);
        }

        return vals;
    };

    /* when we plot we are not going to plot more than _window amount of 
       data. So we call this function before plotting. Or it might get
        automatically called depending upon date range being too long
        TODO: Implement date ranges. 
        This is the most important internal function in plotting. 
        This function, first determines the range of data that is to be
        plot. Then it figures out the chart specific parameters. Most 
        important being (xmin, xmax, ymin, ymax) and it returns these
        values to the caller. But this function just doesn't do that much
        it also - determines whether 'log' mode is required. 
        it also - initiates the values of the chartparams object (which
        the drawing function would later use.) 
     */
    $.tickp._window = function(data, overlays, shift, datelo, datehi) {

        /* right now only intializes chart params using data.*/
        var cp = this.cp;

        var w = this.plotwidth;
        /* Determine howmany candles to display and get their begin and
            end offsets. */
        var begin, end, howmany = 0, capacity = 0;
        var oldbegin, oldoffset, oldend, oldcapacity; 

        oldend = cp.end || data.length;
        shift = shift || 0; 
        capacity = (w / cp.cwidth) >> 0;
       
        oldoffset = cp.offset || 0;
        
        oldcapacity = capacity - oldoffset; 
        oldbegin = cp.begin || 0;

        if(shift < 0) { // scroll left 
            newoffset = oldoffset + shift; 
            if (newoffset < 0) {  
                cp.offset = 0; 
                newbegin = oldbegin - newoffset; 
                newcapacity = oldcapacity + oldoffset; 
            } else {
                newcapacity = oldcapacity - shift; 
                newbegin = oldbegin; 
                cp.offset = newoffset; 
            }  
            newend = newbegin + newcapacity;
            if(newend > data.length) 
                newend = data.length;
            cp.begin = newbegin;
            cp.end = newend; 
        } else if (shift > 0) { 
                newbegin = oldbegin - shift; 
                if(newbegin < 0) { 
                    cp.begin = 0; 
                    newcapacity = oldcapacity + newbegin; 
                    newoffset = oldoffset - newbegin; 
                } else {
                    cp.begin = newbegin;
                    newoffset = oldoffset; 
                    newcapacity = oldcapacity;
                }  
                newend = newbegin + newcapacity;
                if(newend > data.length) {
                    newend = data.length;
                } 
                cp.end = newend;
                cp.offset = newoffset; 
        } else { // shift is zero 
            cp.end = oldend;
            cp.begin = cp.end - oldcapacity;
            if(cp.begin < 0) 
                cp.begin = 0;
        } 

        if (cp.begin >= data.length) { 
            cp.begin = cp.end = data.length-1;
        } 
        
        console.log(shift,cp.begin, cp.end, cp.offset, howmany);
            
        /* if (cp.end > data.length) {
            cp.end = data.length;
        }  we do allow to scroll more right */
        /* if (cp.begin < 0) {
            cp.begin = 0;
            cp.end = cp.begin + howmany;
        }  we do allow to scroll more left */ 

        // -- nasty code begins : Note above code substantially simpliefies it,
        //    still, I'd keep this for some time and get rid of it, once I am convinced
        /* if (!(shift === undefined)) {
            if(cp.candles == data.length) { // no panning is required

                return { xmin:cp.begin, xmax: cp.end, ymin:cp.ymin, ymax:cp.ymax};
            } else { 
                howmany = cp.candles;
            } 
            begin = cp.begin - shift;
            if (begin < 0) {
                begin = 0; 
            } 
        } else {
            howmany = data.length;

            if(howmany > ((w)/cp.minwidth)) {
                howmany = Math.round(w/cp.minwidth);
            } 
            begin = data.length - howmany;
        } 
        end = begin + howmany;
        if (end > data.length) { 
            end = data.length;
            begin = end - howmany;
        }  */ 

        // -- nasty code ends 

        /* Stuff needed to determine width of candles */
        /*cp.candles = howmany;
         cp.cwidth = Math.floor((w)/cp.candles);
        if (cp.cwidth > 40) {
            cp.cwidth = 40;
        } */

        /* Y range is going to be dynamic get, min and max from data */
        var max, min;
        var d_ = _minmax2d(data.slice(cp.begin, cp.end));
        min = d_[0], max = d_[1];

        /* Indicators overlayed should fit in the frame. So determine the 
           real 'min/max' by using the overlays data as well.  */
        if (overlays) { 
            for( var j in overlays) { 
                var omax, omin;
                if (!j.search('bbands')) {
                    d_ = _minmax2d(overlays[j].data.slice(begin, begin+howmany));
                } else { 
                    d_ = _minmax1d(overlays[j].data.slice(begin, begin+howmany));
                } 
                omin = d_[0], omax = d_[1];
                if (omax > max) max = omax;
                if (omin < min) min = omin;
            } 
        } 

        if ((max/min > 2.0) && cp.autoscale) {
            cp.logscale = true;
        }
        var range = max - min; 
        cp.ymin = min - (0.05*range); // little margin below
        cp.ymax = max + (0.05*range); // little margin above 

        if(cp.logscale) { 
            min = 0.9 * min; 
            max = 1.1 * max; 
            cp.ymin = Math.log(min);
            if(isNaN(cp.ymin)) { 
                /* bollingers might go negative n stock split, for which Math.log is not defined. 
                   we set the min to 0 for now */ 
                cp.ymin = 0;
            } 
            cp.ymax = Math.log(max);
        }
        return { xmin:cp.begin, xmax: cp.end, ymin:cp.ymin, ymax:cp.ymax};
    };

    $.tickp._idxToDate = function(i) { 
        var ts = this.current.ts[i];
        if (ts === undefined)  
            return ts
        return _tsToDate(ts);
    };
    
    /* Returns an array of objects -- with following format i
        { index: idx , label : the text, bold : true/false*/
    $.tickp.getLabels = function(xmin, xmax) {
    /* first get the scale */ 
        var cwidth = this.cp.cwidth;
        var pwidth = (xmax - xmin ) * cwidth; 
        var labelObjects = [];
       
        var numLabels = pwidth / 100;  
        if (numlables = 1) {
            numLabels = 2 ; 
        }
        
        var d = new Date(this.ts[xmin]);
        for (var i = xmin; i < xmax; i++) {

        } 
    };
})(window);
