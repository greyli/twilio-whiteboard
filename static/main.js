$(function () {
    var syncClient;
    var message = $('#message');
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

        syncClient.stream('drawingData').then(function(syncStream) {
            syncStream.on('messagePublished', function(event) {
                console.log(event.message.value)
                syncDrawingData(event.message.value);
            });

            
            function syncDrawingData(data){
                var w = canvas.width;
                var h = canvas.height;
                drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
            }

            function drawLine(x0, y0, x1, y1, color, sync){
                context.beginPath();
                context.moveTo(x0, y0);
                context.lineTo(x1, y1);
                context.strokeStyle = color;
                context.lineWidth = 2;
                context.stroke();
                context.closePath();

                if (!sync) { return; }
                var w = canvas.width;
                var h = canvas.height;

                syncStream.publishMessage({
                    x0: x0 / w,
                    y0: y0 / h,
                    x1: x1 / w,
                    y1: y1 / h,
                    color: color
                });
            }

            function onMouseDown(e){
                drawing = true;
                current.x = e.clientX||e.touches[0].clientX;
                current.y = e.clientY||e.touches[0].clientY;
            }

            function onMouseUp(e){
                if (!drawing) { return; }
                drawing = false;
                drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true);
            }

            function onMouseMove(e){
                if (!drawing) { return; }
                drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true);
                current.x = e.clientX||e.touches[0].clientX;
                current.y = e.clientY||e.touches[0].clientY;
            }

            canvas.addEventListener('mousedown', onMouseDown, false);
            canvas.addEventListener('mouseup', onMouseUp, false);
            canvas.addEventListener('mouseout', onMouseUp, false);
            canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

            canvas.addEventListener('touchstart', onMouseDown, false);
            canvas.addEventListener('touchend', onMouseUp, false);
            canvas.addEventListener('touchcancel', onMouseUp, false);
            canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);
        });
    });

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

    function changeColor(){
        current.color = '#' + Math.floor(Math.random() * 16777215).toString(16);
        console.log(current.color)
        $('#color-btn').css('border', '5px solid ' + current.color);
    };

    function clearBoard(){
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    function onResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    $('#color-btn').on('click', changeColor);
    $('#clear-btn').on('click', clearBoard);

    window.addEventListener('resize', onResize, false);
    onResize();
});
