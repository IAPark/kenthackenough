'use strict';

let Gamify = require('./model');
let User = require('../users/model');
let Application = require('../users/application/model');

module.exports = {

  leaderboard: (req, res) => {
    Gamify
    .aggregate([
      // 1. Find all entries in table.
      {$match: { }},
      // 2. Put all the points for a user in an array.
      {$group:{
        _id: '$userID',
        email: { $first: '$email' },
        pointsItems: {$push: {points: '$points'}}}
      },
      // 3. Remove items from the array for doing the sum.
      {$unwind: '$pointsItems'},
      // 4. Add all the points for user.
      {$group: {
        _id: '$_id' , // This is the userID
        email: { $first: '$email'},
        points: {$sum: '$pointsItems.points'}}
      },
      // 5. Sort in from highest score to lowest score.
      {$sort: {
          points: -1
        }
      }])
    .exec((err, leaderboard) =>
    {
      if (err)
      {
        res.send(err);
        throw err;
      } 
      else
      {
        res.send(leaderboard);
      }
    });    
  },

  addPoints: (req, res) => {    
    let test = /^[^@]*/;

    let points = {
      userID: req.user._id,
      points: req.params.points,
      sponsorerID: req.params.src,
      reason: req.params.reason,
      pointID: req.params.pid,
      email: test.exec(req.user.email)[0]
    };

    if (!Gamify.validate(points))
    {
      console.log('invalid input');
      res.send('invalid input');
      return;
    }

    Gamify
    .find({ 
      userID: points.userID,
      pointID: points.pointID
    })
    .count()
    .exec((err, cnt) => {
        if (cnt <= 0)
        {
          Gamify(points).save((err, p) => {
            res.send('ok');
          });
        }
    });
  },
};