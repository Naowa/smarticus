var express = require('express');
var bodyParser = require('body-parser')
var router = express.Router();
var mongoose = require('mongoose');
var models = require('../models');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

var DetectionModel = models.Detections;

var state = "OFF";
var lightPercent = 0;
var maxTime = 1; //default max time is 1 minute
var currTime = maxTime;
var delay = 60000;
var weekDay = new Date().getDay();
var weekDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SUNDAY', 'SATURDAY'];
var volThresh = 5; //default threshold for volume
var lightThresh = 50; //default threshold for light
var detectMotion = 0;
var detectFreq = 0;
var detectVol = 0;
var detectGesture = 0;
var detectLight = 0;
var activateDim = 0;
var debugMode = 0;

var dataArr;

var bulbWatts = 100;
var brightPercent = 0;

function calcBrightness(ambientPercent) {
    if (state == 'OFF') brightPercent = 0;
    else {
        brightPercent = 100 - ambientPercent;
    }
}

function getDate(timestamp) {
    let date = timestamp;
    let year = date.getFullYear();
    let month = date.getMonth();
    let day = date.getDate();
    return (month.toString() + '-' + day.toString() + '-' + year.toString());
}
function getJoulesPerMin(minutes) {
    return (bulbWatts * minutes);
}

function delayMs(ms) {
    var cur_d = new Date();
    var cur_ticks = cur_d.getTime();
    var ms_passed = 0;
    while(ms_passed < ms) {
        var d = new Date();
        var ticks = d.getTime();
        ms_passed = ticks - cur_ticks;
    }
}

function getMinutesFromDate(timestamp) {
    var date = timestamp;
    var hours = date.getHours();
    var minutes = date.getMinutes();
    return ((hours * 60) + minutes);
}

function timeout() {
    if (currTime > 0 && --currTime == 0) state = "OFF"
    console.log("time: " + currTime);
    console.log("state: " + state);
    if (debugMode) console.log('DEBUG MODE -- TIMER DECREMENTS EVERY 6 SECS INSTEAD OF EVERY 1 MINUTE');
}

function isAboveVolThreshold(data) {
    console.log("Volume: " + data);
    if (data > volThresh) return true;
    else return false;
}
function isBelowLightThreshold(data) {
    console.log("Light: " + data);
    if (data < lightThresh) return true;
    else return false;
}

function fourier(in_array){
    /*in_array = new Array();
    for (var i = 0; i < 50; i++) {
        in_array.push(100);
        in_array.push(1000);
    }*/

    var fft = new Array();
    var len = in_array.length;

    //Create Complex fft array
    for( var k=0; k < len; k++ ) {
        var real = 0;
            var imag = 0;
            for( var n=0; n < len; n++ ) {
                real += in_array[n]*Math.cos(-2*Math.PI*k*n/len);
                imag += in_array[n]*Math.sin(-2*Math.PI*k*n/len);
                //console.log("real: " + real + ", imag: " + imag);
            }
        fft.push( [ real, imag ] )
    }
    
    var magnitude = new Array();

    //Calculate Power Spectrum
    for(var k = 0; k < (fft.length/2)-1; k++){
        var real = fft[k][0];
        var imag = fft[k][1];
        magnitude.push(Math.sqrt(real * real + imag * imag));
    }

    //console.log(magnitude);

    //Find largest peak in power spectrum
    var max_magnitude = magnitude[1];
    var max_index = 1;
    for(var k = 1; k < magnitude.length; k++){
        if(magnitude[k] > max_magnitude){
            max_magnitude = magnitude[k];
            max_index = k;
        }
    }

    console.log(max_magnitude);
    console.log(max_index);

    //Compute Frequency
    //Sample Rate = 50 hz
    sample_rate = 50;
    frequency = sample_rate * max_index / (len - 1);

    return frequency;
}

function isHumanFreq(data) {
    const MIN_HUMAN_FREQ = 85;
    const MAX_HUMAN_FREQ = 255;

    let detectedFreq = fourier(data);

    console.log("Detected freq: " + detectedFreq);

    if (detectedFreq > MIN_HUMAN_FREQ && detectedFreq < MAX_HUMAN_FREQ) return true;
    else return false;
}

