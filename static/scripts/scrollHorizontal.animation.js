function scrollHorizontal (animationService) {
    console.debug ('scroll horizontal callaed!');

    var parameters = animationService.getParameters ();
    console.debug (parameters);

    var rows = 3;
    var cols = Math.ceil (parameters.images.count / rows);

    var offsetX = - parameters.clientSize.width / 2;
    var offsetY = - parameters.clientSize.height / 2;

    var padding = 30;

    var speed = [];

    var width = parameters.clientSize.width / cols;
    var height = parameters.clientSize.height / rows;

    return [function (i, item) {

        var itemHeight = 0;
        var itemWidth = 0;

        if (item.getImageSize ()) {
            var itemHeight = Math.floor (item.getImageSize ().height / rows);
            var itemWidth = Math.floor (item.getImageSize ().width / rows);
        }

        var x = offsetX + (Math.floor(i / rows) % cols) * width + padding * (Math.floor(i / rows) % cols);
        var y = offsetY + (i % rows) * height;

        speed[i] = (Math.random () * 100 % 10 + 5) / 5;

        var itemProperties = animationService.getImage (item.get ("name"));

        var transform = {
            x: x,
            y: (y + itemHeight < parameters.clientSize.height / 2) ? y : (parameters.clientSize.height / 2 - itemHeight),

            width: Math.floor (itemProperties.width / rows),
            height: Math.floor (itemProperties.height / rows),

            zIndex: speed[i] * 10,
        }

        return transform;
    }, function (frame, i, to, item) {
        var width = item.get("width");

        to.x -= speed[i] * parameters.animation.currentSpeed;

        if (to.x > parameters.clientSize.width) {
            to.x = -width;
        } else if (to.x < -width) {
            to.x = parameters.clientSize.width;
        }
    }];
}

