var express = require('express');
var app = express();
var session = require('cookie-session');
var bodyParser = require('body-parser');
app.set('view engine', 'ejs');

var fs = require('fs');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;

var mongourl = 'mongodb://hi:kaiyung0903@ds151382.mlab.com:51382/kaiyungli';

var logoutTimer = setTimeout(function(){sessionStorage.clear();},(10*60*10000));

var SECRETKEY1 = 'key1';
var SECRETKEY2 = 'key2';

var users = new Array(
	{name: 'developer', password: 'developer'},
	{name: 'guest', password: 'guest'},
	{name: '123', password: '123'},
	{name: 'demo', password: ''},
	{name: 'student', password: ''}
);

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2],
  maxAge: 60 * 5000
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/login',function(req,res) {
	res.render('login');
});

app.post('/login',function(req,res) {
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
		}
	}
	res.redirect('/');
});

app.get('/',function(req,res) {
  console.log(req.session);
  if (!req.session.authenticated) {
    res.redirect('/login');
  } else {
    MongoClient.connect(mongourl, function(err,db) {
      try {
        assert.equal(err,null);
      } catch (err) {
        res.set({"Content-Type":"text/plain"});
        res.status(500).end("MongoClient connect() failed!");
      }
      console.log('Connected to MongoDB');
      findRestaurant(db,{},function(Restaurant) {
        db.close();
        console.log('Disconnected MongoDB');
        res.render("list.ejs",{Restaurant:Restaurant,name:req.session.username});
      });
    });
  }
});

app.get('/fileupload', function(req,res) {
  res.render("upload.ejs");
});

app.post('/fileupload', function(req,res) {
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
	  var form = new formidable.IncomingForm();
	  form.parse(req, function (err, fields, files) {
	    console.log(JSON.stringify(files));
	    var filename = files.filetoupload.path;
	    if (fields.name) {
	      var name = (fields.name.length > 0) ? fields.name : "unnamed";
	    }
	    if (fields.borough) {
	      var borough = (fields.borough.length > 0) ? fields.borough : "n/a";
	    }
	    if (fields.cuisine) {
	      var cuisine = (fields.cuisine.length > 0) ? fields.cuisine : "n/a";
	    }
	    if (fields.street) {
	      var street = (fields.street.length > 0) ? fields.street : "n/a";
	    }
	    if (fields.building) {
	      var building = (fields.building.length > 0) ? fields.building : "n/a";
	    }
	    if (fields.zipcode) {
	      var zipcode = (fields.zipcode.length > 0) ? fields.zipcode : "n/a";
	    }
	    if (fields.gpslon) {
	      var gpslon = (fields.gpslon.length > 0) ? fields.gpslon : "n/a";
	    }
	    if (fields.gpslat) {
	      var gpslat = (fields.gpslat.length > 0) ? fields.gpslat : "n/a";
	    }
			if (files.filetoupload.size != 0) {
		    if (files.filetoupload.type) {
		      var mimetype = files.filetoupload.type;
		    }
			}
	    console.log("name = " + name);
	    console.log("filename = " + filename);
	    fs.readFile(filename, function(err,data) {
	      MongoClient.connect(mongourl,function(err,db) {
	        try {
	          assert.equal(err,null);
	        } catch (err) {
	          res.set({"Content-Type":"text/plain"});
	          res.status(500).end("MongoClient connect() failed!");
	        }

	        var address = {};
	        address['street'] = street,
	        address['building'] = building,
	        address['zipcode'] = zipcode,
	        address['coord'] = [gpslat,gpslon];


	        var new_r = {};
	        var img = new Buffer(data).toString('base64');
	        new_r['owner'] = req.session.username;
	        new_r['name'] =  name;
	        new_r['borough'] = borough;
	        new_r['cuisine'] = cuisine;
	        new_r['address'] = address;
	        new_r['mimetype'] = mimetype;
	       	new_r['image'] = img;
	        insertRestaurant(db,new_r,function(result) {
	          db.close();
	          res.set({"Content-Type":"text/html"});
	          res.render("create.ejs",{
	                                id:result._id,
	                                name:name,
																	borough:borough,
	  															cuisine:cuisine,
	                                mime:result.mimetype,
	                                img:result.image,
	  															street:street,
	  															building:building,
	  															zipcode:zipcode,
	  															gpslon:gpslon,
	  															gpslat:gpslat,
	  															username:req.session.username});
	        });
	      });
	    });
	  });
	}
});

