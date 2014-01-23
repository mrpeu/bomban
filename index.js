
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
    for( var prop in extension )
        obj[prop] = extension[prop];

    return obj;
};

Array.prototype.clean = function( deleteValue ) {
    for( var i = 0; i < this.length; i++ ) {
        if( this[i] == deleteValue ) {
            this.splice( i, 1 );
            i--;
        }
    }
    return this;
};
//============




//============
// Game
//============

Game = function( opt ) {
    Object.extend( this, opt );

    Game.instance = this;

    var canvasEl = this.ctx.canvas;

    window.addEventListener( "resize", function() {
        Game.instance.onResize();
    }, false );
    
    this.onResize();

    // make it square
    this.nbHBlocks = this.nbWBlocks;

    this.init();

};
Game.instance = undefined;

Game.prototype.blockSize = 32;
Game.prototype.blocks = [];
Game.prototype.grid = undefined;
Game.prototype.props = [];
Game.prototype.players = [];

Game.prototype.init = function() {

    //--------
    // blocks
    var ratioEmptyBlocks = 0.6;

    for( var i = 0; i < this.nbWBlocks; i++ )
        for( var j = 0; j < this.nbHBlocks; j++ ) {

            this.blocks.push(
              new BB.Block( this, {
                  x: j * this.blockSize,
                  y: i * this.blockSize,
                  type: ( Math.random() > ratioEmptyBlocks ) ? "EMPTY" : "MUD"
              } )
            );

        }

    //--------
    // grid
    this.grid = new BB.Grid( this, { thickness: 1, color: '#fff' } );

    //--------
    // players
    var makeRoomForPlayer = function( player, nbBlocksToEmpty ) {
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

            ba = bb;

        }

        return player;
    };

    this.players.push(
      makeRoomForPlayer.call( this, new BB.Player( this, {
          color: "#0f0",
          x: this.blockSize / 2, y: this.blockSize / 2
      } ), 4 )
    );

    // this.players.push(
    //   makeRoomForPlayer( new Player( this, {
    //     color: getHSLA( 228, 100, 50, 0.9 ),
    //     x: blockSize*(this.nbWBlocks-1) + blockSize/2, y: blockSize*(this.nbHBlocks-1) + blockSize/2
    //   }), 4 )
    // );
    

    //--------
    // input
    this.input = new BB.Input( this, { player: this.players[0] } );

};

Game.prototype.render = function() {

    if( this.ctx.canvas.offsetWidth != this.width || this.ctx.canvas.offsetHeight != this.height ) {
        this.onResize();
    }

    this.ctx.clearRect( 0, 0, this.width, this.height );

    //--------
    // grid
    this.grid.render( this.ctx );

    //--------
    // BB.Prop
    BB.Prop.ALL.forEach( function( prop ) {
        if( prop != undefined && prop.isAlive ) {
            prop.render( this.ctx );
        }
    }, this );

    //--------
    // players
    var allPlayers = BB.Player.ALL;
    for( var i = 0; i < allPlayers.length; i++ ) {
        allPlayers[i].render( this.ctx );
    }
};

Game.prototype.onResize = function() {
    var canvasEl = this.ctx.canvas;
    this.width = canvasEl.width = canvasEl.offsetWidth;
    this.height = canvasEl.height = canvasEl.offsetHeight;
    this.blockSize = this.width / this.nbWBlocks;

    if ( this.grid === undefined ) return;
    this.grid.nbWBlocks = this.width / this.blockSize;
    this.grid.nbHBlocks = this.height / this.blockSize;
}

Game.prototype.getBlock = function( posX, posY ) {
    return this.blocks[Math.round( posX + this.nbHBlocks * posY )];
};

Game.prototype.getBlockAt = function( x, y ) {
    return this.getBlock( Math.floor( x / this.blockSize ), Math.floor( y / this.blockSize ) );
};

Game.prototype.getNextBlockAt = function( x, y, direction ) {
    x += ( direction == "east" ? this.blockSize : direction == "west" ? -this.blockSize : 0 );
    if( x < 0 || x > this.width ) return;
    y += ( direction == "south" ? this.blockSize : direction == "north" ? -this.blockSize : 0 );
    if( y < 0 || y > this.height ) return;
    return this.getBlockAt( x, y );
};
//============





