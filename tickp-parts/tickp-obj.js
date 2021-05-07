/* 
 * A simple utility for plotting objects on the graph. The objects should be 
 * such that they can be moved around or edited on the graph. 
 */ 
(function ($$){
    
    var drawingModes = { 
        NEW_OBJECT  : 1,
        EDIT_OBJECT : 2 
    }; 

    $$.mode = 0;
    $$.plotObjects = [];
    $$.actionPoints = []; 
    $$.current = undefined; 

    function actionPoint(x1,y1, label, obj) { 
        this.x = x1;
        this.y = y1;
        this.actiontxt = label || ''; 
        this.obj = obj ; 
    }; 
 
    function Line(x1, y1, x2, y2) { 
        this.startx = x1;
        this.starty = y1;
        this.endx = x2; 
        this.endy = y2; 

    }; 

    function singleChannel(ctx) { 
        this.type = 'channel';
        this.distance = 40; /* FIXME : Hard coded */
        this.lines = [];
        this.points = []; 
        this.centroid = undefined;
        this.drawing = false;
        this.editing = false;
        this.selected = false; 
        this.ctx = ctx; 
        this.id = Math.random() * 100000; // just some random ID  
    };

    /* All methods of singleChannel will be common */ 
    singleChannel.prototype = { 
        
        /* called by the canvas mouse down event handler */ 
        startDrawing : function(e) {   
            var myx = e.pageX - _ElemPageOffsetX(e.currentTarget);
            var myy = e.pageY - _ElemPageOffsetY(e.currentTarget);
            
            var line1 = new Line(myx,myy,myx,myy);
            var line2 = new Line(0,0,0,0);
            this.lines.push(line1);
            this.lines.push(line2);

            this.drawing = true; 
        }, 

        continueDrawing : function(e) { 
            var myx = e.pageX - _ElemPageOffsetX(e.currentTarget);
            var myy = e.pageY - _ElemPageOffsetY(e.currentTarget);

            if(!this.drawing) 
                return;

            var line1 = this.lines[0];   
            line1.endx = myx;
            line1.endy = myy;
           
            var x1 = line1.startx, y1 = line1.starty, x2 = line1.endx, y2 = line1.endy;     
            this.lines.pop();
            var o = lineAtaDistance(x1,y1, x2, y2, this.distance);  
            var l = new Line(o.startx,o.starty, o.endx, o.endy);
            this.lines.push(l);
        }, 

        endDrawing : function(e) { 
            this.drawing = false;
            this._finishObject();
            // Once we finish plotting the object. We define action Points
        },

        startEditing : function(e, pt) { 
            var myx = e.pageX - _ElemPageOffsetX(e.currentTarget);
            var myy = e.pageY - _ElemPageOffsetY(e.currentTarget);
            var cpi = this.points.indexOf(pt); 
            var cp;
            
            if(cpi < 0 || cpi > 3 ) { // Not going to work  
                return; 
            } 
            this.selectedap = cpi; // will be referred by the editFunction 
 
            cp = this.points[cpi]; 
            if(Math.abs(cp.x - myx) <= 3 && Math.abs(cp.y - myy) <= 3) { /* point is close enough */
                this.editing = true; 
            
                if(cpi == 0) {  
                    this.continueEditing = this.editLine1;
                } else if(cpi == 1) { 
                    this.continueEditing = this.moveLines; 
                } else if ( cpi == 2) { 
                    this.continueEditing = this.editLine1;   
                } else if ( cpi == 3) { 
                    this.continueEditing = this.editLine2; 
                } 
                this.apselect = cp;
            } else { 
                this.editing = false; 
                this.continueEditing = this.nullContinueEdit; 
            }
        },

        nullContinueEdit : function(e) { 
            // do nothing 
        }, 

        endEditing : function(e) { 
            this.editing = false; 
            this._finishObject();
        },  
    
        editLine1 : function(e) {
            var myx = e.pageX - _ElemPageOffsetX(e.currentTarget);
            var myy = e.pageY - _ElemPageOffsetY(e.currentTarget);
    
            var selected = this.selectedap;  
            if(selected != 0 && selected != 2) { 
                return; 
            } 
            
            var line1 = this.lines[0]; 
            var origx, origy, offx, offy;
            var line2 = this.lines[1]; 
            if(selected == 0) {
                origx = line1.startx;
                origy = line1.starty;
                line1.startx = myx;
                line1.starty = myy; 
                offx = myx - origx;
                offy = myy - origy; 
                line2.startx += offx;
                line2.starty += offy;
            } else if(selected == 2) { 
                origx = line1.endx;
                origy = line1.endy;
                line1.endx = myx;
                line1.endy = myy;
                offx = myx - origx;
                offy = myy - origy; 
                line2.endx += offx;
                line2.endy += offy;
            } 
             
            /* this.lines = [];
            this.lines.push(line1);
            var x1 = line1.startx, y1 = line1.starty, x2 = line1.endx, y2 = line1.endy;
            var o = lineAtaDistance(x1,y1, x2, y2, this.distance);  
            var l = new Line(o.startx,o.starty, o.endx, o.endy);
            this.lines.push(l);*/
        }, 

        moveLines : function(e) {
            var myx = e.pageX - _ElemPageOffsetX(e.currentTarget);
            var myy = e.pageY - _ElemPageOffsetY(e.currentTarget);
            var ap; 
            var selected = this.selectedap;
            if(selected != 1) 
                return; 
            ap = this.points[selected]; 
            var offx = myx - ap.x, offy = myy - ap.y ; 
            for (i = 0; i < this.lines.length; i++) { 
                var line = this.lines[i]; 
                line.startx += offx; 
                line.starty += offy;
                line.endx += offx;
                line.endy += offy; 
            } 
            ap.x = myx;
            ap.y = myy;
        }, 

        editLine2 : function(e) { 
            var myx = e.pageX - _ElemPageOffsetX(e.currentTarget);
            var myy = e.pageY - _ElemPageOffsetY(e.currentTarget);

            var selected = this.selectedap;
            if(selected != 3) 
                return; 

            var ap; 
            ap = this.points[selected]; 
            
            var line1 = this.lines[0];
            var ux = line1.endx - line1.startx;
            var uy = line1.endy - line1.starty;
            
            var length = Math.sqrt(ux*ux + uy*uy); 
            var x1,y1,x2,y2 = 0;
            x1 = myx;
            y1 = myy;
            x2 = myx + ux; //* length;
            y2 = myy + uy; //* length;
            
            this.lines[1] = {startx : x1, starty : y1, endx : x2, endy : y2}; 
        },  

        draw : function() { 
            var ctx = this.ctx;
            var lines = this.lines;
            var i;

            /* FIXME : May be move this in a global Draw? */
            ctx.beginPath();
            ctx.strokeStyle = "#0d0d0d";
            ctx.lineWidth = 2;
            for(i = 0;i < lines.length ; i++) {
                ctx.moveTo(lines[i].startx-0.5, lines[i].starty-0.5);
                ctx.lineTo(lines[i].endx-0.5, lines[i].endy-0.5); 
            }  
            ctx.stroke();
            ctx.closePath();

            if (this.editing) 
                return; 

            var pts = this.points;
            for(i = 0; i < pts.length; i++) { 
                var pt = pts[i];
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(pt.x-2, pt.y-2, 4, 4); 
            }
            /* FIXME : complete the other part */
        },  

        select : function() {
            this.selected = true; 
        },

        /* Internal function to assign action points to the object */
        _finishObject : function() { 
            var l1 = this.lines[0];
            var x1 = l1.startx, y1 = l1.starty, x2 = l1.endx, y2 = l1.endy;
            var xm = (x1 + x2) / 2;
            var ym = (y1 + y2) / 2;  
            var l2 = this.lines[1]; 
            var x3 = l2.startx, y3 = l2.starty;

            this.points = []; // first empty the array  
            var ap1 = new actionPoint(x1, y1, 'Click and drag to move the line', this);
            var ap2 = new actionPoint(xm, ym, 'Click and drag to move the channel', this);
            var ap3 = new actionPoint(x2, y2, 'Click and drag to move the line', this); 
            var ap4 = new actionPoint(x3, y3, 'Click and drag to move the line', this); 
            this.points.push(ap1); 
            this.points.push(ap2); 
            this.points.push(ap3); 
            this.points.push(ap4); 
        }, 

        /* Get the closest action point */ 
        _getClosestPoint: function(x,y) { 
            var cp = undefined; 
            var i; 
            var pts = this.points; 
            var mindistance = Infinity, distance; 
            var ptx, pty;
            for (i = 0; i < pts.length; i++) {  
                ptx = pts[i].x - x;
                pty = pts[i].y - y;
                
                distance = ptx * ptx + pty * pty; 
                if(distance <= mindistance) { 
                    cp = i;
                    mindistance = distance; 
                } 
            } 
            return cp;
        },  

    }; 

    var c = window.$("#ctest")[0];
    var ctx = c.getContext("2d");  

    /* simple dispatcher that calls the actual mouse handler */ 
    var handleMouseDown = function(event) { 

        if(this.mode == drawingModes.NEW_OBJECT) {
            var channel = new singleChannel(ctx);
            channel.startDrawing(event); 
            $$.current = channel;
            $$.plotObjects.push($$.current); 
        } else if(this.mode == drawingModes.EDIT_OBJECT) {
            // $$.current = $$.plotObjects[$$.plotObjects.length-1]; // For simplicity  
            var pt = pointToObject(event);
            $$.current = pt.obj; 
            if($$.current) 
                $$.current.startEditing(event, pt);
        } 
    };

    var handleMouseMove = function(event) { 
        if($$.current) { 
            if(this.mode == drawingModes.NEW_OBJECT) {
                $$.current.continueDrawing(event);
            } else if(this.mode == drawingModes.EDIT_OBJECT) { 
                $$.current.continueEditing(event);
            }
        } 

    };

    var handleMouseUp = function(event) {
        if($$.current) { 
            if(this.mode == drawingModes.NEW_OBJECT) {
                $$.current.endDrawing(event);
                this.mode = drawingModes.EDIT_OBJECT;
            } else if(this.mode == drawingModes.EDIT_OBJECT) { 
                $$.current.endEditing(event);
            }
            _deleteAPsForObj($$.current); 
            _addAPsForObj($$.current); 
        } 
        $$.current = undefined;
    };

    function lineAtaDistance(x1, y1, x2, y2, d) {
        var vx = x2 - x1;
        var vy = y2 - y1; 
        var len = Math.sqrt(vx*vx + vy*vy);
        var ux = -vy/len;
        var uy = vx/len;  

        var x3 = x1 + ux * d;
        var y3 = y1 + uy * d;
        var x4 = x2 + ux * d;
        var y4 = y2 + uy * d;
 
        return { startx : x3, starty : y3, endx : x4, endy : y4 } ; 
    }

    var _ElemPageOffsetX = function(e) {
            var ox = 0;
            do {
                ox += e.offsetLeft;
            } while (e = e.offsetParent) ; // from quirksmode 
            return ox;
    };

    var _ElemPageOffsetY = function(e) {
            var oy = 0;
            do {
                oy += e.offsetTop;
            } while (e = e.offsetParent) ; // from quirksmode 
            return oy;
    };


    function pointToObject(event) { 
        var myx = event.pageX - _ElemPageOffsetX(event.currentTarget);
        var myy = event.pageY - _ElemPageOffsetY(event.currentTarget);

        var o = undefined; 
        var pts = $$.actionPoints; 
        var mindistance = Infinity, distance; 
        var ptx, pty;
        for (i = 0; i < pts.length; i++) {  
            ptx = pts[i].x - myx;
            pty = pts[i].y - myy;
            
            distance = ptx * ptx + pty * pty; 
            if(distance <= mindistance) { 
                o = pts[i]; 
                mindistance = distance; 
            } 
        } 
        return o;
    } 
    function _deleteAPsForObj(obj) { 
        for (var i = 0; i < $$.actionPoints.length; i++) { 
            if($$.actionPoints[i].obj === obj) { 
                $$.actionPoints.splice(i,1);
                i--;
            }
        }
    };

    function _addAPsForObj(obj) { 
        for (var i = 0; i < obj.points.length; i++) {
            $$.actionPoints.unshift(obj.points[i]); // we add to the beginning. 
        } 
    };
 
    c.mode = drawingModes.NEW_OBJECT;
    c.addEventListener('mousedown', handleMouseDown, false);
    c.addEventListener("mousemove", handleMouseMove, false);
    c.addEventListener("mouseup", handleMouseUp, false);
    /* Our paint function fired every few milliseconds */
    setInterval(drawAllObjects, 30); 

    function drawAllObjects() { 
        var i;
        ctx.clearRect(0,0,800,600); 
        for (i in $$.plotObjects) {
               $$.plotObjects[i].draw();
        } 
    } 
})(window);
