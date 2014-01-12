
DEBUG = false;


//============
// utils
//============

window.requestAnimFrame = function () { return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function ( a ) { window.setTimeout( a, 1E3 / 60 ) } }();

//--------------
var deg2rad = Math.PI / 180;
var rad2deg = 180 / Math.PI;
var twoPI = Math.PI * 2;
var DIRECTION = ["west", "north", "east", "south"];

var getHSLA = function ( h, s, l, a ) {
    return 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')';
};

Object.extend = function ( obj, extension ) {
    for( var prop in extension )
        obj[prop] = extension[prop];

    return obj;
};


//--------------
// global variables (pleonasm for "to clean up")
var canvasEl = document.getElementById( 'c' );

var ctx = canvasEl.getContext( '2d' );

window.onresize = function () {
    canvasEl.width = canvasEl.offsetWidth;
    canvasEl.height = canvasEl.offsetHeight;
};

var mouse;

window.onmousemove = function ( e ) {
    mouse = { x: e.x, y: e.y };
};
//============




//============
// Game
//============

Game = function ( opt ) {
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

Game.prototype.init = function () {

    var blockSize = this.blockSize;

    //--------
    // blocks
    var ratioEmptyBlocks = 0.6;

    for( var i = 0; i < this.nbWBlocks; i++ )
        for( var j = 0; j < this.nbHBlocks; j++ ) {

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
    this.grid = new Grid( this, { thickness: 0 } );

    //--------
    // input
    this.input = new Input( this, {} );

};

Game.prototype.update = function () {

    if( canvasEl.width != this.width || canvasEl.height != this.height ) {
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
    for( var i = 0; i < allBlocks.length; i++ ) {
        allBlocks[i].update();
    }

    //--------
    // players
    var allPlayers = this.players;
    for( var i = 0; i < allPlayers.length; i++ ) {
        allPlayers[i].update( ctx );
    }

    //--------
    // props (Fire)
    var allProps = this.props;
    for( var i = 0; i < allProps.length; i++ ) {
        allProps[i].update( ctx );
    }

};

Game.prototype.render = function ( ctx ) {

    //--------
    // grid
    this.grid.render( ctx );

    //--------
    // blocks
    var allBlocks = this.blocks;
    for( var i = 0; i < allBlocks.length; i++ ) {
        allBlocks[i].render( ctx );
    }

    //--------
    // players
    var allPlayers = this.players;
    for( var i = 0; i < allPlayers.length; i++ ) {
        allPlayers[i].render( ctx );
    }

    //--------
    // props (Fire)
    var allProps = this.props;
    for( var i = 0; i < allProps.length; i++ ) {
        allProps[i].render( ctx );
    }
};

Game.prototype.getBlock = function ( posX, posY ) {
    return this.blocks[Math.round( posX + this.nbHBlocks * posY )];
};

Game.prototype.getBlockAt = function ( x, y ) {
    return this.getBlock( Math.floor( x / this.blockSize ), Math.floor( y / this.blockSize ) );
};

Game.prototype.getNextBlockAt = function ( x, y, direction ) {
    x += ( direction == "east" ? this.blockSize : direction == "west" ? -this.blockSize : 0 );
    if( x < 0 || x > this.width ) return;
    y += ( direction == "south" ? this.blockSize : direction == "north" ? -this.blockSize : 0 );
    if( y < 0 || y > this.height ) return;
    return this.getBlockAt( x, y );
};

Game.prototype.makeRoomForPlayer = function ( player, nbBlocksToEmpty ) {
    // make some empty blocks around the player
    var ba, bb, nextx, nexty, dir;
    bb = this.getBlockAt( player.x, player.y );

    // find a direction in which we can make some room for the player
    do {
        var idir = Math.round( Math.random() * ( DIRECTION.length - 1 ) );
        dir = DIRECTION[idir];
    } while(
      this.getBlockAt(
        bb.x + ( dir == "east" ? this.blockSize * nbBlocksToEmpty : dir == "west" ? -this.blockSize * nbBlocksToEmpty : 0 ),
        bb.y + ( dir == "south" ? this.blockSize * nbBlocksToEmpty : dir == "north" ? -this.blockSize * nbBlocksToEmpty : 0 )
      ) == undefined
    )
    // turn the player toward this direction
    player.direction = dir;
    // clear the way
    for( var i = 0; i < nbBlocksToEmpty; i++ ) {

        while( bb == undefined || bb == ba ) {

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

Block = function ( game, opt ) {
    this.game = game;
    Object.extend( this, opt );
    this.init();
};

Block.TYPES = ["MUD", "EMPTY", "ERROR"];
Block.RenderFns = {
    "MUD": function () {

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

        if( DEBUG ) {
            ctx.fillStyle = "#fff";
            ctx.fillText(
              this.type[0] + this.type[1] + this.type[2], // this.id, 
              this.x + 3, this.y + 12 );
            ctx.fillText(
              this.id,
              this.x + 3, this.y + 22 );
        }
    },

    "EMPTY": function () {

        ctx.fillStyle = "#7f7f7f";
        //ctx.lineWidth = 1;

        var x = this.x, y = this.y, size = this.size;
        ctx.beginPath();
        ctx.moveTo( x, y );
        ctx.lineTo( x + size, y );
        ctx.lineTo( x + size, y + size );
        ctx.lineTo( x, y + size );
        ctx.lineTo( x, y );
        ctx.fill();
        //ctx.stroke();

        if( DEBUG ) {
            ctx.fillStyle = "#d0d0d0";
            ctx.fillText(
              this.type[0] + this.type[1] + this.type[2], // this.id, 
              this.x + 3, this.y + 12 );
            ctx.fillText(
              this.id,
              this.x + 3, this.y + 22 );
        }
    },

    "ERROR": function () {
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
    }
};

Block.prototype.size = 8;
Block.prototype.x = 0;
Block.prototype.y = 0;
Block.prototype.type = "ERROR";

Block.prototype.setRenderFn = function ( renderfn ) {
    this.render = renderfn || Block.RenderFns[this.type] || this.render;
};
Block.all = [];

Block.prototype.init = function () {
    this.id = Block.all.length;
    Block.all.push( this );
    this.setRenderFn();
};

Block.prototype.update = function () { };

Block.prototype.render = function () {

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

Block.prototype.empty = function ( bomb, power ) {
    this.type = "EMPTY";
    this.setRenderFn();
}

Block.prototype.contains = function ( object ) {

    if( object.x < this.x ) return false;
    if( object.y < this.y ) return false;
    if( object.x > ( this.x + this.game.blockSize ) ) return false;
    if( object.y > ( this.y + this.game.blockSize ) ) return false;

    return true;
    ;
}
//============




//============
// Grid
//============

Grid = function ( game, opt ) {
    this.game = game;
    Object.extend( this, opt );
    this.init();
};

Grid.prototype.thickness = 2;
Grid.prototype.color = "#e30000";

Grid.all = [];

Grid.prototype.init = function () {
    this.id = Grid.all.length;
    Grid.all.push( this );
};

Grid.prototype.update = function ( time ) { };

Grid.prototype.render = function ( ctx ) {

    if( this.thickness < 1 ) return;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.thickness;

    var s = this.game.blockSize;
    var nbWBlocks = this.game.nbWBlocks;
    var nbHBlocks = this.game.nbHBlocks;

    for( var i = 0; i < nbWBlocks + 1; i++ ) {
        ctx.moveTo( 0, i * s );
        ctx.lineTo( nbWBlocks * s, i * s );
        ctx.stroke();
    }

    for( var i = 0; i < nbHBlocks + 1; i++ ) {
        ctx.moveTo( i * s, 0 );
        ctx.lineTo( i * s, nbHBlocks * s );
        ctx.stroke();
    }

};
//============




//============
// Input
//============

var Input = function ( game, opt ) {
    this.game = game;
    Object.extend( this, opt );
    this.init();
};

Input.all = [];

Input.prototype.init = function () {
    this.id = Input.all.length;
    Input.all.push( this );

    window.addEventListener( 'keydown', this.onKeyDown.bind( this ), false );
};

Input.prototype.update = function ( time ) {

};

Input.prototype.onKeyDown = function ( e ) {
    e = e || window.event;

    switch( e.keyCode ) {
        case 37: // left
            this.game.player.moveToward( DIRECTION[0] );
            break;

        case 38: // top
            this.game.player.moveToward( DIRECTION[1] );
            break;

        case 39: // right
            this.game.player.moveToward( DIRECTION[2] );
            break;

        case 40: // bottom
            this.game.player.moveToward( DIRECTION[3] );
            break;

        case 32: // spacebar
            this.game.player.action();
            break;

        default:
            //console.info(e.keyCode); 
            break;
    }
};//============




//============
// Player
//============

var Player = function ( game, opt ) {
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

Player.all = [];

Player.prototype.init = function () {
    this.id = Player.all.length;
    Player.all.push( this );
};

Player.prototype.update = function ( time ) {
    this.bombs.forEach( function ( b ) {
        b.update( time );
    } );
};

Player.prototype.render = function ( ctx ) {

    if( this.health <= 0 ) return this.renderDead( ctx );

    var x = this.x, y = this.y, s = this.size, hs = this.size / 2;

    ctx.save();

    ctx.translate( x, y );

    switch( this.direction ) {
        case "west": ctx.rotate( deg2rad * 90 ); break;
        case "east": ctx.rotate( deg2rad * -90 ); break;
        case "north": ctx.rotate( deg2rad * 180 ); break;
        case "south": default: break;
    }

    //ctx.lineWidth = 1;
    //ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo( -hs, -hs );
    ctx.lineTo( +hs, -hs );
    ctx.lineTo( 0, +hs );
    ctx.lineTo( -hs, -hs );
    ctx.fill();
    //ctx.stroke();

    ctx.restore();

    this.bombs.forEach( function ( b ) { b.render(); } );
};

Player.prototype.renderDead = function ( ctx ) {
    
    var x = this.x, y = this.y, s = this.size/2, hs = this.size / 2;

    var gAlpha = ctx.globalAlpha;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate( x, y );

    switch( this.direction ) {
        case "west": ctx.rotate( deg2rad * 90 ); break;
        case "east": ctx.rotate( deg2rad * -90 ); break;
        case "north": ctx.rotate( deg2rad * 180 ); break;
        case "south": default: break;
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = this.color;
    //ctx.fillStyle = "#222222";

    ctx.beginPath();
    ctx.moveTo( -hs, -hs );
    ctx.lineTo( +hs, -hs );
    ctx.lineTo( 0, +hs );
    ctx.lineTo( -hs, -hs );
    //ctx.fill();
    ctx.stroke();

    ctx.restore();

    this.bombs.forEach( function ( b ) { b.render(); } );
};

Player.prototype.canMoveForward = function () {
    if( this.health <= 0 ) return false;
    var b = this.game.getNextBlockAt(( this._x || this.x ), ( this._y || this.y ), this.direction );
    return b != undefined && b.type == "EMPTY";
};

Player.prototype.moveToward = function ( direction ) {
    if( this.health <= 0 ) return false;

    if( this.direction != direction ) {
        this.direction = direction;
    }

    this.direction = direction;
    if( this.canMoveForward() )
        this.moveForward();
};

Player.prototype.moveForward = function () {

    switch( this.direction ) {
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

Player.prototype.tweenMoveTo = function ( x, y ) {

    var animTime = 75 / ( this._tweenMove.length || 1 );

    var newTweenMove = new TWEEN.Tween( this )
        .easing( TWEEN.Easing.Quadratic.Out )
        .to( { x: x, y: y }, animTime )
        .onStart( function ( t ) {
            //console.log( "Player._tweenMove started @ " + this.x + ";" + this.y );
        } )
        .onComplete( function () {
            this._tweenMove.shift();
            //console.log( "Player._tweenMove stopped @ " + this.x + ";" + this.y );
        } )
    ;

    this._tweenMove.push( newTweenMove );

    if( this._tweenMove.length > 1 ) {
        this._tweenMove[0].stop();

        for( var i = 0; i < this._tweenMove.length - 1; i++ ) {
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

Player.prototype.action = function () {

    this.bombs.push(
      new Bomb( this.game, {
          player: this,
          x: this.x,
          y: this.y
      } )
    );

};
//============






//============
// Bomb
//============

var Bomb = function ( game, opt ) {
    this.game = game;
    Object.extend( this, opt );
    this.init();
};

Bomb.prototype.x = 0;
Bomb.prototype.y = 0;
Bomb.prototype.size = 10;
Bomb.prototype.direction = DIRECTION[1];
Bomb.prototype.color = "#ff0000";
Bomb.prototype.colorBorder = "#000000";
Bomb.prototype.player = undefined;
Bomb.prototype.power = 3; // how far(nb blocks) can it blow up
Bomb.prototype.timeout = 2000;
Bomb.prototype.isAlive = true;

Bomb.all = [];

Bomb.prototype.init = function () {
    this.id = Bomb.all.length;
    Bomb.all.push( this );

    window.setTimeout(
      this.boom.bind( this ),
      this.timeout || 1000
    );

    // temporary
    this.startTick = Date.now();
    this.lastHue = 1;
};

Bomb.prototype.boom = function () {
    this.isAlive = false;
    this.player.bombs.splice( this.player.bombs.indexOf( this ), 1 );
    var thisBlock = this.game.getBlockAt( this.x, this.y );
    var hbs = game.blockSize / 2;
    var cursorBlock = thisBlock, done = false, direction;

    var killPlayer = function ( block ) {
        Player.all.forEach( function ( player ) {
            var contained = block.contains( player );
            if( contained ) {
                player.health--;
            }
        } );
    };

    new Fire( this.game, {
        x: cursorBlock.x + hbs,
        y: cursorBlock.y + hbs,
        power: this.power,
        size: hbs
    } );

    killPlayer( cursorBlock );

    for( var d = 0; d < DIRECTION.length; d++ ) {
        direction = DIRECTION[d];
        cursorBlock = thisBlock;
        done = false;

        for( var i = 1; i < this.power && !done; i++ ) {

            cursorBlock = this.game.getNextBlockAt( cursorBlock.x, cursorBlock.y, direction );

            if( cursorBlock !== undefined ) {
                killPlayer( cursorBlock );

                done = ( cursorBlock.type != "EMPTY" && cursorBlock.type != "ERROR" );

                cursorBlock.empty();

                new Fire( this.game, {
                    x: cursorBlock.x + hbs,
                    y: cursorBlock.y + hbs,
                    power: this.power - i,
                    size: hbs
                } );
            }
            else {
                done = true;
            }

        }
    }
};

Bomb.prototype.update = function ( time ) {
    var ellapsedTime = Date.now() - this.startTick;
    this.lastHue = 70 - ( 70 / this.timeout ) * ellapsedTime;
    this.color = getHSLA( this.lastHue, 90, 50, 40 );//+this.lastHue );
    this.colorBorder = ( ellapsedTime / 250 ) % 2 > 1 ? "#f40" : "#fa0";
};

Bomb.prototype.render = function ( time ) {

    if( !this.isAlive ) return;

    var s = this.size, x = this.x, y = this.y;

    ctx.save();

    ctx.lineWidth = 1;
    ctx.strokeStyle = this.colorBorder || "#000000";
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.arc( x, y, s, 0, twoPI );
    //switch( this.direction ) {
    //    default:
    //    case "north": ctx.arc( x, this.y, s / 5, 0, twoPI ); break;
    //    case "west": ctx.arc( -this.x, y, s / 5, 0, twoPI ); break;
    //    case "east": ctx.arc( this.x, y, s / 5, 0, twoPI ); break;
    //    case "south": ctx.arc( x, -this.y, s / 5, 0, twoPI ); break;
    //}
    ctx.stroke();
    ctx.fill();
};

//============




//============
// Fire
//============

var Fire = function ( game, opt ) {
    this.game = game;
    Object.extend( this, opt );
    this.init();
};

Fire.prototype.x = 0;
Fire.prototype.y = 0;
Fire.prototype.size = 16;
Fire.prototype.power = 10;
Fire.prototype.direction = DIRECTION[1];
Fire.prototype.color = "#ff0000";
Fire.prototype.timeout = 1000;
Fire.prototype.isAlive = true;

Fire.prototype.init = function () {
    this.id = this.game.props.length;
    this.game.props.push( this );

    //this.startTick = Date.now();

    var sizeGoal = this.size;
    this.size /= 5;
    new TWEEN.Tween( this )
        .to( { size: sizeGoal }, this.timeout / 20 )
        .chain( new TWEEN.Tween( this )
            .to( { size: this.game.blockSize / 10 }, this.timeout - this.timeout / 20 )
            .onComplete( function () {
                this.isAlive = false;
            } )
        )
        .start()
    ;
};

Fire.prototype.update = function ( time ) {
    if( !this.isAlive ) {
        this.game.props.splice( this.game.props.indexOf( this ) );
    }
};

Fire.prototype.render = function ( ctx ) {

    var s = this.size,// - ( Date.now() - this.startTick ) * ( ( this.size - 3 ) / this.timeout ),
        x = this.x,
        y = this.y
    ;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc( x, y, s, 0, twoPI );
    ctx.fill();
};

//============







loop = function () {

    requestAnimFrame.call( this, loop );

    TWEEN.update();

    game.update();

    ctx.clearRect( 0, 0, canvasEl.width, canvasEl.height );

    game.render( ctx );

};




game = new Game( {
    blockSize: 28
} );

loop();


/*
todos:
- replace initialisation with || by a function filling the undefined by default values
*/
