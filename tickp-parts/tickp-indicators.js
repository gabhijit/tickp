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
    $.tickp.addindicator = function(type, params) {
        // We don't assume that client has validated params. It's better to validate again
        if (!validParams(type, params)) return false;
        var success = true;
        if(this.supported.indexOf(type) == -1) { 
            return false;
        }
        // max number of indicators we support .. 
        if (this.cp.numoverlays > 7) { 
            return false;
        } 
        // Some indicator specific checks go here . 
        switch(type) { 
        case 'ema': 
        case 'sma': 
            var period = parseInt(params[1]);
            var which = params[0];
            if(type == 'ema') { 
                this.ema(this.current.ohlc, period, which);
            } else {
                this.sma(this.current.ohlc, period, which);
            } 
            break;

        case 'psar':
            var af = parseFloat(params[0]);
            var maxaf = parseFloat(params[1]);
            if (maxaf < af) {
                af = parseFloat(params[1]);
                maxaf = parseFloat(params[0]);
            }
            if (maxaf > 0.5) { // user doesn't know what he's doing. We enforce! 'bad' but can't think of a better way..
                // 0.5 is our upper limit for maxaf
                maxaf = 0.5
            }
            this.psar(this.current.ohlc,af,maxaf);
            break;
        case 'bbands':
            var period = parseInt(params[0]);
            var mult = parseFloat(params[1]);

            if (mult > 2.0) { // user doesn't know what he's doing, we enforce for now. 
                mult = 2.0;
            } 
            this.bbands(this.current.ohlc, period, mult);
            break;
        case 'macd': 
            var p1 = parseInt(params[0])
            var p2 = parseInt(params[1])
            var signal = parseInt(params[2])
    
            if(p1 > p2) { 
                p1 = p2; 
                p2 = parseInt(params[0]);
            }
            this.macd(this.current.ohlc, p1, p2, signal);
            break;
        case 'rsi':
            var lookback = parseInt(params[0]);
            this.rsi(this.current.ohlc, lookback);
            break;
        case 'stoch':
            var k = parseInt(params[0]);
            var x = parseInt(params[1]);
            var d = parseInt(params[2]);
            // FIXME : any validations? 
            this.stoch(this.current.ohlc, k, x, d);
        default: 
            break;
        } 
        if(success) {
            this.plot();
        } 
    };

    $.tickp.delindicator = function(which) { 

        if(which in this.current.overlays) {
            delete this.current.overlays[which];
            this.cp.numoverlays -= 1; 
            this.plot();
            return;
        }

        for(var j in this.current.indicators) { 
            if (which == this.current.indicators[j].str) { 
                delete this.current.indicators[j];
                this.cp.numindicators -= 1; 
                this.plot();
                return;
            } 
        } 
    };  
    
    // sends the list of current indicators to the caller. Used in UI to Delete any indicators if not wanted
    $.tickp.getindicators = function() {
        var ilist = [];
        if(!this.current) { 
            return ilist;
        } 
        for(var j in this.current.overlays) { 
            ilist.push(j);
        } 
        for(var j in this.current.indicators) { 
            ilist.push(this.current.indicators[j].str);
        } 
        return ilist;
    };

    $.tickp._olexists = function(prop) {
        return (prop in this.current.overlays);
    }; 
    /* 
        TA functions: will be called in one of the following ways
          1. explicitely. (eg. Someone through UI ads an indicator) 
          2. Upon loading the original data, some indicators may be part of 
             'default' template. So the functions below get called.
     */

    /* 
     * ema: is a TA-API, and _ema is an internal API, some other indicators 
            like macd, use this. so it's better to keep them separate 
     */
    $.tickp.ema = function(data, period, which) {
        which = which || 'close'; 
        var prop = 'ema'; + period + which;
        var par = [period, which];
        
        if(this._olexists(prop)) {
            return;
        } 
        var o;
        switch(which) {
            case 'close':
                o = 3;
                break;
            case 'high': 
                o = 1;
                break;
            case 'low': 
                o = 2; 
                break;
            default:
                o = 3;
        }
        var d = [];
        for(var i = 0; i < data.length; d.push(data[i++][o]));
        var e = this._ema(d, period, which); 
        this.current.overlays[prop] = {data: e, offset:this.cs.oloffset, params: par, type: 'ema'};
        this.cs.oloffset += 1;
        this.cp.numoverlays += 1;

        return this;

    };

    $.tickp._ema = function(data, period, which) {
        var e_ = [];
        var mult = 2.0/(period+1);

        e_[0] = data[0];
        // We should be able to handle sparse data. Also, data
        // that is undefined or null at the beginning
        for(var i = 1; i < data.length; i++) {
            if (data[i] === undefined || data[i] === null ) {
                e_[i] = e_[i-1];
                continue;
            } 
            if(e_[i-1]) { 
                e_[i] = (data[i]*mult) + (1 - mult) * e_[i-1];
            } else {
                e_[i] = data[i];
            } 
        }
        return e_;
    };

    /* simple moving average : really simple */
    $.tickp.sma = function(data, period, which) {
        which = which || 'close';
        var o;
        switch(which) {
            case 'close':
                o = 3;
                break;
            case 'high':
                o = 1;
                break;
            case 'low' :
                o = 2;
                break;
            default:
                o = 3;
        }
        var prop = 'sma' + period + which;
        if(this._olexists(prop)) {
            return;
        } 
        var s_ = [];
        var _sum = 0;
        period = period - 1;
        for(i = 0; i < data.length; i++) { 
            if(i < period) { 
                s_[i] = undefined;
                continue;
            }
            var t = data.slice(i-period, i+1);
            _sum = 0; 
            for( j in t) { 
                _sum += t[j][o];

            };
            s_[i] = _sum/(period+1);
        }
        this.current.overlays[prop] = {data:s_, offset: this.cs.oloffset};
        this.cs.oloffset++;
        this.cp.numoverlays +=1 ;
        return this;    
    };

    /* parabolic SAR */ 
    $.tickp.psar = function(data, af, maxaf) {
        var i = 0, UP = 1, DOWN = 2;
        var currtrend = UP;
        var curraf = af;
        var updated = false;
        var d;
        var trendmin, trendmax;
        var prop = 'psar' + af + '-' + maxaf;

        if (this._olexists(prop)) {
            return;
        } 
        var p_ = [];
        for (i in data) {
            d = data[i];
            j = parseInt(i);
            if (i == 0) {
                p_[j+1] = d[2]; p_[j] = d[2];
                trendmin = d[2];
                trendmax = d[1];
                continue;
            }
            if (currtrend == UP) { 
                if(d[1] > trendmax) { 
                    trendmax = d[1];
                    p_[j+1] = p_[j] + curraf*(trendmax - p_[j]);
                    curraf = curraf + af;
                    updated = true;
                }
                if (d[2] < p_[j]) { 
                    p_[j] = trendmax;
                    p_[j+1] = trendmax;
                    curraf = af; 
                    currtrend = DOWN;
                    trendmin = d[2];
                    trendmax = d[1];
                    updated = true;
                } 
            } 
            if (currtrend == DOWN) { 
                if(d[2] < trendmin) { 
                    trendmin = d[2];
                    p_[j+1] = p_[j] + curraf*(trendmin - p_[j]); 
                    curraf = curraf + af;
                    updated = true;
                }
                if (d[1] > p_[j]) { 
                    p_[j] = trendmin;
                    p_[j+1] = trendmin;
                    curraf = af; 
                    currtrend = UP;
                    trendmin = d[2];
                    trendmax = d[1];
                    updated = true;
                } 
            } 
            if (! updated) { 
                if(currtrend == UP) 
                    p_[j+1] = p_[j] + curraf*(trendmax - p_[j]); 
                else 
                    p_[j+1] = p_[j] + curraf*(trendmin - p_[j]); 
            } 
            updated = false;
            if (curraf > maxaf) {curraf = maxaf;}
        }
        this.current.overlays[prop] = {data: p_ };
        this.cp.numoverlays +=1 ;
        return this;
    };

    $.tickp.bbands = function(data,period, mult) {  

        var b_ = []; 
        var prop = 'bbands' + period  + '-' + mult;

        if (this._olexists(prop)) { 
            return;
        } 
        period = period - 1; 
        for (var i = 0; i < data.length; i++) { 
            if( i < period) { 
                b_[i] = [undefined, undefined, undefined];
                continue;
            } 
            var t = data.slice(i-period, i+1); 
            var tc = [];
            var _s = 0;
            for (j in t) { 
                _s = _s + t[j][3];
                tc.push(t[j][3]);
            } 
            var sigma = stats.pstdev(tc);
            var mu = _s/(period+1);
            b_[i] = [ (mu +  mult*sigma), mu, (mu - mult * sigma)];
        }
        this.current.overlays[prop] = { data: b_ };
        this.cp.numoverlays += 1;
        return this;
    };

    /* p1 : is a faster Moving average (numerically lower) 
       p2 : is a slower Moving average (numerically higher)
       signal : is ema signal of p1 - p2 
    */
    $.tickp.macd = function(data, p1, p2, signal) {
        var istr = 'MACD(' + p1 + ', ' + p2 + ', ' + signal + ')';
        for(var i in this.current.indicators) { 
            if (this.current.indicators[i].str == istr)
                return;
        } 
        var d = [];
        for(var i = 0; i < data.length; d.push(data[i++][3]));
        var ep1 = this._ema(d, p1);   
        var ep2 = this._ema(d, p2);   
        for(var i = 0; i < ep1.length; i++) { 
            ep1[i] = ep1[i] - ep2[i];
        } 
        ep2 = this._ema(ep1, signal);
        var m_ = [];
        for(i = 0; i < ep1.length; i++) { 
            m_[i] = [ep1[i], ep2[i], (ep1[i] - ep2[i])]; 
        }
        var i = {type : 'macd', data:m_, str: istr};
        this.current.indicators.push(i);
        this.cp.numindicators += 1;
        return this;
    };

    $.tickp.rsi = function(data, lookback) {
        var up = 0, down = 0;
        var rs; 

        var istr = 'RSI(' +  lookback + ')';
        for(var i in this.current.indicators) { 
            if (this.current.indicators[i].str == istr)
                return;
        } 

        var rsi = [undefined]; // empty array plus initialization for 0.
        var prev = data[0][3];
        if (lookback > data.length) lookback = data.length;
        for(var i = 1; i < lookback; i++) { 
            var diff = data[i][3] - prev;
            if (diff > 0 ) { 
                up = up + diff;
            } else { 
                down = down - diff;
            } 
            rsi.push(undefined);
            prev = data[i][3];
        }
        up /= lookback;
        down /= lookback;
        rs = up/down;
        for (var i = lookback; i < data.length; i++) { 
            var diff = data[i][3] - prev;
            rsi[i] = 100 - 100/(1+rs); 
            if(diff >= 0) {
                up = (up*(lookback-1)+diff)/lookback;
                down = down*(lookback-1)/lookback;
            } else { 
                down = (down*(lookback-1)-diff)/lookback;
                up = up*(lookback-1)/lookback;
            }; 
            rs = up/down;
            prev = data[i][3];
        }

        var i = {type : 'rsi', data:rsi, str: istr} 
        this.current.indicators.push(i);
        this.cp.numindicators += 1;
    };

    $.tickp.stoch = function(data, k, x, d) { 
        var min, max, pk, d_;
        var istr = 'STOCH( ' + k + ', ' + x + ', ' + d + ')';
        for(var i in this.current.indicators) { 
            if (this.current.indicators[i].str == istr)
                return;
        } 
        k = k -1 ;
        pk = [];
        for(i = 0; i < k; pk[i++] = undefined); 
        for(var i = k; i < data.length; i++) { 
            d_ = _minmax2d(data.slice(i-k, i+1));
            min = d_[0]; max = d_[1];

            pk[i] = (data[i][3] - min)/(max - min) * 100;
        }
        var pk_ = this._ema(pk,x);
        var pd_ = this._ema(pk_,x);

        for(i = 0;i < data.length; i++) { 
            pk_[i] = [pk_[i] , pd_[i]];
        }
        var i = {type : 'stoch', data:pk_, str: istr};
        this.current.indicators.push(i);
        this.cp.numindicators += 1;
    };
    // The following validation should ideally be done by the client who calls us
    // but, let's not assume client actually validates, we validate is again.
    // better idea may be to move such functions into utils and have 'optionally' include utils 
    function validParams(type, params) {
        var notalpha = /[^a-z]+/g
        var notnumeric = /[^0-9]+/g
        var isfloat = /(^\.|[0-9]+\.)[0-9]+$/g
        switch(type) {
        case 'ema':
        case 'sma':
            if (params.length != 2) {
                return false;
            } 
            if (params[0].match(notalpha)) { 
                return false;
            } 
            if (params[1].match(notnumeric)) { 
                return false;
            }   
            var validmas = ['open', 'high', 'low', 'close']
            var matched = false;
            for (i in validmas) { 
                if (validmas[i] === params[0]) {
                    matched = true;
                } 
            }
            if(!matched) vmsg = 'first parameter is not one of open,high,low,close';
            return matched;
        case 'bbands':
        case 'psar':
            if(params.length != 2) { 
                vmsg = 'Invalid length of params: expected 2, received ' + params.length;
                return false;
            }
            for (var i in params) { 
                if (params[i].match(notnumeric) && !params[i].match(isfloat)) {
                    return false; 
                }
            }
            return true;
    
        case 'stoch':
        case 'macd' : 
            if (params.length != 3) {
                return false;
            }
            for (var i in params) { 
                if(params[i].match(notnumeric)) { 
                    return false; 
                } 
            }
            return true;
        
         case 'rsi': 
            if(params.length != 1) { 
                return false;
            } 
            if (params[0].match(notnumeric)) { 
                return false;
            } 
            return true;
         default:
            return false;
        }

        // if we come here, something is wrong, so let's return false
        return false;
    };
})(window); 