function genDataBySensorType() {
    let motionCount = 0;
    let freqCount = 0;
    let volCount = 0;
    let lightCount = 0;
    let gestureCount = 0;
    let manualCount = 0;
    
    DetectionModel.find({}).then((response) => {
        response.forEach(function(detection) {
            if (detection.sensorType == 'MOTION') ++motionCount;
            else if (detection.sensorType == 'FREQUENCY') ++freqCount;
            else if (detection.sensorType == 'VOLUME') ++volCount;
            else if (detection.sensorType == 'LIGHT') ++lightCount;
            else if (detection.sensorType == 'GESTURE') ++gestureCount;
            else if (detection.sensorType == 'MANUAL') ++manualCount;
        })
                
        dataArr = [
            {label: 'Motion', y: motionCount},
            {label: 'Frequency', y: freqCount},
            {label: 'Volume', y: volCount},
            {label: 'Light', y: lightCount},
            {label: 'Gesture', y: gestureCount},
            {label: 'Manual', y: manualCount}
        ]
    });
}

function genDataBySensorToOnType() {
    let motionCount = 0;
    let freqCount = 0;
    let volCount = 0;
    let lightCount = 0;
    let gestureCount = 0;
    let manualCount = 0;

    DetectionModel.find({'afterState': 'ON'}).then((response) => {
        response.forEach(function(detection) {
            if (detection.sensorType == 'MOTION') ++motionCount;
            else if (detection.sensorType == 'FREQUENCY') ++freqCount;
            else if (detection.sensorType == 'VOLUME') ++volCount;
            else if (detection.sensorType == 'LIGHT') ++lightCount;
            else if (detection.sensorType == 'GESTURE') ++gestureCount;
            else if (detection.sensorType == 'MANUAL') ++manualCount;
        })
                
        dataArr = [
            {label: 'Motion', y: motionCount},
            {label: 'Frequency', y: freqCount},
            {label: 'Volume', y: volCount},
            {label: 'Light', y: lightCount},
            {label: 'Gesture', y: gestureCount},
            {label: 'Manual', y: manualCount}
        ]
    });
}

function genDataBySensorToOffType() {
    let motionCount = 0;
    let freqCount = 0;
    let volCount = 0;
    let lightCount = 0;
    let gestureCount = 0;
    let manualCount = 0;

    DetectionModel.find({'afterState': 'OFF'}).then((response) => {
        response.forEach(function(detection) {
            if (detection.sensorType == 'MOTION') ++motionCount;
            else if (detection.sensorType == 'FREQUENCY') ++freqCount;
            else if (detection.sensorType == 'VOLUME') ++volCount;
            else if (detection.sensorType == 'LIGHT') ++lightCount;
            else if (detection.sensorType == 'GESTURE') ++gestureCount;
            else if (detection.sensorType == 'MANUAL') ++manualCount;
        })
                
        dataArr = [
            {label: 'Motion', y: motionCount},
            {label: 'Frequency', y: freqCount},
            {label: 'Volume', y: volCount},
            {label: 'Light', y: lightCount},
            {label: 'Gesture', y: gestureCount},
            {label: 'Manual', y: manualCount}
        ]
    });
}

function genDataBySensorOffToType() {
    let motionCount = 0;
    let freqCount = 0;
    let volCount = 0;
    let lightCount = 0;
    let gestureCount = 0;
    let manualCount = 0;

    DetectionModel.find({'prevState': 'OFF'}).then((response) => {
        response.forEach(function(detection) {
            if (detection.sensorType == 'MOTION') ++motionCount;
            else if (detection.sensorType == 'FREQUENCY') ++freqCount;
            else if (detection.sensorType == 'VOLUME') ++volCount;
            else if (detection.sensorType == 'LIGHT') ++lightCount;
            else if (detection.sensorType == 'GESTURE') ++gestureCount;
            else if (detection.sensorType == 'MANUAL') ++manualCount;
        })
                
        dataArr = [
            {label: 'Motion', y: motionCount},
            {label: 'Frequency', y: freqCount},
            {label: 'Volume', y: volCount},
            {label: 'Light', y: lightCount},
            {label: 'Gesture', y: gestureCount},
            {label: 'Manual', y: manualCount}
        ]
    });
}

