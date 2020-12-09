$(function () {
    var syncClient;
    var syncStream;
    var message = $('#message');
    var colorBtn = $('#color-btn');
    var clearBtn = $('#clear-btn');
    var canvas = $('.whiteboard')[0];
    var context = canvas.getContext('2d');
    var current = {
        color: 'black'
    };
    var drawing = false;

    $.getJSON('/token', function(tokenResponse) {
        syncClient = new Twilio.Sync.Client(tokenResponse.token, { logLevel: 'info' });
        syncClient.on('connectionStateChanged', function(state) {
            if (state != 'connected') {
                message.html('Sync is not live (websocket connection <span style="color: red">' + state + '</span>)…');
            } else {
                message.html('Sync is live!');
            }
        });

        // create the stream object
        syncClient.stream('drawingData').then(function(stream) {
            syncStream = stream;
            // listen update and sync drawing data
            syncStream.on('messagePublished', function(event) {
                // console.log(event.message.value);
                syncDrawingData(event.message.value);
            });
        });
    });

    function syncDrawingData(data) {
        var w = canvas.width;
        var h = canvas.height;
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
    }

    function drawLine(x0, y0, x1, y1, color, syncStream) {
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.stroke();
        context.closePath();

        if (!syncStream) { return; }
        var w = canvas.width;
        var h = canvas.height;

        // publish the drawing data to Twilio Sync server
        syncStream.publishMessage({
            x0: x0 / w,
            y0: y0 / h,
            x1: x1 / w,
            y1: y1 / h,
            color: color
        });
    }

    function onMouseDown(e) {
        drawing = true;
        current.x = e.clientX || e.touches[0].clientX;
        current.y = e.clientY || e.touches[0].clientY;
    }

    function onMouseUp(e) {
        if (!drawing) { return; }
        drawing = false;
        drawLine(current.x, current.y, e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY, current.color, syncStream);
    }

    function onMouseMove(e) {
        if (!drawing) { return; }
        drawLine(current.x, current.y, e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY, current.color, syncStream);
        current.x = e.clientX || e.touches[0].clientX;
        current.y = e.clientY || e.touches[0].clientY;
    }

    // limit the events number per second
    function throttle(callback, delay) {
        var previousCall = new Date().getTime();
        return function() {
            var time = new Date().getTime();

            if ((time - previousCall) >= delay) {
                previousCall = time;
                callback.apply(null, arguments);
            }
        };
    }

    function changeColor() {
        current.color = '#' + Math.floor(Math.random() * 16777215).toString(16);   // change line color
        // console.log(current.color)
        colorBtn.css('border', '5px solid ' + current.color);  // change the button border color
    };

    function clearBoard() {
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    function onResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseout', onMouseUp);
    canvas.addEventListener('mousemove', throttle(onMouseMove, 10));
    // add mobile touch support
    canvas.addEventListener('touchstart', onMouseDown);
    canvas.addEventListener('touchend', onMouseUp);
    canvas.addEventListener('touchcancel', onMouseUp);
    canvas.addEventListener('touchmove', throttle(onMouseMove, 10));

    colorBtn.on('click', changeColor);
    clearBtn.on('click', clearBoard);

    window.addEventListener('resize', onResize);
    onResize();
});
