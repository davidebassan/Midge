
//x1 = ((-25 * Math.cos(self.rotation)) - (-25 * Math.sin(self.rotation))+ self.x_orig);
//y1 = (-(-25 * Math.sin(self.rotation)) + (-25 * Math.cos(self.rotation))+ self.y_orig);
// TODO: var mongojs = require('mongojs');

var db = null;//mongojs('localhost:27017/Midge',['account','progress']);

var sat = require('sat');

var path = require('path');

var express = require('express');

var app = express();

var serv = require('http').Server(app);

app.get('/',function(req, res){
     res.sendFile(path.join(__dirname, '/client/index.html'));
});
app.use(express.static(path.join(__dirname + '/client/')));

serv.listen(process.env.PORT || 8080);
console.log('Server aperto');

var SOCKET_LIST = {};

var Entity = function(){
  var self = {
    x: 500,
    y: 500,
    spdX: 0,
    spdY: 0,
    id: "",
    rotation: 0,
  }
  self.update = function(){
    self.updatePosition();
  }
  self.updatePosition = function(){
    self.x += self.spdX;
    self.y += self.spdY;
  }

  return self;
}

var Player = function(username,id){
  var self = Entity();
  self.id = id;
  self.username = username;
  self.number ="" + Math.floor(Math.random()*10);
  self.pressingRight = false;
  self.pressingLeft = false;
  self.pressingUp = false;
  self.pressingDown = false;
  self.maxSpd = 0.5;
  self.hp = 10;
  self.hpMax = 10;
  self.score = 0;
  self.lose = false;
  // TODO:
  self.getColor = function (){
    var letters = '0123456789ABCDEF';
    self.color = '#';
    for (var i = 0; i < 6; i++) {
      self.color += letters[Math.floor(Math.random() * 16)];
    }
  }

  var super_update = self.update;
  self.update = function(){
    self.updateSpd();
    self.checkCollision();
    super_update();
  }

  self.checkCollision = function(){
    for(var i in Player.list){
      var p = Player.list[i];
      if(self.id !== p.id){
        var slf = new sat.Box(new sat.Vector(self.x-25,self.y-25),50,50).toPolygon();
        var pl = new sat.Box(new sat.Vector(p.x-25,p.y-25),50,50).toPolygon();

        var tr_slf = new sat.Polygon(new sat.Vector(self.x-25, self.y-25), [
          new sat.Vector(-25, -25),
          new sat.Vector(-25, 0),
          new sat.Vector(0, -25)
        ]);

        var tr_pl = new sat.Polygon(new sat.Vector(p.x-25, p.y-25), [
          new sat.Vector(-25, -25),
          new sat.Vector(-25, 0),
          new sat.Vector(0, -25)
        ]);

        slf.translate(-25,-25);
        pl.translate(-25,-25);

        tr_slf.translate(-0,-0);
        tr_pl.translate(-0,-0);

        tr_slf.setAngle(self.rotation);
        tr_pl.setAngle(p.rotation);

        slf.setAngle(self.rotation);
        pl.setAngle(p.rotation);


        var collide = sat.testPolygonPolygon(slf,pl);

        if(collide){
          var tr_to_tr = sat.testPolygonPolygon(tr_slf,tr_pl);
          if(tr_to_tr){
            console.log("Rimbalzo");
            self.x += Math.random() * (70 - (-150)) + (-150);
            self.y += Math.random() * (70 - (-150)) + (-150);
            p.x += Math.random() * (70 - (-150)) + (-150);
            p.y += Math.random() * (70 - (-150)) + (-150);
          }
          else{
            var slf_to_pl = sat.testPolygonPolygon(tr_slf,pl);
            if(slf_to_pl){
              console.log("Self Vince");
              self.score += 1;
              p.lose = true;
            }
            else{
              var pl_to_slf = sat.testPolygonPolygon(tr_pl,slf);
              if(pl_to_slf){
                console.log("Player Vince");
                p.score += 1;
                self.lose = true;
              }
              else{
                console.log("Rimbalzo");
                self.x += Math.random() * (70 - (-150)) + (-150);
                self.y += Math.random() * (70 - (-150)) + (-150);
                p.x += Math.random() * (70 - (-150)) + (-150);
                p.y += Math.random() * (70 - (-150)) + (-150);
              }
            }
          }
        }

      }
    }
  }


  self.updateSpd = function(){
    if(self.pressingRight)
      self.spdX += self.maxSpd;
    else{
      if(self.pressingLeft)
        self.spdX -= self.maxSpd;
      else
        self.spdX = 0;
    }
    if(self.pressingUp)
      self.spdY -= self.maxSpd;
    else{
      if(self.pressingDown)
        self.spdY += self.maxSpd;
      else self.spdY = 0;
    }
  }

  self.getInitPack = function(){
    return {
      username: self.username,
      id:self.id,
      x:self.x,
      y:self.y,
      number: self.number,
      hp: self.hp,
      hpMax: self.hpMax,
      score: self.score,
      color: self.color,
      rotation: self.rotation,
      lose: self.lose
    };
  }

  self.getUpdatePack = function(){
    return {

      username: self.username,
      id:self.id,
      x:self.x,
      y:self.y,
      hp: self.hp,
      hpMax: self.hpMax,
      score: self.score,
      color: self.color,
      rotation: self.rotation,
      lose: self.lose
    };
  }

  Player.list[id] = self;

  initPack.player.push(self.getInitPack());
  return self;

}