function genDataBySensorOnToType() {
    let motionCount = 0;
    let freqCount = 0;
    let volCount = 0;
    let lightCount = 0;
    let gestureCount = 0;
    let manualCount = 0;

    DetectionModel.find({'prevState': 'ON'}).then((response) => {
        response.forEach(function(detection) {
            if (detection.sensorType == 'MOTION') ++motionCount;
            else if (detection.sensorType == 'FREQUENCY') ++freqCount;
            else if (detection.sensorType == 'VOLUME') ++volCount;
            else if (detection.sensorType == 'LIGHT') ++lightCount;
            else if (detection.sensorType == 'GESTURE') ++gestureCount;
            else if (detection.sensorType == 'MANUAL') ++manualCount;
        })
                
        dataArr = [
            {label: 'Motion', y: motionCount},
            {label: 'Frequency', y: freqCount},
            {label: 'Volume', y: volCount},
            {label: 'Light', y: lightCount},
            {label: 'Gesture', y: gestureCount},
            {label: 'Manual', y: manualCount}
        ]
    });
}

function genDataBySensorOffToOnType() {
    let motionCount = 0;
    let freqCount = 0;
    let volCount = 0;
    let lightCount = 0;
    let gestureCount = 0;
    let manualCount = 0;

    DetectionModel.find({'prevState': 'OFF', 'afterState': 'ON'}).then((response) => {
        response.forEach(function(detection) {
            if (detection.sensorType == 'MOTION') ++motionCount;
            else if (detection.sensorType == 'FREQUENCY') ++freqCount;
            else if (detection.sensorType == 'VOLUME') ++volCount;
            else if (detection.sensorType == 'LIGHT') ++lightCount;
            else if (detection.sensorType == 'GESTURE') ++gestureCount;
            else if (detection.sensorType == 'MANUAL') ++manualCount;
        })
                
        dataArr = [
            {label: 'Motion', y: motionCount},
            {label: 'Frequency', y: freqCount},
            {label: 'Volume', y: volCount},
            {label: 'Light', y: lightCount},
            {label: 'Gesture', y: gestureCount},
            {label: 'Manual', y: manualCount}
        ]
    });
}

function genDataBySensorOffToOffType() {
    let motionCount = 0;
    let freqCount = 0;
    let volCount = 0;
    let lightCount = 0;
    let gestureCount = 0;
    let manualCount = 0;

    DetectionModel.find({'prevState': 'OFF', 'afterState': 'OFF'}).then((response) => {
        response.forEach(function(detection) {
            if (detection.sensorType == 'MOTION') ++motionCount;
            else if (detection.sensorType == 'FREQUENCY') ++freqCount;
            else if (detection.sensorType == 'VOLUME') ++volCount;
            else if (detection.sensorType == 'LIGHT') ++lightCount;
            else if (detection.sensorType == 'GESTURE') ++gestureCount;
            else if (detection.sensorType == 'MANUAL') ++manualCount;
        })
                
        dataArr = [
            {label: 'Motion', y: motionCount},
            {label: 'Frequency', y: freqCount},
            {label: 'Volume', y: volCount},
            {label: 'Light', y: lightCount},
            {label: 'Gesture', y: gestureCount},
            {label: 'Manual', y: manualCount}
        ]
    });
}

function genDataBySensorOnToOffType() {
    let motionCount = 0;
    let freqCount = 0;
    let volCount = 0;
    let lightCount = 0;
    let gestureCount = 0;
    let manualCount = 0;

    DetectionModel.find({'prevState': 'ON', 'afterState': 'OFF'}).then((response) => {
        response.forEach(function(detection) {
            if (detection.sensorType == 'MOTION') ++motionCount;
            else if (detection.sensorType == 'FREQUENCY') ++freqCount;
            else if (detection.sensorType == 'VOLUME') ++volCount;
            else if (detection.sensorType == 'LIGHT') ++lightCount;
            else if (detection.sensorType == 'GESTURE') ++gestureCount;
            else if (detection.sensorType == 'MANUAL') ++manualCount;
        })
                
        dataArr = [
            {label: 'Motion', y: motionCount},
            {label: 'Frequency', y: freqCount},
            {label: 'Volume', y: volCount},
            {label: 'Light', y: lightCount},
            {label: 'Gesture', y: gestureCount},
            {label: 'Manual', y: manualCount}
        ]
    });
}

