
DEBUG = false;


//============
// utils
//============

window.requestAnimFrame = function() { return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function( a ) { window.setTimeout( a, 1E3 / 60 ) } }();

//--------------
var deg2rad = Math.PI / 180;
var rad2deg = 180 / Math.PI;
var twoPI = Math.PI * 2;
var DIRECTION = ["west", "north", "east", "south"];

var getHSLA = function( h, s, l, a ) {
    return 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')';
};

Object.extend = function( obj, extension ) {
    for ( var prop in extension )
        obj[prop] = extension[prop];

    return obj;
};

Array.prototype.clean = function( deleteValue ) {
    for ( var i = 0; i < this.length; i++ ) {
        if ( this[i] == deleteValue ) {
            this.splice( i, 1 );
            i--;
        }
    }
    return this;
};


//--------------
// global variables (pleonasm for "to clean up")
var canvasEl = document.getElementById( 'canvas' );

var ctx = canvasEl.getContext( '2d' );

window.onresize = function() {
    canvasEl.width = canvasEl.offsetWidth;
    canvasEl.height = canvasEl.offsetHeight;
};

var mouse;

window.onmousemove = function( e ) {
    mouse = { x: e.x, y: e.y };
};
//============




//============
// Game
//============

Game = function( opt ) {
    Object.extend( this, opt );

    window.onresize();

    this.width = canvasEl.width;
    this.height = canvasEl.height;
    this.nbWBlocks = Math.floor( this.width / this.blockSize );
    this.nbHBlocks = Math.floor( this.height / this.blockSize );

    this.init();

};

Game.prototype.blockSize = 32;
Game.prototype.players = [];
Game.prototype.blocks = [];
Game.prototype.grid = undefined;
Game.prototype.props = [];

Game.prototype.init = function() {

    var blockSize = this.blockSize;

    //--------
    // blocks
    var ratioEmptyBlocks = 0.6;

    for ( var i = 0; i < this.nbWBlocks; i++ )
        for ( var j = 0; j < this.nbHBlocks; j++ ) {

            this.blocks.push(
              new Block( this, {
                  x: j * blockSize,
                  y: i * blockSize,
                  size: blockSize,
                  type: ( Math.random() > ratioEmptyBlocks ) ? "EMPTY" : "MUD"
              } )
            );

        }

    //--------
    // players
    this.players.push(
      this.makeRoomForPlayer( new Player( this, {
          color: getHSLA( 120, 100, 50, 0.9 ),
          x: blockSize / 2, y: blockSize / 2,
          size: 21
      } ), 4 )
    );

    // this.players.push(
    //   this.makeRoomForPlayer( new Player( this, {
    //     color: getHSLA( 228, 100, 50, 0.9 ),
    //     x: blockSize*(this.nbWBlocks-1) + blockSize/2, y: blockSize*(this.nbHBlocks-1) + blockSize/2
    //   }), 4 )
    // );

    this.player = this.players[0];

    //--------
    // grid
    this.grid = new Grid( this, { thickness: 1 } );

    //--------
    // input
    this.input = new Input( this, {} );

};

Game.prototype.update = function() {

    if ( canvasEl.width != this.width || canvasEl.height != this.height ) {
        this.width = canvasEl.width;
        this.height = canvasEl.height;
        this.grid.nbWBlocks = this.width / this.blockSize;
        this.grid.nbHBlocks = this.height / this.blockSize;
    }

    //--------
    // grid
    this.grid.update();

    //--------
    // blocks
    var allBlocks = this.blocks;
    for ( var i = 0; i < allBlocks.length; i++ ) {
        allBlocks[i].update();
    }

    //--------
    // players
    var allPlayers = this.players;
    for ( var i = 0; i < allPlayers.length; i++ ) {
        allPlayers[i].update( ctx );
    }

};