app.get('/rate', function (req,res){
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else
	  {
	    MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.set({"Content-Type":"text/plain"});
	        res.status(500).end("MongoClient connect() failed!");
	      }
	      console.log('Connected to MongoDB');
	      var criteria = {};
	      criteria['_id'] = ObjectID(req.query._id);
	      findRestaurant(db,criteria, function(Restaurant) {
	        db.close();
	        console.log('Disconnected MongoDB');
	        console.log('Restaurant returned = ' + Restaurant.length);
	        var image = new Buffer(Restaurant[0].image,'base64');
	        var contentType = {};
	        contentType['Content-Type'] = Restaurant[0].mimetype;
	        console.log(contentType['Content-Type']);
	        res.render('rate.ejs',{Restaurant:Restaurant});
	      });
	    });
	  }

});

app.post('/rate', function(req,res) {
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
	  var form = new formidable.IncomingForm();
	  form.parse(req, function (err, fields, files) {
	    console.log(JSON.stringify(files));


	      MongoClient.connect(mongourl,function(err,db) {
	        try {
	          assert.equal(err,null);
	        } catch (err) {
	          res.set({"Content-Type":"text/plain"});
	          res.status(500).end("MongoClient connect() failed!");
	        }
					var id = fields.id;
	        var rate = fields.rate;
					var owner = req.session.username;

					var new_r = {};
					new_r['rate'] = rate;
	        var newvalues = {$push:{rate:{"rate":rate,"owner" :owner}}};

					var criteria = {};
		      criteria['_id'] = ObjectID(id);


	        rateRestaurant(db,criteria,newvalues,function(result) {
						console.log(JSON.stringify(newvalues));
						db.close();
	          res.set({"Content-Type":"text/html"});
	          res.render("ratesuccess.ejs");
	        });
	      });

	  });
	}
});


app.get('/searchby', function(req,res) {
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
		var searchtext = req.query.searchtext;
		var searchby = req.query.searchoption;
		console.log(searchby);
		MongoClient.connect(mongourl, function(err,db) {
			try {
				assert.equal(err,null);
			} catch (err) {
				res.set({"Content-Type":"text/plain"});
				res.status(500).end("MongoClient connect() failed!");
			}
			console.log('Connected to MongoDB');
			var criteria = {};
			criteria[searchby] = searchtext;
			findRestaurant(db,criteria, function(Restaurant) {
	      db.close();
				console.log('Disconnected MongoDB');
				console.log('Restaurant returned = ' + Restaurant.length);
		    console.log('Disconnected MongoDB');
		    res.render("search.ejs",{Restaurant:Restaurant,option:searchby,search:searchtext});
		   });
		});
	}
});

app.get('/api/restaurant/name/:name',function(req,res){
	var criteria = {};
	criteria['name'] = req.params.name;
	MongoClient.connect(mongourl, function(err,db) {
		findRestaurant(db,criteria, function(Restaurant) {
			db.close();
			console.log('Disconnected MongoDB');
			console.log('Restaurant returned = ' + Restaurant.length);
			var image = new Buffer(Restaurant[0].image,'base64');
			var result = {};
			res.status(200).json(Restaurant).end();
		});
	});
});

app.get('/api/restaurant/borough/:borough',function(req,res){
	var criteria = {};
	criteria['borough'] = req.params.borough;
	MongoClient.connect(mongourl, function(err,db) {
		findRestaurant(db,criteria, function(Restaurant) {
			db.close();
			console.log('Disconnected MongoDB');
			console.log('Restaurant returned = ' + Restaurant.length);
			var image = new Buffer(Restaurant[0].image,'base64');
			var result = {};
			res.status(200).json(Restaurant).end();
		});
	});
});