function genDataBySensorOnToOnType() {
    let motionCount = 0;
    let freqCount = 0;
    let volCount = 0;
    let lightCount = 0;
    let gestureCount = 0;
    let manualCount = 0;

    DetectionModel.find({'prevState': 'ON', 'afterState': 'ON'}).then((response) => {
        response.forEach(function(detection) {
            if (detection.sensorType == 'MOTION') ++motionCount;
            else if (detection.sensorType == 'FREQUENCY') ++freqCount;
            else if (detection.sensorType == 'VOLUME') ++volCount;
            else if (detection.sensorType == 'LIGHT') ++lightCount;
            else if (detection.sensorType == 'GESTURE') ++gestureCount;
            else if (detection.sensorType == 'MANUAL') ++manualCount;
        })
                
        dataArr = [
            {label: 'Motion', y: motionCount},
            {label: 'Frequency', y: freqCount},
            {label: 'Volume', y: volCount},
            {label: 'Light', y: lightCount},
            {label: 'Gesture', y: gestureCount},
            {label: 'Manual', y: manualCount}
        ]
    });
}

function genDataByTimeOn() {
    let monBaseTime = 0;
    let tuesBaseTime = 0;
    let wedBaseTime = 0;
    let thurBaseTime = 0;
    let friBaseTime = 0;
    let satBaseTime = 0;
    let sunBaseTime = 0;

    let monTime = 0;
    let tuesTime = 0;
    let wedTime = 0;
    let thurTime = 0;
    let friTime = 0;
    let satTime = 0;
    let sunTime = 0;

    DetectionModel.find({}).then((response) => {
        response.forEach(function(detection) {
            if (detection.weekDay == 'SUNDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') sunBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') sunTime += getMinutesFromDate(detection.createdAt) - sunBaseTime;                
            }
            else if (detection.weekDay == 'MONDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') monBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') monTime += getMinutesFromDate(detection.createdAt) - monBaseTime;                
            }
            else if (detection.weekDay == 'TUESDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') tuesBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') tuesTime += getMinutesFromDate(detection.createdAt) - tuesBaseTime;                
            }
            else if (detection.weekDay == 'WEDNESDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') wedBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') wedTime += getMinutesFromDate(detection.createdAt) - wedBaseTime;                

            }
            else if (detection.weekDay == 'THURSDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') thurBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') thurTime += getMinutesFromDate(detection.createdAt) - thurBaseTime;                

            }
            else if (detection.weekDay == 'FRIDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') friBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') friTime += getMinutesFromDate(detection.createdAt) - friBaseTime;                

            }
            else if (detection.weekDay == 'SATURDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') satBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') satTime += getMinutesFromDate(detection.createdAt) - satBaseTime;                

            }
        })

        let totalMinutes = sunTime + monTime + tuesTime + wedTime + thurTime + friTime + satTime;
        let totalHours = 0;
    
        while (totalMinutes >= 60) {
            ++totalHours;
            totalMinutes -= 60;
        }
    
        dataArr = [
            {label: 'Hours', y: totalHours},
            {label: 'Minutes', y: totalMinutes}
        ]
    });
}