Game.prototype.render = function( ctx ) {

    //--------
    // grid
    this.grid.render( ctx );

    //--------
    // blocks
    var allBlocks = this.blocks;
    for ( var i = 0; i < allBlocks.length; i++ ) {
        allBlocks[i].render( ctx );
    }

    //--------
    // players
    var allPlayers = this.players;
    for ( var i = 0; i < allPlayers.length; i++ ) {
        allPlayers[i].render( ctx );
    }
};

Game.prototype.getBlock = function( posX, posY ) {
    return this.blocks[Math.round( posX + this.nbHBlocks * posY )];
};

Game.prototype.getBlockAt = function( x, y ) {
    return this.getBlock( Math.floor( x / this.blockSize ), Math.floor( y / this.blockSize ) );
};

Game.prototype.getNextBlockAt = function( x, y, direction ) {
    x += ( direction == "east" ? this.blockSize : direction == "west" ? -this.blockSize : 0 );
    if ( x < 0 || x > this.width ) return;
    y += ( direction == "south" ? this.blockSize : direction == "north" ? -this.blockSize : 0 );
    if ( y < 0 || y > this.height ) return;
    return this.getBlockAt( x, y );
};

Game.prototype.makeRoomForPlayer = function( player, nbBlocksToEmpty ) {
    // make some empty blocks around the player
    var ba, bb, nextx, nexty, dir;
    bb = this.getBlockAt( player.x, player.y );

    // find a direction in which we can make some room for the player
    do {
        var idir = Math.round( Math.random() * ( DIRECTION.length - 1 ) );
        dir = DIRECTION[idir];
    } while (
      this.getBlockAt(
        bb.x + ( dir == "east" ? this.blockSize * nbBlocksToEmpty : dir == "west" ? -this.blockSize * nbBlocksToEmpty : 0 ),
        bb.y + ( dir == "south" ? this.blockSize * nbBlocksToEmpty : dir == "north" ? -this.blockSize * nbBlocksToEmpty : 0 )
      ) == undefined
    )
    // turn the player toward this direction
    player.direction = dir;
    // clear the way
    for ( var i = 0; i < nbBlocksToEmpty; i++ ) {

        while ( bb == undefined || bb == ba ) {

            bb = this.getBlockAt(
              ba.x + ( dir == "east" ? this.blockSize : dir == "west" ? -this.blockSize : 0 ),
              ba.y + ( dir == "south" ? this.blockSize : dir == "north" ? -this.blockSize : 0 )
            );

        }

        bb.type = "EMPTY";
        bb.setRenderFn();

        ba = bb;

    }

    return player;
};
//============




//============
// Block
//============

Block = function( game, opt ) {
    this.game = game;
    Object.extend( this, opt );
    this.init();
};

Block.TYPES = ["MUD", "EMPTY", "ERROR"];
Block.RenderFns = {
    "MUD": function() {

        ctx.fillStyle = "#ffa000";
        //ctx.lineWidth = 1;
        //ctx.strokeStyle = "#3f2a00";

        var x = this.x, y = this.y, size = this.size;
        ctx.beginPath();
        ctx.moveTo( x, y );
        ctx.lineTo( x + size, y );
        ctx.lineTo( x + size, y + size );
        ctx.lineTo( x, y + size );
        ctx.lineTo( x, y );
        ctx.closePath();
        ctx.fill();
        //ctx.stroke();

        if ( DEBUG ) {
            ctx.fillStyle = "#fff";
            ctx.fillText(
              this.type[0] + this.type[1] + this.type[2], // this.id, 
              this.x + 3, this.y + 12 );
            ctx.fillText(
              this.id,
              this.x + 3, this.y + 22 );
        }
    },

    "EMPTY": function() {

        ctx.fillStyle = "#7f7f7f";
        //ctx.lineWidth = 1;

        var x = this.x, y = this.y, size = this.size;
        ctx.fillRect( x, y, size, size );

        if ( DEBUG ) {
            ctx.fillStyle = "#d0d0d0";
            ctx.fillText(
              this.type[0] + this.type[1] + this.type[2], // this.id, 
              this.x + 3, this.y + 12 );
            ctx.fillText(
              this.id,
              this.x + 3, this.y + 22 );
        }
    },

    "ERROR": function() {
        ctx.fillStyle = "#ff0000";
        ctx.strokeStyle = "#fff";

        var x = this.x, y = this.y, size = this.size;
        ctx.fillRect( x, y, size, size );
        ctx.strokeRect( x, y, size, size );

        ctx.fillStyle = "#fff";
        ctx.fillText( "ERROR", this.x + 3, this.y + 12 );
    }
};

