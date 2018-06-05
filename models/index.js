var mongoose = require('mongoose');
var Detections = require('./detections');

mongoose.connect('mongodb://localhost/fndr', function(error) {
    if(error) throw error
    console.log('Connected to DB');
});

module.exports = {
    Detections
};