app.get('/api/restaurant/cuisine/:cuisine',function(req,res){
	var criteria = {};
	criteria['cuisine'] = req.params.cuisine;
	MongoClient.connect(mongourl, function(err,db) {
		findRestaurant(db,criteria, function(Restaurant) {
			db.close();
			console.log('Disconnected MongoDB');
			console.log('Restaurant returned = ' + Restaurant.length);
			var image = new Buffer(Restaurant[0].image,'base64');
			var result = {};
			res.status(200).json(Restaurant).end();
		});
	});
});

app.post('/api/restaurant/',function(req,res){
	MongoClient.connect(mongourl,function(err,db) {
		var address = {};
		address['street'] = req.body.street,
		address['building'] = req.body.building,
		address['zipcode'] = req.body.zipcode,
		address['coord'] = [req.body.gpslat,req.body.gpslon];
		var new_r = {};
		new_r['name'] =  req.body.name;
		new_r['borough'] = req.body.borough;
		new_r['cuisine'] = req.body.cuisine;
		new_r['address'] = address;
		insertRestaurant(db,new_r,function(result) {
			db.close();
			res.json({
				status: "ok",
				_id: result._id
			});
			if (err){
				res.json({
					status: "failed",
				});
			}
		});
	});
});


app.get('/display', function(req,res) {
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
	  MongoClient.connect(mongourl, function(err,db) {
	    try {
	      assert.equal(err,null);
	    } catch (err) {
	      res.set({"Content-Type":"text/plain"});
	      res.status(500).end("MongoClient connect() failed!");
	    }
	    console.log('Connected to MongoDB');
	    var criteria = {};
	    criteria['_id'] = ObjectID(req.query._id);
	    findRestaurant(db,criteria, function(Restaurant) {
	      db.close();
	      console.log('Disconnected MongoDB');
	      console.log('Restaurant returned = ' + Restaurant.length);
	      var image = new Buffer(Restaurant[0].image,'base64');
	      var contentType = {};
	      contentType['Content-Type'] = Restaurant[0].mimetype;
	      console.log(contentType['Content-Type']);
	      res.render('display.ejs',{Restaurant:Restaurant});
	    });
	  });
	}
});

	app.get('/delete', function (req,res){
		if (!req.session.authenticated) {
			res.redirect('/login');
		} else {
		  if(req.query.owner == req.session.username){
		    MongoClient.connect(mongourl, function(err,db) {
		      try {
		        assert.equal(err,null);
		      } catch (err) {
		        res.set({"Content-Type":"text/plain"});
		        res.status(500).end("MongoClient connect() failed!");
		      }
		      var criteria = {};
		      criteria['_id'] = ObjectID(req.query._id);
		      criteria['owner'] = req.session.username;
		      console.log('delete criteria = '+JSON.stringify(criteria));
		      deleteRestaurant(db,criteria,function(result){
		        db.close();
		        console.log(JSON.stringify(result));
		        res.set({"Content-Type":"text/html"});
		        res.render("delete.ejs");
		      });
		    });
		  }else{
		    res.render("deletefail.ejs");
		  }
		}
});


app.get('/edit', function (req,res){
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
	  if(req.query.owner == req.session.username){
	    MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.set({"Content-Type":"text/plain"});
	        res.status(500).end("MongoClient connect() failed!");
	      }
	      console.log('Connected to MongoDB');
	      var criteria = {};
	      criteria['_id'] = ObjectID(req.query._id);
	      findRestaurant(db,criteria, function(Restaurant) {
	        db.close();
	        console.log('Disconnected MongoDB');
	        console.log('Restaurant returned = ' + Restaurant.length);
	        var image = new Buffer(Restaurant[0].image,'base64');
	        var contentType = {};
	        contentType['Content-Type'] = Restaurant[0].mimetype;
	        console.log(contentType['Content-Type']);
	        res.render('update.ejs',{Restaurant:Restaurant});
	      });
	    });
	  }else{
	    res.render("editfail.ejs");
	  }
	}
});

