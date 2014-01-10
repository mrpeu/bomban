
;


//============
// utils
//============

window.requestAnimFrame = function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||function(a){window.setTimeout(a,1E3/60)}}();

//--------------
var deg2rad = Math.PI/180;
var rad2deg = 180/Math.PI;
var twoPI = Math.PI*2;
var DIRECTION = ["west","north","east","south"];

var getHSLA = function( h, s, l, a ){
  return 'hsla('+h+','+s+'%,'+l+'%,'+a+')';
};

Object.extend = function( obj, extension ) {
  for (var prop in extension)
    obj[prop] = extension[prop];
  
  return obj;
};


//--------------
// global variables (pleonasm for "to clean up")
var canvasEl = document.getElementById( 'c' );

var ctx = canvasEl.getContext( '2d' );
    
window.onresize = function()
{
  canvasEl.width = canvasEl.offsetWidth;
  canvasEl.height = canvasEl.offsetHeight;
};
  
var mouse;

window.onmousemove = function(e){
  mouse = {x: e.x, y: e.y};
};
//============




//============
// Game
//============

Game = function(opt){
  Object.extend( this, opt );

  window.onresize();

  this.width = canvasEl.width;
  this.height = canvasEl.height;
  this.nbWBlocks = Math.floor( this.width/this.blockSize );
  this.nbHBlocks = Math.floor( this.height/this.blockSize );

  this.init();

};

Game.prototype.blockSize = 32;
Game.prototype.players = [];
Game.prototype.blocks = [];
Game.prototype.grid = undefined;

