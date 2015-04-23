var express = require('express');
var https = require('https');
var Q = require('q');
var async = require('async');
var jsonPath = require('JSONPath');

var AlchemyAPI = require('./alchemyapi');
var alchemyapi = new AlchemyAPI();

var router = express.Router();
var foursquare = {
    clientId: '4PE40GCZEXZHXNKO2DYW11HIMSIT4054GW5H1CM12JYMNUQJ',
    clientSecret: 'KGMG5BLMV50KUR0OOPKTTTOFMLU2TGEC3WOW2FDNBRIW5ZRJ'
};

router.get('/restaurant', function(req, res) {
    var searchName = req.query.search;
    var restaurant = { name: searchName };

    searchRestaurantIdByName(restaurant)
    .then(getRestaurantLikes)
    .then(getRestaurantTips)
    .then(analysisTips)
    .then(function(result) {
        res.send(result);
    })
    .catch(function(err) {
        console.log('Failed to find the restaurant! ERRMSG: '+err);
        res.status(404).end('Not Found!');
    })
    .done();
});

var searchRestaurantIdByName = function(restaurant) {
    console.log('[searchRestaurantIdByName] search name: '+restaurant.name);
    var deferred = Q.defer();
    var options = {
        host: 'api.foursquare.com',
        port: 443,
        path: '/v2/venues/search?query=' + encodeURIComponent(restaurant.name) +
            '&intent=global' +
            '&client_id=' + foursquare.clientId +
            '&client_secret=' + foursquare.clientSecret +
            '&v=20150315',
        headers: {
            Accept: '*/*'
        },
        method: 'GET'
    };
    var req = https.request(options, function(res) {
        console.log('[searchRestaurantIdByName] response: '+res.statusCode);
        var str = '';
        res.on('data', function(data) {
            str += data;
        });
        res.on('end', function() {
            console.log('[searchRestaurantIdByName] response: '+str);
            var error = new Error('No restaurant found!');
            var result = JSON.parse(str);
            var list = result.response.venues;
            if (list === 'undefined' ||
                list.length === 0) {
                deferred.reject(error);
            }
            else {
                var target = null;
                list.forEach(function(item) {
                    console.log('restaurant name: '+item.name);
                    if (item.name === restaurant.name) {
                        target = item;
                    }
                });
                if (target) {
                    restaurant.id = target.id;
                    restaurant.type = jsonPath.eval(target, '$.categories[0].name')[0];
                    restaurant.phone = jsonPath.eval(target, '$.contact.phone')[0];
                    restaurant.twitter = jsonPath.eval(target, '$.contact.twitter')[0];
                    restaurant.address = jsonPath.eval(target, '$.location.address')[0];
                    deferred.resolve(restaurant);
                }
                else {
                    deferred.reject(error);
                }
            }
        });
        res.on('error', function(e) {
            console.log('[searchRestaurantIdByName] ERROR: '+e);
            deferred.reject(new Error(e));
        });
    });
    req.end();
    req.on('error', function(e) {
        console.log(e);
        deferred.reject(new Error(e));
    });
    return deferred.promise;
};

var getRestaurantLikes = function(restaurant) {
    console.log('[getRestaurantLikes] input id: '+restaurant.id);
    var deferred = Q.defer();
    var options = {
        host: 'api.foursquare.com',
        port: 443,
        path: '/v2/venues/' + restaurant.id + '/likes?' +
            '&client_id=' + foursquare.clientId +
            '&client_secret=' + foursquare.clientSecret +
            '&v=20150315',
        headers: {
            Accept: '*/*'
        },
        method: 'GET'
    };
    var req = https.request(options, function(res) {
        var str = '';
        res.on('data', function(data) {
            str += data;
        });
        res.on('end', function() {
            console.log('[getRestaurantLikes] response: '+str);
            var error = new Error('Failed to get likes!');
            var result = JSON.parse(str);
            var likes = result.response.likes;
            if (likes === 'undefined') {
                deferred.reject(error);
            }
            else {
                restaurant.likes = likes;
                deferred.resolve(restaurant);
            }
        });
        res.on('error', function(e) {
            console.log('[getRestaurantLikes] ERROR: '+e);
            deferred.reject(new Error(e));
        });
    });
    req.end();
    req.on('error', function(e) {
        console.log(e);
        deferred.reject(new Error(e));
    });
    return deferred.promise;
};

var getRestaurantTips = function(restaurant) {
    console.log('[getRestaurantTips] input id: '+restaurant.id);
    var deferred = Q.defer();
    var options = {
        host: 'api.foursquare.com',
        port: 443,
        path: '/v2/venues/' + restaurant.id + '/tips?' +
            '&sort=recent' +
            '&limit=500' +
            '&client_id=' + foursquare.clientId +
            '&client_secret=' + foursquare.clientSecret +
            '&v=20150315',
        headers: {
            Accept: '*/*'
        },
        method: 'GET'
    };
    var req = https.request(options, function(res) {
        var str = '';
        res.on('data', function(data) {
            str += data;
        });
        res.on('end', function() {
            console.log('[getRestaurantTips] response: '+str);
            var error = new Error('No tips found!');
            var result = JSON.parse(str);
            var tips = result.response.tips;
            if (tips === 'undefined' ||
                tips.count === 0) {
                deferred.reject(error);
            }
            else {
                tipText = '';
                tips.items.forEach(function(tip) {
                    text = '"'+tip.user.firstName+' said '+tip.text+'."';
                    tipText += text + '\n';
                });
                restaurant.tips = tipText;
                deferred.resolve(restaurant);
            }
        });
        res.on('error', function(e) {
            console.log('[getRestaurantTips] ERROR: '+e);
            deferred.reject(new Error(e));
        });
    });
    req.end();
    req.on('error', function(e) {
        console.log(e);
        deferred.reject(new Error(e));
    });
    return deferred.promise;
};

var analysisTips = function(restaurant) {
    var deferred = Q.defer();
    async.parallel([
        function(callback) {
            alchemyapi.keywords('text', restaurant.tips, { 'sentiment': 1 }, function(res) {
                callback(null, JSON.stringify(res.keywords));
            });
        },
        function(callback) {
            alchemyapi.entities('text', restaurant.tips, { 'sentiment': 1 }, function(res) {
                callback(null, JSON.stringify(res.entities));
            });
        }
    ],
    function(err, result) {
        if (err) { deferred.reject(err); }

        console.log('result: ' + result[0]);
        console.log('result: ' + result[1]);
        var keywords = JSON.parse(result[0]);
        var entities = JSON.parse(result[1]);

        keywords.forEach(function(word, index, object) {
            if (word.sentiment.score === 'undefined') { object.splice(index, 1); }
        });
        var rank = keywords.sort(function(word1, word2) {
            return parseFloat(word2.sentiment.score) - parseFloat(word1.sentiment.score);
        });

        deferred.resolve(JSON.stringify({
            name: restaurant.name,
            type: restaurant.type,
            contact: {
                phone: restaurant.phone,
                twitter: restaurant.twitter
            },
            location: {
                address: restaurant.address,
            },
            likes: restaurant.likes.count,
            recommendations: [rank[0].text, rank[1].text, rank[2].text],
            shouldAvoid: [rank[rank.length - 1].text, rank[rank.length - 2].text, rank[rank.length - 3].text]
        }));
    });
    return deferred.promise;
};

module.exports = router;
