var express = require('express');
var moment = require('moment');
var requestify = require('requestify'); 
var _ = require('lodash');

var app = express();

// mixpanel
var Mixpanel = require('mixpanel');
var mixpanel = Mixpanel.init(process.env.MIXPANEL_API_KEY, {
    protocol: 'https'
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", async (request, response) => {
  console.log('\n\nIncoming GET /')
  console.log('request.headers', request.headers);

  const url = process.env.FIELDBOOK_API_URL; 
  const options = {
    headers: {accept: 'application/json'}
  };
  const fieldBookResponse = await requestify.get(url, options);
  const hacks = JSON.parse(fieldBookResponse.body);
  const randomNumber = _.random(hacks.length - 1);
  const hack = hacks[randomNumber];
  
  const nowMoment = moment.utc();
  const dateString = nowMoment.format('YYYY-MM-DDTHH:mm:ss.S') + 'Z';
  var mainText = hack.text;
  // mainText += "It is " + nowMoment.format('LLL') + ". and " +nowMoment.format('s')+ "seconds.";
  // mainText += hack.text;
  // console.log('nowMoment', nowMoment.format('YYYY-MM-DDTHH:mm:ss.S'));
  const host = request.headers['host'];
  const redirectionUrl = 'https://' +host+ '/redirect?url=' +encodeURIComponent(hack.url)+ '&hack_id=' +hack.id+ '&hack_name=' +encodeURIComponent(hack.name);
  const flashJson = [
    {
      "uid": "lifehack-" + hack.id,
      "updateDate": dateString,
      "titleText": "Life Hacks: " + hack.name,
      "mainText": mainText,
      "redirectionUrl": redirectionUrl
     }
  ];
  
  response.setHeader('Content-Type', 'application/json');
  response.send(flashJson);
  
  mixpanel.track('hacks request', {
    distinct_id: request.headers['x-forwarded-for'],
    hack_id: hack.id,
    hack_name: hack.name,
    user_agent: request.headers['user-agent'],
    x_forwarded_for: request.headers['x-forwarded-for']
  });
});

app.get("/redirect", function (request, response) {
  console.log('Incoming GET /redirect', request.query);
  const redirectTo = request.query.url;
  const hack_id = request.query.hack_id;
  const hack_name = request.query.hack_name;
  if (redirectTo) {
    response.redirect(redirectTo);    
  } else {
    response.redirect('http://www.dennisyang.com/');
  }
  
  mixpanel.track('hacks redirect', {
    distinct_id: request.headers['x-forwarded-for'],
    hack_id: hack_id,
    hack_name: hack_name,
    redirectTo: redirectTo,
    user_agent: request.headers['user-agent'],
    x_forwarded_for: request.headers['x-forwarded-for']
  });
  
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