Game.prototype.init = function() {

  var blockSize = this.blockSize;

  //--------
  // blocks
  var ratioEmptyBlocks = 0.6;

  for(var i=0; i<this.nbWBlocks; i++)
    for(var j=0; j<this.nbHBlocks; j++){

      this.blocks.push(
        new Block( this, {
          x: j*blockSize,
          y: i*blockSize,
          size: blockSize,
          type: (Math.random()>ratioEmptyBlocks) ? "EMPTY" : "MUD"
        })
      );

    }

  //--------
  // players
  this.players.push(
    this.makeRoomForPlayer( new Player( this, {
      color: getHSLA( 120, 100, 50, 0.9 ),
      x: blockSize/2, y:blockSize/2,
      size: 21
    }), 4 )
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
  this.grid = new Grid( this, {} );

  //--------
  // input
  this.input = new Input( this, {} );

};

Game.prototype.update = function(){

  if(canvasEl.width != this.width || canvasEl.height != this.height){
    this.width = canvasEl.width;
    this.height = canvasEl.height;
    this.grid.nbWBlocks = this.width/this.blockSize;
    this.grid.nbHBlocks = this.height/this.blockSize;
  }

  //--------
  // grid
  this.grid.update();

  //--------
  // blocks
  var allBlocks = this.blocks;
  for(var i=0; i < allBlocks.length; i++){
    allBlocks[i].update();
  }

  //--------
  // players
  var allPlayers = this.players;
  for(var i=0; i < allPlayers.length; i++){
    allPlayers[i].update(ctx);
  }

};

Game.prototype.render = function( ctx ){

  //--------
  // grid
  this.grid.render(ctx);

  //--------
  // blocks
  var allBlocks = this.blocks;
  for(var i=0; i < allBlocks.length; i++){
    allBlocks[i].render(ctx);
  }

  //--------
  // players
  var allPlayers = this.players;
  for(var i=0; i < allPlayers.length; i++){
    allPlayers[i].render(ctx);
  }
};

Game.prototype.getBlock = function( posX, posY ){
  return this.blocks[ Math.round(posX + this.nbHBlocks*posY) ];
};

Game.prototype.getBlockAt = function( x, y ) {
  return this.getBlock( Math.floor(x/this.blockSize), Math.floor(y/this.blockSize) );
};

Game.prototype.getNextBlockAt = function( x, y, direction ){
  x += ( direction=="east" ? this.blockSize : direction=="west" ? -this.blockSize : 0 );
  if( x < 0 || x > this.width ) return;
  y += ( direction=="south" ? this.blockSize : direction=="north" ? -this.blockSize : 0 );
  if( y < 0 || y > this.height ) return;
  return this.getBlockAt( x, y );
};

Game.prototype.makeRoomForPlayer = function( player, nbBlocksToEmpty ){
  // make some empty blocks around the player
  var ba, bb, nextx, nexty, dir;
  bb = this.getBlockAt( player.x, player.y );

  // find a direction in which we can make some room for the player
  do {
    var idir = Math.round(Math.random()*(DIRECTION.length-1));
    dir = DIRECTION[ idir ];
  } while(
    this.getBlockAt(
      bb.x + ( dir=="east" ? this.blockSize*nbBlocksToEmpty : dir=="west" ? -this.blockSize*nbBlocksToEmpty : 0 ),
      bb.y + ( dir=="south" ? this.blockSize*nbBlocksToEmpty : dir=="north" ? -this.blockSize*nbBlocksToEmpty : 0 )
    ) == undefined
  )
  // turn the player toward this direction
  player.direction = dir;
  // clear the way
  for (var i = 0; i < nbBlocksToEmpty; i++) {

    while( bb == undefined || bb == ba ){

      bb = this.getBlockAt(
        ba.x + ( dir=="east" ? this.blockSize : dir=="west" ? -this.blockSize : 0 ),
        ba.y + ( dir=="south" ? this.blockSize : dir=="north" ? -this.blockSize : 0 )
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

Block = function( game, opt ){
  this.game = game;
  Object.extend( this, opt );
  this.init();
};

Block.TYPES = ["MUD", "EMPTY", "ERROR"];
Block.RenderFns = {
  "MUD": function(){
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#3f2a00";
    ctx.fillStyle = "#ffa000";

    var x = this.x, y = this.y, size = this.size-ctx.lineWidth;
    ctx.beginPath();
    ctx.moveTo( x+1, y);
    ctx.lineTo( x+size, y);
    ctx.lineTo( x+size, y+size);
    ctx.lineTo( x+1, y+size);
    ctx.lineTo( x+1, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.fillText( 
      this.type[0]+this.type[1]+this.type[2], // this.id, 
      this.x+3, this.y+12);
    ctx.fillText( 
      this.id, 
      this.x+3, this.y+22);
  },

  "EMPTY": function(){
    ctx.fillStyle = "#7f7f7f";

    var x = this.x, y = this.y, size = this.size-ctx.lineWidth;
    ctx.beginPath();
    ctx.moveTo( x, y);
    ctx.lineTo( x+size, y);
    ctx.lineTo( x+size, y+size);
    ctx.lineTo( x, y+size);
    ctx.lineTo( x, y);
    ctx.fill();
    //ctx.stroke();

    ctx.fillStyle = "#d0d0d0";
    ctx.fillText( 
      this.type[0]+this.type[1]+this.type[2], // this.id, 
      this.x+3, this.y+12);
    ctx.fillText( 
      this.id, 
      this.x+3, this.y+22);
  },

  "ERROR": function(){
    ctx.fillStyle = "#ff0000";

    var x = this.x, y = this.y, size = this.size-ctx.lineWidth;
    ctx.beginPath();
    ctx.moveTo( x, y);
    ctx.lineTo( x+size, y);
    ctx.lineTo( x+size, y+size);
    ctx.lineTo( x, y+size);
    ctx.lineTo( x, y);
    ctx.fill();
    //ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.fillText( "ERROR", this.x+3, this.y+12);
  }
};

Block.prototype.size = 8;
Block.prototype.x = 0;
Block.prototype.y = 0;
Block.prototype.type = "ERROR";

Block.prototype.setRenderFn = function( renderfn ){
  this.render = renderfn || Block.RenderFns[this.type] || this.render;
};
Block.all = [];

Block.prototype.init = function(){
  this.id = Block.all.length;
  Block.all.push( this );
  this.setRenderFn();
};

Block.prototype.update = function(){};

Block.prototype.render = function(){

  ctx.lineWidth = 1;
  //ctx.strokeStyle = getHSLA( 0, 100, 50, 1 );
  ctx.fillStyle = getHSLA( 0, 100, 100, 1 );

  var x = this.x, y = this.y, size = this.size;

  ctx.beginPath();
  ctx.moveTo( x, y );
  ctx.lineTo( x+size, y );
  ctx.lineTo( x+size, y+size );
  ctx.lineTo( x, y+size );
  ctx.lineTo( x, y );
  ctx.fill();
  //ctx.stroke();

  ctx.fillStyle = getHSLA( 0, 0, 100, 0.9 );
  ctx.fillText( this.id, this.x+3, this.y+12 );

};

Block.prototype.fire = function( bomb, power ){
  this.type = "ERROR";
  this.setRenderFn();
  window.setTimeout( function(){ this.type = "EMPTY"; this.setRenderFn(); }.bind(this), 1000 );
}
//============




//============
// Grid
//============

Grid = function(game, opt){
  this.game = game;
  Object.extend( this, opt );
  this.init();
};

Grid.prototype.thickness = 0;
Grid.prototype.color = "#e3e3e3";

Grid.all = [];

Grid.prototype.init = function(){
  this.id = Grid.all.length;
  Grid.all.push(this);
};

Grid.prototype.update = function(time){};

Grid.prototype.render = function(ctx){

  if(this.thickness<1) return;

  ctx.strokeStyle = this.color;
  ctx.lineWidth = this.thickness;

  var s = this.game.blockSize;
  var nbWBlocks = this.game.nbWBlocks;
  var nbHBlocks = this.game.nbHBlocks;

  for(var i = 0; i < nbWBlocks+1; i++)
  {
    ctx.moveTo(0, i*s);
    ctx.lineTo(nbWBlocks*s, i*s);
    ctx.stroke();
  }

  for(var i = 0; i < nbHBlocks+1; i++)
  {
    ctx.moveTo(i*s, 0);
    ctx.lineTo(i*s, nbHBlocks*s);
    ctx.stroke();
  }

};
//============




//============
// Input
//============

var Input = function(game, opt){
  this.game = game;
  Object.extend( this, opt );
  this.init();
};

Input.all = [];

Input.prototype.init = function(){
  this.id = Input.all.length;
  Input.all.push(this);

  window.addEventListener( 'keydown', this.onKeyDown.bind(this), false);
};

Input.prototype.update = function(time){

};

Input.prototype.onKeyDown = function( e ){
  e = e || window.event;

  switch( e.keyCode ){
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

var Player = function(game, opt){
  this.game = game;
  Object.extend( this, opt );
  this.init();
};

Player.prototype.size = 16;
Player.prototype.health = 1;
Player.prototype.x = 0;
Player.prototype.y = 0;
Player.prototype.direction = "ERROR";
Player.prototype.color = "#fff";
Player.prototype.bombs = [];

Player.all = [];

Player.prototype.init = function(){
  this.id = Player.all.length;
  Player.all.push(this);
};

Player.prototype.update = function(time){
  this.bombs.forEach( function(b){ 
    b.update(time);
  });
};

Player.prototype.render = function(ctx) {

  var x = this.x, y = this.y, s = this.size, hs = this.size/2;

  ctx.save();

  ctx.translate(x, y);

  switch(this.direction){
    case "west": ctx.rotate( deg2rad * 90); break;
    case "east": ctx.rotate( deg2rad * -90); break;
    case "north": ctx.rotate( deg2rad * 180); break;
    case "south": default: break;
  }
  
  ctx.lineWidth = 1;
  ctx.strokeStyle = this.color;
  ctx.fillStyle = this.color;

  ctx.beginPath();
  ctx.moveTo( -hs, -hs);
  ctx.lineTo( +hs, -hs);
  ctx.lineTo( 0, +hs);
  ctx.lineTo( -hs, -hs);
  ctx.stroke();
  ctx.fill();

  ctx.restore();

  this.bombs.forEach( function(b){ b.render(); });
};

Player.prototype.canMoveForward = function(){
  var b = this.game.getNextBlockAt( this.x, this.y, this.direction );
  return b!=undefined && b.type == "EMPTY";
};

Player.prototype.moveToward = function( direction ){
  if(this.direction != direction){
    this.direction = direction;
  }

  this.direction = direction;
  if( this.canMoveForward() )
    this.moveForward();
};

Player.prototype.moveForward = function(){

  switch ( this.direction ) {
    case DIRECTION[0]: // left
      this.tweenMoveTo( this.x - this.game.blockSize, this.y );
      break;

    case DIRECTION[1]: // top
      this.tweenMoveTo( this.x, this.y - this.game.blockSize );
      break;

    case DIRECTION[2]: // right
      this.tweenMoveTo( this.x + this.game.blockSize, this.y );
      break;

    case DIRECTION[3]: // bottom
      this.tweenMoveTo( this.x, this.y + this.game.blockSize );
      break;

    default: break;
  }

};

Player.prototype.tweenMoveTo = function ( x, y ) {

  if ( this._tweenMove )
    this._tweenMove.stop();

  this._tweenMove = new TWEEN.Tween( this )
    .to( { x: x, y: y }, 75 )
    .easing( TWEEN.Easing.Quadratic.Out )
    .onUpdate( function ( t ) {
      //console.log( t, this );
    } )
    .start();
}

Player.prototype.action = function(){

  this.bombs.push(
    new Bomb( this.game, {
      player: this,
      x: this.x,
      y: this.y
    })
  );

};
//============




//============
// Bomb
//============

var Bomb = function(game, opt){
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

Bomb.prototype.init = function(){
  this.id = Bomb.all.length;
  Bomb.all.push(this);

  window.setTimeout(
    this.boom.bind( this ),
    this.timeout || 1000
  );

  // temporary
  this.startTick = Date.now();
  this.lastHue = 1;
};

Bomb.prototype.boom = function(){
  this.isAlive = false;
  this.player.bombs.splice( this.player.bombs.indexOf( this ), 1 );
  var thisBlock = this.game.getBlockAt( this.x, this.y );
  thisBlock.fire( this, this.power );
  var cursorBlock, done=false, direction; 

  for( var d = 0; d < DIRECTION.length; d++){
    direction = DIRECTION[d];
    cursorBlock = thisBlock;
    done = false;

    for (var i = 1; i < this.power && !done; i++) {

      cursorBlock = this.game.getNextBlockAt( cursorBlock.x, cursorBlock.y, direction );

      done = cursorBlock == undefined || (cursorBlock.type != "EMPTY" && cursorBlock.type != "ERROR");

      if( cursorBlock != undefined ){
          cursorBlock.fire( this, this.power-i );
      }
    }
  }
};

Bomb.prototype.update = function(time){
  var ellapsedTime = Date.now() - this.startTick;
  this.lastHue = 70 - (70 / this.timeout) * ellapsedTime;
  this.color = getHSLA( this.lastHue, 90, 50, 40 );//+this.lastHue );
  this.colorBorder = (ellapsedTime/250)%2>1 ? "#f40" : "#fa0";
};

Bomb.prototype.render = function(time){

  if( !this.isAlive ) return;

  var s = this.size, x = this.x, y = this.y;

  ctx.save();
  
  ctx.lineWidth = 1;
  ctx.strokeStyle = this.colorBorder || "#000000";
  ctx.fillStyle = this.color;

  ctx.beginPath();
  ctx.arc( x, y, s, 0, twoPI );
  switch(this.direction){
    default: 
    case "north": ctx.arc( x, this.y, s/5, 0, twoPI ); break;
    case "west": ctx.arc( -this.x, y, s/5, 0, twoPI ); break;
    case "east": ctx.arc( this.x, y, s/5, 0, twoPI ); break;
    case "south": ctx.arc( x, -this.y, s/5, 0, twoPI ); break;
  }
  ctx.stroke();
  ctx.fill();
};

//============




//============
// Fire
//============

var Fire = function(game, opt){
  this.game = game;
  Object.extend( this, opt );
  this.init();
};

Fire.prototype.x = 0;
Fire.prototype.y = 0;
Fire.prototype.power = 10;
Fire.prototype.direction = DIRECTION[1];
Fire.prototype.color = "#ff0000";
Fire.prototype.colorBorder = "#000000";
Fire.prototype.timeout = 3000;
Fire.prototype.isAlive = true;

Fire.all = [];

Fire.prototype.init = function(){
  this.id = Fire.all.length;
  Fire.all.push(this);

  window.setTimeout(
    this.boom.bind( this ),
    this.timeout || 1000
  );

  // temporary
  this.startTick = Date.now();
};

Fire.prototype.update = function(time){
  var ellapsedTime = Date.now() - this.startTick;
  this.lastHue = 70 - (70 / this.timeout) * ellapsedTime;
  this.color = getHSLA( Math.random*15, 90, 50, 40 );
  this.colorBorder = (ellapsedTime/250)%2>1 ? "#f40" : "#fa0";
};

Fire.prototype.render = function(time){

  if( !this.isAlive ) return;

  var s = this.size, x = this.x, y = this.y;

  ctx.save();
  
  ctx.lineWidth = 1;
  ctx.strokeStyle = this.colorBorder || "#000000";
  ctx.fillStyle = this.color;

  ctx.beginPath();
  ctx.arc( x, y, s, 0, twoPI );
  switch(this.direction){
    default: 
    case "north": ctx.arc( x, this.y, s/5, 0, twoPI ); break;
    case "west": ctx.arc( -this.x, y, s/5, 0, twoPI ); break;
    case "east": ctx.arc( this.x, y, s/5, 0, twoPI ); break;
    case "south": ctx.arc( x, -this.y, s/5, 0, twoPI ); break;
  }
  ctx.stroke();
  ctx.fill();
};

//============







loop = function() {

  requestAnimFrame.call( this, loop );

  TWEEN.update();

  game.update();

  ctx.clearRect( 0, 0, canvasEl.width, canvasEl.height );

  game.render( ctx );

};




game = new Game({
  blockSize: 28
});

loop();


/*
todos:
- replace initialisation with || by a function filling the undefined by default values
*/