function genDataByTimeOnDaysWeek() {
    let monBaseTime = 0;
    let tuesBaseTime = 0;
    let wedBaseTime = 0;
    let thurBaseTime = 0;
    let friBaseTime = 0;
    let satBaseTime = 0;
    let sunBaseTime = 0;

    let monTime = 0;
    let tuesTime = 0;
    let wedTime = 0;
    let thurTime = 0;
    let friTime = 0;
    let satTime = 0;
    let sunTime = 0;

    DetectionModel.find({}).then((response) => {
        response.forEach(function(detection) {
            if (detection.weekDay == 'SUNDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') sunBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') sunTime += getMinutesFromDate(detection.createdAt) - sunBaseTime;                
            }
            else if (detection.weekDay == 'MONDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') monBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') monTime += getMinutesFromDate(detection.createdAt) - monBaseTime;                
            }
            else if (detection.weekDay == 'TUESDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') tuesBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') tuesTime += getMinutesFromDate(detection.createdAt) - tuesBaseTime;                
            }
            else if (detection.weekDay == 'WEDNESDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') wedBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') wedTime += getMinutesFromDate(detection.createdAt) - wedBaseTime;                

            }
            else if (detection.weekDay == 'THURSDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') thurBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') thurTime += getMinutesFromDate(detection.createdAt) - thurBaseTime;                

            }
            else if (detection.weekDay == 'FRIDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') friBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') friTime += getMinutesFromDate(detection.createdAt) - friBaseTime;                

            }
            else if (detection.weekDay == 'SATURDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') satBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') satTime += getMinutesFromDate(detection.createdAt) - satBaseTime;                

            }
        })
                
        dataArr = [
            {label: 'Sunday', y: sunTime},
            {label: 'Monday', y: monTime},
            {label: 'Tuesday', y: tuesTime},
            {label: 'Wednesday', y: wedTime},
            {label: 'Thursday', y: thurTime},
            {label: 'Friday', y: friTime},
            {label: 'Saturday', y: satTime}
        ]
    });
}

function genDataByTotalJoules() {
    let monBaseTime = 0;
    let tuesBaseTime = 0;
    let wedBaseTime = 0;
    let thurBaseTime = 0;
    let friBaseTime = 0;
    let satBaseTime = 0;
    let sunBaseTime = 0;

    let monTime = 0;
    let tuesTime = 0;
    let wedTime = 0;
    let thurTime = 0;
    let friTime = 0;
    let satTime = 0;
    let sunTime = 0;

    DetectionModel.find({}).then((response) => {
        response.forEach(function(detection) {
            if (detection.weekDay == 'SUNDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') sunBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') sunTime += getMinutesFromDate(detection.createdAt) - sunBaseTime;                
            }
            else if (detection.weekDay == 'MONDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') monBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') monTime += getMinutesFromDate(detection.createdAt) - monBaseTime;                
            }
            else if (detection.weekDay == 'TUESDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') tuesBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') tuesTime += getMinutesFromDate(detection.createdAt) - tuesBaseTime;                
            }
            else if (detection.weekDay == 'WEDNESDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') wedBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') wedTime += getMinutesFromDate(detection.createdAt) - wedBaseTime;                

            }
            else if (detection.weekDay == 'THURSDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') thurBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') thurTime += getMinutesFromDate(detection.createdAt) - thurBaseTime;                

            }
            else if (detection.weekDay == 'FRIDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') friBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') friTime += getMinutesFromDate(detection.createdAt) - friBaseTime;                

            }
            else if (detection.weekDay == 'SATURDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') satBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') satTime += getMinutesFromDate(detection.createdAt) - satBaseTime;                

            }
        })
                
        let totalJoules = getJoulesPerMin(sunTime + monTime + tuesTime + wedTime + thurTime + friTime + satTime);

        dataArr = [
            {label: 'J/min', y: totalJoules}
        ]
    });
}