Player.list = {};

Player.onConnect = function(username,socket){
  var player = Player(username,socket.id);
  socket.on('keyPress',function(data){
    if(data.inputId === 'left')
      player.pressingLeft = data.state;
    if(data.inputId === 'right')
        player.pressingRight = data.state;
    if(data.inputId === 'up')
        player.pressingUp = data.state;
    if(data.inputId === 'down')
        player.pressingDown = data.state;
  });

  socket.on("mouseDown",function(data){
    // if(data.ym < data.yw)
    //   player.pressingUp = true;
    // else
    //   player.pressingUp = false;
    // if(data.ym > data.yw)
    //   player.pressingDown = true;
    // else
    //   player.pressingDown = false;
    // if(data.xm < data.xw)
    //   player.pressingLeft = true;
    // else
    //   player.pressingLeft = false;
    // if(data.xm > data.xw)
    //   player.pressingRight = true;
    // else
    //   player.pressingRight = false;
    //
    ang = Math.atan2(data.yw - data.ym, data.xw - data.xm);
    player.rotation = ang;
  });
  socket.emit('init',{
    selfId: socket.id,
    player: Player.getAllInitPack(),
  });
}


Player.getAllInitPack = function(){
  var players = [];
  for(var i in Player.list)
    players.push(Player.list[i].getInitPack());
  return players;
}


Player.onDisconnect = function(socket){
  delete Player.list[socket.id];
  removePack.player.push(socket.id);
}

Player.update = function(){
  var pack = [];
  for(var i in Player.list){
      var player = Player.list[i];
      player.update();
      if(player.lose){
        delete Player.list[player.id];
        removePack.player.push(player.id);
      }
      pack.push(player.getUpdatePack());
  }

  return pack;
}



var DEBUG = false;

var isValidPassword = function(data,cb){
  //TO remove
  return cb(true);
  db.account.find({username:data.username, password:data.password},function(err,res){
      if(res.length > 0)
        cb(true);
      else
        cb(false);
  });
}

var isUsernameTaken = function(data,cb){
  //TO remove
  return cb(false);
  db.account.find({username:data.username},function(err,res){
      if(res.length > 0)
        cb(true);
      else
        cb(false);
  });
}
var addUser = function(data,cb){
    //TO remove
  return cb();
  db.account.insert({username:data.username, password: data.password},function(err){
    cb();
  });
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;
  socket.on('signIn', function(data){

    isValidPassword(data,function(res){
      if(res){
        Player.onConnect(data.username,socket);
        socket.emit('signInResponse',{success:true});
      }
      else
        socket.emit('signInResponse',{success:false});
    });
  });

  socket.on('signUp', function(data){
    isUsernameTaken(data,function(res){
      if(res)
        socket.emit('signUpResponse',{success:false});
      else
        addUser(data,function(){
          Player.onConnect(socket);
          socket.emit('signUpResponse',{success:true});
        });
    });
  });

  socket.on('disconnect', function(){
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });

  socket.on('sendMsgToServer', function(data){
    var playerName = (Player.list[socket.id].username);
    for(var i in SOCKET_LIST){
      SOCKET_LIST[i].emit('addToChat','<b style="background-color: white; color: red">' + playerName + '</b>'+ ': ' + data);
    }
  });

  socket.on('evalServer', function(data){
    if(!DEBUG)
      return;
    var res = eval(data);
    socket.emit('evalAnswer', res);
  });
});


var initPack = {
  player: [],
}

var removePack = {
  player: [],
}

setInterval(function(){
  var pack = {
    player: Player.update(),
  }

  for(var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    socket.emit('init',initPack);
    socket.emit('update',pack);
    socket.emit('remove',removePack);
  }
  initPack.player = [];

},1000/25);
