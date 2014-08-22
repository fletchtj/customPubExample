// Shared
var Messages = new Meteor.Collection("messages");

var LatestMessageForUsers = new Meteor.Collection("latestMessageForUsers");

var senders = [];

var createSender = function () {
  var _sender = Random.id(4).toUpperCase();
  senders.push(_sender);
  return _sender;
};

var chooseSender = function () {
  var useExisting = Math.round(Math.random()); 
  if (useExisting && _.size(senders) > 0) {
    return Random.choice(senders);
  } else {
    return createSender();
  }
};

var createNewMessage = function () {
  var now = new Date()
        , randomSender = chooseSender()
        , randomSubject = [ Random.choice([ "Whoa", "Cool", "Awesome", "Great", "Nonsense"]), Random.hexString(15)].join(" ")
        , randomCode = Random.choice([ "GREEN", "BLUE", "RED", "YELLOW" ]);

    var message = {
      "createdAt": now.getTime()
      , "sender": randomSender
      , "code": randomCode
      , "subject": randomSubject
    };

    Messages.insert(message);
}

// Client code
if (Meteor.isClient) {
  // Subscriptions
  Meteor.subscribe("allMessages");
  Meteor.subscribe("latestMessages");

  // Template helper
  Template.dashboard.helpers({
    "users": function () {
      return LatestMessageForUsers.find({}, { "sort": [ "sender" ] });
    }
    , "totalMessages": function () {
      return Messages.find().count();
    }
    , "allMessages": function () {
      return Messages.find({}, { "sort": {"createdAt": -1} });
    }
    , "dateCreated": function () {
      return new Date(this.createdAt).toString();
    }
  });

  // Template Events
  Template.dashboard.events({
    "click #generateMessage": function () {
      createNewMessage();
    }
  });

}

// Server code
if (Meteor.isServer) {

  // Seed the messages collection if it is empty
  if (!Messages.find().count()) {
    for (var i = 0, numRecords = 100; i < numRecords; i++) {
      createNewMessage();
    }
  }

  // Publications
  Meteor.publish("allMessages", function () {
    return Messages.find({}, { "sort": [ "createdAt", "desc" ] });
  });
  // Custom Publication
  Meteor.publish("latestMessages", function () {
    var self = this
      , _messages = Messages.find({ "code": "BLUE" }, { "sort": { "createdAt": -1 } })
      , _uniqueSenders = [];
    console.log(_messages.count());
    _.each(_messages.fetch(), function (m) {
      if ( !_.contains(_uniqueSenders, m.sender) ) {
        self.added("latestMessageForUsers", m.sender, m);
        _uniqueSenders.push(m.sender);
      }
    });

    _messages.observe({
      added: function (doc) {
        if ( _.contains(_uniqueSenders, doc.sender) ) {
          self.changed("latestMessageForUsers", doc.sender, { "createdAt": doc.createdAt });
        } else {
          self.added("latestMessageForUsers", doc.sender, doc);
          _uniqueSenders.push(doc.sender);
        }
      }
    });

    self.ready();
  });
}