function genDataByJoulesDaysWeek() {
    let monBaseTime = 0;
    let tuesBaseTime = 0;
    let wedBaseTime = 0;
    let thurBaseTime = 0;
    let friBaseTime = 0;
    let satBaseTime = 0;
    let sunBaseTime = 0;

    let monTime = 0;
    let tuesTime = 0;
    let wedTime = 0;
    let thurTime = 0;
    let friTime = 0;
    let satTime = 0;
    let sunTime = 0;

    DetectionModel.find({}).then((response) => {
        response.forEach(function(detection) {
            if (detection.weekDay == 'SUNDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') sunBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') sunTime += getMinutesFromDate(detection.createdAt) - sunBaseTime;                
            }
            else if (detection.weekDay == 'MONDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') monBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') monTime += getMinutesFromDate(detection.createdAt) - monBaseTime;                
            }
            else if (detection.weekDay == 'TUESDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') tuesBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') tuesTime += getMinutesFromDate(detection.createdAt) - tuesBaseTime;                
            }
            else if (detection.weekDay == 'WEDNESDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') wedBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') wedTime += getMinutesFromDate(detection.createdAt) - wedBaseTime;                

            }
            else if (detection.weekDay == 'THURSDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') thurBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') thurTime += getMinutesFromDate(detection.createdAt) - thurBaseTime;                

            }
            else if (detection.weekDay == 'FRIDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') friBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') friTime += getMinutesFromDate(detection.createdAt) - friBaseTime;                

            }
            else if (detection.weekDay == 'SATURDAY') {
                if (detection.prevState == 'OFF' && detection.afterState == 'ON') satBaseTime = getMinutesFromDate(detection.createdAt);
                else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') satTime += getMinutesFromDate(detection.createdAt) - satBaseTime;                

            }
        })
        console.log(getJoulesPerMin(4));
        let sunJ = getJoulesPerMin(sunTime);
        let monJ = getJoulesPerMin(monTime);
        let tuesJ = getJoulesPerMin(tuesTime);
        let wedJ = getJoulesPerMin(wedTime);
        let thurJ = getJoulesPerMin(thurTime);
        let friJ = getJoulesPerMin(friTime);
        let satJ = getJoulesPerMin(satTime);

        dataArr = [
            {label: 'Sunday', y: sunJ},
            {label: 'Monday', y: monJ},
            {label: 'Tuesday', y: tuesJ},
            {label: 'Wednesday', y: wedJ},
            {label: 'Thursday', y: thurJ},
            {label: 'Friday', y: friJ},
            {label: 'Saturday', y: satJ}
        ]
    });
}

function genDataByTimeOnGiven(givenDay) {
    let monBaseTime = 0;
    let tuesBaseTime = 0;
    let wedBaseTime = 0;
    let thurBaseTime = 0;
    let friBaseTime = 0;
    let satBaseTime = 0;
    let sunBaseTime = 0;

    let monTime = 0;
    let tuesTime = 0;
    let wedTime = 0;
    let thurTime = 0;
    let friTime = 0;
    let satTime = 0;
    let sunTime = 0;

    DetectionModel.find({}).then((response) => {
        response.forEach(function(detection) {
            if (getDate(detection.createdAt) == givenDay) {
              if (detection.weekDay == 'SUNDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') sunBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') sunTime += getMinutesFromDate(detection.createdAt) - sunBaseTime;                
                }
                else if (detection.weekDay == 'MONDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') monBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') monTime += getMinutesFromDate(detection.createdAt) - monBaseTime;                
                }
                else if (detection.weekDay == 'TUESDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') tuesBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') tuesTime += getMinutesFromDate(detection.createdAt) - tuesBaseTime;                
                }
                else if (detection.weekDay == 'WEDNESDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') wedBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') wedTime += getMinutesFromDate(detection.createdAt) - wedBaseTime;                

                }
                else if (detection.weekDay == 'THURSDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') thurBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') thurTime += getMinutesFromDate(detection.createdAt) - thurBaseTime;                

                }
                else if (detection.weekDay == 'FRIDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') friBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') friTime += getMinutesFromDate(detection.createdAt) - friBaseTime;                

                }
                else if (detection.weekDay == 'SATURDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') satBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') satTime += getMinutesFromDate(detection.createdAt) - satBaseTime;                

                }
            }
        })

        let totalMinutes = sunTime + monTime + tuesTime + wedTime + thurTime + friTime + satTime;
        let totalHours = 0;
    
        while (totalMinutes >= 60) {
            ++totalHours;
            totalMinutes -= 60;
        }
    
        dataArr = [
            {label: 'Hours', y: totalHours},
            {label: 'Minutes', y: totalMinutes}
        ]
    });
}

