var mongoose = require('mongoose');

var DetectionModel = mongoose.model('Detection', new mongoose.Schema({
    sensorType: {type: String, enum: ['FREQUENCY', 'VOLUME', 'LIGHT', 'MOTION', 'GESTURE', 'MANUAL']},
    prevState: {type: String, enum: ['OFF', 'ON']},
    afterState: {type: String, enum: ['OFF', 'ON']},
    weekDay: {type: String, enum: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SUNDAY', 'SATURDAY']}
},
{
    timestamps: true
}));

module.exports = DetectionModel;