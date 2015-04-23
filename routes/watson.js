var express = require('express');
var http = require('http');
var fs = require('fs');
var router = express.Router();
var AlchemyAPI = require('./alchemyapi');
var alchemyapi = new AlchemyAPI();
var watson = require("watson-developer-cloud");
var logger = require("../utils/logger")
var streamifier = require("streamifier");

var credentials; 

var speech_to_text_configuration = function(){
    if(process.env.VCAP_SERVICES){
        var env = JSON.parse(process.env.VCAP_SERVICES);
        if(env['speech_to_text']){
            credentials = env['speech_to_text'][0]['credentials'];
            credentials.version = "v1";

        }
        //logger.info("vcap: " + env['mongodb-2.4'][0]['credentials'])
    }
    else{
        //credential
        credentials = {
            "version":"v1",
            //"url": "https://stream.watsonplatform.net/speech-to-text-beta/api",
            "username": "18e2d218-f365-4cdd-8843-f6711502fecd",
            "password": "tqUB1R7C2nXb"
        };
    }
};

var options = {
    host: 'access.alchemyapi.com',
    port: 80,
    path: '',
    method: '',
}

var send_req = function(content,options,callback){
    var req = http.request(options, function(res){
        var body = '';
        res.on('data', function(chunk){
            body += chunk;
        });

        res.on('end', function(){
            callback(res,body);
        });
    })

    req.on('error', function(err) {
        console.log("err: " + err);
        callback(null,err);
        // Handle error and recovery
    });

    if(content){
        req.write(JSON.stringify(content));
    }
    req.end();
};


function imageUrlUpload(request,response){

    var url = encodeURIComponent('http://www.nationofchange.org/2014/wp-content/uploads/obama102614.jpg');
    var content = null;

    /*
    content = {
        url : url,
        apikey   : '0949ce6bc6ad4ad145b0929d25b01859378d6969',
        outputMode: 'json',
        knowledgeGraph: 1
    }
    content = "<results><url>http%3A%2F%2Fwww.nationofchange.org%2F2014%2Fwp-content%2Fuploads%2Fobama102614.jpg</url><apikey>0949ce6bc6ad4ad145b0929d25b01859378d6969</apikey><outputMode>json</outputMode><knowledgeGraph>1</knowledgeGraph></results>"
    */

    /*
    var js2xmlparser = require("js2xmlparser");
    content = js2xmlparser("xml",content);
    console.log('content xml: ' + content);
    */
    //console.log("length: " + content.length);

    /*
    options.method = 'POST';
    options.path = '/calls/url/URLGetRankedImageFaceTags';
    options.headers = {
        //'Content-Type' : 'application/json',
        //'Content-Length': JSON.stringify(content).length
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length': content.length
    }; 
    */

    options.method = 'GET';
    options.path = '/calls/url/URLGetRankedImageFaceTags?url='+url+"&apikey=0949ce6bc6ad4ad145b0929d25b01859378d6969&outputMode=json";
    console.log("path: " + options.path);

    var callback = function(res,body){
        if(res!=null){
            console.log("res status code: " + res.statusCode);
        }
        //var json = JSON.parse(body);
        //console.log("body: " + JSON.stringify(json));
        //response.json(200,JSON.stringify(json));
        console.log("body: " + body);
        response.status(200).json(body);
    };

    send_req(content,options,callback);
};

// Face detection
function faceDetection(req,res) {

        var data = '';
        var count = 0;

        console.log(req.body)
        console.log(req.files)
        //console.log('buffer: ' + req.files.fileContent.buffer)

        // Save Buffer to File and send face detection to alchemy
        fs.writeFile(req.files.filePic.path,req.files.filePic.buffer,function(err){

            alchemyapi.face_detection('image', req.files.filePic.path, null, function(response) {

                console.log('Face detection tests complete!\n');
                console.log('response totalTransactions: ' + response['totalTransactions']);
                console.log('response age: ' + response['imageFaces'][0]['age']['ageRange']);

                var result = {
                    result : response['imageFaces'][0]['age']['ageRange']
                }

                res.status(200).json(result);
            });
        })

        /*
        console.log('Checking face detection . . . ');
        alchemyapi.face_detection('image', req.files.filePic.buffer, null, function(response) {
            console.log('Face detection tests complete!\n');
            console.log('response totalTransactions: ' + response['totalTransactions']);
            console.log('response age: ' + response['imageFaces'][0]['age']['ageRange']);

            var result = {
                result : response['imageFaces'][0]['age']['ageRange']
            }

            res.status(200).json(result);
        });
        */


        //res.status(200).json();
}


function speechToText(req,res){

        console.log(req.body)
        console.log(req.files)
        logger.info("req.files: " + req.files);
        logger.info("req.body: " + req.body);

        logger.info("credentials: " + JSON.stringify(credentials));
        var speechToText = watson.speech_to_text(credentials);

        //var audio = fs.createReadStream('./audio/sample2.wav'); 
        var audio = streamifier.createReadStream(req.files.fileAudio.buffer)

        //speechToText.recognize({audio: req.files.fileAudio.buffer, content_type: 'audio/l16; rate=44100'}, function(err, transcript){
        speechToText.recognize({audio: audio, content_type: 'audio/l16; rate=44100'}, function(err, transcript){
            if (err){
                //return res.status(500).json({ error: err });
                logger.info("error: " + JSON.stringify(err));
                var error = {
                    error : err
                }
                return res.status(500).json(error);
            }
            else{
                transcript = transcript.results[0].alternatives[0].transcript

                var result = {
                    result : transcript
                }
                return res.json(result);
            }
        });

};
var form = function(req,res){

 res.writeHead(200, {'content-type': 'text/html'});
  res.end(
    '<form action="/upload/face" enctype="multipart/form-data" method="post">'+
    '<input type="text" name="title"><br>'+
    '<input type="file" name="upload" multiple="multiple"><br>'+
    '<input type="submit" value="Upload">'+
    '</form>'
  );
}

speech_to_text_configuration();

router.get("/image_url",imageUrlUpload);
router.post("/face_detection",faceDetection);
router.post("/speech_to_text",speechToText)
router.get("/form",form)

module.exports = router;