function genDataByJoulesOnGiven(givenDay) {
    let monBaseTime = 0;
    let tuesBaseTime = 0;
    let wedBaseTime = 0;
    let thurBaseTime = 0;
    let friBaseTime = 0;
    let satBaseTime = 0;
    let sunBaseTime = 0;

    let monTime = 0;
    let tuesTime = 0;
    let wedTime = 0;
    let thurTime = 0;
    let friTime = 0;
    let satTime = 0;
    let sunTime = 0;

    DetectionModel.find({}).then((response) => {
        response.forEach(function(detection) {
            if (getDate(detection.createdAt) == givenDay) {
                if (detection.weekDay == 'SUNDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') sunBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') sunTime += getMinutesFromDate(detection.createdAt) - sunBaseTime;                
                }
                else if (detection.weekDay == 'MONDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') monBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') monTime += getMinutesFromDate(detection.createdAt) - monBaseTime;                
                }
                else if (detection.weekDay == 'TUESDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') tuesBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') tuesTime += getMinutesFromDate(detection.createdAt) - tuesBaseTime;                
                }
                else if (detection.weekDay == 'WEDNESDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') wedBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') wedTime += getMinutesFromDate(detection.createdAt) - wedBaseTime;                

                }
                else if (detection.weekDay == 'THURSDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') thurBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') thurTime += getMinutesFromDate(detection.createdAt) - thurBaseTime;                

                }
                else if (detection.weekDay == 'FRIDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') friBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') friTime += getMinutesFromDate(detection.createdAt) - friBaseTime;                

                }
                else if (detection.weekDay == 'SATURDAY') {
                    if (detection.prevState == 'OFF' && detection.afterState == 'ON') satBaseTime = getMinutesFromDate(detection.createdAt);
                    else if(detection.prevState == 'ON' &&  detection.afterState == 'OFF') satTime += getMinutesFromDate(detection.createdAt) - satBaseTime;                

                }
            }
        })
                
        let totalJoules = getJoulesPerMin(sunTime + monTime + tuesTime + wedTime + thurTime + friTime + satTime);

        dataArr = [
            {label: 'J/min', y: totalJoules}
        ]
    });

}

router.get('/', function(req, res, next){
    let data = {
        state: state,
        detectMotion: detectMotion,
        detectFreq: detectFreq,
        detectVol: detectVol,
        detectGesture: detectGesture,
        detectLight: detectLight,
        activateDim: activateDim,
        brightPercent: brightPercent
    };
    res.status(200).send(data);
});

router.post('/', function(req, res, next){
    let body = req.body;
    let sensorType = body.sensorType;
    let prevState;

    if (body.prevState == 0) prevState = "OFF"
    else prevState = "ON"

    state = prevState;

    if (sensorType == "MOTION") state = "ON";
    else if (sensorType == "LIGHT" && isBelowLightThreshold(body.value) && state == 'OFF') state = 'ON';
    else if (sensorType == 'LIGHT' && !isBelowLightThreshold(body.value) && state == 'ON') state = 'OFF';
    else if (sensorType == "FREQUENCY" && isHumanFreq(body.values) && state == "OFF") state = 'ON'; //swap isHumanFreq() and state conditions for short circuiting
    else if (sensorType == "VOLUME" && isAboveVolThreshold(body.value) && state == "OFF") state = 'ON' //swap isAbove...() and state conditions for short circuiting
    else if (sensorType == "GESTURE" && state == 'ON') state = "OFF";
    else if (sensorType == "GESTURE" && state == 'OFF') state = "ON";

    if (state == "ON") currTime = maxTime;
    else currTime = 0;

    if (sensorType == 'LIGHT' && activateDim) calcBrightness(body.value);

    DetectionModel.create({
        sensorType: sensorType,
        prevState: prevState,
        afterState: state,
        weekDay: weekDays[weekDay]
    });
    res.sendStatus(200);
});

router.put('/time', function(req, res, next){
    maxTime = req.body.maxTime;
    currTime = maxTime;
    res.sendStatus(200);
});

router.get('/time', function(req, res, next){
    let data = {
        maxTime: maxTime,
        currTime: currTime
    };
    res.status(200).send(data);
});

router.put('/thresholds', function(req, res, next){
    let body = req.body;

    volThresh = body.volThresh;
    lightThresh = body.lightThresh;
    res.sendStatus(200);
});

router.get('/thresholds', function(req, res, next){
    let data = {
        volThresh: volThresh,
        lightThresh: lightThresh
    };

    res.status(200).send(data);
});