Block.prototype.size = 8;
Block.prototype.x = 0;
Block.prototype.y = 0;
Block.prototype.type = "ERROR";

Block.prototype.setRenderFn = function( renderfn ) {
    this.render = renderfn || Block.RenderFns[this.type] || this.render;
};
Block.all = [];

Block.prototype.init = function() {
    this.id = Block.all.length;
    Block.all.push( this );
    this.setRenderFn();
};

Block.prototype.update = function() { };

Block.prototype.render = function() {

    ctx.lineWidth = 1;
    //ctx.strokeStyle = getHSLA( 0, 100, 50, 1 );
    ctx.fillStyle = getHSLA( 0, 100, 100, 1 );

    var x = this.x, y = this.y, size = this.size;

    ctx.beginPath();
    ctx.moveTo( x, y );
    ctx.lineTo( x + size, y );
    ctx.lineTo( x + size, y + size );
    ctx.lineTo( x, y + size );
    ctx.lineTo( x, y );
    ctx.fill();
    //ctx.stroke();

    ctx.fillStyle = getHSLA( 0, 0, 100, 0.9 );
    ctx.fillText( this.id, this.x + 3, this.y + 12 );

};

Block.prototype.empty = function( bomb, power ) {
    this.type = "EMPTY";
    this.setRenderFn();
}

Block.prototype.contains = function( object ) {

    if ( object.x < this.x ) return false;
    if ( object.y < this.y ) return false;
    if ( object.x > ( this.x + this.game.blockSize ) ) return false;
    if ( object.y > ( this.y + this.game.blockSize ) ) return false;

    return true;
    ;
}
//============




//============
// Grid
//============

Grid = function( game, opt ) {
    this.game = game;
    Object.extend( this, opt );
    this.init();
};

Grid.prototype.thickness = 1;
Grid.prototype.color = "#e2e2e2";

Grid.all = [];

Grid.prototype.init = function() {
    this.id = Grid.all.length;
    Grid.all.push( this );
};

Grid.prototype.update = function( time ) { };

Grid.prototype.render = function( ctx ) {

    if ( this.thickness < 1 ) return;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.thickness;

    var s = this.game.blockSize;
    var nbWBlocks = this.game.nbWBlocks;
    var nbHBlocks = this.game.nbHBlocks;

    for ( var i = 0; i < nbWBlocks + 1; i++ ) {
        ctx.moveTo( 0, i * s );
        ctx.lineTo( nbWBlocks * s, i * s );
        ctx.stroke();
    }

    for ( var i = 0; i < nbHBlocks + 1; i++ ) {
        ctx.moveTo( i * s, 0 );
        ctx.lineTo( i * s, nbHBlocks * s );
        ctx.stroke();
    }

};
//============




//============
// Input
//============

var Input = function( game, opt ) {
    this.game = game;
    Object.extend( this, opt );
    this.init();
};

Input.all = [];

Input.prototype.init = function() {
    this.id = Input.all.length;
    Input.all.push( this );

    window.addEventListener( 'keydown', this.onKeyDown.bind( this ), false );
};

Input.prototype.update = function( time ) {

};

Input.prototype.onKeyDown = function( e ) {
    e = e || window.event;

    switch ( e.keyCode ) {
        case 37: // left
            this.game.player.moveToward( DIRECTION[0] );
            e.preventDefault();
            break;

        case 38: // top
            this.game.player.moveToward( DIRECTION[1] );
            e.preventDefault();
            break;

        case 39: // right
            this.game.player.moveToward( DIRECTION[2] );
            e.preventDefault();
            break;

        case 40: // bottom
            this.game.player.moveToward( DIRECTION[3] );
            e.preventDefault();
            break;

        case 32: // spacebar
            this.game.player.action();
            e.preventDefault();
            break;

        default:
            //console.info(e.keyCode); 
            break;
    }
};
//============




