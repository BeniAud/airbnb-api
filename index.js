var express = require("express");
var app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.json());

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
// const randomPassword = uid2(12);
// const password = "azerty";
// const token = uid2(64);
// const salt = uid2(64);
// const hash = SHA256(password + salt).toString(encBase64);

const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/airbnb");
//------------------------------------------------------------------------------------------//

// 1) Definir le model room-----------------------------------------------------------------//

const RoomModel = mongoose.model("room", {
  title: String,
  description: String,
  photos: [String],
  price: Number,
  ratingValue: {
    type: Number,
    default: null
  },
  reviews: {
    type: Number,
    default: 0
  },
  city: String,
  loc: {
    type: [Number], // Longitude et latitude
    index: "2dsphere" // Créer un index geospatial https://docs.mongodb.com/manual/core/2dsphere/
  }
});
// creation User --------------------------------------//

const userModel = mongoose.model("user", {
  account: {
    username: String,
    biography: String
  },
  email: String,
  token: String,
  hash: String,
  salt: String
});

// 2) Créer des documents
//-------------------------------------------------------------------------------------------//

app.post("/api/room/publish", function(req, res) {
  const newRoom = new RoomModel({
    title: req.body.title,
    description: req.body.description,
    photos: req.body.photos,
    price: req.body.price,
    city: req.body.city,
    loc: req.body.loc
  });
  // const newRoom = new RoomModel(req.body);
  //   newRoom.save(function(err, roomSaved) {
  //     if (err) {
  //       res.json(error: error.message);
  //     }else{
  //       res.json(room);
  //     }
  //   });

  // });
  // 3) Sauvegarder des documents
  //------------------------------------//

  newRoom.save(function(err, createdRoom) {
    console.log(createdRoom_id);
  });
  res.json(req.body);
});

// 4)appeler avec id
//-------------------------------------------------------------------------------------------//

app.get("/api/room/:id", function(req, res) {
  RoomModel.find({ _id: req.params.id }).exec(function(err, room) {
    if (!err) {
      res.json(room);
    }
  });
});

//5) recherche par ville
//-------------------------------------------------------------------------------------------//
// Requête GET : /api/rooms
// Exemple : /api/rooms?city=Paris
app.get("/api/rooms", function(req, res) {
  RoomModel.find({ city: req.query.city }).exec(function(err, room) {
    if (!err) {
      res.json(room);
    }
  });
});
// app.get("/api/rooms", function(req, res) {
//   RoomModel.find({ city: req.query.city }).exec(function(err, rooms) {
//     if (!err) {
//       res.json({
//         rooms:rooms,
//         count:rooms.length
//       });
//     }
//   });
// });
//6) filtrer par prix avec les paramètres priceMin et priceMax
//-------------------------------------------------------------------------------------------//

app.get("/api/roomPrice", function(req, res) {
  RoomModel.find({
    price: {
      $gt: req.query.priceMin,
      $lt: req.query.priceMax
    }
  }).exec(function(err, room) {
    if (!err) {
      res.json(room);
    }
  });
});
// filtrer par prix pagination
//--------------------------------------------------------------------------------------------//
// app.get("/api/rooms", function(req, res) {
//   const filters = {};

//   if (req.query.city) {
//     filters.city = req.query.city;
//   }
//   if (req.query.priceMin) {
//     if (!filters.price) {
//       filters.price = {};
//     }
//     filters.price.$gt = req.query.priceMin;
//   }
//   if (req.query.priceMax) {
//     if (!filters.price) {
//       filters.price = {};
//     }
//     filters.price.$lt = req.query.priceMax;
//   }

//   /*
//    Un tableau de rooms, 100 rooms.
//    1 page de résultats doit contenir 10 appartements.

//    page 1 :
//    find().limit(25);

//    page 2 :
//    find().limit(25).skip(25);

//    page 3 :
//    find().limit(25).skip(50);
//   */

//   const limit = 25;
//   let page;
//   if (req.query.page) {
//     page = req.query.page;
//   } else {
//     page = 1;
//   }

//   RoomModel.find(filters)
//     .skip((page - 1) * limit)
//     .limit(limit)
//     .sort({
//       price: "asc"
//     })
//     .exec(function(err, rooms) {
//       if (err) {
//         res.json({ error: err.message });
//       } else {
//         const response = {};
//         response.rooms = rooms;
//         response.count = rooms.length;

//         res.json(response);
//       }
//     });
// });
//Service 1 - Inscription & creation USER
//--------------------------------------------------------------------------------------------//

app.post("/api/user/sign_up", function(req, res) {
  let salt = uid2(64);

  const password = req.body.password;
  const hash = SHA256(password + salt).toString(encBase64);
  const newUser = new userModel({
    // newUser est une instance du model user
    account: {
      username: req.body.username,
      biography: req.body.biography
    },
    email: req.body.email,
    token: uid2(64),
    salt: salt,
    hash: hash
  });

  //, "_id token account"
  newUser.save(function(err, createdUser) {
    res.json({
      _id: createdUser._id,
      token: createdUser.token,
      account: createdUser.account
    });
  });
});
// Service 2 - Connexion----------------------------------------------------------//

app.post("/api/user/log_in", function(req, res) {
  userModel.findOne({ email: req.body.email }).exec(function(err, userOpen) {
    const password = req.body.password;
    const hash = SHA256(password + userOpen.salt).toString(encBase64);
    // console.log(userOpen);
    console.log(hash);
    console.log(userOpen.hash);
    // console.log(password);
    // console.log(userOpen.email);
    if (hash === userOpen.hash) {
      res.json({
        _id: userOpen._id,
        token: userOpen.token,
        account: {
          username: userOpen.account.username,
          biography: userOpen.account.biography
        }
      });
    } else {
      res.json({
        error: {
          message: "Invalid password or email"
        }
      });
    }
  });
});
//Service 3 - Profil-----------------------------------------------------------------------//
app.get("/api/user/:id", function(req, res) {
  userModel
    .findOne({ token: req.headers.authorization })
    .exec(function(err, MyToken) {
      if (MyToken) {
        userModel
          .findOne({ _id: req.params.id })
          .exec(function(err, MyProfile) {
            res.json({
              _id: MyProfile._id,
              account: MyProfile.account
            });
          });
        console.log(req.headers.authorization);
      } else {
        res.status(401).json({
          error: {
            message: "Invalid token"
          }
        });
      }
    });
});

//-------------------------------------------//
//  app.get("/api/user/:id", function(req, res) {
//   let headerToken = req.headers.authorization;

//   User.findOne({ _id: req.params.id }, function(err, profile) {
//     let tokenSave = "Bearer " + profile.token;
//     if (tokenSave === headerToken) {
//       res.status(200).json({
//         _id: profile._id,
//         account: {
//           username: profile.account.username,
//           biography: profile.account.biography
//         }
//       });
//     } else {
//       res.status(401).json({
//         error: {
//           message: "Invalid token"
//         }
//       });
//     }
//   });
// });
//interro mail //
//-------------------------------------------------------------------------------------------//

app.get("/api/user/edit", function(req, res) {});

//demarrer le serveur //
//-------------------------------------------------------------------------------------------//

app.listen(3000, function() {
  console.log("Server started");
});