//############
// BeamBoom
//############
var BB = BB || ( function() {
    var _randomId = 0;
    var _randoms = [];

    for( var i = 0; i < 500; i++ ) _randoms.push( Math.random() );

    return {
        DIRECTIONS: ["none", "west", "north", "east", "south"],
        RANDOMS: _randoms,

        r: function() { return _randoms[_randomId = ( ++_randomId ) % _randoms.length]; }
    };
} )();
//############


//############
// Prop
//############
BB.Prop = function( game, opt ) {

    this.game = game;
    Object.extend( this, opt );

    this.blockSize = this.blockSize || this.game.blockSize;
    this._size = this.size * this.blockSize;

    this.id = BB.Prop.ALL.length;
    BB.Prop.ALL.push( this );
};
BB.Prop.prototype.constructor = BB.Prop;

BB.Prop.ALL = [];
BB.Prop.prototype.id = 0;
BB.Prop.prototype.x = 0;
BB.Prop.prototype.y = 0;
BB.Prop.blockSize = 16;
BB.Prop.prototype.size = 1;
BB.Prop.prototype._size = 1;
BB.Prop.prototype.direction = BB.DIRECTIONS[0];
BB.Prop.prototype.color = "#000000";
BB.Prop.prototype.isAlive = true;

BB.Prop.prototype.render = function( ctx ) {

    if ( this.blockSize != this.game.blockSize ) {
        this.blockSize = this.game.blockSize;
        this._size = this.size * this.blockSize;
    }

    ctx.fillStyle = "#ff0000";
    ctx.strokeStyle = "#fff";

    var x = this.x, y = this.y, _size = this._size;
    ctx.beginPath();
    ctx.moveTo( x, y );
    ctx.lineTo( x + _size, y );
    ctx.lineTo( x + _size, y + _size );
    ctx.lineTo( x, y + _size );
    ctx.lineTo( x, y );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.fillText( "ERROR", this.x + 3, this.y + 12 );

};
//############



//############
// Block
//############
BB.Block = function( game, opt ) {

    BB.Prop.apply( this, arguments );

};
BB.Block.prototype.constructor = BB.Block;
BB.Block.prototype = Object.create( BB.Prop.prototype );