app.post('/edit', function(req,res) {
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
	  var form = new formidable.IncomingForm();
	  form.parse(req, function (err, fields, files) {
	    console.log(JSON.stringify(files));
	    var filename = files.filetoupload.path;
			var id = fields.id;
			if (fields.name) {
	      var name = (fields.name.length > 0) ? fields.name : "unnamed";
	    }
	    if (fields.borough) {
	      var borough = (fields.borough.length > 0) ? fields.borough : "n/a";
	    }
	    if (fields.cuisine) {
	      var cuisine = (fields.cuisine.length > 0) ? fields.cuisine : "n/a";
	    }
	    if (fields.street) {
	      var street = (fields.street.length > 0) ? fields.street : "n/a";
	    }
	    if (fields.building) {
	      var building = (fields.building.length > 0) ? fields.building : "n/a";
	    }
	    if (fields.zipcode) {
	      var zipcode = (fields.zipcode.length > 0) ? fields.zipcode : "n/a";
	    }
			if (fields.gpslat) {
	      var gpslon = (fields.gpslon.length > 0) ? fields.gpslon : "n/a";
	    }
	    if (fields.gpslon) {
	      var gpslat = (fields.gpslat.length > 0) ? fields.gpslat : "n/a";
	    }
	    if (files.filetoupload.type) {
	      var mimetype = files.filetoupload.type;
	    }
	    console.log("name = " + name);
	    console.log("filename = " + filename);
	    fs.readFile(filename, function(err,data) {
	      MongoClient.connect(mongourl,function(err,db) {
	        try {
	          assert.equal(err,null);
	        } catch (err) {
	          res.set({"Content-Type":"text/plain"});
	          res.status(500).end("MongoClient connect() failed!");
	        }

	        var address = {};
	        address['street'] = street,
	        address['building'] = building,
	        address['zipcode'] = zipcode,
	        address['coord'] = [gpslat,gpslon];

					var new_r = {};
					var img = new Buffer(data).toString('base64');
					new_r['name'] =  name;
	        new_r['borough'] = borough;
	        new_r['cuisine'] = cuisine;
	        new_r['address'] = address;
	        new_r['mimetype'] = mimetype;
					if (files.filetoupload.size != 0) {
	        	new_r['image'] = img;
					}
	        var newvalues = {$set:new_r};



					var criteria = {};
		      criteria['_id'] = ObjectID(id);
		      criteria['owner'] = req.session.username;


	        editRestaurant(db,criteria,newvalues,function(result) {
	          db.close();
	          res.set({"Content-Type":"text/html"});
	          res.render("uploadsuccess.ejs");
	        });
	      });
	    });
	  });
	}
});

app.get("/ngmap", function(req,res) {
	res.render("gmap.ejs", {
		lat:req.query.lat,
		lon:req.query.lon
	});
	res.end();
});

function insertRestaurant(db,r,callback) {
  db.collection('Restaurant').insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    console.log(JSON.stringify(result));
    callback(result.ops[0]);
  });
}

function findRestaurant(db,criteria,callback) {
  var cursor = db.collection("Restaurant").find(criteria);
  var Restaurant = [];
  cursor.each(function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      Restaurant.push(doc);
    } else {
      callback(Restaurant);
    }
  });
}


function deleteRestaurant(db,criteria,callback){
  db.collection('Restaurant').remove(criteria,function(err,result){
    assert.equal(err,null);
    console.log("Delete was successfully");
    callback(result);
  });
}

function editRestaurant(db,criteria,r,callback) {
  db.collection('Restaurant').findOneAndUpdate(criteria,r,function(err,result) {
    assert.equal(err,null);
    console.log("EDIT was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}
function rateRestaurant(db,criteria,r,callback) {
  db.collection('Restaurant').findOneAndUpdate(criteria,r,function(err,result) {
    assert.equal(err,null);
    console.log("RATE was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}

app.listen(process.env.PORT || 8100);