//============
// Player
//============

var Player = function( game, opt ) {
    this.game = game;
    Object.extend( this, opt );
    this.init();
};

Player.prototype.size = 16;
Player.prototype.health = 1;
Player.prototype.x = 0;
Player.prototype.y = 0;
Player.prototype._x = 0; // target x when this._tweenMove is going on
Player.prototype._y = 0;
Player.prototype._tweenMove = [];
Player.prototype.direction = "ERROR";
Player.prototype.color = "#fff";
Player.prototype.bombs = [];
Player.prototype.isAlive = true;

Player.all = [];

Player.prototype.init = function() {
    this.id = Player.all.length;
    Player.all.push( this );
};

Player.prototype.update = function( time ) {

    if ( this.health <= 0 ) this.isAlive = false;
};

Player.prototype.render = function( ctx ) {

    var x = this.x, y = this.y, s = this.size, hs = this.size / 2;

    ctx.save();
    if ( !this.isAlive ) ctx.globalAlpha = 0.75;

    ctx.translate( x, y );

    switch ( this.direction ) {
        case "west": ctx.rotate( deg2rad * 90 ); break;
        case "east": ctx.rotate( deg2rad * -90 ); break;
        case "north": ctx.rotate( deg2rad * 180 ); break;
        case "south": default: break;
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo( -hs, -hs );
    ctx.lineTo( +hs, -hs );
    ctx.lineTo( 0, +hs );
    ctx.lineTo( -hs, -hs );
    ctx[this.isAlive ? "fill" : "stroke"]();

    ctx.restore();


    // render bombs
    //for ( var i = this.bombs.length - 1, b = this.bombs[i]; i >= 0; i-- ) {
    //  b.render( ctx );
    //}
    this.bombs.forEach( function( b ) { b.render( ctx ); } );
};

Player.prototype.canMoveForward = function() {
    if ( this.health <= 0 ) return false;
    var b = this.game.getNextBlockAt(( this._x || this.x ), ( this._y || this.y ), this.direction );
    return b != undefined && b.type == "EMPTY";
};

Player.prototype.moveToward = function( direction ) {
    if ( this.health <= 0 ) return false;

    if ( this.direction != direction ) {
        this.direction = direction;
    }

    this.direction = direction;
    if ( this.canMoveForward() )
        this.moveForward();
};

Player.prototype.moveForward = function() {

    switch ( this.direction ) {
        case DIRECTION[0]: // left
            this.tweenMoveTo(( this._x || this.x ) - this.game.blockSize, ( this._y || this.y ) );
            break;

        case DIRECTION[1]: // top
            this.tweenMoveTo(( this._x || this.x ), ( this._y || this.y ) - this.game.blockSize );
            break;

        case DIRECTION[2]: // right
            this.tweenMoveTo(( this._x || this.x ) + this.game.blockSize, ( this._y || this.y ) );
            break;

        case DIRECTION[3]: // bottom
            this.tweenMoveTo(( this._x || this.x ), ( this._y || this.y ) + this.game.blockSize );
            break;

        default: break;
    }

};

Player.prototype.tweenMoveTo = function( x, y ) {

    var animTime = 75 / ( this._tweenMove.length || 1 );

    var me = this;

    var newTweenMove = new TWEEN.Tween( { x: this.x, y: this.y })
        .easing( TWEEN.Easing.Quadratic.Out )
        .to( { x: x, y: y }, animTime )
        .onUpdate( function( t ) { me.x = this.x; me.y = this.y; } )
        .onComplete( function() { me._tweenMove.shift(); } )
    ;

    this._tweenMove.push( newTweenMove );

    if ( this._tweenMove.length > 1 ) {
        this._tweenMove[0].stop();

        for ( var i = 0; i < this._tweenMove.length - 1; i++ ) {
            this._tweenMove[i]
                .setDuration( animTime )
                .easing( TWEEN.Easing.Linear.None )
                .chain( this._tweenMove[i + 1] )
            ;
        }

        this._tweenMove[this._tweenMove.length - 1].easing( TWEEN.Easing.Quadratic.Out );
    }

    this._tweenMove[0].start();

    this._x = x;
    this._y = y;
}

Player.prototype.action = function() {

    this.bombs.push(
      new BB.Bomb( this.game, {
          player: this,
          size: this.game.blockSize/2,
          x: this.x,
          y: this.y
      } )
    );

};
//============







//############
// BeamBoom
//############
var BB = BB || {};

BB.extend = function( obj, source ) {

    // based on: https://github.com/mrdoob/three.js/blob/master/src/Three.js
    if ( Object.keys ) {

        var keys = Object.keys( source );

        for ( var i = 0, il = keys.length; i < il; i++ ) {

            var prop = keys[i];
            Object.defineProperty( obj, prop, Object.getOwnPropertyDescriptor( source, prop ) );

        }

    } else {

        var safeHasOwnProperty = {}.hasOwnProperty;

        for ( var prop in source ) {

            if ( safeHasOwnProperty.call( source, prop ) ) {

                obj[prop] = source[prop];

            }

        }

    }

    return obj;

};

BB.DIRECTIONS = ["none", "west", "north", "east", "south"];
//############


//############
// Prop
//############

BB.Prop = function( game, opt ) {

    this.game = game;
    Object.extend( this, opt );

    this.id = BB.Prop.prototype.idCount++;
}

BB.Prop.prototype.id = 0;
BB.Prop.prototype.idCount = 0;
BB.Prop.prototype.x = 0;
BB.Prop.prototype.y = 0;
BB.Prop.prototype.size = 16;
BB.Prop.prototype.direction = BB.DIRECTIONS[0];
BB.Prop.prototype.color = "#000000";

BB.Prop.prototype.constructor = BB.Prop;

BB.Prop.prototype.render = function( ctx ) {

    ctx.fillStyle = "#ff0000";
    ctx.strokeStyle = "#fff";

    var x = this.x, y = this.y, size = this.size;
    ctx.beginPath();
    ctx.moveTo( x, y );
    ctx.lineTo( x + size, y );
    ctx.lineTo( x + size, y + size );
    ctx.lineTo( x, y + size );
    ctx.lineTo( x, y );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.fillText( "ERROR", this.x + 3, this.y + 12 );

};

//############


//############
// Fire
//############

BB.Fire = function( game, opt ) {

    BB.Prop.apply( this, arguments );

    var sizeGoal = this.size;
    this.size /= 5;
    new TWEEN.Tween( this )
        .to( { size: sizeGoal }, this.duration / 20 )
        .chain( new TWEEN.Tween( this )
            .to( { size: this.game.blockSize / 10 }, this.duration - this.duration / 20 )
            .onComplete( function() {
                this.isAlive = false;
            } )
        )
        .start()
    ;
};

BB.Fire.prototype = Object.create( BB.Prop );

BB.Fire.prototype.color = "#dd0000";
BB.Fire.prototype.power = 10;
BB.Fire.prototype.duration = 1000;
BB.Fire.prototype.isAlive = true;

BB.Fire.prototype.render = function( ctx ) {

    var s = this.size,// - ( Date.now() - this.startTick ) * ( ( this.size - 3 ) / this.duration ),
        x = this.x,
        y = this.y
    ;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc( x, y, s, 0, twoPI );
    ctx.fill();
};
//############


//############
// Bomb
//############

BB.Bomb = function( game, opt ) {

    BB.Prop.apply( this, arguments );

    this.timeoutID = window.setTimeout(
      this.boom.bind( this ),
      this.duration || 1000
    );

    // temporary
    this.startTick = Date.now();
    this.lastHue = 1;
};

BB.Bomb.prototype = Object.create( BB.Prop );

BB.Bomb.prototype.color = "#000000";
BB.Bomb.prototype.colorBorder = "#ffff00";
BB.Bomb.prototype.power = 3; // how far(nb blocks) can it blow up
BB.Bomb.prototype.duration = 2000;
BB.Bomb.prototype.isAlive = true;
BB.Bomb.prototype.player = undefined;
BB.Bomb.prototype.timeoutID = undefined;
BB.Bomb.prototype.fires = [];


BB.Bomb.prototype.render = function( ctx ) {

    if ( this.isAlive ) {
        var rotation = -0.8;

        ctx.save();
        ctx.translate( this.x, this.y );
        //ctx.rotate( rotation );

        var s = this.size, x = 0, y = 0, fuse = s/6;

        ctx.lineWidth = fuse;
        ctx.strokeStyle = ( Date.now() / 300 % 2 > 1 ) ? "#f40" : "#fa0";
        ctx.fillStyle = this.color;

        ctx.beginPath();
        ctx.arc( x, y, s/2, 0, twoPI );
        ctx.fill();

        //ctx.beginPath();
        //ctx.fillStyle = "#00f";
        ctx.fillRect( x - fuse/2, y - s / 2 - fuse, fuse, fuse );

        ctx.beginPath();
        var arcStart = -Math.PI / 2 + 0.2,
            arcEnd = twoPI - 0.3;
        ctx.arc( x, y, s / 2 + fuse/2, arcStart, ( arcEnd / this.duration ) * ( Date.now() - this.startTick ) + arcStart );
        ctx.stroke();

        ctx.restore();

    }

    if ( this.fires.length > 0 ) {
        // render fires
        var f;
        for ( var i = this.fires.length - 1; i >= 0; i-- ) {
            f = this.fires[i];
            if ( f.isAlive ) {
                f.render( ctx );
            } else {
                f = undefined;
            }
        }
        this.fires.clean();
    }
};

BB.Bomb.prototype.boom = function() {
    this.isAlive = false;
    window.clearTimeout( this.timeoutID );
    this.timeoutID = undefined;

    var thisBlock = this.game.getBlockAt( this.x, this.y );
    var hbs = game.blockSize / 2;
    var cursorBlock = thisBlock, done = false, direction;

    var boomBlock = function( block ) {
        Player.all.forEach( function( player ) {

            if ( block.contains( player ) ) {
                player.health--;
            }

            player.bombs.forEach( function( bomb ) {
                if ( bomb.isAlive && block.contains( bomb ) ) {
                    bomb.boom();
                }
            } );

        } );
    };

    this.fires.push(
      new BB.Fire( this.game, {
          x: cursorBlock.x + hbs,
          y: cursorBlock.y + hbs,
          power: this.power,
          size: hbs
      } )
    );

    boomBlock( cursorBlock );

    for ( var d = 0; d < DIRECTION.length; d++ ) {
        direction = DIRECTION[d];
        cursorBlock = thisBlock;
        done = false;

        for ( var i = 1; i < this.power && !done; i++ ) {

            cursorBlock = this.game.getNextBlockAt( cursorBlock.x, cursorBlock.y, direction );

            if ( cursorBlock !== undefined ) {
                boomBlock( cursorBlock );

                done = ( cursorBlock.type != "EMPTY" && cursorBlock.type != "ERROR" );

                cursorBlock.empty();

                this.fires.push(
                  new BB.Fire( this.game, {
                      x: cursorBlock.x + hbs,
                      y: cursorBlock.y + hbs,
                      power: this.power - i,
                      size: hbs
                  } )
                );
            }
            else {
                done = true;
            }

        }
    }
};
//############





loop = function() {

    requestAnimFrame.call( this, loop );

    TWEEN.update();

    game.update();

    //ctx.clearRect( 0, 0, canvasEl.width, canvasEl.height );

    game.render( ctx );

};




game = new Game( {
    blockSize: 33.3333333
} );

loop();


/*
todos:
- replace initialisation with || by a function filling the undefined by default values
*/