BB.Block.TYPES = ["ERROR", "MUD", "EMPTY"];
BB.Block.RenderFns = {
    "MUD": function( ctx ) {

        ctx.fillStyle = "#ffa000";

        var x = this.x, y = this.y, _size = this._size;
        ctx.beginPath();
        ctx.moveTo( x, y );
        ctx.lineTo( x + _size, y );
        ctx.lineTo( x + _size, y + _size );
        ctx.lineTo( x, y + _size );
        ctx.lineTo( x, y );
        ctx.closePath();
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = "#ef9000";
        ctx.beginPath();
        ctx.moveTo( x + _size, y );
        ctx.lineTo( x + _size, y + _size );
        ctx.lineTo( x, y + _size );
        ctx.stroke();

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
    "EMPTY": function( ctx ) {

        ctx.fillStyle = "#7f7f7f";
        //ctx.lineWidth = 1;

        var x = this.x, y = this.y, _size = this._size;
        ctx.fillRect( x, y, _size, _size );

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
    "ERROR": function( ctx ) {
        ctx.fillStyle = "#ff0000";
        ctx.strokeStyle = "#fff";

        var x = this.x, y = this.y, _size = this._size;
        ctx.fillRect( x, y, _size, _size );
        ctx.strokeRect( x, y, _size, _size );

        ctx.fillStyle = "#fff";
        ctx.fillText( "ERROR", this.x + 3, this.y + 12 );
    }
};

BB.Block.prototype.type = BB.Block.TYPES[0];

BB.Block.prototype.render = function( ctx ) {

    if ( this.blockSize != this.game.blockSize ) {
        this.blockSize = this.game.blockSize;
        this._size = this.size * this.blockSize;
    }

    if( BB.Block.RenderFns.hasOwnProperty( this.type ) ) {
        BB.Block.RenderFns[this.type].call( this, ctx );
    }
    else {
        BB.Block.RenderFns["ERROR"].call( this, ctx );
    }
};

BB.Block.prototype.empty = function( bomb, power ) {
    this.type = "EMPTY";
}

BB.Block.prototype.contains = function( object ) {

    if( object.x < this.x ) return false;
    if( object.y < this.y ) return false;
    if( object.x > ( this.x + this.game.blockSize ) ) return false;
    if( object.y > ( this.y + this.game.blockSize ) ) return false;

    return true;
    ;
}
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
BB.Bomb.prototype.constructor = BB.Bomb;
BB.Bomb.prototype = Object.create( BB.Prop.prototype );

BB.Bomb.prototype.color = "#000000";
BB.Bomb.prototype.colorBorder = "#ffff00";
BB.Bomb.prototype.power = 3; // how far(nb blocks) can it blow up
BB.Bomb.prototype.duration = 2000;
BB.Bomb.prototype.player = undefined;
BB.Bomb.prototype.timeoutID = undefined;
BB.Bomb.prototype.fires = [];

BB.Bomb.prototype.boom = function() {
    this.isAlive = false;
    window.clearTimeout( this.timeoutID );
    this.timeoutID = undefined;

    var thisBlock = this.game.getBlockAt( this.x, this.y );
    var cursorBlock = thisBlock, done = false, direction;

    var boomBlock = function( block ) {
        this.game.players.forEach( function( player ) {

            if( block.contains( player ) ) {
                player.health--;
            }

            player.bombs.forEach( function( bomb ) {
                if( bomb.isAlive && block.contains( bomb ) ) {
                    bomb.boom();
                }
            } );

        } );
    };

    this.fires.push(
      new BB.Fire( this.game, {
          x: cursorBlock.x,
          y: cursorBlock.y,
          power: this.power,
          size: .5,
          sparklesChances: .8
      } )
    );

    boomBlock( cursorBlock );

    for( var d = 0; d < DIRECTION.length; d++ ) {
        direction = DIRECTION[d];
        cursorBlock = thisBlock;
        done = false;

        for( var i = 1; i < this.power && !done; i++ ) {

            cursorBlock = this.game.getNextBlockAt( cursorBlock.x, cursorBlock.y, direction );

            if( cursorBlock !== undefined ) {
                boomBlock( cursorBlock );

                done = ( cursorBlock.type != "EMPTY" && cursorBlock.type != "ERROR" );

                cursorBlock.empty();

                this.fires.push(
                  new BB.Fire( this.game, {
                      x: cursorBlock.x,
                      y: cursorBlock.y,
                      power: this.power - i,
                      size: .5,
                      sparklesChances: .5
                  } )
                );
            }
            else {
                done = true;
            }

        }
    }
};

BB.Bomb.prototype.render = function( ctx ) {

    if ( this.isAlive ) {

        if ( this.blockSize != this.game.blockSize ) {
            this.blockSize = this.game.blockSize;
            this._size = this.size * this.blockSize;
        }

        var rotation = -0.8;

        ctx.save();
        ctx.translate( this.x, this.y );
        //ctx.rotate( rotation );

        var s = this._size, fuse = s / 6;

        ctx.lineWidth = fuse;
        ctx.strokeStyle = ( Date.now() / 300 % 2 > 1 ) ? "#f40" : "#fa0";
        ctx.fillStyle = this.color;

        ctx.beginPath();
        ctx.arc( 0, 0, s / 2, 0, twoPI );
        ctx.fill();

        //ctx.beginPath();
        //ctx.fillStyle = "#00f";
        ctx.fillRect( -fuse / 2, -s / 2 - fuse, fuse, fuse );

        ctx.beginPath();
        var arcStart = -Math.PI / 2 + 0.2,
            arcEnd = twoPI - 0.3;
        ctx.arc( 0, 0, s / 2 + fuse / 2, arcStart, ( arcEnd / this.duration ) * ( Date.now() - this.startTick ) + arcStart );
        ctx.stroke();

        ctx.restore();

    }
};
//############


//############
// Fire
//############
BB.Fire = function( game, opt ) {

    BB.Prop.apply( this, arguments );

    if( this.sparklesChances > 0 ) {
        var sparkles = [];
        while( BB.r() < this.sparklesChances ) {
            //sparkles.push(
            new BB.Fire( game, {
                x: this.x + BB.r() * game.blockSize - game.blockSize / 2, y: this.y + BB.r() * game.blockSize - game.blockSize / 2,
                color: getHSLA( BB.r() * 60, 100, 50, BB.r() * 100 - 10 ),
                duration: BB.r() * this.duration / 2,
                delay: BB.r() * this.duration / 3,
                _size: this._size * BB.r()
            } )
            //);
        }
        //console.table( sparkles );
    }

};
BB.Fire.prototype.constructor = BB.Fire;
BB.Fire.prototype = Object.create( BB.Prop.prototype );

BB.Fire.prototype.color = "#dd0000";
BB.Fire.prototype.power = 10;
BB.Fire.prototype.duration = 1000;
BB.Fire.prototype.delay = 0;
BB.Fire.prototype._tween = undefined;
BB.Fire.prototype.sparklesChances = 0;

BB.Fire.prototype.render = function( ctx ) {

    if ( !this.isAlive ) return;

    if ( this.blockSize != this.game.blockSize ) {
        this.blockSize = this.game.blockSize;
        this._size = this.size * this.blockSize;
    }

    if( this._tween == undefined ) {

        ( function() {
            var _sizeGoal = this._size;
            this._size /= 5;

            this._tween =
                new TWEEN.Tween( this )
                    .to( { _size: _sizeGoal }, this.duration / 20 )
                    .chain( new TWEEN.Tween( this )
                        .to( { _size: this.game.blockSize / 10 }, this.duration - this.duration / 20 )
                        .onComplete( function() {
                            this.isAlive = false;
                        } )
                    )
                .delay( this.delay )
                .start()
            ;
        } ).call( this );
    }

    var s = this._size,// - ( Date.now() - this.startTick ) * ( ( this._size - 3 ) / this.duration ),
        x = this.x + this.blockSize / 2,
        y = this.y + this.blockSize / 2
    ;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc( x, y, s, 0, twoPI );
    ctx.fill();

    //ctx.fillStyle = "#fff";
    //ctx.fillText( this.id, this.x + 3, this.y + 12 );
};
//############


//############
// Grid
//############
BB.Grid = function( game, opt ) {
    this.game = game;
    Object.extend( this, opt );

    this.id = BB.Grid.ALL.length;
    BB.Grid.ALL.push( this );
};
BB.Grid.ALL = [];
BB.Grid.prototype.constructor = BB.Grid;
BB.Grid.prototype = {
    color: "#ededed",
    thickness: 0
};

BB.Grid.prototype.render = function( ctx ) {

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
//############


//############
// Input
//############
BB.Input = function( game, opt ) {
    this.game = game;
    Object.extend( this, opt );

    this.id = BB.Input.ALL.length;
    BB.Input.ALL.push( this );

    var eventTarget = window; //game.ctx.canvas;
    eventTarget.addEventListener( 'keydown', this.onKeyDown.bind( this ), false );
    eventTarget.addEventListener( 'touchstart', this.onTouch.bind( this ), false );
    eventTarget.addEventListener( 'touchend', this.onTouch.bind( this ), false );
};
BB.Input.prototype.constructor = BB.Input;
BB.Input.ALL = [];
BB.Input.prototype = {
    id: -1,
    game: undefined,
    player: undefined
};

BB.Input.prototype.onKeyDown = function( e ) {
    e = e || window.event;

    switch( e.keyCode ) {
        case 37: // left
            this.player.moveToward( DIRECTION[0] );
            e.preventDefault();
            break;

        case 38: // top
            this.player.moveToward( DIRECTION[1] );
            e.preventDefault();
            break;

        case 39: // right
            this.player.moveToward( DIRECTION[2] );
            e.preventDefault();
            break;

        case 40: // bottom
            this.player.moveToward( DIRECTION[3] );
            e.preventDefault();
            break;

        case 32: // spacebar
            this.player.action();
            e.preventDefault();
            break;

        default:
            //console.info(e.keyCode); 
            break;
    }
};

BB.Input.prototype.onTouch = function( e ) {
    new BB.Fire( this.game, {
        sparklesRate: .9,
        x: e.changedTouches[0].clientX - this.game.ctx.canvas.getBoundingClientRect().left,
        y: e.changedTouches[0].clientY - this.game.ctx.canvas.getBoundingClientRect().top
    } );
};
//############


//############
// Player
//############
BB.Player = function( game, opt ) {

    this.game = game;
    Object.extend( this, opt );

    this.blockSize = this.blockSize || this.game.blockSize;
    this._size = this.size * this.blockSize;

    this.id = BB.Player.ALL.length;
    BB.Player.ALL.push( this );
};
BB.Player.ALL = [];

BB.Player.prototype.constructor = BB.Player;

BB.Player.prototype.id = 0;
BB.Player.prototype.color = "#00dd00";
BB.Player.prototype.health = 1;
BB.Player.prototype.blockSize = 16;
BB.Player.prototype.size = .7;
BB.Player.prototype._size = 16;
BB.Player.prototype.x = 0;
BB.Player.prototype.y = 0;
BB.Player.prototype._x = 0; // target x when this._tweenMove is going on
BB.Player.prototype._y = 0;
BB.Player.prototype.direction = BB.DIRECTIONS[0];
BB.Player.prototype.isAlive = true;
BB.Player.prototype._tweenMove = [];
BB.Player.prototype.bombs = [];

BB.Player.prototype.canMoveForward = function() {
    if( this.health <= 0 ) return false;
    var b = this.game.getNextBlockAt(( this._x || this.x ), ( this._y || this.y ), this.direction );
    return b != undefined && b.type == "EMPTY";
};

BB.Player.prototype.moveToward = function( direction ) {
    if( this.health <= 0 ) return false;

    if( this.direction != direction ) {
        this.direction = direction;
    }

    this.direction = direction;
    if( this.canMoveForward() )
        this.moveForward();
};

BB.Player.prototype.moveForward = function() {

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

BB.Player.prototype.tweenMoveTo = function( x, y ) {

    var animTime = 75 / ( this._tweenMove.length || 1 );

    var me = this;

    var newTweenMove = new TWEEN.Tween( { x: this.x, y: this.y } )
        .easing( TWEEN.Easing.Quadratic.Out )
        .to( { x: x, y: y }, animTime )
        .onUpdate( function( t ) { me.x = this.x; me.y = this.y; } )
        .onComplete( function() { me._tweenMove.shift(); } )
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

BB.Player.prototype.action = function() {

    if( !this.isAlive ) return;

    this.bombs.push(
      new BB.Bomb( this.game, {
          player: this,
          size: .5,
          x: this.x,
          y: this.y
      } )
    );

};

BB.Player.prototype.render = function( ctx ) {

    if( this.health <= 0 ) this.isAlive = false;

    if ( this.blockSize != this.game.blockSize ) {
        this.blockSize = this.game.blockSize;
        this._size = this.size * this.blockSize;
    }

    var x = this.x, y = this.y, s = this._size, hs = this._size / 2;

    ctx.save();

    ctx.translate( x, y );

    switch( this.direction ) {
        case "west": ctx.rotate( deg2rad * 90 ); break;
        case "east": ctx.rotate( deg2rad * -90 ); break;
        case "north": ctx.rotate( deg2rad * 180 ); break;
        case "south": default: break;
    }

    if ( this.isAlive ) {
        ctx.globalAlpha = 0.8;
    } else {
        ctx.globalAlpha = 0.5;
        ctx.scale( .6, .6 );
    }

    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo( -hs, -hs );
    ctx.lineTo( +hs, -hs );
    ctx.lineTo( 0, +hs );
    ctx.lineTo( -hs, -hs );
    ctx.closePath();
    ctx.fill();

    ctx.restore();

};
//############





loop = function() {

    requestAnimFrame.call( this, loop );

    TWEEN.update();

    game.render();

};




game = new Game( {
    nbWBlocks: 15,
    ctx: document.getElementById( 'canvas' ).getContext( '2d' )
} );

loop();
