$(document).ready(function () {
    var refreshDelay = 1000;

    function delay(ms) {
        var cur_d = new Date();
        var cur_ticks = cur_d.getTime();
        var ms_passed = 0;
        while(ms_passed < ms) {
            var d = new Date();
            var ticks = d.getTime();
            ms_passed = ticks - cur_ticks;
        }
    }

    function refreshState() {
        $.ajax ({
            url: '/detections/state',
            method: 'GET'
        }).done(function(data) {
            if (data == 'OFF') $('#togglelamp').prop('checked', false);
            else if (data == 'ON') $('#togglelamp').prop('checked', true);
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        });
        
        let dimCheck = document.getElementById('toggledim').checked;
        if (dimCheck) {
            $.ajax({
                url: '/detections/brightness',
                method: 'GET'
            }).done(function(data) {
                $('#percent').val(data);
            }).fail(function(xqXHR, textStatus) {
                //alert(xqXHR.responseText);
            });
    
        }
    }

    function graphSelect1() {
        let selection = $('#graphselect').val();
        if (selection == '1') genGraph('SENSOR_TYPE');
        else if (selection == '2') genGraph('SENSOR_ON_TYPE');
        else if (selection == '3') genGraph('SENSOR_OFF_TYPE');
        else if (selection == '4') genGraph('SENSOR_FROM_OFF_TYPE');
        else if (selection == '5') genGraph('SENSOR_FROM_ON_TYPE');
        else if (selection == '6') genGraph('SENSOR_OFF_ON_TYPE');
        else if (selection == '7') genGraph('SENSOR_OFF_OFF_TYPE');
        else if (selection == '8') genGraph('SENSOR_ON_OFF_TYPE');
        else if (selection == '9') genGraph('SENSOR_ON_ON_TYPE');
        else if (selection == '10') genGraph('TIME_ON');        
        else if (selection == '11') genGraph('TIME_ON_DAYS_OF_WEEK');
        else if (selection == '12') genGraph('TOTAL_JOULES');
        else if (selection == '13') genGraph('JOULES_DAYS_OF_WEEK');
    }

    function graphSelect2() {
        let selection = $('#graphselect').val();
        if (selection == '14' || selection == '15') {
            $('#givenday').show();
        }
        else $('#givenday').hide();
    }

    function graphSelect3() {
        let selection = $('#graphselect').val();
        if (selection == '14') {
            genGraph2('TIME_ON_GIVEN', $('#givenday').val());
        }
        else if (selection == '15') {
            genGraph2('JOULES_ON_GIVEN', $('#givenday').val());
        }
    }

    function refreshGraph() {
        graphSelect1();
        graphSelect3();
    }

    function populate() {
        $('#givenday').hide();
        $('#toggledim').attr('disabled', true);

        $('.tabs').tabs({
            swipeable : true,
            responsiveThreshold : 1920
        });

        $.ajax ({
            url: '/detections/time',
            method: 'GET'
        }).done(function(data) {
            $('#activetime').val(data.maxTime);
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })

        $.ajax ({
            url: '/detections/options',
            method: 'GET'
        }).done(function(data) {
            if (data.detectMotion == 0) $('#togglemotion').prop('checked', false);
            else if (data.detectMotion == 1) $('#togglemotion').prop('checked', true);

            if (data.detectFreq == 0) $('#togglefreq').prop('checked', false);
            else if (data.detectFreq == 1) $('#togglefreq').prop('checked', true);

            if (data.detectVol == 0) $('#togglevol').prop('checked', false);
            else if (data.detectVol == 1) $('#togglevol').prop('checked', true);

            if (data.detectGesture == 0) $('#togglegesture').prop('checked', false);
            else if (data.detectGesture == 1) $('#togglegesture').prop('checked', true);

            if (data.detectLight == 0) $('#togglelight').prop('checked', false);
            else if (data.detectLight == 1) $('#togglelight').prop('checked', true);

            if (data.activateDim == 0) $('#toggledim').prop('checked', false);
            else if (data.activateDim == 1) $('#toggledim').prop('checked', true);

            if (data.debugMode == 0) $('#toggledebug').prop('checked', false);
            else if (data.debugMode == 1) $('#toggledebug').prop('checked', true);
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        });

        $.ajax ({
            url: '/detections/thresholds',
            method: 'GET'
        }).done(function(data) {
            $('#volthresh').val(data.volThresh);
            $('#lightthresh').val(data.lightThresh);
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })

       refreshState();

        $.ajax({
            url: '/detections/days',
            method: 'GET'
        }).done(function(data) {
            $.each(data, function (i, item) {
                $('#givenday').append($('<option>', { 
                    value: item,
                    text : item 
                }));
            });
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        });
    }

    function genGraph(dataKind) {
        //console.log('entered fn');
        $.ajax ({
            url: '/detections/stats',
            method: 'POST',
            data: {dataKind: dataKind}
        }).done(function(data) {
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })  

        delay(2000);

        $.ajax ({
            url: '/detections/stats',
            method: 'GET'
        }).done(function(dataArr) {
            let chart = new CanvasJS.Chart("chartContainer", {
                data: [              
                {
                    type: "column",
                    dataPoints: dataArr
                }
                ]
            });
            chart.render();
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })        
    }

    function genGraph2(dataKind, day) {
        //console.log('entered fn');
        $.ajax ({
            url: '/detections/stats',
            method: 'POST',
            data: {dataKind: dataKind, givenDay: day}
        }).done(function(data) {
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })  

        delay(2000);

        $.ajax ({
            url: '/detections/stats',
            method: 'GET'
        }).done(function(dataArr) {
            let chart = new CanvasJS.Chart("chartContainer", {
                data: [              
                {
                    type: "column",
                    dataPoints: dataArr
                }
                ]
            });
            chart.render();
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })        
    }

    $('#activetime').change(function(event) {
        event.preventDefault();
        $.ajax ({
            url: '/detections/time',
            method: 'PUT',
            data: {maxTime: $("#activetime").val()}
        }).done(function(data) {
            
        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })
    });

    $('#togglelamp').click(function(event) {
        //event.preventDefault();

        let check = document.getElementById('togglelamp').checked;

        

        $.ajax ({
            url: '/detections/state',
            method: 'PUT',
            data: {checked: check}
        }).done(function(data) {

        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })
    });

    $('.toggleoptions').click(function(event) {
        //event.preventDefault();

        let motionCheck = document.getElementById('togglemotion').checked;
        let freqCheck = document.getElementById('togglefreq').checked;
        let volCheck = document.getElementById('togglevol').checked;
        let gestureCheck = document.getElementById('togglegesture').checked;
        let lightCheck = document.getElementById('togglelight').checked;
        let dimCheck = document.getElementById('toggledim').checked;
        let debugCheck = document.getElementById('toggledebug').checked;

        if (lightCheck) {
            $('#toggledim').removeAttr('disabled');
        }
        else {
            $('#toggledim').prop('checked', false);
            $('#percent').val('');
            $('#toggledim').attr('disabled', true);
        }

       if (!dimCheck) {
        $('#percent').val('');
       }

        $.ajax ({
            url: '/detections/options',
            method: 'PUT',
            data: {motionCheck: motionCheck, freqCheck: freqCheck, volCheck: volCheck, gestureCheck: gestureCheck, 
                lightCheck: lightCheck, dimCheck: dimCheck, debugCheck: debugCheck}
        }).done(function(data) {

        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })
    });

    $('.thresh').change(function(event) {
        $.ajax ({
            url: '/detections/thresholds',
            method: 'PUT',
            data: {volThresh: $('#volthresh').val(), lightThresh: $('#lightthresh').val()}
        }).done(function(data) {

        }).fail(function(xqXHR, textStatus) {
            //alert(xqXHR.responseText);
        })
    });

    $('#graphselect').change(function(event) {
        graphSelect1();
    });

    $('#graphselect').change(function(event) {
        graphSelect2();
    });

    $('#givenday').change(function(event) {
        graphSelect3();
    });

    $('#refresh').click(function(event) {
        refreshGraph();
    });

    populate();
    setInterval(refreshState, refreshDelay);
    //setInterval(refreshGraph, refreshDelay); //refresh detrimental to UX
});