router.put('/state', function(req, res, next){
    let prevState = state;
    if (req.body.checked == 'true') 
    {
        state = 'ON';
        currTime = maxTime;
    }
    else {
        state = 'OFF';
        currTime = 0;
    }

    DetectionModel.create({
        sensorType: 'MANUAL',
        prevState: prevState,
        afterState: state,
        weekDay: weekDays[weekDay]
    });
    res.sendStatus(200);
});

router.get('/state', function(req, res, next){
    res.status(200).send(state);
});

router.put('/options', function(req, res, next){
    let body = req.body;

    if (body.motionCheck == 'true') detectMotion = 1;
    else detectMotion = 0;

    if (body.freqCheck == 'true') detectFreq = 1;
    else detectFreq = 0;

    if (body.volCheck == 'true') detectVol = 1;
    else detectVol = 0;
    
    if (body.gestureCheck == 'true') detectGesture = 1;
    else detectGesture = 0;

    if (body.lightCheck == 'true') detectLight = 1;
    else detectLight = 0;

    if (body.dimCheck == 'true') activateDim = 1;
    else activateDim = 0;

    if (body.debugCheck == 'true') {
        debugMode = 1;
        delay = 6000;
        clearInterval(intervalHandler);
        intervalHandler = setInterval(timeout, delay);
    }
    else {
        debugMode = 0;
        delay = 60000;
        clearInterval(intervalHandler);
        intervalHandler = setInterval(timeout, delay);
    }
    res.sendStatus(200);
});

router.get('/options', function(req, res, next){
    let data = {
        detectMotion: detectMotion,
        detectFreq: detectFreq,
        detectVol: detectVol,
        detectGesture: detectGesture,
        detectLight: detectLight,
        activateDim: activateDim,
        debugMode: debugMode
    };

    res.status(200).send(data);
});

router.post('/stats', function(req, res, next) {
    let body = req.body;
    let dataKind = body.dataKind;
    if (dataKind == 'SENSOR_TYPE') genDataBySensorType();
    else if (dataKind == 'SENSOR_ON_TYPE') genDataBySensorToOnType();
    else if (dataKind == 'SENSOR_OFF_TYPE') genDataBySensorToOffType();
    else if (dataKind == 'SENSOR_FROM_OFF_TYPE') genDataBySensorOffToType();
    else if (dataKind == 'SENSOR_FROM_ON_TYPE') genDataBySensorOnToType();
    else if (dataKind == 'SENSOR_OFF_ON_TYPE') genDataBySensorOffToOnType();
    else if (dataKind == 'SENSOR_OFF_OFF_TYPE') genDataBySensorOffToOffType();
    else if (dataKind == 'SENSOR_ON_OFF_TYPE') genDataBySensorOnToOffType();
    else if (dataKind == 'SENSOR_ON_ON_TYPE') genDataBySensorOnToOnType();
    else if (dataKind == 'TIME_ON') genDataByTimeOn();
    else if (dataKind == 'TIME_ON_DAYS_OF_WEEK') genDataByTimeOnDaysWeek();
    else if (dataKind == 'TOTAL_JOULES') genDataByTotalJoules();
    else if (dataKind == 'JOULES_DAYS_OF_WEEK') genDataByJoulesDaysWeek();
    else if (dataKind == 'TIME_ON_GIVEN') genDataByTimeOnGiven(body.givenDay);
    else if (dataKind == 'JOULES_ON_GIVEN') genDataByJoulesOnGiven(body.givenDay);
    res.sendStatus(200);
});

router.get('/stats', function(req, res, next) {
    res.status(200).send(dataArr);
});

router.get('/days', function(req, res, next){
    let daySet = new Array();
    DetectionModel.find({}).then((response) => {
        response.forEach(function(detection) {
            daySet.push(getDate(detection.createdAt));
        })
        daySet = daySet.filter(function(item, pos, self) {
            return self.indexOf(item) == pos;
        });
        res.status(200).send(daySet);
    });
});

router.get('/brightness', function(req, res, next){
    let data = brightPercent.toString() + '%';
    res.status(200).send(data);
});

var intervalHandler = setInterval(timeout, delay);

module.exports = router;